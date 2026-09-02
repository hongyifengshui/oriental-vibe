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
function sanitizeForJson(val) {
  // Some LLM outputs contain raw control characters (e.g. C1 control bytes) that
  // cause RFC 8259 JSON parsers (Chrome strict / Python json.loads) to choke.
  // JSON.stringify preserves \n\t\r correctly but strips only U+0000-U+001F except
  // \n \r \t. Forbid raw C0 controls (except common whitespace) and C1 DEL, to
  // ensure browser resp.json() never chokes on AI text.
  if (typeof val !== "string") return val;
  return val.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}
function json(data, status = 200, extraHeaders = {}) {
  // Lightweight recursive sanitize: only touch string leaves, preserve structure.
  const clean = (v) => {
    if (v == null) return v;
    if (typeof v === "string") return sanitizeForJson(v);
    if (Array.isArray(v)) return v.map(clean);
    if (typeof v === "object") {
      const o = {};
      for (const k of Object.keys(v)) o[k] = clean(v[k]);
      return o;
    }
    return v;
  };
  return new Response(JSON.stringify(clean(data)), {
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

  // ── Dual input contract: {message,history,lang}  OR  {messages[{role,content}], stream, lang}
  //   The AIChatWidget uses the former. The OpenAI /messages[] style is also widely
  //   understood by LLM clients, so support both transparently.
  const norm = normalizeInput(payload);
  if (!norm.ok) {
    return json({ error: norm.error, ok: false }, 400);
  }
  const message = norm.message;
  const history = norm.history;
  const lang =
    (norm.lang && ["en", "zh"].includes(norm.lang)) ? norm.lang : detectLang(message);

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

/**
 * Normalize two input contracts into a single {message, history, lang} shape.
 *
 *  Contract A — Widget-native:
 *    { message: string, history: [{role:'user'|'assistant', text:string}], lang?: 'en'|'zh' }
 *
 *  Contract B — OpenAI-style (widely used by 3rd-party LLM clients):
 *    { messages: [{role:'system'|'user'|'assistant'|'tool', content:string}], lang?: 'en'|'zh', stream?: bool }
 *    → last user message becomes `message`; earlier non-system messages become `history`
 *      (converted to A/B unified shape { role, text })
 *
 * @returns {{ok:true, message:string, history:Array, lang:string|undefined}}
 *          | {{ok:false, error:string}}
 */
function normalizeInput(payload) {
  const p = payload || {};
  const lang = (typeof p.lang === "string" && p.lang) || undefined;

  // ── Contract A takes precedence when both shapes are supplied.
  if (typeof p.message === "string") {
    const message = p.message.toString().trim().slice(0, 1500);
    if (!message) return { ok: false, error: "message is required" };
    const history = Array.isArray(p.history) ? p.history : [];
    return { ok: true, message, history, lang };
  }

  // ── Contract B: OpenAI messages[]
  if (Array.isArray(p.messages) && p.messages.length > 0) {
    const normMessages = p.messages
      .map((m) => {
        if (!m || typeof m !== "object") return null;
        const role = ["system", "user", "assistant", "tool"].includes(String(m.role))
          ? String(m.role)
          : "user";
        let content = "";
        if (typeof m.content === "string") content = m.content;
        else if (Array.isArray(m.content)) {
          content = m.content
            .map((part) => (part && typeof part.text === "string" ? part.text : ""))
            .join(" ");
        }
        if (!content) return null;
        return { role, content: String(content) };
      })
      .filter(Boolean);

    if (!normMessages.length) {
      return { ok: false, error: "messages must contain at least one entry with content" };
    }

    // Extract the LAST message. If it's not from user → invalid (no pending query).
    // If it IS user, take it as the effective message; earlier user/assistant pairs become history.
    const last = normMessages[normMessages.length - 1];
    if (last.role !== "user") {
      return { ok: false, error: "the last message in 'messages' must be from the user" };
    }
    const message = last.content.toString().trim().slice(0, 1500);
    if (!message) return { ok: false, error: "user message is empty" };

    // Earlier messages (except system prompt, which RAG rebuilds) become history.
    // Map to AIChatWidget history shape: { role: 'user'|'assistant', text: string }
    const history = [];
    for (let i = 0; i < normMessages.length - 1; i++) {
      const m = normMessages[i];
      if (m.role === "system") continue; // RAG provides its own system prompt
      if (m.role !== "user" && m.role !== "assistant") continue;
      history.push({ role: m.role, text: m.content });
    }
    return { ok: true, message, history, lang };
  }

  return { ok: false, error: "either 'message' string or non-empty 'messages' array is required" };
}
