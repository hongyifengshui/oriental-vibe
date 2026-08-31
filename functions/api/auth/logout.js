// functions/api/auth/logout.js
import { withDb, json, err, buildClearCookieHeader } from '../_shared/db.js';

export async function onRequest(ctx) {
  return withDb(ctx, async () => {
    const req = ctx.request;
    if (req.method !== 'POST' && req.method !== 'GET') return err('Method not allowed', 405);
    const headers = new Headers();
    headers.append('Set-Cookie', buildClearCookieHeader());
    headers.append('Set-Cookie', 'ov_csrf=; Path=/; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
    headers.set('content-type', 'application/json; charset=utf-8');
    headers.set('location', '/admin');
    // Accept JSON 则返回 JSON，否则 302 跳登录页
    const accept = req.headers.get('accept') || '';
    if (/json/.test(accept) || req.method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), { headers, status: 200 });
    }
    return new Response(null, { headers, status: 302 });
  });
}
