import { resetAdminRecord, EnvWithStorage } from '../../_admin';

export const onRequestPost: PagesFunction<EnvWithStorage> = async (context) => {
  try {
    await resetAdminRecord(context.env, context.request.url);
    return new Response(JSON.stringify({
      success: true,
      message: '管理员席位已重置，首位 GitHub 登录用户将重新获得所有者资格'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({
      error: err.message || '重置管理员席位失败'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
