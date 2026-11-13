import { useState, useRef, useEffect } from 'react';
import {
  Send,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  ArrowLeft,
  MessageSquareText,
  Mic,
} from 'lucide-react';
import type { HskLevel, LanguageCorrection, RoleplayScenario } from '../types/learning';
import { sendRoleplayTurn } from '../services/apiClient';
import { ChineseBlock } from './ChineseBlock';
import { LiveVoicePanel } from './LiveVoicePanel';

interface RoleplayWorkspaceProps {
  hskLevel: HskLevel;
  showPinyin: boolean;
}

interface RoleplayTurn {
  id: string;
  role: 'user' | 'assistant';
  hanzi: string;
  pinyin?: string;
  vi?: string;
  correction?: LanguageCorrection;
  suggestedReplies?: { hanzi: string; pinyin: string; vi: string }[];
}

const SCENARIOS: RoleplayScenario[] = [
  {
    id: 'cafe',
    titleVi: 'Đặt đồ uống tại quán cà phê',
    descriptionVi: 'Luyện gọi món, hỏi độ ngọt, đá và thanh toán.',
    partnerRoleVi: 'Nhân viên pha chế (Barista)',
    partnerRoleZh: '咖啡店员',
    starterHanzi: '你好！欢迎光临，请问今天想喝点什么？',
    starterPinyin: 'Nǐ hǎo! Huānyíng guānglín, qǐngwèn jīntiān xiǎng hē diǎn shénme?',
    starterVi: 'Xin chào! Chào mừng quý khách, hôm nay bạn muốn uống gì ạ?',
  },
  {
    id: 'taxi',
    titleVi: 'Hỏi đường & đi taxi',
    descriptionVi: 'Nói địa điểm muốn đến, hỏi thời gian di chuyển và giá cước.',
    partnerRoleVi: 'Tài xế taxi',
    partnerRoleZh: '出租车司机',
    starterHanzi: '你好，上车吧！请问你要去哪里？',
    starterPinyin: 'Nǐ hǎo, shàngchē ba! Qǐngwèn nǐ yào qù nǎlǐ?',
    starterVi: 'Chào bạn, lên xe đi! Xin hỏi bạn muốn đi đâu?',
  },
  {
    id: 'shopping',
    titleVi: 'Mua sắm & hỏi giá quần áo',
    descriptionVi: 'Hỏi size, thử đồ, màu sắc và thương lượng giá cả.',
    partnerRoleVi: 'Nhân viên cửa hàng thời trang',
    partnerRoleZh: '服装店员',
    starterHanzi: '你好！请随便看看，想找什么款式的衣服？',
    starterPinyin: 'Nǐ hǎo! Qǐng suíbiàn kànkan, xiǎng zhǎo shénme kuǎnshì de yīfu?',
    starterVi: 'Xin chào! Bạn cứ xem tự nhiên nhé, bạn đang tìm kiểu áo quần nào?',
  },
  {
    id: 'clinic',
    titleVi: 'Khám bệnh tại phòng khám',
    descriptionVi: 'Mô tả triệu chứng đau đầu, sốt, ho và nghe hướng dẫn uống thuốc.',
    partnerRoleVi: 'Bác sĩ phòng khám',
    partnerRoleZh: '医生',
    starterHanzi: '请坐。你今天哪里不舒服？什么时候开始的？',
    starterPinyin: 'Qǐng zuò. Nǐ jīntiān nǎlǐ bù shūfu? Shénme shíhou kāishǐ de?',
    starterVi: 'Mời ngồi. Hôm nay bạn thấy khó chịu ở đâu? Bắt đầu từ khi nào?',
  },
  {
    id: 'interview',
    titleVi: 'Phỏng vấn xin việc tiếng Trung',
    descriptionVi: 'Giới thiệu bản thân, kinh nghiệm và lý do ứng tuyển.',
    partnerRoleVi: 'Nhà tuyển dụng',
    partnerRoleZh: '面试官',
    starterHanzi: '你好！请先简单介绍一下你自己吧。',
    starterPinyin: 'Nǐ hǎo! Qǐng xiān jiǎndān jièshào yíxià nǐ zìjǐ ba.',
    starterVi: 'Chào bạn! Mời bạn giới thiệu ngắn gọn về bản thân trước nhé.',
  },
];

