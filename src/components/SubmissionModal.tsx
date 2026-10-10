import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  GitBranch, 
  Star, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { GitHubUser } from '../types/auth';
import { RepoSubmission } from '../types';

interface SubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: GitHubUser | null;
  onSubmitRepo: (params: {
    repo_url: string;
    submitter_login: string;
    submitter_avatar?: string;
    submitter_note?: string;
  }) => Promise<{ success: boolean; submission?: RepoSubmission; error?: string; retryAfter?: number }>;
  onSuccess?: (submission: RepoSubmission) => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({
  isOpen,
  onClose,
  user,
  onSubmitRepo,
  onSuccess,
}) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [submitterLogin, setSubmitterLogin] = useState(user?.login || '');
  const [submitterNote, setSubmitterNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);
  const [successSubmission, setSuccessSubmission] = useState<RepoSubmission | null>(null);

  // Live parsed preview
  const [parsedPreview, setParsedPreview] = useState<{
    owner: string;
    name: string;
    description?: string;
    stars?: number;
    language?: string;
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cooldownTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync login name when user changes
  useEffect(() => {
    if (user?.login) {
      setSubmitterLogin(user.login);
    }
  }, [user]);

  // Handle cooldown countdown
  useEffect(() => {
    if (cooldown > 0) {
      cooldownTimerRef.current = setTimeout(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => {
      if (cooldownTimerRef.current) clearTimeout(cooldownTimerRef.current);
    };
  }, [cooldown]);

  // Live GitHub repo preview fetcher
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const cleanInput = repoUrl.trim();
    if (!cleanInput) {
      setParsedPreview(null);
      return;
    }

    // Try parsing owner and repo name
    let parsedInput = cleanInput.replace(/\.git$/i, '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^github\.com\//i, '').replace(/\/$/, '');
    const parts = parsedInput.split('/');

    if (parts.length >= 2 && parts[0] && parts[1]) {
      const owner = parts[0];
      const name = parts[1];

      debounceTimerRef.current = setTimeout(async () => {
        setPreviewLoading(true);
        try {
          const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
            headers: { Accept: 'application/vnd.github.v3+json' },
          });
          if (res.ok) {
            const data = await res.json();
            setParsedPreview({
              owner,
              name,
              description: data.description || '暂无描述',
              stars: data.stargazers_count,
              language: data.language || 'Markdown',
            });
            setError(null);
          } else {
            setParsedPreview({ owner, name });
          }
        } catch {
          setParsedPreview({ owner, name });
        } finally {
          setPreviewLoading(false);
        }
      }, 500);
    } else {
      setParsedPreview(null);
    }

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [repoUrl]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) {
      setError('请输入 GitHub 仓库地址');
      return;
    }

    const loginToUse = (submitterLogin || user?.login || 'guest').trim();
    if (!loginToUse) {
      setError('请提供提交人 GitHub 用户名');
      return;
    }

    setLoading(true);
    setError(null);

    const result = await onSubmitRepo({
      repo_url: repoUrl.trim(),
      submitter_login: loginToUse,
      submitter_avatar: user?.avatar_url || `https://github.com/${loginToUse}.png`,
      submitter_note: submitterNote.trim() || undefined,
    });

    setLoading(false);

    if (result.success && result.submission) {
      setSuccessSubmission(result.submission);
      if (onSuccess) onSuccess(result.submission);
    } else {
      setError(result.error || '提交失败');
      if (result.retryAfter) {
        setCooldown(result.retryAfter);
      }
    }
  };

  const handleReset = () => {
    setSuccessSubmission(null);
    setRepoUrl('');
    setSubmitterNote('');
    setError(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <GitBranch className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                推荐开源仓库
              </h2>
              <p className="text-[11px] font-mono text-zinc-500">
                访客提交仓库 · 管理员审核批准后在前台精选展示
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-4">

          {/* Success State Screen */}
          {successSubmission ? (
            <div className="text-center py-4 space-y-4 animate-in fade-in">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  仓库提交成功！
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                    {successSubmission.full_name}
                  </span> 已进入待审核队列。
                  管理员审核批准后，将在前台精选栏目永久展示并署名您的推荐贡献。
                </p>
              </div>

              {/* Submission Snapshot */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-3.5 text-left text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">状态</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                    ⏳ 待管理员审核
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">提交人</span>
                  <span className="text-zinc-800 dark:text-zinc-200">@{successSubmission.submitter_login}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">仓库地址</span>
                  <a 
                    href={successSubmission.repo_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>{successSubmission.full_name}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3.5 py-1.5 rounded-md text-xs font-mono text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                >
                  继续提交其他仓库
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 rounded-md text-xs font-mono bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 font-medium shadow-xs"
                >
                  完成并关闭
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Rate Limiting & Approval Notice Banner */}
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 p-3 text-xs font-mono text-zinc-600 dark:text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-900 dark:text-zinc-200 font-semibold">
                  <Clock className="h-3.5 w-3.5 text-sky-500" />
                  <span>防滥用安全流控提示</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  每位访客每 10 分钟最多提交 3 个仓库（每次间隔需大于 20 秒）。
                  已提交的仓库需经过系统管理员审批通过后生效展示。
                </p>
                {cooldown > 0 && (
                  <div className="mt-2 text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold animate-pulse">
                    <Clock className="h-3 w-3" />
                    <span>冷却中：请等待 {cooldown} 秒后再进行提交</span>
                  </div>
                )}
              </div>

              {/* Input: GitHub Repository URL */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  GitHub 仓库地址或名称 <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="例如: https://github.com/facebook/react 或 facebook/react"
                    required
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  {previewLoading && (
                    <div className="absolute right-2.5 top-2.5 text-zinc-400">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  支持完整 HTTPS 链接或 "用户名/仓库名" 简写
                </span>
              </div>

              {/* Live Preview Card */}
              {parsedPreview && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs font-mono space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-emerald-500" />
                      {parsedPreview.owner}/{parsedPreview.name}
                    </span>
                    {typeof parsedPreview.stars === 'number' && (
                      <span className="flex items-center gap-1 text-amber-500 text-[11px]">
                        <Star className="h-3 w-3 fill-current" />
                        {parsedPreview.stars.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {parsedPreview.description && (
                    <p className="text-[11px] text-zinc-500 line-clamp-2">
                      {parsedPreview.description}
                    </p>
                  )}
                  {parsedPreview.language && (
                    <div className="text-[10px] text-zinc-400">
                      主要语言: <span className="text-zinc-600 dark:text-zinc-300">{parsedPreview.language}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Input: Submitter GitHub Login */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  提交人 GitHub 用户名 <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-zinc-400 text-xs font-mono">@</span>
                    <input
                      type="text"
                      value={submitterLogin}
                      onChange={(e) => setSubmitterLogin(e.target.value)}
                      placeholder="您的 GitHub 用户名"
                      required
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  {user && (
                    <span className="text-[10px] font-mono px-2 py-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                      已授权
                    </span>
                  )}
                </div>
              </div>

              {/* Input: Recommendation Note */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
                  推荐理由或架构亮点 <span className="text-zinc-400 font-normal">(选填)</span>
                </label>
                <textarea
                  value={submitterNote}
                  onChange={(e) => setSubmitterNote(e.target.value)}
                  placeholder="简述该项目的主要功能、核心技术栈或为什么推荐展示..."
                  rows={2}
                  maxLength={200}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-3.5 py-2 rounded-lg text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || cooldown > 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>正在验证提交...</span>
                    </>
                  ) : cooldown > 0 ? (
                    <>
                      <Clock className="h-3.5 w-3.5" />
                      <span>频率受限 ({cooldown}s)</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>提交审核</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
