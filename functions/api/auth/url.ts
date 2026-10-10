interface Env {
  GITHUB_CLIENT_ID?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  OAUTH_CLIENT_ID?: string;
  ENVIRONMENT?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env;
  const clientId = 
    env.GITHUB_CLIENT_ID || 
    env.VITE_GITHUB_CLIENT_ID || 
    env.OAUTH_CLIENT_ID || 
    '';
  
  const url = new URL(context.request.url);
  const queryOrigin = url.searchParams.get('origin');
  const origin = queryOrigin || url.origin;
  const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;

  const state = Math.random().toString(36).substring(2, 15);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read:user user:email repo',
    state,
  });

  const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;

  return new Response(JSON.stringify({
    url: authUrl,
    configured: Boolean(clientId),
    redirectUri,
    clientId,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
};
