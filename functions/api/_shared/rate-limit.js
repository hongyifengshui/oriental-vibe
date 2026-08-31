// functions/api/_shared/rate-limit.js
// 轻量 per-IP 内存令牌桶（Cloudflare colo 本地，不跨点；足够挡瞬时滥用）
// A 子项目 MVP：login 6/min，forgot-password 3/min，/form/* 8/min

const BUCKETS = new Map(); // ip_key -> { count, resetAt }
const GLOBAL_WINDOW = 60_000; // 1min

function getClientIp(request, env) {
  const fwd = request.headers.get('x-forwarded-for') || '';
  const ip = fwd.split(',')[0]?.trim()
    || request.headers.get('cf-connecting-ip')
    || 'unknown';
  return ip;
}

export function checkRateLimit(request, env, { key = '', limit = 8, windowMs = GLOBAL_WINDOW } = {}) {
  const ip = getClientIp(request, env);
  const fullKey = `${key}@${ip}`;
  const now = Date.now();
  let slot = BUCKETS.get(fullKey);
  if (!slot || slot.resetAt < now) {
    slot = { count: 0, resetAt: now + windowMs };
    BUCKETS.set(fullKey, slot);
  }
  slot.count += 1;
  const ok = slot.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - slot.count),
    resetInMs: Math.max(0, slot.resetAt - now),
    ip,
  };
}

// 方便的装饰器：超限直接回 429 Response
export async function withRateLimit(ctx, next, opts = {}) {
  const r = checkRateLimit(ctx.request, ctx.env, opts);
  if (!r.ok) {
    const { err } = await import('./db.js');
    return err('Too many requests. Please try again later.', 429, {
      retryAfterMs: r.resetInMs,
    });
  }
  return next();
}
