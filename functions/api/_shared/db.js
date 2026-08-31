// functions/api/_shared/db.js
// Cloudflare Pages Function — D1 binding helper + typed queries（不使用 TS，避免运行时编译）
//
// 用法：
//   import { withDb, json, err } from './_shared/db.js';
//   export async function onRequest(ctx) {
//     return withDb(ctx, async (db, env) => {
//       const rows = await db.prepare('SELECT * FROM products WHERE status = ?').bind('active').all();
//       return json({ ok: true, products: rows.results });
//     });
//   }

export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  if (!headers.has('cache-control')) {
    headers.set('cache-control', 'private, no-store');
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function err(message, status = 400, extra = {}) {
  return json({ ok: false, error: message, ...extra }, { status });
}

export function cached(data, sMaxAge = 60) {
  return json(data, {
    headers: {
      'cache-control': `public, s-maxage=${sMaxAge}, stale-while-revalidate=${Math.max(1, sMaxAge * 2)}`,
    },
  });
}

/**
 * 封装 D1 binding 访问：确保 env.DB 存在，若不存在给出可读错误
 * @param {*} ctx PagesFunctionContext
 * @param {(db: D1Database, env: Env) => Promise<Response>} fn
 */
export async function withDb(ctx, fn) {
  try {
    const env = ctx.env || {};
    const db = env.DB;
    if (!db) {
      // 允许本地 Pages preview 模式（无 D1）下静默降级：返回 null db
      // 业务层可判断 db == null 时读 seed/localStorage 兜底
      return await fn(null, env, ctx);
    }
    return await fn(db, env, ctx);
  } catch (e) {
    // 生产环境不抛细节；本地 preview 打印堆栈
    // eslint-disable-next-line no-console
    console.error('[db] uncaught error:', e && e.stack ? e.stack : e);
    return err('Internal server error', 500);
  }
}

// ---------- 小工具：查询 ----------
export async function qFirst(db, sql, params = []) {
  if (!db) return null;
  const r = await db.prepare(sql).bind(...params).first();
  return r || null;
}

export async function qAll(db, sql, params = []) {
  if (!db) return [];
  const r = await db.prepare(sql).bind(...params).all();
  return r && r.results ? r.results : [];
}

export async function qRun(db, sql, params = []) {
  if (!db) return { success: false, changes: 0 };
  return await db.prepare(sql).bind(...params).run();
}

/**
 * Upsert 一条 settings k/v
 */
export async function settingUpsert(db, key, valueJson, adminId = null) {
  if (!db) return null;
  // SQLite 的 upsert 兼容写法（D1 支持 INSERT ... ON CONFLICT）
  const sql = `
    INSERT INTO settings (key, value, updated_by_admin_id, updated_at)
    VALUES (?, ?, ?, strftime('%s','now'))
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_by_admin_id = excluded.updated_by_admin_id,
      updated_at = strftime('%s','now')
  `;
  return qRun(db, sql, [key, valueJson, adminId]);
}

export async function settingGet(db, key, fallback = '{}') {
  const row = await qFirst(db, 'SELECT value FROM settings WHERE key = ?', [key]);
  return row ? row.value : fallback;
}

export async function settingGetParsed(db, key, fallback) {
  const raw = await settingGet(db, key, null);
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}
