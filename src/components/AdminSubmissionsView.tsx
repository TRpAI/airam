import React, { useState } from 'react';
import { 
  GitBranch, 
  Check, 
  X, 
  Clock, 
  ExternalLink, 
  Star, 
  AlertCircle, 
  Trash2, 
  Plus, 
  Filter, 
  RefreshCw, 
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
  UserCheck
} from 'lucide-react';
import { RepoSubmission, SubmissionStatus } from '../types';
import { GitHubUser } from '../types/auth';
import { SubmissionStats } from '../hooks/useSubmissions';

interface AdminSubmissionsViewProps {
  submissions: RepoSubmission[];
  stats: SubmissionStats;
  loading: boolean;
  user: GitHubUser | null;
  onRefresh: () => void;
  onReview: (id: string, action: 'approve' | 'reject', comment?: string) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
  onOpenSubmitModal: () => void;
}

export const AdminSubmissionsView: React.FC<AdminSubmissionsViewProps> = ({
  submissions,
  stats,
  loading,
  user,
  onRefresh,
  onReview,
  onDelete,
  onOpenSubmitModal,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = Boolean(user?.isAdmin);

  const filteredList = submissions.filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    setFeedbackMsg(null);
    const res = await onReview(id, 'approve', '审核通过，准予在前台精选推荐展示');
    setActionLoading(null);
    if (res.success) {
      setFeedbackMsg({ text: '已成功批准该仓库在前台展示！', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ text: res.error || '审核操作失败', type: 'error' });
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalId) return;
    setActionLoading(rejectModalId);
    setFeedbackMsg(null);
    const res = await onReview(rejectModalId, 'reject', rejectReason || '项目规范或质量暂未达标');
    setActionLoading(null);
    setRejectModalId(null);
    setRejectReason('');
    if (res.success) {
      setFeedbackMsg({ text: '已驳回该仓库提交。', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ text: res.error || '操作失败', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要彻底删除该提交记录吗？')) return;
    setActionLoading(id);
    const res = await onDelete(id);
    setActionLoading(null);
    if (res.success) {
      setFeedbackMsg({ text: '记录已成功删除', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3500);
    } else {
      setFeedbackMsg({ text: res.error || '删除失败', type: 'error' });
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      
      {/* 1. Header Overview Card */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-emerald-500" />
                <span>开源仓库审核与准入中心</span>
              </h2>
              {isAdmin ? (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  <span>管理员已就绪</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700 flex items-center gap-1">
                  <UserCheck className="h-3 w-3" />
                  <span>访客提交看板</span>
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-2xl">
              {isAdmin
                ? '审核访客提交的 GitHub 开源仓库。批准后将自动同步到前台精选作品与知识库中展示。'
                : '访客可提交 GitHub 仓库地址参与知识中枢共建。提交需经系统管理员审核批准后在前台正式亮相。'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 bg-white dark:bg-zinc-900 shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              title="刷新列表"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onOpenSubmitModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>提交新仓库</span>
            </button>
          </div>
        </div>

        {/* Status Counters */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div 
            onClick={() => setFilterStatus('all')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              filterStatus === 'all' 
                ? 'border-zinc-900 bg-zinc-900/5 dark:border-zinc-100 dark:bg-zinc-100/5 font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="text-zinc-400 text-[10px]">全部提交</div>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">{stats.total}</div>
          </div>

          <div 
            onClick={() => setFilterStatus('pending')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              filterStatus === 'pending' 
                ? 'border-amber-500 bg-amber-500/10 font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="text-amber-600 dark:text-amber-400 text-[10px] flex items-center gap-1">
              <span>待审核</span>
              {stats.pendingCount > 0 && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <div className="text-sm font-bold text-amber-600 dark:text-amber-400 mt-0.5">{stats.pendingCount}</div>
          </div>

          <div 
            onClick={() => setFilterStatus('approved')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              filterStatus === 'approved' 
                ? 'border-emerald-500 bg-emerald-500/10 font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="text-emerald-600 dark:text-emerald-400 text-[10px]">已准入展示</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.approvedCount}</div>
          </div>

          <div 
            onClick={() => setFilterStatus('rejected')}
            className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
              filterStatus === 'rejected' 
                ? 'border-rose-500 bg-rose-500/10 font-semibold' 
                : 'border-zinc-200 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <div className="text-rose-500 text-[10px]">已驳回</div>
            <div className="text-sm font-bold text-rose-500 mt-0.5">{stats.rejectedCount}</div>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2 animate-in fade-in ${
          feedbackMsg.type === 'success' 
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
            : 'border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400'
        }`}>
          {feedbackMsg.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 2. Submissions List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 p-8 text-center space-y-3">
            <GitBranch className="h-8 w-8 text-zinc-400 mx-auto" />
            <div className="text-xs font-mono text-zinc-500">
              当前分类下暂无提交记录
            </div>
            <button
              onClick={onOpenSubmitModal}
              className="text-xs font-mono text-emerald-600 dark:text-emerald-400 underline hover:no-underline"
            >
              点击提交第一个 GitHub 仓库
            </button>
          </div>
        ) : (
          filteredList.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/30 p-4 sm:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors shadow-xs"
            >
              {/* Left Details */}
              <div className="space-y-2.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={item.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 group"
                  >
                    <span>{item.full_name}</span>
                    <ExternalLink className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                  </a>

                  {/* Status Badge */}
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    item.status === 'pending'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : item.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {item.status === 'pending' && '⏳ 待审核'}
                    {item.status === 'approved' && '✅ 已批准展示'}
                    {item.status === 'rejected' && '❌ 已驳回'}
                  </span>

                  {/* Stars & Language */}
                  <span className="flex items-center gap-1 text-xs font-mono text-amber-500">
                    <Star className="h-3 w-3 fill-current" />
                    <span>{item.stars.toLocaleString()}</span>
                  </span>

                  {item.language && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                      {item.language}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                  {item.description || '暂无项目描述'}
                </p>

                {/* Submitter Recommendation Note */}
                {item.submitter_note && (
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800/80 text-xs font-mono text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-zinc-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="text-zinc-400">推荐心声: </span>
                      <span>{item.submitter_note}</span>
                    </div>
                  </div>
                )}

                {/* Metadata Row: Submitter info & timestamps */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <img
                      src={item.submitter_avatar || `https://github.com/${item.submitter_login}.png`}
                      alt={item.submitter_login}
                      className="h-4 w-4 rounded-full border border-zinc-200 dark:border-zinc-700"
                    />
                    <span>提交人: @{item.submitter_login}</span>
                  </div>
                  <span>·</span>
                  <span>{new Date(item.created_at).toLocaleString()}</span>

                  {item.reviewed_at && (
                    <>
                      <span>·</span>
                      <span className="text-zinc-500">
                        由 @{item.reviewed_by || 'admin'} 于 {new Date(item.reviewed_at).toLocaleDateString()} 审核
                      </span>
                    </>
                  )}
                </div>

                {/* Review Remark */}
                {item.review_comment && (
                  <div className="text-[11px] font-mono text-zinc-500">
                    审核批注: {item.review_comment}
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex items-center md:flex-col justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-zinc-100 dark:border-zinc-800">
                {isAdmin ? (
                  <>
                    {item.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs disabled:opacity-50 transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>批准展示</span>
                        </button>
                        <button
                          onClick={() => setRejectModalId(item.id)}
                          disabled={actionLoading === item.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-mono border border-zinc-200 dark:border-zinc-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>驳回</span>
                        </button>
                      </>
                    )}

                    {item.status === 'approved' && (
                      <button
                        onClick={() => setRejectModalId(item.id)}
                        disabled={actionLoading === item.id}
                        className="px-2.5 py-1 text-[11px] font-mono text-zinc-500 hover:text-rose-500 transition-colors"
                      >
                        撤销批准
                      </button>
                    )}

                    {item.status === 'rejected' && (
                      <button
                        onClick={() => handleApprove(item.id)}
                        disabled={actionLoading === item.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Check className="h-3 w-3" />
                        <span>重新准入</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={actionLoading === item.id}
                      className="p-1.5 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      title="彻底删除此记录"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <span className="text-[11px] font-mono text-zinc-400">
                    等待管理员审核
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/75 backdrop-blur-xs animate-in fade-in"
          onClick={() => setRejectModalId(null)}
        >
          <div 
            className="w-full max-w-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100">
                驳回提交
              </h3>
              <button onClick={() => setRejectModalId(null)} className="text-zinc-400 hover:text-zinc-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-zinc-600 dark:text-zinc-400">
                请填写驳回原因（选填）:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="例如：非开源仓库、项目信息不全、或重复条目..."
                rows={3}
                className="w-full p-2.5 text-xs font-mono rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalId(null)}
                className="px-3 py-1.5 text-xs font-mono text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-3 py-1.5 text-xs font-mono bg-rose-600 hover:bg-rose-700 text-white rounded font-medium shadow-xs"
              >
                确认驳回
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
