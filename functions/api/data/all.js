// functions/api/data/all.js
// 一次拉取所有前台公开数据，减少 HTTP round-trip。s-maxage 60。
import { withDb, cached } from '../_shared/db.js';
import { settingGet, qAll } from '../_shared/db.js';

export async function onRequest(ctx) {
  return withDb(ctx, async (db) => {
    const products = db ? await qAll(db, `
      SELECT id, slug, status, category_id,
             title_en, title_zh, title_es, title_fr, title_de,
             price_usd, original_price_usd, images_json,
             desc_en, desc_zh, desc_es, desc_fr, desc_de,
             stock, sort_order, is_bundle
      FROM products WHERE status IN ('active','draft')
      ORDER BY sort_order ASC, id ASC
    `) : [];

    const categories = db ? await qAll(db, `SELECT * FROM categories ORDER BY sort_order ASC, id ASC`) : [];

    const [membershipLevels, benefits, pay, wa, contactInfo, aiConfig] = db
      ? await Promise.all([
        settingGet(db, 'membershipLevels', 'null'),
        settingGet(db, 'benefits', 'null'),
        settingGet(db, 'paymentInfo', 'null'),
        settingGet(db, 'whatsappNumber', '""'),
        settingGet(db, 'contactInfo', 'null'),
        settingGet(db, 'aiConfig', 'null'),
      ])
      : ['null', 'null', 'null', '""', 'null', 'null'];

    const contentPages = ['page-home', 'page-about', 'page-faq', 'page-services', 'page-blog', 'page-courses', 'page-membership', 'page-contact'];
    const content = {};
    if (db) {
      for (const p of contentPages) {
        const raw = await settingGet(db, p, null);
        if (raw != null) content[p] = JSON.parse(raw);
      }
    }

    // D1 does not define separate blog/services/courses tables — Admin stores them
    // as JSON KV rows in the settings table (matching localStorage ov-admin-* keys
    // already used by the sync layer). Pull them here so BaseLayout broadcasts
    // exact same logical keys on every D1 bootstrap.
    const [kvBlog, kvServices, kvCourses] = db
      ? await Promise.all([
          settingGet(db, 'blog', 'null'),
          settingGet(db, 'services', 'null'),
          settingGet(db, 'courses', 'null'),
        ])
      : ['null', 'null', 'null'];

    return cached({
      ok: true,
      snapshot: Date.now(),
      products,
      categories,
      membershipLevels: safeParse(membershipLevels, [
        { tier: 'starter', priceUsd: 49, discountPercent: 5 },
        { tier: 'harmony', priceUsd: 199, discountPercent: 12 },
        { tier: 'premium', priceUsd: 499, discountPercent: 25 },
      ]),
      benefits: safeParse(benefits, []),
      settings: {
        paymentInfo: safeParse(pay, { stripe: true, paypal: false, bankTransfer: false, waCod: false }),
        whatsappNumber: safeParse(wa, ''),
        contactInfo: safeParse(contactInfo, { email: 'hello@orientalvibe1314.com' }),
        aiConfig: safeParse(aiConfig, { enabled: true, engine: 'auto' }),
      },
      content,
      // Admin content KVs mirrored to localStorage ov-admin-{blog,services,courses}
      blog: safeParse(kvBlog, []),
      services: safeParse(kvServices, []),
      courses: safeParse(kvCourses, []),
    }, 60);
  });
}

function safeParse(raw, fb) {
  try {
    if (raw == null) return fb;
    const v = JSON.parse(raw);
    return v == null ? fb : v;
  } catch {
    return fb;
  }
}
