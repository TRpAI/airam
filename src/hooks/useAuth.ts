import { useState, useEffect, useCallback } from 'react';
import { GitHubUser, AuthState, OAuthStatus } from '../types/auth';

const STORAGE_KEY = 'devhub_auth_session';

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return {
      isAuthenticated: false,
      user: null,
    };
  });

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  // Check OAuth and Admin System status on load (Strictly from Cloudflare / server environment)
  const refreshOAuthStatus = useCallback(async () => {
    try {
      const origin = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/status?origin=${origin}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          setOauthStatus(data);
          return data as OAuthStatus;
        } catch {
          console.warn('Backend API returned non-JSON');
        }
      }
    } catch (err) {
      console.warn('获取 OAuth 配置状态失败:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshOAuthStatus();
  }, [refreshOAuthStatus]);

  // Auto-detect and exchange OAuth code when page loads with ?code= parameter (redirect flow)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    const searchParams = url.searchParams;
    const code = searchParams.get('code');
    const err = searchParams.get('error');
    const errDesc = searchParams.get('error_description');

    if (err) {
      setAuthError(errDesc || err || 'GitHub 授权未通过');
      const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
      window.history.replaceState({}, '', `${cleanPath}${window.location.hash}`);
      return;
    }

    if (!code) return;

    let active = true;
    setIsExchangingCode(true);
    setLoading(true);

    const performExchange = async () => {
      try {
        const origin = window.location.origin;
        // 1. Try dedicated Cloudflare Pages / server exchange endpoint
        let res = await fetch(`/api/auth/exchange?code=${encodeURIComponent(code)}&origin=${encodeURIComponent(origin)}`, {
          headers: { Accept: 'application/json' }
        });

        // 2. Fallback to /auth/callback with format=json
        if (!res.ok && res.status === 404) {
          res = await fetch(`/auth/callback?code=${encodeURIComponent(code)}&format=json&origin=${encodeURIComponent(origin)}`, {
            headers: { Accept: 'application/json' }
          });
        }

        const data = await res.json();
        if (!active) return;

        if (!res.ok || data.error || !data.user) {
          throw new Error(data.error || '换取 GitHub 授权访问令牌失败');
        }

        const newAuth: AuthState = {
          isAuthenticated: true,
          user: data.user,
          token: data.token,
        };

        setAuth(newAuth);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
        } catch {
          // ignore quota
        }

        // Clean up URL parameters (remove ?code=...&state=...) and redirect to admin dashboard
        const targetHash = window.location.hash && window.location.hash !== '#/' 
          ? window.location.hash 
          : '#/admin/dashboard';
        const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
        window.history.replaceState({}, '', `${cleanPath}${targetHash}`);

        refreshOAuthStatus();
      } catch (e: any) {
        if (!active) return;
        console.error('GitHub code exchange failed:', e);
        setAuthError(e.message || 'GitHub 授权凭据交换失败');
        const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
        window.history.replaceState({}, '', `${cleanPath}${window.location.hash}`);
      } finally {
        if (active) {
          setIsExchangingCode(false);
          setLoading(false);
        }
      }
    };

    performExchange();

    return () => {
      active = false;
    };
  }, [refreshOAuthStatus]);

  // Set up OAuth popup postMessage listener (Only Cloudflare Pages and local dev)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Strict origin check: only allow current origin, Cloudflare pages.dev, or local dev
      if (
        !origin.includes('pages.dev') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { user, token } = event.data;
        if (user) {
          const newAuth: AuthState = {
            isAuthenticated: true,
            user,
            token,
          };
          setAuth(newAuth);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
          } catch {
            // storage quota/private mode
          }
          setLoading(false);
          refreshOAuthStatus();
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        console.error('GitHub OAuth error:', event.data.error);
        setAuthError(event.data.error || '授权失败');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshOAuthStatus]);

  // Helper to build direct GitHub OAuth authorize URL synchronously
  const getOAuthAuthorizeUrl = useCallback((): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;
    const clientId = 
      oauthStatus?.clientId || 
      (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || 
      '';

    if (!clientId) return '';

    const state = Math.random().toString(36).substring(2, 15);
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:user user:email repo',
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }, [oauthStatus?.clientId]);

  // 1. Primary: Login via GitHub OAuth (Immediate synchronous popup with auto-redirect fallback)
  const loginWithOAuth = async (forceDirectRedirect = false): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const authUrl = getOAuthAuthorizeUrl();

      if (!authUrl) {
        setLoading(false);
        return {
          success: false,
          error: '系统尚未配置 Cloudflare 环境变量 GITHUB_CLIENT_ID。请在 Cloudflare Pages 设置中添加并重新部署。',
        };
      }

      // If user requested direct redirect or on mobile/special browser
      if (forceDirectRedirect) {
        window.location.href = authUrl;
        return { success: true };
      }

      // 1. Open popup window SYNCHRONOUSLY directly inside user gesture so browser NEVER blocks it
      const width = 600;
      const height = 740;
      const left = Math.max(0, Math.round(window.screen.width / 2 - width / 2));
      const top = Math.max(0, Math.round(window.screen.height / 2 - height / 2));

      let authWindow: Window | null = null;
      try {
        authWindow = window.open(
          authUrl,
          'github_oauth_popup',
          `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
        );
      } catch {
        authWindow = null;
      }

      // 2. If browser blocked popup (e.g. strict iframe or popup blocker active), fallback to same-window navigation
      if (!authWindow || authWindow.closed) {
        console.warn('Popup window could not open, falling back to direct navigation for GitHub authorization.');
        window.location.href = authUrl;
        return { success: true };
      }

      // Popup successfully opened
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        error: err.message || '发起 GitHub 授权失败',
      };
    }
  };

  // 2. Demo Login (Only enabled in development mode, disabled in production)
  const loginWithDemo = async (username = 'osahermes') => {
    // If in production mode, block demo login
    if (import.meta.env.PROD) {
      throw new Error('生产环境已全面移除演示模式，请使用 GitHub OAuth 登录。');
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });

      if (res.ok) {
        const data = await res.json();
        const newAuth: AuthState = {
          isAuthenticated: true,
          user: data.user,
          token: undefined,
        };
        setAuth(newAuth);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
        refreshOAuthStatus();
        return;
      }

      const mockAdmin: GitHubUser = {
        id: 998877,
        login: username,
        name: 'Dev Hub Admin',
        avatar_url: `https://github.com/${username}.png`,
        bio: '研发知识中枢管理员',
        html_url: `https://github.com/${username}`,
        role: 'admin',
        isAdmin: true,
      };

      const newAuth: AuthState = {
        isAuthenticated: true,
        user: mockAdmin,
      };
      setAuth(newAuth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
      refreshOAuthStatus();
    } finally {
      setLoading(false);
    }
  };

  // 3. Reset Admin Authority (Seat release)
  const resetAdminSeat = async () => {
    try {
      await fetch('/api/auth/reset-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
    } catch {
      // fallback
    }
    localStorage.removeItem('airam_admin_user');
    logout();
    refreshOAuthStatus();
  };

  const logout = () => {
    setAuth({
      isAuthenticated: false,
      user: null,
    });
    localStorage.removeItem(STORAGE_KEY);
    refreshOAuthStatus();
  };

  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    token: auth.token,
    loading,
    authError,
    isExchangingCode,
    oauthStatus,
    loginWithOAuth,
    loginWithDemo,
    getOAuthAuthorizeUrl,
    resetAdminSeat,
    refreshOAuthStatus,
    logout,
  };
}
