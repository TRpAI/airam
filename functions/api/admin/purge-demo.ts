import { purgeAllSubmissions } from '../../_submissions';

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const url = new URL(context.request.url);
    const body: any = await context.request.json().catch(() => ({}));
    const adminLogin = url.searchParams.get('admin_login') || body.admin_login || 'osahermes';

    const res = await purgeAllSubmissions(context.env, adminLogin);
    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error || '清空失败' }), { status: 403 });
    }

    return new Response(JSON.stringify({ success: true, message: '已彻底清空演示数据' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '清空异常' }), { status: 500 });
  }
};
