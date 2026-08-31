// functions/api/form/contact.js
// 联系表单提交：匿名可，8 req/min/IP
import { withDb, json, err, qRun, qFirst } from '../_shared/db.js';
import { checkRateLimit } from '../_shared/rate-limit.js';
import { notifyBoth } from '../_shared/outbox.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const rl = checkRateLimit(req, env, { key: 'form_contact', limit: 8 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

    const name = (body.name || '').toString().slice(0, 120).trim();
    const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
    const phone = (body.phone || '').toString().slice(0, 40);
    const subject = (body.subject || '').toString().slice(0, 200).trim();
    const message = (body.message || '').toString().slice(0, 5000).trim();
    const sourcePage = (body.sourcePage || 'contact').toString().slice(0, 60);
    if (!name || !email || !message) return err('name, email, message are required', 400);
    if (!/.+@.+\..+/.test(email)) return err('Invalid email', 400);

    // 先用户 upsert 到 users 表
    let userId = null;
    if (db) {
      try {
        const exist = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (exist) userId = exist.id;
        if (!userId) {
          await qRun(db, `
            INSERT INTO users (email, name, phone, source, created_at, updated_at)
            VALUES (?, ?, ?, 'contact', strftime('%s','now'), strftime('%s','now'))`,
            [email, name, phone || null]
          );
          const r = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
          if (r) userId = r.id;
        } else if (phone) {
          await qRun(db, 'UPDATE users SET phone = COALESCE(NULLIF(?,\'\'), phone), name = COALESCE(NULLIF(?,\'\'), name), updated_at = strftime(\'%s\',\'now\') WHERE id = ?',
            [phone, name, userId]);
        }
      } catch (e) { /* 写用户失败不影响表单入库 */ }
    }

    // 写入 contact_messages
    let msgId = null;
    if (db) {
      const r = await qRun(db, `
        INSERT INTO contact_messages (user_id, name, email, phone, subject, message, source_page, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'new', strftime('%s','now'), strftime('%s','now'))`,
        [userId, name, email, phone || null, subject || '(no subject)', message, sourcePage]
      );
      if (r && typeof r.meta?.last_row_id !== 'undefined') msgId = r.meta.last_row_id;
      else if (r && typeof r.lastInsertRowid !== 'undefined') msgId = r.lastInsertRowid;
      else msgId = null;
    }

    // 外发通知（Email + WA）—— B 子项目再真正发送
    await notifyBoth({
      userEmail: email,
      userPhone: phone,
      adminEmail: env.ADMIN_NOTIFY_EMAIL || '',
      subject: `[Contact] ${subject || '(no subject)'} — ${name}`,
      body: message,
      smsTemplate: 'contact_received',
      env,
    });

    return json({
      ok: true,
      id: msgId,
      // 给前端明确的"已入库"反馈 + 客服用什么方式联系客户
      note: 'We have received your message and will reply within 24-48 business hours.',
    }, { status: 201 });
  });
}
