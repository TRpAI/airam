import React, { useState, useEffect, useMemo } from 'react';
import { 
  GitBranch, 
  Star, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  BookOpen, 
  MessageSquare, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Globe, 
  Terminal,
  AlertCircle
} from 'lucide-react';
import { marked } from 'marked';
import { RepoSubmission } from '../types';

interface RepoDetailModalProps {
  repo: RepoSubmission | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenComments?: (repoId: string, repoName: string, repoUrl?: string) => void;
  commentCount?: number;
}

// In-memory cache for fetched README documents
const readmeCache: Record<string, string> = {};

export const RepoDetailModal: React.FC<RepoDetailModalProps> = ({
  repo,
  isOpen,
  onClose,
  onOpenComments,
  commentCount = 0,
}) => {
  const [readme, setReadme] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedClone, setCopiedClone] = useState<boolean>(false);
  const [copiedReadme, setCopiedReadme] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'readme' | 'meta'>('readme');

  const fullName = repo?.full_name || (repo ? `${repo.owner}/${repo.name}` : '');

  // Fetch README
  const loadReadme = async (forceRefresh = false) => {
    if (!repo || !fullName) return;

    if (!forceRefresh && readmeCache[fullName]) {
      setReadme(readmeCache[fullName]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const parts = fullName.split('/');
    const owner = parts[0] || repo.owner;
    const name = parts[1] || repo.name;

    try {
      // 1. Try server proxy endpoint
      const res = await fetch(`/api/github/readme?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.readme) {
          readmeCache[fullName] = data.readme;
          setReadme(data.readme);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: try raw.githubusercontent directly from client
      const rawRes = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/HEAD/README.md`);
      if (rawRes.ok) {
        const rawText = await rawRes.text();
        if (rawText && rawText.length > 0) {
          readmeCache[fullName] = rawText;
          setReadme(rawText);
          setLoading(false);
          return;
        }
      }

      throw new Error(`未能获取到该项目的 README 文档`);
    } catch (err: any) {
      setError(err.message || '获取 README 失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && repo) {
      loadReadme();
    }
  }, [isOpen, repo?.id, fullName]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Parse Markdown to HTML
  const parsedHtml = useMemo(() => {
    if (!readme) return '';
    try {
      return marked.parse(readme, {
        gfm: true,
        breaks: true,
      }) as string;
    } catch {
      return '';
    }
  }, [readme]);

  if (!isOpen || !repo) return null;

  const cloneCommand = `git clone ${repo.repo_url}.git`;

  const handleCopyClone = () => {
    navigator.clipboard.writeText(cloneCommand);
    setCopiedClone(true);
    setTimeout(() => setCopiedClone(false), 2000);
  };

  const handleCopyReadme = () => {
    if (!readme) return;
    navigator.clipboard.writeText(readme);
    setCopiedReadme(true);
    setTimeout(() => setCopiedReadme(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/80 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={repo.repo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors truncate"
                  title="在 GitHub 上打开仓库"
                >
                  <GitBranch className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{repo.full_name}</span>
                  <ExternalLink className="h-3 w-3 text-zinc-400 shrink-0" />
                </a>

                {repo.status === 'approved' && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold">
                    <ShieldCheck className="h-3 w-3" />
                    <span>社区审核准入</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans line-clamp-2">
                {repo.description || '精选开源技术方案与研发中枢资产'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="关闭 (ESC)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Quick Metrics & Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs font-mono text-zinc-500">
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-amber-500 font-semibold">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{repo.stars.toLocaleString()} Stars</span>
              </span>
              <span>·</span>
              <span className="text-zinc-600 dark:text-zinc-300 font-medium">
                {repo.language || 'TypeScript'}
              </span>
              {repo.homepage && (
                <>
                  <span>·</span>
                  <a
                    href={repo.homepage}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                  >
                    <Globe className="h-3 w-3" />
                    <span>官网主页</span>
                  </a>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyClone}
                className="flex items-center gap-1 px-2.5 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer text-[11px]"
                title={cloneCommand}
              >
                <Terminal className="h-3 w-3 text-zinc-400" />
                <span>{copiedClone ? '已复制命令' : '克隆仓库'}</span>
                {copiedClone ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-zinc-400" />}
              </button>

              <button
                onClick={() => onOpenComments?.(repo.name || repo.full_name, repo.full_name, repo.repo_url)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors cursor-pointer text-[11px]"
              >
                <MessageSquare className="h-3 w-3" />
                <span>项目讨论 ({commentCount})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Submitter Recommendation & Review Quote Callout */}
        <div className="px-4 sm:px-6 py-3 bg-zinc-50/70 dark:bg-zinc-950/40 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <img
              src={repo.submitter_avatar || `https://github.com/${repo.submitter_login}.png`}
              alt={repo.submitter_login}
              className="h-5 w-5 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
            />
            <span className="text-zinc-500">推荐人:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">@{repo.submitter_login}</span>
            {repo.submitter_note && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">|</span>
                <span className="text-zinc-600 dark:text-zinc-400 font-sans italic line-clamp-1">
                  “{repo.submitter_note}”
                </span>
              </>
            )}
          </div>

          {repo.review_comment && (
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>评审: {repo.review_comment}</span>
            </div>
          )}
        </div>

        {/* Tab Selector & Document Actions */}
        <div className="px-4 sm:px-6 py-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900 text-xs font-mono">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('readme')}
              className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition-colors cursor-pointer ${
                activeTab === 'readme'
                  ? 'border-emerald-500 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>README 文档</span>
            </button>

            <button
              onClick={() => setActiveTab('meta')}
              className={`flex items-center gap-1.5 py-1 border-b-2 font-medium transition-colors cursor-pointer ${
                activeTab === 'meta'
                  ? 'border-emerald-500 text-zinc-900 dark:text-zinc-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>仓库档案与提交元信息</span>
            </button>
          </div>

          {activeTab === 'readme' && readme && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadReadme(true)}
                disabled={loading}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                title="重新拉取最新 README"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
              </button>

              <button
                onClick={handleCopyReadme}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="复制原始 Markdown 内容"
              >
                {copiedReadme ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                <span>{copiedReadme ? '已复制' : '复制 Markdown'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-7 space-y-4">
          
          {/* Tab 1: README Content */}
          {activeTab === 'readme' && (
            <div>
              {loading && (
                <div className="py-16 text-center space-y-3 font-mono">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin text-emerald-500" />
                  <p className="text-xs text-zinc-500">正在从 GitHub 获取 {fullName} 的官方 README 文档...</p>
                </div>
              )}

              {!loading && error && (
                <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/10 text-center space-y-3 font-mono text-xs text-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-6 w-6 mx-auto text-amber-500" />
                  <p className="font-semibold">{error}</p>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[11px] max-w-md mx-auto">
                    可能由于该仓库未包含 README.md 或 GitHub 接口限流。您可以直接前往 GitHub 仓库主页查阅源码与说明。
                  </p>
                  <div className="pt-2">
                    <a
                      href={repo.repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 font-medium"
                    >
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>在 GitHub 浏览仓库</span>
                    </a>
                  </div>
                </div>
              )}

              {!loading && !error && readme && (
                <div 
                  className="prose prose-zinc dark:prose-invert max-w-none text-xs sm:text-sm leading-relaxed font-sans
                    prose-headings:font-mono prose-headings:font-bold prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100
                    prose-h1:text-xl sm:prose-h1:text-2xl prose-h1:border-b prose-h1:border-zinc-200 dark:prose-h1:border-zinc-800 prose-h1:pb-2
                    prose-h2:text-lg sm:prose-h2:text-xl prose-h2:border-b prose-h2:border-zinc-100 dark:prose-h2:border-zinc-800/80 prose-h2:pb-1.5
                    prose-code:font-mono prose-code:text-[11px] prose-code:bg-zinc-100 dark:prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                    prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:rounded-xl prose-pre:border prose-pre:border-zinc-800 prose-pre:p-4
                    prose-a:text-emerald-600 dark:prose-a:text-emerald-400 prose-a:underline hover:prose-a:no-underline
                    prose-img:rounded-lg prose-img:max-h-96 prose-img:object-contain"
                  dangerouslySetInnerHTML={{ __html: parsedHtml }}
                />
              )}
            </div>
          )}

          {/* Tab 2: Meta Profile Details */}
          {activeTab === 'meta' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
                  <span className="text-zinc-400 text-[11px]">仓库名称</span>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{repo.full_name}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
                  <span className="text-zinc-400 text-[11px]">GitHub 星标数</span>
                  <div className="font-bold text-amber-500 text-sm flex items-center gap-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{repo.stars.toLocaleString()} Stars</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
                  <span className="text-zinc-400 text-[11px]">主开发语言</span>
                  <div className="font-bold text-zinc-900 dark:text-zinc-100">{repo.language || '未知'}</div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5">
                  <span className="text-zinc-400 text-[11px]">提交时间</span>
                  <div className="text-zinc-700 dark:text-zinc-300">
                    {repo.created_at ? new Date(repo.created_at).toLocaleString() : '最近'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5 sm:col-span-2">
                  <span className="text-zinc-400 text-[11px]">推荐理由 / 开发者评价</span>
                  <p className="text-zinc-700 dark:text-zinc-300 font-sans leading-relaxed">
                    {repo.submitter_note || '暂无推荐备注'}
                  </p>
                </div>

                {repo.review_comment && (
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1.5 sm:col-span-2">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      <span>审核评价 ({repo.reviewed_by ? `@${repo.reviewed_by}` : '管理员'})</span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 font-sans">
                      {repo.review_comment}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-zinc-400 text-[11px]">Git 仓库协议地址:</span>
                <span className="text-zinc-600 dark:text-zinc-300 select-all">{repo.repo_url}</span>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs font-mono">
          <div className="text-zinc-400 text-[11px]">
            <span>按 ESC 或点击空白处关闭</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={repo.repo_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shadow-xs"
            >
              <GitBranch className="h-3.5 w-3.5 text-emerald-500" />
              <span>前往 GitHub 仓库</span>
              <ExternalLink className="h-3 w-3 text-zinc-400" />
            </a>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium hover:opacity-90 transition-opacity cursor-pointer"
            >
              关闭
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
