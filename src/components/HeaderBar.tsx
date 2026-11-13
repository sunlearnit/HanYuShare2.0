import { Menu, Eye, EyeOff } from 'lucide-react';
import type { HskLevel, WorkspaceTab } from '../types/learning';
import { NAV_ITEMS } from './Sidebar';

interface HeaderBarProps {
  activeTab: WorkspaceTab;
  hskLevel: HskLevel;
  onChangeHskLevel: (level: HskLevel) => void;
  showPinyin: boolean;
  onTogglePinyin: () => void;
  onOpenMobileMenu: () => void;
}

const HSK_LEVELS: HskLevel[] = [1, 2, 3, 4, 5, 6];

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
    <header className="border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 py-3.5">
      <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Mở menu điều hướng"
            className="lg:hidden inline-flex items-center justify-center rounded-lg border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-50 min-h-[40px] min-w-[40px]"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 truncate">
              {currentNav.labelVi}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 truncate">
              {currentNav.descriptionVi}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* HSK Level Selector */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="global-hsk-select"
              className="text-xs font-medium text-zinc-500 whitespace-nowrap"
            >
              Trình độ
            </label>
            <select
              id="global-hsk-select"
              value={hskLevel}
              onChange={(e) => onChangeHskLevel(Number(e.target.value) as HskLevel)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-zinc-900 hover:border-zinc-300 focus:border-red-600 focus:outline-none min-h-[40px] cursor-pointer"
            >
              {HSK_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  HSK {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Global Pinyin Toggle */}
          <button
            type="button"
            onClick={onTogglePinyin}
            aria-pressed={showPinyin}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
              showPinyin
                ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100/70'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            {showPinyin ? (
              <Eye className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <EyeOff className="w-4 h-4 text-zinc-500 shrink-0" />
            )}
            <span>{showPinyin ? 'Đang hiện Pinyin' : 'Đang ẩn Pinyin'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
