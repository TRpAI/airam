interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  VITE_GITHUB_CLIENT_SECRET?: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  DB?: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env;
  const clientId = env.GITHUB_CLIENT_ID || env.VITE_GITHUB_CLIENT_ID || env.OAUTH_CLIENT_ID || '';
  const clientSecret = env.GITHUB_CLIENT_SECRET || env.VITE_GITHUB_CLIENT_SECRET || env.OAUTH_CLIENT_SECRET || '';

  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>GitHub 授权失败</title></head>
      <body style="font-family: monospace; padding: 30px; text-align: center; background: #09090b; color: #f43f5e;">
        <h3>授权遇到错误: ${error}</h3>
        <p>${errorDescription || '用户取消或未通过 GitHub 授权'}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
          }
          setTimeout(() => window.close(), 2500);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }

  if (!code) {
    return new Response('缺少 GitHub 授权 code 参数', { status: 400 });
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'AIram-Cloudflare-Worker'
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData: any = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      throw new Error(tokenData.error_description || '交换 Access Token 失败');
    }

    const accessToken = tokenData.access_token;

    // 2. Fetch authenticated GitHub user
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'AIram-Cloudflare-Worker',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userRes.ok) {
      throw new Error('获取 GitHub 用户资料失败');
    }

    const ghUser: any = await userRes.json();

    // 3. First user becomes Admin
    let isAdmin = false;
    let isFirstAdmin = false;

    if (env.DB) {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS admin_system (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_login TEXT NOT NULL,
            admin_name TEXT,
            avatar_url TEXT,
            claimed_via TEXT,
            claimed_at TEXT
          )
        `).run();

        const currentAdmin: any = await env.DB.prepare('SELECT * FROM admin_system LIMIT 1').first();
        if (!currentAdmin) {
          // This is the FIRST user!
          await env.DB.prepare(`
            INSERT INTO admin_system (admin_login, admin_name, avatar_url, claimed_via, claimed_at)
            VALUES (?, ?, ?, 'oauth', ?)
          `).bind(ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url, new Date().toISOString()).run();
          isAdmin = true;
          isFirstAdmin = true;
        } else if (currentAdmin.admin_login.toLowerCase() === ghUser.login.toLowerCase()) {
          isAdmin = true;
        }
      } catch (dbErr) {
        console.warn('D1 admin lookup error:', dbErr);
        isAdmin = true; // Fallback grant to first session
      }
    } else {
      // No D1 bound: grant admin for session
      isAdmin = true;
      isFirstAdmin = true;
    }

    const userPayload = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      html_url: ghUser.html_url,
      role: isAdmin ? 'admin' : 'visitor',
      isAdmin,
      isFirstAdminClaim: isFirstAdmin,
    };

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><title>GitHub 授权成功</title></head>
      <body style="font-family: -apple-system, monospace; padding: 40px; text-align: center; background: #09090b; color: #10b981;">
        <div style="max-width: 380px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px;">
          <h2 style="margin: 0 0 10px; color: #fff; font-size: 16px;">
            ${isAdmin ? '👑 成功以管理员身份登入' : '👋 欢迎访问 - 访客模式'}
          </h2>
          <p style="color: #a1a1aa; font-size: 13px;">正在同步认证凭据至工作台...</p>
        </div>
        <script>
          const payload = ${JSON.stringify(userPayload)};
          const token = ${JSON.stringify(accessToken)};
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              user: payload,
              token: token
            }, '*');
            setTimeout(() => window.close(), 600);
          } else {
            localStorage.setItem('devhub_auth_session', JSON.stringify({
              isAuthenticated: true,
              user: payload,
              token: token
            }));
            window.location.href = '/';
          }
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (err: any) {
    return new Response(`
      <!DOCTYPE html>
      <html>
      <body style="font-family: monospace; padding: 30px; text-align: center; background: #09090b; color: #f43f5e;">
        <h3>授权处理失败</h3>
        <p>${err.message || '未知错误'}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message || "未知错误"}' }, '*');
          }
          setTimeout(() => window.close(), 3000);
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
