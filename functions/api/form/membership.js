// functions/api/form/membership.js
// 会员购买意向登记（MVP 阶段仅入库 + 生成 pending 订单）
// 真正 Stripe Checkout URL 走 /api/payment/create-checkout（子项目 B 上线）
import { withDb, json, err, qRun, qFirst } from '../_shared/db.js';
import { checkRateLimit } from '../_shared/rate-limit.js';
import { notifyBoth } from '../_shared/outbox.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const rl = checkRateLimit(req, env, { key: 'form_membership', limit: 3 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

    const name = (body.name || '').toString().slice(0, 120).trim();
    const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
    const phone = (body.phone || '').toString().slice(0, 40);
    const tier = ['starter', 'harmony', 'premium'].includes(body.tier) ? body.tier : 'starter';
    const priceUsd = parseFloat(body.priceUsd ?? body.price_usd ?? 0) || 0;
    if (!name || !email) return err('name and email are required', 400);
    if (!/.+@.+\..+/.test(email)) return err('Invalid email', 400);

    let userId = null;
    if (db) {
      const exist = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
      if (exist) userId = exist.id;
      if (!userId) {
        await qRun(db, `INSERT INTO users (email,name,phone,source,created_at,updated_at)
                       VALUES (?,?,?,'membership',strftime('%s','now'),strftime('%s','now'))`,
          [email, name, phone || null]);
        const r = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (r) userId = r.id;
      }
    }

    const orderNo = `OV-MS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let orderId = null;
    if (db) {
      await qRun(db, `
        INSERT INTO orders (order_no, user_id, status, total_usd, source, payment_method,
                            placed_at, updated_at)
        VALUES (?, ?, 'pending', ?, 'membership', 'tbd',
                strftime('%s','now'), strftime('%s','now'))`,
        [orderNo, userId, priceUsd]
      );
      const or = await qFirst(db, 'SELECT id FROM orders WHERE order_no = ?', [orderNo]);
      if (or) orderId = or.id;

      // 写 memberships 记录（pending）
      await qRun(db, `
        INSERT INTO memberships (user_id, tier, price_usd, status, order_id, created_at, updated_at)
        VALUES (?, ?, ?, 'pending', ?, strftime('%s','now'), strftime('%s','now'))`,
        [userId, tier, priceUsd, orderId]
      );
    }

    await notifyBoth({
      userEmail: email, userPhone: phone,
      adminEmail: env.ADMIN_NOTIFY_EMAIL || '',
      subject: `[Membership ${tier.toUpperCase()} #${orderNo}] ${name}`,
      body: `Purchased ${tier} at $${priceUsd.toFixed(2)} (pending payment).\n\nWe will send Stripe Checkout link shortly.`,
      smsTemplate: 'membership_received',
      env,
    });

    return json({
      ok: true,
      orderNo,
      status: 'pending',
      // 后续 B 子项目：这里返回 Stripe checkoutUrl
      nextStep: 'We have received your membership application. Our concierge will email the payment link within 24 hours.',
    }, { status: 201 });
  });
}
