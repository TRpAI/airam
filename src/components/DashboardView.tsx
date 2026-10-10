import React from 'react';
import { 
  FileText, 
  FolderGit2, 
  GitBranch, 
  Clock, 
  ArrowRight,
  Zap,
  ExternalLink
} from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository, SyncLog } from '../types';

interface DashboardViewProps {
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  syncLogs: SyncLog[];
  onNavigateToKnowledge: () => void;
  onNavigateToProjects: () => void;
  onNavigateToGitHub: () => void;
  onSelectKnowledgeItem: (id: string) => void;
  onSelectProject: (id: string) => void;
  onTriggerQuickSync?: () => void;
  isSyncing?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  knowledge,
  projects,
  repos,
  syncLogs,
  onNavigateToKnowledge,
  onNavigateToProjects,
  onNavigateToGitHub,
  onSelectKnowledgeItem,
  onSelectProject,
}) => {
  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);
  const activeProjectsCount = projects.filter((p) => p.status === 'active').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-150">
      
      {/* Metrics Row - Minimal 4-Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Knowledge */}
        <div 
          onClick={onNavigateToKnowledge}
          className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">知识条目 (D1)</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {knowledge.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            收藏 {knowledge.filter(k => k.is_favorite).length} 篇
          </div>
        </div>

        {/* Projects */}
        <div 
          onClick={onNavigateToProjects}
          className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">研发项目卡片</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {projects.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            活跃 {activeProjectsCount} 个
          </div>
        </div>

        {/* GitHub Repos */}
        <div 
          onClick={onNavigateToGitHub}
          className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">GitHub 仓库</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {repos.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
            ⭐ {totalStars} 获星
          </div>
        </div>

        {/* Webhook Events */}
        <div 
          onClick={onNavigateToGitHub}
          className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-zinc-400 dark:hover:border-zinc-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">同步审计事件</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-1">
            {syncLogs.length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {syncLogs[0] ? new Date(syncLogs[0].created_at).toLocaleTimeString() : '无记录'}
          </div>
        </div>

      </div>

      {/* Main Grid: Projects & Knowledge */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column (2 cols): Core Projects */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
              核心研发项目卡片
            </h2>
            <button
              onClick={onNavigateToProjects}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-mono flex items-center gap-1"
            >
              全部 ({projects.length}) <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {projects.slice(0, 4).map((p) => {
              const matchedRepo = repos.find((r) => r.id === p.repository_id);
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProject(p.id)}
                  className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm font-mono text-zinc-900 dark:text-zinc-100 truncate">
                        {p.name}
                      </h3>
                      <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
                        {p.rating}.0★
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {p.one_liner}
                    </p>

                    {/* Zero-Pill Unboxed Tech Stacks */}
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3 font-mono truncate">
                      {p.tech_stack.join(' · ')}
                    </div>
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span>{p.status === 'active' ? '活跃' : '维护'}</span>
                    </span>
                    {matchedRepo && (
                      <span>⭐ {matchedRepo.stars}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1 col): Recent Knowledge & Logs */}
        <div className="space-y-6">
          
          {/* Recent Knowledge */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                最近知识沉淀
              </h2>
              <button
                onClick={onNavigateToKnowledge}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-mono"
              >
                浏览
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 overflow-hidden">
              {knowledge.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectKnowledgeItem(item.id)}
                  className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-200 truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0 uppercase">
                      {item.type}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-1">
                    {item.summary || item.content.slice(0, 60)}
                  </p>
                  <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1.5">
                    {new Date(item.updated_at).toLocaleDateString()} · {item.tags.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Sync stream */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 font-mono">
                同步日志流
              </h2>
              <span className="text-[10px] font-mono text-zinc-400">Queue 削峰</span>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 font-mono text-xs overflow-hidden">
              {syncLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-900 dark:text-zinc-200 truncate max-w-[180px] font-medium">
                      {log.repo_name.split('/')[1] || log.repo_name}
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      {log.status === 'success' ? '已更新' : '跳过'} · {log.duration_ms}ms
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-1 font-sans">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
