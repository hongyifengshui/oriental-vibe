// functions/api/admin/bulk-upsert.js
// 管理员批量写接口（ops & super_admin 可写；support 拒绝）
// body: { table: 'products'|'categories'|'settings'|'content'|..., rows?: [], kv?: {key:jsonString}, merge?: 'replace'|'upsert' }
// - products/categories 用 rows 批量 upsert
// - settings/content 用 kv 批量写 key/value
import { withDb, json, err } from '../_shared/db.js';
import { requireAuth } from '../_shared/auth.js';
import { settingUpsert, qRun, qFirst } from '../_shared/db.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const guard = await requireAuth(ctx, 'ops');
    if (guard.response) return guard.response;
    const admin = guard.admin;

    if (!db) return err('Database not available', 503);

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }
    const { table, rows, kv, merge = 'upsert' } = body;

    if (kv) {
      // KV 模式：settings / 页面内容（page-home / page-faq / ...）
      const keys = Object.keys(kv);
      let okCount = 0;
      for (const k of keys) {
        const v = typeof kv[k] === 'string' ? kv[k] : JSON.stringify(kv[k]);
        await settingUpsert(db, k, v, admin.sub);
        okCount++;
      }
      return json({ ok: true, type: 'kv', keys, inserted: okCount });
    }

    if (table === 'products' && Array.isArray(rows)) {
      let okCount = 0;
      for (const p of rows) {
        okCount += await upsertProduct(db, p);
      }
      return json({ ok: true, type: 'rows', table, written: okCount });
    }
    if (table === 'categories' && Array.isArray(rows)) {
      let okCount = 0;
      for (const c of rows) okCount += await upsertCategory(db, c);
      return json({ ok: true, type: 'rows', table, written: okCount });
    }
    if (table === 'orders' && Array.isArray(rows)) {
      let okCount = 0;
      for (const o of rows) okCount += await upsertOrder(db, o);
      return json({ ok: true, type: 'rows', table, written: okCount });
    }
    if (table === 'users' && Array.isArray(rows)) {
      let okCount = 0;
      for (const u of rows) okCount += await upsertUser(db, u);
      return json({ ok: true, type: 'rows', table, written: okCount });
    }

    return err('Unsupported upsert target', 400);
  });
}

