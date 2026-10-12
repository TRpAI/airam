import { isUserAdmin } from '../../../_admin';

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const id = context.params.id as string;
    const body: any = await context.request.json();
    const { action, review_comment, admin_login } = body;

    if (!id || (action !== 'approve' && action !== 'reject')) {
      return new Response(JSON.stringify({ error: '无效的审核操作' }), { status: 400 });
    }

    const isAdmin = isUserAdmin(context.env as any, admin_login);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: '无权执行审核操作，需要管理员权限' }), { status: 403 });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const reviewedAt = new Date().toISOString();
    const finalComment = review_comment ? review_comment.trim() : (action === 'approve' ? '审核通过，准予展示' : '未达到展示标准');

    const db = (context.env as any).DB || (context.env as any).AIRAM_DB;
    if (db && typeof db.prepare === 'function') {
      try {
        await db.prepare(`
          UPDATE repo_submissions
          SET status = ?, review_comment = ?, reviewed_at = ?, reviewed_by = ?
          WHERE id = ?
        `).bind(newStatus, finalComment, reviewedAt, admin_login, id).run();
      } catch (e) {
        console.warn('D1 update review failed:', e);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      id,
      status: newStatus,
      review_comment: finalComment,
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
