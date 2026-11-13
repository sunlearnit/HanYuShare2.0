import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import type {
  HskExerciseSet,
  HskLevel,
  HskSkillFocus,
  RoleplayReply,
  VocabularyItem,
  WritingEvaluation,
} from '../src/types/learning.ts';

const MODEL_NAME = 'gemini-4-hydrogen';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiApiError(
      'Hệ thống chưa được cấu hình khóa API Gemini trên máy chủ.',
      500
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export class GeminiApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

function handleGeminiError(err: unknown): never {
  if (err instanceof GeminiApiError) {
    throw err;
  }
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
    throw new GeminiApiError(
      'Hệ thống AI đang tạm thời quá tải hạn mức. Vui lòng thử lại sau ít phút.',
      429
    );
  }
  if (
    message.includes('403') ||
    message.includes('PERMISSION_DENIED') ||
    message.includes('API_KEY_INVALID')
  ) {
    throw new GeminiApiError(
      'Không thể xác thực kết nối Gemini API trên máy chủ. Vui lòng kiểm tra cấu hình Secrets.',
      502
    );
  }
  console.error('[Gemini Error]', message);
  throw new GeminiApiError(
    'Đã xảy ra sự cố khi xử lý phản hồi từ gia sư AI. Vui lòng thử lại.',
    502
  );
}

function parseJsonSafe<T>(raw: string | undefined): T {
  if (!raw) {
    throw new GeminiApiError('AI không trả về dữ liệu hợp lệ.', 502);
  }
  try {
    return JSON.parse(raw.trim()) as T;
  } catch {
    throw new GeminiApiError('Dữ liệu phản hồi từ AI không đúng định dạng.', 502);
  }
}

