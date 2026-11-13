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
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left column: Submission Form */}
      <section className="lg:col-span-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Nộp bài viết tiếng Trung</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Chấm theo chuẩn HSK {hskLevel} · Giải thích hoàn toàn bằng tiếng Việt
            </p>
          </div>
          {(essay || assignmentPrompt || lastEvaluation) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50 whitespace-nowrap shrink-0"
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
                className="text-sm font-medium text-zinc-800"
              >
                Đề bài gốc (không bắt buộc)
              </label>
              <span className="text-xs text-zinc-400 tabular-nums">
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
              placeholder="Ví dụ: Viết đoạn văn 100 chữ kể về thói quen cuối tuần của bạn (bằng tiếng Việt hoặc tiếng Trung)..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none"
            />
            <p className="text-xs text-zinc-500">
              Cung cấp đề bài để chấm đủ 5 tiêu chí (100 điểm). Nếu bỏ trống, hệ thống sẽ chấm 4 tiêu chí (85 điểm).
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="essay-input" className="text-sm font-medium text-zinc-800">
                Bài viết tiếng Trung của bạn
              </label>
              <span className="text-xs text-zinc-400 tabular-nums">
                {essay.length}/{MAX_ESSAY_LEN}
              </span>
            </div>
            <textarea
              id="essay-input"
              rows={9}
              value={essay}
              onChange={(e) => setEssay(e.target.value.slice(0, MAX_ESSAY_LEN))}
              placeholder="Dán hoặc gõ đoạn văn tiếng Trung giản thể của bạn vào đây..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 font-zh text-base text-zinc-900 placeholder:font-sans placeholder:text-sm placeholder:text-zinc-400 focus:border-red-600 focus:outline-none leading-relaxed"
            />
          </div>

          {showMissingPromptConfirm && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1 leading-relaxed">
                  <p className="font-semibold">Bạn chưa nhập đề bài gốc</p>
                  <p>
                    Để chấm điểm Bám sát đề (15 điểm) chính xác, bạn có thể nhập đề bài ở ô phía trên — hoặc chọn chấm ngay 4 tiêu chí độc lập (tối đa 85 điểm) mà không tự bịa điểm bám sát đề.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void executeGrade(true)}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap"
                >
                  Chấm 4 tiêu chí (85 điểm)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowMissingPromptConfirm(false);
                    document.getElementById('assignment-prompt-input')?.focus();
                  }}
                  className="rounded-lg border border-zinc-300 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
                >
                  Nhập đề bài gốc
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 flex items-start gap-2 text-xs sm:text-sm text-red-800"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => void executeGrade(false)}
            disabled={loading || !essay.trim()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang phân tích và chấm bài...</span>
              </>
            ) : (
              <span>Chấm bài viết</span>
            )}
          </button>
        </div>

        {user && (
          <div className="border-t border-zinc-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
                <History className="w-3.5 h-3.5 text-red-600" />
                <span>Bài viết đã lưu</span>
              </span>
              {loadingHistory && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
            </div>

            {historyItems.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Các bài bạn chấm sau khi đăng nhập sẽ tự động lưu tại đây.
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
                    className="w-full text-left rounded-xl border border-zinc-200 bg-zinc-50/70 px-3 py-2.5 hover:border-red-300 hover:bg-red-50/20 transition-colors space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-zinc-700">
                        HSK {record.hskLevel}
                      </span>
                      <span className="font-mono tabular-nums font-semibold text-red-700">
                        {record.totalScore}/{record.maxPossibleScore} đ
                      </span>
                    </div>
                    <p className="font-zh text-xs text-zinc-600 truncate">{record.essay}</p>
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
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 flex flex-col items-center justify-center text-center space-y-3 min-h-[340px]">
            <Loader2 className="w-7 h-7 animate-spin text-red-600" />
            <p className="text-sm font-medium text-zinc-900">
              Đang đánh giá ngữ pháp, từ vựng và độ tự nhiên...
            </p>
            <p className="text-xs text-zinc-500 max-w-sm">
              Hệ thống sẽ kiểm tra lỗi thực tế, gợi ý bản sửa hoàn chỉnh và tạo 3 bài tập củng cố riêng cho bạn.
            </p>
          </div>
        ) : !lastEvaluation ? (
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-6 sm:p-8 space-y-5">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold text-zinc-900">
                Thang điểm chấm bài minh bạch
              </h2>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Sau khi bạn gửi bài viết tiếng Trung, kết quả phân tích chi tiết sẽ xuất hiện tại đây. Hệ thống chỉ chấm dựa trên bài viết thực tế của bạn, không sử dụng điểm mẫu giả lập.
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/70">
                <span className="text-zinc-700">Ngữ pháp</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">30 điểm</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/70">
                <span className="text-zinc-700">Từ vựng</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">20 điểm</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/70">
                <span className="text-zinc-700">Độ tự nhiên</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">20 điểm</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-zinc-200/70">
                <span className="text-zinc-700">Mạch lạc</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">15 điểm</span>
              </div>
              <div className="flex items-center justify-between py-1.5 sm:col-span-2">
                <span className="text-zinc-700">Bám sát đề bài (khi có đề gốc)</span>
                <span className="font-mono tabular-nums font-medium text-zinc-900">15 điểm</span>
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              Nguyên tắc công bằng: Các câu đã đúng ngữ pháp sẽ không bị đánh dấu sai chỉ vì có cách diễn đạt khác tự nhiên hơn.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Total score & Breakdown */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-5">
              <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-zinc-100 pb-4">
                <div>
                  <p className="text-xs font-medium text-zinc-500">
                    {lastEvaluation.mode === 'full'
                      ? 'Đánh giá đầy đủ 5 tiêu chí'
                      : 'Đánh giá 4 tiêu chí (thiếu đề bài gốc)'}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-bold font-mono tabular-nums text-zinc-900">
                      {lastEvaluation.totalScore}
                    </span>
                    <span className="text-base font-mono tabular-nums text-zinc-500">
                      / {lastEvaluation.maxPossibleScore} điểm
                    </span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  {lastEvaluation.disclaimerVi}
                </p>
              </div>

              {lastEvaluation.missingPromptNoteVi && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-900 leading-relaxed">
                  {lastEvaluation.missingPromptNoteVi}
                </div>
              )}

              <p className="text-sm text-zinc-800 leading-relaxed">
                {lastEvaluation.overallFeedbackVi}
              </p>

              {/* 5 Criteria Bars */}
              <div className="space-y-3 pt-1">
                {lastEvaluation.criteria.map((c) => {
                  const pct =
                    c.score !== null ? Math.round((c.score / c.maxScore) * 100) : 0;
                  return (
                    <div key={c.key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-zinc-800">{c.labelVi}</span>
                        <span className="font-mono tabular-nums text-xs font-semibold text-zinc-900">
                          {c.score !== null ? `${c.score} / ${c.maxScore}` : `Chưa chấm / ${c.maxScore}`}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            c.score === null ? 'bg-zinc-200' : 'bg-red-600'
                          }`}
                          style={{ width: `${c.score === null ? 0 : pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-600 leading-relaxed">{c.commentVi}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Mistakes */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900">
                  Lỗi cần sửa ({lastEvaluation.mistakes.length})
                </h3>
                <span className="text-xs text-zinc-500">Chỉ tính lỗi sai thực sự</span>
              </div>

              {lastEvaluation.mistakes.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 flex items-center gap-2.5 text-sm text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tuyệt vời! Không phát hiện lỗi ngữ pháp hay dùng từ sai trong bài viết.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {lastEvaluation.mistakes.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 space-y-2"
                    >
                      <div className="text-xs font-medium text-red-700">
                        Lỗi {idx + 1} · {m.categoryVi}
                      </div>
                      <div className="text-sm text-zinc-500 line-through font-zh">
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
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    Gợi ý diễn đạt tự nhiên hơn
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Những câu dưới đây đã đúng ngữ pháp, đây chỉ là gợi ý giúp câu văn mượt mà hơn.
                  </p>
                </div>
                <div className="space-y-3">
                  {lastEvaluation.styleSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 space-y-2"
                    >
                      <div className="text-xs text-zinc-500 font-zh">
                        Câu gốc: {s.original}
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
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-zinc-900">Phiên bản cải thiện</h3>
                <button
                  type="button"
                  onClick={() => void handleCopyImproved()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 whitespace-nowrap shrink-0 min-h-[36px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã sao chép bài sửa</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-red-600" />
                      <span>Sao chép bài đã sửa</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                <ChineseBlock
                  hanzi={lastEvaluation.improvedVersion.hanzi}
                  pinyin={lastEvaluation.improvedVersion.pinyin}
                  vietnamese={lastEvaluation.improvedVersion.vietnameseTranslation}
                  showPinyin={showPinyin}
                />
              </div>
            </div>

            {/* 3 Personalized Follow-Up Exercises */}
            {lastEvaluation.followUpExercises.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-red-600 shrink-0" />
                  <h3 className="text-base font-semibold text-zinc-900">
                    3 Bài tập củng cố cá nhân hóa
                  </h3>
                </div>
                <p className="text-xs text-zinc-500">
                  Được tạo riêng dựa trên các điểm cần luyện tập từ bài viết vừa rồi của bạn.
                </p>

                <div className="space-y-4">
                  {lastEvaluation.followUpExercises.map((ex, idx) => {
                    const userChoice = selectedAnswers[ex.id];
                    const isChecked = Boolean(checkedExercises[ex.id]);
                    const isCorrect = userChoice === ex.correctAnswer;

                    return (
                      <div
                        key={ex.id}
                        className="rounded-xl border border-zinc-200 p-4 space-y-3"
                      >
                        <div className="text-xs font-medium text-zinc-500">
                          Bài tập {idx + 1} · {ex.instructionVi}
                        </div>
                        <ChineseBlock
                          hanzi={ex.promptChinese}
                          pinyin={ex.promptPinyin}
                          showPinyin={showPinyin}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
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
                                className={`rounded-lg border px-3.5 py-2.5 text-left text-sm font-zh transition-colors min-h-[40px] ${
                                  showCorrectHighlight
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                                    : showWrongHighlight
                                      ? 'border-red-400 bg-red-50 text-red-900'
                                      : selected
                                        ? 'border-red-600 bg-red-50/40 text-zinc-900 font-medium'
                                        : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
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
                            className="rounded-lg bg-zinc-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-500"
                          >
                            Kiểm tra đáp án
                          </button>
                        ) : (
                          <div
                            className={`rounded-lg px-3.5 py-2.5 text-xs leading-relaxed space-y-1 ${
                              isCorrect
                                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                                : 'bg-red-50 text-red-900 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold">
                              {isCorrect ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <span>Chính xác!</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                                  <span>Chưa đúng — Đáp án đúng: {ex.correctAnswer}</span>
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
