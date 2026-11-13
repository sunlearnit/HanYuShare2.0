import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  History,
  Sparkles,
  Trophy,
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
import { MascotSticker } from './MascotSticker';
import { CelebrationBurst } from './CelebrationBurst';

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
  const [celebrate, setCelebrate] = useState(false);

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
    setCelebrate(false);

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

    if (score / questions.length >= 0.8) {
      setCelebrate(true);
    }

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
      <CelebrationBurst active={celebrate} />

      {/* Configuration Card */}
      <section className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-xl bg-gradient-to-br from-red-800 to-amber-900 shadow-sm shrink-0">
              <div className="w-10 h-10 rounded-[10px] bg-white flex items-center justify-center overflow-hidden">
                <MascotSticker name="09_determined" size="sm" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-stone-900">
                  Luyện đề trắc nghiệm HSK {hskLevel}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-200">
                  Đề 5 câu
                </span>
              </div>
              <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
                Đề thi bám sát cấu trúc mới, tự động chấm và giải thích cặn kẽ bằng tiếng Việt.
              </p>
            </div>
          </div>
        </div>

        {/* Skill focus switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wide mr-1">
            Dạng bài:
          </span>
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-[#FAF7F2] border border-[#EFE7DE]">
            {SKILL_FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSkillFocus(opt.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap card-lift ${
                  skillFocus === opt.id
                    ? 'bg-gradient-to-r from-red-800 to-red-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
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
            placeholder="Chủ điểm ngữ pháp ưu tiên (không bắt buộc, vd: Câu chữ 把, Bổ ngữ kết quả...)"
            className="flex-1 rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 min-h-[46px] shadow-xs transition-all"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 via-red-850 to-red-900 px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0 min-h-[46px] card-lift"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Đang soạn đề...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tạo đề mới</span>
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2.5 text-sm text-red-900 shadow-xs"
          >
            <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}
      </section>

      {/* Exercise Body */}
      {loading ? (
        <div className="rounded-3xl border border-[#EFE7DE] bg-white p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-pop">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md">
            <MascotSticker name="09_determined" size="md" animate="wiggle" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-stone-900">
              Đang biên tập 5 câu hỏi sát chuẩn HSK {hskLevel}...
            </p>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
              Đề thi được tính toán theo độ khó từ vựng và ngữ pháp để bạn làm quen dạng bài thi thật.
            </p>
          </div>
        </div>
      ) : !exerciseSet ? (
        <div className="rounded-3xl border border-[#EFE7DE] bg-gradient-to-br from-white to-[#FCFAF7] p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="p-2 rounded-2xl bg-red-50 w-24 h-24 mx-auto flex items-center justify-center border border-red-200/60">
            <MascotSticker name="09_determined" size="lg" animate="float-gentle" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              Sẵn sàng rèn luyện bài thi HSK {hskLevel}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              Bấm <strong className="text-red-900">"Tạo đề mới"</strong> để thử sức với bộ 5 câu hỏi trắc nghiệm. Bạn có thể luyện không giới hạn số lượng đề hoàn toàn miễn phí.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5 animate-pop">
          {/* Quiz Header & Real Result Summary */}
          <div className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold">
                  HSK {exerciseSet.level}
                </span>
                <span className="text-xs text-stone-500 font-semibold">
                  {questions.length} câu hỏi
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-stone-900 mt-1">
                {exerciseSet.titleVi}
              </h3>
            </div>

            {submitted ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-[#FAF7F2] p-2.5 rounded-2xl border border-[#EFE7DE]">
                  <MascotSticker
                    name={correctCount >= 4 ? '11_perfect_100' : '02_cheer'}
                    size="sm"
                    animate="float-gentle"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-semibold text-stone-500">Kết quả</p>
                      {correctCount >= 4 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                          Xuất sắc!
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-extrabold font-mono tabular-nums text-red-900">
                      {correctCount} / {questions.length} câu đúng
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                    setCelebrate(false);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-xs font-bold text-stone-700 hover:border-red-300 hover:text-red-900 min-h-[42px] transition-colors shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-red-800" />
                  <span>Làm lại đề này</span>
                </button>
              </div>
            ) : (
              <div className="text-xs font-bold text-stone-500 font-mono tabular-nums bg-[#FAF7F2] px-3 py-1.5 rounded-xl border border-[#EFE7DE]">
                Đã chọn <span className="text-red-900">{answeredCount}</span> / {questions.length} câu
              </div>
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
                  className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-4 shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                    <span className="text-xs font-bold text-red-900 uppercase tracking-wide">
                      Câu hỏi {idx + 1}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {q.instructionVi}
                    </span>
                  </div>

                  <ChineseBlock
                    hanzi={q.promptChinese}
                    pinyin={q.promptPinyin}
                    showPinyin={showPinyin}
                    allowLocalPeek
                    large
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
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
                          className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-all min-h-[48px] card-lift ${
                            showRight
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold shadow-xs'
                              : showWrong
                                ? 'border-red-400 bg-red-50 text-red-950'
                                : isSelected
                                  ? 'border-red-800 bg-red-50/70 text-red-950 font-bold ring-2 ring-red-800/20 shadow-xs'
                                  : 'border-[#EFE7DE] bg-[#FAF7F2] text-stone-800 hover:border-red-300 hover:bg-white'
                          }`}
                        >
                          <span
                            className={`flex items-center justify-center w-6 h-6 rounded-lg text-xs font-mono font-bold shrink-0 ${
                              showRight
                                ? 'bg-emerald-600 text-white'
                                : showWrong
                                  ? 'bg-red-600 text-white'
                                  : isSelected
                                    ? 'bg-red-800 text-white'
                                    : 'bg-white text-stone-500 border border-stone-200'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className="font-zh font-medium break-words">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div
                      className={`rounded-2xl border px-4 py-3.5 text-xs sm:text-sm leading-relaxed space-y-1.5 animate-pop ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-950'
                          : 'border-red-200 bg-red-50/70 text-red-950'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold">
                        {isCorrect ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Chính xác! Rất giỏi!</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>
                              Chưa đúng · Đáp án chính xác là: <span className="font-zh font-bold underline">{q.correctAnswer}</span>
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-stone-700 font-medium pl-6">{q.explanationVi}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {!submitted && (
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                disabled={answeredCount < questions.length}
                onClick={() => void handleSubmitQuiz()}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 via-red-850 to-red-900 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px] card-lift"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {answeredCount < questions.length
                    ? `Chọn đủ ${questions.length} câu để nộp bài (${answeredCount}/${questions.length})`
                    : 'Nộp bài & Xem giải thích chi tiết'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {user && attemptsHistory.length > 0 && (
        <section className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-6 space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-stone-900 border-b border-[#EFE7DE] pb-3">
            <History className="w-4 h-4 text-red-800" />
            <span>Lịch sử luyện thi HSK của bạn</span>
          </div>
          <div className="divide-y divide-[#EFE7DE]">
            {attemptsHistory.map((item) => (
              <div
                key={item.id}
                className="py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 truncate">{item.titleVi}</p>
                  <p className="text-xs text-stone-500">HSK {item.hskLevel}</p>
                </div>
                <span className="font-mono tabular-nums font-bold text-red-900 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full shrink-0">
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