export interface ChatTurnInput {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatResponsePayload {
  textVi: string;
  chineseSegments: { hanzi: string; pinyin: string; vietnamese: string }[];
  correction?: {
    hasError: boolean;
    original: string;
    corrected: string;
    correctedPinyin?: string;
    explanationVi: string;
  };
  suggestionsVi: string[];
}

export async function generateTeacherChatReply(params: {
  message: string;
  history: ChatTurnInput[];
  hskLevel: HskLevel;
}): Promise<ChatResponsePayload> {
  const ai = getAiClient();
  const historyTranscript = params.history
    .slice(-14)
    .map((turn) => `${turn.role === 'user' ? 'Học viên' : 'Gia sư'}: ${turn.text}`)
    .join('\n');

  const prompt = `Lịch sử trò chuyện gần đây:
${historyTranscript || '(Chưa có tin nhắn trước đó)'}

Tin nhắn mới của học viên:
"${params.message}"

Hãy trả lời với vai trò gia sư tiếng Trung thân thiện cho học viên Việt Nam đang ở trình độ HSK ${params.hskLevel}.`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `Bạn là cô/thầy giáo dạy tiếng Trung Phổ thông (Giản thể) tận tâm của HanYu Share, chuyên hướng dẫn học viên Việt Nam từ sơ cấp đến HSK 6.
Nguyên tắc bắt buộc:
1. Toàn bộ lời giải thích, hướng dẫn và nhận xét phải viết bằng tiếng Việt tự nhiên, dễ hiểu, khích lệ người học.
2. Luôn sử dụng chữ Hán giản thể (Simplified Chinese) và Pinyin chuẩn có dấu thanh điệu chính xác.
3. Trong mảng chineseSegments, đưa vào các câu/từ tiếng Trung minh họa cốt lõi phù hợp trình độ HSK của học viên (hoặc nếu chỉ giải thích ngữ pháp tiếng Việt thì đưa 1-3 câu ví dụ ngắn).
4. Nếu học viên có gõ câu tiếng Trung trong tin nhắn và câu đó có lỗi ngữ pháp/dùng từ rõ ràng, điền thông tin vào correction (hasError: true). Nếu câu tiếng Trung của học viên đã đúng ngữ pháp, không tự ý bắt lỗi chỉ vì có cách nói khác hay hơn (đặt hasError: false). Nếu học viên chỉ hỏi bằng tiếng Việt, đặt hasError: false và để chuỗi rỗng.
5. Cung cấp 2-3 gợi ý câu hỏi tiếp theo ngắn gọn bằng tiếng Việt trong suggestionsVi.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            textVi: { type: Type.STRING, description: 'Câu trả lời chính bằng tiếng Việt.' },
            chineseSegments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  vietnamese: { type: Type.STRING },
                },
                required: ['hanzi', 'pinyin', 'vietnamese'],
              },
            },
            correction: {
              type: Type.OBJECT,
              properties: {
                hasError: { type: Type.BOOLEAN },
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                correctedPinyin: { type: Type.STRING },
                explanationVi: { type: Type.STRING },
              },
              required: ['hasError', 'original', 'corrected', 'correctedPinyin', 'explanationVi'],
            },
            suggestionsVi: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['textVi', 'chineseSegments', 'correction', 'suggestionsVi'],
        },
      },
    });

    const parsed = parseJsonSafe<ChatResponsePayload>(response.text);
    return {
      textVi: parsed.textVi || 'Mình đã nhận được câu hỏi của bạn.',
      chineseSegments: Array.isArray(parsed.chineseSegments) ? parsed.chineseSegments : [],
      correction: parsed.correction?.hasError ? parsed.correction : undefined,
      suggestionsVi: Array.isArray(parsed.suggestionsVi) ? parsed.suggestionsVi.slice(0, 3) : [],
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function gradeChineseWriting(params: {
  essay: string;
  assignmentPrompt?: string;
  hskLevel: HskLevel;
}): Promise<WritingEvaluation> {
  const ai = getAiClient();
  const trimmedPrompt = (params.assignmentPrompt ?? '').trim();
  const hasPrompt = trimmedPrompt.length > 0;

  const userContent = hasPrompt
    ? `Trình độ mục tiêu của học viên: HSK ${params.hskLevel}
Đề bài gốc:
"""
${trimmedPrompt}
"""

Bài viết của học viên:
"""
${params.essay}
"""`
    : `Trình độ mục tiêu của học viên: HSK ${params.hskLevel}
Đề bài gốc: (Học viên KHÔNG cung cấp đề bài gốc)

Bài viết của học viên:
"""
${params.essay}
"""`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: userContent,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Bạn là giám khảo và giáo viên tiếng Trung giàu kinh nghiệm, chấm bài viết cho học viên Việt Nam.
QUY TẮC CHẤM ĐIỂM NGHIÊM NGẶT:
1. Thang điểm 5 tiêu chí:
   - grammar (Ngữ pháp): tối đa 30 điểm
   - vocabulary (Từ vựng): tối đa 20 điểm
   - naturalness (Độ tự nhiên): tối đa 20 điểm
   - coherence (Mạch lạc & liên kết): tối đa 15 điểm
   - relevance (Bám sát đề bài): tối đa 15 điểm
2. XỬ LÝ KHI THIẾU ĐỀ BÀI GỐC:
   - Nếu học viên KHÔNG cung cấp đề bài gốc, TUYỆT ĐỐI KHÔNG tự bịa hay đoán điểm relevance. Đặt score của relevance = 0 (máy chủ sẽ chuyển thành null), và trong missingPromptNoteVi nhắc nhẹ bằng tiếng Việt rằng bài được chấm 4/5 tiêu chí (tối đa 85 điểm) vì chưa có đề bài gốc.
3. CÔNG BẰNG NGỮ PHÁP (RẤT QUAN TRỌNG):
   - KHÔNG BAO GIỜ đánh dấu một câu ĐÚNG ngữ pháp và đúng nghĩa là "lỗi sai" chỉ vì có cách diễn đạt khác nghe văn hoa hoặc tự nhiên hơn.
   - Mảng "mistakes" CHỈ chứa các lỗi sai thực sự (sai ngữ pháp, sai trật tự từ, thiếu thành phần bắt buộc, dùng sai từ/lượng từ/trợ từ, sai chính tả chữ Hán).
   - Các gợi ý giúp câu văn mượt mà, bản địa hơn cho những câu vốn đã đúng ngữ pháp phải đặt riêng trong mảng "styleSuggestions".
4. Toàn bộ nhận xét, phân loại, giải thích và hướng dẫn phải viết bằng tiếng Việt rõ ràng, mang tính xây dựng.
5. Cung cấp "improvedVersion" gồm toàn bộ bài viết tiếng Trung giản thể đã sửa hoàn chỉnh, Pinyin đầy đủ, và bản dịch tiếng Việt.
6. Tạo CHÍNH XÁC 3 bài tập củng cố ("followUpExercises") cá nhân hóa dựa trực tiếp trên các lỗi thực tế học viên vừa mắc (nếu bài viết hoàn hảo không có lỗi, tạo 3 bài tập nâng cao cấu trúc câu phù hợp bài viết đó). Mỗi bài tập có 4 đáp án lựa chọn rõ ràng và correctAnswer khớp chính xác một trong 4 options.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallFeedbackVi: { type: Type.STRING },
            missingPromptNoteVi: { type: Type.STRING },
            grammarScore: { type: Type.NUMBER },
            grammarCommentVi: { type: Type.STRING },
            vocabularyScore: { type: Type.NUMBER },
            vocabularyCommentVi: { type: Type.STRING },
            naturalnessScore: { type: Type.NUMBER },
            naturalnessCommentVi: { type: Type.STRING },
            coherenceScore: { type: Type.NUMBER },
            coherenceCommentVi: { type: Type.STRING },
            relevanceScore: { type: Type.NUMBER },
            relevanceCommentVi: { type: Type.STRING },
            mistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  corrected: { type: Type.STRING },
                  correctedPinyin: { type: Type.STRING },
                  categoryVi: { type: Type.STRING },
                  explanationVi: { type: Type.STRING },
                },
                required: ['original', 'corrected', 'correctedPinyin', 'categoryVi', 'explanationVi'],
              },
            },
            styleSuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                  suggestionPinyin: { type: Type.STRING },
                  reasonVi: { type: Type.STRING },
                },
                required: ['original', 'suggestion', 'suggestionPinyin', 'reasonVi'],
              },
            },
            improvedVersion: {
              type: Type.OBJECT,
              properties: {
                hanzi: { type: Type.STRING },
                pinyin: { type: Type.STRING },
                vietnameseTranslation: { type: Type.STRING },
              },
              required: ['hanzi', 'pinyin', 'vietnameseTranslation'],
            },
            followUpExercises: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, description: 'multiple_choice or fill_blank' },
                  instructionVi: { type: Type.STRING },
                  promptChinese: { type: Type.STRING },
                  promptPinyin: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanationVi: { type: Type.STRING },
                },
                required: [
                  'id',
                  'type',
                  'instructionVi',
                  'promptChinese',
                  'promptPinyin',
                  'options',
                  'correctAnswer',
                  'explanationVi',
                ],
              },
            },
          },
          required: [
            'overallFeedbackVi',
            'grammarScore',
            'grammarCommentVi',
            'vocabularyScore',
            'vocabularyCommentVi',
            'naturalnessScore',
            'naturalnessCommentVi',
            'coherenceScore',
            'coherenceCommentVi',
            'relevanceScore',
            'relevanceCommentVi',
            'mistakes',
            'styleSuggestions',
            'improvedVersion',
            'followUpExercises',
          ],
        },
      },
    });

    interface RawGrade {
      overallFeedbackVi: string;
      missingPromptNoteVi?: string;
      grammarScore: number;
      grammarCommentVi: string;
      vocabularyScore: number;
      vocabularyCommentVi: string;
      naturalnessScore: number;
      naturalnessCommentVi: string;
      coherenceScore: number;
      coherenceCommentVi: string;
      relevanceScore: number;
      relevanceCommentVi: string;
      mistakes: WritingEvaluation['mistakes'];
      styleSuggestions: WritingEvaluation['styleSuggestions'];
      improvedVersion: WritingEvaluation['improvedVersion'];
      followUpExercises: WritingEvaluation['followUpExercises'];
    }

    const raw = parseJsonSafe<RawGrade>(response.text);

    const clamp = (val: number, max: number) =>
      Math.round(Math.max(0, Math.min(max, Number.isFinite(val) ? val : 0)));

    const grammar = clamp(raw.grammarScore, 30);
    const vocabulary = clamp(raw.vocabularyScore, 20);
    const naturalness = clamp(raw.naturalnessScore, 20);
    const coherence = clamp(raw.coherenceScore, 15);
    const relevance = hasPrompt ? clamp(raw.relevanceScore, 15) : null;

    const totalScore =
      grammar + vocabulary + naturalness + coherence + (relevance ?? 0);
    const maxPossibleScore = hasPrompt ? 100 : 85;

    return {
      mode: hasPrompt ? 'full' : 'partial',
      totalScore,
      maxPossibleScore,
      overallFeedbackVi: raw.overallFeedbackVi,
      missingPromptNoteVi: hasPrompt
        ? undefined
        : raw.missingPromptNoteVi ||
          'Bạn chưa nhập đề bài gốc nên hệ thống chỉ chấm 4/5 tiêu chí độc lập (tối đa 85 điểm) và không chấm điểm Bám sát đề (15 điểm). Bạn có thể bổ sung đề bài để chấm trọn vẹn 100 điểm.',
      criteria: [
        {
          key: 'grammar',
          labelVi: 'Ngữ pháp',
          score: grammar,
          maxScore: 30,
          commentVi: raw.grammarCommentVi,
        },
        {
          key: 'vocabulary',
          labelVi: 'Từ vựng',
          score: vocabulary,
          maxScore: 20,
          commentVi: raw.vocabularyCommentVi,
        },
        {
          key: 'naturalness',
          labelVi: 'Tự nhiên',
          score: naturalness,
          maxScore: 20,
          commentVi: raw.naturalnessCommentVi,
        },
        {
          key: 'coherence',
          labelVi: 'Mạch lạc',
          score: coherence,
          maxScore: 15,
          commentVi: raw.coherenceCommentVi,
        },
        {
          key: 'relevance',
          labelVi: 'Bám sát đề',
          score: relevance,
          maxScore: 15,
          commentVi: hasPrompt
            ? raw.relevanceCommentVi
            : 'Chưa chấm vì chưa cung cấp đề bài gốc.',
        },
      ],
      mistakes: Array.isArray(raw.mistakes) ? raw.mistakes : [],
      styleSuggestions: Array.isArray(raw.styleSuggestions) ? raw.styleSuggestions : [],
      improvedVersion: raw.improvedVersion,
      followUpExercises: Array.isArray(raw.followUpExercises)
        ? raw.followUpExercises.slice(0, 3).map((ex, idx) => ({
            ...ex,
            id: ex.id || `ex-${idx + 1}`,
            type: ex.type === 'fill_blank' ? 'fill_blank' : 'multiple_choice',
          }))
        : [],
      disclaimerVi:
        'Lưu ý: Điểm số trên là đánh giá tham khảo phục vụ việc tự học, không phải điểm thi HSK chính thức.',
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function generateVocabularySet(params: {
  hskLevel: HskLevel;
  topic: string;
}): Promise<VocabularyItem[]> {
  const ai = getAiClient();
  const topicText = params.topic.trim() || 'Giao tiếp thông dụng';

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Hãy tạo một bộ gồm 8 từ vựng tiếng Trung (Giản thể) thuộc trình độ HSK ${params.hskLevel} về chủ đề: "${topicText}".`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `Bạn là biên soạn giáo trình tiếng Trung cho người Việt.
Yêu cầu:
- Tạo đúng 8 từ vựng thiết thực, chính xác theo cấp độ HSK yêu cầu.
- Mỗi từ gồm: chữ Hán giản thể, Pinyin chuẩn dấu thanh, từ loại bằng tiếng Việt (vd: Danh từ, Động từ, Tính từ, Phó từ), nghĩa tiếng Việt súc tích, 1 câu ví dụ ngữ cảnh tự nhiên bằng chữ Hán + Pinyin + dịch tiếng Việt, và 1 ghi chú ngắn cách dùng/lỗi người Việt hay nhầm bằng tiếng Việt.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              hanzi: { type: Type.STRING },
              pinyin: { type: Type.STRING },
              partOfSpeechVi: { type: Type.STRING },
              meaningVi: { type: Type.STRING },
              exampleHanzi: { type: Type.STRING },
              examplePinyin: { type: Type.STRING },
              exampleVi: { type: Type.STRING },
              usageNoteVi: { type: Type.STRING },
            },
            required: [
              'id',
              'hanzi',
              'pinyin',
              'partOfSpeechVi',
              'meaningVi',
              'exampleHanzi',
              'examplePinyin',
              'exampleVi',
              'usageNoteVi',
            ],
          },
        },
      },
    });

    const items = parseJsonSafe<Omit<VocabularyItem, 'hskLevel'>[]>(response.text);
    return (Array.isArray(items) ? items : []).slice(0, 8).map((item, idx) => ({
      ...item,
      id: item.id || `vocab-${Date.now()}-${idx}`,
      hskLevel: params.hskLevel,
    }));
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function generateHskPracticeSet(params: {
  hskLevel: HskLevel;
  skillFocus: HskSkillFocus;
  topic?: string;
}): Promise<HskExerciseSet> {
  const ai = getAiClient();
  const focusLabel =
    params.skillFocus === 'grammar_vocab'
      ? 'Từ vựng và Ngữ pháp'
      : params.skillFocus === 'reading_order'
        ? 'Đọc hiểu và Sắp xếp câu'
        : 'Tổng hợp từ vựng, ngữ pháp và đọc hiểu';

  const topicClause = params.topic?.trim()
    ? ` ưu tiên chủ đề "${params.topic.trim()}"`
    : '';

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Tạo đề luyện tập HSK ${params.hskLevel} gồm 5 câu hỏi dạng ${focusLabel}${topicClause}.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        systemInstruction: `Bạn là chuyên gia ra đề luyện thi HSK cho học viên Việt Nam.
Yêu cầu:
- Tạo đúng 5 câu hỏi chất lượng cao phù hợp chuẩn HSK được yêu cầu.
- Mỗi câu phải có 4 lựa chọn khác nhau (options) và correctAnswer PHẢI trùng khớp chính xác từng ký tự với một phần tử trong options.
- Toàn bộ instructionVi và explanationVi viết bằng tiếng Việt rõ ràng, giải thích vì sao đáp án đúng và vì sao các lựa chọn khác chưa phù hợp.
- promptChinese dùng chữ Hán giản thể, promptPinyin ghi Pinyin đầy đủ của phần câu hỏi.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titleVi: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  instructionVi: { type: Type.STRING },
                  promptChinese: { type: Type.STRING },
                  promptPinyin: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswer: { type: Type.STRING },
                  explanationVi: { type: Type.STRING },
                },
                required: [
                  'id',
                  'type',
                  'instructionVi',
                  'promptChinese',
                  'promptPinyin',
                  'options',
                  'correctAnswer',
                  'explanationVi',
                ],
              },
            },
          },
          required: ['titleVi', 'questions'],
        },
      },
    });

    const parsed = parseJsonSafe<{
      titleVi: string;
      questions: HskExerciseSet['questions'];
    }>(response.text);

    return {
      level: params.hskLevel,
      skillFocus: params.skillFocus,
      titleVi: parsed.titleVi || `Bài luyện tập HSK ${params.hskLevel}`,
      questions: (Array.isArray(parsed.questions) ? parsed.questions : [])
        .slice(0, 5)
        .map((q, idx) => ({
          ...q,
          id: q.id || `hsk-q-${idx + 1}`,
          type:
            q.type === 'fill_blank' || q.type === 'sentence_order'
              ? q.type
              : 'multiple_choice',
        })),
    };
  } catch (err) {
    handleGeminiError(err);
  }
}

