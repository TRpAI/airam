import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  AlertCircle, 
  Crown, 
  Clock, 
  Download, 
  Sliders, 
  Terminal, 
  HelpCircle,
  Database,
  CloudLightning,
  CheckCircle2,
  Lock,
  Save
} from 'lucide-react';
import { GitHubUser, OAuthStatus } from '../types/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AdminSettingsViewProps {
  user: GitHubUser | null;
  oauthStatus: OAuthStatus | null;
  onRefreshOAuthStatus: () => Promise<OAuthStatus | null>;
  onResetAdmin: () => Promise<void>;
  onSaveCredentials: (clientId: string, clientSecret: string, token?: string) => void;
  onPurgeDemoData: () => void;
  knowledgeCount: number;
  projectsCount: number;
  reposCount: number;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  user,
  oauthStatus,
  onRefreshOAuthStatus,
  onResetAdmin,
  onSaveCredentials,
  onPurgeDemoData,
  knowledgeCount,
  projectsCount,
  reposCount,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Editable credentials state
  const [clientIdInput, setClientIdInput] = useState(() => {
    return localStorage.getItem('airam_client_id') || '';
  });
  const [clientSecretInput, setClientSecretInput] = useState(() => {
    return localStorage.getItem('airam_client_secret') || '';
  });
  const [tokenInput, setTokenInput] = useState(() => {
    return localStorage.getItem('airam_github_token') || '';
  });

  const { isInstallable, isInstalled, isInIframe, install, openInStandaloneWindow } = usePWAInstall();

  // Current domain & callback URLs
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://airam.pages.dev';
  const cloudflarePagesCallbackUrl = currentOrigin.includes('localhost') 
    ? 'https://airam.pages.dev/auth/callback' 
    : `${currentOrigin}/auth/callback`;
  const localDevCallbackUrl = 'http://localhost:3000/auth/callback';

  const isProduction = import.meta.env.PROD;
  const isPurged = localStorage.getItem('airam_demo_purged') === 'true' || isProduction;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveCredentials(clientIdInput.trim(), clientSecretInput.trim(), tokenInput.trim());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await onRefreshOAuthStatus();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs max-w-5xl mx-auto pb-12 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-emerald-500" />
            <h1 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
              系统与中枢设置 (Admin Control)
            </h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            仅限最高管理员访问 · 管理运行环境、GitHub OAuth 凭据、安全频率限制与数据资产
          </p>
        </div>

        <button
          onClick={handleRefreshStatus}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>刷新环境诊断</span>
        </button>
      </div>

      {/* SECTION 1: Credentials Diagnostic & Quick In-App Config */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              GitHub 认证与 OAuth 凭据状态
            </span>
          </div>

          {oauthStatus?.configured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              凭据已就绪 ({oauthStatus.clientId || 'Client ID Active'})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              待配置凭据 (环境变量)
            </span>
          )}
        </div>

        {/* Diagnostic Explanation Banner */}
        <div className="p-4 rounded-xl bg-sky-500/10 dark:bg-sky-950/20 border border-sky-500/30 space-y-2 text-[11px] leading-relaxed text-sky-900 dark:text-sky-200">
          <div className="font-bold text-sky-950 dark:text-sky-100 flex items-center gap-1.5 text-xs">
            <HelpCircle className="h-4 w-4 text-sky-500 shrink-0" />
            <span>问：GitHub 认证与 OAuth 凭据这些不是应该在 Cloudflare 平台设置的变量吗？</span>
          </div>
          <p>
            <strong>答：是的，完全正确！</strong> 凭据的标准规范就是在 Cloudflare 平台设置，无需把密钥打包进前端代码。
          </p>
          <div className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-sky-500/20 space-y-1.5 text-zinc-700 dark:text-zinc-300">
            <div><strong>为什么在 Cloudflare 配置了环境变量后，依然提示「待配置凭据」？</strong></div>
            <div>
              1. <strong>Cloudflare 生效机制（关键点）</strong>：Cloudflare Pages 在后台保存环境变量后，<strong>不会自动更新已发布的当前部署</strong>。
            </div>
            <div>
              2. <strong>必须操作</strong>：进入 Cloudflare Pages 控制台 → 点击 <strong>Deployments (部署)</strong> 选项卡 → 找到最新一条记录右侧的 <code>...</code> 菜单 → 点击 <strong>【Redeploy (重新部署)】</strong>，新的环境变量才会注入到运行实例中！
            </div>
            <div>
              3. <strong>变量名称核对</strong>：请确认变量名为 <code>GITHUB_CLIENT_ID</code> 与 <code>GITHUB_CLIENT_SECRET</code>（大写），且在 <strong>Production</strong> 环境中已勾选/添加。
            </div>
            <div>
              4. <strong>即时免等待通道</strong>：若您刚配置完不想等待 Cloudflare 重新部署构建，也可以直接在下方表单填入并保存，前端将秒级就绪！
            </div>
          </div>
        </div>

        {/* Callback URLs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
            <span className="text-zinc-500 text-[11px] block">Cloudflare 生产环境授权回调 (Pages):</span>
            <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] break-all">
              <code className="text-zinc-700 dark:text-zinc-300">{cloudflarePagesCallbackUrl}</code>
              <button
                onClick={() => copyToClipboard(cloudflarePagesCallbackUrl, 'cf-cb')}
                className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                title="复制"
              >
                {copiedKey === 'cf-cb' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
            <span className="text-zinc-500 text-[11px] block">本地开发环境授权回调 (Local Dev):</span>
            <div className="flex items-center justify-between gap-1 p-1.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] break-all">
              <code className="text-zinc-700 dark:text-zinc-300">{localDevCallbackUrl}</code>
              <button
                onClick={() => copyToClipboard(localDevCallbackUrl, 'dev-cb')}
                className="p-1 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                title="复制"
              >
                {copiedKey === 'dev-cb' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* In-App Direct Credentials Form */}
        <form onSubmit={handleSaveCredentials} className="pt-2 border-t border-zinc-100 dark:border-zinc-800/80 space-y-3">
          <div className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs flex items-center justify-between">
            <span>在线凭据配置表单 (即时注入生效)</span>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/settings/developers"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>创建 OAuth App</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://github.com/settings/tokens/new?scopes=read:user,repo"
                target="_blank"
                rel="noreferrer"
                className="text-blue-500 hover:underline flex items-center gap-1 text-[11px]"
              >
                <span>创建 PAT Token</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-zinc-500 block mb-1 text-[11px]">
                GITHUB_CLIENT_ID:
              </label>
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="例如: Ov23li..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-zinc-500 block mb-1 text-[11px]">
                GITHUB_CLIENT_SECRET:
              </label>
              <input
                type="password"
                value={clientSecretInput}
                onChange={(e) => setClientSecretInput(e.target.value)}
                placeholder="例如: 8f49b1..."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-zinc-500 block mb-1 text-[11px]">
              GITHUB_TOKEN (Personal Access Token · 可选，用于代码同步):
            </label>
            <input
              type="password"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-zinc-400">
              保存后自动同步至浏览器安全存储与中枢授权引擎。
            </span>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold hover:opacity-90 transition-all text-xs shadow-xs"
            >
              <Save className="h-3.5 w-3.5" />
              <span>保存配置</span>
            </button>
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              <span>凭据已成功保存！OAuth 与 Token 授权状态已同步激活。</span>
            </div>
          )}
        </form>
      </div>

      {/* SECTION 2: Production Clean Slate & Demo Data Cleaner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              生产环境纯净资产与演示数据管理
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">当前环境:</span>
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {isProduction ? 'Cloudflare 生产环境 (Production)' : '本地开发环境 (Development)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{knowledgeCount}</div>
            <div className="text-zinc-400 text-[11px]">知识手记总数</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{projectsCount}</div>
            <div className="text-zinc-400 text-[11px]">精选项目卡片</div>
          </div>
          <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-center">
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{reposCount}</div>
            <div className="text-zinc-400 text-[11px]">关联代码仓库</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-semibold text-zinc-900 dark:text-zinc-200 text-xs">
              {isPurged ? '✨ 生产环境纯净模式已生效' : '⚠️ 当前包含演示样例数据'}
            </div>
            <p className="text-zinc-400 text-[11px]">
              生产环境默认清空所有模拟数据。点击下方按钮可立即彻底擦除一切残留的示例笔记与演示提交。
            </p>
          </div>

          <button
            onClick={() => setPurgeConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 transition-colors font-medium text-xs shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>清空所有演示数据</span>
          </button>
        </div>

        {/* Purge Confirm Dialog */}
        {purgeConfirmOpen && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs space-y-2.5 animate-in fade-in">
            <div className="text-rose-700 dark:text-rose-300 font-bold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>确认彻底清空所有演示样例数据？</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
              该操作将清除包括示例 CloudPulse 监控笔记、Svelte/Tailwind 测试提交等全部演示记录，使中枢恢复纯净空白初始态。
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onPurgeDemoData();
                  setPurgeConfirmOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                确认彻底清空
              </button>
              <button
                onClick={() => setPurgeConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: Admin Authority & Seat Management */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              最高管理员席位与所有者
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-4 w-4" />
            <span>首位登入自动绑定机制激活</span>
          </span>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar_url || `https://github.com/${user?.login || 'admin'}.png`}
              alt={user?.login || 'Admin'}
              className="h-10 w-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-100"
            />
            <div>
              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>@{user?.login || '未登入'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-mono">
                  Owner Admin
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">
                具备全站完全管理控制、发布知识、审核提交与备份导出权限
              </div>
            </div>
          </div>

          <button
            onClick={() => setResetConfirmOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-xs"
          >
            <RefreshCw className="h-3 w-3" />
            <span>释放/重置席位</span>
          </button>
        </div>

        {resetConfirmOpen && (
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-2.5 animate-in fade-in">
            <div className="text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              <span>确认重置管理员席位？</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 text-[11px]">
              重置后当前会话将登出，系统将重新开放首位管理员席位。下一个登录 GitHub 的账号将自动成为新的系统最高管理员。
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await onResetAdmin();
                  setResetConfirmOpen(false);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700"
              >
                确认释放席位并登出
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: Rate Limiting Safeguards & Security */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              全站频率限制与安全防刷保护 (Rate Limiting)
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            活跃保护中
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>GitHub 登入接口流控</span>
              <span className="text-emerald-600 font-bold">5 次 / 分钟</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              针对 <code>/api/auth/url</code>、<code>/auth/callback</code> 与 Token 验证端点。超频自动触发 30-60 秒安全倒计时保护。
            </p>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center justify-between">
              <span>访客提交开源仓库流控</span>
              <span className="text-emerald-600 font-bold">2 次 / 10分钟</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              单 IP / 设备指纹 10 分钟最多提交 2 个仓库，单次提交最小间隔 20 秒，且重复地址严格去重拦截。
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 5: PWA Native App & Offline Cache */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              原生桌面/移动应用 (PWA) 与离线运行能力
            </span>
          </div>

          {isInstalled ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              已运行为独立原生窗口
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              Web 浏览器标签页运行中
            </span>
          )}
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>安装为独立 Native App</span>
              {isInIframe && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                  嵌入式 iframe 限制提示
                </span>
              )}
            </div>
            <p className="text-zinc-400 text-[11px]">
              支持在 Mac / Windows / Linux 独立运行，无需打开浏览器即可使用；支持移动端无白屏离线缓存。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInIframe ? (
              <button
                onClick={openInStandaloneWindow}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>在新标签页打开并安装</span>
              </button>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>一键安装到本机</span>
              </button>
            ) : (
              <div className="text-[11px] text-zinc-400">
                可通过浏览器地址栏 ⊕ 图标手动安装
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
