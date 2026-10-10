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
  Clock
} from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository } from '../types';
import { GitHubUser } from '../types/auth';

interface PublicShowcaseProps {
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  onGoToAdmin: () => void;
  onOpenSearch: () => void;
  user: GitHubUser | null;
}

export const PublicShowcase: React.FC<PublicShowcaseProps> = ({
  knowledge,
  projects,
  repos,
  onGoToAdmin,
  onOpenSearch,
  user,
}) => {
  const [activeSection, setActiveSection] = useState<'all' | 'projects' | 'knowledge'>('all');
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
            <span>{projects.length} 个项目</span>
            <span>·</span>
            <span>{knowledge.length} 篇手记</span>
          </div>
        </div>
      </div>

      {/* 2. Navigation Pills: All / Projects / Knowledge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2 gap-2.5">
        <div className="flex items-center space-x-1.5 text-xs font-mono overflow-x-auto scrollbar-none pb-1 sm:pb-0 -mx-1 px-1">
          {[
            { id: 'all', label: '全部精选' },
            { id: 'projects', label: `开源项目 (${projects.length})` },
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

        <button
          onClick={onOpenSearch}
          className="text-xs font-mono text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1"
        >
          <Search className="h-3.5 w-3.5" />
          <span>全局检索</span>
        </button>
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

      {/* 4. Public Knowledge Base Reader */}
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

            <div>
              <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {activeDoc.title}
              </h1>
              {activeDoc.summary && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 border-l-2 border-zinc-300 dark:border-zinc-700 pl-3 italic">
                  {activeDoc.summary}
                </p>
              )}
            </div>

            <div className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-300 text-xs sm:text-sm leading-relaxed space-y-3 pt-2">
              {renderReaderMarkdown(activeDoc.content)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

function renderReaderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCode = false;
  let codeLines: string[] = [];

  lines.forEach((line, idx) => {
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        elements.push(
          <div key={`code-${idx}`} className="my-2 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-2.5 font-mono text-xs text-zinc-800 dark:text-zinc-200 overflow-x-auto">
            <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
          </div>
        );
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith('# ')) {
      elements.push(<h2 key={idx} className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-4 mb-1">{line.replace('# ', '')}</h2>);
    } else if (line.startsWith('## ')) {
      elements.push(<h3 key={idx} className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100 mt-3 mb-1">{line.replace('## ', '')}</h3>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-zinc-700 dark:text-zinc-300">{line.replace(/^[-*]\s*/, '')}</li>);
    } else if (line.trim() === '') {
      elements.push(<div key={idx} className="h-1" />);
    } else {
      elements.push(<p key={idx} className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{line}</p>);
    }
  });

  return elements;
}
