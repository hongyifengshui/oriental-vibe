// functions/api/auth/init.js
// 一次性初始化路由：若 admins 表为空 + 提供 SUPER_ADMIN_EMAIL / SUPER_ADMIN_INIT_PASSWORD（env）
// 则创建首个 super_admin。用于新环境第一次启用。
// 幂等：已存在 super_admin 时返回 200 ok=true + existed=true
import { withDb, json, err, qFirst, qRun } from '../_shared/db.js';
import { hashPassword } from '../_shared/auth.js';
import { checkRateLimit } from '../_shared/rate-limit.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);

    // 限流：每 IP 3 次/天，避免枚举
    const rl = checkRateLimit(req, env, { key: 'auth_init', limit: 3, windowMs: 24 * 3600_000 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    // 1. 读 body（允许空；此时默认取环境变量）
    let body = {};
    try { body = await req.json().catch(() => ({})); } catch { body = {}; }

    const existingSuper = await qFirst(db, 'SELECT id,email FROM admins WHERE role = ? LIMIT 1', ['super_admin']);
    if (existingSuper) {
      return json({ ok: true, existed: true, message: 'Super admin already exists. Use /api/auth/login.' });
    }

    const email = (body.email || env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
    const plainPwd = (body.password || env.SUPER_ADMIN_INIT_PASSWORD || '').toString();
    const name = (body.name || 'Super Admin').toString().slice(0, 80);
    if (!email || !/.+@.+\..+/.test(email)) return err('Missing/invalid SUPER_ADMIN_EMAIL', 400);
    if (plainPwd.length < 10) {
      // 无密码时自动生成临时密码并返回（一次性）
      const auto = genTempPassword();
      return await createSuper(db, email, auto, name, { returnTempPassword: true });
    }
    return await createSuper(db, email, plainPwd, name, { returnTempPassword: false });
  });
}

function genTempPassword() {
  const alpha = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const a = new Uint8Array(18);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += alpha.charCodeAt(a[i] % alpha.length);
  return s;
}

async function createSuper(db, email, plainPwd, name, opts) {
  const hash = await hashPassword(plainPwd, 10);
  await qRun(
    db,
    `INSERT INTO admins (email, password_hash, role, name, created_at, updated_at)
     VALUES (?, ?, 'super_admin', ?, strftime('%s','now'), strftime('%s','now'))`,
    [email, hash, name]
  );
  const created = await qFirst(db, 'SELECT id, email, role, name FROM admins WHERE email = ?', [email]);
  return json({
    ok: true,
    created: true,
    admin: created,
    ...(opts.returnTempPassword ? { temporaryPassword: plainPwd, note: 'Save this password. It will never be shown again.' } : {}),
  }, { status: 201 });
}
