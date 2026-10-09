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
  ScaffoldView 
} from './components/ScaffoldView';
import { 
  SearchModal 
} from './components/SearchModal';

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
  BookOpen 
} from 'lucide-react';

export default function App() {
  const { theme, setTheme } = useTheme();
  const { isAuthenticated, user, loginWithGitHub, logout, loading: authLoading } = useAuth();

  // 核心前后台分离模式: 'public' (前台展示) | 'admin' (后台管理)
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');

  // 后台管理子导航
  const [activeTab, setActiveTab] = useState<MainNavTab>('dashboard');

  // 全局核心状态
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(initialKnowledgeItems);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [repos, setRepos] = useState<GitHubRepository[]>(initialGitHubRepos);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(initialSyncLogs);
  const [tags] = useState<Tag[]>(initialTags);

  // R2 可选项状态 (默认 false: 保持纯 D1 极简形态)
  const [r2Enabled, setR2Enabled] = useState<boolean>(false);

  // 全局检索弹窗状态
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

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
            onGoToAdmin={() => setViewMode('admin')}
            onOpenSearch={() => setIsSearchOpen(true)}
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
                onLogin={loginWithGitHub}
                loading={authLoading}
                onReturnToPublic={() => setViewMode('public')}
              />
            ) : (
              <div className="space-y-6">
                
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
                  <ArchitectureDocView
                    onOpenScaffoldTab={() => setActiveTab('scaffold')}
                  />
                )}

                {activeTab === 'scaffold' && (
                  <ScaffoldView />
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
              </div>
            )}
          </>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (Shown in Admin Mode when logged in) */}
      {viewMode === 'admin' && isAuthenticated && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 border-t border-zinc-200 dark:border-zinc-800 backdrop-blur-md flex items-center justify-around py-2 px-1">
          {[
            { id: 'dashboard' as MainNavTab, label: '概览', icon: LayoutDashboard },
            { id: 'knowledge' as MainNavTab, label: '知识', icon: FileText },
            { id: 'projects' as MainNavTab, label: '项目', icon: FolderGit2 },
            { id: 'github' as MainNavTab, label: '同步', icon: GitBranch },
            { id: 'architecture' as MainNavTab, label: '架构', icon: BookOpen },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 px-3 min-w-[56px] min-h-[44px] transition-colors rounded ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[10px] font-mono mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

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

      {/* Global Keyboard Shortcut for Ctrl+K */}
      <GlobalKeyboardListener onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-5 text-center text-xs font-mono text-zinc-400 dark:text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>airam · 边缘神经知识中枢 (Cloudflare Workers + D1)</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode(viewMode === 'public' ? 'admin' : 'public')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 underline"
            >
              切换至{viewMode === 'public' ? '管理后台' : '前台展示'}
            </button>
            <span>·</span>
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
