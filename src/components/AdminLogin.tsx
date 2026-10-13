import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  Loader2, 
  Crown, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  AlertTriangle,
  Info
} from 'lucide-react';
import { OAuthStatus } from '../types/auth';

interface AdminLoginProps {
  onLoginOAuth: (forceDirectRedirect?: boolean) => Promise<{ success: boolean; error?: string }>;
  onLoginDemo: (username?: string) => Promise<void>;
  loading: boolean;
  oauthStatus: OAuthStatus | null;
  onReturnToPublic: () => void;
  authError?: string | null;
  isExchangingCode?: boolean;
  callbackStep?: 'idle' | 'verifying' | 'success' | 'timeout' | 'error';
  callbackProgress?: number;
  callbackTimedOut?: boolean;
  callbackStatusMsg?: string;
  onRetryCallback?: () => void;
  onCancelCallback?: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginOAuth,
  onLoginDemo,
  loading,
  oauthStatus,
  onReturnToPublic,
  authError,
  isExchangingCode = false,
  callbackStep = 'idle',
  callbackProgress = 0,
  callbackTimedOut = false,
  callbackStatusMsg,
  onRetryCallback,
  onCancelCallback,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isWaitingOAuth, setIsWaitingOAuth] = useState(false);
  const [cooldown, setCooldown] = useState<number>(0);
  const [timeoutCountdown, setTimeoutCountdown] = useState<number>(8);

  // Detect whether we are currently on an OAuth callback landing URL
  const isUrlCallback = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).has('code') || window.location.pathname.includes('/auth/callback'));
  const isHandlingCallback = isExchangingCode || (callbackStep !== 'idle') || isUrlCallback;

  // Sync incoming authError
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Timeout countdown ticker for automatic redirection
  useEffect(() => {
    if (callbackStep === 'timeout' || callbackTimedOut) {
      setTimeoutCountdown(8);
      const timer = setInterval(() => {
        setTimeoutCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-redirect when countdown expires
            if (onCancelCallback) {
              onCancelCallback();
            } else if (onReturnToPublic) {
              onReturnToPublic();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [callbackStep, callbackTimedOut, onCancelCallback, onReturnToPublic]);

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
      )}&response_type=code&scope=read%3Auser+user%3Aemail+repo&state=popup_admin_login_${Date.now()}`
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

  // =========================================================================
  // VIEW 1: Dedicated OAuth Callback Processing & Timeout Screen
  // =========================================================================
  if (isHandlingCallback) {
    const isTimeout = callbackStep === 'timeout' || callbackTimedOut;
    const isError = (callbackStep === 'error' || Boolean(authError || error)) && !isTimeout;
    const isSuccess = callbackStep === 'success';
    const isVerifying = !isTimeout && !isError && !isSuccess;

    return (
      <div className="min-h-[540px] flex items-center justify-center py-8 px-4 animate-in fade-in duration-200">
        <div className="w-full max-w-lg space-y-4 font-mono">
          
          {/* Top Return Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={onCancelCallback || onReturnToPublic}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer group"
            >
              <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>返回前台展示空间</span>
            </button>

            {isVerifying && (
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-500/80" />
                <span>9秒安全超时防护中</span>
              </span>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-6 sm:p-8 shadow-sm space-y-6">

            {/* 1.1 Verifying / In-Progress State */}
            {isVerifying && (
              <div className="space-y-6 text-center animate-in fade-in">
                {/* Visual Icon with Pulse Effect */}
                <div className="relative mx-auto h-20 w-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 animate-ping opacity-30" />
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 blur-sm" />
                  <div className="relative h-16 w-16 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-800 flex items-center justify-center border border-zinc-700/60 shadow-md">
                    <Loader2 className="absolute inset-0 m-auto h-16 w-16 text-emerald-500 animate-spin stroke-[1.5]" />
                    <svg className="h-7 w-7 fill-current text-white relative z-10" viewBox="0 0 24 24">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                    </svg>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2">
                    <span>正在处理 GitHub 授权回调</span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed px-2">
                    {callbackStatusMsg || '已接收 GitHub 回调授权码，正在与 Cloudflare 边缘服务端通信换取 Access Token...'}
                  </p>
                </div>

                {/* Live Progress Bar */}
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-500" />
                      <span>边缘服务端凭证交换进度</span>
                    </span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.max(25, callbackProgress)}%
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(25, callbackProgress)}%` }}
                    />
                  </div>
                </div>

                {/* Progress Checklist */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs text-left space-y-2.5">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>① 成功接收 GitHub 授权码 (Code: 已获取)</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-semibold">
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-500" />
                    <span>② Cloudflare 边缘服务端安全换取 Access Token</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <div className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[9px]">3</div>
                    <span>③ 识别权限边界并激活对应角色工作台</span>
                  </div>
                </div>

                {/* Explanatory Callout: Why did GitHub skip the authorization page? */}
                <div className="p-3.5 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 text-xs text-left space-y-1.5 text-zinc-700 dark:text-zinc-300">
                  <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    <span>关于 GitHub 未弹出授权确认页说明</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    若您的 GitHub 账号此前已对本应用进行过授权确认，GitHub 官方 OAuth 协议会<strong>自动跳过授权确认界面</strong>，直接携 Code 凭证返回此页面。这是预期的安全免重复确认行为，无需担心。
                  </p>
                </div>

                {/* Cancel Action */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={onCancelCallback || onReturnToPublic}
                    className="text-[11px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 underline cursor-pointer"
                  >
                    耗时过长？取消本次验证并返回
                  </button>
                </div>
              </div>
            )}

            {/* 1.2 Success State */}
            {isSuccess && (
              <div className="text-center space-y-4 py-4 animate-in zoom-in-95">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    ✅ GitHub 授权已完成
                  </h2>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    已成功同步凭据至原工作台窗口，正在关闭当前授权页...
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-emerald-500/20 overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full animate-pulse rounded-full" />
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => window.close()}
                    className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white font-semibold text-xs cursor-pointer hover:bg-emerald-500 shadow-sm"
                  >
                    立即关闭此页面返回工作台
                  </button>
                </div>
              </div>
            )}

            {/* 1.3 Timeout State */}
            {isTimeout && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/30">
                    <Clock className="h-7 w-7" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    GitHub 授权响应超时 (9秒)
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    边缘服务端未能及时完成 Access Token 交换
                  </p>
                </div>

                {/* Countdown Auto-Redirect Notice */}
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2 text-amber-900 dark:text-amber-200">
                  <div className="font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                      <span>自动重定向倒计时保护</span>
                    </span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {timeoutCountdown}s 后自动返回
                    </span>
                  </div>
                  
                  {/* Countdown meter */}
                  <div className="h-1.5 w-full rounded-full bg-amber-500/20 overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-1000 rounded-full"
                      style={{ width: `${Math.max(0, (timeoutCountdown / 8) * 100)}%` }}
                    />
                  </div>

                  <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400 pt-1">
                    系统将在倒计时结束后自动为您清除失效的回调参数并安全返回主页。您也可以点击下方按钮立即返回或重新尝试授权。
                  </p>
                </div>

                {/* Troubleshooting advice */}
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-[11px] space-y-2 text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                    <span>排查建议：</span>
                  </div>
                  <p>
                    1. <strong>Cloudflare 环境变量未生效</strong>：若您刚刚在 Cloudflare Pages 设置了 <code>GITHUB_CLIENT_ID</code> 与 <code>GITHUB_CLIENT_SECRET</code>，请进入 <strong>Deployments</strong> 点击右侧 <strong>Redeploy (重新部署)</strong> 激活生效。<br/>
                    2. <strong>授权码失效</strong>：GitHub 授权码为一次性凭证，若网络超时该 Code 将作废，需重新点击登录生成新 Code。
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={onRetryCallback || (() => handleOAuthClick(false))}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重新发起 GitHub 授权</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancelCallback || onReturnToPublic}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span>立即返回前台空间 ({timeoutCountdown}s)</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1.4 Error State */}
            {isError && (
              <div className="space-y-5 animate-in fade-in">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/30">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                    GitHub 授权验证未完成
                  </h2>
                  <p className="text-xs text-rose-600 dark:text-rose-400">
                    {error || authError || '未能成功获取 GitHub 授权'}
                  </p>
                </div>

                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onRetryCallback || (() => handleOAuthClick(false))}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold text-xs hover:opacity-90 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>重新发起 GitHub 授权</span>
                  </button>

                  <button
                    type="button"
                    onClick={onCancelCallback || onReturnToPublic}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    <span>返回前台展示空间</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: Standard Login Gate (When not handling callback)
  // =========================================================================

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

          {/* Multi-user Permission Boundary & Admin Info Banner */}
          {hasRegisteredAdmin ? (
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 text-xs font-mono space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Cloudflare 管理员名单</span>
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  @{currentAdminUsername}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                名单中用户登入享有中枢管理权限；其他 GitHub 账号自动进入访客开发者后台。
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 text-xs font-mono space-y-1 text-zinc-600 dark:text-zinc-300">
              <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                <span>多用户架构与权限边界</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                任何 GitHub 账号均可登入使用访客工作台（提交项目、发表评论）。若需中枢管理员权限，请在 Cloudflare Pages 设置 <code>ADMIN_USER</code> 变量。
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
                    使用 GitHub 账号授权登录 (访客 / 管理员)
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
                    rel="opener"
                    onClick={() => {
                      try {
                        localStorage.setItem('airam_oauth_mode', 'popup');
                      } catch {}
                    }}
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                    title="在新标签页直接打开 GitHub 授权页面"
                  >
                    <span>新标签页打开</span>
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
