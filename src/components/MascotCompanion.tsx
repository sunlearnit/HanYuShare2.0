import { useState, useEffect } from 'react';
import { Sparkles, X, MessageCircleHeart, ChevronUp, ChevronDown } from 'lucide-react';
import { MascotSticker, type StickerName } from './MascotSticker';

const MASCOT_TIPS = [
  {
    sticker: '01_reading' as StickerName,
    text: 'Tiểu Du mách bạn: Nhớ chữ Hán theo bộ thủ giúp bạn đoán được nghĩa từ mới rất nhanh đó!',
    hanzi: '学无止境',
    pinyin: 'Xué wú zhǐ jìng',
    vi: 'Học không có điểm dừng',
  },
  {
    sticker: '02_cheer' as StickerName,
    text: 'Hôm nay bạn đang học rất chăm chỉ! Bạn đã trò chuyện với AI gia sư chưa nè? 加油！',
    hanzi: '坚持就是胜利',
    pinyin: 'Jiānchí jiù shì shènglì',
    vi: 'Kiên trì chính là thắng lợi',
  },
  {
    sticker: '05_writing' as StickerName,
    text: 'Hãy thử viết 1 đoạn văn ngắn và dùng tab "Chấm bài" nhé, hệ thống sẽ sửa từng lỗi ngữ pháp cho bạn.',
    hanzi: '熟能生巧',
    pinyin: 'Shú néng shēng qiǎo',
    vi: 'Trăm hay không bằng tay quen',
  },
  {
    sticker: '09_determined' as StickerName,
    text: 'Mục tiêu HSK của bạn là cấp mấy? Hãy luyện 10 câu trắc nghiệm mỗi ngày để tích luỹ phản xạ nhé!',
    hanzi: '千里之行，始于足下',
    pinyin: 'Qiān lǐ zhī xíng, shǐ yú zú xià',
    vi: 'Hành trình vạn dặm bắt đầu từ một bước chân',
  },
  {
    sticker: '07_love' as StickerName,
    text: 'Gặp từ mới hay hãy bấm lưu lại vào sổ từ vựng để ôn tập dạng Flashcard nha!',
    hanzi: '温故而知新',
    pinyin: 'Wēn gù ér zhī xīn',
    vi: 'Ôn cũ biết mới',
  },
  {
    sticker: '11_perfect_100' as StickerName,
    text: 'Bạn hoàn toàn có thể đạt điểm tuyệt đối HSK nếu luyện tập đều đặn. Hãy tin vào bản thân!',
    hanzi: '功到自然成',
    pinyin: 'Gōng dào zìrán chéng',
    vi: 'Có công mài sắt có ngày nên kim',
  },
];

export function MascotCompanion() {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [interactCount, setInteractCount] = useState(0);

  useEffect(() => {
    // Show after 2 seconds for a welcoming first impression
    const timer = setTimeout(() => {
      setOpen(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const current = MASCOT_TIPS[tipIndex % MASCOT_TIPS.length];

  const handleNextTip = () => {
    setTipIndex((prev) => (prev + 1) % MASCOT_TIPS.length);
    setInteractCount((c) => c + 1);
  };

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        aria-label="Mở bạn đồng hành Tiểu Du"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-red-200/80 bg-white/95 backdrop-blur-md px-3.5 py-2 shadow-lg hover:shadow-xl hover:border-red-300 transition-all card-lift focus-visible:outline-2 focus-visible:outline-red-800"
      >
        <MascotSticker name="01_reading" size="sm" animate="float-gentle" />
        <span className="text-xs font-semibold text-red-900 hidden sm:inline">Tiểu Du</span>
        <span className="flex h-2 w-2 rounded-full bg-red-600 animate-ping" />
      </button>
    );
  }

  return (
    <aside
      aria-label="Bạn đồng hành Tiểu Du"
      className="fixed bottom-4 right-4 z-40 max-w-[340px] sm:max-w-[380px] pointer-events-auto"
    >
      <div className="relative flex items-end gap-2.5">
        {/* Mascot Character Avatar button */}
        <button
          type="button"
          onClick={() => {
            if (!open) setOpen(true);
            else handleNextTip();
          }}
          title="Bấm vào Tiểu Du để đổi lời khuyên học tập"
          className="relative group shrink-0 focus:outline-none"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-red-800 via-red-900 to-amber-950 p-1 shadow-lg shadow-red-950/20 ring-2 ring-amber-400/50 hover:ring-amber-300 hover:scale-105 transition-all">
            <div className="w-full h-full rounded-xl bg-[#FFFBF7] flex items-center justify-center overflow-hidden">
              <MascotSticker
                key={interactCount}
                name={current.sticker}
                size="sm"
                animate="wiggle"
                className="w-11 h-11 sm:w-13 sm:h-13"
              />
            </div>
          </div>
          {/* Heart burst notification dot */}
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-sm">
            ✨
          </span>
        </button>

        {/* Speech Bubble Card */}
        {open && (
          <div className="flex-1 rounded-2xl border border-red-200/80 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xl shadow-red-950/10 animate-pop">
            <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Tiểu Du đồng hành</span>
                <span className="px-1.5 py-0.2 rounded-full bg-red-100 text-[10px] text-red-800 font-medium">
                  HSK Tip
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  title="Thu gọn"
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDismissed(true)}
                  title="Đóng hẳn"
                  className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs sm:text-sm text-zinc-700 leading-relaxed">
              {current.text}
            </p>

            <div className="mt-2 rounded-lg bg-red-50/70 border border-red-100/80 px-2.5 py-1.5 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <span className="font-zh text-sm font-semibold text-red-950 block truncate">
                  {current.hanzi}
                </span>
                <span className="text-[11px] text-zinc-500 font-mono block truncate">
                  {current.pinyin} · {current.vi}
                </span>
              </div>
              <button
                type="button"
                onClick={handleNextTip}
                className="shrink-0 text-[11px] font-semibold text-red-800 hover:text-red-950 hover:underline"
              >
                Mẹo khác →
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
