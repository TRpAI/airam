import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Sun, 
  Moon, 
  Laptop, 
  LogOut,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { ThemeMode } from '../hooks/useTheme';
import { GitHubUser } from '../types/auth';
import { PWAInstallButton } from './PWAInstallButton';

export type MainNavTab = 'dashboard' | 'knowledge' | 'projects' | 'submissions' | 'github' | 'architecture' | 'backup' | 'settings';

interface HeaderProps {
  viewMode: 'public' | 'admin' | 'user';
  setViewMode: (mode: 'public' | 'admin' | 'user') => void;
  activeTab?: MainNavTab;
  setActiveTab?: (tab: MainNavTab) => void;
  onOpenSearch: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  user: GitHubUser | null;
  onLogout: () => void;
  r2Enabled: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  onOpenSearch,
  theme,
  setTheme,
  user,
  onLogout,
  r2Enabled,
}) => {
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:px-6">
        
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-3 sm:gap-5">
          <button 
            onClick={() => setViewMode('public')} 
            className="flex items-center gap-2 text-left focus:outline-none group active:scale-95 transition-transform"
            title="AIram | 边缘神经知识中枢"
          >
            {/* Project Icon (Minimal Geometric Neural/Edge Matrix Node) */}
            <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center p-1.5 shadow-xs relative overflow-hidden group-hover:scale-105 transition-transform">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-zinc-100 font-mono flex items-center">
                <span>AI</span>
                <span className="text-emerald-500">ram</span>
                <span className="text-[10px] text-zinc-400 font-mono font-normal ml-0.5">.os</span>
              </span>
              {viewMode === 'admin' ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                  ADMIN-CORE
                </span>
              ) : viewMode === 'user' ? (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold">
                  USER-HUB
                </span>
              ) : (
                <span className="text-[10px] font-mono text-zinc-400 hidden md:inline">
                  EDGE-NODE
                </span>
              )}
            </div>
          </button>

          {/* Subtitle in Admin Mode */}
          {viewMode === 'admin' && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span>研发知识中枢管理控制台</span>
            </div>
          )}

          {/* Subtitle in User Mode */}
          {viewMode === 'user' && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span>访客开发者中心 · 仓库与评论</span>
            </div>
          )}

          {/* Desktop Nav in Public Mode */}
          {viewMode === 'public' && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span>公开精选开源与知识库</span>
            </div>
          )}
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-2">
          

          {/* Quick Search */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            title="搜索 (Ctrl+K)"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">搜索...</span>
            <kbd className="hidden md:inline text-[10px] font-mono text-zinc-400">⌘K</kbd>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton variant="minimal" />

          {/* Theme Dropdown */}
          <div className="relative" ref={themeRef}>
            <button
              onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
              className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              title="切换主题"
              aria-label="Theme"
            >
              {theme === 'light' && <Sun className="h-3.5 w-3.5 text-amber-500" />}
              {theme === 'dark' && <Moon className="h-3.5 w-3.5 text-sky-400" />}
              {theme === 'system' && <Laptop className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />}
            </button>

            {themeDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-28 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-md py-1 z-50 text-xs font-mono">
                <button
                  onClick={() => { setTheme('light'); setThemeDropdownOpen(false); }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Sun className="h-3 w-3 text-amber-500" />
                  <span>明亮</span>
                </button>
                <button
                  onClick={() => { setTheme('dark'); setThemeDropdownOpen(false); }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Moon className="h-3 w-3 text-sky-400" />
                  <span>暗黑</span>
                </button>
                <button
                  onClick={() => { setTheme('system'); setThemeDropdownOpen(false); }}
                  className="w-full flex items-center gap-1.5 px-2.5 py-1 text-left text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Laptop className="h-3 w-3 text-zinc-500" />
                  <span>自动</span>
                </button>
              </div>
            )}
          </div>

          {/* User Profile Dropdown (Active whenever logged in) */}
          {user ? (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="用户设置与主页"
              >
                <div className="relative">
                  <img 
                    src={user.avatar_url} 
                    alt={user.login} 
                    className={`h-7 w-7 rounded-full border-2 object-cover ${user.isAdmin ? 'border-emerald-500' : 'border-sky-500'}`} 
                  />
                  <span 
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900 ${
                      user.isAdmin ? 'bg-emerald-500' : 'bg-sky-500'
                    }`} 
                    title={user.isAdmin ? '系统管理员' : '访客开发者'} 
                  />
                </div>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 z-50 text-xs font-mono space-y-1.5">
                  <div className="px-2.5 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${
                        user.isAdmin 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                          : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20'
                      }`}>
                        {user.isAdmin ? '管理员' : '访客'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">@{user.login}</div>
                  </div>

                  {user.isAdmin && (
                    <button
                      onClick={() => {
                        setViewMode('admin');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors text-left cursor-pointer font-semibold"
                    >
                      <span>进入管理中枢</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setViewMode('user');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                  >
                    <span>访客工作台 (提交与评论)</span>
                  </button>

                  <button
                    onClick={() => {
                      setViewMode('public');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
                  >
                    <span>切换至公开展示</span>
                  </button>

                  <a
                    href={user.html_url || `https://github.com/${user.login}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <span>GitHub 主页</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>

                  <div className="pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => {
                        onLogout();
                        setUserDropdownOpen(false);
                        setViewMode('public');
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="h-3 w-3" />
                      <span>退出登录</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setViewMode('admin')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <span>登录</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
