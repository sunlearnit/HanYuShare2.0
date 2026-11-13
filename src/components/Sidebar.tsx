import {
  MessageSquare,
  PenLine,
  BookOpen,
  GraduationCap,
  MessagesSquare,
  X,
  LogIn,
  LogOut,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { WorkspaceTab } from '../types/learning';
import { useAuth } from '../contexts/AuthContext';
import { MascotSticker } from './MascotSticker';

export interface NavItem {
  id: WorkspaceTab;
  labelVi: string;
  shortLabelVi: string;
  descriptionVi: string;
  icon: typeof MessageSquare;
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: 'chat',
    labelVi: 'Trò chuyện AI',
    shortLabelVi: 'Chat AI',
    descriptionVi: 'Hỏi đáp ngữ pháp & luyện câu với gia sư',
    icon: MessageSquare,
  },
  {
    id: 'grader',
    labelVi: 'Chấm bài viết',
    shortLabelVi: 'Chấm bài',
    descriptionVi: 'Đánh giá chi tiết theo 5 tiêu chí chuẩn',
    icon: PenLine,
  },
  {
    id: 'vocabulary',
    labelVi: 'Từ vựng Flashcard',
    shortLabelVi: 'Từ vựng',
    descriptionVi: 'Chữ Hán, Pinyin, ví dụ theo HSK',
    icon: BookOpen,
  },
  {
    id: 'hsk',
    labelVi: 'Luyện thi HSK',
    shortLabelVi: 'Thi HSK',
    descriptionVi: 'Đề luyện tập & giải thích chi tiết',
    icon: GraduationCap,
  },
  {
    id: 'roleplay',
    labelVi: 'Luyện hội thoại',
    shortLabelVi: 'Hội thoại',
    descriptionVi: 'Đóng vai tình huống & nói trực tiếp',
    icon: MessagesSquare,
  },
];

interface SidebarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { user, signingIn, authError, signInWithGoogle, signOut } = useAuth();

  const handleSelect = (tab: WorkspaceTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#FBF9F5] border-r border-[#EFE7DE] px-4 py-5 select-none relative overflow-hidden">
      {/* Decorative subtle oriental background glow */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-red-800/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10">
        {/* Brand Header with Mascot Favicon / Logo */}
        <div className="flex items-center justify-between px-1 pb-6 border-b border-[#EFE7DE]">
          <div className="flex items-center gap-3">
            {/* Mascot Favicon Logo */}
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-800 via-red-900 to-amber-950 p-0.5 shadow-md shadow-red-950/20 ring-1 ring-amber-400/40 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-[10px] bg-white flex items-center justify-center overflow-hidden">
                  <MascotSticker
                    name="01_reading"
                    size="sm"
                    animate="float-gentle"
                    className="w-8 h-8"
                  />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 text-[9px] text-white font-bold ring-1 ring-white">
                漢
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="block text-base font-bold tracking-tight text-stone-900 whitespace-nowrap">
                  HanYu<span className="text-red-800 ml-0.5">Share</span>
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100/80 text-red-800 border border-red-200/60 font-zh">
                  汉语
                </span>
              </div>
              <span className="block text-[11px] text-stone-500 whitespace-nowrap font-medium">
                Học tiếng Trung cùng AI
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng thanh điều hướng"
            className="lg:hidden rounded-lg p-2 text-stone-500 hover:bg-stone-200/60 hover:text-stone-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="mt-5 space-y-1">
          <p className="px-2.5 pb-2 text-[11px] font-semibold tracking-wider uppercase text-stone-400">
            Không gian học tập
          </p>

          <nav aria-label="Công cụ học tập" className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition-all duration-200 min-h-[44px] group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-800 ${
                    isActive
                      ? 'bg-gradient-to-r from-red-800 via-red-850 to-red-900 text-white font-semibold shadow-md shadow-red-950/20 ring-1 ring-amber-400/40 translate-x-1'
                      : 'text-stone-700 hover:bg-stone-100/90 hover:text-red-900 font-medium'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-white/15 text-amber-300'
                        : 'bg-stone-100 text-stone-500 group-hover:bg-red-50 group-hover:text-red-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm whitespace-nowrap truncate block">
                      {item.labelVi}
                    </span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer with Mascot Peek & Auth */}
      <div className="relative z-10 border-t border-[#EFE7DE] pt-4 px-1 space-y-3">
        {/* Mascot cute peek sticker on the sidebar */}
        <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-amber-50/60 border border-amber-200/50">
          <div className="flex items-center gap-2 min-w-0">
            <MascotSticker
              name="08_peek_side"
              size="sm"
              animate="wiggle"
              className="w-7 h-7 shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-amber-900 block truncate">
                Mục tiêu hôm nay
              </span>
              <span className="text-[10px] text-amber-700/80 block truncate">
                Luyện 15 phút tiếng Trung
              </span>
            </div>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        </div>

        {user ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 p-1.5 rounded-xl bg-white border border-[#EFE7DE]">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Tài khoản'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-red-200 shrink-0 object-cover"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-800 flex items-center justify-center text-xs font-bold shrink-0">
                  {(user.displayName ?? user.email ?? 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-stone-900 truncate">
                  {user.displayName ?? 'Học viên'}
                </p>
                <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:bg-red-50 hover:text-red-800 hover:border-red-200 transition-colors min-h-[38px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Đăng nhập để đồng bộ tiến độ, sổ từ vựng và lịch sử chấm bài.
            </p>
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-800 to-red-900 text-white px-3 py-2.5 text-xs font-semibold shadow-md shadow-red-950/20 hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-60 min-h-[40px] border border-amber-400/30 card-lift"
            >
              {signingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{signingIn ? 'Đang kết nối...' : 'Đăng nhập Google'}</span>
            </button>
            {authError && <p className="text-[11px] text-red-600">{authError}</p>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0 shadow-[1px_0_10px_rgba(0,0,0,0.03)] z-30">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[84vw] h-full bg-[#FAF7F2] shadow-2xl animate-pop">
            {navContent}
          </div>
        </div>
      )}

      {/* Bottom bar for mobile devices */}
      <nav
        aria-label="Điều hướng nhanh trên di động"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-16 bg-white/95 backdrop-blur-md border-t border-[#EFE7DE] grid grid-cols-5 px-1 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition-all py-1 ${
                isActive
                  ? 'text-red-800 font-bold'
                  : 'text-stone-500 hover:text-stone-800 font-medium'
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-red-100/80 text-red-800 shadow-sm'
                    : 'text-stone-500'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
              </div>
              <span className="text-[10px] whitespace-nowrap truncate max-w-full px-0.5">
                {item.shortLabelVi}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
