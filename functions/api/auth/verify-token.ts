interface Env {
  DB?: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const token = body.token?.trim();

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token 不能为空' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
        'User-Agent': 'AIram-Cloudflare-Worker',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Token 无效或权限不足，需具备 read:user 权限' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ghUser: any = await res.json();
    let isAdmin = false;
    let isFirstAdmin = false;

    if (context.env.DB) {
      try {
        await context.env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS admin_system (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_login TEXT NOT NULL,
            admin_name TEXT,
            avatar_url TEXT,
            claimed_via TEXT,
            claimed_at TEXT
          )
        `).run();

        const currentAdmin: any = await context.env.DB.prepare('SELECT * FROM admin_system LIMIT 1').first();
        if (!currentAdmin) {
          await context.env.DB.prepare(`
            INSERT INTO admin_system (admin_login, admin_name, avatar_url, claimed_via, claimed_at)
            VALUES (?, ?, ?, 'token', ?)
          `).bind(ghUser.login, ghUser.name || ghUser.login, ghUser.avatar_url, new Date().toISOString()).run();
          isAdmin = true;
          isFirstAdmin = true;
        } else if (currentAdmin.admin_login.toLowerCase() === ghUser.login.toLowerCase()) {
          isAdmin = true;
        }
      } catch (err) {
        isAdmin = true;
      }
    } else {
      isAdmin = true;
      isFirstAdmin = true;
    }

    const userPayload = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name || ghUser.login,
      avatar_url: ghUser.avatar_url,
      html_url: ghUser.html_url,
      role: isAdmin ? 'admin' : 'visitor',
      isAdmin,
      isFirstAdminClaim: isFirstAdmin,
    };

    return new Response(JSON.stringify({
      user: userPayload,
      token,
      isFirstAdminClaim: isFirstAdmin,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Token 验证失败' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
