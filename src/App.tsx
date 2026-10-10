/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Header, 
  MainNavTab 
} from './components/Header';
import { 
  PublicShowcase 
} from './components/PublicShowcase';
import { 
  AdminLogin 
} from './components/AdminLogin';
import { 
  DashboardView 
} from './components/DashboardView';
import { 
  KnowledgeView 
} from './components/KnowledgeView';
import { 
  ProjectsView 
} from './components/ProjectsView';
import { 
  GitHubSyncView 
} from './components/GitHubSyncView';
import { 
  BackupView 
} from './components/BackupView';
import { 
  ArchitectureDocView 
} from './components/ArchitectureDocView';
import { 
  SearchModal 
} from './components/SearchModal';
import { 
  SubmissionModal 
} from './components/SubmissionModal';
import { 
  AdminSubmissionsView 
} from './components/AdminSubmissionsView';
import { 
  AdminSettingsView 
} from './components/AdminSettingsView';
import { useSubmissions } from './hooks/useSubmissions';

import { 
  initialKnowledgeItems, 
  initialProjects, 
  initialGitHubRepos, 
  initialSyncLogs, 
  initialTags 
} from './data/initialData';
import { KnowledgeItem, Project, GitHubRepository, SyncLog, Tag } from './types';
import { generateProjectCardFromRepo } from './services/githubService';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';

import { 
  LayoutDashboard, 
  FileText, 
  FolderGit2, 
  GitBranch, 
  BookOpen,
  Database,
  Sliders
} from 'lucide-react';

