import { useState } from 'react';
import {
  BookOpen,
  Loader2,
  AlertCircle,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  List,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import type { HskLevel, VocabularyItem } from '../types/learning';
import { fetchVocabularySet } from '../services/apiClient';
import {
  removeVocabCardFromFirestore,
  saveVocabCardToFirestore,
} from '../services/firestoreSync';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock, SpeakButton } from './ChineseBlock';

interface VocabularyWorkspaceProps {
  hskLevel: HskLevel;
  showPinyin: boolean;
  items: VocabularyItem[];
  savedItems: VocabularyItem[];
  onSaveItems: (items: VocabularyItem[]) => void;
}

const PRESET_TOPICS = [
  'Giao tiếp hằng ngày',
  'Ẩm thực & Nhà hàng',
  'Du lịch & Giao thông',
  'Học tập & Công việc',
  'Mua sắm & Thanh toán',
  'Gia đình & Thời gian rảnh',
];

export function VocabularyWorkspace({
  hskLevel,
  showPinyin,
  items,
  savedItems,
  onSaveItems,
}: VocabularyWorkspaceProps) {
  const { user } = useAuth();
  const [topic, setTopic] = useState('Giao tiếp hằng ngày');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'flashcard' | 'saved'>('grid');
  const [flashIndex, setFlashIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleGenerate = async (chosenTopic?: string) => {
    const targetTopic = (chosenTopic ?? topic).trim() || 'Giao tiếp hằng ngày';
    if (chosenTopic) setTopic(chosenTopic);
    setErrorMsg(null);
    setLoading(true);
    setFlashIndex(0);
    setFlipped(false);
    if (viewMode === 'saved') setViewMode('grid');

    try {
      const generated = await fetchVocabularySet({
        hskLevel,
        topic: targetTopic,
      });
      onSaveItems(generated);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Không thể tạo bộ từ vựng. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isBookmarked = (item: VocabularyItem): VocabularyItem | undefined =>
    savedItems.find((s) => s.hanzi === item.hanzi);

  const handleToggleBookmark = async (item: VocabularyItem) => {
    if (!user) {
      setErrorMsg('Vui lòng đăng nhập Google ở thanh bên để lưu từ vựng vào tài khoản.');
      return;
    }
    setErrorMsg(null);
    const existing = isBookmarked(item);
    try {
      if (existing) {
        await removeVocabCardFromFirestore(user.uid, existing.id);
      } else {
        await saveVocabCardToFirestore(user.uid, item);
      }
    } catch {
      setErrorMsg('Không thể cập nhật sổ từ vựng lúc này. Vui lòng thử lại.');
    }
  };

  const activeList = viewMode === 'saved' ? savedItems : items;
  const currentFlashcard = items[flashIndex];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Control Panel */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Tạo bộ từ vựng theo chủ đề · HSK {hskLevel}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Chọn chủ đề có sẵn hoặc nhập chủ đề bạn muốn luyện (tối đa 120 ký tự).
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg bg-zinc-100">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                viewMode === 'grid'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => {
                setViewMode('flashcard');
                setFlipped(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap disabled:opacity-40 ${
                viewMode === 'flashcard'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Thẻ ghi nhớ</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setViewMode('saved')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'saved'
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Đã lưu ({savedItems.length})</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESET_TOPICS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTopic(preset)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                topic === preset
                  ? 'border-red-300 bg-red-50 text-red-700'
                  : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {preset}
            </button>
          ))}
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
            placeholder="Nhập chủ đề từ vựng (ví dụ: Công nghệ, Đặt phòng khách sạn...)"
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
                <span>Đang tạo 8 từ vựng...</span>
              </>
            ) : (
              <span>Tạo bộ từ vựng</span>
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

      {/* Content Area */}
      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 flex flex-col items-center justify-center text-center space-y-3">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm font-medium text-zinc-900">
            Đang tổng hợp từ vựng HSK {hskLevel} chủ đề "{topic}"...
          </p>
        </div>
      ) : viewMode === 'flashcard' && currentFlashcard ? (
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Thẻ <span className="font-mono tabular-nums font-medium text-zinc-900">{flashIndex + 1}</span> / {items.length}
            </span>
            <span>Bấm vào thẻ để lật xem nghĩa và ví dụ</span>
          </div>

          <div
            role="button"
            tabIndex={0}
            onClick={() => setFlipped((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setFlipped((prev) => !prev);
              }
            }}
            className="rounded-2xl border border-zinc-200 bg-white p-8 min-h-[260px] flex flex-col items-center justify-center text-center space-y-4 cursor-pointer hover:border-red-300 transition-colors"
          >
            <span className="text-xs text-zinc-500">
              HSK {currentFlashcard.hskLevel} · {currentFlashcard.partOfSpeechVi}
            </span>

            <p className="font-zh text-4xl sm:text-5xl font-semibold text-zinc-900">
              {currentFlashcard.hanzi}
            </p>

            {(showPinyin || flipped) && (
              <p className="text-base text-zinc-500">{currentFlashcard.pinyin}</p>
            )}

            {flipped ? (
              <div className="border-t border-zinc-100 pt-4 space-y-2 w-full max-w-md">
                <p className="text-base font-semibold text-red-700">
                  {currentFlashcard.meaningVi}
                </p>
                <p className="font-zh text-sm text-zinc-800">
                  {currentFlashcard.exampleHanzi}
                </p>
                <p className="text-xs text-zinc-500">{currentFlashcard.exampleVi}</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 pt-2">Chạm để lật thẻ</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setFlashIndex((prev) => (prev - 1 + items.length) % items.length);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Thẻ trước</span>
            </button>

            <div className="flex items-center gap-2">
              <SpeakButton text={currentFlashcard.hanzi} size="md" label="Nghe từ này" />
              <button
                type="button"
                onClick={() => setFlipped((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 min-h-[40px]"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Lật thẻ</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setFlashIndex((prev) => (prev + 1) % items.length);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 min-h-[44px]"
            >
              <span>Thẻ tiếp</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/50 p-8 sm:p-10 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="text-base font-semibold text-zinc-900">
            {viewMode === 'saved'
              ? 'Sổ từ vựng đã lưu đang trống'
              : 'Chưa có bộ từ vựng nào trong phiên học này'}
          </h3>
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            {viewMode === 'saved'
              ? 'Hãy bấm biểu tượng Lưu trên các thẻ từ vựng để lưu vào tài khoản Firestore của bạn.'
              : 'Chọn một chủ đề phía trên và bấm "Tạo bộ từ vựng" để nhận 8 từ kèm Pinyin, nghĩa tiếng Việt, câu ví dụ thực tế và phát âm chuẩn.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((item) => {
            const bookmarked = Boolean(isBookmarked(item));
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-500">
                      <span>HSK {item.hskLevel}</span>
                      <span aria-hidden="true" className="mx-2">·</span>
                      <span>{item.partOfSpeechVi}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleBookmark(item)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                        bookmarked
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      {bookmarked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Đã lưu</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Lưu từ</span>
                        </>
                      )}
                    </button>
                  </div>

                  <ChineseBlock
                    hanzi={item.hanzi}
                    pinyin={item.pinyin}
                    vietnamese={item.meaningVi}
                    showPinyin={showPinyin}
                    allowLocalPeek
                    large
                  />
                </div>

                <div className="border-t border-zinc-100 pt-3.5 space-y-2.5">
                  <p className="text-xs font-medium text-zinc-500">Ví dụ ngữ cảnh</p>
                  <ChineseBlock
                    hanzi={item.exampleHanzi}
                    pinyin={item.examplePinyin}
                    vietnamese={item.exampleVi}
                    showPinyin={showPinyin}
                    allowLocalPeek
                  />
                  {item.usageNoteVi && (
                    <p className="text-xs text-zinc-600 bg-zinc-50 rounded-lg px-3 py-2 leading-relaxed">
                      Ghi chú: {item.usageNoteVi}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
