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

  try {
    const adminRecord = await getAdminRecord(env, context.request.url);
    if (adminRecord && adminRecord.login) {
      hasAdmin = true;
      adminUsername = adminRecord.login;
      adminUser = adminRecord;
    }
  } catch (err) {
    console.warn('Failed to query admin record in status.ts:', err);
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
