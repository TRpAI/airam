import { resolveRole } from '../../_admin';

interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  VITE_GITHUB_CLIENT_SECRET?: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
  DB?: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const env = context.env;
  const clientId = 
    env.GITHUB_CLIENT_ID || 
    env.VITE_GITHUB_CLIENT_ID || 
    env.OAUTH_CLIENT_ID || 
    '';
  const clientSecret = 
    env.GITHUB_CLIENT_SECRET || 
    env.VITE_GITHUB_CLIENT_SECRET || 
    env.OAUTH_CLIENT_SECRET || 
    '';

  const url = new URL(context.request.url);
  let code = url.searchParams.get('code');

  if (!code && context.request.method === 'POST') {
    try {
      const body: any = await context.request.json();
      code = body?.code;
    } catch {
      // ignore
    }
  }

  if (!code) {
    return new Response(JSON.stringify({ error: '缺少 GitHub 授权 code 参数' }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ 
      error: 'Cloudflare Pages 环境变量 GITHUB_CLIENT_ID 或 GITHUB_CLIENT_SECRET 尚未生效，请在 Cloudflare Pages 设置环境变量后点击 Redeploy。' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    // 1. Exchange code for GitHub access token
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
      throw new Error(tokenData.error_description || tokenData.error || '交换 Access Token 失败，授权 Code 可能已过期，请重新发起登录');
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

  } catch (err: any) {
    return new Response(JSON.stringify({ 
      error: err.message || 'GitHub 授权验证失败' 
    }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
