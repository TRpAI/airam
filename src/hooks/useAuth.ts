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

          // 核心一致性校验：若服务端已锁定管理员席位，校验当前客户端登录账号是否与管理员一致
          // 若不一致，严格降级为访客角色 (visitor)，彻底防止跨浏览器/多账号越权
          if (data && data.hasAdmin && data.adminUsername) {
            setAuth((prev) => {
              if (prev.isAuthenticated && prev.user) {
                const isMatch = prev.user.login.toLowerCase() === data.adminUsername.toLowerCase();
                if (prev.user.isAdmin !== isMatch || prev.user.role !== (isMatch ? 'admin' : 'visitor')) {
                  const updated: AuthState = {
                    ...prev,
                    user: {
                      ...prev.user,
                      isAdmin: isMatch,
                      role: isMatch ? 'admin' : 'visitor',
                    },
                  };
                  try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
                  } catch {}
                  return updated;
                }
              }
              return prev;
            });
          }

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

      const newAuth: AuthState = {
        isAuthenticated: true,
        user: data.user,
        token: data.token,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
        localStorage.setItem('airam_oauth_notify', Date.now().toString());
      } catch {
        // ignore quota
      }

      // 检测当前是否处于弹出的授权窗口 (拥有 opener、窗口名称为 github_oauth_popup 或 state 包含 popup/admin_login)
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const stateParam = searchParams?.get('state') || '';
      const isPopup = typeof window !== 'undefined' && 
        (Boolean(window.opener) || 
         window.name === 'github_oauth_popup' || 
         stateParam.includes('popup') || 
         stateParam.includes('admin_login') ||
         localStorage.getItem('airam_oauth_mode') === 'popup' ||
         !stateParam.includes('direct'));

      if (isPopup) {
        setCallbackStatusMsg('✅ 授权成功！已同步凭据至原工作台窗口，正在关闭当前授权页...');

        // 1. 通过 BroadcastChannel 向原工作台广播
        try {
          const bc = new BroadcastChannel('airam_oauth_auth_channel');
          bc.postMessage({
            type: 'OAUTH_AUTH_SUCCESS',
            user: data.user,
            token: data.token,
            shouldRefresh: true
          });
          setTimeout(() => bc.close(), 1000);
        } catch {}

        // 2. 尝试向 window.opener postMessage
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              user: data.user,
              token: data.token,
              shouldRefresh: true
            }, '*');
            try { window.opener.focus(); } catch {}
          } catch {}
        }

        // 3. 授权完毕后立即关闭当前页！绝不留在弹出的授权页刷新到站点后台！
        try { window.close(); } catch {}
        setTimeout(() => { try { window.close(); } catch {} }, 250);
        setTimeout(() => { try { window.close(); } catch {} }, 800);
        return;
      }

      // 非弹窗模式 (单标签页跳转)：在当前窗口正常更新状态并进入管理后台
      setCallbackStatusMsg('👑 授权成功！正在载入管理工作台...');
      await new Promise((r) => setTimeout(r, 650));
      setAuth(newAuth);

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
      const isPopup = typeof window !== 'undefined' && 
        (Boolean(window.opener) || window.name === 'github_oauth_popup');

      if (isPopup) {
        try {
          const bc = new BroadcastChannel('airam_oauth_auth_channel');
          bc.postMessage({
            type: 'OAUTH_AUTH_ERROR',
            error: e.message || 'GitHub 授权凭据交换失败',
          });
          setTimeout(() => bc.close(), 1000);
        } catch {}
        if (window.opener && !window.opener.closed) {
          try {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_ERROR',
              error: e.message || 'GitHub 授权凭据交换失败',
            }, '*');
          } catch {}
        }
      }

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

  // 全方位跨窗口监听：同时支持 BroadcastChannel、postMessage 和 localStorage 存储事件
  // 当弹窗授权成功并关闭后，原页面立即无缝刷新认证状态并进入中枢控制台
  useEffect(() => {
    const handleAuthSuccess = (userData: any, userToken?: string) => {
      if (!userData) return;
      const newAuth: AuthState = {
        isAuthenticated: true,
        user: userData,
        token: userToken,
      };
      setAuth(newAuth);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
      } catch {}
      setLoading(false);
      setIsExchangingCode(false);
      setCallbackStep('idle');
      refreshOAuthStatus();

      // 授权成功后：关闭弹窗，根据角色导航并刷新原页面！
      if (typeof window !== 'undefined') {
        const targetHash = userData.isAdmin ? '#/admin/dashboard' : '#/user/dashboard';
        window.location.hash = targetHash;
        // 刷新原页面以激活全新管理员/访客会话与工作台数据
        setTimeout(() => {
          window.location.reload();
        }, 150);
      }
    };

    // 1. BroadcastChannel 监听 (最稳定跨标签/跨弹窗通信)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('airam_oauth_auth_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
          handleAuthSuccess(event.data.user, event.data.token);
        } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
          setAuthError(event.data.error || '授权失败');
          setLoading(false);
        }
      };
    } catch {}

    // 2. postMessage 监听
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (
        !origin.includes('pages.dev') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1') &&
        origin !== window.location.origin
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        handleAuthSuccess(event.data.user, event.data.token);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setAuthError(event.data.error || '授权失败');
        setLoading(false);
      }
    };

    // 3. Storage 事件监听 (同域名跨标签页/跨窗口持久同步)
    const handleStorage = (event: StorageEvent) => {
      if ((event.key === STORAGE_KEY || event.key === 'airam_oauth_notify') && event.newValue) {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.isAuthenticated && parsed?.user) {
              handleAuthSuccess(parsed.user, parsed.token);
            }
          }
        } catch {}
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) {
        try { bc.close(); } catch {}
      }
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshOAuthStatus]);

  // Helper to build direct GitHub OAuth authorize URL synchronously
  const getOAuthAuthorizeUrl = useCallback((mode: 'popup' | 'direct' = 'popup'): string => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;
    const clientId = 
      oauthStatus?.clientId || 
      (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || 
      '';

    if (!clientId) return '';

    try {
      localStorage.setItem('airam_oauth_mode', mode);
    } catch {}

    const randomStr = Math.random().toString(36).substring(2, 8);
    const state = `${mode}_admin_login_${Date.now()}_${randomStr}`;
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
      const mode = forceDirectRedirect ? 'direct' : 'popup';
      const authUrl = getOAuthAuthorizeUrl(mode);

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

      // 3. 实时轮询弹窗状态：当弹窗授权成功自动关闭后，原页面立即刷新并同步会话进入中枢
      if (authWindow) {
        const checkTimer = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkTimer);
            setLoading(false);
            try {
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed?.isAuthenticated && parsed?.user) {
                  setAuth(parsed);
                  refreshOAuthStatus();
                  if (typeof window !== 'undefined') {
                    const targetHash = parsed.user.isAdmin ? '#/admin/dashboard' : '#/user/dashboard';
                    window.location.hash = targetHash;
                    setTimeout(() => {
                      window.location.reload();
                    }, 150);
                  }
                }
              }
            } catch {}
          }
        }, 350);
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