export async function generateRoleplayTurn(params: {
  scenarioTitle: string;
  partnerRole: string;
  userMessage: string;
  history: ChatTurnInput[];
  hskLevel: HskLevel;
}): Promise<RoleplayReply> {
  const ai = getAiClient();
  const transcript = params.history
    .slice(-14)
    .map((turn) => `${turn.role === 'user' ? 'Học viên' : 'Đối tác'}: ${turn.text}`)
    .join('\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Tình huống đóng vai: ${params.scenarioTitle}
Vai của bạn: ${params.partnerRole}
Trình độ học viên: HSK ${params.hskLevel}

Lịch sử hội thoại:
${transcript || '(Bắt đầu tình huống)'}

Lời thoại mới của học viên:
"${params.userMessage}"`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `Bạn đang đóng vai nhân vật bản xứ Trung Quốc trong tình huống giao tiếp thực tế với học viên Việt Nam ở trình độ HSK ${params.hskLevel}.
Quy tắc:
1. replyHanzi: Trả lời tự nhiên đúng vai trò bằng chữ Hán giản thể, dùng từ vựng & cấu trúc phù hợp trình độ HSK ${params.hskLevel}.
2. replyPinyin: Pinyin chuẩn dấu thanh cho toàn bộ replyHanzi.
3. replyVi: Dịch nghĩa tiếng Việt tự nhiên của replyHanzi.
4. correction: Kiểm tra lời thoại của học viên. Nếu học viên viết bằng tiếng Trung và có lỗi ngữ pháp/từ vựng rõ ràng, đặt hasError: true, cung cấp câu sửa đúng (corrected, correctedPinyin) và giải thích ngắn gọn bằng tiếng Việt (explanationVi). Nếu học viên nói đúng ngữ pháp hoặc đang hỏi bằng tiếng Việt, đặt hasError: false (không sửa gượng ép câu đúng).
5. suggestedUserReplies: Gợi ý 2 câu đáp lại tự nhiên tiếp theo phù hợp trình độ HSK để học viên tham khảo nếu bí từ.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyHanzi: { type: Type.STRING },
            replyPinyin: { type: Type.STRING },
            replyVi: { type: Type.STRING },
            correction: {
              type: Type.OBJECT,
              properties: {
                hasError: { type: Type.BOOLEAN },
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                correctedPinyin: { type: Type.STRING },
                explanationVi: { type: Type.STRING },
              },
              required: ['hasError', 'original', 'corrected', 'correctedPinyin', 'explanationVi'],
            },
            suggestedUserReplies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  hanzi: { type: Type.STRING },
                  pinyin: { type: Type.STRING },
                  vi: { type: Type.STRING },
                },
                required: ['hanzi', 'pinyin', 'vi'],
              },
            },
          },
          required: [
            'replyHanzi',
            'replyPinyin',
            'replyVi',
            'correction',
            'suggestedUserReplies',
          ],
        },
      },
    });

    const parsed = parseJsonSafe<RoleplayReply>(response.text);
    return {
      replyHanzi: parsed.replyHanzi,
      replyPinyin: parsed.replyPinyin,
      replyVi: parsed.replyVi,
      correction: parsed.correction,
      suggestedUserReplies: Array.isArray(parsed.suggestedUserReplies)
        ? parsed.suggestedUserReplies.slice(0, 2)
        : [],
    };
  } catch (err) {
    handleGeminiError(err);
  }
}
