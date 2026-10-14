export const onRequestGet: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const owner = url.searchParams.get('owner') || '';
    const repo = url.searchParams.get('repo') || '';
    const fullNameParam = url.searchParams.get('full_name') || '';

    let repoOwner = owner.trim();
    let repoName = repo.trim();

    if (!repoOwner && fullNameParam.includes('/')) {
      const parts = fullNameParam.trim().split('/');
      repoOwner = parts[0];
      repoName = parts[1];
    }

    if (!repoOwner || !repoName) {
      return new Response(JSON.stringify({ error: '缺少 owner 或 repo 参数' }), { status: 400 });
    }

    const env = context.env as any;
    const headers: Record<string, string> = {
      'User-Agent': 'AIram-DevHub',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (env.GITHUB_TOKEN) {
      headers.Authorization = `token ${env.GITHUB_TOKEN}`;
    }

    // 1. Try GitHub API
    try {
      const ghRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/readme`, { headers });
      if (ghRes.ok) {
        const ghData: any = await ghRes.json();
        if (ghData.content) {
          // Base64 decode
          const binary = atob(ghData.content.replace(/\s/g, ''));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decoded = new TextDecoder('utf-8').decode(bytes);

          return new Response(JSON.stringify({
            success: true,
            readme: decoded,
            name: ghData.name || 'README.md',
            html_url: ghData.html_url || `https://github.com/${repoOwner}/${repoName}`,
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Cache-Control': 'public, max-age=3600',
            }
          });
        }
      }
    } catch (apiErr) {
      console.warn('GitHub API fetch failed, trying raw fallback:', apiErr);
    }

    // 2. Fallback to raw githubusercontent
    const branches = ['HEAD', 'main', 'master'];
    for (const b of branches) {
      try {
        const rawRes = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${b}/README.md`);
        if (rawRes.ok) {
          const text = await rawRes.text();
          if (text && text.length > 0) {
            return new Response(JSON.stringify({
              success: true,
              readme: text,
              name: 'README.md',
              html_url: `https://github.com/${repoOwner}/${repoName}`,
            }), {
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=3600',
              }
            });
          }
        }
      } catch {}
    }

    return new Response(JSON.stringify({
      success: false,
      error: `未能获取到 ${repoOwner}/${repoName} 的 README 文档`,
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '获取 README 异常' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
