import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-12 left-4 z-40 flex items-center gap-2 rounded-lg bg-zinc-900/90 text-amber-400 dark:bg-zinc-800/95 dark:text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-mono shadow-xl backdrop-blur-md animate-in slide-in-from-bottom-2">
      <WifiOff className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
      <span>离线模式 — 使用 Service Worker 本地持久化缓存</span>
    </div>
  );
};
