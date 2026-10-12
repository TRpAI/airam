import React, { useState } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Trash2, 
  Clock, 
  ExternalLink, 
  LogIn, 
  ShieldCheck, 
  User, 
  Loader2 
} from 'lucide-react';
import { RepoComment } from '../types';
import { GitHubUser } from '../types/auth';

interface RepoCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  repoName: string;
  repoUrl?: string;
  comments: RepoComment[];
  user: GitHubUser | null;
  onAddComment: (content: string) => Promise<{ success: boolean; error?: string }>;
  onDeleteComment: (commentId: string) => Promise<{ success: boolean; error?: string }>;
  onRequireLogin: () => void;
}

export const RepoCommentsModal: React.FC<RepoCommentsModalProps> = ({
  isOpen,
  onClose,
  repoId,
  repoName,
  repoUrl,
  comments,
  user,
  onAddComment,
  onDeleteComment,
  onRequireLogin,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    if (!user) {
      onRequireLogin();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await onAddComment(content.trim());
      if (res.success) {
        setContent('');
      } else {
        setError(res.error || '发表评论失败');
      }
    } catch (err: any) {
      setError(err?.message || '网络异常');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const diffMs = Date.now() - d.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return '刚刚';
      if (diffMin < 60) return `${diffMin}分钟前`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour}小时前`;
      const diffDay = Math.floor(diffHour / 24);
      if (diffDay < 7) return `${diffDay}天前`;
      return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base font-mono text-zinc-900 dark:text-zinc-100 truncate max-w-[280px] sm:max-w-md">
                  {repoName}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {comments.length} 条评论
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                项目社区讨论与开发者见解
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {repoUrl && (
              <a
                href={repoUrl}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="在 GitHub 打开"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {comments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-10 w-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-xs font-mono text-zinc-500">
                暂无评论，成为第一位参与讨论的开发者！
              </p>
            </div>
          ) : (
            comments.map((comment) => {
              const isAuthor = user && user.login.toLowerCase() === comment.author_login.toLowerCase();
              const canDelete = isAuthor || (user && user.isAdmin);

              return (
                <div key={comment.id} className="pt-3.5 first:pt-0 group">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <img
                        src={comment.author_avatar || `https://github.com/${comment.author_login}.png`}
                        alt={comment.author_login}
                        className="h-6 w-6 rounded-full border border-zinc-200 dark:border-zinc-700 object-cover shrink-0"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                          {comment.author_name || comment.author_login}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          @{comment.author_login}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                          comment.author_role === 'admin'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
                        }`}>
                          {comment.author_role === 'admin' ? '系统管理员' : '访客开发者'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono shrink-0">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(comment.created_at)}</span>
                      </span>
                      {canDelete && (
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity p-0.5 rounded cursor-pointer"
                          title="删除此评论"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed pl-8 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Input Box / Login Guard */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60">
          {error && (
            <p className="mb-2 text-xs text-rose-500 font-mono">
              ⚠️ {error}
            </p>
          )}

          {user ? (
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="h-7 w-7 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover mt-1 shrink-0"
                />
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="分享你的见解、项目体验或建议... (支持 Markdown)"
                    rows={2}
                    className="w-full text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                <span className="text-[11px] text-zinc-400">
                  以 @{user.login} ({user.isAdmin ? '管理员' : '访客'}) 身份发布
                </span>
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  <span>发表评论</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-600 dark:text-zinc-400">
                <User className="h-4 w-4 text-emerald-500" />
                <span>系统已开启多用户交流：仅登录 GitHub 账号后才可参与讨论</span>
              </div>
              <button
                type="button"
                onClick={onRequireLogin}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-xs transition-colors cursor-pointer shrink-0 font-mono shadow-xs"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>使用 GitHub 登录以发表评论</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
