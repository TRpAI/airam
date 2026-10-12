import { resolveRole } from '../_admin';

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
      <head><meta charset="utf-8"><title>GitHub 授权失败</title></head>
      <body style="font-family: -apple-system, monospace; padding: 40px; text-align: center; background: #09090b; color: #f43f5e;">
        <div style="max-width: 420px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <h3 style="color: #f43f5e; margin-top: 0; font-size: 16px;">GitHub 授权未完成</h3>
          <p style="color: #a1a1aa; font-size: 13px; line-height: 1.5;">${errorDescription || error || '用户取消或未通过 GitHub 授权'}</p>
          <div style="margin-top: 20px;">
            <a href="/#/" style="display: inline-block; padding: 8px 16px; background: #27272a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 12px;">立即返回系统主页</a>
          </div>
          <p id="countdown" style="color: #71717a; font-size: 11px; margin-top: 15px;">3秒后自动返回主页...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
            setTimeout(() => window.close(), 2000);
          } else {
            setTimeout(() => { window.location.href = '/#/'; }, 3000);
          }
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

    // 3. Resolve Admin vs Visitor Role using robust multi-layer lock
    const { role, isAdmin, isFirstAdminClaim } = await resolveRole(env, ghUser, 'oauth', context.request.url);

    const userPayload = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      html_url: ghUser.html_url,
      role,
      isAdmin,
      isFirstAdminClaim,
    };

    if (context.request.headers.get('Accept')?.includes('application/json') || url.searchParams.get('format') === 'json') {
      return new Response(JSON.stringify({
        success: true,
        user: userPayload,
        token: accessToken,
        isFirstAdminClaim,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache, no-store'
        }
      });
    }

    return new Response(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>GitHub 授权成功</title></head>
      <body style="font-family: -apple-system, monospace; padding: 40px; text-align: center; background: #09090b; color: #10b981;">
        <div style="max-width: 440px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px 24px; box-shadow: 0 4px 24px rgba(0,0,0,0.6);">
          <div style="font-size: 36px; margin-bottom: 12px;">✅</div>
          <h2 style="margin: 0 0 10px; color: #fff; font-size: 16px; font-weight: 600;">
            ${isAdmin ? '👑 成功以系统管理员身份认证' : '👋 成功以访客身份认证'}
          </h2>
          <p id="status-desc" style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
            已完成 GitHub 身份授权，正在同步凭证并关闭当前窗口，原工作台页面将自动刷新...
          </p>
          <div style="margin-top: 16px;" id="action-box">
            <button onclick="window.close()" style="cursor: pointer; border: none; padding: 10px 24px; background: #10b981; color: #000; font-weight: 600; border-radius: 8px; font-size: 13px; box-shadow: 0 2px 10px rgba(16,185,129,0.3);">
              关闭当前页面返回工作台
            </button>
          </div>
          <p style="color: #71717a; font-size: 11px; margin-top: 18px;">
            若浏览器未自动关闭此页面，请点击上方按钮关闭返回
          </p>
        </div>
        <script>
          const payload = ${JSON.stringify(userPayload)};
          const token = ${JSON.stringify(accessToken)};
          const stateParam = ${JSON.stringify(url.searchParams.get('state') || '')};

          // 1. 同步保存至本地存储，触发同源窗口 storage 监听
          try {
            localStorage.setItem('devhub_auth_session', JSON.stringify({
              isAuthenticated: true,
              user: payload,
              token: token
            }));
            localStorage.setItem('airam_oauth_notify', Date.now().toString());
          } catch (e) {}

          // 2. 通过 BroadcastChannel 向原工作台页面广播授权成功事件 (跨窗口100%可靠，无 opener 丢失风险)
          try {
            const bc = new BroadcastChannel('airam_oauth_auth_channel');
            bc.postMessage({
              type: 'OAUTH_AUTH_SUCCESS',
              user: payload,
              token: token,
              shouldRefresh: true
            });
            setTimeout(() => { bc.close(); }, 1200);
          } catch (e) {}

          // 3. 尝试向 window.opener 发送标准 postMessage 并聚焦原窗口
          if (window.opener && !window.opener.closed) {
            try {
              window.opener.postMessage({
                type: 'OAUTH_AUTH_SUCCESS',
                user: payload,
                token: token,
                shouldRefresh: true
              }, '*');
              try { window.opener.focus(); } catch (fErr) {}
            } catch (e) {}
          }

          // 4. 判定是否为弹窗/新标签授权流：
          // 核心原则：绝不在弹出的授权窗口内刷新跳转至站点后台！必须关闭弹窗并让原页面刷新！
          const isFullPageRedirect = stateParam.includes('direct_fullpage');

          if (!isFullPageRedirect) {
            // 弹窗或独立授权标签：立即并多段尝试关闭本窗口
            try { window.close(); } catch (e) {}
            setTimeout(() => { try { window.close(); } catch (e) {} }, 100);
            setTimeout(() => { try { window.close(); } catch (e) {} }, 400);
            setTimeout(() => { try { window.close(); } catch (e) {} }, 900);
          } else {
            // 仅在明确声明同页整页重定向模式下，才在当前页导航
            const targetUrl = payload.isAdmin ? '/#/admin/dashboard' : '/#/user/dashboard';
            document.getElementById('action-box').innerHTML = '<a href="' + targetUrl + '" style="display:inline-block;padding:8px 18px;background:#10b981;color:#000;font-weight:600;text-decoration:none;border-radius:8px;font-size:12px;">进入工作台</a>';
            setTimeout(() => {
              window.location.href = targetUrl;
            }, 600);
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
      <head><meta charset="utf-8"><title>GitHub 授权处理失败</title></head>
      <body style="font-family: -apple-system, monospace; padding: 40px; text-align: center; background: #09090b; color: #f43f5e;">
        <div style="max-width: 440px; margin: 40px auto; background: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 28px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
          <div style="font-size: 28px; margin-bottom: 12px;">⚠️</div>
          <h3 style="color: #f43f5e; margin: 0 0 10px; font-size: 16px;">授权凭据交换失败</h3>
          <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6; margin-bottom: 20px;">
            ${err.message || '未知错误，未能从 GitHub 换取访问令牌'}
          </p>
          <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 12px; margin-bottom: 20px; text-align: left; font-size: 11px; color: #fbbf24; line-height: 1.6;">
            💡 提示：若您在 Cloudflare Pages 设置了 <code>GITHUB_CLIENT_ID</code> 与 <code>GITHUB_CLIENT_SECRET</code>，请进入 Deployments 执行一次 <strong>Redeploy (重新部署)</strong> 激活生效。
          </div>
          <div>
            <a href="/#/" style="display: inline-block; padding: 9px 20px; background: #27272a; color: #fff; text-decoration: none; border-radius: 8px; font-size: 12px;">立即返回系统主页</a>
          </div>
          <p style="color: #71717a; font-size: 11px; margin-top: 15px;">5秒后自动返回系统主页...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message || "未知错误"}' }, '*');
            setTimeout(() => window.close(), 3000);
          } else {
            setTimeout(() => { window.location.href = '/#/'; }, 5000);
          }
        </script>
      </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};
