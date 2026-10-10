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
      if (isAdmin) params.append('isAdmin', 'true');
      if (submitterLogin) params.append('submitter', submitterLogin);

      const res = await fetch(`/api/submissions?${params.toString()}`);
      if (!res.ok) {
        throw new Error('获取仓库列表失败');
      }
      const data = await res.json();
      setSubmissions(data.submissions || []);
      if (data.stats) {
        setStats(data.stats);
      }
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
    try {
      const res = await fetch(`/api/submissions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          review_comment: comment,
          admin_login: adminLogin,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || '审核操作失败',
        };
      }

      await fetchSubmissions();
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || '网络异常，审核失败',
      };
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
    try {
      const res = await fetch(`/api/submissions/${id}?admin_login=${encodeURIComponent(adminLogin || '')}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || '删除失败',
        };
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
