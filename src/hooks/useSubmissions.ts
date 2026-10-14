import { useState, useEffect, useCallback } from 'react';
import { RepoSubmission, SubmissionStatus } from '../types';

export interface SubmissionStats {
  total: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
}

export interface QuotaInfo {
  allowed: boolean;
  remaining: number;
  maxAllowed: number;
  windowMinutes: number;
  cooldownSeconds: number;
}

const LOCAL_REVIEWS_KEY = 'airam_local_submission_reviews';

interface ReviewOverride {
  status: SubmissionStatus;
  reviewed_at: string;
  reviewed_by: string;
  review_comment?: string;
}

function getLocalReviews(): Record<string, ReviewOverride> {
  try {
    const raw = localStorage.getItem(LOCAL_REVIEWS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLocalReview(id: string, override: ReviewOverride) {
  try {
    const current = getLocalReviews();
    current[id] = override;
    localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(current));
  } catch {}
}

export function useSubmissions(isAdmin = false, submitterLogin?: string) {
  const [submissions, setSubmissions] = useState<RepoSubmission[]>([]);
  const [stats, setStats] = useState<SubmissionStats>({
    total: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (isAdmin) {
        // 管理员拉取全站所有提交（待审核、已准入、已驳回），不按 submitter 过滤
        params.append('isAdmin', 'true');
      } else if (submitterLogin) {
        // 访客拉取全部已批准精选 + 当前访客自己的待审核仓库
        params.append('submitter', submitterLogin);
      }

      const res = await fetch(`/api/submissions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('获取仓库列表失败');
      }
      const data = await res.json();
      let list: RepoSubmission[] = data.submissions || [];

      // 检查本地演示数据是否已清空
      const isDemoPurged = localStorage.getItem('airam_demo_purged') === 'true';
      if (isDemoPurged) {
        list = list.filter((item) => !item.id.startsWith('sub-sample-'));
      }

      // 过滤本地已删除黑名单
      try {
        const deletedRaw = localStorage.getItem('airam_deleted_submission_ids');
        if (deletedRaw) {
          const deletedIds: string[] = JSON.parse(deletedRaw);
          if (deletedIds.length > 0) {
            list = list.filter((item) => !deletedIds.includes(item.id));
          }
        }
      } catch {}

      // 融合本地审核持久化覆盖，防止刷新或网络延迟导致已审核状态回退到待审核
      const overrides = getLocalReviews();
      if (Object.keys(overrides).length > 0) {
        list = list.map((item) => {
          if (overrides[item.id]) {
            return {
              ...item,
              ...overrides[item.id],
            };
          }
          return item;
        });
      }

      setSubmissions(list);

      const total = list.length;
      const pendingCount = list.filter((s) => s.status === 'pending').length;
      const approvedCount = list.filter((s) => s.status === 'approved').length;
      const rejectedCount = list.filter((s) => s.status === 'rejected').length;

      setStats({
        total,
        pendingCount,
        approvedCount,
        rejectedCount,
      });
      setError(null);
    } catch (err: any) {
      console.warn('获取提交列表异常:', err);
      setError(err.message || '加载提交数据失败');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, submitterLogin]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Check quota & rate limit status for current visitor
  const checkQuota = useCallback(async (): Promise<QuotaInfo> => {
    try {
      const params = new URLSearchParams();
      if (submitterLogin) params.append('submitter', submitterLogin);
      const res = await fetch(`/api/submissions/quota?${params.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    }
    return {
      allowed: true,
      remaining: 3,
      maxAllowed: 3,
      windowMinutes: 10,
      cooldownSeconds: 0,
    };
  }, [submitterLogin]);

  // Submit a new repository
  const submitRepo = async (params: {
    repo_url: string;
    submitter_login: string;
    submitter_avatar?: string;
    submitter_note?: string;
  }): Promise<{ success: boolean; submission?: RepoSubmission; error?: string; retryAfter?: number }> => {
    setLoading(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          error: data.error || (res.status === 429 ? '提交频率超出限制，请稍后再试' : '提交失败'),
          retryAfter: data.retryAfter,
        };
      }

      if (data.submission) {
        // 若管理员提交，自动标记已批准并持久化
        if (isAdmin || data.submission.status === 'approved') {
          saveLocalReview(data.submission.id, {
            status: 'approved',
            reviewed_at: data.submission.reviewed_at || new Date().toISOString(),
            reviewed_by: params.submitter_login,
            review_comment: data.submission.review_comment || '管理员直接发布（免审核展示）',
          });
        }
      }

      await fetchSubmissions();
      return {
        success: true,
        submission: data.submission,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '网络异常，提交失败',
      };
    } finally {
      setLoading(false);
    }
  };

  // Admin Review (Approve / Reject)
  const reviewSubmission = async (
    id: string,
    action: 'approve' | 'reject',
    comment?: string,
    adminLogin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);

    const reviewedAt = new Date().toISOString();
    const finalComment = comment ? comment.trim() : (action === 'approve' ? '审核通过，准予展示' : '未达到展示标准');
    const newStatus: SubmissionStatus = action === 'approve' ? 'approved' : 'rejected';

    // 乐观立即写入本地持久化，确保页面刷新绝不丢失审核通过状态
    const override: ReviewOverride = {
      status: newStatus,
      reviewed_at: reviewedAt,
      reviewed_by: adminLogin || 'admin',
      review_comment: finalComment,
    };
    saveLocalReview(id, override);

    // 乐观更新 UI 状态
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...override } : s))
    );
    setStats((prev) => ({
      ...prev,
      pendingCount: Math.max(0, prev.pendingCount - 1),
      approvedCount: action === 'approve' ? prev.approvedCount + 1 : prev.approvedCount,
      rejectedCount: action === 'reject' ? prev.rejectedCount + 1 : prev.rejectedCount,
    }));

    const effectiveAdmin = adminLogin || 'osahermes';
    try {
      const res = await fetch(`/api/submissions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          review_comment: comment,
          admin_login: effectiveAdmin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('后端审核同步提示:', data.error);
      }

      await fetchSubmissions();
      return { success: true };
    } catch (err: any) {
      console.warn('审核网络异常，已保全本地状态:', err);
      return { success: true };
    } finally {
      setLoading(false);
    }
  };

  // Admin Delete
  const deleteSubmission = async (
    id: string,
    adminLogin?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    const effectiveAdmin = adminLogin || 'osahermes';
    try {
      // 移除本地审核覆盖
      try {
        const cur = getLocalReviews();
        delete cur[id];
        localStorage.setItem(LOCAL_REVIEWS_KEY, JSON.stringify(cur));
      } catch {}

      // 加入本地已删除黑名单，避免任何情况重新渲染
      try {
        const deletedRaw = localStorage.getItem('airam_deleted_submission_ids') || '[]';
        const deletedIds: string[] = JSON.parse(deletedRaw);
        if (!deletedIds.includes(id)) {
          deletedIds.push(id);
          localStorage.setItem('airam_deleted_submission_ids', JSON.stringify(deletedIds));
        }
      } catch {}

      setSubmissions((prev) => prev.filter((s) => s.id !== id));

      const res = await fetch(`/api/submissions/${id}?admin_login=${encodeURIComponent(effectiveAdmin)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_login: effectiveAdmin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn('删除后端同步提示:', data.error);
      }
      await fetchSubmissions();
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '删除异常',
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    submissions,
    stats,
    loading,
    error,
    fetchSubmissions,
    checkQuota,
    submitRepo,
    reviewSubmission,
    deleteSubmission,
  };
}
