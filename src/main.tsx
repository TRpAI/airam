import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with auto-update
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('PWA Service Worker: Content refreshed');
  },
  onOfflineReady() {
    console.log('PWA Service Worker: App ready to work offline');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
