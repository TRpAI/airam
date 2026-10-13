import { deleteSubmissionRecord } from '../../../_submissions';

export const onRequestDelete: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const url = new URL(context.request.url);
    const adminLogin = url.searchParams.get('admin_login') || '';

    const res = await deleteSubmissionRecord(context.env, id, adminLogin);
    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error || '删除失败' }), { status: 403 });
    }

    return new Response(JSON.stringify({ success: true, message: '已成功删除该记录' }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '删除失败' }), { status: 500 });
  }
};
