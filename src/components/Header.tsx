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

export type MainNavTab = 'dashboard' | 'knowledge' | 'projects' | 'github' | 'architecture' | 'backup';

interface HeaderProps {
  viewMode: 'public' | 'admin';
  setViewMode: (mode: 'public' | 'admin') => void;
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
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                  CORE
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
              <span>研发知识中枢控制台</span>
            </div>
          )}

          {/* Desktop Nav in Public Mode */}
          {viewMode === 'public' && (
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-400 pl-2 border-l border-zinc-200 dark:border-zinc-800">
              <span>公开作品与知识库</span>
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

          {/* User Profile Dropdown (In Admin Mode only) */}
          {viewMode === 'admin' && user && (
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="用户设置与主页"
              >
                <img 
                  src={user.avatar_url} 
                  alt={user.login} 
                  className="h-6 w-6 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover" 
                />
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 z-50 text-xs font-mono space-y-2">
                  <div className="px-2 py-1 border-b border-zinc-100 dark:border-zinc-800">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{user.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate">@{user.login} (Owner)</div>
                  </div>

                  <a
                    href={user.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>GitHub 主页</span>
                  </a>

                  <button
                    onClick={() => {
                      setViewMode('public');
                      setUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>切换至前台展示</span>
                  </button>

                  <button
                    onClick={() => {
                      onLogout();
                      setUserDropdownOpen(false);
                      setViewMode('public');
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>退出后台登入</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
