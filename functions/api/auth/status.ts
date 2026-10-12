import { getAdminRecord } from '../../_admin';

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
  const adminList = (env.ADMIN_USER || '')
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  if (adminList.length > 0) {
    hasAdmin = true;
    adminUsername = adminList[0];
    adminUser = {
      login: adminUsername,
      name: adminUsername,
      avatar_url: `https://github.com/${adminUsername}.png`,
      claimedAt: new Date().toISOString(),
    };
  }

  return new Response(JSON.stringify({
    configured: Boolean(clientId && clientSecret),
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasToken: Boolean(env.GITHUB_TOKEN),
    clientId: clientId || null,
    redirectUri,
    hasAdmin,
    adminUsername,
    adminUser,
    adminUsers: adminList,
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
