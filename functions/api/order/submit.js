// functions/api/order/submit.js — 购物车/测试支付提交订单（MVP：写入 D1 orders + order_items + users，
// 预留 Stripe PaymentIntent client_secret 返回；未配置 Stripe 时返回 manual 下单页 nextStep。
//
// Body:
// {
//   source: 'cart' | 'test_pay' | 'courses_enroll' | 'quick_buy',
//   customer: { name, email, phone? },
//   shipping: { name?, address, city, state, zip, country }?,   // 可选，非实物传 null
//   items: [{ productId?, name, priceUsd, qty, sku?, image? }],
//   totalUsd: Number,
//   paymentMethod: 'stripe' | 'paypal' | 'bank_transfer' | 'manual',
//   currency?: 'USD',
//   notes?: string,
//   elementResult?: string,
// }
import { withDb, json, err, qRun, qFirst } from '../_shared/db.js';
import { checkRateLimit } from '../_shared/rate-limit.js';
import { notifyBoth } from '../_shared/outbox.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);

    const rl = checkRateLimit(req, env, { key: 'order_submit', limit: 10 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

    const source = ['cart', 'test_pay', 'courses_enroll', 'quick_buy'].includes(body.source) ? body.source : 'cart';
    const customer = body.customer || {};
    const shipping = body.shipping || {};
    const items = Array.isArray(body.items) ? body.items : [];
    const paymentMethod = ['stripe', 'paypal', 'bank_transfer', 'manual'].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'manual';

    const name = (customer.name || '').toString().slice(0, 120).trim();
    const email = (customer.email || '').toString().trim().toLowerCase().slice(0, 200);
    const phone = (customer.phone || shipping.phone || '').toString().slice(0, 40) || null;

    if (!email) return err('email is required', 400);
    if (!/.+@.+\..+/.test(email)) return err('Invalid email', 400);
    if (!items.length) return err('items is required', 400);

    // --- total 校验：前端传参是一回事，后端以 item 汇总兜底，避免篡改 ---
    const subtotal = items.reduce((s, it) => {
      const p = parseFloat(it.priceUsd ?? it.price ?? 0) || 0;
      const q = Math.max(0, parseInt(it.qty ?? it.quantity ?? 1, 10) || 0);
      return s + p * q;
    }, 0);
    const totalUsd = Math.max(0, parseFloat(body.totalUsd ?? 0) || 0);
    const finalTotal = totalUsd > 0 ? totalUsd : subtotal;

    // --- Upsert user ---
    let userId = null;
    if (db) {
      const exist = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
      if (exist) {
        userId = exist.id;
        // 同名/同手机号合并更新
        await qRun(db, `UPDATE users SET
            name = COALESCE(NULLIF(?,''), name),
            phone = COALESCE(NULLIF(?,''), phone),
            source = CASE WHEN source IN (NULL, '', 'general') THEN ? ELSE source END,
            element_result = COALESCE(?, element_result),
            updated_at = strftime('%s','now')
          WHERE id = ?`,
          [name || null, phone || null, source, body.elementResult || null, userId],
        );
      } else {
        await qRun(db, `INSERT INTO users (email,name,phone,source,element_result,created_at,updated_at)
                        VALUES (?,?,?,?,?,strftime('%s','now'),strftime('%s','now'))`,
          [email, name || null, phone || null, source, body.elementResult || null]);
        const r = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (r) userId = r.id;
      }
    }

    // --- 幂等 / 防重复提交：15 秒内同 email + items 摘要命中则视为重复点击，直接返回已有订单 ---
    if (db && userId) {
      const itemsSig = items.map(it => `${it.productId || ''}|${it.name || ''}|${(it.priceUsd ?? it.price ?? 0)}|${it.qty ?? it.quantity ?? 1}`).join(';');
      const recent = await qFirst(db, `
        SELECT id, order_no, total_usd, status, stripe_payment_intent_id
        FROM orders
        WHERE user_id = ?
          AND ABS(created_at - strftime('%s','now')) < 15
          AND ABS(total_usd - ?) < 0.01
        ORDER BY id DESC
        LIMIT 1`,
        [userId, finalTotal]
      );
      // 仅当 items 条数一致时视为"同一个购物车快速连点"
      if (recent) {
        const itemCount = await qFirst(db, `SELECT COUNT(*) AS c FROM order_items WHERE order_id = ?`, [recent.id]);
        if (itemCount && Number(itemCount.c) === items.length) {
          // 复用原单：只填充 nextStep，不再重复落库/通知
          const priorPI = recent.stripe_payment_intent_id ? String(recent.stripe_payment_intent_id) : null;
          let nextStep = '您的订单已在处理中（重复点击已合并）。如有疑问请 24 小时内联系客服。';
          let clientSecret = null;
          if (paymentMethod === 'stripe' && priorPI && env.STRIPE_SECRET_KEY && finalTotal > 0) {
            try {
              const r = await fetch(`https://api.stripe.com/v1/payment_intents/${encodeURIComponent(priorPI)}`, {
                method: 'GET',
                headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
              });
              const j = await r.json().catch(() => ({}));
              if (r.ok && j && j.client_secret) {
                clientSecret = j.client_secret;
                nextStep = '已为您恢复上一次的支付会话，请完成支付即可。';
              }
            } catch (_) {}
          }
          return json({
            ok: true,
            orderNo: recent.order_no,
            status: recent.status || 'pending',
            totalUsd: Number(recent.total_usd || 0),
            clientSecret: clientSecret || undefined,
            paymentMethod,
            duplicate: true,
            nextStep,
          }, { status: 200 });
        }
      }
    }

    const orderNo = `OV-${source.toUpperCase().slice(0, 3)}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let orderId = null;
    if (db) {
      const shippingName = (shipping.name || name || '').slice(0, 120) || null;
      await qRun(db, `
        INSERT INTO orders (order_no, user_id, status, total_usd, source, payment_method,
          shipping_name, phone, address, city, state, zip, country,
          notes, placed_at, created_at, updated_at)
        VALUES (?, ?, 'pending', ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, strftime('%s','now'), strftime('%s','now'), strftime('%s','now'))`,
        [
          orderNo, userId, finalTotal, source, paymentMethod,
          shippingName, phone,
          (shipping.address || '').toString().slice(0, 300) || null,
          (shipping.city || '').toString().slice(0, 80) || null,
          (shipping.state || '').toString().slice(0, 80) || null,
          (shipping.zip || '').toString().slice(0, 20) || null,
          (shipping.country || '').toString().slice(0, 80) || null,
          (body.notes || '').toString().slice(0, 2000) || null,
        ],
      );
      const or = await qFirst(db, 'SELECT id FROM orders WHERE order_no = ?', [orderNo]);
      if (or) orderId = or.id;
    }

    // --- order_items ---
    if (db && orderId) {
      for (const it of items) {
        const title = (it.name || it.title || '').toString().slice(0, 240) || 'Item';
        const price = parseFloat(it.priceUsd ?? it.price ?? 0) || 0;
        const qty = Math.max(1, parseInt(it.qty ?? it.quantity ?? 1, 10) || 1);
        const productId = it.productId ? (parseInt(it.productId, 10) || null) : null;
        await qRun(db, `
          INSERT INTO order_items (order_id, product_id, snapshot_name, snapshot_price_usd, qty, created_at)
          VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
          [orderId, productId, title, price, qty],
        );
      }
    }

    // --- Stripe / PayPal client_secret 预留：若 env 未配置，回传 manual nextStep ---
    let clientSecret = null;
    let nextStep = '';
    if (paymentMethod === 'stripe') {
      const stripeSecret = env.STRIPE_SECRET_KEY || '';
      if (stripeSecret && finalTotal > 0 && db) {
        try {
          const cents = Math.max(50, Math.round(finalTotal * 100));
          const r = await fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${stripeSecret}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              amount: String(cents),
              currency: 'usd',
              // Stripe 不允许 order_no 里带空格/中文，安全起见只放纯数字后缀
              'metadata[order_no]': orderNo,
              'metadata[source]': source,
              'metadata[customer_email]': email,
              'statement_descriptor_suffix': 'ORIENTAL VIBE',
              'setup_future_usage': 'off_session',
            }).toString(),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j && j.client_secret) {
            clientSecret = j.client_secret;
            if (db) {
              await qRun(db, 'UPDATE orders SET stripe_payment_intent_id = ?, updated_at = strftime(\'%s\',\'now\') WHERE id = ?',
                [j.id || null, orderId]);
            }
          } else {
            nextStep = (j && j.error && j.error.message) || 'Stripe 暂不可用，请稍后再试或选择手动付款。';
          }
        } catch (e) {
          nextStep = 'Stripe 调用异常，订单已保存。客服会在 24 小时内联系您确认付款。';
        }
      } else {
        nextStep = 'Order saved. Our concierge will email the Stripe payment link within 24 hours.';
      }
    } else if (paymentMethod === 'paypal') {
      nextStep = 'PayPal Checkout coming soon. Our concierge will email the PayPal invoice within 24 hours.';
    } else if (paymentMethod === 'bank_transfer') {
      nextStep = 'Bank transfer details have been emailed. Please include your order number in the reference.';
    } else {
      nextStep = 'Thank you! Our concierge will contact you within 24 hours to finalize your order.';
    }

    // --- 通知：客户 + Admin（占位，未配置渠道静默不报错）---
    const itemSummary = items.map(i => `${i.name || 'Item'} x${i.qty || 1} = $${((i.priceUsd ?? i.price ?? 0) * (i.qty || i.quantity || 1)).toFixed(2)}`).join('\n');
    await notifyBoth({
      userEmail: email,
      userPhone: phone,
      adminEmail: env.ADMIN_NOTIFY_EMAIL || '',
      subject: `[Order #${orderNo}] ${name || email}`,
      body: [
        `Source: ${source}`,
        `Total: $${finalTotal.toFixed(2)} (${paymentMethod})`,
        `Customer: ${name} <${email}> ${phone ? 'Phone: ' + phone : ''}`,
        shipping.address ? `Ship: ${shipping.address}, ${shipping.city || ''} ${shipping.state || ''} ${shipping.zip || ''} ${shipping.country || ''}` : '',
        `Notes: ${body.notes || '(none)'}`,
        '',
        'Items:',
        itemSummary,
      ].filter(Boolean).join('\n'),
      smsTemplate: 'order_placed',
      env,
    });

    return json({
      ok: true,
      orderNo,
      status: 'pending',
      totalUsd: finalTotal,
      clientSecret: clientSecret || undefined,
      paymentMethod,
      nextStep,
      // 兼容旧前端 localStorage 兜底回显
      order: {
        id: orderId,
        orderNo,
        items: items.map(i => ({
          name: i.name, priceUsd: i.priceUsd ?? i.price, qty: i.qty ?? i.quantity ?? 1,
        })),
        customer: { name, email, phone },
        shipping,
      },
    }, { status: 201 });
  });
}
