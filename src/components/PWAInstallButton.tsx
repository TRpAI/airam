import React from 'react';
import { Download, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'minimal' | 'full' | 'hero' }> = ({ variant = 'minimal' }) => {
  const { 
    isInstalled, 
    install
  } = usePWAInstall();

  // If already running as installed PWA standalone
  if (isInstalled) {
    if (variant === 'full' || variant === 'hero') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          <span>已安装为独立应用</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 直接触发安装，不给任何提示或指引弹窗
    await install();
  };

  return (
    <button
      onClick={handleInstallClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
        variant === 'hero'
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-semibold shadow-xs py-2 px-3 text-xs'
          : variant === 'full'
          ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium'
          : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
      title="安装为独立桌面/手机 App（支持离线与独立窗口）"
    >
      <Download className="h-3.5 w-3.5 text-emerald-500" />
      <span className="hidden sm:inline">安装 App</span>
      <span className="sm:hidden">安装</span>
    </button>
  );
};
