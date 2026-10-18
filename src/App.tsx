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
import { VisitorDashboard } from './components/VisitorDashboard';
import { RepoCommentsModal } from './components/RepoCommentsModal';
import { useComments } from './hooks/useComments';
import { useSubmissions } from './hooks/useSubmissions';
import { OfflineIndicator } from './components/OfflineIndicator';

import { 
  initialKnowledgeItems, 
  initialProjects, 
  initialGitHubRepos, 
  initialSyncLogs, 
  initialTags,
  isDemoRepo,
  isDemoProject,
  isDemoKnowledge,
  isDemoSyncLog
} from './data/initialData';
import { KnowledgeItem, Project, GitHubRepository, SyncLog, Tag } from './types';
import { generateProjectCardFromRepo } from './services/githubService';
import { useTheme } from './hooks/useTheme';
import { useAuth } from './hooks/useAuth';
import { useAppRouter } from './hooks/useAppRouter';

import { 
  LayoutDashboard, 
  FileText, 
  FolderGit2, 
  GitBranch, 
  BookOpen,
  Database,
  Sliders,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';

export default function App() {
  const { theme, setTheme } = useTheme();
  const { 
    isAuthenticated, 
    user, 
    loginWithOAuth, 
    loginWithDemo, 
    logout, 
    loading: authLoading,
    authError,
    isExchangingCode,
    callbackStep,
    callbackProgress,
    callbackTimedOut,
    callbackStatusMsg,
    retryCallbackExchange,
    cancelCallbackAndRedirect,
    oauthStatus,
    resetAdminSeat,
    refreshOAuthStatus
  } = useAuth();

  // 核心路由与状态保持中枢 (刷新保留当前页面与子标签，支持浏览器前进/后退)
  const {
    viewMode,
    activeTab,
    publicSection,
    selectedDocId,
    selectedKnowledgeId: routerKnowledgeId,
    setViewMode,
    setActiveTab,
    setPublicSection,
    setSelectedDocId,
    setSelectedKnowledgeId: setRouterKnowledgeId
  } = useAppRouter();

  // 检测是否处于 GitHub OAuth 回调处理流程中 (拦截 URL ?code= 或 /auth/callback)
  const isUrlCallback = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).has('code') || window.location.pathname.includes('/auth/callback'));
  const isHandlingCallback = isExchangingCode || (callbackStep !== 'idle') || isUrlCallback;

  // 演示数据已清除标记判定：优先读取本地 localStorage 标记；一旦标记为已清除，任何环境绝不可被服务端拉取的演示数据反向覆盖
  const isDemoPurged = localStorage.getItem('airam_demo_purged') === 'true';

  // 全局核心状态：优先从 localStorage 读取（若处于已清除模式，严格过滤所有演示数据），无缓存时保持干净空状态
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(() => {
    try {
      const saved = localStorage.getItem('airam_knowledge');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return isDemoPurged ? parsed.filter((k: KnowledgeItem) => !isDemoKnowledge(k)) : parsed;
        }
      }
    } catch {}
    return isDemoPurged ? [] : initialKnowledgeItems;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const saved = localStorage.getItem('airam_projects');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return isDemoPurged ? parsed.filter((p: Project) => !isDemoProject(p)) : parsed;
        }
      }
    } catch {}
    return isDemoPurged ? [] : initialProjects;
  });

  const [repos, setRepos] = useState<GitHubRepository[]>(() => {
    try {
      const saved = localStorage.getItem('airam_repos');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return isDemoPurged ? parsed.filter((r: GitHubRepository) => !isDemoRepo(r)) : parsed;
        }
      }
    } catch {}
    return isDemoPurged ? [] : initialGitHubRepos;
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    try {
      const saved = localStorage.getItem('airam_sync_logs');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return isDemoPurged ? parsed.filter((l: SyncLog) => !isDemoSyncLog(l)) : parsed;
        }
      }
    } catch {}
    return isDemoPurged ? [] : initialSyncLogs;
  });

  const [tags] = useState<Tag[]>(initialTags);

  // 标记初次从中枢加载完成，避免初始挂载状态冲刷远端中枢
  const isHydratedRef = React.useRef(false);
  const syncDebounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // 跨端中枢双向实时同步广播
  const syncHubToServer = React.useCallback(
    (patch?: {
      projects?: Project[];
      repos?: GitHubRepository[];
      knowledge?: KnowledgeItem[];
      syncLogs?: SyncLog[];
      isDemoPurged?: boolean;
    }) => {
      if (syncDebounceTimer.current) clearTimeout(syncDebounceTimer.current);
      syncDebounceTimer.current = setTimeout(() => {
        const payload = {
          projects,
          repos,
          knowledge,
          syncLogs,
          isDemoPurged: true,
          ...patch,
        };
        fetch('/api/hub/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch((e) => {
          console.warn('中枢数据同步提示:', e);
        });
      }, 150);
    },
    [projects, repos, knowledge, syncLogs]
  );

  // 从服务端同步全局中枢数据：严格执行【本地清除标记优先级 > 服务端演示数据】
  React.useEffect(() => {
    let isCancelled = false;

    fetch('/api/hub/data')
      .then((res) => {
        if (!res.ok) throw new Error('Fetch hub data failed');
        return res.json();
      })
      .then((data) => {
        if (isCancelled || !data) return;

        // 1. 核心判定：只要本地标记清除，或者服务端标记清除，即进入纯净已清除模式
        const isLocallyPurged = localStorage.getItem('airam_demo_purged') === 'true';
        const isServerPurged = data?.isDemoPurged === true;
        const shouldBePurged = isLocallyPurged || isServerPurged;

        if (shouldBePurged) {
          localStorage.setItem('airam_demo_purged', 'true');
        }

        // 2. 读取本地存储中缓存的数据，并严格过滤演示项
        let localRepos: GitHubRepository[] = [];
        let localProjects: Project[] = [];
        let localKnowledge: KnowledgeItem[] = [];
        let localLogs: SyncLog[] = [];
        try {
          const r = localStorage.getItem('airam_repos');
          if (r) localRepos = JSON.parse(r);
          const p = localStorage.getItem('airam_projects');
          if (p) localProjects = JSON.parse(p);
          const k = localStorage.getItem('airam_knowledge');
          if (k) localKnowledge = JSON.parse(k);
          const l = localStorage.getItem('airam_sync_logs');
          if (l) localLogs = JSON.parse(l);
        } catch {}

        if (shouldBePurged) {
          localRepos = localRepos.filter((r) => !isDemoRepo(r));
          localProjects = localProjects.filter((p) => !isDemoProject(p));
          localKnowledge = localKnowledge.filter((k) => !isDemoKnowledge(k));
          localLogs = localLogs.filter((l) => !isDemoSyncLog(l));
        }

        // 3. 服务端数据严格校验：
        // 关键逻辑：若服务端尚未清除 (data.isDemoPurged !== true)，服务端返回的所有数据均视为陈旧演示数据，
        // 在已清除模式下严禁采用（强制置空），彻底阻止从服务端拉取并覆盖初始的本地空数据状态！
        let serverRepos: GitHubRepository[] = [];
        let serverProjects: Project[] = [];
        let serverKnowledge: KnowledgeItem[] = [];
        let serverLogs: SyncLog[] = [];

        if (isServerPurged) {
          // 仅当服务端也是明确的已清除状态时，才允许拉取服务端由其他终端新增的非演示真实数据
          serverRepos = (Array.isArray(data.repos) ? data.repos : []).filter((r: GitHubRepository) => !isDemoRepo(r));
          serverProjects = (Array.isArray(data.projects) ? data.projects : []).filter((p: Project) => !isDemoProject(p));
          serverKnowledge = (Array.isArray(data.knowledge) ? data.knowledge : []).filter((k: KnowledgeItem) => !isDemoKnowledge(k));
          serverLogs = (Array.isArray(data.syncLogs) ? data.syncLogs : []).filter((l: SyncLog) => !isDemoSyncLog(l));
        } else if (!shouldBePurged) {
          // 未清除模式（初次演示）：允许初次展示演示数据
          serverRepos = Array.isArray(data.repos) ? data.repos : [];
          serverProjects = Array.isArray(data.projects) ? data.projects : [];
          serverKnowledge = Array.isArray(data.knowledge) ? data.knowledge : [];
          serverLogs = Array.isArray(data.syncLogs) ? data.syncLogs : [];
        }

        // 4. 优先级决议算法 (Reconciliation Resolution):
        // 规则 A: 已清除模式下，本地空状态 [] 是用户的显式意图，绝不接受未验证的服务端数据；
        // 规则 B: 本地真实数据优先，若本地为空且服务端有确认的已清除非演示数据，才进行安全继承；
        let resolvedRepos = localRepos;
        let resolvedProjects = localProjects;
        let resolvedKnowledge = localKnowledge;
        let resolvedLogs = localLogs;

        if (shouldBePurged) {
          // 仓库决议
          if (localRepos.length > 0) {
            const localIds = new Set(localRepos.map((r) => r.id));
            const localNames = new Set(localRepos.map((r) => r.full_name?.toLowerCase()));
            const newFromServer = serverRepos.filter(
              (r) => !localIds.has(r.id) && !localNames.has(r.full_name?.toLowerCase())
            );
            resolvedRepos = [...localRepos, ...newFromServer];
          } else if (isServerPurged && serverRepos.length > 0) {
            resolvedRepos = serverRepos;
          } else {
            resolvedRepos = [];
          }

          // 项目卡片决议
          if (localProjects.length > 0) {
            const localIds = new Set(localProjects.map((p) => p.id));
            const newFromServer = serverProjects.filter((p) => !localIds.has(p.id));
            resolvedProjects = [...localProjects, ...newFromServer];
          } else if (isServerPurged && serverProjects.length > 0) {
            resolvedProjects = serverProjects;
          } else {
            resolvedProjects = [];
          }

          // 知识手记决议
          if (localKnowledge.length > 0) {
            const localIds = new Set(localKnowledge.map((k) => k.id));
            const newFromServer = serverKnowledge.filter((k) => !localIds.has(k.id));
            resolvedKnowledge = [...localKnowledge, ...newFromServer];
          } else if (isServerPurged && serverKnowledge.length > 0) {
            resolvedKnowledge = serverKnowledge;
          } else {
            resolvedKnowledge = [];
          }

          // 同步日志决议
          if (localLogs.length > 0) {
            resolvedLogs = localLogs;
          } else if (isServerPurged && serverLogs.length > 0) {
            resolvedLogs = serverLogs;
          } else {
            resolvedLogs = [];
          }

          // 如果服务端尚未标记为已清除，立即向服务端中枢发送同步请求，校准服务端状态
          if (!isServerPurged) {
            const syncPayload = {
              repos: resolvedRepos,
              projects: resolvedProjects,
              knowledge: resolvedKnowledge,
              syncLogs: resolvedLogs,
              isDemoPurged: true,
            };
            fetch('/api/hub/sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(syncPayload),
            }).catch(() => {});
            fetch('/api/hub/data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(syncPayload),
            }).catch(() => {});
          }
        } else {
          // 未清除模式（初次演示）：服务端优先
          if (serverRepos.length > 0) resolvedRepos = serverRepos;
          if (serverProjects.length > 0) resolvedProjects = serverProjects;
          if (serverKnowledge.length > 0) resolvedKnowledge = serverKnowledge;
          if (serverLogs.length > 0) resolvedLogs = serverLogs;
        }

        // 统一应用决议状态
        setRepos(resolvedRepos);
        setProjects(resolvedProjects);
        setKnowledge(resolvedKnowledge);
        setSyncLogs(resolvedLogs);

        try {
          localStorage.setItem('airam_repos', JSON.stringify(resolvedRepos));
          localStorage.setItem('airam_projects', JSON.stringify(resolvedProjects));
          localStorage.setItem('airam_knowledge', JSON.stringify(resolvedKnowledge));
          localStorage.setItem('airam_sync_logs', JSON.stringify(resolvedLogs));
        } catch {}
      })
      .catch((e) => {
        console.warn('服务端中枢数据同步提示:', e);
      })
      .finally(() => {
        isHydratedRef.current = true;
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // 核心响应式持久化监听：只要增删改查任何项目或仓库，即刻同步落盘至 localStorage 并广播服务端
  React.useEffect(() => {
    try {
      localStorage.setItem('airam_knowledge', JSON.stringify(knowledge));
    } catch (e) {
      console.warn('保存知识库失败:', e);
    }
    if (isHydratedRef.current) {
      syncHubToServer({ knowledge });
    }
  }, [knowledge, syncHubToServer]);

  React.useEffect(() => {
    try {
      localStorage.setItem('airam_projects', JSON.stringify(projects));
    } catch (e) {
      console.warn('保存项目失败:', e);
    }
    if (isHydratedRef.current) {
      syncHubToServer({ projects });
    }
  }, [projects, syncHubToServer]);

  React.useEffect(() => {
    try {
      localStorage.setItem('airam_repos', JSON.stringify(repos));
    } catch (e) {
      console.warn('保存仓库列表失败:', e);
    }
    if (isHydratedRef.current) {
      syncHubToServer({ repos });
    }
  }, [repos, syncHubToServer]);

  React.useEffect(() => {
    try {
      localStorage.setItem('airam_sync_logs', JSON.stringify(syncLogs));
    } catch (e) {
      console.warn('保存同步日志失败:', e);
    }
    if (isHydratedRef.current) {
      syncHubToServer({ syncLogs });
    }
  }, [syncLogs, syncHubToServer]);

  const handlePurgeAllDemoData = async () => {
    localStorage.setItem('airam_demo_purged', 'true');
    localStorage.setItem('airam_knowledge', '[]');
    localStorage.setItem('airam_projects', '[]');
    localStorage.setItem('airam_repos', '[]');
    localStorage.setItem('airam_sync_logs', '[]');
    localStorage.removeItem('airam_local_submission_reviews');
    localStorage.removeItem('airam_deleted_submission_ids');
    localStorage.removeItem('airam_user_submissions');

    setKnowledge([]);
    setProjects([]);
    setRepos([]);
    setSyncLogs([]);

    // 调用服务端清理接口与中枢同步端点，彻底擦除服务端所有演示记录
    try {
      await fetch('/api/admin/purge-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_login: user?.login || 'osahermes',
          purgeAll: true,
        }),
      });
      await fetch('/api/hub/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projects: [],
          repos: [],
          knowledge: [],
          syncLogs: [],
          isDemoPurged: true,
        }),
      });
    } catch (e) {
      console.warn('通知后端清理演示数据提示:', e);
    }

    // 重新拉取以呈现纯净初始态
    await fetchSubmissions();
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

  // 跨项目评论与讨论系统状态
  const [selectedCommentRepo, setSelectedCommentRepo] = useState<{
    repoId: string;
    repoName: string;
    repoUrl?: string;
  } | null>(null);

  const {
    comments: activeRepoComments,
    allComments,
    commentCountsByRepo,
    addComment,
    deleteComment,
  } = useComments(selectedCommentRepo?.repoId);

  // 联动跳转与知识条目状态（刷新自动保留当前选中的笔记）
  const [internalKnowledgeId, setInternalKnowledgeId] = useState<string>(() => {
    return localStorage.getItem('airam_selected_kb_id') || initialKnowledgeItems[0]?.id || '';
  });
  const selectedKnowledgeId = routerKnowledgeId || internalKnowledgeId;
  const handleSelectKnowledgeId = (id: string) => {
    setInternalKnowledgeId(id);
    setRouterKnowledgeId(id);
    try {
      localStorage.setItem('airam_selected_kb_id', id);
    } catch {}
  };
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
    let nextRepos: GitHubRepository[] = [];
    setRepos((prev) => {
      nextRepos = [newRepo, ...prev.filter((r) => r.id !== newRepo.id && r.full_name?.toLowerCase() !== newRepo.full_name?.toLowerCase())];
      try {
        localStorage.setItem('airam_repos', JSON.stringify(nextRepos));
      } catch {}
      return nextRepos;
    });

    let nextKnowledge: KnowledgeItem[] | undefined;
    if (newRepo.readme_content) {
      const kbItem: KnowledgeItem = {
        id: `kb-gh-${Date.now()}`,
        title: `${newRepo.name} 架构与文档指南 (GitHub 镜像)`,
        type: 'document',
        content: newRepo.readme_content,
        summary: newRepo.description || `由 GitHub 仓库 ${newRepo.full_name} 自动同步的 README 镜像。`,
        status: 'active',
        is_favorite: false,
        tags: ['GitHub-API', newRepo.language || 'Markdown'],
        source_repo_id: newRepo.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setKnowledge((prev) => {
        nextKnowledge = [kbItem, ...prev.filter((k) => k.id !== kbItem.id)];
        try {
          localStorage.setItem('airam_knowledge', JSON.stringify(nextKnowledge));
        } catch {}
        return nextKnowledge;
      });
    }

    let nextProjects: Project[] | undefined;
    if (autoCard) {
      const card = generateProjectCardFromRepo(newRepo);
      setProjects((prev) => {
        nextProjects = [card, ...prev.filter((p) => p.id !== card.id)];
        try {
          localStorage.setItem('airam_projects', JSON.stringify(nextProjects));
        } catch {}
        return nextProjects;
      });
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
    setSyncLogs((prev) => {
      const nextLogs = [log, ...prev];
      try {
        localStorage.setItem('airam_sync_logs', JSON.stringify(nextLogs));
      } catch {}
      return nextLogs;
    });

    // 立即广播至服务端中枢
    syncHubToServer({
      repos: nextRepos,
      ...(nextKnowledge ? { knowledge: nextKnowledge } : {}),
      ...(nextProjects ? { projects: nextProjects } : {}),
      isDemoPurged: true,
    });
  };

  // 3.5 移除/删除已纳管仓库
  const handleDeleteRepo = (repoId: string) => {
    setRepos((prev) => {
      const next = prev.filter((r) => r.id !== repoId);
      try {
        localStorage.setItem('airam_repos', JSON.stringify(next));
      } catch {}
      syncHubToServer({ repos: next, isDemoPurged: true });
      return next;
    });
    setSyncLogs((prev) => {
      const next = prev.filter((log) => log.repo_id !== repoId);
      try {
        localStorage.setItem('airam_sync_logs', JSON.stringify(next));
      } catch {}
      return next;
    });
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
        {/* 0. 优先拦截：GitHub OAuth 授权回调与凭据交换加载视图                           */}
        {/* ========================================================================= */}
        {isHandlingCallback && !isAuthenticated ? (
          <AdminLogin
            onLoginOAuth={loginWithOAuth}
            onLoginDemo={loginWithDemo}
            loading={authLoading}
            oauthStatus={oauthStatus}
            onReturnToPublic={() => {
              cancelCallbackAndRedirect();
              setViewMode('public');
            }}
            authError={authError}
            isExchangingCode={isExchangingCode}
            callbackStep={callbackStep}
            callbackProgress={callbackProgress}
            callbackTimedOut={callbackTimedOut}
            callbackStatusMsg={callbackStatusMsg}
            onRetryCallback={retryCallbackExchange}
            onCancelCallback={() => {
              cancelCallbackAndRedirect();
              setViewMode('public');
            }}
          />
        ) : (
          <>
            {/* ========================================================================= */}
            {/* 1. 前台展示空间 (Public Showcase Portal)                                    */}
            {/* ========================================================================= */}
            {viewMode === 'public' && (
              <PublicShowcase
                knowledge={knowledge}
                projects={projects}
                repos={repos}
                approvedSubmissions={submissions.filter((s) => s.status === 'approved')}
                allSubmissions={submissions}
                commentCounts={commentCountsByRepo}
                onOpenComments={(repoId, repoName, repoUrl) => setSelectedCommentRepo({ repoId, repoName, repoUrl })}
                onGoToAdmin={() => setViewMode(user?.isAdmin ? 'admin' : user ? 'user' : 'admin')}
                onOpenSearch={() => setIsSearchOpen(true)}
                onOpenSubmitRepo={() => setIsSubmitModalOpen(true)}
                user={user}
                activeSection={publicSection}
                onSectionChange={setPublicSection}
                selectedDocId={selectedDocId}
                onSelectDoc={setSelectedDocId}
              />
            )}

            {/* ========================================================================= */}
            {/* 2. 访客专属开发者工作台 (Visitor Dashboard)                                  */}
            {/* ========================================================================= */}
            {viewMode === 'user' && (
              <>
                {!isAuthenticated || !user ? (
                  <AdminLogin
                    onLoginOAuth={loginWithOAuth}
                    onLoginDemo={loginWithDemo}
                    loading={authLoading}
                    oauthStatus={oauthStatus}
                    onReturnToPublic={() => setViewMode('public')}
                    authError={authError}
                    isExchangingCode={isExchangingCode}
                    callbackStep={callbackStep}
                    callbackProgress={callbackProgress}
                    callbackTimedOut={callbackTimedOut}
                    callbackStatusMsg={callbackStatusMsg}
                    onRetryCallback={retryCallbackExchange}
                    onCancelCallback={cancelCallbackAndRedirect}
                  />
                ) : (
                  <VisitorDashboard
                    user={user}
                    submissions={submissions}
                    comments={allComments}
                    onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                    onOpenRepoComments={(repoId, repoName, repoUrl) =>
                      setSelectedCommentRepo({ repoId, repoName, repoUrl })
                    }
                    onDeleteComment={async (id) => {
                      return await deleteComment(id, user.login);
                    }}
                    onSwitchToPublic={() => setViewMode('public')}
                    onLogout={logout}
                  />
                )}
              </>
            )}

            {/* ========================================================================= */}
            {/* 3. 后台管理中枢 (Admin Console - 仅 ADMIN_USER 可访问)                       */}
            {/* ========================================================================= */}
            {viewMode === 'admin' && (
              <>
                {/* If not authenticated with GitHub account, show Login Gate */}
                {!isAuthenticated || !user ? (
                  <AdminLogin
                    onLoginOAuth={loginWithOAuth}
                    onLoginDemo={loginWithDemo}
                    loading={authLoading}
                    oauthStatus={oauthStatus}
                    onReturnToPublic={() => setViewMode('public')}
                    authError={authError}
                    isExchangingCode={isExchangingCode}
                    callbackStep={callbackStep}
                    callbackProgress={callbackProgress}
                    callbackTimedOut={callbackTimedOut}
                    callbackStatusMsg={callbackStatusMsg}
                    onRetryCallback={retryCallbackExchange}
                    onCancelCallback={cancelCallbackAndRedirect}
                  />
                ) : !user.isAdmin ? (
                  /* 权限边界：若已登录但非 ADMIN_USER 变量指定用户，显示友好导流界面 */
                  <div className="max-w-xl mx-auto my-12 p-6 sm:p-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-center space-y-4 font-mono">
                    <div className="h-12 w-12 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20">
                      <ShieldAlert className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100">
                        当前账号为访客开发者身份
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        系统已启用权限边界保护：只有在 Cloudflare Pages 环境变量中配置了 <code>ADMIN_USER</code> 的 GitHub 账号才享有系统管理中枢权限。
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-600 dark:text-zinc-400 text-left space-y-1">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-200">💡 站点所有者配置提示:</div>
                      <p className="text-[11px] leading-relaxed">
                        若您是该站点的管理者，请前往 Cloudflare Pages 设置 -&gt; 环境变量，添加 <code>ADMIN_USER={user.login}</code> 并执行 Redeploy 重新部署。
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => setViewMode('user')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-xs transition-colors"
                      >
                        进入我的访客工作台 (查看提交与评论)
                      </button>
                      <button
                        onClick={() => setViewMode('public')}
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs cursor-pointer transition-colors"
                      >
                        返回公开展示
                      </button>
                    </div>
                  </div>
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
                      handleSelectKnowledgeId(id);
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
                    onSelectId={handleSelectKnowledgeId}
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
                    onDeleteRepo={handleDeleteRepo}
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
                    submissions={submissions}
                    comments={allComments}
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
          handleSelectKnowledgeId(id);
          if (viewMode === 'admin') {
            setActiveTab('knowledge');
          } else {
            setSelectedDocId(id);
          }
        }}
        onSelectProject={() => {
          if (viewMode === 'admin') {
            setActiveTab('projects');
          } else {
            setPublicSection('projects');
          }
        }}
        onSelectRepo={() => {
          if (viewMode === 'admin') {
            setActiveTab('github');
          } else {
            setPublicSection('projects');
          }
        }}
      />

      {/* Visitor Repository Submission Modal */}
      <SubmissionModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        user={user}
        onSubmitRepo={async (params) => {
          const res = await submitRepo(params);
          if (res.success && res.submission) {
            // 若为管理员发布或已直接批准展示，同步自动纳管为系统核心资产卡片
            if (res.submission.status === 'approved' || user?.isAdmin) {
              const newGhRepo: GitHubRepository = {
                id: `repo-sub-${Date.now()}`,
                github_id: Date.now(),
                owner: res.submission.owner,
                name: res.submission.name,
                full_name: res.submission.full_name,
                description: res.submission.description || '精选开源仓库',
                html_url: res.submission.repo_url,
                homepage: res.submission.homepage,
                language: res.submission.language || 'TypeScript',
                license: 'MIT',
                stars: res.submission.stars || 0,
                forks: 0,
                watchers: res.submission.stars || 0,
                open_issues: 0,
                default_branch: 'main',
                is_private: false,
                is_fork: false,
                topics: [res.submission.language || 'code', 'open-source'],
                created_at: res.submission.created_at,
                updated_at: res.submission.created_at,
                pushed_at: res.submission.created_at,
                last_synced_at: new Date().toISOString(),
                sync_status: 'synced',
                auto_generate_card: true,
              };
              handleAddRepo(newGhRepo, true);
            }
          }
          return res;
        }}
        onSuccess={() => {
          fetchSubmissions();
        }}
      />

      {/* Repository Comments & Discussion Modal */}
      {selectedCommentRepo && (
        <RepoCommentsModal
          isOpen={Boolean(selectedCommentRepo)}
          onClose={() => setSelectedCommentRepo(null)}
          repoId={selectedCommentRepo.repoId}
          repoName={selectedCommentRepo.repoName}
          repoUrl={selectedCommentRepo.repoUrl}
          comments={activeRepoComments}
          user={user}
          onAddComment={async (content) => {
            return await addComment({
              repo_id: selectedCommentRepo.repoId,
              repo_name: selectedCommentRepo.repoName,
              content,
              author_login: user?.login || '',
              author_name: user?.name || user?.login || '',
              author_avatar: user?.avatar_url || '',
              author_role: user?.isAdmin ? 'admin' : 'visitor',
            });
          }}
          onDeleteComment={async (id) => {
            return await deleteComment(id, user?.login);
          }}
          onRequireLogin={() => {
            setSelectedCommentRepo(null);
            setViewMode('admin');
          }}
        />
      )}

      {/* Global Keyboard Shortcut for Ctrl+K */}
      <GlobalKeyboardListener onOpenSearch={() => setIsSearchOpen(true)} />

      {/* PWA Connectivity Status Banner */}
      <OfflineIndicator />

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
