import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  Crown, 
  Clock, 
  Download, 
  Sliders, 
  Database,
  CloudLightning
} from 'lucide-react';
import { GitHubUser, OAuthStatus } from '../types/auth';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AdminSettingsViewProps {
  user: GitHubUser | null;
  oauthStatus: OAuthStatus | null;
  onRefreshOAuthStatus: () => Promise<OAuthStatus | null>;
  onResetAdmin: () => Promise<void>;
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
  onPurgeDemoData,
  knowledgeCount,
  projectsCount,
  reposCount,
}) => {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [purgeConfirmOpen, setPurgeConfirmOpen] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { isInstalled, install } = usePWAInstall();

  const isProduction = import.meta.env.PROD;
  const isPurged = localStorage.getItem('airam_demo_purged') === 'true' || (knowledgeCount === 0 && projectsCount === 0 && reposCount === 0);

  const handleRefreshStatus = async () => {
    setRefreshing(true);
    try {
      await onRefreshOAuthStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const handleConfirmPurge = async () => {
    onPurgeDemoData();
    setPurgeConfirmOpen(false);
    setPurgeSuccess(true);
    setTimeout(() => setPurgeSuccess(false), 4000);
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
            仅限最高管理员访问 · 管理运行环境、Cloudflare 环境变量诊断、安全频率限制与数据资产
          </p>
        </div>

        <button
          onClick={handleRefreshStatus}
          disabled={refreshing}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
          <span>刷新环境诊断</span>
        </button>
      </div>

      {/* SECTION 1: Cloudflare Environment Variables Diagnostic */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <CloudLightning className="h-4 w-4 text-emerald-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
              GitHub 云端环境变量状态 (Cloudflare Pages)
            </span>
          </div>

          {oauthStatus?.configured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              生产环境变量已就绪
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              等待 Cloudflare 变量注入
            </span>
          )}
        </div>

        {/* Security & Variable Policy Note */}
        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-300 space-y-1.5">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-emerald-500" />
            <span>生产环境零信任密钥安全规范</span>
          </div>
          <p>
            GitHub 凭据已由 Cloudflare Pages 环境变量全局管理。系统严格遵循生产安全基线：<strong>所有 Token 与 Secret 均通过 Cloudflare 平台环境变量读取</strong>，已彻底移除前端本地明文存储与个人 Token (PAT) 登入方式，确保密钥永不泄漏。
          </p>
        </div>

        {/* 3 Cloudflare Environment Variables Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* GITHUB_CLIENT_ID */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">GITHUB_CLIENT_ID</span>
              {oauthStatus?.hasClientId ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                  已读取
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-semibold">
                  未配置
                </span>
              )}
            </div>
            <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 text-[11px] truncate">
              {oauthStatus?.clientId ? `${oauthStatus.clientId.substring(0, 6)}...` : '未读取到'}
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Cloudflare 生产环境变量，用于发起 GitHub OAuth 2.0 用户授权
            </p>
          </div>

          {/* GITHUB_CLIENT_SECRET */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">GITHUB_CLIENT_SECRET</span>
              {oauthStatus?.hasClientSecret ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                  已保护
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 font-semibold">
                  未配置
                </span>
              )}
            </div>
            <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 text-[11px]">
              {oauthStatus?.hasClientSecret ? '••••••••••••••••' : '未读取到'}
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Cloudflare 服务端加密存储，用于换取 Access Token，前端不落地
            </p>
          </div>

          {/* GITHUB_TOKEN */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">GITHUB_TOKEN</span>
              {oauthStatus?.hasToken ? (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                  已就绪
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-500 font-semibold">
                  按需读取
                </span>
              )}
            </div>
            <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 font-mono text-zinc-800 dark:text-zinc-200 text-[11px]">
              {oauthStatus?.hasToken ? '••••••••••••••••' : 'Cloudflare 注入'}
            </div>
            <p className="text-[10px] text-zinc-400 leading-tight">
              Cloudflare 环境变量，用于 GitHub API 仓库同步与高频接口免限流
            </p>
          </div>
        </div>

        {/* Cloudflare Redeploy Help Note */}
        {!oauthStatus?.configured && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-[11px] flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Cloudflare 环境变量生效提示：</span>
              <p>
                在 Cloudflare Pages 设置中保存环境变量后，请务必前往 <strong>Deployments (部署)</strong> 选项卡，在最新部署右侧点击 <strong>Redeploy (重新部署)</strong>，以将环境变量注入当前运行实例。
              </p>
            </div>
          </div>
        )}
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
                onClick={handleConfirmPurge}
                className="px-3 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 cursor-pointer"
              >
                确认彻底清空
              </button>
              <button
                onClick={() => setPurgeConfirmOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs cursor-pointer"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Purge Success Banner */}
        {purgeSuccess && (
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>已成功彻底清空所有演示数据！中枢已重置为纯净状态。</span>
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
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-xs shrink-0"
          >
            <RefreshCw className="h-3 w-3" />
            <span>释放/重置席位</span>
          </button>
        </div>

        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-700 dark:text-zinc-200 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>全边缘多端持久锁定机制已生效</span>
          </div>
          <p className="leading-relaxed">
            系统已启用 Cloudflare Zone Cache、KV/D1 及全局边缘 Key-Value 同步，确保跨浏览器、跨设备登录时均严格锁定首位管理员，其他 GitHub 账号只能以访客登录。
            若需物理级硬性锁定管理员账号，可在 Cloudflare Pages 设置环境变量 <code>ADMIN_USER={user?.login || '您的GitHub账号'}</code>。
          </p>
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
              针对 <code>/api/auth/url</code> 与 <code>/auth/callback</code> 鉴权端点。超频自动触发 30-60 秒安全倒计时保护。
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
            </div>
            <p className="text-zinc-400 text-[11px]">
              支持在 Mac / Windows / Linux 独立运行，无需打开浏览器即可使用；支持移动端无白屏离线缓存。
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors text-xs cursor-pointer shadow-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>直接安装 Native App</span>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
