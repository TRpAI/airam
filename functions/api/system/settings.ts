interface Env {
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  GITHUB_TOKEN?: string;
  ENVIRONMENT?: string;
  DB?: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const env = context.env;
  const clientId = env.GITHUB_CLIENT_ID || '';
  const clientSecret = env.GITHUB_CLIENT_SECRET || '';
  const githubToken = env.GITHUB_TOKEN || '';
  const environment = env.ENVIRONMENT || 'production';

  return new Response(JSON.stringify({
    environment,
    isCloudflare: true,
    hasClientId: Boolean(clientId),
    hasClientSecret: Boolean(clientSecret),
    hasGithubToken: Boolean(githubToken),
    clientIdMasked: clientId ? `${clientId.substring(0, 6)}...` : null,
    d1Connected: Boolean(env.DB),
    demoDataPurged: environment === 'production',
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    }
  });
};
