// functions/api/auth/reset-password.js
// 匿名可调用：带 token + email + newPassword 完成重置
import { withDb, json, err, qFirst, qRun } from '../_shared/db.js';
import { sha256Hex, hashPassword } from '../_shared/auth.js';
import { checkRateLimit } from '../_shared/rate-limit.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const rl = checkRateLimit(req, env, { key: 'auth_reset', limit: 5, windowMs: 60_000 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }
    const email = (body.email || '').toString().trim().toLowerCase();
    const token = (body.token || '').toString();
    const newPwd = (body.newPassword || '').toString();
    if (!email || !token) return err('email and token are required', 400);
    if (newPwd.length < 10) return err('newPassword must be at least 10 characters', 400);
    if (!db) return err('Database not available', 503);

    const row = await qFirst(db, 'SELECT * FROM admins WHERE email = ?', [email]);
    if (!row) return err('Invalid reset token', 400);
    if (!row.reset_token || !row.reset_expires_at) return err('Invalid reset token', 400);
    const tokenHash = await sha256Hex(token);
    if (tokenHash !== row.reset_token) return err('Invalid reset token', 400);
    if (row.reset_expires_at < Math.floor(Date.now() / 1000)) return err('Reset token expired', 400);

    const newHash = await hashPassword(newPwd, 10);
    await qRun(
      db,
      `UPDATE admins
       SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL,
           updated_at = strftime('%s','now')
       WHERE id = ?`,
      [newHash, row.id]
    );
    return json({ ok: true, message: 'Password reset successfully. Please login again.' });
  });
}
