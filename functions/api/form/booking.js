// functions/api/form/booking.js
// 预约表单：匿名可，5/min/IP
import { withDb, json, err, qRun, qFirst } from '../_shared/db.js';
import { checkRateLimit } from '../_shared/rate-limit.js';
import { notifyBoth } from '../_shared/outbox.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const rl = checkRateLimit(req, env, { key: 'form_booking', limit: 5 });
    if (!rl.ok) return err('Too many requests', 429, { retryAfterMs: rl.resetInMs });

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

    const name = (body.name || '').toString().slice(0, 120).trim();
    const email = (body.email || '').toString().trim().toLowerCase().slice(0, 200);
    const phone = (body.phone || '').toString().slice(0, 40);
    const serviceId = body.serviceId || body.service_id || null;
    const serviceName = (body.serviceName || body.service || '').toString().slice(0, 200);
    const preferredDate = (body.preferredDate || body.preferred_date || '').toString().slice(0, 20);
    const preferredTime = (body.preferredTime || body.preferred_time || '').toString().slice(0, 20);
    const timezone = (body.timezone || 'UTC').toString().slice(0, 60);
    const type = body.type === 'inperson' ? 'inperson' : 'virtual';
    const priceUsd = parseFloat(body.priceUsd ?? body.price_usd ?? 0) || 0;
    const notes = (body.notes || body.message || '').toString().slice(0, 3000);
    if (!name || !email) return err('name and email are required', 400);
    if (!/.+@.+\..+/.test(email)) return err('Invalid email', 400);

    // Upsert user
    let userId = null;
    if (db) {
      const exist = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
      if (exist) userId = exist.id;
      if (!userId) {
        await qRun(db, `INSERT INTO users (email,name,phone,source,created_at,updated_at)
                       VALUES (?,?,?,'booking',strftime('%s','now'),strftime('%s','now'))`,
          [email, name, phone || null]);
        const r = await qFirst(db, 'SELECT id FROM users WHERE email = ?', [email]);
        if (r) userId = r.id;
      }
    }

    const bookingNo = `BK-${new Date().getUTCFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    if (db) {
      await qRun(db, `
        INSERT INTO consultations (booking_no, user_id, service_id, service_snapshot_name,
          preferred_date, preferred_time, timezone, type, status, price_usd, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, strftime('%s','now'), strftime('%s','now'))`,
        [bookingNo, userId, serviceId, serviceName,
          preferredDate || null, preferredTime || null, timezone, type, priceUsd, notes || null]
      );
    }

    await notifyBoth({
      userEmail: email, userPhone: phone,
      adminEmail: env.ADMIN_NOTIFY_EMAIL || '',
      subject: `[Booking #${bookingNo}] ${serviceName} — ${name}`,
      body: `Date: ${preferredDate || 'TBD'} ${preferredTime || ''} ${timezone}\nType: ${type}\nNotes:\n${notes || ''}`,
      smsTemplate: 'booking_received',
      env,
    });

    return json({
      ok: true,
      bookingNo,
      status: 'new',
      note: 'Your consultation request has been received. Our team will email you within 24 hours to confirm the time and Zoom/in-person details.',
    }, { status: 201 });
  });
}
