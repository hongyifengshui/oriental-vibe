/**
 * Cloudflare Pages Function: /api/chat
 *
 * Secure proxy for OpenAI GPT-4o-mini. The client never holds the API key.
 *
 * Features:
 *  - Takes POST { message, history, lang }
 *  - Builds a RAG-style system prompt with our *full* knowledge base inline
 *    (products, bundles, services, courses, FAQ, brand, expert, test,
 *    compliance, intention rules, contact info)
 *  - Calls OpenAI Chat Completions (gpt-4o-mini) with a structured-output
 *    requirement so the client still gets { text, buttons, cards }
 *  - Applies medium-level compliance disclaimer automatically
 *  - Enforces rate limiting per client IP (8 req/min)
 *  - Falls back: if OpenAI key is missing OR API fails, returns structured
 *    response with error hint (client will then fall back to local engine)
 *
 * Environment variables (set in Cloudflare Pages dashboard / wrangler.toml):
 *   OPENAI_API_KEY   = sk-... (required)
 *   OPENAI_BASE_URL  = https://api.openai.com/v1  (optional, default below)
 *   OPENAI_MODEL    = gpt-4o-mini  (optional)
 */

import { buildRAGSystemPrompt, parseLLMResponse, FALLBACK_REPLY } from "./_shared/rag-context.js";

const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";
const MAX_HISTORY_TURNS = 10;
const RATE_LIMIT_PER_MINUTE = 8;

/* ---------- In-memory lightweight rate limiter (per edge node) ---------- */
const rlBuckets = new Map(); // ipKey -> { windowStart, count }

function hitRateLimit(ip) {
  const now = Date.now();
  const key = ip || "anon";
  let bucket = rlBuckets.get(key);
  if (!bucket || now - bucket.windowStart >= 60_000) {
    bucket = { windowStart: now, count: 0 };
    rlBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_PER_MINUTE;
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    request.headers.get("X-Real-IP") ||
    ""
  );
}

/* ---------- HTTP helpers ---------- */
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, private",
      "Access-Control-Allow-Origin": requestOrigin(),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      ...extraHeaders
    }
  });
}

function requestOrigin() {
  // Allow same-site; Pages is same-origin so "*" is safe for SPA, but we restrict anyway
  return typeof globalThis !== "undefined" && globalThis.__requestOrigin__
    ? globalThis.__requestOrigin__
    : "*";
}

/* ---------- OpenAI call ---------- */
async function callOpenAI({ apiKey, baseUrl, model, userMessage, history, lang }) {
  const sysPrompt = buildRAGSystemPrompt(lang);

  const messages = [
    { role: "system", content: sysPrompt },
    // Trim history to last N turns (user+assistant pairs)
    ...(history || []).slice(-MAX_HISTORY_TURNS).map(m => ({
      role: m.role === "user" ? "user" : "assistant",
      content: typeof m.text === "string" ? m.text : String(m.text || "")
    })),
    { role: "user", content: userMessage }
  ];

  const url = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model,
    messages,
    temperature: 0.4,
    top_p: 0.9,
    max_tokens: 1000,
    response_format: { type: "json_object" },
    stream: false
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    // Cloudflare Workers-like fetch timeout (conservative)
    signal: AbortSignal.timeout(20_000)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const rawContent = data?.choices?.[0]?.message?.content || "";
  return parseLLMResponse(rawContent);
}

/* ---------- Handler ---------- */
export async function onRequest(context) {
  const { request, env } = context;

  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Method Not Allowed", ok: false }, 405);
  }

  // Rate limit
  const clientIp = getClientIp(request);
  if (hitRateLimit(clientIp)) {
    return json(
      {
        ok: false,
        rateLimited: true,
        text: "I'm receiving lots of messages right now. Could you wait a moment and try again? 💬",
        buttons: [
          { label: "🔄 Retry", action: "prompt" },
          { label: "💬 Human support", action: "human" }
        ],
        cards: {}
      },
      429
    );
  }

  // Parse body
  let payload;
  try {
    payload = await request.json();
  } catch (_) {
    return json({ error: "Invalid JSON body", ok: false }, 400);
  }

  const message = (payload?.message || "").toString().trim().slice(0, 1500);
  if (!message) {
    return json({ error: "message is required", ok: false }, 400);
  }
  const history = Array.isArray(payload?.history) ? payload.history : [];
  const lang =
    (payload?.lang && ["en", "zh"].includes(payload.lang)) ? payload.lang : detectLang(message);

  // Read env vars (Cloudflare Pages exposes them via `env`)
  const apiKey = (env?.OPENAI_API_KEY || globalThis?.process?.env?.OPENAI_API_KEY || "").toString();
  const baseUrl = (env?.OPENAI_BASE_URL || "https://api.openai.com/v1").toString();
  const model = (env?.OPENAI_MODEL || OPENAI_MODEL_DEFAULT).toString();

  // No key → client should fall back to local engine
  if (!apiKey) {
    return json(
      {
        ok: false,
        missingKey: true,
        // The server cannot work without a key; return a FALLBACK marker so the
        // client can transparently degrade to its local rule engine.
        ...FALLBACK_REPLY
      },
      200
    );
  }

  try {
    const startTime = Date.now();
    const structured = await callOpenAI({
      apiKey,
      baseUrl,
      model,
      userMessage: message,
      history,
      lang
    });
    const latencyMs = Date.now() - startTime;
    return json({
      ok: true,
      provider: "openai",
      model,
      lang,
      latencyMs,
      // Preserve existing client contract:
      text: structured.text,
      buttons: structured.buttons || [],
      cards: structured.cards || { products: [], services: [], courses: [] },
      compliance: structured.compliance || "medium"
    });
  } catch (err) {
    // Any upstream failure → return the "fallback" hint, client will retry via local engine
    return json(
      {
        ok: false,
        upstreamError: true,
        error: String(err?.message || err).slice(0, 120),
        ...FALLBACK_REPLY
      },
      502
    );
  }
}

/* ---------- Lang detection (for defaulting system prompt) ---------- */
function detectLang(s) {
  // If any CJK char present, default to zh prompt; else en
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(s || "") ? "zh" : "en";
}
