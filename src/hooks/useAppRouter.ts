import { useState, useEffect, useCallback } from 'react';
import { MainNavTab } from '../components/Header';

export type PublicSection = 'all' | 'projects' | 'community' | 'knowledge';

export interface RouteState {
  viewMode: 'public' | 'admin';
  adminTab: MainNavTab;
  publicSection: PublicSection;
  selectedDocId: string | null;
}

const STORAGE_KEY = 'airam_route_state';

const VALID_ADMIN_TABS: MainNavTab[] = [
  'dashboard',
  'knowledge',
  'projects',
  'submissions',
  'github',
  'architecture',
  'backup',
  'settings'
];

const VALID_PUBLIC_SECTIONS: PublicSection[] = [
  'all',
  'projects',
  'community',
  'knowledge'
];

function parseHash(hash: string): RouteState | null {
  const clean = hash.replace(/^#\/?/, '').trim();
  if (!clean) return null;

  // 1. Admin route: admin or admin/:tab
  if (clean.startsWith('admin')) {
    const parts = clean.split('/');
    const tabCandidate = parts[1] as MainNavTab;
    const adminTab = VALID_ADMIN_TABS.includes(tabCandidate) ? tabCandidate : 'dashboard';
    return {
      viewMode: 'admin',
      adminTab,
      publicSection: 'all',
      selectedDocId: null
    };
  }

  // 2. Doc reader modal route: doc/:id
  if (clean.startsWith('doc/')) {
    const docId = clean.replace(/^doc\//, '').trim();
    return {
      viewMode: 'public',
      adminTab: 'dashboard',
      publicSection: 'knowledge',
      selectedDocId: docId || null
    };
  }

  // 3. Public sections: projects, community, knowledge, all
  if (VALID_PUBLIC_SECTIONS.includes(clean as PublicSection)) {
    return {
      viewMode: 'public',
      adminTab: 'dashboard',
      publicSection: clean as PublicSection,
      selectedDocId: null
    };
  }

  return null;
}

function getStoredRoute(): RouteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          viewMode: parsed.viewMode === 'admin' ? 'admin' : 'public',
          adminTab: VALID_ADMIN_TABS.includes(parsed.adminTab) ? parsed.adminTab : 'dashboard',
          publicSection: VALID_PUBLIC_SECTIONS.includes(parsed.publicSection) ? parsed.publicSection : 'all',
          selectedDocId: parsed.selectedDocId || null
        };
      }
    }
  } catch {}

  return {
    viewMode: 'public',
    adminTab: 'dashboard',
    publicSection: 'all',
    selectedDocId: null
  };
}

export function buildHash(route: RouteState): string {
  if (route.viewMode === 'admin') {
    return `#/admin/${route.adminTab}`;
  }
  if (route.selectedDocId) {
    return `#/doc/${route.selectedDocId}`;
  }
  if (route.publicSection && route.publicSection !== 'all') {
    return `#/${route.publicSection}`;
  }
  return '#/';
}

export function useAppRouter() {
  const [route, setRoute] = useState<RouteState>(() => {
    // 1. Try URL hash first
    if (typeof window !== 'undefined' && window.location.hash) {
      const parsed = parseHash(window.location.hash);
      if (parsed) return parsed;
    }
    // 2. Fall back to localStorage
    return getStoredRoute();
  });

  // Sync route state to URL hash and localStorage
  const updateRoute = useCallback((updater: Partial<RouteState> | ((prev: RouteState) => RouteState)) => {
    setRoute((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const newHash = buildHash(next);

      // Update URL hash seamlessly and persist
      if (typeof window !== 'undefined') {
        try {
          if (window.location.hash !== newHash) {
            window.history.replaceState(null, '', newHash);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }

      return next;
    });
  }, []);

  // Listen to hashchange events (browser forward/back or manual address bar changes)
  useEffect(() => {
    const handleHashChange = () => {
      const parsed = parseHash(window.location.hash);
      if (parsed) {
        setRoute(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
    };

    // Ensure the initial hash matches the initial route if hash was empty
    const currentHash = buildHash(route);
    if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
      window.history.replaceState(null, '', currentHash);
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Router Helpers
  const setViewMode = useCallback((mode: 'public' | 'admin') => {
    updateRoute((prev) => ({
      ...prev,
      viewMode: mode,
      selectedDocId: null
    }));
  }, [updateRoute]);

  const setActiveTab = useCallback((tab: MainNavTab) => {
    updateRoute((prev) => ({
      ...prev,
      viewMode: 'admin',
      adminTab: tab
    }));
  }, [updateRoute]);

  const setPublicSection = useCallback((section: PublicSection) => {
    updateRoute((prev) => ({
      ...prev,
      viewMode: 'public',
      publicSection: section,
      selectedDocId: null
    }));
  }, [updateRoute]);

  const setSelectedDocId = useCallback((id: string | null) => {
    updateRoute((prev) => ({
      ...prev,
      selectedDocId: id
    }));
  }, [updateRoute]);

  return {
    viewMode: route.viewMode,
    activeTab: route.adminTab,
    publicSection: route.publicSection,
    selectedDocId: route.selectedDocId,
    setViewMode,
    setActiveTab,
    setPublicSection,
    setSelectedDocId,
    updateRoute
  };
}
