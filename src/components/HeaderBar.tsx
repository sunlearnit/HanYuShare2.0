import { Menu, Eye, EyeOff, Sparkles, BookOpen } from 'lucide-react';
import type { HskLevel, WorkspaceTab } from '../types/learning';
import { NAV_ITEMS } from './Sidebar';
import { MascotSticker } from './MascotSticker';

interface HeaderBarProps {
  activeTab: WorkspaceTab;
  hskLevel: HskLevel;
  onChangeHskLevel: (level: HskLevel) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  onOpenMobileMenu: () => void;
}

const HSK_LEVELS: { level: HskLevel; desc: string }[] = [
  { level: 1, desc: 'Cơ bản (150 từ)' },
  { level: 2, desc: 'Sơ cấp (300 từ)' },
  { level: 3, desc: 'Trung cấp 1 (600 từ)' },
  { level: 4, desc: 'Trung cấp 2 (1200 từ)' },
  { level: 5, desc: 'Cao cấp 1 (2500 từ)' },
  { level: 6, desc: 'Thành thạo (5000+ từ)' },
];

export function HeaderBar({
  activeTab,
  hskLevel,
  onChangeHskLevel,
  showPinyin,
  onTogglePinyin,
  onOpenMobileMenu,
}: HeaderBarProps) {
  const currentNav = NAV_ITEMS.find((item) => item.id === activeTab) ?? NAV_ITEMS[0];

  return (
    <header className="border-b border-[#EFE7DE] bg-white/80 backdrop-blur-md px-4 sm:px-6 lg:px-8 py-3.5 sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {/* Left Side: Mobile Menu Button + Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Mở menu điều hướng"
            className="lg:hidden inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white p-2 text-stone-700 hover:bg-stone-50 min-h-[40px] min-w-[40px] shadow-sm"
          >
            <Menu className="w-5 h-5 text-red-800" />
          </button>

          {/* Mobile Mascot Logo indicator */}
          <div className="lg:hidden w-8 h-8 rounded-lg bg-red-800/10 p-0.5 shrink-0 flex items-center justify-center">
            <MascotSticker name="01_reading" size="xs" className="w-6 h-6" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900 truncate">
                {currentNav.labelVi}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-800 border border-red-200/60">
                <Sparkles className="w-3 h-3 text-amber-600" />
                <span>AI Tutor</span>
              </span>
            </div>
            <p className="text-xs text-stone-500 truncate hidden sm:block">
              {currentNav.descriptionVi}
            </p>
          </div>
        </div>

        {/* Right Controls: HSK Level & Pinyin Toggle */}
        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap ml-auto">
          {/* HSK Level Pill Selector */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] p-1 rounded-xl border border-[#EFE7DE]">
            <label
              htmlFor="global-hsk-select"
              className="text-[11px] font-semibold text-stone-500 px-2 hidden sm:inline-block"
            >
              Trình độ
            </label>
            <div className="relative">
              <select
                id="global-hsk-select"
                value={hskLevel}
                onChange={(e) => onChangeHskLevel(Number(e.target.value) as HskLevel)}
                className="rounded-lg border border-red-200/80 bg-white px-2.5 py-1.5 text-xs sm:text-sm font-bold text-red-900 hover:border-red-400 focus:border-red-800 focus:ring-1 focus:ring-red-800 focus:outline-none min-h-[36px] cursor-pointer shadow-sm transition-colors"
              >
                {HSK_LEVELS.map((item) => (
                  <option key={item.level} value={item.level}>
                    HSK {item.level} — {item.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Global Pinyin Toggle Button */}
          <button
            type="button"
            onClick={onTogglePinyin}
            aria-pressed={showPinyin}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 min-h-[36px] card-lift focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 ${
              showPinyin
                ? 'border-red-300 bg-gradient-to-r from-red-50 to-red-100/80 text-red-900 shadow-sm'
                : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
            }`}
          >
            {showPinyin ? (
              <Eye className="w-4 h-4 text-red-700 shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 text-stone-400 shrink-0" />
            )}
            <span>{showPinyin ? 'Pinyin: Bật' : 'Pinyin: Tắt'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
