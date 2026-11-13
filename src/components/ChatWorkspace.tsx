import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, Loader2, AlertCircle, CheckCircle2, Sparkles, MessageSquare } from 'lucide-react';
import type { ChatMessage, HskLevel } from '../types/learning';
import { sendTeacherChat } from '../services/apiClient';
import {
  clearChatMessagesInFirestore,
  saveChatMessageToFirestore,
} from '../services/firestoreSync';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock } from './ChineseBlock';
import { MascotSticker } from './MascotSticker';

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
                m.chineseSegments?.map((s) => `${s.hanzi} (${s.pinyin})`).join(' '),
              ]
                .filter(Boolean)
                .join('\n'),
      }));

      const reply = await sendTeacherChat({
        message: textToSend,
        hskLevel,
        history: historyPayload,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        textVi: reply.textVi,
        chineseSegments: reply.chineseSegments,
        correction: reply.correction,
        suggestionsVi: reply.suggestionsVi,
        createdAt: Date.now(),
      };

      const finalMessages = [...nextMessages, assistantMessage];
      onUpdateMessages(finalMessages);

      if (user) {
        void saveChatMessageToFirestore(user.uid, assistantMessage).catch((err) => {
          console.error('Failed to sync assistant chat message:', err);
        });
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể kết nối với gia sư. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (loading) return;
    onUpdateMessages([]);
    setErrorMsg(null);
    if (user) {
      try {
        await clearChatMessagesInFirestore(user.uid);
      } catch (err) {
        console.error('Failed to clear chat history in Firestore:', err);
      }
    }
  };

  const starters = STARTER_PROMPTS[hskLevel] ?? STARTER_PROMPTS[1];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-11.5rem)] lg:h-[calc(100vh-8.5rem)]">
      {/* Top session bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#EFE7DE] shrink-0">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-600">
          <span className="font-semibold text-red-900">Gia sư Tiểu Du AI</span>
          <span aria-hidden="true" className="text-stone-300">·</span>
          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-800 text-[11px] font-semibold border border-red-200/50">
            Mục tiêu HSK {hskLevel}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-red-800 transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đoạn chat mới</span>
          </button>
        )}
      </div>

      {/* Chat scroll area */}
      <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-red-200/70 bg-gradient-to-br from-white via-[#FCFAF7] to-red-50/30 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Mascot Greeting Banner */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="shrink-0 p-2 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md shadow-red-950/15 ring-2 ring-amber-300/40">
                <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  <MascotSticker name="01_reading" size="lg" animate="float-gentle" />
                </div>
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100/80 text-red-800 text-xs font-bold border border-red-200/60">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Chào mừng bạn đến với HanYu Share</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                  Chào bạn! Mình là Tiểu Du, gia sư tiếng Trung của bạn.
                </h2>
                <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                  Bạn có thể hỏi bất kỳ thắc mắc nào về ngữ pháp, nhờ kiểm tra một câu vừa viết, luyện dịch câu Việt - Trung, hoặc hỏi cách dùng từ chuẩn theo cấp độ <strong className="text-red-900">HSK {hskLevel}</strong>.
                </p>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="space-y-3 pt-2 border-t border-[#EFE7DE]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Câu hỏi gợi ý nhanh cho HSK {hskLevel}
                </p>
                <span className="text-[11px] text-red-800 font-semibold">Bấm để hỏi ngay</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-1">
                {starters.map((promptText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => void handleSend(promptText)}
                    className="text-left rounded-2xl border border-stone-200/90 bg-white px-4 py-3 text-sm text-stone-800 hover:border-red-400 hover:bg-red-50/40 hover:text-red-950 transition-all card-lift flex items-center justify-between gap-3 group shadow-xs"
                  >
                    <span className="leading-snug">{promptText}</span>
                    <span className="shrink-0 text-xs font-semibold text-red-800 opacity-0 group-hover:opacity-100 transition-opacity">
                      Hỏi →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end animate-pop">
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-md bg-gradient-to-r from-red-800 to-red-900 text-white px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap shadow-md shadow-red-950/15 border border-red-700/50">
                    {msg.textVi}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start gap-3 justify-start animate-pop">
                {/* Assistant Mascot Avatar */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-800 to-amber-950 p-0.5 shrink-0 shadow-sm mt-1">
                  <div className="w-full h-full rounded-[9px] bg-white flex items-center justify-center overflow-hidden">
                    <MascotSticker name="01_reading" size="xs" className="w-7 h-7" />
                  </div>
                </div>

                <div className="max-w-[90%] sm:max-w-[85%] rounded-3xl rounded-tl-md border border-[#EFE7DE] bg-white px-5 py-4 space-y-4 shadow-sm">
                  <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap">
                    {msg.textVi}
                  </p>

                  {/* Grammar correction card */}
                  {msg.correction?.hasError && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Tiểu Du gợi ý chỉnh sửa câu</span>
                      </div>
                      <p className="text-xs text-stone-400 line-through font-zh">
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

                  {/* Chinese Segments */}
                  {msg.chineseSegments && msg.chineseSegments.length > 0 && (
                    <div className="border-t border-stone-100 pt-3 space-y-3">
                      {msg.chineseSegments.map((seg, idx) => (
                        <div
                          key={idx}
                          className="rounded-2xl bg-[#FCFAF7] border border-[#EFE7DE] p-3.5 card-lift"
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

                  {/* Follow-up suggestions */}
                  {msg.suggestionsVi && msg.suggestionsVi.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-stone-100">
                      {msg.suggestionsVi.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={loading}
                          onClick={() => void handleSend(suggestion)}
                          className="rounded-xl border border-red-200/80 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-900 hover:border-red-400 hover:bg-red-100/70 transition-all text-left card-lift"
                        >
                          {suggestion} →
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading state with cute Xiao Yu note-taking sticker */}
        {loading && (
          <div className="flex items-center gap-3 justify-start animate-pop">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-800 to-amber-950 p-0.5 shrink-0 shadow-sm">
              <div className="w-full h-full rounded-[9px] bg-white flex items-center justify-center overflow-hidden">
                <MascotSticker name="05_writing" size="xs" animate="wiggle" className="w-7 h-7" />
              </div>
            </div>
            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-red-200/80 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-red-950 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-red-800" />
              <span>Tiểu Du đang suy nghĩ và tra cứu câu trả lời...</span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-900 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMsg}</div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Input composer with crimson accents */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
        className="pt-3 border-t border-[#EFE7DE] bg-[#FAF7F2] shrink-0"
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
              placeholder="Nhập câu hỏi tiếng Việt hoặc câu tiếng Trung bạn muốn kiểm tra..."
              className="w-full resize-none rounded-2xl border border-[#EFE7DE] bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-red-800 focus:ring-1 focus:ring-red-800 focus:outline-none shadow-sm transition-all"
            />
            <span className="absolute right-3 bottom-2.5 text-[11px] text-stone-400 tabular-nums font-mono">
              {input.length}/{MAX_INPUT_LEN}
            </span>
          </div>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 to-red-900 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] whitespace-nowrap shrink-0 card-lift"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Gửi câu hỏi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
