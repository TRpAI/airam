import { isUserAdmin } from '../../_admin';

interface CommentRecord {
  id: string;
  repo_id: string;
  repo_name: string;
  author_login: string;
  author_name: string;
  author_avatar: string;
  author_role: 'admin' | 'visitor';
  content: string;
  created_at: string;
  updated_at?: string;
}

// In-memory isolate fallback store
let memoryComments: CommentRecord[] = [
  {
    id: 'cmt-1',
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
    id: 'cmt-2',
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

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const repoId = url.searchParams.get('repoId') || url.searchParams.get('repo_id');
  const author = url.searchParams.get('author') || url.searchParams.get('submitter');

  let results: CommentRecord[] = [...memoryComments];

  // Try D1 if available
  const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS repo_comments (
          id TEXT PRIMARY KEY,
          repo_id TEXT NOT NULL,
          repo_name TEXT NOT NULL,
          author_login TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_avatar TEXT NOT NULL,
          author_role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `).run();

      const { results: rows } = await db.prepare('SELECT * FROM repo_comments ORDER BY created_at DESC').all();
      if (Array.isArray(rows) && rows.length > 0) {
        results = rows as any[];
      }
    } catch (e) {
      console.warn('D1 query comments failed, using memory fallback:', e);
    }
  }

  // Filter by repoId or author
  if (repoId) {
    const cleanRepoId = repoId.trim().toLowerCase();
    results = results.filter(c => 
      c.repo_id.toLowerCase() === cleanRepoId || 
      c.repo_name.toLowerCase().includes(cleanRepoId)
    );
  }

  if (author) {
    const cleanAuthor = author.trim().toLowerCase();
    results = results.filter(c => c.author_login.toLowerCase() === cleanAuthor);
  }

  return new Response(JSON.stringify({
    success: true,
    comments: results,
    total: results.length
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store'
    }
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const { repo_id, repo_name, content, author_login, author_name, author_avatar } = body;

    if (!content || !content.trim()) {
      return new Response(JSON.stringify({ error: '评论内容不能为空' }), { status: 400 });
    }

    if (!author_login || !author_login.trim()) {
      return new Response(JSON.stringify({ error: '请先登录 GitHub 账号后再发表评论' }), { status: 401 });
    }

    const isAdmin = isUserAdmin(context.env as any, author_login);
    const authorRole: 'admin' | 'visitor' = isAdmin ? 'admin' : 'visitor';

    const newComment: CommentRecord = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repo_id: (repo_id || 'general').trim(),
      repo_name: (repo_name || repo_id || '开源项目').trim(),
      author_login: author_login.trim(),
      author_name: (author_name || author_login).trim(),
      author_avatar: author_avatar || `https://github.com/${author_login}.png`,
      author_role: authorRole,
      content: content.trim(),
      created_at: new Date().toISOString(),
    };

    // Try saving to D1 if available
    const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
    if (db && typeof db.prepare === 'function') {
      try {
        await db.prepare(`
          CREATE TABLE IF NOT EXISTS repo_comments (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL,
            repo_name TEXT NOT NULL,
            author_login TEXT NOT NULL,
            author_name TEXT NOT NULL,
            author_avatar TEXT NOT NULL,
            author_role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
          )
        `).run();

        await db.prepare(`
          INSERT INTO repo_comments (id, repo_id, repo_name, author_login, author_name, author_avatar, author_role, content, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newComment.id,
          newComment.repo_id,
          newComment.repo_name,
          newComment.author_login,
          newComment.author_name,
          newComment.author_avatar,
          newComment.author_role,
          newComment.content,
          newComment.created_at
        ).run();
      } catch (e) {
        console.warn('D1 insert comment failed:', e);
      }
    }

    // Always prepend to memory
    memoryComments.unshift(newComment);

    return new Response(JSON.stringify({
      success: true,
      comment: newComment
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '发表评论失败' }), { status: 500 });
  }
};

export const onRequestDelete: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');
  const user = url.searchParams.get('user');

  if (!id) {
    return new Response(JSON.stringify({ error: '缺少评论 ID' }), { status: 400 });
  }

  const comment = memoryComments.find(c => c.id === id);
  const isAdmin = isUserAdmin(context.env as any, user);

  if (comment && user && comment.author_login.toLowerCase() !== user.toLowerCase() && !isAdmin) {
    return new Response(JSON.stringify({ error: '无权删除此评论' }), { status: 403 });
  }

  // Remove from memory
  memoryComments = memoryComments.filter(c => c.id !== id);

  // Remove from D1 if available
  const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare('DELETE FROM repo_comments WHERE id = ?').bind(id).run();
    } catch (e) {}
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
};
