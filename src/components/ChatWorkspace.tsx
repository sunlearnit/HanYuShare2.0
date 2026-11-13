import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ChatMessage, HskLevel } from '../types/learning';
import { sendTeacherChat } from '../services/apiClient';
import {
  clearChatMessagesInFirestore,
  saveChatMessageToFirestore,
} from '../services/firestoreSync';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock } from './ChineseBlock';

interface ChatWorkspaceProps {
  hskLevel: HskLevel;
  showPinyin: boolean;
  messages: ChatMessage[];
  onUpdateMessages: (messages: ChatMessage[]) => void;
}

const MAX_INPUT_LEN = 1500;

const STARTER_PROMPTS: Record<number, string[]> = {
  1: [
    'Giải thích cách phân biệt 是 và 有 kèm ví dụ HSK 1.',
    'Tôi muốn viết: "Hôm nay tôi rất vui" bằng tiếng Trung như thế nào?',
    'Đặt 3 câu đơn giản với từ 喜欢 và dạy tôi đọc theo thanh điệu.',
  ],
  2: [
    'Phân biệt cách dùng 了 và 过 cho người mới học HSK 2.',
    'Kiểm tra giúp mình câu này: 我昨天去商店买了两个苹果。',
    'Cách hỏi đường và cảm ơn lịch sự bằng tiếng Trung.',
  ],
  3: [
    'Khi nào dùng câu chữ 把 (bǎ)? Cho mình ví dụ dễ nhớ.',
    'Phân biệt 还是 và 或者 trong câu trần thuật và câu hỏi.',
    'Sửa giúp mình câu: 我学习汉语了两年。',
  ],
  4: [
    'Phân biệt 刚才 và 刚刚 kèm ngữ cảnh giao tiếp thực tế.',
    'Cách dùng cấu trúc 不但……而且…… tự nhiên trong bài viết HSK 4.',
    'Kiểm tra giúp mình: 虽然下雨，但是我还去图书馆学习。',
  ],
  5: [
    'Phân biệt cặp từ đồng nghĩa 曾经 và 已经 ở trình độ HSK 5.',
    'Cách viết câu mở bài trang trọng cho bài nghị luận ngắn HSK 5.',
    'Giải thích thành ngữ 画蛇添足 và cách đặt câu.',
  ],
  6: [
    'Phân tích sự khác nhau về sắc thái giữa 固然 và 虽然.',
    'Hướng dẫn cách dùng từ nối giúp bài viết HSK 6 mạch lạc và tự nhiên hơn.',
    'Sửa giúp mình câu văn viết theo văn phong học thuật: 随着科技的发展，人们的生活越来越方便。',
  ],
};

