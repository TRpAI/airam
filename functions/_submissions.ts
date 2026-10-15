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
    id: 'sub-1791903091295-7w1q2k',
    repo_url: 'https://github.com/vuejs/core',
    owner: 'vuejs',
    name: 'core',
    full_name: 'vuejs/core',
    description: '🖖 Vue.js is a progressive, incrementally-adoptable JavaScript framework for building UI on the web.',
    stars: 54648,
    language: 'TypeScript',
    homepage: 'https://vuejs.org/',
    submitter_login: 'guest_dev',
    submitter_avatar: 'https://github.com/guest_dev.png',
    submitter_note: '测试访客提交',
    status: 'approved',
    reviewed_at: '2026-10-13T14:51:45.387Z',
    reviewed_by: 'osahermes',
    review_comment: '已审核通过，精选展示',
    created_at: '2026-10-13T14:51:31.295Z'
  },
  {
    id: 'sub-1791604347871-f0kawb',
    repo_url: 'https://github.com/react/react',
    owner: 'facebook',
    name: 'react',
    full_name: 'facebook/react',
    description: 'The library for web and native user interfaces.',
    stars: 250806,
    language: 'JavaScript',
    homepage: 'https://react.dev',
    submitter_login: 'visitor_john',
    submitter_avatar: 'https://github.com/visitor_john.png',
    submitter_note: '全球最流行的现代前端界面渲染框架',
    status: 'approved',
    created_at: '2026-10-10T03:52:27.871Z',
    reviewed_at: '2026-10-13T14:51:38.530Z',
    reviewed_by: 'osahermes',
    review_comment: '管理员直接发布（免审核展示）'
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

export async function purgeAllSubmissions(
  env: any,
  adminLogin?: string
): Promise<{ success: boolean; error?: string }> {
  if (adminLogin && !isUserAdmin(env, adminLogin)) {
    return { success: false, error: '只有系统管理员有权清理演示数据' };
  }

  memorySubmissions = [];

  const db = env?.DB || env?.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare('DELETE FROM repo_submissions').run();
    } catch (e) {
      console.warn('D1 purge submissions failed:', e);
    }
  }

  return { success: true };
}
