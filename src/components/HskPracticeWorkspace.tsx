import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
} from 'lucide-react';
import type { HskExerciseSet, HskLevel, HskSkillFocus } from '../types/learning';
import {
  fetchHskHistory,
  fetchHskPracticeSet,
  saveHskHistory,
  type SavedHskAttemptRecord,
} from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock } from './ChineseBlock';

interface HskPracticeWorkspaceProps {
  hskLevel: HskLevel;
  showPinyin: boolean;
  exerciseSet: HskExerciseSet | null;
  onSaveExerciseSet: (set: HskExerciseSet | null) => void;
}

const SKILL_FOCUS_OPTIONS: { id: HskSkillFocus; labelVi: string }[] = [
  { id: 'mixed', labelVi: 'Tổng hợp' },
  { id: 'grammar_vocab', labelVi: 'Từ vựng & Ngữ pháp' },
  { id: 'reading_order', labelVi: 'Đọc hiểu & Sắp xếp câu' },
];

export function HskPracticeWorkspace({
  hskLevel,
  showPinyin,
  exerciseSet,
  onSaveExerciseSet,
}: HskPracticeWorkspaceProps) {
  const { user, getIdToken } = useAuth();
  const [skillFocus, setSkillFocus] = useState<HskSkillFocus>('mixed');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [attemptsHistory, setAttemptsHistory] = useState<SavedHskAttemptRecord[]>([]);

  const loadAttempts = useCallback(async () => {
    if (!user) {
      setAttemptsHistory([]);
      return;
    }
    try {
      const token = await getIdToken();
      if (token) {
        const list = await fetchHskHistory(token);
        setAttemptsHistory(list);
      }
    } catch {
      // Non-blocking
    }
  }, [user, getIdToken]);

  useEffect(() => {
    void loadAttempts();
  }, [loadAttempts]);

  const handleGenerate = async () => {
    setErrorMsg(null);
    setLoading(true);
    setAnswers({});
    setSubmitted(false);

    try {
      const nextSet = await fetchHskPracticeSet({
        hskLevel,
        skillFocus,
        topic: topic.trim() || undefined,
      });
      onSaveExerciseSet(nextSet);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tạo đề luyện thi HSK. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const questions = exerciseSet?.questions ?? [];
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const correctCount = submitted
    ? questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0;

  const handleSubmitQuiz = async () => {
    if (!exerciseSet) return;
    const score = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    setSubmitted(true);
    if (user) {
      try {
        const token = await getIdToken();
        if (token) {
          await saveHskHistory(token, {
            hskLevel: exerciseSet.level,
            skillFocus: exerciseSet.skillFocus,
            titleVi: exerciseSet.titleVi,
            correctCount: score,
            totalCount: questions.length,
          });
          void loadAttempts();
        }
      } catch (err) {
        console.error('Failed to save HSK attempt:', err);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Configuration Card */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Tạo đề luyện tập HSK {hskLevel}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Mỗi đề gồm 5 câu hỏi sát cấp độ HSK {hskLevel}, tự động chấm và giải thích chi tiết bằng tiếng Việt sau khi bạn nộp bài.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-500 mr-1">Dạng bài:</span>
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-zinc-100">
            {SKILL_FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSkillFocus(opt.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  skillFocus === opt.id
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {opt.labelVi}
              </button>
            ))}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleGenerate();
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value.slice(0, 120))}
            placeholder="Chủ điểm ưu tiên (không bắt buộc, vd: Lượng từ, Câu chữ 把, Giao tiếp...)"
            className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-red-600 focus:outline-none min-h-[44px]"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo đề...</span>
              </>
            ) : (
              <span>Tạo đề mới</span>
            )}
          </button>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Exercise Body */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm font-medium text-zinc-900">
            Đang biên soạn 5 câu hỏi HSK {hskLevel}...
          </p>
        </div>
      ) : !exerciseSet ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 sm:p-10 text-center space-y-3">
          <GraduationCap className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-900">
            Sẵn sàng luyện thi HSK {hskLevel}
          </h3>
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            Bấm "Tạo đề mới" để bắt đầu bộ 5 câu hỏi trắc nghiệm. Điểm số chỉ được tính sau khi bạn hoàn thành và nộp bài.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Quiz Header & Real Result Summary */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500">
                HSK {exerciseSet.level} · {questions.length} câu hỏi
              </p>
              <h3 className="text-base font-semibold text-zinc-900 mt-0.5">
                {exerciseSet.titleVi}
              </h3>
            </div>

            {submitted ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Kết quả thực tế</p>
                  <p className="text-xl font-bold font-mono tabular-nums text-zinc-900">
                    {correctCount} / {questions.length} câu đúng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Làm lại</span>
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 font-mono tabular-nums">
                Đã chọn {answeredCount}/{questions.length} câu
              </p>
            )}
          </div>

          {/* Question List */}
          <div className="space-y-4">
            {questions.map((q, idx) => {
              const chosen = answers[q.id];
              const isCorrect = chosen === q.correctAnswer;

              return (
                <article
                  key={q.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4"
                >
                  <div className="text-xs font-medium text-zinc-500">
                    Câu {idx + 1} · {q.instructionVi}
                  </div>

                  <ChineseBlock
                    hanzi={q.promptChinese}
                    pinyin={q.promptPinyin}
                    showPinyin={showPinyin}
                    allowLocalPeek
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const letter = String.fromCharCode(65 + optIdx);
                      const isSelected = chosen === opt;
                      const showRight = submitted && opt === q.correctAnswer;
                      const showWrong = submitted && isSelected && opt !== q.correctAnswer;

                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={submitted}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                          }
                          className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors min-h-[44px] ${
                            showRight
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium'
                              : showWrong
                                ? 'border-red-400 bg-red-50 text-red-900'
                                : isSelected
                                  ? 'border-red-600 bg-red-50/40 text-zinc-900 font-medium'
                                  : 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
                          }`}
                        >
                          <span className="font-mono text-xs font-semibold text-zinc-500 shrink-0">
                            {letter}.
                          </span>
                          <span className="font-zh break-words">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div
                      className={`rounded-xl border px-4 py-3 text-xs sm:text-sm leading-relaxed space-y-1.5 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                          : 'border-red-200 bg-red-50/70 text-red-900'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Chính xác</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>
                              Chưa đúng · Đáp án đúng: <span className="font-zh">{q.correctAnswer}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-zinc-700">{q.explanationVi}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {!submitted && (
            <div className="flex items-center justify-end">
              <button
                type="button"
                disabled={answeredCount < questions.length}
                onClick={() => void handleSubmitQuiz()}
                className="rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-zinc-200 disabled:text-zinc-500 transition-colors min-h-[44px]"
              >
                {answeredCount < questions.length
                  ? `Chọn đủ ${questions.length} câu để nộp bài`
                  : 'Nộp bài & Xem giải thích'}
              </button>
            </div>
          )}
        </div>
      )}

      {user && attemptsHistory.length > 0 && (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <History className="w-4 h-4 text-red-600" />
            <span>Lịch sử luyện thi HSK đã lưu</span>
          </div>
          <div className="divide-y divide-zinc-100">
            {attemptsHistory.map((item) => (
              <div
                key={item.id}
                className="py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-800 truncate">{item.titleVi}</p>
                  <p className="text-xs text-zinc-500">HSK {item.hskLevel}</p>
                </div>
                <span className="font-mono tabular-nums font-semibold text-red-700 shrink-0">
                  {item.correctCount}/{item.totalCount} câu đúng
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