// -------- helpers --------
async function upsertProduct(db, p) {
  const id = p.id ? Number(p.id) : null;
  // slug 唯一：若已有同 slug 的记录且 id 不同，以 slug 为准 update
  const slug = (p.slug || `product-${Date.now()}`).toString().toLowerCase().slice(0, 180);
  const status = p.status || 'active';
  const sql = `
    INSERT INTO products (id, slug, status, category_id,
      title_en, title_zh, title_es, title_fr, title_de,
      price_usd, original_price_usd, images_json,
      desc_en, desc_zh, desc_es, desc_fr, desc_de,
      stock, sort_order, is_bundle, sourcing_url, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21, strftime('%s','now'))
    ON CONFLICT(slug) DO UPDATE SET
      status=excluded.status, category_id=excluded.category_id,
      title_en=excluded.title_en, title_zh=excluded.title_zh,
      title_es=excluded.title_es, title_fr=excluded.title_fr, title_de=excluded.title_de,
      price_usd=excluded.price_usd, original_price_usd=excluded.original_price_usd,
      images_json=excluded.images_json,
      desc_en=excluded.desc_en, desc_zh=excluded.desc_zh,
      desc_es=excluded.desc_es, desc_fr=excluded.desc_fr, desc_de=excluded.desc_de,
      stock=excluded.stock, sort_order=excluded.sort_order, is_bundle=excluded.is_bundle,
      sourcing_url=excluded.sourcing_url, updated_at=strftime('%s','now')
  `;
  const params = [
    id, slug, status,
    p.categoryId || p.category_id || null,
    titleOf(p, 'en'), titleOf(p, 'zh'), titleOf(p, 'es'), titleOf(p, 'fr'), titleOf(p, 'de'),
    num(p.price || p.price_usd || p.priceUsd || 0),
    p.originalPrice == null ? null : num(p.originalPrice),
    typeof p.images === 'string' ? p.images : JSON.stringify(p.images || []),
    p.desc?.en || p.desc_en || p.description_en || null,
    p.desc?.zh || p.desc_zh || p.description_zh || null,
    p.desc?.es || p.desc_es || null,
    p.desc?.fr || p.desc_fr || null,
    p.desc?.de || p.desc_de || null,
    int(p.stock || 0), int(p.sortOrder ?? p.sort_order ?? 0),
    p.isBundle ? 1 : 0,
    p.sourcingUrl || p.sourcing_url || null,
  ];
  const r = await qRun(db, sql, params);
  return r.success ? 1 : 0;
}
function titleOf(p, lang) {
  const key1 = `title_${lang}`;
  const key2 = `title${capitalize(lang)}`;
  if (p[key1]) return String(p[key1]);
  if (p[key2]) return String(p[key2]);
  if (typeof p.title === 'string') return p.title;
  if (p.title && p.title[lang]) return String(p.title[lang]);
  return '';
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function num(v) { const x = parseFloat(v); return isNaN(x) ? 0 : x; }
function int(v) { const x = parseInt(v, 10); return isNaN(x) ? 0 : x; }

async function upsertCategory(db, c) {
  const id = c.id ? int(c.id) : null;
  const sql = `
    INSERT INTO categories (id, name_en, name_zh, name_es, name_fr, name_de, sort_order, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7, strftime('%s','now'))
    ON CONFLICT(id) DO UPDATE SET
      name_en=excluded.name_en, name_zh=excluded.name_zh,
      name_es=excluded.name_es, name_fr=excluded.name_fr, name_de=excluded.name_de,
      sort_order=excluded.sort_order, updated_at=strftime('%s','now')
  `;
  const name = c.name || {};
  const r = await qRun(db, sql, [
    id,
    c.name_en || name.en || name['en-US'] || '',
    c.name_zh || name.zh || name['zh-CN'] || '',
    c.name_es || name.es || '',
    c.name_fr || name.fr || '',
    c.name_de || name.de || '',
    int(c.sort_order ?? c.sortOrder ?? 0),
  ]);
  return r.success ? 1 : 0;
}

async function upsertOrder(db, o) {
  const id = o.id ? int(o.id) : null;
  const sql = `
    INSERT INTO orders (id, order_no, user_id, status, total_usd, source, payment_method,
      stripe_payment_intent_id, paypal_order_id,
      shipping_name, phone, address, city, state, zip, country,
      notes, internal_notes,
      placed_at, paid_at, shipped_at, completed_at, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,strftime('%s','now'))
    ON CONFLICT(order_no) DO UPDATE SET
      status=excluded.status, total_usd=excluded.total_usd, source=excluded.source,
      payment_method=excluded.payment_method,
      stripe_payment_intent_id=excluded.stripe_payment_intent_id,
      paypal_order_id=excluded.paypal_order_id,
      shipping_name=excluded.shipping_name, phone=excluded.phone, address=excluded.address,
      city=excluded.city, state=excluded.state, zip=excluded.zip, country=excluded.country,
      notes=excluded.notes, internal_notes=excluded.internal_notes,
      placed_at=excluded.placed_at, paid_at=excluded.paid_at, shipped_at=excluded.shipped_at,
      completed_at=excluded.completed_at, updated_at=strftime('%s','now')
  `;
  const r = await qRun(db, sql, [
    id,
    o.orderNo || o.order_no || `OV-LOCAL-${Date.now()}`,
    o.userId || o.user_id || null,
    o.status || 'pending',
    num(o.totalUsd || o.total_usd || 0),
    o.source || 'cart',
    o.paymentMethod || o.payment_method || 'stripe',
    o.stripePaymentIntentId || o.stripe_payment_intent_id || null,
    o.paypalOrderId || o.paypal_order_id || null,
    o.shipping?.name || o.shipping_name || null,
    o.shipping?.phone || o.phone || null,
    o.shipping?.address || o.address || null,
    o.shipping?.city || o.city || null,
    o.shipping?.state || o.state || null,
    o.shipping?.zip || o.zip || null,
    o.shipping?.country || o.country || null,
    o.notes || null,
    o.internalNotes || o.internal_notes || null,
    o.placedAt || o.placed_at || Math.floor(Date.now() / 1000),
    o.paidAt || o.paid_at || null,
    o.shippedAt || o.shipped_at || null,
    o.completedAt || o.completed_at || null,
  ]);
  return r.success ? 1 : 0;
}

async function upsertUser(db, u) {
  const email = (u.email || '').trim().toLowerCase();
  if (!email) return 0;
  const sql = `
    INSERT INTO users (email, name, phone, source, element_result, membership_tier, membership_expires_at, notes, updated_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8, strftime('%s','now'))
    ON CONFLICT(email) DO UPDATE SET
      name=COALESCE(NULLIF(excluded.name,''), users.name),
      phone=COALESCE(NULLIF(excluded.phone,''), users.phone),
      source=COALESCE(NULLIF(excluded.source,'general'), users.source),
      element_result=COALESCE(excluded.element_result, users.element_result),
      membership_tier=COALESCE(excluded.membership_tier, users.membership_tier),
      membership_expires_at=COALESCE(excluded.membership_expires_at, users.membership_expires_at),
      notes=COALESCE(NULLIF(excluded.notes,''), users.notes),
      updated_at=strftime('%s','now')
  `;
  const r = await qRun(db, sql, [
    email,
    u.name || '',
    u.phone || null,
    u.source || 'general',
    u.elementResult || u.element_result || null,
    u.membershipTier || u.membership_tier || null,
    u.membershipExpiresAt || u.membership_expires_at || null,
    u.notes || null,
  ]);
  return r.success ? 1 : 0;
}
