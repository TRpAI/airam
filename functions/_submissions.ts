import { isUserAdmin } from './_admin';

export interface RepoSubmissionRecord {
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

// Global edge worker isolate in-memory store
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
  },
  {
    id: 'sub-sample-2',
    repo_url: 'https://github.com/sveltejs/svelte',
    owner: 'sveltejs',
    name: 'svelte',
    full_name: 'sveltejs/svelte',
    description: 'Cybernetically enhanced web apps with run-time compiler.',
    stars: 79200,
    language: 'JavaScript',
    homepage: 'https://svelte.dev',
    submitter_login: 'open_contributor',
    submitter_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    submitter_note: '零虚拟 DOM 的编译器驱动轻量级前端框架，体验丝滑',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  }
];

export async function ensureSubmissionsTable(env: any): Promise<void> {
  const db = env?.DB || env?.AIRAM_DB;
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
          stars INTEGER NOT NULL DEFAULT 0,
          language TEXT,
          homepage TEXT,
          submitter_login TEXT NOT NULL,
          submitter_avatar TEXT,
          submitter_note TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          review_comment TEXT,
          created_at TEXT NOT NULL,
          reviewed_at TEXT,
          reviewed_by TEXT
        )
      `).run();
    } catch (e) {
      console.warn('D1 create submissions table failed:', e);
    }
  }
}

export async function getAllSubmissions(env: any): Promise<RepoSubmissionRecord[]> {
  await ensureSubmissionsTable(env);
  const db = env?.DB || env?.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      const { results } = await db.prepare('SELECT * FROM repo_submissions ORDER BY created_at DESC').all();
      if (Array.isArray(results) && results.length > 0) {
        return results as any[];
      }
    } catch (e) {
      console.warn('D1 query submissions failed, using memory:', e);
    }
  }
  return memorySubmissions;
}

export async function addSubmission(
  env: any,
  data: {
    repo_url: string;
    submitter_login: string;
    submitter_avatar?: string;
    submitter_note?: string;
  }
): Promise<{ success: boolean; submission?: RepoSubmissionRecord; error?: string }> {
  const cleanUrl = data.repo_url.trim().replace(/\/$/, '');
  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    return { error: '无效的 GitHub 仓库 URL，请填写格式如 https://github.com/owner/repo', success: false };
  }

  const owner = match[1];
  const name = match[2];
  const fullName = `${owner}/${name}`;
  const submitter = data.submitter_login.trim();
  const isAdmin = isUserAdmin(env, submitter);

  // Check duplicate
  const all = await getAllSubmissions(env);
  const existing = all.find(s => s.full_name.toLowerCase() === fullName.toLowerCase());
  if (existing) {
    if (existing.status === 'approved') {
      return { error: `仓库 "${fullName}" 已经通过审核，并已在前台精选展示中！`, success: false };
    }
    if (existing.status === 'pending') {
      if (isAdmin) {
        // 管理员再次提交待审核仓库，自动批准免审核展示
        await updateSubmissionStatus(env, existing.id, 'approve', '管理员直接确认发布（免审核展示）', submitter);
        existing.status = 'approved';
        return { success: true, submission: existing };
      }
      return { error: `仓库 "${fullName}" 目前已在待审核队列中，请等待管理员审核。`, success: false };
    }
  }

  const newSub: RepoSubmissionRecord = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    repo_url: `https://github.com/${fullName}`,
    owner,
    name,
    full_name: fullName,
    description: '提交开源项目',
    stars: 0,
    language: 'TypeScript',
    submitter_login: submitter,
    submitter_avatar: data.submitter_avatar || `https://github.com/${submitter}.png`,
    submitter_note: data.submitter_note?.trim(),
    status: isAdmin ? 'approved' : 'pending',
    reviewed_at: isAdmin ? new Date().toISOString() : undefined,
    reviewed_by: isAdmin ? submitter : undefined,
    review_comment: isAdmin ? '管理员直接发布（免审核展示）' : undefined,
    created_at: new Date().toISOString(),
  };

  // Try fetching metadata from GitHub
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
  const db = env?.DB || env?.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await ensureSubmissionsTable(env);
      await db.prepare(`
        INSERT INTO repo_submissions (
          id, repo_url, owner, name, full_name, description, stars, language, homepage,
          submitter_login, submitter_avatar, submitter_note, status, review_comment, created_at, reviewed_at, reviewed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        newSub.id, newSub.repo_url, newSub.owner, newSub.name, newSub.full_name,
        newSub.description, newSub.stars, newSub.language, newSub.homepage || null,
        newSub.submitter_login, newSub.submitter_avatar || null, newSub.submitter_note || null,
        newSub.status, newSub.review_comment || null, newSub.created_at, newSub.reviewed_at || null, newSub.reviewed_by || null
      ).run();
    } catch (e) {
      console.warn('D1 insert submission failed:', e);
    }
  }

  return { success: true, submission: newSub };
}

export async function updateSubmissionStatus(
  env: any,
  id: string,
  action: 'approve' | 'reject',
  reviewComment?: string,
  adminLogin?: string
): Promise<{ success: boolean; error?: string; submission?: RepoSubmissionRecord }> {
  if (!adminLogin || !isUserAdmin(env, adminLogin)) {
    return { success: false, error: '只有系统管理员有权批准或驳回仓库提交' };
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const reviewedAt = new Date().toISOString();
  const finalComment = reviewComment ? reviewComment.trim() : (action === 'approve' ? '审核通过，准予展示' : '未达到展示标准');

  // Update memory
  const idx = memorySubmissions.findIndex(s => s.id === id);
  let updatedSub: RepoSubmissionRecord | undefined;
  if (idx !== -1) {
    memorySubmissions[idx].status = newStatus;
    memorySubmissions[idx].review_comment = finalComment;
    memorySubmissions[idx].reviewed_at = reviewedAt;
    memorySubmissions[idx].reviewed_by = adminLogin;
    updatedSub = memorySubmissions[idx];
  }

  // Update D1
  const db = env?.DB || env?.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await ensureSubmissionsTable(env);
      await db.prepare(`
        UPDATE repo_submissions
        SET status = ?, review_comment = ?, reviewed_at = ?, reviewed_by = ?
        WHERE id = ?
      `).bind(newStatus, finalComment, reviewedAt, adminLogin, id).run();
    } catch (e) {
      console.warn('D1 update review failed:', e);
    }
  }

  return { success: true, submission: updatedSub };
}

export async function deleteSubmissionRecord(
  env: any,
  id: string,
  adminLogin?: string
): Promise<{ success: boolean; error?: string }> {
  if (!adminLogin || !isUserAdmin(env, adminLogin)) {
    return { success: false, error: '只有系统管理员有权删除提交记录' };
  }

  memorySubmissions = memorySubmissions.filter(s => s.id !== id);

  const db = env?.DB || env?.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare('DELETE FROM repo_submissions WHERE id = ?').bind(id).run();
    } catch (e) {
      console.warn('D1 delete submission failed:', e);
    }
  }

  return { success: true };
}
