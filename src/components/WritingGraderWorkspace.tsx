import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Info,
  Trash2,
  History,
  PenTool,
  Trophy,
} from 'lucide-react';
import type { HskLevel, WritingEvaluation } from '../types/learning';
import {
  fetchWritingHistory,
  gradeWritingEssay,
  saveWritingHistory,
  type SavedWritingRecord,
} from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock } from './ChineseBlock';
import { MascotSticker } from './MascotSticker';
import { CelebrationBurst } from './CelebrationBurst';

interface WritingGraderWorkspaceProps {
  hskLevel: HskLevel;
  showPinyin: boolean;
  lastEvaluation: WritingEvaluation | null;
  onSaveEvaluation: (evaluation: WritingEvaluation | null) => void;
}

const MAX_ESSAY_LEN = 4000;
const MAX_PROMPT_LEN = 800;

export function WritingGraderWorkspace({
  hskLevel,
  showPinyin,
  lastEvaluation,
  onSaveEvaluation,
}: WritingGraderWorkspaceProps) {
  const { user, getIdToken } = useAuth();
  const [assignmentPrompt, setAssignmentPrompt] = useState('');
  const [essay, setEssay] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showMissingPromptConfirm, setShowMissingPromptConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [historyItems, setHistoryItems] = useState<SavedWritingRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [celebrate, setCelebrate] = useState(false);

  // Track answers for the 3 personalized follow-up exercises
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [checkedExercises, setCheckedExercises] = useState<Record<string, boolean>>({});

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistoryItems([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const token = await getIdToken();
      if (token) {
        const list = await fetchWritingHistory(token);
        setHistoryItems(list);
      }
    } catch {
      // Non-blocking history load failure
    } finally {
      setLoadingHistory(false);
    }
  }, [user, getIdToken]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const executeGrade = async (allowPartialWithoutPrompt: boolean) => {
    const trimmedEssay = essay.trim();
    const trimmedPrompt = assignmentPrompt.trim();

    setErrorMsg(null);

    if (trimmedEssay.length < 5) {
      setErrorMsg('Bài viết quá ngắn (tối thiểu 5 ký tự). Vui lòng nhập bài viết tiếng Trung.');
      return;
    }

    if (!/[\u4e00-\u9fff]/.test(trimmedEssay)) {
      setErrorMsg('Bài viết cần có chữ Hán để hệ thống phân tích ngữ pháp và từ vựng.');
      return;
    }

    if (!trimmedPrompt && !allowPartialWithoutPrompt) {
      setShowMissingPromptConfirm(true);
      return;
    }

    setShowMissingPromptConfirm(false);
    setLoading(true);
    setSelectedAnswers({});
    setCheckedExercises({});

    try {
      const result = await gradeWritingEssay({
        essay: trimmedEssay,
        assignmentPrompt: trimmedPrompt || undefined,
        hskLevel,
      });
      onSaveEvaluation(result);

      // Trigger celebration if high score
      if (result.totalScore / result.maxPossibleScore >= 0.8) {
        setCelebrate(true);
      }

      if (user) {
        const token = await getIdToken();
        if (token) {
          void saveWritingHistory(token, {
            hskLevel,
            assignmentPrompt: trimmedPrompt || undefined,
            essay: trimmedEssay,
            evaluation: result,
          })
            .then(() => loadHistory())
            .catch((err) => console.error('Save writing history error:', err));
        }
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể chấm bài lúc này. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyImproved = async () => {
    if (!lastEvaluation?.improvedVersion?.hanzi) return;
    try {
      await navigator.clipboard.writeText(lastEvaluation.improvedVersion.hanzi);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMsg('Không thể sao chép tự động. Bạn có thể bôi đen và sao chép trực tiếp.');
    }
  };

  const handleReset = () => {
    setAssignmentPrompt('');
    setEssay('');
    setErrorMsg(null);
    setShowMissingPromptConfirm(false);
    onSaveEvaluation(null);
    setSelectedAnswers({});
    setCheckedExercises({});
    setCelebrate(false);
  };

  const isHighScore =
    lastEvaluation &&
    lastEvaluation.totalScore / lastEvaluation.maxPossibleScore >= 0.8;

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <CelebrationBurst active={celebrate} />

      {/* Left column: Submission Form */}
      <section className="lg:col-span-5 rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-800">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Nộp bài viết tiếng Trung</h2>
              <p className="text-xs text-stone-500">
                Chuẩn HSK {hskLevel} · 5 tiêu chí chi tiết
              </p>
            </div>
          </div>
          {(essay || assignmentPrompt || lastEvaluation) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-2.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 hover:text-red-800 whitespace-nowrap shrink-0 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="assignment-prompt-input"
                className="text-xs sm:text-sm font-semibold text-stone-800"
              >
                Đề bài gốc (không bắt buộc)
              </label>
              <span className="text-xs text-stone-400 tabular-nums font-mono">
                {assignmentPrompt.length}/{MAX_PROMPT_LEN}
              </span>
            </div>
            <textarea
              id="assignment-prompt-input"
              rows={2}
              value={assignmentPrompt}
              onChange={(e) => {
                setAssignmentPrompt(e.target.value.slice(0, MAX_PROMPT_LEN));
                if (e.target.value.trim()) setShowMissingPromptConfirm(false);
              }}
              placeholder="Ví dụ: Viết đoạn văn kể về sở thích hoặc chuyến du lịch gần đây của bạn..."
              className="w-full rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] px-3.5 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-red-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-800 transition-all"
            />
            <p className="text-[11px] text-stone-500">
              Nhập đề bài để chấm đủ 5 tiêu chí (100đ). Nếu không có đề, hệ thống chấm 4 tiêu chí độc lập (85đ).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="essay-input" className="text-xs sm:text-sm font-semibold text-stone-800">
                Bài viết tiếng Trung của bạn
              </label>
              <span className="text-xs text-stone-400 tabular-nums font-mono">
                {essay.length}/{MAX_ESSAY_LEN}
              </span>
            </div>
            <textarea
              id="essay-input"
              rows={9}
              value={essay}
              onChange={(e) => setEssay(e.target.value.slice(0, MAX_ESSAY_LEN))}
              placeholder="Dán hoặc gõ đoạn văn tiếng Trung giản thể của bạn vào đây..."
              className="w-full rounded-2xl border border-[#EFE7DE] bg-white px-4 py-3 font-zh text-base text-stone-900 placeholder:font-sans placeholder:text-sm placeholder:text-stone-400 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 leading-relaxed shadow-xs transition-all"
            />
          </div>

          {showMissingPromptConfirm && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3 animate-pop">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1 leading-relaxed">
                  <p className="font-bold">Bạn chưa nhập đề bài gốc</p>
                  <p>
                    Để tính điểm Bám sát đề bài (15 điểm), bạn có thể nhập đề bài vào ô phía trên — hoặc chấm ngay 4 tiêu chí độc lập (tối đa 85 điểm).
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void executeGrade(true)}
                  disabled={loading}
                  className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:from-red-700 hover:to-red-800 whitespace-nowrap"
                >
                  Chấm 4 tiêu chí (85đ)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMissingPromptConfirm(false);
                    document.getElementById('assignment-prompt-input')?.focus();
                  }}
                  className="rounded-xl border border-stone-300 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 whitespace-nowrap"
                >
                  Nhập đề bài
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 flex items-start gap-2 text-xs sm:text-sm text-red-900 shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void executeGrade(false)}
            disabled={loading || !essay.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 via-red-850 to-red-900 px-5 py-3.5 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] card-lift"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Tiểu Du đang phân tích và chấm bài...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Chấm bài viết ngay</span>
              </>
            )}
          </button>
        </div>

        {user && (
          <div className="border-t border-[#EFE7DE] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700">
                <History className="w-3.5 h-3.5 text-red-800" />
                <span>Lịch sử bài viết đã chấm</span>
              </span>
              {loadingHistory && <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />}
            </div>

            {historyItems.length === 0 ? (
              <p className="text-xs text-stone-500">
                Các bài viết sau khi chấm sẽ tự động lưu vào đây để bạn tiện xem lại.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {historyItems.map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => {
                      setAssignmentPrompt(record.assignmentPrompt ?? '');
                      setEssay(record.essay);
                      setSelectedAnswers({});
                      setCheckedExercises({});
                      onSaveEvaluation(record.evaluationJson);
                    }}
                    className="w-full text-left rounded-2xl border border-stone-200/90 bg-[#FAF7F2] px-3.5 py-2.5 hover:border-red-300 hover:bg-red-50/20 transition-all card-lift space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-stone-800">
                        HSK {record.hskLevel}
                      </span>
                      <span className="font-mono tabular-nums font-bold text-red-900 bg-red-100/80 px-2 py-0.5 rounded-full">
                        {record.totalScore}/{record.maxPossibleScore} đ
                      </span>
                    </div>
                    <p className="font-zh text-xs text-stone-600 truncate">{record.essay}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Right column: Grading Result Panel */}
      <section className="lg:col-span-7 space-y-6">
        {loading ? (
          <div className="rounded-3xl border border-[#EFE7DE] bg-white p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[380px] shadow-sm animate-pop">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md">
              <MascotSticker name="05_writing" size="md" animate="wiggle" />
            </div>
            <div className="space-y-1.5">
              <p className="text-base font-bold text-stone-900">
                Tiểu Du đang phân tích bài viết của bạn...
              </p>
              <p className="text-xs sm:text-sm text-stone-500 max-w-sm leading-relaxed">
                Đang đối chiếu ngữ pháp, đo lường từ vựng theo khung HSK {hskLevel}, sửa từng câu văn và soạn bài tập củng cố riêng cho bạn.
              </p>
            </div>
          </div>
        ) : !lastEvaluation ? (
          <div className="rounded-3xl border border-[#EFE7DE] bg-gradient-to-br from-white to-[#FCFAF7] p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-2xl bg-red-50 border border-red-200/60 shrink-0">
                <MascotSticker name="05_writing" size="md" animate="float-gentle" />
              </div>
              <div className="space-y-1 flex-1">
                <h2 className="text-lg font-bold text-stone-900">
                  Thang điểm chấm bài minh bạch chuẩn HSK
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  Nhập bài viết tiếng Trung của bạn ở cột bên trái và bấm <strong className="text-red-900">"Chấm bài viết ngay"</strong>. Tiểu Du sẽ phân tích chi tiết từng lỗi sai thực tế và gợi ý cách diễn đạt hay hơn.
                </p>
              </div>
            </div>

            <div className="border-t border-[#EFE7DE] pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-semibold text-stone-800">1. Ngữ pháp & Đặt câu</span>
                <span className="font-mono tabular-nums font-bold text-red-900">30 điểm</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-semibold text-stone-800">2. Độ phong phú từ vựng</span>
                <span className="font-mono tabular-nums font-bold text-red-900">20 điểm</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-semibold text-stone-800">3. Độ tự nhiên diễn đạt</span>
                <span className="font-mono tabular-nums font-bold text-red-900">20 điểm</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200/70">
                <span className="font-semibold text-stone-800">4. Tính liên kết mạch lạc</span>
                <span className="font-mono tabular-nums font-bold text-red-900">15 điểm</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 sm:col-span-2">
                <span className="font-semibold text-amber-900">5. Bám sát đề bài (khi có đề)</span>
                <span className="font-mono tabular-nums font-bold text-amber-900">15 điểm</span>
              </div>
            </div>

            <div className="rounded-2xl bg-red-50/60 border border-red-100 p-3.5 text-xs text-red-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Nguyên tắc công bằng: Những câu đã đúng ngữ pháp sẽ không bị trừ điểm, hệ thống chỉ tách biệt rõ ràng giữa "Lỗi sai thực tế" và "Gợi ý diễn đạt tự nhiên hơn".
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-pop">
            {/* Total score & Celebration card */}
            <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-6 shadow-sm overflow-hidden relative">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EFE7DE] pb-5">
                <div className="flex items-center gap-4">
                  {/* Mascot celebration sticker */}
                  <div className="shrink-0 p-1 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md">
                    <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center overflow-hidden">
                      <MascotSticker
                        name={isHighScore ? '11_perfect_100' : '02_cheer'}
                        size="md"
                        animate="float-gentle"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                        {lastEvaluation.mode === 'full'
                          ? 'Đánh giá 5 tiêu chí hoàn chỉnh'
                          : 'Đánh giá 4 tiêu chí (chưa có đề bài)'}
                      </p>
                      {isHighScore && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold border border-amber-300">
                          <Trophy className="w-3 h-3 text-amber-600" />
                          Xuất sắc!
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-4xl sm:text-5xl font-extrabold font-mono tabular-nums text-red-900">
                        {lastEvaluation.totalScore}
                      </span>
                      <span className="text-lg font-mono tabular-nums font-semibold text-stone-400">
                        / {lastEvaluation.maxPossibleScore} điểm
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right text-xs text-stone-500 max-w-xs leading-relaxed hidden sm:block">
                  {lastEvaluation.disclaimerVi}
                </div>
              </div>

              {lastEvaluation.missingPromptNoteVi && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                  {lastEvaluation.missingPromptNoteVi}
                </div>
              )}

              <p className="text-sm text-stone-800 leading-relaxed font-medium bg-[#FAF7F2] p-4 rounded-2xl border border-[#EFE7DE]">
                {lastEvaluation.overallFeedbackVi}
              </p>

              {/* 5 Criteria Bars with lacquer gradient */}
              <div className="space-y-4 pt-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                  Chi tiết điểm từng tiêu chí
                </h4>
                {lastEvaluation.criteria.map((c) => {
                  const pct =
                    c.score !== null ? Math.round((c.score / c.maxScore) * 100) : 0;
                  return (
                    <div key={c.key} className="space-y-1.5 p-3 rounded-2xl bg-stone-50/80 border border-stone-200/60">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-bold text-stone-800">{c.labelVi}</span>
                        <span className="font-mono tabular-nums text-xs font-bold text-red-900 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                          {c.score !== null ? `${c.score} / ${c.maxScore}` : `Chưa chấm / ${c.maxScore}`}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-stone-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            c.score === null
                              ? 'bg-stone-300'
                              : 'bg-gradient-to-r from-red-800 to-amber-600'
                          }`}
                          style={{ width: `${c.score === null ? 0 : pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">{c.commentVi}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Mistakes List */}
            <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#EFE7DE] pb-3">
                <h3 className="text-base font-bold text-stone-900">
                  Lỗi sai cần sửa ({lastEvaluation.mistakes.length})
                </h3>
                <span className="text-xs font-semibold text-stone-500">
                  Chỉ tính lỗi sai ngữ pháp & chính tả
                </span>
              </div>

              {lastEvaluation.mistakes.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3.5 flex items-center gap-3 text-sm text-emerald-900">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-semibold">
                    Tuyệt vời! Không phát hiện lỗi ngữ pháp hay dùng từ sai trong bài viết.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {lastEvaluation.mistakes.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-red-200/80 bg-red-50/30 p-4 space-y-2 card-lift"
                    >
                      <div className="text-xs font-bold text-red-900 inline-block px-2 py-0.5 rounded-full bg-red-100">
                        Lỗi {idx + 1} · {m.categoryVi}
                      </div>
                      <div className="text-sm text-stone-400 line-through font-zh">
                        {m.original}
                      </div>
                      <ChineseBlock
                        hanzi={m.corrected}
                        pinyin={m.correctedPinyin}
                        vietnamese={m.explanationVi}
                        showPinyin={showPinyin}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Style Suggestions (Non-errors) */}
            {lastEvaluation.styleSuggestions.length > 0 && (
              <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-4 shadow-sm">
                <div className="border-b border-[#EFE7DE] pb-3">
                  <h3 className="text-base font-bold text-stone-900">
                    Gợi ý diễn đạt tự nhiên hơn
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Những câu này đã đúng ngữ pháp, đây là cách hành văn mượt mà hơn của người bản xứ.
                  </p>
                </div>
                <div className="space-y-3">
                  {lastEvaluation.styleSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-[#EFE7DE] bg-[#FCFAF7] p-4 space-y-2 card-lift"
                    >
                      <div className="text-xs text-stone-500 font-zh">
                        Câu gốc của bạn: {s.original}
                      </div>
                      <ChineseBlock
                        hanzi={s.suggestion}
                        pinyin={s.suggestionPinyin}
                        vietnamese={s.reasonVi}
                        showPinyin={showPinyin}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Improved Version + Copy Button */}
            <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <h3 className="text-base font-bold text-stone-900">Phiên bản sửa hoàn chỉnh</h3>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopyImproved()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold text-stone-800 hover:border-red-300 hover:text-red-900 whitespace-nowrap shrink-0 min-h-[36px] transition-colors shadow-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-red-800" />
                      <span>Sao chép bài đã sửa</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-2xl border border-[#EFE7DE] bg-[#FCFAF7] p-5">
                <ChineseBlock
                  hanzi={lastEvaluation.improvedVersion.hanzi}
                  pinyin={lastEvaluation.improvedVersion.pinyin}
                  vietnamese={lastEvaluation.improvedVersion.vietnameseTranslation}
                  showPinyin={showPinyin}
                  large
                />
              </div>
            </div>

            {/* 3 Personalized Follow-Up Exercises */}
            {lastEvaluation.followUpExercises.length > 0 && (
              <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-5 shadow-sm">
                <div className="border-b border-[#EFE7DE] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <h3 className="text-base font-bold text-stone-900">
                      3 Bài tập củng cố cá nhân hóa
                    </h3>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    Được tạo riêng dựa trên các điểm bạn vừa viết sai để ghi nhớ lâu hơn.
                  </p>
                </div>

                <div className="space-y-4">
                  {lastEvaluation.followUpExercises.map((ex, idx) => {
                    const userChoice = selectedAnswers[ex.id];
                    const isChecked = Boolean(checkedExercises[ex.id]);
                    const isCorrect = userChoice === ex.correctAnswer;

                    return (
                      <div
                        key={ex.id}
                        className="rounded-2xl border border-[#EFE7DE] p-4 sm:p-5 space-y-3 bg-[#FCFAF7]"
                      >
                        <div className="text-xs font-bold text-red-900">
                          Bài tập {idx + 1} · {ex.instructionVi}
                        </div>
                        <ChineseBlock
                          hanzi={ex.promptChinese}
                          pinyin={ex.promptPinyin}
                          showPinyin={showPinyin}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {ex.options.map((opt) => {
                            const selected = userChoice === opt;
                            const showCorrectHighlight = isChecked && opt === ex.correctAnswer;
                            const showWrongHighlight =
                              isChecked && selected && opt !== ex.correctAnswer;

                            return (
                              <button
                                key={opt}
                                type="button"
                                disabled={isChecked}
                                onClick={() =>
                                  setSelectedAnswers((prev) => ({ ...prev, [ex.id]: opt }))
                                }
                                className={`rounded-xl border px-4 py-3 text-left text-sm font-zh transition-all min-h-[44px] ${
                                  showCorrectHighlight
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                                    : showWrongHighlight
                                      ? 'border-red-400 bg-red-50 text-red-900'
                                      : selected
                                        ? 'border-red-800 bg-red-50/60 text-red-950 font-bold ring-1 ring-red-800'
                                        : 'border-stone-200 bg-white text-stone-800 hover:border-red-300 hover:bg-stone-50'
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {!isChecked ? (
                          <button
                            type="button"
                            disabled={!userChoice}
                            onClick={() =>
                              setCheckedExercises((prev) => ({ ...prev, [ex.id]: true }))
                            }
                            className="rounded-xl bg-gradient-to-r from-red-800 to-red-900 px-4 py-2 text-xs font-bold text-white hover:from-red-700 hover:to-red-800 disabled:opacity-40 transition-all"
                          >
                            Kiểm tra đáp án
                          </button>
                        ) : (
                          <div
                            className={`rounded-xl px-4 py-3 text-xs leading-relaxed space-y-1 animate-pop ${
                              isCorrect
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                : 'bg-red-50 text-red-900 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Chính xác! Rất tốt!</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                  <span>Chưa đúng — Đáp án chính xác: {ex.correctAnswer}</span>
                                </>
                              )}
                            </div>
                            <p>{ex.explanationVi}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
