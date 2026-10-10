import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Data store directory
const DATA_DIR = path.resolve(__dirname, '.data');
const ADMIN_STORE_FILE = path.resolve(DATA_DIR, 'admin_system.json');
const SUBMISSIONS_STORE_FILE = path.resolve(DATA_DIR, 'submissions.json');

// --- 1. Rate Limiting System ---
interface RateLimitRecord {
  timestamps: number[];
  lastRequest: number;
}

const loginRateLimitStore = new Map<string, RateLimitRecord>();
const submissionRateLimitStore = new Map<string, RateLimitRecord>();

function checkRateLimit(
  store: Map<string, RateLimitRecord>,
  key: string,
  maxAllowed: number,
  windowMs: number,
  minIntervalMs: number = 0
): { allowed: boolean; remaining: number; retryAfter: number } {
  const now = Date.now();
  let record = store.get(key);

  if (!record) {
    record = { timestamps: [], lastRequest: 0 };
    store.set(key, record);
  }

  // Purge expired timestamps outside the rolling window
  record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

  // Check minInterval between consecutive requests
  if (minIntervalMs > 0 && record.lastRequest > 0) {
    const elapsedSinceLast = now - record.lastRequest;
    if (elapsedSinceLast < minIntervalMs) {
      const waitSeconds = Math.ceil((minIntervalMs - elapsedSinceLast) / 1000);
      return {
        allowed: false,
        remaining: Math.max(0, maxAllowed - record.timestamps.length),
        retryAfter: waitSeconds,
      };
    }
  }

  // Check total occurrences in sliding window
  if (record.timestamps.length >= maxAllowed) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // Register request
  record.timestamps.push(now);
  record.lastRequest = now;

  return {
    allowed: true,
    remaining: maxAllowed - record.timestamps.length,
    retryAfter: 0,
  };
}

function getClientIdentifier(req: express.Request, userKey?: string): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim() 
    : req.socket.remoteAddress || req.ip || '127.0.0.1';
  return userKey ? `${ip}_${userKey.toLowerCase()}` : ip;
}

// --- 2. Admin Identity & Persistence ---
interface AdminRecord {
  login: string;
  name: string;
  avatar_url: string;
  claimedAt: string;
  claimedVia: 'oauth' | 'token' | 'demo';
}

interface AdminSystemData {
  admin: AdminRecord | null;
}

function loadAdminSystem(): AdminSystemData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(ADMIN_STORE_FILE)) {
      const raw = fs.readFileSync(ADMIN_STORE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn('Failed to load admin system data:', err);
  }
  return { admin: null };
}

function saveAdminSystem(data: AdminSystemData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(ADMIN_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save admin system data:', err);
  }
}

let adminSystemCache: AdminSystemData = loadAdminSystem();

/**
 * Assign role: The FIRST user to log in automatically becomes the system Administrator.
 * Subsequent users become visitors.
 */
function resolveUserRole(
  rawUser: { login: string; name?: string; avatar_url?: string },
  via: 'oauth' | 'token' | 'demo'
): { role: 'admin' | 'visitor'; isAdmin: boolean; isFirstAdminClaim: boolean; registeredAt?: string } {
  const currentAdmin = adminSystemCache.admin;

  if (!currentAdmin) {
    // This is the FIRST user! Claim administrator rights!
    const newAdmin: AdminRecord = {
      login: rawUser.login,
      name: rawUser.name || rawUser.login,
      avatar_url: rawUser.avatar_url || `https://github.com/${rawUser.login}.png`,
      claimedAt: new Date().toISOString(),
      claimedVia: via,
    };
    adminSystemCache = { admin: newAdmin };
    saveAdminSystem(adminSystemCache);
    return {
      role: 'admin',
      isAdmin: true,
      isFirstAdminClaim: true,
      registeredAt: newAdmin.claimedAt,
    };
  }

  // Admin already exists. Check if this is the registered admin
  if (currentAdmin.login.toLowerCase() === rawUser.login.toLowerCase()) {
    return {
      role: 'admin',
      isAdmin: true,
      isFirstAdminClaim: false,
      registeredAt: currentAdmin.claimedAt,
    };
  }

  // Not the registered administrator: visitor
  return {
    role: 'visitor',
    isAdmin: false,
    isFirstAdminClaim: false,
    registeredAt: undefined,
  };
}

