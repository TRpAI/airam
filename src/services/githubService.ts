import { GitHubRepository, Project } from '../types';

export async function fetchPublicGitHubRepo(
  owner: string,
  repo: string,
  token?: string
): Promise<{ repo: GitHubRepository; readme: string }> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  // 1. 获取仓库元数据
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) {
    if (repoRes.status === 404) {
      throw new Error(`仓库 ${owner}/${repo} 未找到，请检查大小写或是否为私有仓库。`);
    } else if (repoRes.status === 403) {
      throw new Error('触发 GitHub 匿名请求频率限制（60次/小时）。请稍后重试或填写 Personal Access Token。');
    }
    throw new Error(`GitHub API 请求失败 (状态码: ${repoRes.status})`);
  }

  const raw = await repoRes.json();

  // 2. 获取 README
  let readme = '';
  try {
    const readmeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      if (readmeData.content) {
        readme = decodeURIComponent(escape(atob(readmeData.content.replace(/\s/g, ''))));
      }
    }
  } catch (err) {
    console.warn('获取 README 异常，继续处理元数据', err);
  }

  const now = new Date().toISOString();
  const repoData: GitHubRepository = {
    id: `repo-${Date.now()}`,
    github_id: raw.id,
    owner: raw.owner?.login || owner,
    name: raw.name,
    full_name: raw.full_name,
    description: raw.description || '暂无项目描述',
    html_url: raw.html_url,
    homepage: raw.homepage || undefined,
    language: raw.language || 'Unknown',
    license: raw.license?.spdx_id || raw.license?.name || undefined,
    stars: raw.stargazers_count,
    forks: raw.forks_count,
    watchers: raw.watchers_count,
    open_issues: raw.open_issues_count,
    default_branch: raw.default_branch || 'main',
    is_private: raw.private,
    is_fork: raw.fork,
    topics: raw.topics || [],
    readme_content: readme,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    pushed_at: raw.pushed_at,
    last_synced_at: now,
    sync_status: 'synced',
    auto_generate_card: true,
  };

  return { repo: repoData, readme };
}

/**
 * 自动从 GitHub 仓库元信息与 README 推导生成结构化的“项目知识卡片”
 */
export function generateProjectCardFromRepo(repo: GitHubRepository): Project {
  // 推导技术栈
  const techStack: string[] = [];
  if (repo.language && repo.language !== 'Unknown') {
    techStack.push(repo.language);
  }
  repo.topics.forEach((t) => {
    const cleanTopic = t.toLowerCase();
    if (['cloudflare', 'workers', 'd1', 'r2', 'react', 'vue', 'tailwind', 'typescript', 'hono', 'sqlite', 'nextjs', 'pwa'].includes(cleanTopic)) {
      techStack.push(t);
    }
  });

  // 提取核心功能（若有 README，寻找二级标题或以 - 开头的列表）
  const features: string[] = [];
  if (repo.readme_content) {
    const lines = repo.readme_content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if ((trimmed.startsWith('- ') || trimmed.startsWith('* ')) && trimmed.length > 5 && trimmed.length < 100) {
        const clean = trimmed.replace(/^[-*]\s*/, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        if (!clean.includes('http') && features.length < 5) {
          features.push(clean);
        }
      }
    }
  }

  if (features.length === 0) {
    features.push('代码资产自动纳管与文档同步', '支持 GitHub Webhook 增量推送', '单用户边缘知识检索');
  }

  // 计算初始评级 (基于 stars 或最近活跃度)
  let rating = 4;
  if (repo.stars > 100) rating = 5;

  return {
    id: `proj-${Date.now()}`,
    name: repo.name,
    description: repo.description,
    status: 'active',
    one_liner: repo.description || `${repo.name} 研发项目代码资产`,
    tech_stack: Array.from(new Set(techStack)),
    features,
    homepage: repo.homepage || repo.html_url,
    repository_id: repo.id,
    rating,
    my_notes: `从 GitHub 仓库 ${repo.full_name} 自动纳管导入。\n最后代码提交: ${new Date(repo.pushed_at).toLocaleString()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 浏览器端使用 Web Crypto API 实时计算与比对 HMAC-SHA256 签名
 */
export async function computeHmacSignature(rawBody: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(rawBody));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
