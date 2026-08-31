// functions/api/_shared/auth.js
// Admin 身份鉴权工具：HMAC-SHA256 签名 Cookie ov_session
// 无外部依赖，纯 WebCrypto API（Cloudflare Workers 原生支持）
//
// Cookie 格式：ov_session=<payloadB64>.<sigB64>
// payload = { sub: adminId, role, name, iat, exp }

const COOKIE_NAME = 'ov_session';
const DEFAULT_TTL = 7 * 24 * 60 * 60; // 7d
const HEADER_CSRF = 'x-csrf-token';
const COOKIE_CSRF = 'ov_csrf';

// ---------- 基础工具 ----------
function b64Url(b) {
  return btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function b64UrlDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}
function encUtf8(s) {
  return new TextEncoder().encode(s);
}
function decUtf8(b) {
  return new TextDecoder().decode(b);
}

async function importKey(secret) {
  if (!secret || typeof secret !== 'string' || secret.length < 16) {
    throw new Error('AUTH_SECRET too short (min 16 chars). Configure in CF Pages env.');
  }
  return crypto.subtle.importKey(
    'raw',
    encUtf8(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmacHex(secret, msg) {
  const key = await importKey(secret);
  const mac = await crypto.subtle.sign('HMAC', key, encUtf8(msg));
  return b64Url(new Uint8Array(mac));
}

// ---------- 对外 API ----------

/**
 * 签发一个 session cookie 字符串（值部分，不含 ov_session=）
 * @returns {string} cookieBody
 */
export async function signSession(payload, env) {
  const secret = env.AUTH_SECRET;
  const now = Math.floor(Date.now() / 1000);
  const data = {
    iat: now,
    exp: now + (payload.expIn || DEFAULT_TTL),
    ...payload,
  };
  delete data.expIn;
  const body = b64Url(encUtf8(JSON.stringify(data)));
  const sig = await hmacHex(secret, body);
  return `${body}.${sig}`;
}

/**
 * 读取并校验 ov_session，解析为 payload；非法/过期返回 null
 */
export async function verifySession(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${COOKIE_NAME}=([^;\\s]+)`));
  if (!m) return null;
  const [body, sig] = m[1].split('.');
  if (!body || !sig) return null;
  const secret = env.AUTH_SECRET;
  const expected = await hmacHex(secret, body);
  if (expected !== sig) return null;
  try {
    const payload = JSON.parse(decUtf8(b64UrlDecode(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** 生成 Set-Cookie Response Header 值（多段 Set-Cookie 通过 Response append） */
export function buildSetCookieHeader(value, maxAge = DEFAULT_TTL) {
  return (
    `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
}
export function buildClearCookieHeader() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// CSRF：简单模式 — 从 Cookie 读 ov_csrf 与 Header 对比（同站 Lax 策略+签名已足够防 CSRF；
// 这里再加一层，给写操作调用时用）
export function checkCsrf(request) {
  const h = request.headers.get(HEADER_CSRF) || '';
  const cookie = request.headers.get('cookie') || '';
  const m = cookie.match(new RegExp(`${COOKIE_CSRF}=([^;\\s]+)`));
  const c = m ? m[1] : '';
  if (!h || !c || h !== c) return false;
  return true;
}

/** 生成一对 CSRF cookie 值 + header 值（返回字符串） */
export function genCsrf() {
  const b = crypto.getRandomValues(new Uint8Array(18));
  return b64Url(b);
}
export function buildCsrfSetCookie(token, maxAge = DEFAULT_TTL) {
  return `${COOKIE_CSRF}=${token}; Path=/; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

/**
 * 角色权限断言：返回 null 通过，否则 Response(401/403)
 */
export function assertRole(session, roleOrHigher) {
  if (!session) return { status: 401, message: 'Not logged in' };
  const order = { support: 1, ops: 2, super_admin: 3 };
  const need = order[roleOrHigher] || 0;
  const have = order[session.role] || 0;
  if (have < need) return { status: 403, message: 'Forbidden: insufficient role' };
  return null;
}

/**
 * Pages Function 中间件式：对需要登录的路由统一校验。
 * 用法：
 *   const guard = await requireAuth(ctx, 'ops');
 *   if (guard) return guard.response; // 401/403
 *   const admin = guard.admin;
 */
export async function requireAuth(ctx, minRole = 'support') {
  const { request, env } = ctx;
  // 写操作（非 GET/HEAD/OPTIONS）要求 CSRF — A 子项目 MVP 采用宽松策略允许无 CSRF
  // 等 B 子项目联调实际 Admin UI 提交时再严格打开；目前只校验 session
  const session = await verifySession(request, env);
  const denied = assertRole(session, minRole);
  if (denied) {
    // 动态 import db.js 避免循环
    const { err } = await import('./db.js');
    return { response: err(denied.message, denied.status), admin: null };
  }
  return { response: null, admin: session };
}

// ---------- 密码哈希（bcryptjs）----------
// Pages Function 开启了 nodejs_compat → require 不可用，但动态 import 可用 ESM
// bcryptjs 提供 ESM 入口
let bcryptModPromise = null;
export async function getBcrypt() {
  if (!bcryptModPromise) {
    bcryptModPromise = import('bcryptjs').then((m) => m.default || m).catch(async () => {
      // 兜底：Cloudflare 某些旧 compat 模式 npm ESM 不可用时，尝试从 node_modules 裸路径
      // 多数 Astro build 会把 bcryptjs 打进 .output/server，Pages Function 直接 require('bcryptjs') 成功
      // eslint-disable-next-line no-undef
      return await import('bcryptjs');
    });
  }
  return await bcryptModPromise;
}
export async function hashPassword(pwd, cost = 10) {
  const b = await getBcrypt();
  return b.hash(pwd, cost);
}
export async function verifyPassword(pwd, hash) {
  const b = await getBcrypt();
  return b.compare(pwd, hash);
}

// ---------- reset token ----------
export function randomToken(bytes = 24) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return b64Url(b);
}
export async function sha256Hex(str) {
  const d = await crypto.subtle.digest('SHA-256', encUtf8(str));
  return Array.from(new Uint8Array(d)).map((x) => x.toString(16).padStart(2, '0')).join('');
}
