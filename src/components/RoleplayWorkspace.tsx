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
  Sparkles,
  Coffee,
  Car,
  ShoppingBag,
  Stethoscope,
  Briefcase,
} from 'lucide-react';
import type { HskLevel, LanguageCorrection, RoleplayScenario } from '../types/learning';
import { sendRoleplayTurn } from '../services/apiClient';
import { ChineseBlock } from './ChineseBlock';
import { LiveVoicePanel } from './LiveVoicePanel';
import { MascotSticker } from './MascotSticker';

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

const SCENARIO_ICONS: Record<string, typeof Coffee> = {
  cafe: Coffee,
  taxi: Car,
  shopping: ShoppingBag,
  clinic: Stethoscope,
  interview: Briefcase,
};

const SCENARIOS: RoleplayScenario[] = [
  {
    id: 'cafe',
    titleVi: 'Gọi đồ uống tại quán cà phê',
    descriptionVi: 'Luyện gọi món, chỉnh độ ngọt, đá và thanh toán quét mã.',
    partnerRoleVi: 'Nhân viên pha chế (Barista)',
    partnerRoleZh: '咖啡店员',
    starterHanzi: '你好！欢迎光临，请问今天想喝点什么？',
    starterPinyin: 'Nǐ hǎo! Huānyíng guānglín, qǐngwèn jīntiān xiǎng hē diǎn shénme?',
    starterVi: 'Xin chào! Chào mừng quý khách, hôm nay bạn muốn uống gì ạ?',
  },
  {
    id: 'taxi',
    titleVi: 'Hỏi đường & đi taxi',
    descriptionVi: 'Nói địa điểm muốn đến, hỏi thời gian di chuyển và cước phí.',
    partnerRoleVi: 'Tài xế taxi',
    partnerRoleZh: '出租车司机',
    starterHanzi: '你好，上车吧！请问你要去哪里？',
    starterPinyin: 'Nǐ hǎo, shàngchē ba! Qǐngwèn nǐ yào qù nǎlǐ?',
    starterVi: 'Chào bạn, lên xe đi! Xin hỏi bạn muốn đi đâu?',
  },
  {
    id: 'shopping',
    titleVi: 'Mua sắm & hỏi giá quần áo',
    descriptionVi: 'Hỏi kích cỡ (size), thử đồ, màu sắc và thương lượng giá cả.',
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
    descriptionVi: 'Giới thiệu bản thân, kinh nghiệm và lý do ứng tuyển vào công ty.',
    partnerRoleVi: 'Nhà tuyển dụng (HR)',
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
      <div className="max-w-5xl mx-auto space-y-7 animate-pop">
        {/* Welcome Lounge Banner */}
        <section className="rounded-3xl border border-red-200/70 bg-gradient-to-br from-white via-[#FCFAF7] to-red-50/40 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="shrink-0 p-2 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md ring-2 ring-amber-300/40">
              <div className="w-20 h-20 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                <MascotSticker name="12_cozy" size="lg" animate="float-gentle" />
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-100/80 text-red-800 text-xs font-bold border border-red-200/60">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Phòng luyện phản xạ giao tiếp thực tế</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                Chọn tình huống đóng vai · Chuẩn HSK {hskLevel}
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed max-w-2xl">
                Bạn có thể trò chuyện bằng tin nhắn chữ Hán hoặc bấm <strong className="text-red-900">"Gọi luyện nói"</strong> để trò chuyện trực tiếp 2 chiều với AI qua giọng nói như đang gọi điện thoại cho người bản xứ!
              </p>
            </div>
          </div>
        </section>

        {/* Scenarios Grid */}
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Tình huống giao tiếp phổ biến
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCENARIOS.map((sc) => {
              const IconComp = SCENARIO_ICONS[sc.id] ?? MessageSquareText;
              return (
                <div
                  key={sc.id}
                  className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm card-lift"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl bg-red-50 text-red-800 flex items-center justify-center border border-red-200/60">
                        <IconComp className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        {sc.partnerRoleVi}
                      </span>
                    </div>

                    <h4 className="text-base font-bold text-stone-900">{sc.titleVi}</h4>
                    <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                      {sc.descriptionVi}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => startScenario(sc, 'text')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:border-red-300 hover:text-red-900 min-h-[40px] transition-colors shadow-xs"
                    >
                      <MessageSquareText className="w-3.5 h-3.5 text-red-800" />
                      <span>Nhắn tin</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startScenario(sc, 'voice')}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-3 py-2 text-xs font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 min-h-[40px] transition-all card-lift"
                    >
                      <Mic className="w-3.5 h-3.5 text-amber-300" />
                      <span>Gọi luyện nói</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Custom Scenario Form */}
        <section className="rounded-3xl border border-[#EFE7DE] bg-gradient-to-br from-white to-[#FCFAF7] p-5 sm:p-7 space-y-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-stone-900">
                Hoặc tạo tình huống hội thoại tự do
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Ví dụ: Thuê phòng khách sạn ở Thượng Hải, Mặc cả ở chợ đêm Bắc Kinh, Nhờ người dân chụp ảnh giúp...
            </p>
          </div>

          <form onSubmit={handleStartCustom} className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value.slice(0, 120))}
              placeholder="Tên tình huống (vd: Trả lại hàng đã mua)..."
              className="sm:col-span-6 rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-800 focus:outline-none min-h-[46px] shadow-xs"
            />
            <input
              type="text"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value.slice(0, 80))}
              placeholder="Vai của AI (vd: Thu ngân siêu thị)..."
              className="sm:col-span-4 rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-800 focus:outline-none min-h-[46px] shadow-xs"
            />
            <button
              type="submit"
              disabled={!customTitle.trim()}
              className="sm:col-span-2 rounded-2xl bg-gradient-to-r from-red-800 to-red-900 px-4 py-3 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all min-h-[46px] card-lift"
            >
              Vào vai ngay
            </button>
          </form>
        </section>
      </div>
    );
  }

  const latestSuggestions =
    [...turns].reverse().find((t) => t.role === 'assistant')?.suggestedReplies ?? [];

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-11.5rem)] lg:h-[calc(100vh-8.5rem)]">
      {/* Active Scenario Header + Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EFE7DE] shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setActiveScenario(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:border-red-300 hover:text-red-900 whitespace-nowrap shrink-0 transition-colors shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Đổi tình huống</span>
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-stone-900 truncate">
              {activeScenario.titleVi}
            </h2>
            <p className="text-xs text-stone-500 truncate">
              {activeScenario.partnerRoleVi} · HSK {hskLevel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#FAF7F2] border border-[#EFE7DE]">
            <button
              type="button"
              onClick={() => setMode('text')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                mode === 'text'
                  ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <MessageSquareText className="w-3.5 h-3.5 text-red-800" />
              <span>Nhắn tin</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('voice')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                mode === 'voice'
                  ? 'bg-gradient-to-r from-red-800 to-red-900 text-white shadow-xs'
                  : 'text-stone-600 hover:text-red-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Gọi thoại</span>
            </button>
          </div>

          {mode === 'text' && (
            <button
              type="button"
              onClick={() => startScenario(activeScenario, 'text')}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 hover:text-red-800 whitespace-nowrap shrink-0 shadow-xs transition-colors"
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
                  <div key={turn.id} className="flex justify-end animate-pop">
                    <div className="max-w-[85%] sm:max-w-[75%] rounded-3xl rounded-br-md bg-gradient-to-r from-red-800 to-red-900 text-white px-5 py-3.5 font-zh text-base leading-relaxed shadow-md shadow-red-950/15 border border-red-700/50">
                      {turn.hanzi}
                    </div>
                  </div>
                );
              }

              return (
                <div key={turn.id} className="flex justify-start animate-pop">
                  <div className="max-w-[92%] sm:max-w-[85%] rounded-3xl rounded-tl-md border border-[#EFE7DE] bg-white px-5 py-4 space-y-3.5 shadow-sm">
                    {turn.correction?.hasError && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Góp ý cách diễn đạt tự nhiên hơn</span>
                        </div>
                        <p className="text-xs text-stone-400 line-through font-zh">
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

                    <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
                      <span className="w-2 h-2 rounded-full bg-red-800" />
                      <span className="text-xs font-bold text-stone-700">
                        {activeScenario.partnerRoleVi}
                      </span>
                    </div>

                    <ChineseBlock
                      hanzi={turn.hanzi}
                      pinyin={turn.pinyin}
                      vietnamese={turn.vi}
                      showPinyin={showPinyin}
                      allowLocalPeek
                      large
                    />
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start animate-pop">
                <div className="inline-flex items-center gap-2.5 rounded-2xl border border-red-200/80 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-red-950 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-red-800" />
                  <span>{activeScenario.partnerRoleVi} đang trả lời bạn...</span>
                </div>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-900 shadow-xs"
              >
                <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div ref={scrollEndRef} />
          </div>

          {latestSuggestions.length > 0 && !loading && (
            <div className="pb-3 flex flex-wrap items-center gap-2 shrink-0 border-t border-[#EFE7DE] pt-2.5">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-stone-500">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Gợi ý câu đối đáp:</span>
              </span>
              {latestSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSend(s.hanzi)}
                  className="rounded-xl border border-red-200/80 bg-red-50/60 px-3.5 py-1.5 text-left text-xs hover:border-red-400 hover:bg-red-100/80 transition-all card-lift"
                >
                  <span className="font-zh font-bold text-stone-900">{s.hanzi}</span>
                  {showPinyin && <span className="text-stone-500 ml-1.5 font-mono">({s.pinyin})</span>}
                  <span className="text-red-900 ml-1.5 font-medium">· {s.vi}</span>
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className="pt-3 border-t border-[#EFE7DE] bg-[#FAF7F2] shrink-0"
          >
            <div className="flex items-end gap-2.5">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 1000))}
                placeholder="Nhập câu trả lời bằng tiếng Trung (hoặc bấm gợi ý bên trên)..."
                className="flex-1 rounded-2xl border border-[#EFE7DE] bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 min-h-[46px] shadow-xs transition-all"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 to-red-900 px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[46px] whitespace-nowrap shrink-0 card-lift"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Đáp lại</span>
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
