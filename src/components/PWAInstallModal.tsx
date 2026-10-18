import React, { useState, useEffect } from 'react';
import { 
  Download, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  Smartphone, 
  Monitor, 
  Laptop, 
  Share2, 
  PlusSquare, 
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasNativePrompt: boolean;
  isInstalling: boolean;
  onNativeInstall: () => Promise<boolean>;
  isIOS: boolean;
  isMac: boolean;
  isAndroid: boolean;
  isInIframe: boolean;
  standaloneUrl: string;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  hasNativePrompt,
  isInstalling,
  onNativeInstall,
  isIOS,
  isMac,
  isAndroid,
  isInIframe,
  standaloneUrl,
}) => {
  type PlatformKey = 'desktop' | 'ios' | 'mac' | 'android';
  
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>(() => {
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    if (isMac) return 'mac';
    return 'desktop';
  });

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isIOS) setSelectedPlatform('ios');
    else if (isAndroid) setSelectedPlatform('android');
    else if (isMac) setSelectedPlatform('mac');
    else setSelectedPlatform('desktop');
  }, [isIOS, isAndroid, isMac]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    const cleanUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : standaloneUrl;
    navigator.clipboard.writeText(cleanUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 font-mono">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Download className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>安装 DevKnowledge OS 应用</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal">PWA</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Native Install Prompt Card (If directly available in browser) */}
          {hasNativePrompt ? (
            <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-xs">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                  <span>浏览器原生安装器已就绪</span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  检测到当前浏览器支持一键生成桌面独立应用与离线运行。
                </p>
              </div>
              <button
                onClick={onNativeInstall}
                disabled={isInstalling}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                <span>{isInstalling ? '唤起中...' : '立即安装'}</span>
              </button>
            </div>
          ) : isInIframe ? (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200 text-xs">
                    当前处于嵌入式预览窗口 (iFrame)
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 leading-relaxed">
                    受浏览器安全策略限制，嵌入页面无法直接弹出原生系统安装窗口。请在独立标签页中打开即可一键安装至系统。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={standaloneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium text-xs transition-colors shadow-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>在独立全屏窗口打开并安装</span>
                </a>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  title="复制独立访问地址"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? '已复制' : '复制网址'}</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Platform Installation Guide Tabs */}
          <div className="space-y-2">
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
              各平台系统级安装指南：
            </div>

            {/* Tab navigation */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg text-[11px]">
              <button
                onClick={() => setSelectedPlatform('desktop')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                  selectedPlatform === 'desktop'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span className="truncate">Chrome/Edge</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('ios')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                  selectedPlatform === 'ios'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span className="truncate">iPhone/iPad</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('mac')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                  selectedPlatform === 'mac'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Laptop className="h-3 w-3" />
                <span className="truncate">Mac Safari</span>
              </button>

              <button
                onClick={() => setSelectedPlatform('android')}
                className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md transition-all cursor-pointer ${
                  selectedPlatform === 'android'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span className="truncate">Android</span>
              </button>
            </div>

            {/* Tab Panels */}
            <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2.5">
              {selectedPlatform === 'desktop' && (
                <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] leading-relaxed">
                      在 Chrome、Edge、Arc 等浏览器的地址栏右侧，点击出现的 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「安装图标 ⊕」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] leading-relaxed">
                      或点击浏览器右上角 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「⋮」</strong> 菜单，选择 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「保存并分享」→「安装 DevKnowledge OS 为应用」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] leading-relaxed">
                      确认后即可将应用固定至任务栏 / Dock，支持独立窗口与全局快捷键调用。
                    </p>
                  </div>
                </div>
              )}

              {selectedPlatform === 'ios' && (
                <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] leading-relaxed flex items-center gap-1">
                      <span>使用 Safari 打开本站，点击底部工具栏的</span>
                      <Share2 className="h-3.5 w-3.5 text-blue-500 inline shrink-0" />
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「分享 (Share)」</strong>
                      <span>按钮。</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] leading-relaxed flex items-center gap-1">
                      <span>在菜单中向下滚动，点击</span>
                      <PlusSquare className="h-3.5 w-3.5 text-zinc-500 inline shrink-0" />
                      <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「添加到主屏幕 (Add to Home Screen)」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] leading-relaxed">
                      点击右上角「添加」，即可从 iPhone / iPad 桌面全屏启动，享受与原生应用完全一致的离线缓存体验。
                    </p>
                  </div>
                </div>
              )}

              {selectedPlatform === 'mac' && (
                <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] leading-relaxed">
                      在 Safari 浏览器中，点击顶部菜单栏的 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「文件 (File)」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] leading-relaxed">
                      选择 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「添加到程序坞 (Add to Dock)」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] leading-relaxed">
                      点击「添加」，系统会自动生成独立的 macOS 原生应用，并将其放置于 Dock 和启动台中。
                    </p>
                  </div>
                </div>
              )}

              {selectedPlatform === 'android' && (
                <div className="space-y-2 text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">1</span>
                    <p className="text-[11px] leading-relaxed">
                      使用 Chrome 或系统浏览器打开，点击右上角 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「⋮」</strong> 菜单。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">2</span>
                    <p className="text-[11px] leading-relaxed">
                      点击 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「安装应用」</strong> 或 <strong className="text-zinc-900 dark:text-zinc-100 font-semibold">「添加到主屏幕」</strong>。
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center h-4 w-4 rounded-full bg-zinc-200 dark:bg-zinc-800 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 shrink-0 mt-0.5">3</span>
                    <p className="text-[11px] leading-relaxed">
                      系统自动将应用安装为独立 Android App，支持图标沉浸式启动与无网络浏览。
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Technical PWA Capabilities Banner */}
          <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-500" />
              <span>Service Worker 增量缓存就绪</span>
            </div>
            <div className="flex items-center gap-1">
              <span>独立运行 · 0白屏 · 极简启动</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex items-center justify-between">
          <a
            href={standaloneUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 underline underline-offset-2 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            <span>在新窗口打开</span>
          </a>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
