// functions/api/auth/login.js
import { withDb, json, err, qFirst, qRun } from '../_shared/db.js';
import { signSession, buildSetCookieHeader, genCsrf, buildCsrfSetCookie, verifyPassword } from '../_shared/auth.js';
import { checkRateLimit } from '../_shared/rate-limit.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const rl = checkRateLimit(req, env, { key: 'auth_login', limit: 6, windowMs: 60_000 });
    if (!rl.ok) return err('Too many login attempts', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON body', 400); }
    const email = (body.email || '').toString().trim().toLowerCase();
    const pwd = (body.password || '').toString();
    if (!email || !pwd) return err('Email and password are required', 400);

    // 1. 无 DB（本地 preview）模式：使用 env 配置的 SUPER_ADMIN_EMAIL/SUPER_ADMIN_INIT_PASSWORD 假登录
    if (!db) {
      const envEmail = (env.SUPER_ADMIN_EMAIL || '').toLowerCase();
      const envPwd = env.SUPER_ADMIN_INIT_PASSWORD || '';
      if (!envEmail || envEmail !== email) return err('Invalid credentials (local env mode needs SUPER_ADMIN_EMAIL)', 401);
      if (!envPwd || envPwd !== pwd) return err('Invalid credentials', 401);
      return await respondWithSession(ctx, { sub: 0, role: 'super_admin', name: 'Local Super Admin', email });
    }

    const row = await qFirst(db, 'SELECT * FROM admins WHERE email = ? LIMIT 1', [email]);
    if (!row) return err('Invalid credentials', 401);
    const ok = await verifyPassword(pwd, row.password_hash);
    if (!ok) return err('Invalid credentials', 401);

    await qRun(db, 'UPDATE admins SET last_login_at = strftime(\'%s\',\'now\'), updated_at = strftime(\'%s\',\'now\') WHERE id = ?', [row.id]);

    return await respondWithSession(ctx, {
      sub: row.id,
      role: row.role,
      name: row.name || '',
      email: row.email,
    });
  });
}

async function respondWithSession(ctx, claims) {
  const env = ctx.env;
  const cookieBody = await signSession(claims, env);
  const csrf = genCsrf();
  const headers = new Headers();
  headers.append('Set-Cookie', buildSetCookieHeader(cookieBody));
  headers.append('Set-Cookie', buildCsrfSetCookie(csrf));
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'private, no-store');
  return new Response(JSON.stringify({
    ok: true,
    admin: { id: claims.sub, role: claims.role, name: claims.name, email: claims.email },
    csrf,
  }), { headers, status: 200 });
}