export function RoleplayWorkspace({ hskLevel, showPinyin }: RoleplayWorkspaceProps) {
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario | null>(null);
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [customTitle, setCustomTitle] = useState('');
  const [customRole, setCustomRole] = useState('');

  const [turns, setTurns] = useState<RoleplayTurn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, loading]);

  const startScenario = (scenario: RoleplayScenario, preferredMode: 'text' | 'voice' = 'text') => {
    setActiveScenario(scenario);
    setMode(preferredMode);
    setErrorMsg(null);
    setInput('');
    setTurns([
      {
        id: `start-${Date.now()}`,
        role: 'assistant',
        hanzi: scenario.starterHanzi,
        pinyin: scenario.starterPinyin,
        vi: scenario.starterVi,
      },
    ]);
  };

  const handleStartCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const title = customTitle.trim();
    const role = customRole.trim() || 'Người bản xứ Trung Quốc';
    if (!title) return;

    startScenario({
      id: `custom-${Date.now()}`,
      titleVi: title,
      descriptionVi: 'Tình huống hội thoại tự chọn.',
      partnerRoleVi: role,
      partnerRoleZh: role,
      starterHanzi: '你好！我们开始吧，请先说第一句话。',
      starterPinyin: 'Nǐ hǎo! Wǒmen kāishǐ ba, qǐng xiān shuō dì-yī jù huà.',
      starterVi: 'Xin chào! Chúng ta bắt đầu nhé, mời bạn nói câu đầu tiên.',
    });
  };

  const handleSend = async (presetHanzi?: string) => {
    if (!activeScenario) return;
    const textToSend = (presetHanzi ?? input).trim();
    if (!textToSend || loading) return;

    setErrorMsg(null);
    const userTurn: RoleplayTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      hanzi: textToSend,
    };

    const nextTurns = [...turns, userTurn];
    setTurns(nextTurns);
    if (!presetHanzi) setInput('');
    setLoading(true);

    try {
      const historyPayload = turns.map((t) => ({
        role: t.role,
        text: t.hanzi,
      }));

      const reply = await sendRoleplayTurn({
        scenarioTitle: activeScenario.titleVi,
        partnerRole: activeScenario.partnerRoleVi,
        userMessage: textToSend,
        history: historyPayload,
        hskLevel,
      });

      const assistantTurn: RoleplayTurn = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        hanzi: reply.replyHanzi,
        pinyin: reply.replyPinyin,
        vi: reply.replyVi,
        correction: reply.correction?.hasError ? reply.correction : undefined,
        suggestedReplies: reply.suggestedUserReplies,
      };

      setTurns([...nextTurns, assistantTurn]);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể phản hồi hội thoại lúc này.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!activeScenario) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Chọn tình huống đóng vai · HSK {hskLevel}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Luyện hội thoại bằng văn bản hoặc gọi giọng nói trực tiếp với AI (Gemini Live API) theo trình độ HSK {hskLevel}.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCENARIOS.map((sc) => (
              <div
                key={sc.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <p className="text-xs text-zinc-500">
                    Vai đối thoại · {sc.partnerRoleVi}
                  </p>
                  <h3 className="text-base font-semibold text-zinc-900">{sc.titleVi}</h3>
                  <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                    {sc.descriptionVi}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => startScenario(sc, 'text')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 min-h-[38px]"
                  >
                    <MessageSquareText className="w-3.5 h-3.5" />
                    <span>Nhắn tin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startScenario(sc, 'voice')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 min-h-[38px]"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>Gọi luyện nói</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Hoặc tạo tình huống riêng của bạn
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ví dụ: Nhận phòng khách sạn ở Thượng Hải, Trả lại hàng bị lỗi, Nói chuyện với bạn cùng phòng.
            </p>
          </div>

          <form onSubmit={handleStartCustom} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value.slice(0, 120))}
              placeholder="Tên tình huống (bắt buộc)..."
              className="sm:col-span-6 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none min-h-[44px]"
            />
            <input
              type="text"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value.slice(0, 80))}
              placeholder="Vai của AI (vd: Lễ tân khách sạn)..."
              className="sm:col-span-4 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!customTitle.trim()}
              className="sm:col-span-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors min-h-[44px]"
            >
              Vào vai
            </button>
          </form>
        </section>
      </div>
    );
  }

  const latestSuggestions =
    [...turns].reverse().find((t) => t.role === 'assistant')?.suggestedReplies ?? [];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-11.5rem)] lg:h-[calc(100vh-7.5rem)]">
      {/* Active Scenario Header + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveScenario(null)}
            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Đổi tình huống</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-zinc-900 truncate">
              {activeScenario.titleVi}
            </h2>
            <p className="text-xs text-zinc-500 truncate">
              {activeScenario.partnerRoleVi} · HSK {hskLevel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'text'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5" />
              <span>Nhắn tin</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                mode === 'voice'
                  ? 'bg-white text-red-700 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Gọi trực tiếp</span>
            </button>
          </div>

          {mode === 'text' && (
            <button
              type="button"
              onClick={() => startScenario(activeScenario, 'text')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          )}
        </div>
      </div>

      {mode === 'voice' ? (
        <div className="py-5 overflow-y-auto flex-1">
          <LiveVoicePanel
            hskLevel={hskLevel}
            scenarioTitle={activeScenario.titleVi}
            partnerRole={activeScenario.partnerRoleVi}
          />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
            {turns.map((turn) => {
              if (turn.role === 'user') {
                return (
                  <div key={turn.id} className="flex justify-end">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-red-600 text-white px-4 py-3 font-zh text-base leading-relaxed">
                      {turn.hanzi}
                    </div>
                  </div>
                );
              }

              return (
                <div key={turn.id} className="flex justify-start">
                  <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 sm:px-5 py-4 space-y-3">
                    {turn.correction?.hasError && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Góp ý sửa câu vừa rồi của bạn</span>
                        </div>
                        <p className="text-xs text-zinc-500 line-through font-zh">
                          {turn.correction.original}
                        </p>
                        <ChineseBlock
                          hanzi={turn.correction.corrected}
                          pinyin={turn.correction.correctedPinyin}
                          vietnamese={turn.correction.explanationVi}
                          showPinyin={showPinyin}
                        />
                      </div>
                    )}

                    <div className="text-xs font-medium text-zinc-500">
                      {activeScenario.partnerRoleVi}
                    </div>

                    <ChineseBlock
                      hanzi={turn.hanzi}
                      pinyin={turn.pinyin}
                      vietnamese={turn.vi}
                      showPinyin={showPinyin}
                      allowLocalPeek
                    />
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <span>{activeScenario.partnerRoleVi} đang phản hồi...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {latestSuggestions.length > 0 && !loading && (
            <div className="pb-2.5 flex flex-wrap items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý đáp lại:</span>
              </span>
              {latestSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSend(s.hanzi)}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-left text-xs hover:border-red-300 hover:bg-red-50/40 transition-colors"
                >
                  <span className="font-zh font-medium text-zinc-900">{s.hanzi}</span>
                  {showPinyin && <span className="text-zinc-500 ml-1.5">({s.pinyin})</span>}
                  <span className="text-zinc-600 ml-1.5">· {s.vi}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="pt-3 border-t border-zinc-200 bg-white shrink-0"
          >
            <div className="flex items-end gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                placeholder="Nhập câu trả lời bằng tiếng Trung (hoặc bấm gợi ý phía trên)..."
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none min-h-[44px]"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors min-h-[44px] whitespace-nowrap shrink-0"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Gửi</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
