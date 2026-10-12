export interface AdminRecord {
  login: string;
  name: string;
  avatar_url: string;
  claimedVia: 'oauth' | 'token' | 'demo' | 'env';
  claimedAt: string;
}

export interface EnvWithStorage {
  DB?: any;
  AIRAM_DB?: any;
  KV?: any;
  ADMIN_KV?: any;
  STORAGE?: any;
  ADMIN_USER?: string;
  GITHUB_CLIENT_ID?: string;
  VITE_GITHUB_CLIENT_ID?: string;
  OAUTH_CLIENT_ID?: string;
  [key: string]: any;
}

// Global edge worker isolate in-memory cache
let inMemoryAdmin: AdminRecord | null = null;

function getHostOrigin(requestUrl?: string): string {
  if (requestUrl) {
    try {
      const u = new URL(requestUrl);
      return `https://${u.host}`;
    } catch {}
  }
  return 'https://airam.pages.dev';
}

function getCacheLockUrl(requestUrl?: string): string {
  return `${getHostOrigin(requestUrl)}/api/__admin_system_lock__`;
}

function getBucketId(env: EnvWithStorage): string {
  const rawId = env.GITHUB_CLIENT_ID || env.VITE_GITHUB_CLIENT_ID || env.OAUTH_CLIENT_ID || 'airam_default_app';
  let hash = 0;
  for (let i = 0; i < rawId.length; i++) {
    hash = ((hash << 5) - hash + rawId.charCodeAt(i)) | 0;
  }
  const clean = rawId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8);
  return `airam_${clean || 'app'}_${Math.abs(hash).toString(16)}`;
}

async function getCachedAdmin(requestUrl?: string): Promise<AdminRecord | null> {
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const lockUrl = getCacheLockUrl(requestUrl);
      const res = await (caches as any).default.match(new Request(lockUrl));
      if (res) {
        const data = await res.json();
        if (data && data.login) return data as AdminRecord;
      }
    }
  } catch {}
  return null;
}

async function setCachedAdmin(admin: AdminRecord | null, requestUrl?: string): Promise<void> {
  try {
    if (typeof caches !== 'undefined' && (caches as any).default) {
      const lockUrl = getCacheLockUrl(requestUrl);
      const req = new Request(lockUrl);
      if (admin) {
        await (caches as any).default.put(
          req,
          new Response(JSON.stringify(admin), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=31536000, s-maxage=31536000',
            },
          })
        );
      } else {
        await (caches as any).default.delete(req);
      }
    }
  } catch {}
}

async function getKvAdmin(env: EnvWithStorage): Promise<AdminRecord | null> {
  const kv = env.KV || env.ADMIN_KV || env.STORAGE;
  if (kv && typeof kv.get === 'function') {
    try {
      const data = await kv.get('airam_admin_system', 'json');
      if (data && data.login) return data as AdminRecord;
    } catch {}
  }
  return null;
}

async function setKvAdmin(env: EnvWithStorage, admin: AdminRecord | null): Promise<void> {
  const kv = env.KV || env.ADMIN_KV || env.STORAGE;
  if (kv) {
    try {
      if (admin && typeof kv.put === 'function') {
        await kv.put('airam_admin_system', JSON.stringify(admin));
      } else if (!admin && typeof kv.delete === 'function') {
        await kv.delete('airam_admin_system');
      }
    } catch {}
  }
}

async function getD1Admin(env: EnvWithStorage): Promise<AdminRecord | null> {
  const db = env.DB || env.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS admin_system (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_login TEXT NOT NULL,
          admin_name TEXT,
          avatar_url TEXT,
          claimed_via TEXT,
          claimed_at TEXT
        )
      `).run();
      const row: any = await db.prepare('SELECT * FROM admin_system LIMIT 1').first();
      if (row && row.admin_login) {
        return {
          login: row.admin_login,
          name: row.admin_name || row.admin_login,
          avatar_url: row.avatar_url || `https://github.com/${row.admin_login}.png`,
          claimedVia: (row.claimed_via as any) || 'oauth',
          claimedAt: row.claimed_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.warn('D1 getAdmin error:', e);
    }
  }
  return null;
}

async function setD1Admin(env: EnvWithStorage, admin: AdminRecord | null): Promise<void> {
  const db = env.DB || env.AIRAM_DB;
  if (db && typeof db.prepare === 'function') {
    try {
      await db.prepare(`
        CREATE TABLE IF NOT EXISTS admin_system (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          admin_login TEXT NOT NULL,
          admin_name TEXT,
          avatar_url TEXT,
          claimed_via TEXT,
          claimed_at TEXT
        )
      `).run();
      if (admin) {
        await db.prepare(`DELETE FROM admin_system`).run();
        await db.prepare(`
          INSERT INTO admin_system (admin_login, admin_name, avatar_url, claimed_via, claimed_at)
          VALUES (?, ?, ?, ?, ?)
        `).bind(admin.login, admin.name, admin.avatar_url, admin.claimedVia, admin.claimedAt).run();
      } else {
        await db.prepare(`DELETE FROM admin_system`).run();
      }
    } catch (e) {
      console.warn('D1 setAdmin error:', e);
    }
  }
}

