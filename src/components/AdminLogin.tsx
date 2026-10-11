import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Sparkles,
  ShieldCheck,
  Terminal,
  Loader2,
  Crown,
  Clock,
  AlertCircle
} from 'lucide-react';
import { OAuthStatus } from '../types/auth';

interface AdminLoginProps {
  onLoginOAuth: (forceDirectRedirect?: boolean) => Promise<{ success: boolean; error?: string }>;
  onLoginDemo: (username?: string) => Promise<void>;
  loading: boolean;
  oauthStatus: OAuthStatus | null;
  onReturnToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginOAuth,
  onLoginDemo,
  loading,
  oauthStatus,
  onReturnToPublic,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isWaitingOAuth, setIsWaitingOAuth] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);

  // Handle rate limit countdown
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => Math.max(0, prev - 1)), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const extractCooldown = (msg: string) => {
    const match = msg.match(/(\d+)\s*秒/);
    if (match && match[1]) {
      setCooldown(parseInt(match[1], 10));
    } else if (msg.includes('频繁') || msg.includes('429')) {
      setCooldown(30);
    }
  };

  // Direct GitHub OAuth authorization URL from Cloudflare environment
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://airam.pages.dev';
  const activeClientId = oauthStatus?.clientId || (import.meta as any).env?.VITE_GITHUB_CLIENT_ID || '';
  const isConfigured = Boolean(oauthStatus?.configured || activeClientId);

  const directOAuthUrl = activeClientId
    ? `https://github.com/login/oauth/authorize?client_id=${activeClientId}&redirect_uri=${encodeURIComponent(
        `${currentOrigin.replace(/\/$/, '')}/auth/callback`
      )}&response_type=code&scope=read%3Auser+user%3Aemail+repo&state=admin_login_${Date.now()}`
    : '';

  const handleOAuthClick = async (forceDirect = false) => {
    if (cooldown > 0) return;
    setError(null);

    if (!isConfigured) {
      setError('Cloudflare 环境变量 GITHUB_CLIENT_ID 尚未生效。请在 Cloudflare Pages 设置中确认环境变量并执行 Redeploy (重新部署)。');
      return;
    }

    setIsWaitingOAuth(true);
    try {
      const result = await onLoginOAuth(forceDirect);
      if (!result.success) {
        const errorMsg = result.error || '发起 GitHub 授权失败';
        setError(errorMsg);
        extractCooldown(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err?.message || '发起 GitHub 授权时发生错误';
      setError(errorMsg);
      extractCooldown(errorMsg);
    } finally {
      setIsWaitingOAuth(false);
    }
  };

  const handleDemoLogin = async () => {
    if (cooldown > 0) return;
    setError(null);
    try {
      await onLoginDemo('osahermes');
    } catch (err: any) {
      const errorMsg = err?.message || '演示登录失败';
      setError(errorMsg);
      extractCooldown(errorMsg);
    }
  };

  const hasRegisteredAdmin = Boolean(oauthStatus?.hasAdmin);
  const currentAdminUsername = oauthStatus?.adminUsername;

  return (
    <div className="min-h-[520px] flex items-center justify-center py-8 px-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md space-y-5">
        
        {/* Return Button */}
        <div>
          <button
            onClick={onReturnToPublic}
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>返回前台展示空间</span>
          </button>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-6 sm:p-7 shadow-sm space-y-6">
          
          {/* Header */}
          <div className="text-center space-y-2.5">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center shadow-md ring-4 ring-zinc-100 dark:ring-zinc-800/60">
              <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                GitHub 身份鉴权登入
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                单用户所有者安全边界 · GitHub OAuth 2.0 授权
              </p>
            </div>
          </div>

          {/* First Admin Claim Banner */}
          {!hasRegisteredAdmin ? (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/20 text-xs font-mono space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <Crown className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>首位管理员席位开放中</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed">
                当前系统尚未绑定所有者。<strong>第一个通过 GitHub 成功登入的用户将自动成为系统最高管理员 (Admin)</strong>，并永久享有中枢的管理写权限。
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>系统管理员已绑定</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  @{currentAdminUsername}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                管理员账号享有后台所有读写与部署权限；其他账号登入后为访客模式。
              </p>
            </div>
          )}

          {/* OAuth Status Indicator */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs space-y-2 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Cloudflare 环境变量:</span>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  已就绪 ({activeClientId ? `${activeClientId.substring(0, 6)}...` : 'Active'})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  待生效 (需 Redeploy 重新部署)
                </span>
              )}
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>授权链路:</span>
              <span className="text-zinc-600 dark:text-zinc-300">GitHub OAuth 2.0 (生产环境变量)</span>
            </div>
          </div>

          {/* Cloudflare Unconfigured Reminder */}
          {!isConfigured && (
            <div className="p-3 rounded-xl border border-amber-500/25 bg-amber-500/10 dark:bg-amber-950/20 text-xs space-y-1.5 font-mono text-amber-900 dark:text-amber-200 animate-in fade-in">
              <div className="flex items-center gap-1.5 font-semibold text-amber-950 dark:text-amber-100">
                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                <span>环境变量生效提醒</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                在 Cloudflare Pages 设置环境变量后，必须进入 <strong>Deployments (部署)</strong> 菜单点击最新记录的 <strong>Redeploy (重新部署)</strong>，变量才会注入到当前实例。
              </p>
            </div>
          )}

          {/* Primary OAuth Action Button */}
          <div className="space-y-3 font-mono">
            <button
              type="button"
              onClick={() => handleOAuthClick(false)}
              disabled={loading || isWaitingOAuth || cooldown > 0}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 text-xs shadow-sm min-h-[46px] cursor-pointer"
            >
              {cooldown > 0 ? (
                <>
                  <Clock className="h-4 w-4 animate-spin text-amber-500" />
                  <span>登录冷却保护中 ({cooldown}s)</span>
                </>
              ) : isWaitingOAuth ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>正在等待 GitHub 授权确认...</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                  </svg>
                  <span>
                    {!hasRegisteredAdmin ? '以 GitHub 授权并绑定为管理员' : '使用 GitHub 账号授权登录'}
                  </span>
                </>
              )}
            </button>

            {/* Direct Fallback Option if Popup Blocked */}
            {directOAuthUrl && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] px-1 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-500">
                <span>未弹出授权窗口？</span>
                <div className="flex items-center gap-2">
                  <a
                    href={directOAuthUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    title="在新标签页直接打开 GitHub 授权页面"
                  >
                    <span>新标签页直接打开</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <button
                    type="button"
                    onClick={() => handleOAuthClick(true)}
                    className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline cursor-pointer"
                    title="在当前窗口直接跳转授权（无需弹窗）"
                  >
                    整页跳转授权
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Development Demo Access (Only visible in development mode) */}
          {!import.meta.env.PROD && (
            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium text-xs transition-colors cursor-pointer font-mono"
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-500" />
                <span>开发环境：快捷以 @osahermes 体验</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">登入未完成:</span>
                <span className="leading-relaxed text-[11px]">{error}</span>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
