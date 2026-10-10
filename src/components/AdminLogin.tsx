import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Key, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  HelpCircle, 
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Loader2,
  Crown,
  UserCheck,
  Clock
} from 'lucide-react';
import { OAuthStatus } from '../types/auth';

interface AdminLoginProps {
  onLoginOAuth: () => Promise<{ success: boolean; error?: string }>;
  onLoginToken: (token: string) => Promise<void>;
  onLoginDemo: (username?: string) => Promise<void>;
  loading: boolean;
  oauthStatus: OAuthStatus | null;
  onReturnToPublic: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginOAuth,
  onLoginToken,
  onLoginDemo,
  loading,
  oauthStatus,
  onReturnToPublic,
}) => {
  const [activeTab, setActiveTab] = useState<'oauth' | 'token' | 'demo'>('oauth');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
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

  // Runtime environment callback URLs
  const devCallbackUrl = 'https://ais-dev-3mxtkhulzaehqb2oikaejm-231818182929.asia-east1.run.app/auth/callback';
  const sharedCallbackUrl = 'https://ais-pre-3mxtkhulzaehqb2oikaejm-231818182929.asia-east1.run.app/auth/callback';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOAuthClick = async () => {
    if (cooldown > 0) return;
    setError(null);
    setIsWaitingOAuth(true);
    try {
      const result = await onLoginOAuth();
      if (!result.success) {
        const errorMsg = result.error || '发起 GitHub 授权失败';
        setError(errorMsg);
        extractCooldown(errorMsg);
        if (result.error?.includes('未配置')) {
          setShowConfigGuide(true);
        }
      }
    } catch (err: any) {
      const errorMsg = err?.message || '发起 GitHub 授权时发生错误';
      setError(errorMsg);
      extractCooldown(errorMsg);
    } finally {
      setIsWaitingOAuth(false);
    }
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;
    if (!token.trim()) {
      setError('请输入 GitHub Personal Access Token');
      return;
    }
    setError(null);
    try {
      await onLoginToken(token.trim());
    } catch (err: any) {
      const errorMsg = err?.message || 'Token 验证失败，请确认权限包含 read:user';
      setError(errorMsg);
      extractCooldown(errorMsg);
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
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
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
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
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

          {/* Tab Selector */}
          <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/70 rounded-lg text-xs font-mono">
            <button
              onClick={() => { setActiveTab('oauth'); setError(null); }}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                activeTab === 'oauth'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              OAuth 授权登录
            </button>
            <button
              onClick={() => { setActiveTab('token'); setError(null); }}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                activeTab === 'token'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Token (PAT) 登入
            </button>
            <button
              onClick={() => { setActiveTab('demo'); setError(null); }}
              className={`flex-1 py-1.5 px-2 rounded-md font-medium transition-all ${
                activeTab === 'demo'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              演示体验
            </button>
          </div>

          {/* TAB 1: GitHub OAuth Flow */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              
              {/* OAuth Status Indicator */}
              <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">OAuth 服务状态:</span>
                  {oauthStatus?.configured ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      已就绪 ({oauthStatus.clientId})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      待配置凭据 (环境变量)
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                  <span>授权方式:</span>
                  <span className="text-zinc-600 dark:text-zinc-300">独立弹出窗口 (Popup Flow)</span>
                </div>
              </div>

              {/* Primary OAuth Action Button */}
              <button
                type="button"
                onClick={handleOAuthClick}
                disabled={loading || isWaitingOAuth || cooldown > 0}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 text-xs shadow-sm min-h-[46px]"
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

              {/* OAuth Setup Helper toggle */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfigGuide(!showConfigGuide)}
                  className="w-full flex items-center justify-between text-[11px] font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 py-1 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5" />
                    <span>查看 GitHub OAuth App 配置与回调 URL</span>
                  </span>
                  <span>{showConfigGuide ? '收起 ▲' : '展开 ▼'}</span>
                </button>

                {showConfigGuide && (
                  <div className="mt-2.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-zinc-900 dark:text-zinc-200 font-semibold text-[11px]">
                      <span>OAuth 配置指引</span>
                      <a
                        href="https://github.com/settings/developers"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-500 hover:underline flex items-center gap-1"
                      >
                        <span>GitHub Developers</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block mb-1">1. 开发回调地址 (Authorization callback URL):</span>
                        <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] break-all">
                          <code className="text-zinc-700 dark:text-zinc-300">{devCallbackUrl}</code>
                          <button
                            onClick={() => copyToClipboard(devCallbackUrl, 'dev')}
                            className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                            title="复制"
                          >
                            {copiedKey === 'dev' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-zinc-500 block mb-1">2. 部署回调地址 (Shared / Deployed URL):</span>
                        <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] break-all">
                          <code className="text-zinc-700 dark:text-zinc-300">{sharedCallbackUrl}</code>
                          <button
                            onClick={() => copyToClipboard(sharedCallbackUrl, 'shared')}
                            className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                            title="复制"
                          >
                            {copiedKey === 'shared' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] leading-relaxed">
                        在 AI Studio 环境变量或 <code>.env</code> 中添加：
                        <br />
                        <code>GITHUB_CLIENT_ID</code> &amp; <code>GITHUB_CLIENT_SECRET</code>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Personal Access Token (PAT) */}
          {activeTab === 'token' && (
            <form onSubmit={handleTokenSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="flex items-center justify-between text-zinc-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Key className="h-3.5 w-3.5" />
                    <span>Personal Access Token</span>
                  </span>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=read:user,repo"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5"
                  >
                    <span>新建 Token</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-zinc-500 min-h-[42px]"
                />
                <div className="text-[10px] text-zinc-400 mt-1">
                  需具备 <code>read:user</code> 权限，免 OAuth App 审核即开即用。
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 text-xs min-h-[44px]"
              >
                <Key className="h-3.5 w-3.5" />
                <span>
                  {loading ? '正在验证 Token...' : (!hasRegisteredAdmin ? '验证 Token 并绑定为管理员' : '验证 Token 并登入')}
                </span>
              </button>
            </form>
          )}

          {/* TAB 3: Quick Demo Access */}
          {activeTab === 'demo' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-2">
                <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>快捷演示账号</span>
                </div>
                <p className="text-[11px] text-zinc-500 leading-relaxed">
                  以 <code>@osahermes</code> 演示账号身份快捷载入后台，用于在无需绑定账号时即时体验知识库管理中枢。
                </p>
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 text-xs min-h-[44px]"
              >
                <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                <span>{loading ? '正在载入...' : '以 @osahermes 演示登入'}</span>
              </button>
            </div>
          )}

          {/* Rate Limit Active Cooldown Banner */}
          {cooldown > 0 && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-mono flex items-start gap-2 animate-in fade-in">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />
              <div className="space-y-0.5">
                <span className="font-semibold block">登录流控保护中</span>
                <span className="leading-relaxed text-[11px]">
                  操作过于频繁，系统已触发安全保护。请等待 <strong>{cooldown}</strong> 秒后再试。
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold block">登录异常</span>
                <span className="leading-relaxed">{error}</span>
              </div>
            </div>
          )}

          {/* Security Notice */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px] text-zinc-400 leading-relaxed text-center space-y-1">
            <div>前台展示空间面向访客公开浏览；后台仅管理员享有完全写权限。</div>
            <div className="text-[10px] text-zinc-500">⚡ 频率限制：GitHub 登入接口每分钟上限 5 次请求。</div>
          </div>
        </div>

      </div>
    </div>
  );
};
