import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, FileText, FolderKanban, GitFork, ArrowRight, CornerDownLeft } from 'lucide-react';
import { KnowledgeItem, Project, GitHubRepository } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledge: KnowledgeItem[];
  projects: Project[];
  repos: GitHubRepository[];
  onSelectKnowledge: (id: string) => void;
  onSelectProject: (id: string) => void;
  onSelectRepo: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  knowledge,
  projects,
  repos,
  onSelectKnowledge,
  onSelectProject,
  onSelectRepo,
}) => {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'knowledge' | 'projects' | 'repos'>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const matchedKnowledge = (filterType === 'all' || filterType === 'knowledge')
      ? knowledge
          .filter(
            (k) =>
              k.title.toLowerCase().includes(q) ||
              k.summary.toLowerCase().includes(q) ||
              k.content.toLowerCase().includes(q) ||
              k.tags.some((t) => t.toLowerCase().includes(q))
          )
          .map((k) => ({
            id: k.id,
            category: 'knowledge' as const,
            title: k.title,
            subtitle: k.summary || k.content.slice(0, 90),
            meta: `${k.type} · ${k.tags.join(', ')}`,
          }))
      : [];

    const matchedProjects = (filterType === 'all' || filterType === 'projects')
      ? projects
          .filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.one_liner.toLowerCase().includes(q) ||
              p.tech_stack.some((t) => t.toLowerCase().includes(q))
          )
          .map((p) => ({
            id: p.id,
            category: 'projects' as const,
            title: p.name,
            subtitle: p.one_liner,
            meta: `${p.tech_stack.join(' · ')} · ${p.rating}★`,
          }))
      : [];

    const matchedRepos = (filterType === 'all' || filterType === 'repos')
      ? repos
          .filter(
            (r) =>
              r.name.toLowerCase().includes(q) ||
              r.description.toLowerCase().includes(q) ||
              r.language.toLowerCase().includes(q) ||
              r.topics.some((t) => t.toLowerCase().includes(q))
          )
          .map((r) => ({
            id: r.id,
            category: 'repos' as const,
            title: r.full_name,
            subtitle: r.description,
            meta: `${r.language} · ⭐ ${r.stars}`,
          }))
      : [];

    return [...matchedKnowledge, ...matchedProjects, ...matchedRepos];
  }, [query, filterType, knowledge, projects, repos]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 bg-zinc-950/50 backdrop-blur-xs animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar */}
        <div className="flex items-center px-3.5 py-3 sm:py-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <Search className="h-4 w-4 text-zinc-400 mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="全文检索 (如: D1, Workers, Webhook)..."
            className="w-full bg-transparent text-sm sm:text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-mono"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 min-h-[32px] min-w-[32px] flex items-center justify-center active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-2 text-[10px] px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 font-mono active:scale-95"
          >
            关闭
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-3.5 py-2 sm:py-1.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs sm:text-[11px] font-mono">
          <div className="flex gap-1.5 sm:gap-1">
            {(['all', 'knowledge', 'projects', 'repos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-2.5 py-1 sm:py-0.5 rounded transition-colors ${
                  filterType === tab
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800/60'
                }`}
              >
                {tab === 'all' && '全部'}
                {tab === 'knowledge' && '知识'}
                {tab === 'projects' && '项目'}
                {tab === 'repos' && 'GitHub'}
              </button>
            ))}
          </div>
          <span className="text-zinc-400 text-[10px] hidden sm:inline">D1 FTS5 引擎</span>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-1.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {query.trim() === '' ? (
            <div className="py-10 text-center text-zinc-400 text-xs font-mono">
              输入关键词检索 D1 知识与项目
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs font-mono">
              未找到与 &quot;{query}&quot; 匹配的内容
            </div>
          ) : (
            searchResults.map((item) => (
              <div
                key={`${item.category}-${item.id}`}
                onClick={() => {
                  if (item.category === 'knowledge') onSelectKnowledge(item.id);
                  if (item.category === 'projects') onSelectProject(item.id);
                  if (item.category === 'repos') onSelectRepo(item.id);
                  onClose();
                }}
                className="group flex items-start gap-2.5 p-2.5 rounded hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
              >
                <div className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">
                  {item.category === 'knowledge' && <FileText className="h-3.5 w-3.5" />}
                  {item.category === 'projects' && <FolderKanban className="h-3.5 w-3.5" />}
                  {item.category === 'repos' && <GitFork className="h-3.5 w-3.5" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4 className="text-xs font-medium text-zinc-900 dark:text-zinc-100 group-hover:underline truncate">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-1 mt-0.5">
                    {item.subtitle}
                  </p>
                  <p className="text-[10px] font-mono text-zinc-400 mt-0.5">
                    {item.meta}
                  </p>
                </div>

                <ArrowRight className="h-3.5 w-3.5 text-zinc-400 self-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex items-center justify-between text-[10px] text-zinc-400 font-mono">
          <span>共 {searchResults.length} 条结果</span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="h-2.5 w-2.5" /> 回车进入
          </span>
        </div>
      </div>
    </div>
  );
};
