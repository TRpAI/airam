import { getAllSubmissions, addSubmission, RepoSubmissionRecord } from '../../_submissions';

export const onRequestGet: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  const isAdmin = url.searchParams.get('isAdmin') === 'true' || url.searchParams.get('isAdmin') === '1';
  const submitter = url.searchParams.get('submitter');

  const all = await getAllSubmissions(context.env);

  let filtered: RepoSubmissionRecord[] = all;

  if (isAdmin) {
    // 管理员：查看全部提交（待审核、已批准、已驳回）
    filtered = all;
  } else {
    // 前台展示 / 访客用户：展示全部已批准精选，若指定了当前访客，则同时包含该访客自己提交的所有记录
    if (submitter) {
      const cleanSubmitter = submitter.trim().toLowerCase();
      filtered = all.filter(
        s => s.status === 'approved' || s.submitter_login.toLowerCase() === cleanSubmitter
      );
    } else {
      filtered = all.filter(s => s.status === 'approved');
    }
  }

  // 排序：最新提交靠前
  filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const stats = {
    total: all.length,
    pendingCount: all.filter(s => s.status === 'pending').length,
    approvedCount: all.filter(s => s.status === 'approved').length,
    rejectedCount: all.filter(s => s.status === 'rejected').length,
  };

  return new Response(JSON.stringify({
    submissions: filtered,
    stats,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store'
    }
  });
};

export const onRequestPost: PagesFunction = async (context) => {
  try {
    const body: any = await context.request.json();
    const { repo_url, submitter_login, submitter_avatar, submitter_note } = body;

    if (!repo_url || !submitter_login) {
      return new Response(JSON.stringify({ error: '请提供有效的 GitHub 仓库地址并登录' }), { status: 400 });
    }

    const result = await addSubmission(context.env, {
      repo_url,
      submitter_login,
      submitter_avatar,
      submitter_note,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || '提交失败' }), { status: 400 });
    }

    return new Response(JSON.stringify({
      success: true,
      submission: result.submission,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || '提交仓库失败' }), { status: 500 });
  }
};
