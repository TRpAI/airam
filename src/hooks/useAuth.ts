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

  const [callbackStep, setCallbackStep] = useState<'idle' | 'verifying' | 'success' | 'timeout' | 'error'>('idle');
  const [callbackProgress, setCallbackProgress] = useState(0);
  const [callbackTimedOut, setCallbackTimedOut] = useState(false);
  const [callbackStatusMsg, setCallbackStatusMsg] = useState('正在初始化 GitHub 身份验证...');

  // Helper to cancel callback and redirect cleanly to home/public
  const cancelCallbackAndRedirect = useCallback(() => {
    setIsExchangingCode(false);
    setCallbackStep('idle');
    setAuthError(null);
    setCallbackTimedOut(false);
    if (typeof window !== 'undefined') {
      const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
      window.history.replaceState({}, '', `${cleanPath}#/`);
      if (window.location.pathname.includes('/auth/callback')) {
        window.location.href = '/#/';
      }
    }
  }, []);

  // Helper to re-trigger the OAuth code exchange or new OAuth authorization
  const retryCallbackExchange = useCallback(() => {
    setAuthError(null);
    setCallbackTimedOut(false);
    setCallbackStep('verifying');
    setCallbackProgress(20);
    setCallbackStatusMsg('正在重新发起授权验证...');

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (!code) {
      // If code was cleared, initiate fresh OAuth login
      loginWithOAuth(false);
      return;
    }
    // Re-trigger exchange with existing code
    triggerExchange(code);
  }, []);

  // Dedicated code exchange runner with timeout protection
  const triggerExchange = useCallback(async (code: string) => {
    setIsExchangingCode(true);
    setLoading(true);
    setCallbackStep('verifying');
    setCallbackProgress(25);
    setCallbackTimedOut(false);
    setAuthError(null);
    setCallbackStatusMsg('已接收 GitHub 回调授权码，正在与 Cloudflare 边缘服务端通信...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 9000); // 9-second timeout safeguard

    // Progress tick
    const pTimer1 = setTimeout(() => {
      setCallbackProgress(60);
      setCallbackStatusMsg('正在通过 Cloudflare 环境变量向 GitHub 换取 Access Token...');
    }, 1200);

    const pTimer2 = setTimeout(() => {
      setCallbackProgress(85);
      setCallbackStatusMsg('正在校验用户所有者身份并同步管理员席位...');
    }, 2800);

    try {
      const origin = window.location.origin;
      let data: any = null;

      // 1. Try dedicated Cloudflare Pages / server exchange endpoint
      try {
        const candidateRes = await fetch(`/api/auth/exchange?code=${encodeURIComponent(code)}&origin=${encodeURIComponent(origin)}`, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        const contentType = candidateRes.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const parsed = await candidateRes.json();
          if (candidateRes.ok && parsed.user) {
            data = parsed;
          } else if (parsed.error) {
            throw new Error(parsed.error);
          }
        }
      } catch (fetchErr: any) {
        if (fetchErr.name === 'AbortError' || fetchErr.message === 'TIMEOUT') {
          throw new Error('TIMEOUT');
        }
        if (fetchErr.message && !fetchErr.message.includes('JSON')) {
          console.warn('/api/auth/exchange notice:', fetchErr.message);
        }
      }

      // 2. Fallback to /auth/callback with format=json if data not yet acquired
      if (!data) {
        try {
          const fallbackRes = await fetch(`/auth/callback?code=${encodeURIComponent(code)}&format=json&origin=${encodeURIComponent(origin)}`, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
          });
          const contentType = fallbackRes.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const parsed = await fallbackRes.json();
            if (fallbackRes.ok && parsed.user) {
              data = parsed;
            } else if (parsed.error) {
              throw new Error(parsed.error);
            }
          }
        } catch (fbErr: any) {
          if (fbErr.name === 'AbortError' || fbErr.message === 'TIMEOUT') {
            throw new Error('TIMEOUT');
          }
        }
      }

      clearTimeout(timeoutId);
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);

      if (!data || !data.user) {
        throw new Error(data?.error || '未能通过 Cloudflare 边缘服务端换取有效访问令牌，请确认环境变量配置并执行 Redeploy。');
      }

      setCallbackProgress(100);
      setCallbackStep('success');
      setCallbackStatusMsg('👑 授权成功！正在同步认证会话并进入中枢控制台...');

      const newAuth: AuthState = {
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      };

      // Brief delay so user sees the 100% success checkmark
      await new Promise((r) => setTimeout(r, 650));

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
      setCallbackStep('idle');
      setIsExchangingCode(false);
      setLoading(false);

    } catch (e: any) {
      clearTimeout(timeoutId);
      clearTimeout(pTimer1);
      clearTimeout(pTimer2);

      console.error('GitHub code exchange failed:', e);
      if (e.message === 'TIMEOUT' || e.name === 'AbortError') {
        setCallbackStep('timeout');
        setCallbackTimedOut(true);
        setCallbackStatusMsg('GitHub 授权换取令牌响应超时 (9秒)');
        setAuthError('GitHub 授权换取令牌响应超时。这通常是由于 Cloudflare Pages 环境变量未执行 Redeploy (重新部署) 生效，或授权 Code 已被消费。');
      } else {
        setCallbackStep('error');
        setCallbackStatusMsg('授权验证未完成');
        setAuthError(e.message || 'GitHub 授权凭据交换失败');
      }
      setIsExchangingCode(false);
      setLoading(false);
    }
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
      setCallbackStep('error');
      const cleanPath = window.location.pathname.includes('/auth/callback') ? '/' : window.location.pathname;
      window.history.replaceState({}, '', `${cleanPath}${window.location.hash}`);
      return;
    }

    if (!code) return;

    triggerExchange(code);
  }, [triggerExchange]);

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
    callbackStep,
    callbackProgress,
    callbackTimedOut,
    callbackStatusMsg,
    retryCallbackExchange,
    cancelCallbackAndRedirect,
    oauthStatus,
    loginWithOAuth,
    loginWithDemo,
    getOAuthAuthorizeUrl,
    resetAdminSeat,
    refreshOAuthStatus,
    logout,
  };
}
