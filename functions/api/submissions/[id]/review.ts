import { updateSubmissionStatus } from '../../../_submissions';

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const body: any = await context.request.json();
    const { action, review_comment, admin_login } = body;

    if (!id || (action !== 'approve' && action !== 'reject')) {
      return new Response(JSON.stringify({ error: '无效的审核操作' }), { status: 400 });
    }

    const res = await updateSubmissionStatus(
      context.env,
      id,
      action,
      review_comment,
      admin_login
    );

    if (!res.success) {
      return new Response(JSON.stringify({ error: res.error || '审核失败' }), { status: 403 });
    }

    return new Response(JSON.stringify({
      success: true,
      submission: res.submission,
      message: action === 'approve' ? '审核已批准，准予展示' : '已驳回该仓库提交',
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '审核处理失败' }), { status: 500 });
  }
};
