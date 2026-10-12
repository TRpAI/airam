import React, { useState } from 'react';
import { 
  GitBranch, 
  MessageSquare, 
  User, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Star, 
  ShieldAlert, 
  LogOut, 
  Layers,
  ArrowRight,
  FolderGit2
} from 'lucide-react';
import { GitHubUser } from '../types/auth';
import { RepoSubmission, RepoComment } from '../types';

interface VisitorDashboardProps {
  user: GitHubUser;
  submissions: RepoSubmission[];
  comments: RepoComment[];
  onOpenSubmitModal: () => void;
  onOpenRepoComments: (repoId: string, repoName: string, repoUrl?: string) => void;
  onDeleteComment: (commentId: string) => Promise<{ success: boolean }>;
  onSwitchToPublic: () => void;
  onLogout: () => void;
}

export type VisitorTab = 'submissions' | 'comments' | 'account';

export const VisitorDashboard: React.FC<VisitorDashboardProps> = ({
  user,
  submissions,
  comments,
  onOpenSubmitModal,
  onOpenRepoComments,
  onDeleteComment,
  onSwitchToPublic,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<VisitorTab>('submissions');
  const [subFilter, setSubFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Filter submissions by current user and filter tab
  const userSubmissions = submissions.filter(s => s.submitter_login.toLowerCase() === user.login.toLowerCase());
  const filteredSubmissions = userSubmissions.filter(s => {
    if (subFilter === 'all') return true;
    return s.status === subFilter;
  });

  // Filter comments by current user
  const userComments = comments.filter(c => c.author_login.toLowerCase() === user.login.toLowerCase());

  const pendingCount = userSubmissions.filter(s => s.status === 'pending').length;
  const approvedCount = userSubmissions.filter(s => s.status === 'approved').length;
  const rejectedCount = userSubmissions.filter(s => s.status === 'rejected').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Visitor Profile & Role Header Banner */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="relative">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-14 w-14 rounded-2xl border-2 border-zinc-200 dark:border-zinc-700 object-cover shadow-xs"
              />
              <span 
                className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-sky-500 ring-2 ring-white dark:ring-zinc-900 flex items-center justify-center text-[9px] text-white font-bold"
                title="访客开发者身份"
              >
                V
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {user.name || user.login}
                </h1>
                <span className="text-xs font-mono text-zinc-400">
                  @{user.login}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-semibold">
                  访客开发者中心
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl leading-relaxed">
                欢迎进入您的专属工作台。在此管理您推荐提交的开源项目仓库、查看管理员审核批注及跟踪您的所有讨论评论。
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
            <button
              onClick={onOpenSubmitModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-colors cursor-pointer font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>提交新仓库</span>
            </button>
            <button
              onClick={onSwitchToPublic}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer font-mono"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>返回前台展示</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/60">
            <div className="text-[11px] text-zinc-400">提交仓库总数</div>
            <div className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {userSubmissions.length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">已批准精选</div>
            <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
              {approvedCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="text-[11px] text-amber-600 dark:text-amber-400">待审核中</div>
            <div className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5">
              {pendingCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-sky-500/5 border border-sky-500/20">
            <div className="text-[11px] text-sky-600 dark:text-sky-400">累计参与评论</div>
            <div className="text-base font-bold text-sky-600 dark:text-sky-400 mt-0.5">
              {userComments.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Permission Boundary Notice Banner */}
      <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-950/20 p-4 text-xs font-mono text-zinc-700 dark:text-zinc-300 flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-sky-600 dark:text-sky-400">
            关于管理员与访客用户的权限边界机制
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            系统已全面移除首位登入自动绑定管理员的机制。只有在 Cloudflare Pages 平台环境变量中配置了 <code>ADMIN_USER</code> 的 GitHub 账号才是系统管理员。访客账号拥有独立工作台，享有开源推荐提交、全站精选项目评论及个人记录管理权限。
          </p>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-zinc-200 dark:border-zinc-800 pb-2 text-xs font-mono">
        <button
          onClick={() => setActiveTab('submissions')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'submissions'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800'
          }`}
        >
          <GitBranch className="h-3.5 w-3.5" />
          <span>我的提交仓库 ({userSubmissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'comments'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>我的评论记录 ({userComments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('account')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeTab === 'account'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-semibold'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 bg-zinc-100 dark:bg-zinc-800'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>账号与管理员设置指引</span>
        </button>
      </div>

      {/* Tab 1: Submissions */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {(['all', 'pending', 'approved', 'rejected'] as const).map((filter) => {
                const labels = { all: '全部', pending: '待审核', approved: '已批准', rejected: '已驳回' };
                const counts = {
                  all: userSubmissions.length,
                  pending: pendingCount,
                  approved: approvedCount,
                  rejected: rejectedCount,
                };
                return (
                  <button
                    key={filter}
                    onClick={() => setSubFilter(filter)}
                    className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                      subFilter === filter
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold'
                        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {labels[filter]} ({counts[filter]})
                  </button>
                );
              })}
            </div>

            <button
              onClick={onOpenSubmitModal}
              className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="h-3 w-3" />
              <span>提交新开源仓库</span>
            </button>
          </div>

          {filteredSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <FolderGit2 className="h-5 w-5" />
              </div>
              <p className="text-xs font-mono text-zinc-500">
                {userSubmissions.length === 0 ? '您尚未提交过任何开源仓库。' : '当前筛选分类下无提交记录。'}
              </p>
              {userSubmissions.length === 0 && (
                <button
                  onClick={onOpenSubmitModal}
                  className="text-xs font-mono text-emerald-600 dark:text-emerald-400 underline hover:no-underline cursor-pointer"
                >
                  立即提交您喜爱的 GitHub 项目
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 sm:p-5 space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={sub.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100 hover:text-emerald-500 transition-colors flex items-center gap-1.5"
                        >
                          <span>{sub.full_name}</span>
                          <ExternalLink className="h-3 w-3 text-zinc-400" />
                        </a>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                          sub.status === 'approved'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold'
                            : sub.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}>
                          {sub.status === 'approved' && <CheckCircle2 className="h-3 w-3" />}
                          {sub.status === 'pending' && <Clock className="h-3 w-3" />}
                          {sub.status === 'rejected' && <AlertCircle className="h-3 w-3" />}
                          <span>
                            {sub.status === 'approved' ? '已批准展示' : sub.status === 'pending' ? '等待管理员审核' : '未准入'}
                          </span>
                        </span>

                        <span className="flex items-center gap-1 text-xs font-mono text-amber-500">
                          <Star className="h-3 w-3 fill-current" />
                          <span>{sub.stars?.toLocaleString() || 0}</span>
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">
                        {sub.description || '暂无描述'}
                      </p>
                    </div>

                    <div className="text-[11px] font-mono text-zinc-400 sm:text-right shrink-0">
                      提交于 {new Date(sub.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>

                  {/* Submitter Recommendation Note */}
                  {sub.submitter_note && (
                    <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-100 dark:border-zinc-800 text-xs font-mono text-zinc-600 dark:text-zinc-400 flex items-start gap-2">
                      <span className="text-zinc-400 text-[10px] uppercase font-bold shrink-0 mt-0.5">我的推荐附言:</span>
                      <span>{sub.submitter_note}</span>
                    </div>
                  )}

                  {/* Review Feedback / Comment */}
                  {sub.review_comment && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs font-mono text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-[11px]">
                          管理员审核批注 ({sub.reviewed_by ? `@${sub.reviewed_by}` : '系统管理员'}):
                        </span>
                        <p className="text-[11px] leading-relaxed text-zinc-600 dark:text-zinc-400">
                          {sub.review_comment}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Action: Discuss Repo */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-xs font-mono">
                    <span className="text-[11px] text-zinc-400">
                      语言: {sub.language || '未知'}
                    </span>
                    <button
                      onClick={() => onOpenRepoComments(sub.name || sub.full_name, sub.full_name, sub.repo_url)}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>查看或发表该项目评论</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Comments */}
      {activeTab === 'comments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-500">
              共在全站发表 {userComments.length} 条评论见解
            </span>
            <span className="text-zinc-400">
              支持直接定位或删除个人评论
            </span>
          </div>

          {userComments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-8 text-center space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
                <MessageSquare className="h-5 w-5" />
              </div>
              <p className="text-xs font-mono text-zinc-500">
                您尚未发表过任何评论。
              </p>
              <button
                onClick={onSwitchToPublic}
                className="text-xs font-mono text-emerald-600 dark:text-emerald-400 underline hover:no-underline cursor-pointer"
              >
                浏览精选项目库并参与交流
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {userComments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-4 space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs font-bold">
                        {comment.repo_name}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {new Date(comment.created_at).toLocaleString('zh-CN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onOpenRepoComments(comment.repo_id, comment.repo_name)}
                        className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>打开讨论</span>
                        <ArrowRight className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded cursor-pointer"
                        title="删除此评论"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed font-mono pl-1 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Account & Admin Guidance */}
      {activeTab === 'account' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 space-y-4">
            <h3 className="font-bold text-sm font-mono text-zinc-900 dark:text-zinc-100">
              当前账号资料
            </h3>
            <div className="flex items-center gap-3">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-12 w-12 rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover"
              />
              <div className="space-y-0.5">
                <div className="font-bold font-mono text-sm text-zinc-900 dark:text-zinc-100">
                  {user.name || user.login}
                </div>
                <div className="text-xs font-mono text-zinc-500">
                  GitHub 用户名: @{user.login}
                </div>
                <div className="text-[11px] font-mono text-zinc-400">
                  角色标识: 访客用户 (Visitor)
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
              <a
                href={user.html_url || `https://github.com/${user.login}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <ExternalLink className="h-3 w-3" />
                <span>访问 GitHub 主页</span>
              </a>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-900/50 text-xs font-mono text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
              >
                <LogOut className="h-3 w-3" />
                <span>退出登录</span>
              </button>
            </div>
          </div>

          {/* Admin Setup Guide */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-5 space-y-3 font-mono">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🛠️ 如何将当前账号设为系统管理员？</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              为确保权限边界的安全与严谨，系统已彻底取消“首登者自动抢占管理员”逻辑。管理员唯一判定方式是在 Cloudflare Pages 中配置环境变量：
            </p>

            <div className="p-3 rounded-lg bg-zinc-950 text-zinc-200 text-xs space-y-2 border border-zinc-800">
              <div>① 登录 <strong>Cloudflare Dashboard</strong> -&gt; <strong>Workers & Pages</strong> -&gt; 你的应用项目</div>
              <div>② 进入 <strong>Settings</strong> -&gt; <strong>Environment variables</strong></div>
              <div>③ 点击 <strong>Add variable</strong>，新增变量：</div>
              <div className="pl-4 text-emerald-400 font-bold">
                变量名: ADMIN_USER<br />
                变量值: {user.login}
              </div>
              <div className="text-zinc-400 text-[11px]">
                (支持多个管理员，用户名以英文逗号分隔，如: <code>{user.login},admin2</code>)
              </div>
              <div>④ 在 <strong>Deployments</strong> 菜单中执行一次 <strong>Redeploy</strong>，重新登入后即自动激活最高中枢管理权限！</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
