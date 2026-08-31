// functions/api/auth/me.js
import { withDb, json, err, qFirst } from '../_shared/db.js';
import { requireAuth } from '../_shared/auth.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'GET') return err('Method not allowed', 405);
    const guard = await requireAuth(ctx, 'support');
    if (guard.response) return guard.response;
    const a = guard.admin; // { sub, role, name, email }
    let dbRow = null;
    if (db) {
      dbRow = await qFirst(db, 'SELECT id, email, role, name, last_login_at FROM admins WHERE id = ?', [a.sub]);
    }
    return json({
      ok: true,
      admin: dbRow || {
        id: a.sub, email: a.email, role: a.role, name: a.name, last_login_at: null,
      },
    });
  });
}
