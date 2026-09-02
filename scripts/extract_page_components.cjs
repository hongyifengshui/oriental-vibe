#!/usr/bin/env node
/**
 * extract_page_components.cjs
 *
 * Refactors the current top-level Astro pages into content-only components under
 * src/components/pages/*.astro so both locale wrappers (/en/..., /zh/...) and
 * the legacy redirect wrappers can share the same markup.
 *
 * For every page we need two artifacts:
 *   1) src/components/pages/<page>.astro  — the actual content. The old frontmatter
 *      and <BaseLayout> wrapper are stripped; the component emits only its <slot />
 *      children plus <style>/<script is:inline>.
 *   2) src/pages/<page>.astro                — SSR locale redirect wrapper (kept so
 *      historic /about, /shop etc. links continue to work).
 *
 * Files SKIPPED: admin.astro (English backend only), blog/[id].astro (dynamic).
 * For about.astro we SKIP extraction: the /en/about & /zh/about wrappers use
 * BrandFunnel.astro directly; legacy /about redirects to /en/about or /zh/about.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const COMP = path.join(ROOT, 'src', 'components', 'pages');
if (!fs.existsSync(COMP)) fs.mkdirSync(COMP, { recursive: true });

const PAGES_TO_EXTRACT = [
  'index', 'shop', 'services', 'courses', 'blog', 'membership',
  'element-test', 'contact', 'faq', 'privacy', 'terms', 'shipping',
];

function extract(page) {
  const srcFile = path.join(PAGES, `${page}.astro`);
  const dstFile = path.join(COMP, `${page}.astro`);
  const src = fs.readFileSync(srcFile, 'utf8');

  // (1) Parse original frontmatter. We'll keep its import / const / let lines
  // (adjusted for the new ../../ path depth) as the COMPONENT frontmatter, so
  // data arrays (courses, testimonials, heroBg, memberCards, etc.) stay
  // co-located with the markup that references them.  Any BaseLayout import
  // or BaseLayout-only lines are stripped.
  const fmMatch = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fmOrig = fmMatch ? fmMatch[1] : '';
  let fmLines = [];
  for (const rawLine of fmOrig.split(/\r?\n/)) {
    // Trim trailing whitespace only (preserve indent inside fm).
    const line = rawLine.replace(/\s+$/,'');
    if (!line) { fmLines.push(''); continue; }
    if (/^\s*import\s+BaseLayout\b/.test(line)) continue; // dropped
    if (/^\s*\/\/.*BaseLayout/.test(line)) continue;     // comment refs
    // Rewrite relative import paths so src/components/pages/X.astro → src/data
    // works: '../data/Y.js' → '../../data/Y.js', '../layouts/Z' references
    // are already skipped (we drop BaseLayout).
    const rewritten = line
      .replace(/(['"`])\.\.\/data\//g, '$1../../data/')
      .replace(/(['"`])\.\.\/utils\//g, '$1../../utils/')
      .replace(/(['"`])\.\.\/i18n\//g, '$1../../i18n/')
      .replace(/(['"`])\.\.\/components\//g, '$1../../components/');
    fmLines.push(rewritten);
  }
  // Drop trailing blank lines
  while (fmLines.length && fmLines[fmLines.length - 1] === '') fmLines.pop();
  // Drop leading blank lines
  while (fmLines.length && fmLines[0] === '') fmLines.shift();

  // (2) Extract the BaseLayout *body* (slot children + inline scripts).
  const openIdx = src.indexOf('<BaseLayout');
  let body;
  if (openIdx === -1) {
    body = fmMatch ? src.slice(fmMatch[0].length) : src;
  } else {
    let depth = 0;
    const regex = /<\/?BaseLayout\b[^>]*>/g;
    let m, start = -1, end = -1;
    while ((m = regex.exec(src)) !== null) {
      const tag = m[0];
      if (tag.startsWith('</')) {
        if (depth === 1) { end = m.index; break; }
        depth--;
      } else {
        if (!tag.endsWith('/>')) depth++;
        if (start === -1) start = m.index + tag.length;
      }
    }
    body = (start >= 0 && end > start) ? src.slice(start, end) : src;
  }

  // (3) Emit component: fresh frontmatter + body.
  const header = `<!-- Auto-extracted from src/pages/${page}.astro by scripts/extract_page_components.cjs — DO NOT edit by hand. -->`;
  let component;
  if (fmLines.length) {
    component = `---\n${fmLines.join('\n')}\n---\n\n${header}\n${body}\n`;
  } else {
    component = `${header}\n${body}\n`;
  }
  fs.writeFileSync(dstFile, component, 'utf8');
}

// Redirect wrapper for legacy top-level pages
function redirectWrapper(page) {
  const basePath = page === 'index' ? '/' : ('/' + page);
  const enDest = page === 'index' ? '/en/' : ('/en/' + page);
  const zhDest = page === 'index' ? '/zh/' : ('/zh/' + page);
  return `---
import BaseLayout from '../layouts/BaseLayout.astro';
// Legacy route → redirect to /en/... or /zh/... based on saved language preference.
// The actual page content now lives at src/components/pages/${page}.astro.
---
<BaseLayout title="Redirecting…" description="Redirecting to localized site.">
<noscript>
  <meta http-equiv="refresh" content="0; url=${enDest}" />
</noscript>
<script is:inline>
(function() {
  try {
    var saved = localStorage.getItem('ov-lang');
    var accept = (navigator.language || 'en').toLowerCase();
    var want = (saved === 'zh') ? 'zh' : (saved === 'en' ? 'en' : (accept.indexOf('zh') >= 0 ? 'zh' : 'en'));
    var target = want === 'zh' ? '${zhDest}' : '${enDest}';
    if (window.location.pathname !== target) window.location.replace(target);
  } catch(e) { window.location.replace('${enDest}'); }
})();
</script>
<main style="padding:120px 24px;text-align:center;color:#4b5563;">
  <h1 style="font-size:20px;margin:0 0 16px;">Redirecting to localized site…</h1>
  <p style="margin:8px 0;"><a href="${enDest}">English site</a> · <a href="${zhDest}">繁體中文網站</a></p>
</main>
</BaseLayout>
`;
}

for (const p of PAGES_TO_EXTRACT) {
  extract(p);
  fs.writeFileSync(path.join(PAGES, `${p}.astro`), redirectWrapper(p), 'utf8');
}
// Extract about.astro separately (wrapper uses BrandFunnel; just leave redirect wrapper)
fs.writeFileSync(path.join(PAGES, `about.astro`), (() => {
  const enDest = '/en/about';
  const zhDest = '/zh/about';
  return `---
import BaseLayout from '../layouts/BaseLayout.astro';
// Legacy /about route — redirect wrapper.
// The new brand-funnel content lives in components/about/BrandFunnel.astro
---
<BaseLayout title="Redirecting…" description="Redirecting to localized site.">
<noscript>
  <meta http-equiv="refresh" content="0; url=${enDest}" />
</noscript>
<script is:inline>
(function() {
  try {
    var saved = localStorage.getItem('ov-lang');
    var accept = (navigator.language || 'en').toLowerCase();
    var want = (saved === 'zh') ? 'zh' : (saved === 'en' ? 'en' : (accept.indexOf('zh') >= 0 ? 'zh' : 'en'));
    var target = want === 'zh' ? '${zhDest}' : '${enDest}';
    window.location.replace(target);
  } catch(e) { window.location.replace('${enDest}'); }
})();
</script>
<main style="padding:120px 24px;text-align:center;color:#4b5563;">
  <h1 style="font-size:20px;margin:0 0 16px;">Redirecting to Our Story…</h1>
  <p style="margin:8px 0;"><a href="${enDest}">English</a> · <a href="${zhDest}">繁體中文</a></p>
</main>
</BaseLayout>
`;
})(), 'utf8');

console.log(`✅ extracted ${PAGES_TO_EXTRACT.length + 1} page components into src/components/pages/ (about=redirect)`);
console.log(`✅ ${PAGES_TO_EXTRACT.length + 1} legacy top-level pages rewritten as locale-redirect wrappers`);
