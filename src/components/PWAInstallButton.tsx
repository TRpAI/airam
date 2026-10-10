import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'minimal' | 'full' }> = ({ variant = 'minimal' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  // If already running as installed PWA standalone
  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded">
          <Check className="h-3 w-3 text-emerald-500" />
          <span>已安装为应用</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) setJustInstalled(true);
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
          variant === 'full'
            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium'
            : 'border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100'
        }`}
        title="安装 AIram 为原生独立桌面/手机 App"
      >
        <Download className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">安装 App</span>
        <span className="sm:hidden">安装</span>
      </button>

      {/* Guide Modal when beforeinstallprompt is not directly fired (e.g. iOS or manual) */}
      {showGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowGuide(false)}
        >
          <div 
            className="w-full max-w-sm rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-5 space-y-4 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold">
                <Smartphone className="h-4 w-4" />
                <span>安装 AIram 到设备</span>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-zinc-600 dark:text-zinc-400 font-sans text-xs leading-relaxed">
              <p>AIram 符合标准 PWA 渐进式 Web 应用规范，可作为独立轻量应用运行：</p>
              
              {isIOS ? (
                <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 font-mono text-[11px]">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200">📱 iOS Safari 安装步骤:</div>
                  <div>1. 点击 Safari 底部工具栏的「分享」按钮 (箭头向上图标)</div>
                  <div>2. 向下滑动并点击「添加到主屏幕」</div>
                  <div>3. 点击右上角「添加」即可拥有独立 App 体验</div>
                </div>
              ) : (
                <div className="p-3 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5 font-mono text-[11px]">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200">💻 桌面 Chrome / Edge / 移动 Android:</div>
                  <div>1. 点击地址栏右侧的「安装应用」图标 ⊕</div>
                  <div>2. 或在浏览器菜单中选择「安装 AIram」</div>
                  <div>3. 即享沉浸式独立窗口与极速离线体验</div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-1.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-mono text-xs hover:opacity-90"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
};
