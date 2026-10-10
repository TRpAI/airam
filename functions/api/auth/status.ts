interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_TOKEN?: string;
  ENVIRONMENT?: string;
  DB?: any;
  ADMIN_USER?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  VITE_GITHUB_CLIENT_SECRET?: string;
  OAUTH_CLIENT_ID?: string;
  OAUTH_CLIENT_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
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
  const queryOrigin = url.searchParams.get('origin');
  const origin = queryOrigin || url.origin;
  const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;

  let hasAdmin = false;
  let adminUsername: string | null = null;
  let adminUser: any = null;

  if (env.DB) {
    try {
      const res: any = await env.DB.prepare('SELECT * FROM admin_system LIMIT 1').first();
      if (res && res.admin_login) {
        hasAdmin = true;
        adminUsername = res.admin_login;
        adminUser = {
          login: res.admin_login,
          name: res.admin_name || res.admin_login,
          avatar_url: res.avatar_url || `https://github.com/${res.admin_login}.png`,
          claimedAt: res.claimed_at,
          claimedVia: res.claimed_via || 'oauth'
        };
      }
    } catch {
      // Table may not exist yet
    }
  }

  if (!hasAdmin && env.ADMIN_USER) {
    hasAdmin = true;
    adminUsername = env.ADMIN_USER;
    adminUser = {
      login: env.ADMIN_USER,
      name: env.ADMIN_USER,
      avatar_url: `https://github.com/${env.ADMIN_USER}.png`,
      claimedAt: new Date().toISOString(),
      claimedVia: 'env'
    };
  }

  return new Response(JSON.stringify({
    configured: Boolean(clientId && clientSecret),
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    clientId: clientId ? `${clientId.substring(0, 6)}...` : null,
    redirectUri,
    hasAdmin,
    adminUsername,
    adminUser,
    environment: env.ENVIRONMENT || 'production',
    isCloudflare: true
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store'
    }
  });
};
