// Central Hub Data Sync endpoint for Cloudflare Pages
let edgeHubData: any = {
  projects: [],
  repos: [],
  knowledge: [],
  syncLogs: [],
  isDemoPurged: true,
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    if (body.projects !== undefined) edgeHubData.projects = body.projects;
    if (body.repos !== undefined) edgeHubData.repos = body.repos;
    if (body.knowledge !== undefined) edgeHubData.knowledge = body.knowledge;
    if (body.syncLogs !== undefined) edgeHubData.syncLogs = body.syncLogs;
    if (body.isDemoPurged !== undefined) edgeHubData.isDemoPurged = body.isDemoPurged;

    return new Response(JSON.stringify({ success: true, updated: edgeHubData }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '同步失败' }), { status: 500 });
  }
};

export const onRequestGet: PagesFunction = async (context) => {
  return new Response(JSON.stringify(edgeHubData), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store',
    },
  });
};
