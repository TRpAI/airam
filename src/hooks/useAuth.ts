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
  const [oauthStatus, setOauthStatus] = useState<OAuthStatus | null>(null);

  // Check OAuth and Admin System status on load
  const refreshOAuthStatus = useCallback(async () => {
    // Read local/build environment variables as client-side fallback
    const localClientId = 
      localStorage.getItem('airam_client_id') || 
      (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || 
      '';
    const localClientSecret = 
      localStorage.getItem('airam_client_secret') || 
      (import.meta as any).env?.VITE_GITHUB_CLIENT_SECRET || 
      '';

    try {
      const origin = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/auth/status?origin=${origin}`);
      if (res.ok) {
        const text = await res.text();
        try {
          const data = JSON.parse(text);
          // If server reported not configured, but client has credentials, enhance status
          if (!data.configured && localClientId) {
            data.configured = true;
            data.hasClientId = true;
            data.hasClientSecret = Boolean(localClientSecret || data.hasClientSecret);
            data.clientId = `${localClientId.substring(0, 6)}...`;
          }
          setOauthStatus(data);
          return data as OAuthStatus;
        } catch {
          // Response was HTML (e.g. SPA fallback on Pages before functions build)
          console.warn('Backend API returned non-JSON, using client-side fallback');
        }
      }
    } catch (err) {
      console.warn('获取 OAuth 配置状态失败:', err);
    }

    // Client-side fallback status when running purely on client or static Pages
    if (localClientId) {
      const fallbackStatus: OAuthStatus = {
        configured: true,
        hasClientId: true,
        hasClientSecret: Boolean(localClientSecret),
        clientId: `${localClientId.substring(0, 6)}...`,
        redirectUri: `${window.location.origin}/auth/callback`,
        hasAdmin: Boolean(auth.user?.isAdmin),
        adminUsername: auth.user?.login || null,
        adminUser: auth.user ? {
          login: auth.user.login,
          name: auth.user.name,
          avatar_url: auth.user.avatar_url,
          claimedAt: auth.user.claimedAt || new Date().toISOString()
        } : null,
      };
      setOauthStatus(fallbackStatus);
      return fallbackStatus;
    }

    return null;
  }, [auth.user]);

  useEffect(() => {
    refreshOAuthStatus();
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
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refreshOAuthStatus]);

  // 1. Primary: Login via GitHub OAuth Popup
  const loginWithOAuth = async (): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      const origin = encodeURIComponent(window.location.origin);
      let authUrl = '';
      let clientId = '';

      try {
        const res = await fetch(`/api/auth/url?origin=${origin}`);
        if (res.ok) {
          const text = await res.text();
          const data = JSON.parse(text);
          if (data.url && data.configured) {
            authUrl = data.url;
            clientId = data.clientId;
          }
        }
      } catch {
        // Fallback to client-side OAuth URL generation
      }

      // If server didn't generate URL, check client credentials
      if (!authUrl) {
        const localClientId = 
          localStorage.getItem('airam_client_id') || 
          (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || 
          '';

        if (localClientId) {
          const redirectUri = `${window.location.origin}/auth/callback`;
          const state = Math.random().toString(36).substring(2, 15);
          const params = new URLSearchParams({
            client_id: localClientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: 'read:user user:email repo',
            state,
          });
          authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
        }
      }

      if (!authUrl) {
        setLoading(false);
        return {
          success: false,
          error: '系统尚未配置 GITHUB_CLIENT_ID。请在 Cloudflare 环境变量中添加，或在管理员设置中直接配置凭据。',
        };
      }

      // Open OAuth provider popup directly
      const width = 600;
      const height = 740;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        authUrl,
        'github_oauth_popup',
        `width=${width},height=${height},top=${top},left=${left},status=no,menubar=no,toolbar=no`
      );

      if (!authWindow) {
        setLoading(false);
        return {
          success: false,
          error: '浏览器拦截了授权弹窗，请允许当前页面的弹出式窗口后重试。',
        };
      }

      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return {
        success: false,
        error: err.message || '发起 GitHub 授权失败',
      };
    }
  };

  // 2. Secondary: Login via GitHub Personal Access Token (PAT)
  const loginWithToken = async (token: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        const newAuth: AuthState = {
          isAuthenticated: true,
          user: data.user,
          token: token.trim(),
        };

        setAuth(newAuth);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
        refreshOAuthStatus();
        return;
      }

      // Client direct verification fallback if backend endpoint was unavailable
      const ghRes = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!ghRes.ok) {
        throw new Error('GitHub Token 验证失败，请确认权限包含 read:user');
      }

      const ghUser = await ghRes.json();
      const newAuth: AuthState = {
        isAuthenticated: true,
        user: {
          id: ghUser.id,
          login: ghUser.login,
          name: ghUser.name || ghUser.login,
          avatar_url: ghUser.avatar_url,
          html_url: ghUser.html_url,
          role: 'admin',
          isAdmin: true,
          isFirstAdminClaim: true,
        },
        token: token.trim(),
      };

      setAuth(newAuth);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAuth));
      refreshOAuthStatus();
    } finally {
      setLoading(false);
    }
  };

  // 3. Demo Login (Only enabled in development mode, disabled in production)
  const loginWithDemo = async (username = 'osahermes') => {
    // If in production mode, block demo login
    if (import.meta.env.PROD) {
      throw new Error('生产环境已全面移除演示模式，请使用 GitHub OAuth 或 Token 登录。');
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

  // 4. Reset Admin Authority (Seat release)
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

  // Save credentials configured in Admin Settings
  const saveCustomCredentials = (clientId: string, clientSecret: string, token?: string) => {
    if (clientId) localStorage.setItem('airam_client_id', clientId.trim());
    if (clientSecret) localStorage.setItem('airam_client_secret', clientSecret.trim());
    if (token) localStorage.setItem('airam_github_token', token.trim());
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
    oauthStatus,
    loginWithOAuth,
    loginWithToken,
    loginWithDemo,
    resetAdminSeat,
    saveCustomCredentials,
    refreshOAuthStatus,
    logout,
  };
}