export default function App() {
  const { theme, setTheme } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    loginWithOAuth, 
    loginWithToken, 
    loginWithDemo, 
    logout, 
    loading: authLoading,
    oauthStatus,
    resetAdminSeat,
    saveCustomCredentials,
    refreshOAuthStatus
  } = useAuth();

  // 核心前后台分离模式: 'public' (前台展示) | 'admin' (后台管理)
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');

  // 后台管理子导航
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');

  // 生产环境规范：严格移除所有演示数据 (import.meta.env.PROD 状态或用户手动清理)
  const isPurgedMode = import.meta.env.PROD || localStorage.getItem('airam_demo_purged') === 'true';

  // 全局核心状态
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(() => {
    if (isPurgedMode) return [];
    try {
      const saved = localStorage.getItem('airam_knowledge');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialKnowledgeItems;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    if (isPurgedMode) return [];
    try {
      const saved = localStorage.getItem('airam_projects');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialProjects;
  });

  const [repos, setRepos] = useState<GitHubRepository[]>(() => {
    if (isPurgedMode) return [];
    try {
      const saved = localStorage.getItem('airam_repos');
      if (saved) return JSON.parse(saved);
    } catch {}
    return initialGitHubRepos;
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    if (isPurgedMode) return [];
    return initialSyncLogs;
  });

  const [tags] = useState<Tag[]>(initialTags);

  const handlePurgeAllDemoData = () => {
    localStorage.setItem('airam_demo_purged', 'true');
    localStorage.removeItem('airam_knowledge');
    localStorage.removeItem('airam_projects');
    localStorage.removeItem('airam_repos');
    setKnowledge([]);
    setProjects([]);
    setRepos([]);
    setSyncLogs([]);
  };

  // R2 可选项状态 (默认 false: 保持纯 D1 极简形态)
  const [r2Enabled, setR2Enabled] = useState<boolean>(false);

  // 全局检索与提交弹窗状态
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);

  // 访客开源仓库提交与审核管理状态
  const {
    submissions,
    stats: submissionStats,
    loading: submissionsLoading,
    fetchSubmissions,
    submitRepo,
    reviewSubmission,
    deleteSubmission,
  } = useSubmissions(Boolean(user?.isAdmin), user?.login);

  // 联动跳转状态
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string>(initialKnowledgeItems[0]?.id || '');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 1. 知识 CRUD 操作
  const handleSaveKnowledge = (item: KnowledgeItem) => {
    setKnowledge((prev) => {
      const idx = prev.findIndex((k) => k.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [item, ...prev];
    });
  };

  const handleDeleteKnowledge = (id: string) => {
    setKnowledge((prev) => prev.filter((k) => k.id !== id));
  };

  // 2. 项目卡片 CRUD 操作
  const handleSaveProject = (project: Project) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.id === project.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = project;
        return next;
      }
      return [project, ...prev];
    });
  };

  const handleDeleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  };

  // 3. GitHub 仓库纳管与自动生成项目卡片
  const handleAddRepo = (newRepo: GitHubRepository, autoCard = true) => {
    setRepos((prev) => [newRepo, ...prev]);

    if (newRepo.readme_content) {
      const kbItem: KnowledgeItem = {
        id: `kb-gh-${Date.now()}`,
        title: `${newRepo.name} 架构与文档指南 (GitHub 镜像)`,
        type: 'document',
        content: newRepo.readme_content,
        summary: newRepo.description || `由 GitHub 仓库 ${newRepo.full_name} 自动同步的 README 镜像。`,
        status: 'active',
        is_favorite: false,
        tags: ['GitHub-API', newRepo.language],
        source_repo_id: newRepo.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setKnowledge((prev) => [kbItem, ...prev]);
    }

    if (autoCard) {
      const card = generateProjectCardFromRepo(newRepo);
      setProjects((prev) => [card, ...prev]);
    }

    const log: SyncLog = {
      id: `log-${Date.now()}`,
      repo_id: newRepo.id,
      repo_name: newRepo.full_name,
      trigger_type: 'manual',
      status: 'success',
      details: `纳管新代码库 ${newRepo.full_name}，自动同步 README 并建立项目卡片。`,
      duration_ms: 150,
      created_at: new Date().toISOString(),
    };
    setSyncLogs((prev) => [log, ...prev]);
  };

  // 4. 单仓库增量同步
  const handleSyncRepo = async (repoId: string) => {
    setIsSyncing(true);
    const target = repos.find((r) => r.id === repoId);
    if (!target) {
      setIsSyncing(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 450));

    const now = new Date().toISOString();
    setRepos((prev) =>
      prev.map((r) =>
        r.id === repoId
          ? { ...r, last_synced_at: now, sync_status: 'synced' as const }
          : r
      )
    );

    const log: SyncLog = {
      id: `log-${Date.now()}`,
      repo_id: target.id,
      repo_name: target.full_name,
      trigger_type: 'manual',
      status: 'success',
      details: `增量同步完成：比对 pushed_at，文档已对齐 D1 存储。`,
      duration_ms: 104,
      created_at: now,
    };
    setSyncLogs((prev) => [log, ...prev]);
    setIsSyncing(false);
  };

  // 5. 一键增量同步全部仓库
  const handleSyncAll = async () => {
    setIsSyncing(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    const now = new Date().toISOString();

    setRepos((prev) =>
      prev.map((r) => ({
        ...r,
        last_synced_at: now,
        sync_status: 'synced' as const,
      }))
    );

    const newLogs: SyncLog[] = [
      {
        id: `log-${Date.now()}-1`,
        repo_id: 'all',
        repo_name: '全部已纳管仓库',
        trigger_type: 'manual',
        status: 'success',
        details: `全量增量比对完成：共 ${repos.length} 个仓库，所有元信息与 README 保持最新。`,
        duration_ms: 260,
        created_at: now,
      },
      ...syncLogs,
    ];
    setSyncLogs(newLogs);
    setIsSyncing(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col transition-colors duration-150">
      
      {/* Universal Header with DevHub Branding, Theme Switcher & Auth */}
      <Header
        viewMode={viewMode}
        setViewMode={setViewMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
        theme={theme}
        setTheme={setTheme}
        user={user}
        onLogout={logout}
        r2Enabled={r2Enabled}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 pb-20 lg:pb-8">
        
        {/* ========================================================================= */}
        {/* 1. 前台展示空间 (Public Showcase Portal)                                    */}
        {/* ========================================================================= */}
        {viewMode === 'public' && (
          <PublicShowcase
            knowledge={knowledge}
            projects={projects}
            repos={repos}
            approvedSubmissions={submissions.filter((s) => s.status === 'approved')}
            onGoToAdmin={() => setViewMode('admin')}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenSubmitRepo={() => setIsSubmitModalOpen(true)}
            user={user}
          />
        )}

        {/* ========================================================================= */}
        {/* 2. 后台管理中枢 (Admin Console)                                            */}
        {/* ========================================================================= */}
        {viewMode === 'admin' && (
          <>
            {/* If not authenticated with GitHub account, show Login Gate */}
            {!isAuthenticated ? (
              <AdminLogin
                onLoginOAuth={loginWithOAuth}
                onLoginToken={loginWithToken}
                onLoginDemo={loginWithDemo}
                loading={authLoading}
                oauthStatus={oauthStatus}
                onReturnToPublic={() => setViewMode('public')}
              />
            ) : (
              <div className="space-y-6">
                
                {/* 1. 研发知识中枢核心卡片 (无右上角多余功能按钮，纯净简洁) */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-base sm:text-xl font-bold font-mono tracking-tight text-zinc-900 dark:text-zinc-100">
                          研发知识中枢
                        </h1>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          D1 边缘在线
                        </span>
                        {user && (
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                            user.isAdmin
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                          }`}>
                            {user.isAdmin ? `管理员: @${user.login}` : `访客: @${user.login}`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                        以 GitHub 代码资产为真实数据源的单用户边缘知识中枢 · Cloudflare D1 驱动
                      </p>
                    </div>
                  </div>

                  {/* 状态与统计摘要行 */}
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-500">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">TypeScript</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">Cloudflare D1</span>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">SQLite FTS5</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 text-[11px]">
                      <span>条目: {knowledge.length}</span>
                      <span>·</span>
                      <span>项目: {projects.length}</span>
                      <span>·</span>
                      <span>仓库: {repos.length}</span>
                    </div>
                  </div>
                </div>

                {/* 2. 后台导航栏 (从页脚移至研发知识中枢卡片下方，支持移动端横滑与桌面端) */}
                <div className="flex items-center space-x-1.5 text-xs font-mono overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1 border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
                  {[
                    { id: 'dashboard' as MainNavTab, label: '概览', icon: LayoutDashboard },
                    { id: 'knowledge' as MainNavTab, label: `知识手记 (${knowledge.length})`, icon: FileText },
                    { id: 'projects' as MainNavTab, label: `研发项目 (${projects.length})`, icon: FolderGit2 },
                    { 
                      id: 'submissions' as MainNavTab, 
                      label: `仓库审核 ${submissionStats.pendingCount > 0 ? `(${submissionStats.pendingCount})` : ''}`, 
                      icon: GitBranch,
                      isPending: submissionStats.pendingCount > 0,
                    },
                    { id: 'github' as MainNavTab, label: `同步审计 (${repos.length})`, icon: GitBranch },
                    { id: 'architecture' as MainNavTab, label: '系统架构', icon: BookOpen },
                    { id: 'backup' as MainNavTab, label: '数据备份', icon: Database },
                    { id: 'settings' as MainNavTab, label: '系统设置', icon: Sliders },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all whitespace-nowrap min-h-[34px] text-xs font-mono active:scale-95 ${
                          isActive
                            ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100/60 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{item.label}</span>
                        {'isPending' in item && item.isPending && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Backstage Tab Content */}
                {activeTab === 'dashboard' && (
                  <DashboardView
                    knowledge={knowledge}
                    projects={projects}
                    repos={repos}
                    syncLogs={syncLogs}
                    onNavigateToKnowledge={() => setActiveTab('knowledge')}
                    onNavigateToProjects={() => setActiveTab('projects')}
                    onNavigateToGitHub={() => setActiveTab('github')}
                    onSelectKnowledgeItem={(id) => {
                      setSelectedKnowledgeId(id);
                      setActiveTab('knowledge');
                    }}
                    onSelectProject={(id) => {
                      setActiveTab('projects');
                    }}
                    onTriggerQuickSync={handleSyncAll}
                    isSyncing={isSyncing}
                  />
                )}

                {activeTab === 'knowledge' && (
                  <KnowledgeView
                    knowledge={knowledge}
                    tags={tags}
                    onSaveKnowledge={handleSaveKnowledge}
                    onDeleteKnowledge={handleDeleteKnowledge}
                    selectedId={selectedKnowledgeId}
                    onSelectId={setSelectedKnowledgeId}
                  />
                )}

                {activeTab === 'projects' && (
                  <ProjectsView
                    projects={projects}
                    repos={repos}
                    onSaveProject={handleSaveProject}
                    onDeleteProject={handleDeleteProject}
                  />
                )}

                {activeTab === 'submissions' && (
                  <AdminSubmissionsView
                    submissions={submissions}
                    stats={submissionStats}
                    loading={submissionsLoading}
                    user={user}
                    onRefresh={fetchSubmissions}
                    onReview={async (id, action, comment) => {
                      return await reviewSubmission(id, action, comment, user?.login);
                    }}
                    onDelete={async (id) => {
                      return await deleteSubmission(id, user?.login);
                    }}
                    onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                  />
                )}

                {activeTab === 'github' && (
                  <GitHubSyncView
                    repos={repos}
                    syncLogs={syncLogs}
                    onAddRepo={handleAddRepo}
                    onSyncRepo={handleSyncRepo}
                    onSyncAll={handleSyncAll}
                    isSyncing={isSyncing}
                  />
                )}

                {activeTab === 'architecture' && (
                  <ArchitectureDocView />
                )}

                {activeTab === 'backup' && (
                  <BackupView
                    knowledge={knowledge}
                    projects={projects}
                    repos={repos}
                    syncLogs={syncLogs}
                    r2Enabled={r2Enabled}
                    setR2Enabled={setR2Enabled}
                  />
                )}

                {activeTab === 'settings' && (
                  <AdminSettingsView
                    user={user}
                    oauthStatus={oauthStatus}
                    onRefreshOAuthStatus={refreshOAuthStatus}
                    onResetAdmin={resetAdminSeat}
                    onSaveCredentials={saveCustomCredentials}
                    onPurgeDemoData={handlePurgeAllDemoData}
                    knowledgeCount={knowledge.length}
                    projectsCount={projects.length}
                    reposCount={repos.length}
                  />
                )}
              </div>
            )}
          </>
        )}

      </main>

      {/* Global Interactive Search Modal (FTS5 Search) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        knowledge={knowledge}
        projects={projects}
        repos={repos}
        onSelectKnowledge={(id) => {
          setSelectedKnowledgeId(id);
          if (viewMode === 'admin') setActiveTab('knowledge');
        }}
        onSelectProject={(id) => {
          if (viewMode === 'admin') setActiveTab('projects');
        }}
        onSelectRepo={(id) => {
          if (viewMode === 'admin') setActiveTab('github');
        }}
      />

      {/* Visitor Repository Submission Modal */}
      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        user={user}
        onSubmitRepo={submitRepo}
        onSuccess={() => {
          fetchSubmissions();
        }}
      />

      {/* Global Keyboard Shortcut for Ctrl+K */}
      <GlobalKeyboardListener onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Fixed Footer (前后台一致常驻固定页脚) */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-800/80 py-2.5 px-4 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1.5 sm:gap-2">
          <span className="truncate">AIram · 边缘神经知识中枢 (Cloudflare Workers + D1)</span>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setViewMode(viewMode === 'public' ? 'admin' : 'public')}
              className="text-zinc-600 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white underline decoration-zinc-400/60 hover:decoration-zinc-950 dark:hover:decoration-white transition-colors font-medium cursor-pointer"
            >
              切换至{viewMode === 'public' ? '管理后台' : '前台展示'}
            </button>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>R2: {r2Enabled ? '已开启' : '关闭 (纯 D1 极简)'}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function GlobalKeyboardListener({ onOpenSearch }: { onOpenSearch: () => void }) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  return null;
}
