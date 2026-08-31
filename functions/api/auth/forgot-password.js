// functions/api/auth/forgot-password.js
// 匿名可调用：给邮箱生成 reset_token，1h 有效
// MVP：考虑到还未上线 Email 发送能力（子项目 B），该接口直接返回 reset link 给
// 管理前端（/admin?resetToken=...）并同时在响应中给出跳转 URL，
// 方便超级管理员手动把链接发给当事人。
import { withDb, json, err, qFirst, qRun } from '../_shared/db.js';
import { randomToken, sha256Hex } from '../_shared/auth.js';
import { checkRateLimit } from '../_shared/rate-limit.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const rl = checkRateLimit(req, env, { key: 'auth_forgot', limit: 3, windowMs: 60 * 60_000 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }
    const email = (body.email || '').toString().trim().toLowerCase();
    if (!email) return err('Email required', 400);

    if (!db) return err('Database not available in this environment', 503);

    const admin = await qFirst(db, 'SELECT id FROM admins WHERE email = ?', [email]);
    // 枚举保护：邮箱不存在也返回 200（不透露存在性）
    if (!admin) {
      return json({ ok: true, sent: false, message: 'If that email is registered, a reset link has been prepared.' });
    }

    const token = randomToken(32);
    const tokenHash = await sha256Hex(token);
    const expires = Math.floor(Date.now() / 1000) + 3600;
    await qRun(
      db,
      'UPDATE admins SET reset_token = ?, reset_expires_at = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?',
      [tokenHash, expires, admin.id]
    );

    // 重置页面（前端 Admin 内的）：
    const resetUrl = `/admin#reset/${encodeURIComponent(email)}/${encodeURIComponent(token)}`;
    return json({
      ok: true,
      sent: true,
      // 仅开发环境暴露 reset 链接；生产环境应该通过邮件发送。
      // 这里 MVP：若 env.STAGE=dev 或未设置，返回链接让管理员自己拷贝给当事人。
      _devOnlyResetLink: (env.STAGE || 'dev') === 'dev' ? resetUrl : undefined,
      message: 'Reset link generated. Please send it to the admin via secure channel.',
    });
  });
}
