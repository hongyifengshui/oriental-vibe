// functions/api/admin/seed-from-local.js
// 一键把浏览器 localStorage 里的 ov-admin-* 数据迁移到 D1
// 前端 Admin 会 POST 过来：{ "ov-admin-products": [...], "ov-admin-orders": [...], "ov-admin-users": [...], "ov-admin-settings": {...}, "ov-admin-content": {...}, "ov-admin-page-home": {...}, ... }
// 权限：super_admin / ops 可执行（support 拒绝）
import { withDb, json, err } from '../_shared/db.js';
import { requireAuth, qRun as _qRunUnused } from '../_shared/auth.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'POST') return err('Method not allowed', 405);
    const guard = await requireAuth(ctx, 'ops');
    if (guard.response) return guard.response;
    if (!db) return err('Database not available', 503);

    let body;
    try { body = await req.json(); } catch { return err('Invalid JSON', 400); }

    // 复用 bulk-upsert 的写入逻辑
    const importMod = await import('./bulk-upsert.js');
    // 从 bulk-upsert 中 import 内部 helper 会比较麻烦（它们未导出），
    // 这里直接用一个小技巧：把 body 组装成 bulk-upsert 期望的格式，循环调用内联写入函数
    // —— 直接把 bulk-upsert 当模块 import 并手动复用：
    const _u = await import('./_seed_helpers.js').catch(() => null);
    const helpers = _u || await buildHelpers();

    const stats = { products: 0, categories: 0, orders: 0, users: 0, kv: 0, ignored: [] };

    // products
    const products = normalizeArr(body['ov-admin-products'] || body.products || body['products-data']);
    for (const p of products) stats.products += await helpers.upsertProduct(db, p);

    // categories
    const categories = normalizeArr(body['ov-admin-categories'] || body.categories);
    for (const c of categories) stats.categories += await helpers.upsertCategory(db, c);

    // orders
    const orders = normalizeArr(body['ov-admin-orders'] || body.orders);
    for (const o of orders) stats.orders += await helpers.upsertOrder(db, o);

    // users
    const users = normalizeArr(body['ov-admin-users'] || body.users);
    for (const u of users) stats.users += await helpers.upsertUser(db, u);

    // settings / content kv
    const kv = {};
    const pickKv = (k, v) => {
      if (v == null) return;
      kv[k] = typeof v === 'string' ? v : JSON.stringify(v);
    };
    pickKv('settings', body['ov-admin-settings'] || body.settings);
    pickKv('whatsappNumber', body['ov-admin-whatsappNumber'] || body.whatsappNumber);
    for (const [k, v] of Object.entries(body || {})) {
      if (/^ov-admin-page-/.test(k) || k.startsWith('page-')) {
        const key = k.replace(/^ov-admin-/, '');
        pickKv(key, v);
      }
    }
    pickKv('ov-admin-content', body['ov-admin-content'] || body.content);
    pickKv('content', body['ov-admin-content'] || body.content);
    pickKv('paymentInfo', body.paymentInfo ?? undefined);
    pickKv('membershipLevels', body.membershipLevels ?? undefined);
    pickKv('benefits', body.benefits ?? undefined);

    const { settingUpsert } = await import('../_shared/db.js');
    for (const [k, v] of Object.entries(kv)) {
      await settingUpsert(db, k, v, guard.admin.sub);
      stats.kv++;
    }

    return json({ ok: true, migrated: stats, at: Date.now() });
  });
}

function normalizeArr(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const x = JSON.parse(v); return Array.isArray(x) ? x : []; } catch { return []; }
  }
  return [];
}

// 内联重写 bulk-upsert 的 helpers（避免文件间循环 import 造成 Pages Function 故障）
async function buildHelpers() {
  const dbSh = await import('../_shared/db.js');
  const qRun = dbSh.qRun;
  const num = (v) => { const x = parseFloat(v); return isNaN(x) ? 0 : x; };
  const int = (v) => { const x = parseInt(v, 10); return isNaN(x) ? 0 : x; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const titleOf = (p, lang) => {
    if (p[`title_${lang}`]) return String(p[`title_${lang}`]);
    if (p[`title${cap(lang)}`]) return String(p[`title${cap(lang)}`]);
    if (typeof p.title === 'string') return p.title;
    if (p.title && p.title[lang]) return String(p.title[lang]);
    return '';
  };
  return {
    async upsertProduct(db, p) {
      const id = p.id ? int(p.id) : null;
      const slug = (p.slug || `product-${Date.now()}-${Math.floor(Math.random() * 1000)}`).toString().toLowerCase().slice(0, 180);
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
        num(p.price ?? p.price_usd ?? p.priceUsd ?? 0),
        p.originalPrice == null ? null : num(p.originalPrice),
        typeof p.images === 'string' ? p.images : JSON.stringify(p.images || []),
        p.desc?.en ?? p.desc_en ?? p.description_en ?? null,
        p.desc?.zh ?? p.desc_zh ?? p.description_zh ?? null,
        p.desc?.es ?? p.desc_es ?? null,
        p.desc?.fr ?? p.desc_fr ?? null,
        p.desc?.de ?? p.desc_de ?? null,
        int(p.stock ?? 0),
        int(p.sort_order ?? p.sortOrder ?? 0),
        p.isBundle ? 1 : 0,
        p.sourcingUrl ?? p.sourcing_url ?? null,
      ];
      const r = await qRun(db, sql, params);
      return r.success ? 1 : 0;
    },
    async upsertCategory(db, c) {
      const id = c.id ? int(c.id) : null;
      const name = c.name || {};
      const sql = `
        INSERT INTO categories (id, name_en, name_zh, name_es, name_fr, name_de, sort_order, updated_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7, strftime('%s','now'))
        ON CONFLICT(id) DO UPDATE SET
          name_en=excluded.name_en, name_zh=excluded.name_zh,
          name_es=excluded.name_es, name_fr=excluded.name_fr, name_de=excluded.name_de,
          sort_order=excluded.sort_order, updated_at=strftime('%s','now')
      `;
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
    },
    async upsertOrder(db, o) {
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
        o.orderNo || o.order_no || `OV-SEED-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
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
    },
    async upsertUser(db, u) {
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
        email, u.name || '', u.phone || null, u.source || 'general',
        u.elementResult || u.element_result || null,
        u.membershipTier || u.membership_tier || null,
        u.membershipExpiresAt || u.membership_expires_at || null,
        u.notes || null,
      ]);
      return r.success ? 1 : 0;
    },
  };
}