async function getRemoteAdmin(env: EnvWithStorage): Promise<AdminRecord | null> {
  try {
    const bucket = getBucketId(env);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`https://kvdb.io/${bucket}/admin_system_lock`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });
    clearTimeout(timer);
    if (res.ok) {
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        if (data && data.login) return data as AdminRecord;
      }
    }
  } catch {}
  return null;
}

async function setRemoteAdmin(env: EnvWithStorage, admin: AdminRecord | null): Promise<void> {
  try {
    const bucket = getBucketId(env);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    if (admin) {
      await fetch(`https://kvdb.io/${bucket}/admin_system_lock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin),
        signal: controller.signal,
      });
    } else {
      await fetch(`https://kvdb.io/${bucket}/admin_system_lock`, {
        method: 'DELETE',
        signal: controller.signal,
      });
    }
    clearTimeout(timer);
  } catch {}
}

/**
 * Retrieve the currently locked administrator.
 * Guaranteed multi-tiered check across:
 * 1. env.ADMIN_USER (Hardcoded permanent override)
 * 2. Cloudflare D1
 * 3. Cloudflare KV
 * 4. Cloudflare Zone Cache API
 * 5. In-memory isolate cache
 * 6. Edge Remote KV fallback
 */
export async function getAdminRecord(env: EnvWithStorage, requestUrl?: string): Promise<AdminRecord | null> {
  // 1. Explicit env override: ADMIN_USER
  if (env.ADMIN_USER && env.ADMIN_USER.trim()) {
    const username = env.ADMIN_USER.trim();
    return {
      login: username,
      name: username,
      avatar_url: `https://github.com/${username}.png`,
      claimedVia: 'env',
      claimedAt: new Date().toISOString(),
    };
  }

  // 2. Check D1 Database
  const d1Admin = await getD1Admin(env);
  if (d1Admin) {
    inMemoryAdmin = d1Admin;
    setCachedAdmin(d1Admin, requestUrl);
    return d1Admin;
  }

  // 3. Check KV
  const kvAdmin = await getKvAdmin(env);
  if (kvAdmin) {
    inMemoryAdmin = kvAdmin;
    setCachedAdmin(kvAdmin, requestUrl);
    return kvAdmin;
  }

  // 4. Check Cloudflare Edge Cache
  const cachedAdmin = await getCachedAdmin(requestUrl);
  if (cachedAdmin) {
    inMemoryAdmin = cachedAdmin;
    return cachedAdmin;
  }

  // 5. Check in-memory isolate cache
  if (inMemoryAdmin) {
    return inMemoryAdmin;
  }

  // 6. Check Edge Remote KV sync (guarantees cross-browser & cross-isolate persistence without DB bindings)
  const remoteAdmin = await getRemoteAdmin(env);
  if (remoteAdmin) {
    inMemoryAdmin = remoteAdmin;
    setCachedAdmin(remoteAdmin, requestUrl);
    return remoteAdmin;
  }

  return null;
}

/**
 * Save the first claimed administrator across all storage layers.
 */
export async function saveAdminRecord(env: EnvWithStorage, admin: AdminRecord, requestUrl?: string): Promise<void> {
  inMemoryAdmin = admin;
  await Promise.allSettled([
    setD1Admin(env, admin),
    setKvAdmin(env, admin),
    setCachedAdmin(admin, requestUrl),
    setRemoteAdmin(env, admin),
  ]);
}

/**
 * Reset administrator lock.
 */
export async function resetAdminRecord(env: EnvWithStorage, requestUrl?: string): Promise<void> {
  inMemoryAdmin = null;
  await Promise.allSettled([
    setD1Admin(env, null),
    setKvAdmin(env, null),
    setCachedAdmin(null, requestUrl),
    setRemoteAdmin(env, null),
  ]);
}

/**
 * Resolves role: The first user to authorize claims the admin seat.
 * Subsequent users with different usernames are strictly 'visitor'.
 */
export async function resolveRole(
  env: EnvWithStorage,
  rawUser: { login: string; name?: string; avatar_url?: string },
  via: 'oauth' | 'token' | 'demo' = 'oauth',
  requestUrl?: string
): Promise<{ role: 'admin' | 'visitor'; isAdmin: boolean; isFirstAdminClaim: boolean; admin: AdminRecord }> {
  const currentAdmin = await getAdminRecord(env, requestUrl);

  if (!currentAdmin) {
    // FIRST USER! Claim administrator seat!
    const newAdmin: AdminRecord = {
      login: rawUser.login,
      name: rawUser.name || rawUser.login,
      avatar_url: rawUser.avatar_url || `https://github.com/${rawUser.login}.png`,
      claimedVia: via,
      claimedAt: new Date().toISOString(),
    };
    await saveAdminRecord(env, newAdmin, requestUrl);
    return {
      role: 'admin',
      isAdmin: true,
      isFirstAdminClaim: true,
      admin: newAdmin,
    };
  }

  // Admin already exists! Check if this user is the registered admin:
  const isMatch = currentAdmin.login.toLowerCase() === rawUser.login.toLowerCase();
  if (isMatch) {
    return {
      role: 'admin',
      isAdmin: true,
      isFirstAdminClaim: false,
      admin: currentAdmin,
    };
  }

  // Different user: STRICTLY VISITOR
  return {
    role: 'visitor',
    isAdmin: false,
    isFirstAdminClaim: false,
    admin: currentAdmin,
  };
}