// --- 3. Visitor Repository Submissions Data Store ---
export interface RepoSubmission {
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

const defaultSubmissions: RepoSubmission[] = [
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

function loadSubmissions(): RepoSubmission[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SUBMISSIONS_STORE_FILE)) {
      const raw = fs.readFileSync(SUBMISSIONS_STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('Failed to load submissions:', err);
  }
  // In production, return clean empty slate (no demo submissions)
  if (process.env.NODE_ENV === 'production') {
    return [];
  }
  return defaultSubmissions;
}

function saveSubmissions(data: RepoSubmission[]) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SUBMISSIONS_STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save submissions:', err);
  }
}

let submissionsCache: RepoSubmission[] = loadSubmissions();

function parseGitHubRepo(input: string): { owner: string; name: string } | null {
  if (!input || typeof input !== 'string') return null;
  let cleaned = input.trim();
  cleaned = cleaned.replace(/\.git$/i, '');
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^www\./i, '');
  cleaned = cleaned.replace(/^github\.com\//i, '');
  cleaned = cleaned.replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { owner: parts[0], name: parts[1] };
  }
  return null;
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // 1. Get OAuth & Admin System status
  app.get('/api/auth/status', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET || '';
    const origin = (req.query.origin as string) || process.env.APP_URL || '';
    const redirectUri = origin ? `${origin.replace(/\/$/, '')}/auth/callback` : `${req.protocol}://${req.get('host')}/auth/callback`;

    res.json({
      configured: Boolean(clientId && clientSecret),
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      clientId: clientId ? `${clientId.substring(0, 6)}...` : null,
      redirectUri,
      hasAdmin: Boolean(adminSystemCache.admin),
      adminUsername: adminSystemCache.admin ? adminSystemCache.admin.login : null,
      adminUser: adminSystemCache.admin,
      environment: process.env.NODE_ENV || 'development',
    });
  });

  // System settings diagnostic endpoint
  app.get('/api/system/settings', (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID || process.env.VITE_GITHUB_CLIENT_ID || '';
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.VITE_GITHUB_CLIENT_SECRET || '';
    const token = process.env.GITHUB_TOKEN || '';
    res.json({
      environment: process.env.NODE_ENV || 'development',
      hasClientId: Boolean(clientId),
      hasClientSecret: Boolean(clientSecret),
      hasGithubToken: Boolean(token),
      clientIdMasked: clientId ? `${clientId.substring(0, 6)}...` : null,
      isProduction: process.env.NODE_ENV === 'production',
      hasAdmin: Boolean(adminSystemCache.admin),
      adminUsername: adminSystemCache.admin ? adminSystemCache.admin.login : null,
    });
  });

  // 2. Generate GitHub OAuth authorization URL (with login rate limiting: max 10/min)
  app.get(['/api/auth/url', '/api/auth/github/url'], (req, res) => {
    const clientIp = getClientIdentifier(req);
    const rateCheck = checkRateLimit(loginRateLimitStore, clientIp, 10, 60000, 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `请求 GitHub 授权链接过于频繁，请等待 ${rateCheck.retryAfter} 秒后再试。`,
        retryAfter: rateCheck.retryAfter,
        rateLimited: true,
      });
    }

    const clientId = process.env.GITHUB_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID || '';
    const origin = (req.query.origin as string) || process.env.APP_URL || '';
    const redirectUri = origin ? `${origin.replace(/\/$/, '')}/auth/callback` : `${req.protocol}://${req.get('host')}/auth/callback`;

    const state = Math.random().toString(36).substring(2, 15);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:user user:email repo',
      state,
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

    res.json({
      url: authUrl,
      configured: Boolean(clientId),
      redirectUri,
      clientId,
      hasAdmin: Boolean(adminSystemCache.admin),
      adminUsername: adminSystemCache.admin ? adminSystemCache.admin.login : null,
    });
  });

  // 3. Reset Admin (Utility for system management or re-claiming seat)
  app.post('/api/auth/reset-admin', (req, res) => {
    const { confirm } = req.body;
    if (confirm === true) {
      adminSystemCache = { admin: null };
      saveAdminSystem(adminSystemCache);
      return res.json({ success: true, message: '已重置管理员席位，下一个登录的 GitHub 用户将成为新的首位管理员。' });
    }
    return res.status(400).json({ error: '请确认重置请求' });
  });

  // 4. GitHub OAuth Callback handler (with login rate limiting: max 5/min)
  app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
    const clientIp = getClientIdentifier(req);
    const rateCheck = checkRateLimit(loginRateLimitStore, clientIp, 5, 60000, 1500);
    if (!rateCheck.allowed) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>登录频率受限</title></head>
          <body style="font-family: system-ui, sans-serif; background: #09090b; color: #fbbf24; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; max-width: 400px; padding: 24px; border: 1px solid #27272a; border-radius: 12px; background: #18181b;">
              <h3 style="margin-top: 0;">登入请求过于频繁</h3>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">系统已触发安全流控保护，请等待 ${rateCheck.retryAfter} 秒后再试。</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '登入频率受限，请等待 ${rateCheck.retryAfter} 秒后再试' }, '*');
                  setTimeout(() => window.close(), 3000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    const { code, error, error_description } = req.query;

    if (error) {
      const errorMsg = (error_description as string) || (error as string) || 'GitHub 授权取消';
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>GitHub 认证失败</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f43f5e; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; max-width: 400px; padding: 24px; border: 1px solid #27272a; border-radius: 12px; background: #18181b;">
              <h3 style="margin-top: 0;">GitHub 授权未完成</h3>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">${errorMsg}</p>
              <p style="font-size: 12px; color: #71717a;">窗口即将自动关闭...</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorMsg)} }, '*');
                  setTimeout(() => window.close(), 1500);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    const clientId = process.env.GITHUB_CLIENT_ID || process.env.OAUTH_CLIENT_ID || process.env.CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || process.env.CLIENT_SECRET;

    if (!code) {
      return res.status(400).send('缺少授权 code 参数');
    }

    if (!clientId || !clientSecret) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>GitHub OAuth 密钥未配置</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #e4e4e7; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; max-width: 480px; padding: 24px; border: 1px solid #27272a; border-radius: 12px; background: #18181b;">
              <h3 style="color: #fbbf24; margin-top: 0;">未配置 GITHUB_CLIENT_SECRET</h3>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.6;">
                已收到 GitHub 授权 Code，但服务端需要环境变量 <code>GITHUB_CLIENT_SECRET</code> 才能换取 Access Token。
              </p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({
                    type: 'OAUTH_AUTH_ERROR',
                    error: '服务器尚未配置 GITHUB_CLIENT_SECRET'
                  }, '*');
                  setTimeout(() => window.close(), 3000);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }

    try {
      // Exchange code for Access Token
      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = (await tokenResponse.json()) as any;
      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || '换取令牌失败');
      }

      const accessToken = tokenData.access_token;

      // Fetch user profile from GitHub API
      const userRes = await fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'AIram-DevHub',
        },
      });

      if (!userRes.ok) {
        throw new Error(`获取 GitHub 用户资料失败 (${userRes.status})`);
      }

      const rawUser = (await userRes.json()) as any;
      const { role, isAdmin, isFirstAdminClaim, registeredAt } = resolveUserRole(rawUser, 'oauth');

      const userData = {
        login: rawUser.login,
        name: rawUser.name || rawUser.login,
        avatar_url: rawUser.avatar_url || `https://github.com/${rawUser.login}.png`,
        bio: rawUser.bio || (isAdmin ? '研发知识中枢管理员 (Admin)' : '研发知识中枢访客 (Visitor)'),
        html_url: rawUser.html_url || `https://github.com/${rawUser.login}`,
        public_repos: rawUser.public_repos || 0,
        followers: rawUser.followers || 0,
        role,
        isAdmin,
        registeredAt,
      };

      const titleText = isFirstAdminClaim 
        ? '🎉 恭喜！您已成功绑定为首位系统管理员' 
        : (isAdmin ? 'GitHub 管理员授权成功' : 'GitHub 访客授权成功');

      const badgeColor = isAdmin ? '#10b981' : '#38bdf8';
      const roleBadgeText = isAdmin ? '系统管理员 (Admin)' : '访客体验者 (Visitor)';

      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>GitHub 认证成功</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                background: #09090b;
                color: #f4f4f5;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
              }
              .card {
                background: #18181b;
                border: 1px solid #27272a;
                padding: 32px;
                border-radius: 16px;
                text-align: center;
                max-width: 380px;
                box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
              }
              .avatar {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                margin: 0 auto 12px;
                border: 2px solid ${badgeColor};
              }
              h3 { margin: 0 0 8px; font-size: 16px; color: ${badgeColor}; }
              p { margin: 0; font-size: 13px; color: #a1a1aa; line-height: 1.5; }
              .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 6px;
                font-size: 11px;
                font-family: monospace;
                background: rgba(16, 185, 129, 0.15);
                color: ${badgeColor};
                border: 1px solid rgba(16, 185, 129, 0.3);
                margin: 6px 0 10px;
              }
              .spinner {
                display: inline-block;
                width: 14px;
                height: 14px;
                border: 2px solid ${badgeColor};
                border-top-color: transparent;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin-top: 14px;
              }
              @keyframes spin { to { transform: rotate(360deg); } }
            </style>
          </head>
          <body>
            <div class="card">
              <img src="${userData.avatar_url}" alt="${userData.login}" class="avatar" />
              <h3>${titleText}</h3>
              <div class="badge">${roleBadgeText}</div>
              <p>欢迎，<strong>@${userData.login}</strong></p>
              <p style="margin-top: 6px; font-size: 12px; color: #71717a;">正在同步到控制台，窗口即将自动关闭...</p>
              <div class="spinner"></div>
            </div>
            <script>
              const authPayload = ${JSON.stringify({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: userData, 
                token: accessToken,
                isFirstAdminClaim 
              })};
              if (window.opener) {
                window.opener.postMessage(authPayload, '*');
                setTimeout(() => {
                  window.close();
                }, 750);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>GitHub 授权异常</title></head>
          <body style="font-family: system-ui, -apple-system, sans-serif; background: #09090b; color: #f43f5e; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
            <div style="text-align: center; max-width: 400px; padding: 24px; border: 1px solid #27272a; border-radius: 12px; background: #18181b;">
              <h3 style="margin-top: 0;">GitHub 令牌换取失败</h3>
              <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">${err.message || '未知错误'}</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(err.message || '授权验证失败')} }, '*');
                  setTimeout(() => window.close(), 2500);
                }
              </script>
            </div>
          </body>
        </html>
      `);
    }
  });

  // 5. Token validation API (Enforce login rate limiting: max 5 requests per 60 seconds)
  app.post('/api/auth/verify-token', async (req, res) => {
    const { token, username } = req.body;
    const clientKey = getClientIdentifier(req, username);

    // Enforce login rate limit: max 5 attempts per 60 seconds, min 1s interval
    const rateCheck = checkRateLimit(loginRateLimitStore, clientKey, 5, 60000, 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `登入验证过于频繁，系统已启动安全流控保护。请等待 ${rateCheck.retryAfter} 秒后再试。`,
        retryAfter: rateCheck.retryAfter,
        rateLimited: true,
      });
    }

    if (!token && !username) {
      return res.status(400).json({ error: '请提供 Token 或用户名' });
    }

    try {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AIram-DevHub',
      };
      if (token) {
        headers.Authorization = `token ${token}`;
      }

      const endpoint = token ? 'https://api.github.com/user' : `https://api.github.com/users/${username}`;
      const response = await fetch(endpoint, { headers });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Personal Access Token 无效或已过期');
        }
        if (response.status === 404) {
          throw new Error(`未找到 GitHub 用户: ${username}`);
        }
        if (response.status === 403) {
          throw new Error('GitHub API 调用超出速率限制，请稍后或使用 Token 登录');
        }
        throw new Error(`GitHub API 验证失败 (${response.status})`);
      }

      const raw = (await response.json()) as any;
      const { role, isAdmin, isFirstAdminClaim, registeredAt } = resolveUserRole(raw, token ? 'token' : 'demo');

      const userData = {
        login: raw.login,
        name: raw.name || raw.login,
        avatar_url: raw.avatar_url || `https://github.com/${raw.login}.png`,
        bio: raw.bio || (isAdmin ? '研发知识中枢管理员 (Admin)' : '研发知识中枢访客 (Visitor)'),
        html_url: raw.html_url || `https://github.com/${raw.login}`,
        public_repos: raw.public_repos || 0,
        followers: raw.followers || 0,
        role,
        isAdmin,
        registeredAt,
      };

      return res.json({ 
        success: true, 
        user: userData, 
        token, 
        isFirstAdminClaim,
        adminUsername: adminSystemCache.admin ? adminSystemCache.admin.login : null,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || '验证失败' });
    }
  });

  // =========================================================================
  // --- 6. Repository Submissions & Admin Approval Endpoints ---
  // =========================================================================

  // 6.1 Check Visitor Submission Rate Limit Quota
  app.get('/api/submissions/quota', (req, res) => {
    const submitter = (req.query.submitter as string) || '';
    const clientKey = getClientIdentifier(req, submitter);
    const maxAllowed = 3;
    const windowMs = 600000; // 10 minutes

    const record = submissionRateLimitStore.get(clientKey);
    const now = Date.now();
    const activeTimestamps = record ? record.timestamps.filter((t) => now - t < windowMs) : [];
    const remaining = Math.max(0, maxAllowed - activeTimestamps.length);
    
    let cooldownSeconds = 0;
    if (record && record.lastRequest > 0) {
      const elapsed = now - record.lastRequest;
      if (elapsed < 20000) {
        cooldownSeconds = Math.ceil((20000 - elapsed) / 1000);
      }
    }

    res.json({
      allowed: remaining > 0 && cooldownSeconds === 0,
      remaining,
      maxAllowed,
      windowMinutes: 10,
      cooldownSeconds,
    });
  });

  // 6.2 Get Submissions (Public sees approved + submitter's; Admin sees all)
  app.get('/api/submissions', (req, res) => {
    const { status, submitter, isAdmin } = req.query;
    const isCallerAdmin = isAdmin === 'true' || isAdmin === '1';

    let list = [...submissionsCache];

    if (!isCallerAdmin) {
      // Non-admin visitor view: only show approved, OR submissions made by this visitor
      if (submitter) {
        list = list.filter((item) => 
          item.status === 'approved' || item.submitter_login.toLowerCase() === String(submitter).toLowerCase()
        );
      } else {
        list = list.filter((item) => item.status === 'approved');
      }
    } else {
      // Admin view: optionally filter by status if specified
      if (status && status !== 'all') {
        list = list.filter((item) => item.status === status);
      }
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = submissionsCache.length;
    const pendingCount = submissionsCache.filter((s) => s.status === 'pending').length;
    const approvedCount = submissionsCache.filter((s) => s.status === 'approved').length;
    const rejectedCount = submissionsCache.filter((s) => s.status === 'rejected').length;

    res.json({
      submissions: list,
      stats: {
        total,
        pendingCount,
        approvedCount,
        rejectedCount,
      },
    });
  });

  // 6.3 Submit a Repository for Showcase (Enforces rate limit: 3 per 10min, 20s cooldown)
  app.post('/api/submissions', async (req, res) => {
    const { repo_url, submitter_login, submitter_avatar, submitter_note } = req.body;
    const rawSubmitter = (submitter_login || 'visitor').trim();
    const clientKey = getClientIdentifier(req, rawSubmitter);

    // Enforce submission rate limiting: max 3 per 10 mins (600,000ms), min 20s between submissions
    const rateCheck = checkRateLimit(submissionRateLimitStore, clientKey, 3, 600000, 20000);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `仓库提交过于频繁，为防止恶意滥用，请等待 ${rateCheck.retryAfter} 秒后再提交。`,
        retryAfter: rateCheck.retryAfter,
        rateLimited: true,
      });
    }

    if (!repo_url || typeof repo_url !== 'string') {
      return res.status(400).json({ error: '请提供有效的 GitHub 仓库地址' });
    }

    const parsed = parseGitHubRepo(repo_url);
    if (!parsed) {
      return res.status(400).json({ 
        error: '仓库地址格式不正确，请填写如 "facebook/react" 或 "https://github.com/facebook/react"' 
      });
    }

    const { owner, name } = parsed;
    const full_name = `${owner}/${name}`;

    // Duplicate submission check
    const existingSubmission = submissionsCache.find(
      (s) => s.full_name.toLowerCase() === full_name.toLowerCase()
    );

    if (existingSubmission) {
      if (existingSubmission.status === 'pending') {
        return res.status(409).json({ 
          error: `仓库 "${full_name}" 目前已在审核队列中，请等待管理员审核，无需重复提交。` 
        });
      }
      if (existingSubmission.status === 'approved') {
        return res.status(409).json({ 
          error: `仓库 "${full_name}" 已经通过管理员审核，并已在前台精选展示中！` 
        });
      }
    }

    // Verify repository existence and metadata from GitHub API
    let repoMetadata = {
      description: '',
      stars: 0,
      language: 'TypeScript',
      homepage: '',
      html_url: `https://github.com/${owner}/${name}`,
    };

    try {
      const ghRes = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'AIram-DevHub',
        },
      });

      if (!ghRes.ok) {
        if (ghRes.status === 404) {
          return res.status(404).json({ 
            error: `在 GitHub 上未找到公开仓库 "${full_name}"，请检查名称拼写或确认是否为私有仓库。` 
          });
        }
      } else {
        const ghData = (await ghRes.json()) as any;
        repoMetadata = {
          description: ghData.description || '暂无项目描述',
          stars: ghData.stargazers_count || 0,
          language: ghData.language || 'Markdown',
          homepage: ghData.homepage || '',
          html_url: ghData.html_url || `https://github.com/${owner}/${name}`,
        };
      }
    } catch (fetchErr) {
      console.warn('GitHub API fetch failed, proceeding with basic info:', fetchErr);
    }

    const newSubmission: RepoSubmission = {
      id: `sub-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      repo_url: repoMetadata.html_url,
      owner,
      name,
      full_name,
      description: repoMetadata.description || (submitter_note ? submitter_note.slice(0, 120) : '访客推荐开源项目'),
      stars: repoMetadata.stars,
      language: repoMetadata.language,
      homepage: repoMetadata.homepage || undefined,
      submitter_login: rawSubmitter,
      submitter_avatar: submitter_avatar || `https://github.com/${rawSubmitter}.png`,
      submitter_note: submitter_note ? submitter_note.trim() : undefined,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    submissionsCache = [newSubmission, ...submissionsCache];
    saveSubmissions(submissionsCache);

    res.json({
      success: true,
      submission: newSubmission,
      message: `仓库 ${full_name} 提交成功！已进入待审核队列，经管理员批准后将正式在前台精选展示。`,
      remaining: rateCheck.remaining,
    });
  });

  // 6.4 Admin Review Submission (Approve or Reject)
  app.post('/api/submissions/:id/review', (req, res) => {
    const { id } = req.params;
    const { action, review_comment, admin_login } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '无效的审核操作，只支持 approve 或 reject' });
    }

    // Role check: Must be system administrator
    const currentAdmin = adminSystemCache.admin;
    if (!currentAdmin) {
      return res.status(403).json({ error: '系统尚未产生首位管理员，无法进行审核' });
    }

    if (!admin_login || admin_login.toLowerCase() !== currentAdmin.login.toLowerCase()) {
      return res.status(403).json({ 
        error: `只有系统管理员 (@${currentAdmin.login}) 有权批准或驳回仓库提交。` 
      });
    }

    const subIndex = submissionsCache.findIndex((s) => s.id === id);
    if (subIndex === -1) {
      return res.status(404).json({ error: '未找到该仓库提交记录' });
    }

    const target = submissionsCache[subIndex];
    target.status = action === 'approve' ? 'approved' : 'rejected';
    target.reviewed_at = new Date().toISOString();
    target.reviewed_by = currentAdmin.login;
    target.review_comment = review_comment ? review_comment.trim() : (action === 'approve' ? '审核通过，准予展示' : '未达到展示标准');

    submissionsCache[subIndex] = target;
    saveSubmissions(submissionsCache);

    res.json({
      success: true,
      submission: target,
      message: action === 'approve' ? `已批准仓库 ${target.full_name} 在前台展示！` : `已驳回仓库 ${target.full_name}。`,
    });
  });

  // 6.5 Admin Delete Submission
  app.delete('/api/submissions/:id', (req, res) => {
    const { id } = req.params;
    const admin_login = (req.query.admin_login as string) || (req.body?.admin_login as string);

    const currentAdmin = adminSystemCache.admin;
    if (!currentAdmin || !admin_login || admin_login.toLowerCase() !== currentAdmin.login.toLowerCase()) {
      return res.status(403).json({ error: '只有系统管理员有权删除提交记录' });
    }

    const initialLen = submissionsCache.length;
    submissionsCache = submissionsCache.filter((s) => s.id !== id);
    saveSubmissions(submissionsCache);

    res.json({
      success: true,
      message: initialLen !== submissionsCache.length ? '已成功删除该记录' : '记录不存在',
    });
  });

  // 7. Frontend Integration (Vite in dev, static files in prod)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
