import React, { useState } from 'react';
import { 
  Download, 
  Database, 
  FileText, 
  FileCode, 
  CheckCircle2, 
  ToggleLeft, 
  ToggleRight,
  Info
} from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository, SyncLog } from '../types';
import { exportToJSON, exportToD1Sql, exportToMarkdownBundle } from '../services/exportService';
import { MIGRATION_SQL } from '../data/migrationSql';
import { Copy } from 'lucide-react';

interface BackupViewProps {
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  syncLogs: SyncLog[];
  r2Enabled: boolean;
  setR2Enabled: (enabled: boolean) => void;
}

export const BackupView: React.FC<BackupViewProps> = ({
  knowledge,
  projects,
  repos,
  syncLogs,
  r2Enabled,
  setR2Enabled,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownloadMarkdown = () => {
    exportToMarkdownBundle(knowledge, projects);
    triggerSuccess('Markdown 知识归档已生成并开始下载');
  };

  const handleDownloadSql = () => {
    exportToD1Sql(knowledge, projects, repos);
    triggerSuccess('D1 标准 SQL 导出脚本已生成并开始下载');
  };

  const handleDownloadJson = () => {
    exportToJSON(knowledge, projects, repos, syncLogs);
    triggerSuccess('JSON 完整结构化备份包已生成并开始下载');
  };

  const triggerSuccess = (msg: string) => {
    setDownloadSuccess(msg);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
            数据备份与可逆性中心
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            知识永远属于你 · 一键导出 Markdown、JSON 或标准 SQLite D1 SQL 脚本，不被平台锁定
          </p>
        </div>

        {downloadSuccess && (
          <div className="px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{downloadSuccess}</span>
          </div>
        )}
      </div>

      {/* 3 Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Markdown */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FileText className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <span className="text-[11px] font-mono text-zinc-400">通用便携</span>
            </div>
            <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              Markdown 全量归档
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              将所有知识条目与研发项目卡片打包为纯文本 Markdown，可放入 Obsidian 或静态博客。
            </p>
          </div>

          <button
            onClick={handleDownloadMarkdown}
            className="w-full py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载 Markdown (.md)</span>
          </button>
        </div>

        {/* D1 SQL */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Database className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <span className="text-[11px] font-mono text-zinc-400">标准 SQLite</span>
            </div>
            <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              D1 SQL 转储脚本
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              生成完整包含表数据与结构的 SQL 文件，可在任何 SQLite 客户端或新 D1 中恢复。
            </p>
          </div>

          <button
            onClick={handleDownloadSql}
            className="w-full py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载 D1 SQL (.sql)</span>
          </button>
        </div>

        {/* JSON */}
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <FileCode className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              <span className="text-[11px] font-mono text-zinc-400">结构化全集</span>
            </div>
            <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
              全库 JSON 备份包
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              包含知识表、项目卡片、GitHub 元信息与全部 Webhook 日志的结构化 JSON。
            </p>
          </div>

          <button
            onClick={handleDownloadJson}
            className="w-full py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-mono font-medium text-zinc-900 dark:text-zinc-100 transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 min-h-[40px]"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载 JSON (.json)</span>
          </button>
        </div>

      </div>

      {/* D1 Init Migration Script Card */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-emerald-500 shrink-0" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              Cloudflare D1 初始化建表脚本 (migrations/0001_init.sql)
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            物理文件路径：<code className="text-emerald-600 dark:text-emerald-400 font-semibold">migrations/0001_init.sql</code>。用于在新 D1 数据库中一键建表与初始化 FTS5 虚表。
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              navigator.clipboard.writeText(MIGRATION_SQL);
              triggerSuccess('已复制 migrations/0001_init.sql 全部代码');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>复制代码</span>
          </button>
          <button
            onClick={() => {
              const blob = new Blob([MIGRATION_SQL], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = '0001_init.sql';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              triggerSuccess('migrations/0001_init.sql 下载完成');
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-emerald-600 text-white dark:bg-emerald-500 hover:bg-emerald-700 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>下载脚本</span>
          </button>
        </div>
      </div>

      {/* R2 Optional Settings Card */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                Cloudflare R2 对象存储 (可选项 Optional)
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                {r2Enabled ? '已开启' : '关闭 (纯 D1 极简)'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              R2 为可选项。若仅管理 Markdown 文本与代码元信息，单 D1 即可完备运行（零多余账单与配置）。
            </p>
          </div>

          <button
            onClick={() => setR2Enabled(!r2Enabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors self-start sm:self-auto"
          >
            {r2Enabled ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4" />}
            <span>{r2Enabled ? '切换为纯 D1 极简' : '启用 R2 增强'}</span>
          </button>
        </div>

        {r2Enabled ? (
          <div className="p-3 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-mono text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
            <div className="font-semibold text-zinc-900 dark:text-zinc-200">已启用 R2 存储桶: dev-kb-assets</div>
            <p className="text-[11px]">支持项目截图附件拖拽上传与每日凌晨 02:00 SQL 快照自动转储。</p>
          </div>
        ) : (
          <div className="p-3 rounded border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs text-zinc-500 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              当前以纯 D1 极简形态运行。无需在 Cloudflare 创建 R2 Bucket，wrangler.toml 中无需绑定任何 R2，维护负担降至最低。
            </p>
          </div>
        )}
      </div>

    </div>
  );
};
