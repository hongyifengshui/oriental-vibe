// functions/api/data/[collection].js
// 公开读：GET /api/data/products|services|categories|membershipLevels|benefits|settings|content|orders|users|admins
// orders/users/admins/contact_messages 需要登录 → 内部切到鉴权
//
// 注：为保持 Astro build 兼容性 + Pages Function 路由，本文件写成 File-based "[collection]" 动态路由。
// Cloudflare Pages 将在运行时把 params.collection 传入。
import { withDb, cached, err, qAll, qFirst, settingGet } from '../_shared/db.js';

const PUBLIC_COLLECTIONS = new Set([
  'products', 'categories', 'membershipLevels', 'benefits', 'settings', 'content',
  'testimonials', 'blog', 'courses', 'services',
]);
const ADMIN_ONLY = new Set(['orders', 'users', 'admins', 'contact_messages', 'consultations', 'memberships', 'ai_conversations']);

export async function onRequest(ctx) {
  return withDb(ctx, async (db, env) => {
    const req = ctx.request;
    if (req.method !== 'GET') return err('Method not allowed', 405);
    const col = (ctx.params?.collection || '').toString().trim();
    if (!col) return err('Missing collection', 400);

    if (ADMIN_ONLY.has(col)) {
      // 需登录
      const { requireAuth } = await import('../_shared/auth.js');
      const guard = await requireAuth(ctx, 'support');
      if (guard.response) return guard.response;
      return jsonForAdmin(db, col, ctx);
    }

    if (!PUBLIC_COLLECTIONS.has(col)) {
      return err(`Unknown collection: ${col}`, 404);
    }

    return await fetchPublic(db, col, env, ctx);
  });
}

async function fetchPublic(db, col, env, ctx) {
  const url = new URL(ctx.request.url);
  const lang = (url.searchParams.get('lang') || 'en').toString().slice(0, 6);

  if (col === 'products') {
    const rows = db ? await qAll(db, `
      SELECT id, slug, status, category_id,
             title_en, title_zh, title_es, title_fr, title_de,
             price_usd, original_price_usd, images_json,
             desc_en, desc_zh, desc_es, desc_fr, desc_de,
             stock, sort_order, is_bundle
      FROM products
      WHERE status IN ('active','draft')
      ORDER BY sort_order ASC, id ASC
    `) : null;
    return cached({ ok: true, products: rows || defaultData('products', env) }, 60);
  }
  if (col === 'categories') {
    const rows = db ? await qAll(db, `SELECT * FROM categories ORDER BY sort_order ASC, id ASC`) : null;
    return cached({ ok: true, categories: rows || defaultData('categories', env) }, 300);
  }
  if (col === 'membershipLevels') {
    const v = db ? await settingGet(db, 'membershipLevels', null) : null;
    return cached({ ok: true, levels: v ? JSON.parse(v) : defaultMembershipLevels(env) }, 300);
  }
  if (col === 'benefits') {
    const v = db ? await settingGet(db, 'benefits', null) : null;
    return cached({ ok: true, benefits: v ? JSON.parse(v) : [] }, 300);
  }
  if (col === 'settings') {
    const keys = (url.searchParams.get('keys') || 'paymentInfo,whatsappNumber,contactInfo,aiConfig').toString().split(',');
    const out = {};
    for (const k of keys) {
      const key = k.trim();
      if (!key) continue;
      out[key] = db ? JSON.parse(await settingGet(db, key, 'null')) : null;
    }
    return cached({ ok: true, settings: out }, 60);
  }
  if (col === 'content') {
    // 多页面内容聚合（home/about/faq/services/blog/services/contact）
    const out = {};
    for (const page of ['page-home', 'page-about', 'page-faq', 'page-services', 'page-blog', 'page-courses', 'page-membership', 'page-contact']) {
      const v = db ? await settingGet(db, page, null) : null;
      if (v != null) out[page] = JSON.parse(v);
    }
    return cached({ ok: true, content: out }, 60);
  }

  // 其它 collections 直接用默认数据（SSR 时仍有完整默认，不空白）
  return cached({ ok: true, [col]: defaultData(col, env, lang) }, 300);
}

async function jsonForAdmin(db, col, ctx) {
  const { json } = await import('../_shared/db.js');
  const sqlMap = {
    orders: 'SELECT * FROM orders ORDER BY placed_at DESC, id DESC LIMIT 500',
    users: 'SELECT * FROM users ORDER BY created_at DESC LIMIT 500',
    admins: 'SELECT id, email, name, role, last_login_at, created_at FROM admins ORDER BY id ASC',
    contact_messages: 'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 500',
    consultations: 'SELECT * FROM consultations ORDER BY created_at DESC LIMIT 500',
    memberships: 'SELECT * FROM memberships ORDER BY created_at DESC LIMIT 500',
    ai_conversations: 'SELECT * FROM ai_conversations ORDER BY created_at DESC LIMIT 200',
  };
  const sql = sqlMap[col];
  if (!sql || !db) return json({ ok: true, [col]: [] });
  const rows = await qAll(db, sql);
  return json({ ok: true, [col]: rows });
}

// -------- 兜底默认数据（D1 未准备好时仍可渲染完整前台，不出现白屏）--------
function defaultMembershipLevels() {
  return [
    { tier: 'starter', priceUsd: 49, discountPercent: 5 },
    { tier: 'harmony', priceUsd: 199, discountPercent: 10 },
    { tier: 'premium', priceUsd: 499, discountPercent: 15 },
  ];
}
function defaultData(col, env, lang) {
  // 真实默认来自前端静态 src/data/*.js；这里返回 [] 让前端 fallback 到 build-time 数据
  // admin seed-from-local 会在 D1 里补齐真实数据
  if (col === 'categories' || col === 'products') return [];
  return [];
}
