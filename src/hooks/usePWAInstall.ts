import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    return (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) || null;
  });
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      (window as any).__isPwaInstalled === true
    );
  });
  const [isInIframe, setIsInIframe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        (window as any).__isPwaInstalled === true;
      setIsInstalled(standalone);
    };

    checkInstalled();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (typeof window !== 'undefined') {
        (window as any).__deferredPwaPrompt = promptEvent;
      }
    };

    const handlePromptAvailable = (e: Event) => {
      const custom = e as CustomEvent<BeforeInstallPromptEvent>;
      if (custom.detail) {
        setDeferredPrompt(custom.detail);
      } else if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      if (typeof window !== 'undefined') {
        (window as any).__deferredPwaPrompt = null;
        (window as any).__isPwaInstalled = true;
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 重构直接安装函数：绝不展示操作提示或指引弹窗，直接触发原生安装
  const install = useCallback(async (): Promise<boolean> => {
    setIsInstalling(true);
    try {
      const promptEvent =
        deferredPrompt ||
        (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

      // 1. 如果当前环境已有原生 beforeinstallprompt 事件，直接触发安装对话框
      if (promptEvent && typeof promptEvent.prompt === 'function') {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          if (typeof window !== 'undefined') {
            (window as any).__deferredPwaPrompt = null;
            (window as any).__isPwaInstalled = true;
          }
          return true;
        }
        return false;
      }

      // 2. 如果在沙箱或受限 iframe 预览中（Chrome 安全策略限制在 iframe 内派发 beforeinstallprompt）
      // 直接打开独立全屏窗口并带上 ?action=install，独立窗口一加载即刻自动唤起浏览器原生安装
      if (isInIframe) {
        const topUrl = new URL(window.location.href);
        topUrl.searchParams.set('action', 'install');
        window.open(topUrl.toString(), '_blank', 'noopener,noreferrer');
        return true;
      }

      return false;
    } catch (err) {
      console.warn('Direct PWA install error:', err);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt, isInIframe]);

  const openInStandaloneWindow = useCallback(() => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch {}
  }, []);

  return {
    isInstallable: !!deferredPrompt || isInIframe,
    isInstalled,
    isInIframe,
    isInstalling,
    install,
    openInStandaloneWindow,
  };
}
