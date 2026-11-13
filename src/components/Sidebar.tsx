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
} from 'lucide-react';
import type { WorkspaceTab } from '../types/learning';
import { useAuth } from '../contexts/AuthContext';

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
    descriptionVi: 'Đánh giá chi tiết theo 5 tiêu chí',
    icon: PenLine,
  },
  {
    id: 'vocabulary',
    labelVi: 'Từ vựng',
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
    <div className="flex h-full flex-col justify-between bg-zinc-50/70 border-r border-zinc-200 px-4 py-5">
      <div>
        <div className="flex items-center justify-between px-2 pb-6">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 text-white font-zh text-base font-semibold shrink-0"
            >
              汉
            </span>
            <div className="min-w-0">
              <span className="block text-base font-bold tracking-tight text-zinc-900 whitespace-nowrap">
                HanYu Share
              </span>
              <span className="block text-xs text-zinc-500 whitespace-nowrap">
                Tiếng Trung cho người Việt
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng thanh điều hướng"
            className="lg:hidden rounded-lg p-2 text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Công cụ học tập" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${
                  isActive
                    ? 'bg-red-50 text-red-700 font-semibold'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 font-medium'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-red-600' : 'text-zinc-500'
                  }`}
                />
                <span className="text-sm whitespace-nowrap truncate">{item.labelVi}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-zinc-200 pt-4 px-1 space-y-3">
        {user ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName ?? 'Tài khoản'}
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-full border border-zinc-200 shrink-0 object-cover"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-semibold shrink-0">
                  {(user.displayName ?? user.email ?? 'U').slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                  {user.displayName ?? 'Học viên'}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 min-h-[38px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 leading-relaxed">
              Đăng nhập Google để lưu lịch sử chấm bài, đề HSK và từ vựng đã học.
            </p>
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 min-h-[40px]"
            >
              {signingIn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-red-600" />
              ) : (
                <LogIn className="w-3.5 h-3.5 text-red-600" />
              )}
              <span>{signingIn ? 'Đang đăng nhập...' : 'Đăng nhập Google'}</span>
            </button>
            {authError && <p className="text-[11px] text-red-600">{authError}</p>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-zinc-900/30 backdrop-blur-[1px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[82vw] h-full bg-white shadow-xl">
            {navContent}
          </div>
        </div>
      )}

      <nav
        aria-label="Điều hướng nhanh trên di động"
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-14 bg-white border-t border-zinc-200 grid grid-cols-5 px-1"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] transition-colors ${
                isActive ? 'text-red-600 font-semibold' : 'text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap truncate max-w-full px-1">
                {item.shortLabelVi}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
