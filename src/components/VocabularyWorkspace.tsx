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
  Sparkles,
} from 'lucide-react';
import type { HskLevel, VocabularyItem } from '../types/learning';
import { fetchVocabularySet } from '../services/apiClient';
import {
  removeVocabCardFromFirestore,
  saveVocabCardToFirestore,
} from '../services/firestoreSync';
import { useAuth } from '../contexts/AuthContext';
import { ChineseBlock, SpeakButton } from './ChineseBlock';
import { MascotSticker } from './MascotSticker';

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
  'Du lịch & Đi lại',
  'Công sở & Phỏng vấn',
  'Mua sắm & Mặc cả',
  'Cảm xúc & Tính cách',
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
      <section className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFE7DE] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-stone-900">
                Bộ từ vựng ngữ cảnh theo chủ đề
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-200">
                HSK {hskLevel}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Từ vựng chuẩn khung HSK, kèm câu ví dụ thực tế và phát âm chuẩn bản xứ.
            </p>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#FAF7F2] border border-[#EFE7DE]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5 text-red-800" />
              <span>Danh sách</span>
            </button>
            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => {
                setViewMode('flashcard');
                setFlipped(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-40 ${
                viewMode === 'flashcard'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200/80'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-red-800" />
              <span>Flashcard 3D</span>
            </button>
            {user && (
              <button
                type="button"
                onClick={() => setViewMode('saved')}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                  viewMode === 'saved'
                    ? 'bg-gradient-to-r from-red-800 to-red-900 text-white shadow-sm'
                    : 'text-stone-600 hover:text-red-900'
                }`}
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Đã lưu ({savedItems.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Preset topic pills */}
        <div className="flex flex-wrap gap-2">
          {PRESET_TOPICS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setTopic(preset)}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap card-lift ${
                topic === preset
                  ? 'border-red-800 bg-red-800 text-white shadow-xs'
                  : 'border-[#EFE7DE] bg-[#FAF7F2] text-stone-700 hover:border-red-300 hover:bg-white'
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
            placeholder="Hoặc nhập chủ đề bạn muốn học (ví dụ: Sân bay, Đặt phòng khách sạn...)"
            className="flex-1 rounded-2xl border border-[#EFE7DE] bg-[#FAF7F2] px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 min-h-[46px] transition-all shadow-xs"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-800 via-red-850 to-red-900 px-6 py-3 text-sm font-bold text-white shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap shrink-0 min-h-[46px] card-lift"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                <span>Đang tạo bộ từ vựng...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Tạo 8 từ vựng</span>
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

      {/* Content Area */}
      {loading ? (
        <div className="rounded-3xl border border-[#EFE7DE] bg-white p-10 sm:p-14 flex flex-col items-center justify-center text-center space-y-4 shadow-sm animate-pop">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-red-800 to-amber-900 shadow-md">
            <MascotSticker name="01_reading" size="md" animate="float-gentle" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-bold text-stone-900">
              Đang tổng hợp bộ từ vựng HSK {hskLevel} cho bạn...
            </p>
            <p className="text-xs sm:text-sm text-stone-500 max-w-sm">
              Chủ đề "{topic}" đang được trích xuất nghĩa, ví dụ câu và phiên âm chuẩn.
            </p>
          </div>
        </div>
      ) : viewMode === 'flashcard' && currentFlashcard ? (
        <div className="max-w-xl mx-auto space-y-5 animate-pop">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium px-2">
            <span>
              Thẻ từ vựng <span className="font-mono tabular-nums font-bold text-red-900">{flashIndex + 1}</span> / {items.length}
            </span>
            <span className="flex items-center gap-1 text-red-800 font-semibold">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Chạm thẻ để lật</span>
            </span>
          </div>

          {/* Flashcard container */}
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
            className={`rounded-3xl border-2 p-8 min-h-[300px] flex flex-col items-center justify-center text-center space-y-4 cursor-pointer transition-all duration-300 shadow-md ${
              flipped
                ? 'border-red-800 bg-gradient-to-b from-[#FFFDF9] to-red-50/40 ring-2 ring-red-800/10'
                : 'border-[#EFE7DE] bg-white hover:border-red-300 hover:shadow-lg'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-red-100/80 text-red-800 text-xs font-bold border border-red-200">
                HSK {currentFlashcard.hskLevel}
              </span>
              <span className="text-xs text-stone-500 font-semibold">
                {currentFlashcard.partOfSpeechVi}
              </span>
            </div>

            <p className="font-zh text-5xl sm:text-6xl font-bold text-stone-900 tracking-wide select-none drop-shadow-xs">
              {currentFlashcard.hanzi}
            </p>

            {(showPinyin || flipped) && (
              <p className="text-lg text-red-900 font-mono font-medium tracking-wide">
                {currentFlashcard.pinyin}
              </p>
            )}

            {flipped ? (
              <div className="border-t border-[#EFE7DE] pt-4 space-y-2 w-full max-w-md animate-pop">
                <p className="text-lg font-bold text-red-900">
                  {currentFlashcard.meaningVi}
                </p>
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#EFE7DE]">
                  <p className="font-zh text-base font-medium text-stone-800">
                    {currentFlashcard.exampleHanzi}
                  </p>
                  <p className="text-xs sm:text-sm text-stone-600 mt-1">
                    {currentFlashcard.exampleVi}
                  </p>
                </div>
              </div>
            ) : (
              <div className="pt-2 flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Chạm để xem nghĩa tiếng Việt & câu ví dụ</span>
              </div>
            )}
          </div>

          {/* Flashcard Navigation */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setFlashIndex((prev) => (prev - 1 + items.length) % items.length);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 min-h-[46px] shadow-xs card-lift"
            >
              <ChevronLeft className="w-4 h-4 text-red-800" />
              <span>Thẻ trước</span>
            </button>

            <div className="flex items-center gap-2">
              <SpeakButton text={currentFlashcard.hanzi} size="md" label="Nghe phát âm" />
              <button
                type="button"
                onClick={() => setFlipped((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50/70 px-4 py-2.5 text-xs font-bold text-red-900 hover:bg-red-100 min-h-[44px] transition-colors"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Lật mặt</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setFlipped(false);
                setFlashIndex((prev) => (prev + 1) % items.length);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 min-h-[46px] shadow-xs card-lift"
            >
              <span>Thẻ tiếp</span>
              <ChevronRight className="w-4 h-4 text-red-800" />
            </button>
          </div>
        </div>
      ) : activeList.length === 0 ? (
        <div className="rounded-3xl border border-[#EFE7DE] bg-gradient-to-br from-white to-[#FCFAF7] p-8 sm:p-12 text-center space-y-4 shadow-sm">
          <div className="p-2 rounded-2xl bg-red-50 w-24 h-24 mx-auto flex items-center justify-center border border-red-200/60">
            <MascotSticker
              name={viewMode === 'saved' ? '07_love' : '04_curious'}
              size="lg"
              animate="float-gentle"
            />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              {viewMode === 'saved'
                ? 'Sổ từ vựng yêu thích đang chờ bạn'
                : 'Chưa có bộ từ vựng nào trong phiên học này'}
            </h3>
            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
              {viewMode === 'saved'
                ? 'Hãy bấm biểu tượng Lưu trên các thẻ từ vựng để lưu vào tài khoản và ôn tập Flashcard bất cứ lúc nào.'
                : 'Hãy chọn một chủ đề phía trên và bấm "Tạo 8 từ vựng" để nhận danh sách từ mới kèm phát âm bản xứ nhé!'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeList.map((item) => {
            const bookmarked = Boolean(isBookmarked(item));
            return (
              <article
                key={item.id}
                className="rounded-3xl border border-[#EFE7DE] bg-white p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-sm card-lift group"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold border border-red-200/60">
                        HSK {item.hskLevel}
                      </span>
                      <span className="text-stone-400">·</span>
                      <span className="text-stone-500 font-semibold">{item.partOfSpeechVi}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleBookmark(item)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-all whitespace-nowrap ${
                        bookmarked
                          ? 'border-red-300 bg-red-50 text-red-900 shadow-xs'
                          : 'border-stone-200 bg-[#FAF7F2] text-stone-600 hover:border-red-300 hover:bg-white hover:text-red-900'
                      }`}
                    >
                      {bookmarked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 text-red-800" />
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

                <div className="border-t border-[#EFE7DE] pt-3.5 space-y-2.5">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                    Ví dụ ngữ cảnh thực tế
                  </p>
                  <ChineseBlock
                    hanzi={item.exampleHanzi}
                    pinyin={item.examplePinyin}
                    vietnamese={item.exampleVi}
                    showPinyin={showPinyin}
                    allowLocalPeek
                  />
                  {item.usageNoteVi && (
                    <p className="text-xs text-stone-700 bg-[#FAF7F2] rounded-xl px-3 py-2 leading-relaxed border border-[#EFE7DE]">
                      <strong className="text-red-900 font-semibold">Ghi chú:</strong> {item.usageNoteVi}
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
