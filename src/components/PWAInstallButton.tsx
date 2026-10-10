import React, { useState } from 'react';
import { Download, Smartphone, X, Check, ExternalLink, Copy, Monitor } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ variant?: 'minimal' | 'full' | 'hero' }> = ({ variant = 'minimal' }) => {
  const { 
    isInstallable, 
    isInstalled, 
    isIOS, 
    isInIframe,
    install,
    openInStandaloneWindow 
  } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all ${
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

      {/* Guide & Action Modal */}
      {showGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowGuide(false)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-6 space-y-4 font-mono text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                <Smartphone className="h-4 w-4 text-emerald-500" />
                <span>安装 AIram 边缘中枢至设备</span>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* In Iframe Notice */}
            {isInIframe && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 space-y-2">
                <div className="font-semibold flex items-center gap-1.5">
                  <Monitor className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>当前处于嵌入式预览窗口 (Iframe)</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  现代浏览器（Chrome/Edge/Safari）出于安全保护策略，<strong>禁止在内嵌 iframe 中直接弹出系统级应用安装对话框</strong>。请在独立窗口中打开后点击安装：
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={openInStandaloneWindow}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500 text-white font-medium text-xs hover:bg-amber-600 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>在新标签页打开并安装</span>
                  </button>
                  <button
                    onClick={copyUrl}
                    className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg border border-amber-500/40 bg-white dark:bg-zinc-900 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-zinc-800"
                    title="复制网址"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? '已复制' : '复制网址'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Direct install trigger if available */}
            {isInstallable && !isInIframe && (
              <button
                onClick={async () => {
                  const ok = await install();
                  if (ok) setShowGuide(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md"
              >
                <Download className="h-4 w-4" />
                <span>立即一键安装到本机</span>
              </button>
            )}

            <div className="space-y-3 text-zinc-600 dark:text-zinc-400 text-xs">
              {isIOS ? (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-[11px]">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                    <span>📱 iOS Safari 安装步骤:</span>
                  </div>
                  <div className="space-y-1 text-zinc-500 dark:text-zinc-400">
                    <div>1. 点击 Safari 底部中央的「分享」按钮 (带有向上箭头的方框)</div>
                    <div>2. 向下滑动菜单并点击「添加到主屏幕」</div>
                    <div>3. 点击右上角「添加」，即可拥有全屏无边框 App 体验</div>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2 text-[11px]">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-200 flex items-center gap-1.5">
                    <span>💻 桌面 Chrome / Edge / 移动 Android:</span>
                  </div>
                  <div className="space-y-1 text-zinc-500 dark:text-zinc-400">
                    <div>1. 打开浏览器顶部地址栏最右侧的「安装应用」图标 (⊕)</div>
                    <div>2. 或在浏览器右上角「...」菜单中选择「安装 AIram 个人中枢」</div>
                    <div>3. 安装后自动脱离浏览器标签页，享受独立专属原生窗口与极速离线能力</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[11px]">
              <span className="text-zinc-400">PWA 规范 · 纯前端离线优先</span>
              <button
                onClick={() => setShowGuide(false)}
                className="py-1 px-3 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium"
              >
                知道了
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
