import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
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

  const [isIOS, setIsIOS] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  });

  const [isMac, setIsMac] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /macintosh|mac os x/.test(window.navigator.userAgent.toLowerCase()) && !/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });

  const [isAndroid, setIsAndroid] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /android/.test(window.navigator.userAgent.toLowerCase());
  });

  const [isInstalling, setIsInstalling] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
      setIsModalOpen(false);
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

  // 触发安装逻辑：如果有原生 prompt 则直接触发；如果不可用或在受限环境，则弹出安装指引与独立窗口启动器
  const install = useCallback(async (): Promise<boolean> => {
    setIsInstalling(true);
    try {
      const promptEvent =
        deferredPrompt ||
        (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null);

      if (promptEvent && typeof promptEvent.prompt === 'function') {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          setIsModalOpen(false);
          if (typeof window !== 'undefined') {
            (window as any).__deferredPwaPrompt = null;
            (window as any).__isPwaInstalled = true;
          }
          return true;
        }
        // 用户取消或拒绝，保持 modal 或返回
        return false;
      }

      // 如果浏览器原生 prompt 尚未捕获或不支持（如 iOS Safari、Mac Safari 或沙箱 iframe）
      // 打开专业安装引导模态框，确保用户操作有即时响应
      setIsModalOpen(true);
      return false;
    } catch (err) {
      console.warn('PWA install error:', err);
      setIsModalOpen(true);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [deferredPrompt]);

  const openInstallModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeInstallModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const standaloneUrl = typeof window !== 'undefined' ? `${window.location.origin}/?action=install` : '/';

  return {
    isInstallable: !!deferredPrompt || isInIframe || isIOS || isAndroid,
    hasNativePrompt: !!deferredPrompt,
    isInstalled,
    isInIframe,
    isIOS,
    isMac,
    isAndroid,
    isInstalling,
    isModalOpen,
    standaloneUrl,
    install,
    openInstallModal,
    closeInstallModal,
  };
}
