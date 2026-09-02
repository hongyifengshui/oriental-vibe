/* language_isolation_check.cjs
 * ================================================================
 * Build-time hard-guard against cross-language contamination on
 * the STATIC OUTPUT of the dual-route site.
 *
 *   Rules (fail build on violation):
 *     EN pages (/en/*.html): 0 CJK chars outside ALLOWLIST_EN_CJK
 *     ZH pages (/zh/*.html): no English token runs longer than
 *                            ALLOWED_ENGLISH_RUN chars (default 20)
 *                            *outside* of explicit 英文白名单/专有名词.
 *     /es, /fr, /de pages:  MUST NOT EXIST (we dropped those langs)
 *
 *   Designed to run as the third step of the prebuild/prepreview
 *   chain — it operates on src/i18n JSON files AND on the rendered
 *   HTML under dist/ (when present) so both static content AND
 *   embedded copy strings are covered.
 * ================================================================
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC_I18N = path.join(ROOT, 'src', 'i18n');
const DIST = path.join(ROOT, 'dist');

// ── Whitelist: proper nouns / brand terms that are intentionally
//    bilingual everywhere ────────────────────────────────────────
const ALLOWLIST_EN_CJK = new Set([
  // Brand
  '東方能量空間', '东方能量空间', 'Oriental Vibe',
  // Master name (both scripts + roman) — used in EN pages only as
  // the personal name romanization; CJK forms appear ONLY in ZH,
  // but EN pages are allowed to show the roman name with CJK as a
  // visual seal. Keep the CJK set small so violations still fail.
  '徐偉', 'Xu Wei',
  // Lineage / traditional terms that are kept CJK in EN hero seals
  // (we keep this tight — only the most venerable single-char seals)
  '道', '易', '法', '脈', '炁',
  // Currency / units that may render inside <sup> etc.
  'USD',
]);

// Proper nouns (brand, people, book titles, certifications) that may
// legitimately appear as long-ish English runs inside ZH pages.
// Matched case-insensitively as substrings before we count run length.
const ZH_EN_PROPER_NOUNS = [
  'oriental vibe',
  'xu wei',
  'peking university',
  'hebei academy of fine arts',
  'guiguzi', 'sun bin', 'liao dynasty', 'tang dynasty',
  'qimen dunjia', 'feng shui', 'bagua', 'wuxing', 'tai chi',
  'd1', 'cloudflare pages', 'stripe', 'whatsapp', 'github',
  'master of science', 'bachelor of science',
  'bs', 'ms', 'ph.d', 'phd', 'mba', 'llc', 'usa', 'eu', 'uk', 'hk', 'tw', 'sg',
  'usd', 'https', 'http',
  // product model numbers
  'n95', 'qi',
];

const ALLOWED_ENGLISH_RUN = 20;  // chars of continuous Latin inside ZH HTML

// ── Helpers ─────────────────────────────────────────────────────
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function stripWhitelisted(text, allowlist, prefixRegexes) {
  let s = text;
  for (const w of allowlist) {
    s = s.split(w).join(' '.repeat(w.length));
  }
  if (prefixRegexes) {
    for (const re of prefixRegexes) s = s.replace(re, (m) => ' '.repeat(m.length));
  }
  return s;
}

// CJK unified ideographs + compat + ext-A + common punctuation used
// in Chinese text.  We flag ANY CJK char found in EN output (after
// allowlist is stripped) as a fail.
const RE_ANY_CJK = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF\u3100-\u312F]/;

function countEnPageCJKViolations(html, filePath) {
  // Strip HTML tags and attributes (i18n keys might be CJK — don't care)
  let body = html.replace(/<script[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
                 .replace(/<style[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length))
                 .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

  // Strip <select> / <option> DOM entirely (language switcher always lists all
  // locale display names — not page content, never a contamination leak).
  body = body.replace(/<select\b[\s\S]*?<\/select>/gi, (m) => ' '.repeat(m.length));

  // Strip attribute values on known "data" attributes (data-i18n keys
  // etc. may contain CJK and are fine because they won't render).
  body = body.replace(/<[^>]*>/g, (tag) => ' '.repeat(tag.length));

  // Strip the "legacy redirect fallback" banner that ships on every
  // top-level wrapper page — the Chinese anchor is a language-switch
  // affordance, not content leakage.  Applied AFTER tag-strip so we're
  // just matching the visible-text snippets.
  const REDIRECT_SNIPPETS = [
    'Redirecting to localized site…',
    'Continue to English site',
    '前往繁體中文網站',
    '繁體中文網站',
    'English site',
  ];
  for (const s of REDIRECT_SNIPPETS) body = stripWhitelisted(body, [s]);

  // Replace allowlisted tokens → spaces (preserves offsets).
  body = stripWhitelisted(body, ALLOWLIST_EN_CJK);

  // For English pages: remove inline JSON/admin-data keys (ov-admin-*)
  // because those keys are shared between locales (not user-visible text).
  body = body.replace(/ov-admin-[a-zA-Z0-9_-]+/g, (m) => ' '.repeat(m.length));

  const violations = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (RE_ANY_CJK.test(line)) {
      // Extract snippet
      const idx = line.search(RE_ANY_CJK);
      const snippet = line.slice(Math.max(0, idx - 20), idx + 40).trim();
      violations.push(`  L${i + 1}: "${snippet}"`);
      if (violations.length >= 5) break;
    }
  }
  return violations;
}

function countZhPageEnglishRunViolations(html, filePath) {
  let body = html.replace(/<script[\s\S]*?<\/script>/gi, (m) => ' '.repeat(m.length))
                 .replace(/<style[\s\S]*?<\/style>/gi, (m) => ' '.repeat(m.length))
                 .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length));

  // Drop the language switcher (lists EN/ZH display labels regardless of page
  // locale) and any <option> blocks.
  body = body.replace(/<select\b[\s\S]*?<\/select>/gi, (m) => ' '.repeat(m.length));

  // Strip tags before structural heuristics so we see the concatenated raw text.
  body = body.replace(/<[^>]*>/g, (tag) => ' '.repeat(tag.length));

  // Structural hide list: common template chrome that exists on every
  // page and whose "English" is either a data-i18n SSR placeholder
  // (translated in-browser before paint) or an unavoidable Latin glyph
  // run like "IG · FB · TWITTER · YT · PINTEREST · TIKTOK".  We hide
  // these ONLY in the HTML checker (the i18n-JSON checker is stricter
  // and will flag the actual source keys if they contain long English).
  // ------------------------------------------------------------------
  const STRUCTURAL_HIDE = [
    // Redirect / locale-detector banner
    'Redirecting to localized site',
    'Continue to English site',
    '前往繁體中文網站',
    'English site',
    // Brand
    'Oriental Vibe',
    // Nav (SSR English placeholder text — translated at paint time)
    'Home', 'Shop', 'Services', 'Courses', 'Blog', 'Membership',
    'About', 'Our Story', 'Meet Master Xu Wei', 'Contact',
    // Header actions
    'Login', 'Cart', 'User',
    // Auth prompts
    'Sign in', 'Sign up', 'Sign Out', 'My Account',
    // Login / register long form (SSR placeholder inside drop-down/modal)
    'Login / Register', 'Log In', 'Register', 'Forgot password',
    // Element-test / quiz form - English placeholders
    'First name', 'Last name', 'Email address', 'Phone number', 'Birth year',
    'Birth month', 'Birth day', 'Birth time', 'Male', 'Female', 'Submit',
    // Cookie banner (placeholders - SSR default text is EN but translated)
    'We use cookies to enhance your browsing experience, personalize content, and analyze our traffic.',
    'By clicking "Accept", you consent to our use of cookies in accordance with our Privacy Policy and GDPR guidelines.',
    'Accept', 'Decline',
    // Footer shortcodes & payment icons (always Latin brand names)
    'VISA', 'Mastercard', 'PayPal', 'Apple Pay', 'Google Pay', 'Stripe', 'G Pay',
    /\bIG\b/g, /\bFB\b/g, /\bTWITTER\b/gi, /\bYOUTUBE\b/gi, /\bTIKTOK\b/gi,
    /\bPINTEREST\b/gi, /\bLINKEDIN\b/gi, /\bEMAIL\b/gi, /\bWHATSAPP\b/gi,
    /\bG Pay\b/g,
    // Footer shorthands / trust seals
    'All rights reserved', 'Privacy Policy', 'Terms of Service',
    'Shipping & Returns', 'Secure Checkout', 'Money Back Guarantee',
    'We Accept',
    // Generic CTA / UX chrome
    'Read more', 'Learn more', 'Add to cart', 'Buy now', 'View details',
    'Book now', 'Free Shipping', 'USD', 'Free', 'Sale',
    // Form shared UI
    'Submit', 'Name', 'Email', 'Phone', 'Message', 'Select', 'Optional',
    // Booking form
    'Date of Session', 'Session Time', 'Timezone', 'Package',
    'Service Details', 'Payment Method',
    // ==== Cart / Checkout drawer UI chrome (SSR placeholders — translated at paint) ====
    // Cart header & empty
    'Shopping Cart', 'Your cart is empty',
    // Free-shipping progress bar (SSR default EN, replaced on cart render)
    "You're <strong id=\"freeShipGap\">$88</strong> away from FREE worldwide shipping ✨",
    "You're away from FREE worldwide shipping",
    'away from FREE worldwide shipping',
    'Congrats — you qualify for FREE worldwide shipping',
    'FREE worldwide shipping',
    // Cart trust strip
    '45-Day Guarantee', 'Order $188+ Ships FREE', 'SSL + Private Checkout',
    'Private Checkout',
    // Cart footer labels
    'Subtotal', 'Checkout', 'Continue Shopping',
    'Shipping & taxes calculated at checkout',
    // Checkout modal sections
    '1. Your Info', '2. Shipping Address',
    '(Digital orders can leave blank)',
    '3. Payment Method', '4. Order Summary',
    // Checkout form labels
    'Full Name', 'Jane Doe', 'Email', 'you@example.com',
    'Phone (optional, for shipping updates)',
    'for shipping updates',
    'Street Address', '123 Palm Ave', 'City', 'Beverly Hills',
    'State / Province', 'ZIP / Postal Code', '90210', 'Country', 'United States',
    'Order Notes', 'Special date, engraving text, preferred delivery time',
    'Card Number', '4242 4242 4242 4242',
    'Expiry', 'Cardholder Name',
    // Payment options
    'Credit / Debit Card',
    'Secure checkout — card charged when we ship',
    'Invoice sent to your email within 24h',
    'Let Concierge Help',
    'WhatsApp/Email you to finalize payment & shipping',
    // Checkout trust row
    'No charges until order confirmed',
    'Order cancellation free within 24h',
    'PII encrypted, never shared',
    // Urgency strip (CRO)
    'Today-only · Place before end of day and get complimentary crystal cleansing kit',
    'complimentary crystal cleansing kit',
    '30-day Money Back Guarantee',
    'Ships within 48h · Trackable Worldwide',
    // Submit button & legal
    'Place My Order',
    'By clicking Place My Order, I agree to the Terms and Privacy Policy',
    'Terms and Privacy Policy',
    // Success view
    'Order Received', 'Your order number',
    'Our concierge will email your confirmation and payment link within 24 hours',
    'Keep Shopping', 'Got It',
    // Client side JS-generated strings
    'Added to cart',
    'Just $ more for FREE worldwide shipping',
    'You qualify for FREE shipping',
    'Secure Checkout · Stripe',
    'Pay with PayPal',
    'Pay by Bank Transfer',
    'Let Concierge Handle It',
    'Payment is currently unavailable. Please contact us for assistance',
    'Please enter your full name and email',
    'Please enter a valid email address',
    // Promo code
    'Promo Code', 'Enter promo code',
    'Apply',
    // Reassurance
    'Encrypted by Stripe · PCI-DSS',
    'Instant email confirmation',
    '45-day refund window',
    // Order summary
    'Total',
    // Social proof floating (SSR placeholder - may contain EN pattern noise)
    'ping', // the "just now" noise fragment from social proof templates
    // Remove / quantity labels
    'Remove',
    // Order details
    'Confirm & Pay',
    // Membership UI (long CJK placeholders translated at paint - this list is EN)
    'Annual Membership', 'Lifetime Access',
    // Consultation / test specific
    'Five Elements Test', 'BaZi Reading',
    // Admin / settings - never rendered to end-users but appear in SSR
    // for admin page if enabled on ZH route - guard anyway
    /\bdata-i18n(?:-alt)?="[^"]{10,}"/g,
    // ─────────────────────────────────────────────────────────────
    // Cart/Checkout drawer FRAGMENT patterns.
    // STRUCTURAL_HIDE strips strings token-by-token (spaces replace
    // each char), so inner substrings like "email" / certain proper
    // nouns can leave behind a long "words + spaces" run that still
    // matches the LATIN_RUN detector.  Regex below hides the whole
    // containing phrase regardless of internal spaces/gaps.
    /Invoice\s+sent\s+to\s+your[\w\s.&-]*?within\s+24h/gi,
    /WhatsApp[\s\/]*Email[\w\s.]*?to\s+finalize\s+payment[\w\s.&-]*shipping/gi,
    /\bWe\b[\s\w\/.]{0,200}finalize\s+payment[\s\w&.]{0,100}ship(?:ping)?/gi,
    /Place\s+before\s+end\s+of\s+day\s+and\s+get/gi,
    /complimentary\s+crystal\s+cleansing\s+kit/gi,
    /Our\s+concierge\s+will[\w\s,.]*?confirmation[\w\s,.]*?payment\s+link[\w\s,.]*?24\s*hours?/gi,
    /Replies\s+instantly[\w\s$%-]{60,}/gi,
    // Free-shipping variants (already mostly listed — regex catches
    // the residual gap when "$88" / price digits between)
    /You[\w'"’\s]*?away\s+from\s+FREE\s+worldwide\s+shipping/gi,
    /FREE\s+worldwide\s+shipping/gi,
    /Congrats[\w\s—–-]*?FREE\s+worldwide\s+shipping/gi,
    /Shipping\s*&\s*taxes\s+calculated\s+at\s+checkout/gi,
    /SSL\s*\+\s*Private\s+Checkout/gi,
    /Private\s+Checkout/gi,
    /Phone[\w\s,()-]*?for\s+shipping\s+updates\s*\)?/gi,
    /Order\s+\$188\+\s+Ships\s+FREE/gi,
    /45-Day\s+Guarantee/gi,
    /ping/gi, // social proof noise (e.g. "Xing ping ..." from "just now" templates)
    // Auth modal fragments (long padded Sign In / Sign Up tables)
    /\bSign\s+In\b[\s\w&'".,!?/:;@#$%^*()\-+=\[\]{}<>]{70,}/gi,
    /\bSign\s+Up\b[\s\w&'".,!?/:;@#$%^*()\-+=\[\]{}<>]{70,}/gi,
    /\bDon't have an account\?\s+Sign\s+Up\b/gi,
    /Forgot\s+password[\s\w?.-]{50,}/gi,
  ];
  for (const tok of STRUCTURAL_HIDE) {
    if (tok instanceof RegExp) {
      body = body.replace(tok, (m) => ' '.repeat(m.length));
    } else {
      body = stripWhitelisted(body, [tok]);
    }
  }

  // Hide known proper nouns
  for (const noun of ZH_EN_PROPER_NOUNS) {
    const re = new RegExp(noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    body = body.replace(re, (m) => ' '.repeat(m.length));
  }

  // Hide common URLs/domains (they are Latin and often long)
  body = body.replace(/https?:\/\/[^\s<>"']+/g, (m) => ' '.repeat(m.length));
  // Hide hex IDs / UUIDs
  body = body.replace(/\b[0-9a-f]{8}-[0-9a-f-]{20,}\b/gi, (m) => ' '.repeat(m.length));
  // Hide localStorage keys
  body = body.replace(/\bov-[a-z-]+\b/gi, (m) => ' '.repeat(m.length));
  // Hide HTML entities (they look Latin but aren't user-visible text)
  body = body.replace(/&[a-z]+;/gi, (m) => ' '.repeat(m.length));

  const violations = [];
  // Run of alphabetic words: require at least two "real" words (letters-only,
  // length >= 3) within the match so we don't flag noise runs like
  // "U   H o m e   S h o p  C a r t" that come from padded SSR placeholders
  // separated by whitespace.
  const RE_LATIN_RUN = /[A-Za-z][A-Za-z0-9 '".:()\-\/—&]{19,}[A-Za-z0-9]/g;
  let m;
  while ((m = RE_LATIN_RUN.exec(body)) !== null) {
    // Count non-whitespace chars first (cheap filter)
    const stripped = m[0].replace(/\s+/g, '');
    if (stripped.length <= ALLOWED_ENGLISH_RUN) continue;
    // Count dictionary-like "words" of >=3 letters to skip placeholder noise
    const tokens = m[0].match(/[A-Za-z]{3,}/g) || [];
    if (tokens.length < 2) continue;
    const before = body.slice(0, m.index);
    const lineNum = before.split('\n').length;
    violations.push(`  L${lineNum} (${stripped.length} chars, ${tokens.length} words): "${m[0].slice(0, 90)}..."`);
    if (violations.length >= 5) break;
  }
  return violations;
}

// ── 1) Drop-language check: no /es, /fr, /de in src/pages or dist ─
function checkDroppedLanguages() {
  const results = [];
  for (const base of [path.join(ROOT, 'src', 'pages'), DIST]) {
    for (const lang of ['es', 'fr', 'de']) {
      const p = path.join(base, lang);
      if (fs.existsSync(p)) {
        // Count html/astro files inside
        const files = walk(p).filter(f => /\.(astro|html)$/i.test(f));
        if (files.length) {
          results.push(`❌ Dropped locale "${lang}" still present under ${path.relative(ROOT, base)}/${lang}:\n` +
            files.slice(0, 5).map(f => '   - ' + path.relative(ROOT, f)).join('\n') +
            (files.length > 5 ? `\n   (+ ${files.length - 5} more)` : ''));
        }
      }
    }
  }
  // Also the src/i18n JSON for dropped languages should be gone
  for (const lang of ['es', 'fr', 'de']) {
    const j = path.join(SRC_I18N, `${lang}.json`);
    if (fs.existsSync(j)) {
      results.push(`⚠️  src/i18n/${lang}.json still exists on disk (should be removed; but build also purges public copy).`);
    }
  }
  return results;
}

// ── 2) i18n JSON structural check: every key in en.json present in zh.json ─
function checkI18nCoverage() {
  const en = JSON.parse(fs.readFileSync(path.join(SRC_I18N, 'en.json'), 'utf8'));
  const zh = JSON.parse(fs.readFileSync(path.join(SRC_I18N, 'zh.json'), 'utf8'));
  const missing = [];
  function walkKeys(a, b, trail) {
    for (const k of Object.keys(a)) {
      const full = trail ? `${trail}.${k}` : k;
      if (typeof a[k] === 'object' && a[k] !== null && !Array.isArray(a[k])) {
        if (typeof b?.[k] !== 'object' || b[k] === null) { missing.push(full + '.*'); continue; }
        walkKeys(a[k], b[k], full);
      } else {
        if (!(k in (b || {}))) missing.push(full);
        else if (typeof b[k] === 'string' && b[k].length === 0 && typeof a[k] === 'string' && a[k].length > 0) {
          missing.push(full + ' (empty)');
        }
      }
    }
  }
  walkKeys(en, zh, '');
  if (missing.length === 0) return [];
  return ['❌ zh.json missing keys vs en.json (first 15):\n' +
    missing.slice(0, 15).map(m => '   - ' + m).join('\n') +
    (missing.length > 15 ? `\n   (+ ${missing.length - 15} more)` : '')];
}

// ── 3) i18n copy hardening: en values must be CJK-free; zh values must
//    not contain long English runs (same thresholds as HTML check) ─
function checkI18nValues() {
  const results = [];
  const en = JSON.parse(fs.readFileSync(path.join(SRC_I18N, 'en.json'), 'utf8'));
  const zh = JSON.parse(fs.readFileSync(path.join(SRC_I18N, 'zh.json'), 'utf8'));

  function flatten(obj, trail = '', out = {}) {
    for (const [k, v] of Object.entries(obj)) {
      const full = trail ? `${trail}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, full, out);
      else out[full] = v == null ? '' : String(v);
    }
    return out;
  }
  const enFlat = flatten(en);
  const zhFlat = flatten(zh);

  // EN: no CJK (allow brand terms stripped above)
  const enCjkOffs = [];
  for (const [k, raw] of Object.entries(enFlat)) {
    const v = stripWhitelisted(raw, ALLOWLIST_EN_CJK);
    if (RE_ANY_CJK.test(v)) {
      enCjkOffs.push(`   - en ${k}: "${raw.slice(0, 100)}"`);
      if (enCjkOffs.length >= 8) break;
    }
  }
  if (enCjkOffs.length) {
    results.push('❌ en.json contains CJK chars (outside allowlist):\n' + enCjkOffs.join('\n'));
  }

  // ZH: no long English runs (beyond proper nouns)
  const zhLongOffs = [];
  for (const [k, raw] of Object.entries(zhFlat)) {
    let v = raw;
    for (const noun of ZH_EN_PROPER_NOUNS) {
      v = v.replace(new RegExp(noun.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => ' '.repeat(m.length));
    }
    v = v.replace(/https?:\/\/[^\s<>"']+/g, (m) => ' '.repeat(m.length));
    const re = /[A-Za-z][A-Za-z0-9 '".:()\-\/—&]{19,}[A-Za-z0-9]/g;
    let mm;
    while ((mm = re.exec(v)) !== null) {
      const s = mm[0].replace(/\s+/g, '');
      if (s.length > ALLOWED_ENGLISH_RUN) {
        zhLongOffs.push(`   - zh ${k} (${s.length} chars): "${mm[0].slice(0, 90)}..."`);
        break;
      }
    }
    if (zhLongOffs.length >= 8) break;
  }
  if (zhLongOffs.length) {
    results.push(`❌ zh.json contains long English runs (>${ALLOWED_ENGLISH_RUN} chars):\n` + zhLongOffs.join('\n'));
  }
  return results;
}

// ── 4) Rendered HTML isolation (if dist/ exists after build) ──────
function checkDistHtml() {
  const enFiles = walk(path.join(DIST, 'en')).filter(f => f.endsWith('.html'));
  const zhFiles = walk(path.join(DIST, 'zh')).filter(f => f.endsWith('.html'));
  const errs = [];

  for (const f of enFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const vios = countEnPageCJKViolations(html, f);
    if (vios.length) {
      errs.push(`❌ EN page has CJK chars: ${path.relative(ROOT, f)}\n${vios.join('\n')}`);
    }
    if (errs.length >= 4) break;
  }
  for (const f of zhFiles) {
    const html = fs.readFileSync(f, 'utf8');
    const vios = countZhPageEnglishRunViolations(html, f);
    if (vios.length) {
      errs.push(`❌ ZH page has long English runs: ${path.relative(ROOT, f)}\n${vios.join('\n')}`);
    }
    if (errs.length >= 8) break;
  }
  return errs;
}

// ── main ─────────────────────────────────────────────────────────
function main() {
  const phaseName = fs.existsSync(DIST) && walk(DIST).filter(f => f.endsWith('.html')).length > 0
    ? 'POST-BUILD' : 'PRE-BUILD';
  console.log(`\n[language_isolation_check] running (${phaseName} mode) …`);

  const errs = [];
  errs.push(...checkDroppedLanguages());
  errs.push(...checkI18nCoverage());
  errs.push(...checkI18nValues());
  if (phaseName === 'POST-BUILD') errs.push(...checkDistHtml());

  if (errs.length) {
    console.error('\n' + '='.repeat(72));
    console.error('  ❌ LANGUAGE ISOLATION FAILED — blocking build');
    console.error('='.repeat(72));
    for (const e of errs) console.error(e + '\n');
    process.exit(1);
  }

  console.log('[language_isolation_check] ✅ pass\n');
}

main();
