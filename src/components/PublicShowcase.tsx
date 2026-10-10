import React, { useState, useMemo } from 'react';
import { 
  FolderGit2, 
  FileText, 
  ExternalLink, 
  GitBranch, 
  Star, 
  Search, 
  ArrowRight,
  Layers,
  Sparkles,
  BookOpen,
  Copy,
  Check,
  Clock,
  Plus,
  Users,
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository, RepoSubmission } from '../types';
import { GitHubUser } from '../types/auth';

interface PublicShowcaseProps {
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  approvedSubmissions?: RepoSubmission[];
  onGoToAdmin: () => void;
  onOpenSearch: () => void;
  onOpenSubmitRepo: () => void;
  user: GitHubUser | null;
}

export const PublicShowcase: React.FC<PublicShowcaseProps> = ({
  knowledge,
  projects,
  repos,
  approvedSubmissions = [],
  onGoToAdmin,
  onOpenSearch,
  onOpenSubmitRepo,
  user,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'projects' | 'community' | 'knowledge'>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Selected note for reader modal/view
  const activeDoc = useMemo(() => {
    if (!selectedDocId) return null;
    return knowledge.find((k) => k.id === selectedDocId) || null;
  }, [knowledge, selectedDocId]);

  const totalStars = repos.reduce((acc, r) => acc + r.stars, 0);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-150">
      
      {/* 1. Developer Hero Card (Minimalist & Punchy) */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-zinc-200 dark:border-zinc-800 overflow-hidden shrink-0 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100 shadow-xs">
              {user ? (
                <img src={user.avatar_url} alt={user.login} className="h-full w-full object-cover" />
              ) : (
                <span className="text-emerald-500 font-bold">AI</span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {user ? user.name : 'Osa Hermes'}
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-500">
                  @{user ? user.login : 'osahermes'}
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                全栈独立开发者 · 聚焦于 Cloudflare Workers、边缘 Serverless 架构与高质量研发资产沉淀。
              </p>
            </div>
          </div>

          {/* Action: Submit Repository Button */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={onOpenSubmitRepo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>提交开源仓库</span>
            </button>
          </div>
        </div>

        {/* Public Stack & Stats Inline Bar */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono text-zinc-500">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">TypeScript</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">Cloudflare D1</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">Workers</span>
            <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px]">React</span>
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3 text-zinc-600 dark:text-zinc-400 text-[11px] sm:text-xs">
            <span>⭐ {totalStars} Stars</span>
            <span>·</span>
            <span>{projects.length} 个核心项目</span>
            <span>·</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {approvedSubmissions.length} 个社区推荐
            </span>
            <span>·</span>
            <span>{knowledge.length} 篇手记</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Pills: All / Projects / Community / Knowledge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-2.5">
        <div className="flex items-center space-x-1.5 text-xs font-mono overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
          {[
            { id: 'all', label: '全部精选' },
            { id: 'projects', label: `核心项目 (${projects.length})` },
            { id: 'community', label: `社区推荐 (${approvedSubmissions.length})` },
            { id: 'knowledge', label: `知识手记 (${knowledge.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap min-h-[32px] text-xs ${
                activeSection === tab.id
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100/60 dark:bg-zinc-800/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
          >
            <Search className="h-3.5 w-3.5" />
            <span>全局检索</span>
          </button>
        </div>
      </div>

      {/* 3. Featured Projects Showcase */}
      {(activeSection === 'all' || activeSection === 'projects') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              精选研发项目
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">真实代码资产</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => {
              const matchedRepo = repos.find((r) => r.id === proj.repository_id);
              return (
                <div
                  key={proj.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between hover:border-zinc-400 dark:hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                            {proj.name}
                          </h3>
                          {proj.latest_version && (
                            <span className="text-[10px] font-mono text-zinc-400">
                              {proj.latest_version}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                          {proj.one_liner}
                        </p>
                      </div>

                      <span className="text-xs font-mono text-zinc-500 shrink-0">
                        {proj.rating}.0★
                      </span>
                    </div>

                    {/* Tech Stacks */}
                    <div className="mt-3 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {proj.tech_stack.join(' · ')}
                    </div>

                    {/* Features */}
                    <ul className="mt-3 space-y-1">
                      {proj.features.slice(0, 3).map((f, i) => (
                        <li key={i} className="text-xs text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                          <span className="text-zinc-400">-</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Card Bottom Links */}
                  <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className={`h-1.5 w-1.5 rounded-full ${proj.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                      <span>{proj.status === 'active' ? '活跃' : '维护'}</span>
                    </span>

                    <div className="flex items-center gap-3">
                      {matchedRepo && (
                        <a
                          href={matchedRepo.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
                        >
                          <GitBranch className="h-3 w-3" />
                          <span>GitHub ({matchedRepo.stars}★)</span>
                        </a>
                      )}
                      {proj.homepage && (
                        <a
                          href={proj.homepage}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1"
                        >
                          <span>主页</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Community & Visitor Approved Submissions Showcase */}
      {(activeSection === 'all' || activeSection === 'community') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                <Users className="h-4 w-4 text-emerald-500" />
                <span>社区共建与访客推荐开源</span>
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                管理员审核准入
              </span>
            </div>
            <button
              onClick={onOpenSubmitRepo}
              className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>我也要提交仓库</span>
            </button>
          </div>

          {approvedSubmissions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center space-y-2">
              <p className="text-xs font-mono text-zinc-500">
                暂无已准入的社区推荐仓库。
              </p>
              <button
                onClick={onOpenSubmitRepo}
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 underline hover:no-underline"
              >
                成为第一个提交并获准展示的开发者
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col justify-between hover:border-emerald-500/50 transition-colors shadow-xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 truncate">
                            {sub.full_name}
                          </h3>
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {sub.description || '暂无描述'}
                        </p>
                      </div>

                      <span className="flex items-center gap-1 text-xs font-mono text-amber-500 shrink-0">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{sub.stars.toLocaleString()}</span>
                      </span>
                    </div>

                    {/* Submitter Recommendation Note */}
                    {sub.submitter_note && (
                      <div className="mt-3 p-2 rounded bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 text-[11px] font-mono text-zinc-600 dark:text-zinc-400 flex items-start gap-1.5">
                        <MessageSquare className="h-3 w-3 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{sub.submitter_note}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-4 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={sub.submitter_avatar || `https://github.com/${sub.submitter_login}.png`}
                        alt={sub.submitter_login}
                        className="h-3.5 w-3.5 rounded-full border border-zinc-300 dark:border-zinc-700"
                      />
                      <span>由 @{sub.submitter_login} 推荐</span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {sub.language && (
                        <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px]">
                          {sub.language}
                        </span>
                      )}
                      <a
                        href={sub.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>查看仓库</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. Public Knowledge Base Reader */}
      {(activeSection === 'all' || activeSection === 'knowledge') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 uppercase tracking-wide">
              公开技术手记与架构文档
            </h2>
            <span className="text-[11px] font-mono text-zinc-400">点击查阅全文</span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900/30 overflow-hidden">
            {knowledge.map((k) => (
              <div
                key={k.id}
                onClick={() => setSelectedDocId(k.id)}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs sm:text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 hover:underline">
                      {k.title}
                    </h3>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">
                      {k.type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                    {k.summary || k.content.slice(0, 80)}
                  </p>
                  <div className="text-[11px] font-mono text-zinc-400 space-x-2">
                    <span>{k.tags.map((t) => `#${t}`).join(' ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 self-end sm:self-center text-xs font-mono text-zinc-400">
                  <span>{new Date(k.updated_at).toLocaleDateString()}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Article Reader Modal (Clean Minimalist Reader) */}
      {activeDoc && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedDocId(null)}
        >
          <div 
            className="w-full max-w-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-4 sm:p-7 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <span className="text-xs font-mono text-zinc-400 uppercase">
                {activeDoc.type} · {new Date(activeDoc.updated_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(activeDoc.content)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[36px] min-w-[36px] flex items-center justify-center active:scale-95"
                  title="复制 Markdown"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setSelectedDocId(null)}
                  className="text-xs font-mono px-2.5 py-1.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 min-h-[36px] flex items-center justify-center active:scale-95"
                >
                  关闭 (ESC)
                </button>
              </div>
            </div>

            <div className="space-y-4 font-mono">
              <h1 className="text-base sm:text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {activeDoc.title}
              </h1>

              <div className="flex flex-wrap gap-1.5">
                {activeDoc.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    #{t}
                  </span>
                ))}
              </div>

              <div className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans text-zinc-700 dark:text-zinc-300">
                {activeDoc.content}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
