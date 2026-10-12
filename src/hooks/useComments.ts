import { useState, useEffect, useCallback, useMemo } from 'react';
import { RepoComment } from '../types';

const STORAGE_KEY = 'airam_local_comments';

const initialSampleComments: RepoComment[] = [
  {
    id: 'cmt-sample-1',
    repo_id: 'tailwindcss',
    repo_name: 'tailwindlabs/tailwindcss',
    author_login: 'developer_guest',
    author_name: 'Developer Guest',
    author_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    author_role: 'visitor',
    content: 'Tailwind CSS 的原子化类名配合 JIT 引擎，在生产环境极大减少了无用样式体积，非常推荐！',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    id: 'cmt-sample-2',
    repo_id: 'tailwindcss',
    repo_name: 'tailwindlabs/tailwindcss',
    author_login: 'osahermes',
    author_name: 'Osa Hermes',
    author_avatar: 'https://github.com/osahermes.png',
    author_role: 'admin',
    content: '已收录至系统精选项目库，感谢推荐！',
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
  }
];

export function useComments(repoId?: string, authorLogin?: string) {
  const [comments, setComments] = useState<RepoComment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return initialSampleComments;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncToStorage = (list: RepoComment[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  };

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (repoId) params.append('repoId', repoId);
      if (authorLogin) params.append('author', authorLogin);

      const res = await fetch(`/api/comments?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.comments)) {
          setComments(data.comments);
          syncToStorage(data.comments);
          setError(null);
          return;
        }
      }
    } catch {
      // Offline fallback: load from localStorage
      try {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          setComments(JSON.parse(local));
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  }, [repoId, authorLogin]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Filtered comments for the current view
  const currentComments = useMemo(() => {
    let list = [...comments];
    if (repoId) {
      const clean = repoId.trim().toLowerCase();
      list = list.filter(c => c.repo_id.toLowerCase() === clean || c.repo_name.toLowerCase().includes(clean));
    }
    if (authorLogin) {
      const clean = authorLogin.trim().toLowerCase();
      list = list.filter(c => c.author_login.toLowerCase() === clean);
    }
    return list;
  }, [comments, repoId, authorLogin]);

  // Comment counts mapped by repo_id
  const commentCountsByRepo = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of comments) {
      const key = c.repo_id.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [comments]);

  // Post new comment (strictly requires logged in user)
  const addComment = async (params: {
    repo_id: string;
    repo_name?: string;
    content: string;
    author_login: string;
    author_name?: string;
    author_avatar?: string;
    author_role?: 'admin' | 'visitor';
  }): Promise<{ success: boolean; comment?: RepoComment; error?: string }> => {
    if (!params.content.trim()) {
      return { success: false, error: '评论内容不能为空' };
    }
    if (!params.author_login) {
      return { success: false, error: '请先登录 GitHub 账号后再发表评论' };
    }

    const optimisticComment: RepoComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repo_id: params.repo_id,
      repo_name: params.repo_name || params.repo_id,
      author_login: params.author_login,
      author_name: params.author_name || params.author_login,
      author_avatar: params.author_avatar || `https://github.com/${params.author_login}.png`,
      author_role: params.author_role || 'visitor',
      content: params.content.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistically update local state
    setComments(prev => {
      const updated = [optimisticComment, ...prev];
      syncToStorage(updated);
      return updated;
    });

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) {
          // Replace with server version
          setComments(prev => {
            const updated = prev.map(c => c.id === optimisticComment.id ? data.comment : c);
            syncToStorage(updated);
            return updated;
          });
          return { success: true, comment: data.comment };
        }
      }
    } catch {
      // In offline/mock mode, optimisticComment is already saved in local storage!
    }

    return { success: true, comment: optimisticComment };
  };

  // Delete comment
  const deleteComment = async (id: string, userLogin?: string): Promise<{ success: boolean; error?: string }> => {
    setComments(prev => {
      const updated = prev.filter(c => c.id !== id);
      syncToStorage(updated);
      return updated;
    });

    try {
      await fetch(`/api/comments/${id}?user=${encodeURIComponent(userLogin || '')}`, {
        method: 'DELETE',
      });
    } catch {}

    return { success: true };
  };

  return {
    comments: currentComments,
    allComments: comments,
    commentCountsByRepo,
    loading,
    error,
    fetchComments,
    addComment,
    deleteComment,
  };
}