export function ChatWorkspace({
  hskLevel,
  showPinyin,
  messages,
  onUpdateMessages,
}: ChatWorkspaceProps) {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || loading) return;

    setErrorMsg(null);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      textVi: textToSend,
      createdAt: Date.now(),
    };

    const nextMessages = [...messages, userMessage];
    onUpdateMessages(nextMessages);
    if (!customPrompt) setInput('');
    setLoading(true);

    if (user) {
      void saveChatMessageToFirestore(user.uid, userMessage).catch((err) => {
        console.error('Failed to sync user chat message:', err);
      });
    }

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text:
          m.role === 'user'
            ? m.textVi
            : [
                m.textVi,
                ...(m.chineseSegments ?? []).map((s) => `${s.hanzi} (${s.pinyin}) - ${s.vietnamese}`),
              ].join('\n'),
      }));

      const reply = await sendTeacherChat({
        message: textToSend,
        history: historyPayload,
        hskLevel,
      });

      const assistantMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        textVi: reply.textVi,
        chineseSegments: reply.chineseSegments,
        correction: reply.correction,
        suggestionsVi: reply.suggestionsVi,
        createdAt: Date.now(),
      };

      onUpdateMessages([...nextMessages, assistantMessage]);

      if (user) {
        void saveChatMessageToFirestore(user.uid, assistantMessage).catch((err) => {
          console.error('Failed to sync assistant chat message:', err);
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể kết nối gia sư AI. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (loading) return;
    setErrorMsg(null);
    onUpdateMessages([]);
    if (user) {
      void clearChatMessagesInFirestore(user.uid).catch((err) => {
        console.error('Failed to clear Firestore chat history:', err);
      });
    }
  };

  const starters = STARTER_PROMPTS[hskLevel] ?? STARTER_PROMPTS[2];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-11.5rem)] lg:h-[calc(100vh-7.5rem)]">
      {/* Top session bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-zinc-200 shrink-0">
        <div className="text-xs sm:text-sm text-zinc-500">
          <span>Gia sư tiếng Trung</span>
          <span aria-hidden="true" className="mx-2">·</span>
          <span>Đang điều chỉnh theo HSK {hskLevel}</span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Cuộc trò chuyện mới</span>
          </button>
        )}
      </div>

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 sm:p-8 space-y-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-lg font-semibold text-zinc-900">
                Chào bạn! Mình là gia sư tiếng Trung HanYu Share.
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Bạn có thể hỏi nghĩa từ, phân biệt ngữ pháp, nhờ kiểm tra một câu tiếng Trung vừa viết hoặc luyện đặt câu theo trình độ HSK {hskLevel}.
              </p>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-medium text-zinc-500">Gợi ý câu hỏi cho HSK {hskLevel}</p>
              <div className="grid gap-2.5 sm:grid-cols-1">
                {starters.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSend(promptText)}
                    className="text-left rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-800 hover:border-red-300 hover:bg-red-50/30 transition-colors"
                  >
                    {promptText}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-br-sm bg-red-600 text-white px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {msg.textVi}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex justify-start">
                <div className="max-w-[92%] sm:max-w-[85%] rounded-2xl rounded-bl-sm border border-zinc-200 bg-white px-4 sm:px-5 py-4 space-y-4">
                  <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {msg.textVi}
                  </p>

                  {msg.correction?.hasError && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Góp ý sửa câu tiếng Trung</span>
                      </div>
                      <p className="text-xs text-zinc-500 line-through font-zh">
                        {msg.correction.original}
                      </p>
                      <ChineseBlock
                        hanzi={msg.correction.corrected}
                        pinyin={msg.correction.correctedPinyin}
                        vietnamese={msg.correction.explanationVi}
                        showPinyin={showPinyin}
                      />
                    </div>
                  )}

                  {msg.chineseSegments && msg.chineseSegments.length > 0 && (
                    <div className="border-t border-zinc-100 pt-3 space-y-3">
                      {msg.chineseSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl bg-zinc-50 border border-zinc-200/80 p-3.5"
                        >
                          <ChineseBlock
                            hanzi={seg.hanzi}
                            pinyin={seg.pinyin}
                            vietnamese={seg.vietnamese}
                            showPinyin={showPinyin}
                            allowLocalPeek
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.suggestionsVi && msg.suggestionsVi.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {msg.suggestionsVi.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={loading}
                          onClick={() => void handleSend(suggestion)}
                          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-700 hover:border-red-300 hover:bg-red-50/40 transition-colors text-left"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
              <Loader2 className="w-4 h-4 animate-spin text-red-600" />
              <span>Gia sư đang soạn câu trả lời...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="pt-3 border-t border-zinc-200 bg-white shrink-0"
      >
        <div className="flex items-end gap-2.5">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT_LEN))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              rows={2}
              placeholder="Nhập câu hỏi tiếng Việt hoặc câu tiếng Trung cần kiểm tra..."
              className="w-full resize-none rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none"
            />
            <span className="absolute right-3 bottom-2 text-[11px] text-zinc-400 tabular-nums">
              {input.length}/{MAX_INPUT_LEN}
            </span>
          </div>
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
    </div>
  );
}
