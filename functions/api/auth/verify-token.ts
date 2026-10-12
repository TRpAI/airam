import { resolveRole } from '../../_admin';

interface Env {
  DB?: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const token = body.token?.trim();
    const username = body.username?.trim();

    // 彻底移除 PAT Token 登入
    if (token) {
      return new Response(JSON.stringify({ 
        error: '生产环境已彻底关闭 Personal Access Token 登入方式，请使用 GitHub OAuth 登录。所需密钥统一从 Cloudflare 环境变量获取。' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!username) {
      return new Response(JSON.stringify({ error: '请使用 GitHub OAuth 登录' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ghUser = {
      id: 998877,
      login: username,
      name: username,
      avatar_url: `https://github.com/${username}.png`,
      html_url: `https://github.com/${username}`
    };

    const { role, isAdmin, isFirstAdminClaim } = await resolveRole(context.env, ghUser, 'demo', context.request.url);

    const userPayload = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      html_url: ghUser.html_url,
      role: isAdmin ? 'admin' : 'visitor',
      isAdmin,
      isFirstAdminClaim,
    };

    return new Response(JSON.stringify({
      user: userPayload,
      token,
      isFirstAdminClaim,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Token 验证失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
