import { useState, useEffect, useCallback } from 'react';
import { MainNavTab } from '../components/Header';

export type PublicSection = 'all' | 'projects' | 'community' | 'knowledge';

export interface RouteState {
  viewMode: 'public' | 'admin';
  adminTab: MainNavTab;
  publicSection: PublicSection;
  selectedDocId: string | null;
  selectedKnowledgeId?: string | null;
}

const STORAGE_KEY = 'airam_route_state';

export const VALID_ADMIN_TABS: MainNavTab[] = [
  'dashboard',
  'knowledge',
  'projects',
  'submissions',
  'github',
  'architecture',
  'backup',
  'settings'
];

export const VALID_PUBLIC_SECTIONS: PublicSection[] = [
  'all',
  'projects',
  'community',
  'knowledge'
];

/**
 * 从当前浏览器 URL (hash, pathname, search) 中解析路由
 */
export function parseRouteFromLocation(): RouteState | null {
  if (typeof window === 'undefined') return null;

  // 1. 优先提取 hash（例如 #/admin/settings, #/settings, #/projects, #/doc/kb-1）
  const hashRaw = window.location.hash.replace(/^#\/?/, '').trim();

  // 2. 提取 pathname（用于无 hash 时的直接访问或刷新）
  const pathRaw = window.location.pathname.replace(/^\//, '').trim();

  // 3. 提取 query params（用于 ?mode=admin&tab=settings 等）
  const searchParams = new URLSearchParams(window.location.search);
  const qMode = searchParams.get('mode') as 'public' | 'admin' | null;
  const qTab = searchParams.get('tab') as MainNavTab | null;
  const qSection = searchParams.get('section') as PublicSection | null;
  const qDoc = searchParams.get('doc');

  const candidate = hashRaw || (pathRaw && pathRaw !== 'index.html' ? pathRaw : '');

  if (candidate) {
    // 规则 A: 管理后台复合路径 admin 或 admin/:tab 或 admin/knowledge/:docId
    if (candidate.startsWith('admin')) {
      const parts = candidate.split('/');
      const tabCandidate = parts[1] as MainNavTab;
      const adminTab = VALID_ADMIN_TABS.includes(tabCandidate) ? tabCandidate : 'dashboard';
      const subDocId = parts[2] || null;
      return {
        viewMode: 'admin',
        adminTab,
        publicSection: 'all',
        selectedDocId: null,
        selectedKnowledgeId: subDocId
      };
    }

    // 规则 B: 独立管理标签（例如 #/settings, #/architecture, #/backup, #/github, #/submissions, #/dashboard）
    if (VALID_ADMIN_TABS.includes(candidate as MainNavTab) && candidate !== 'knowledge' && candidate !== 'projects') {
      return {
        viewMode: 'admin',
        adminTab: candidate as MainNavTab,
        publicSection: 'all',
        selectedDocId: null
      };
    }

    // 规则 C: 知识阅读器弹窗 doc/:id
    if (candidate.startsWith('doc/')) {
      const docId = candidate.replace(/^doc\//, '').trim();
      return {
        viewMode: 'public',
        adminTab: 'dashboard',
        publicSection: 'knowledge',
        selectedDocId: docId || null
      };
    }

    // 规则 D: 前台展示区分类（projects, community, knowledge, all）
    if (VALID_PUBLIC_SECTIONS.includes(candidate as PublicSection)) {
      return {
        viewMode: 'public',
        adminTab: 'dashboard',
        publicSection: candidate as PublicSection,
        selectedDocId: null
      };
    }
  }

  // 规则 E: Query Params 驱动路由
  if (qMode || qTab || qSection || qDoc) {
    const viewMode = qMode || (qTab ? 'admin' : 'public');
    const adminTab = qTab && VALID_ADMIN_TABS.includes(qTab) ? qTab : 'dashboard';
    const publicSection = qSection && VALID_PUBLIC_SECTIONS.includes(qSection) ? qSection : 'all';
    return {
      viewMode,
      adminTab,
      publicSection,
      selectedDocId: qDoc || null
    };
  }

  return null;
}

/**
 * 从本地持久化存储（localStorage / sessionStorage）获取上次活跃路由
 */
export function getStoredRoute(): RouteState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          viewMode: parsed.viewMode === 'admin' ? 'admin' : 'public',
          adminTab: VALID_ADMIN_TABS.includes(parsed.adminTab) ? parsed.adminTab : 'dashboard',
          publicSection: VALID_PUBLIC_SECTIONS.includes(parsed.publicSection) ? parsed.publicSection : 'all',
          selectedDocId: parsed.selectedDocId || null,
          selectedKnowledgeId: parsed.selectedKnowledgeId || null
        };
      }
    }
  } catch {}

  return {
    viewMode: 'public',
    adminTab: 'dashboard',
    publicSection: 'all',
    selectedDocId: null,
    selectedKnowledgeId: null
  };
}

/**
 * 根据路由状态生成规范化 URL Hash
 */
export function buildHash(route: RouteState): string {
  if (route.viewMode === 'admin') {
    if (route.adminTab === 'knowledge' && route.selectedKnowledgeId) {
      return `#/admin/knowledge/${route.selectedKnowledgeId}`;
    }
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
    // 1. 优先尝试从 URL 解析
    const fromUrl = parseRouteFromLocation();
    if (fromUrl) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      } catch {}
      return fromUrl;
    }

    // 2. 降级从 localStorage / sessionStorage 获取
    return getStoredRoute();
  });

  // 更新路由状态并双向同步到 URL Hash 与 Storage
  const updateRoute = useCallback((updater: Partial<RouteState> | ((prev: RouteState) => RouteState)) => {
    setRoute((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      const newHash = buildHash(next);

      if (typeof window !== 'undefined') {
        try {
          if (window.location.hash !== newHash) {
            window.history.pushState(null, '', newHash);
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {}
      }

      return next;
    });
  }, []);

  // 监听浏览器前进、后退及 Hash 变更
  useEffect(() => {
    const handleUrlChange = () => {
      const parsed = parseRouteFromLocation();
      if (parsed) {
        setRoute(parsed);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);

    // 首次挂载：确保当前 URL 与存储的页面定位保持一致（避免刷新时 URL 空白被重置）
    const targetHash = buildHash(route);
    if (!window.location.hash || window.location.hash === '#' || window.location.hash !== targetHash) {
      try {
        window.history.replaceState(null, '', targetHash);
      } catch {}
    }

    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // 快捷路由操作函数
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

  const setSelectedKnowledgeId = useCallback((id: string | null) => {
    updateRoute((prev) => ({
      ...prev,
      selectedKnowledgeId: id
    }));
  }, [updateRoute]);

  return {
    viewMode: route.viewMode,
    activeTab: route.adminTab,
    publicSection: route.publicSection,
    selectedDocId: route.selectedDocId,
    selectedKnowledgeId: route.selectedKnowledgeId,
    setViewMode,
    setActiveTab,
    setPublicSection,
    setSelectedDocId,
    setSelectedKnowledgeId,
    updateRoute
  };
}
