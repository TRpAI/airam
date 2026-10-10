import React, { useState } from 'react';
import { 
  RefreshCw, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  Play,
  KeyRound
} from 'lucide-react';
import { GitHubRepository, SyncLog } from '../types';
import { fetchPublicGitHubRepo, computeHmacSignature } from '../services/githubService';

interface GitHubSyncViewProps {
  repos: GitHubRepository[];
  syncLogs: SyncLog[];
  onAddRepo: (repo: GitHubRepository, autoCard?: boolean) => void;
  onSyncRepo: (repoId: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  isSyncing: boolean;
}

export const GitHubSyncView: React.FC<GitHubSyncViewProps> = ({
  repos,
  syncLogs,
  onAddRepo,
  onSyncRepo,
  onSyncAll,
  isSyncing,
}) => {
  const [newRepoInput, setNewRepoInput] = useState('');
  const [personalToken, setPersonalToken] = useState('');
  const [isFetchingNew, setIsFetchingNew] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchSuccessMsg, setFetchSuccessMsg] = useState<string | null>(null);

  // Webhook 仿真器
  const [webhookSecret, setWebhookSecret] = useState('dev_edge_webhook_secret_key');
  const [webhookEventType, setWebhookEventType] = useState<'push' | 'release'>('push');
  const [simulatedRepo, setSimulatedRepo] = useState(repos[0]?.full_name || 'developer/personal-dev-knowledge-os');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationTrace, setSimulationTrace] = useState<{
    signatureHeader: string;
    verified: boolean;
    durationMs: number;
  } | null>(null);

  const handleFetchAndAdd = async () => {
    if (!newRepoInput.trim()) return;
    const parts = newRepoInput.trim().split('/');
    if (parts.length !== 2) {
      setFetchError('请输入规范格式：owner/repo (如 honojs/hono 或 cloudflare/workerd)');
      return;
    }

    setIsFetchingNew(true);
    setFetchError(null);
    setFetchSuccessMsg(null);

    try {
      const { repo } = await fetchPublicGitHubRepo(parts[0], parts[1], personalToken || undefined);
      onAddRepo(repo, true);
      setFetchSuccessMsg(`已纳管 ${repo.full_name}，自动同步 README 并生成项目卡片。`);
      setNewRepoInput('');
    } catch (err: any) {
      setFetchError(err.message || '获取仓库失败');
    } finally {
      setIsFetchingNew(false);
    }
  };

  const handleRunWebhookSimulation = async () => {
    setIsSimulating(true);
    setSimulationTrace(null);

    const now = new Date();
    const payload = JSON.stringify({
      ref: 'refs/heads/main',
      repository: {
        full_name: simulatedRepo,
        pushed_at: now.toISOString(),
      },
    });

    const hexHash = await computeHmacSignature(payload, webhookSecret);
    const signatureHeader = `sha256=${hexHash}`;

    setTimeout(() => {
      setSimulationTrace({
        signatureHeader,
        verified: true,
        durationMs: 96,
      });
      setIsSimulating(false);
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            GitHub 自动化资产同步
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Webhook 实时触发 (HMAC-SHA256 强验签) + 定时 Cron 增量兜底比对
          </p>
        </div>

        <button
          onClick={onSyncAll}
          disabled={isSyncing}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-mono font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 min-h-[38px]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? '比对中...' : '增量同步全部'}</span>
        </button>
      </div>

      {/* Grid: Add Repo & Webhook Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left: Add Repo */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              纳管新 GitHub 仓库
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">REST API</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="flex gap-2">
              <input
                type="text"
                value={newRepoInput}
                onChange={(e) => setNewRepoInput(e.target.value)}
                placeholder="例如: honojs/hono"
                className="flex-1 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 text-sm sm:text-xs focus:outline-none focus:border-zinc-500 min-h-[40px]"
              />
              <button
                onClick={handleFetchAndAdd}
                disabled={isFetchingNew || !newRepoInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs font-medium hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 shrink-0 min-h-[40px]"
              >
                {isFetchingNew ? '拉取中' : '纳管'}
              </button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 flex-wrap">
              <span>快速体验:</span>
              {['honojs/hono', 'cloudflare/workerd', 'shadcn-ui/ui'].map((name) => (
                <button
                  key={name}
                  onClick={() => setNewRepoInput(name)}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 underline underline-offset-2"
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Optional Token */}
            <div>
              <input
                type="password"
                value={personalToken}
                onChange={(e) => setPersonalToken(e.target.value)}
                placeholder="可选: GitHub Personal Access Token (访问私有库或免限流)"
                className="w-full px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-700 dark:text-zinc-300 text-[11px] focus:outline-none focus:border-zinc-500"
              />
            </div>

            {fetchError && (
              <div className="p-2 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{fetchError}</span>
              </div>
            )}

            {fetchSuccessMsg && (
              <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{fetchSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Webhook Tester */}
        <div className="p-4 sm:p-5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              Webhook 验签仿真台
            </h3>
            <span className="text-[11px] font-mono text-zinc-400">HMAC-SHA256</span>
          </div>

          <div className="space-y-2.5 font-mono text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-zinc-500 text-[11px] mb-1">事件</label>
                <select
                  value={webhookEventType}
                  onChange={(e) => setWebhookEventType(e.target.value as any)}
                  className="w-full px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                >
                  <option value="push">git push</option>
                  <option value="release">release</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 text-[11px] mb-1">目标仓库</label>
                <select
                  value={simulatedRepo}
                  onChange={(e) => setSimulatedRepo(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none truncate"
                >
                  {repos.map((r) => (
                    <option key={r.id} value={r.full_name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 text-[11px] mb-1">Webhook Secret</label>
              <input
                type="text"
                value={webhookSecret}
                onChange={(e) => setWebhookSecret(e.target.value)}
                className="w-full px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>

            <button
              onClick={handleRunWebhookSimulation}
              disabled={isSimulating}
              className="w-full py-1.5 rounded border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium transition-colors disabled:opacity-50"
            >
              {isSimulating ? '验签比对中...' : '发送测试 Webhook Payload'}
            </button>

            {simulationTrace && (
              <div className="p-2.5 rounded border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center justify-between">
                  <span>✓ 边缘验签通过 · 队列缓冲处理</span>
                  <span>{simulationTrace.durationMs}ms</span>
                </div>
                <div className="truncate text-zinc-500 dark:text-zinc-400">
                  {simulationTrace.signatureHeader}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Repos Table */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase">
            已纳管仓库 ({repos.length})
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">pushed_at 增量判定</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-xs">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="p-3 sm:p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
                  >
                    <span>{repo.full_name}</span>
                    <ExternalLink className="h-3 w-3 text-zinc-400" />
                  </a>
                  <span className="text-[10px] text-zinc-400">
                    {repo.language}
                  </span>
                </div>

                <p className="text-zinc-600 dark:text-zinc-400 font-sans text-xs line-clamp-1">
                  {repo.description}
                </p>

                <div className="text-[11px] text-zinc-400 space-x-2">
                  <span>⭐ {repo.stars}</span>
                  <span>·</span>
                  <span>分支 {repo.default_branch}</span>
                  <span>·</span>
                  <span>最近提交: {new Date(repo.pushed_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <span className="text-[11px] text-zinc-400 hidden md:inline">
                  {new Date(repo.last_synced_at).toLocaleTimeString()}
                </span>
                <button
                  onClick={() => onSyncRepo(repo.id)}
                  disabled={isSyncing}
                  className="px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs transition-colors disabled:opacity-50"
                >
                  增量同步
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Logs */}
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase">
            同步审计日志 (sync_logs)
          </h3>
          <span className="text-[11px] font-mono text-zinc-400">D1 持久化记录</span>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-xs">
          {syncLogs.slice(0, 6).map((log) => (
            <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                  {log.repo_name}
                </span>
                <span className="text-zinc-400 text-[11px] ml-2 font-sans">
                  {log.details}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 shrink-0 self-end sm:self-auto">
                {log.trigger_type.toUpperCase()} · {log.duration_ms}ms · {new Date(log.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
