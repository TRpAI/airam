import { isUserAdmin } from '../../_admin';

interface RepoSubmissionRecord {
  id: string;
  repo_url: string;
  owner: string;
  name: string;
  full_name: string;
  description: string;
  stars: number;
  language: string;
  homepage?: string;
  submitter_login: string;
  submitter_avatar?: string;
  submitter_note?: string;
  status: 'pending' | 'approved' | 'rejected';
  review_comment?: string;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

let memorySubmissions: RepoSubmissionRecord[] = [
  {
    id: 'sub-sample-1',
    repo_url: 'https://github.com/tailwindlabs/tailwindcss',
    owner: 'tailwindlabs',
    name: 'tailwindcss',
    full_name: 'tailwindlabs/tailwindcss',
    description: 'A utility-first CSS framework for rapid UI development.',
    stars: 83500,
    language: 'CSS',
    homepage: 'https://tailwindcss.com',
    submitter_login: 'developer_guest',
    submitter_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    submitter_note: '现代前端必备的实用工具类原子化 CSS 框架，极大提效页面搭建',
    status: 'approved',
    review_comment: '高质量明星开源项目，符合研发中枢精选标准，批准展示。',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    reviewed_at: new Date(Date.now() - 3600000 * 20).toISOString(),
    reviewed_by: 'osahermes',
  }
];

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const isAdmin = url.searchParams.get('isAdmin') === 'true';
  const submitter = url.searchParams.get('submitter');

  let results: RepoSubmissionRecord[] = [...memorySubmissions];

  const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS repo_submissions (
          id TEXT PRIMARY KEY,
          repo_url TEXT NOT NULL,
          owner TEXT NOT NULL,
          name TEXT NOT NULL,
          full_name TEXT NOT NULL,
          description TEXT,
          stars INTEGER,
          language TEXT,
          homepage TEXT,
          submitter_login TEXT NOT NULL,
          submitter_avatar TEXT,
          submitter_note TEXT,
          status TEXT NOT NULL,
          review_comment TEXT,
          created_at TEXT NOT NULL,
          reviewed_at TEXT,
          reviewed_by TEXT
        )
      `).run();

      const { results: rows } = await db.prepare('SELECT * FROM repo_submissions ORDER BY created_at DESC').all();
      if (Array.isArray(rows) && rows.length > 0) {
        results = rows as any[];
      }
    } catch (e) {
      console.warn('D1 query submissions failed:', e);
    }
  }

  // Filter if submitter is specified
  let filtered = results;
  if (submitter) {
    filtered = results.filter(s => s.submitter_login.toLowerCase() === submitter.trim().toLowerCase());
  } else if (!isAdmin) {
    // Only approved for public showcase
    filtered = results.filter(s => s.status === 'approved');
  }

  const stats = {
    total: results.length,
    pendingCount: results.filter(s => s.status === 'pending').length,
    approvedCount: results.filter(s => s.status === 'approved').length,
    rejectedCount: results.filter(s => s.status === 'rejected').length,
  };

  return new Response(JSON.stringify({
    submissions: filtered,
    stats,
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
    const { repo_url, submitter_login, submitter_avatar, submitter_note } = body;

    if (!repo_url || !submitter_login) {
      return new Response(JSON.stringify({ error: '请提供有效的 GitHub 仓库地址并登录' }), { status: 400 });
    }

    const cleanUrl = repo_url.trim().replace(/\/$/, '');
    const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) {
      return new Response(JSON.stringify({ error: '无效的 GitHub 仓库 URL，请填写格式如 https://github.com/owner/repo' }), { status: 400 });
    }

    const owner = match[1];
    const name = match[2];
    const fullName = `${owner}/${name}`;

    const newSub: RepoSubmissionRecord = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      repo_url: `https://github.com/${fullName}`,
      owner,
      name,
      full_name: fullName,
      description: '提交待审核项目',
      stars: 0,
      language: 'TypeScript',
      submitter_login: submitter_login.trim(),
      submitter_avatar: submitter_avatar || `https://github.com/${submitter_login}.png`,
      submitter_note: submitter_note?.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    // Try fetching GitHub stars and description
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${fullName}`, {
        headers: {
          'User-Agent': 'AIram-Knowledge-Center',
          Accept: 'application/vnd.github.v3+json',
        }
      });
      if (ghRes.ok) {
        const ghData: any = await ghRes.json();
        newSub.stars = ghData.stargazers_count || 0;
        newSub.description = ghData.description || '暂无描述';
        newSub.language = ghData.language || '未知';
        newSub.homepage = ghData.homepage || undefined;
      }
    } catch {}

    // Save to memory
    memorySubmissions.unshift(newSub);

    // Save to D1
    const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
    if (db && typeof db.prepare === 'function') {
      try {
        await db.prepare(`
          INSERT INTO repo_submissions (
            id, repo_url, owner, name, full_name, description, stars, language, homepage,
            submitter_login, submitter_avatar, submitter_note, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          newSub.id, newSub.repo_url, newSub.owner, newSub.name, newSub.full_name,
          newSub.description, newSub.stars, newSub.language, newSub.homepage || null,
          newSub.submitter_login, newSub.submitter_avatar || null, newSub.submitter_note || null,
          newSub.status, newSub.created_at
        ).run();
      } catch (e) {
        console.warn('D1 insert submission failed:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      submission: newSub,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '提交仓库失败' }), { status: 500 });
  }
};
