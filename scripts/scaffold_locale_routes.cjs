#!/usr/bin/env node
/**
 * scaffold_locale_routes.cjs
 *
 * Generates the dual locale route wrappers:
 *   src/pages/en/*.astro   →  SSR with locale=en, imports the named page component
 *   src/pages/zh/*.astro   →  SSR with locale=zh, imports the named page component
 *
 * Additionally rewrites the legacy top-level pages (src/pages/*.astro) as thin
 * "locale redirect" wrappers: read localStorage.ov-lang (fallback Accept-Language)
 * and redirect the browser to /en/<page> or /zh/<page>.
 *
 * /about and /master use their dedicated content components (BrandFunnel /
 * MasterProfile) instead of the old top-level about.astro page (which is
 * rewritten to a redirect wrapper itself).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PAGES = path.join(ROOT, 'src', 'pages');

const PAGES_LIST = [
  'index', 'about', 'master', 'shop', 'services', 'courses', 'blog',
  'membership', 'element-test', 'contact', 'faq', 'privacy', 'terms', 'shipping',
];

// Paths that share the SAME page component between EN/ZH (component already uses
// data-i18n attributes + runtime i18n translations).  About/master are special:
// they use dedicated SSG components (no old top-level component import).
const SHARED_PAGE_IMPORT = {
  index: "../../components/pages/index.astro",
  shop: "../../components/pages/shop.astro",
  services: "../../components/pages/services.astro",
  courses: "../../components/pages/courses.astro",
  blog: "../../components/pages/blog.astro",
  membership: "../../components/pages/membership.astro",
  'element-test': "../../components/pages/element-test.astro",
  contact: "../../components/pages/contact.astro",
  faq: "../../components/pages/faq.astro",
  privacy: "../../components/pages/privacy.astro",
  terms: "../../components/pages/terms.astro",
  shipping: "../../components/pages/shipping.astro",
};

// Title per locale per page slug (already defined in _slug_utils, duplicated here
// so the generator is single-source).
const TITLES = {
  index: { en: 'Oriental Vibe | Ancient Eastern Energy for Modern Living', zh: '東方能量空間 ｜ 正統東方智慧，現代生活應用' },
  about: { en: 'Our Story · Oriental Vibe', zh: '品牌故事 ｜ 東方能量空間' },
  master: { en: 'Master Xu Wei · Lineage Holder | Oriental Vibe', zh: '徐偉老師 ｜ 法脈掌門人 · 東方能量空間' },
  shop: { en: 'Shop · Crystals, Decor & Energy Jewelry', zh: '能量商城 ｜ 水晶、擺件、能量飾品' },
  services: { en: 'Services · Master-led Consultations', zh: '服務 ｜ 老師一對一諮詢' },
  courses: { en: 'Courses · Yuan Li Mechanics Curriculum', zh: '課程 ｜ 原理力學教學體系' },
  blog: { en: 'Blog · Energy Wisdom & Case Studies', zh: '部落格 ｜ 能量觀念與案例' },
  membership: { en: 'Membership · Ongoing Master Support', zh: '會員中心 ｜ 長期跟隨老師學習' },
  'element-test': { en: 'Five Elements Test · Free Assessment', zh: '五行元素測試 ｜ 免費能量測評' },
  contact: { en: 'Contact · Book a Consultation', zh: '聯絡我們 ｜ 預約諮詢' },
  faq: { en: 'FAQ · Answers Before You Engage', zh: '常見問答 ｜ 開始前的所有問題' },
  privacy: { en: 'Privacy Policy · Oriental Vibe', zh: '隱私權政策 ｜ 東方能量空間' },
  terms: { en: 'Terms of Service · Oriental Vibe', zh: '服務條款 ｜ 東方能量空間' },
  shipping: { en: 'Shipping & Returns · Oriental Vibe', zh: '運送與退貨 ｜ 東方能量空間' },
};

const DESCRIPTIONS = {
  index: {
    en: 'Ancient Eastern Energy for Modern Western Living. Balance Your Home, Calm Your Mind, Upgrade Your Life Vibe.',
    zh: '正統東方能量智慧，為現代生活應用。安定你的空間，梳理你的能量，提升你的生活氣場。',
  },
  about: {
    en: '40-year lineage practice. Founded by Master Xu Wei — 80th-gen Guiguzi, 79th-gen Sun Bin — Oriental Vibe brings authentic lineage diagnostics to homes & offices worldwide.',
    zh: '東方能量空間由徐偉老師（鬼谷子八十代、孫臏七十九代）創立，四十年法脈傳承，為全球住宅與企業提供正統的空間能量診斷。',
  },
  master: {
    en: 'Master Xu Wei — 40+ years lineage discipline, Visiting Professor at Peking University & Hebei Academy of Fine Arts. Read his story, titles, lineage, books & client testimonials.',
    zh: '徐偉老師——鬼谷子八十代嫡傳、北京大學篆刻研究所特聘研究員、河北美術學院特聘教授。完整故事、八大頭銜、法脈、著作與客戶親述。',
  },
};

function wrapperFor(locale, page) {
  const title = (TITLES[page] && TITLES[page][locale]) || (locale === 'zh' ? '東方能量空間' : 'Oriental Vibe');
  const desc = DESCRIPTIONS[page] && DESCRIPTIONS[page][locale];
  const header = `<script is:inline>
  // Lock locale at document start so SSR HTML matches the runtime locale.
  // Fallback reads like localStorage will never override the SSR locale.
  localStorage.setItem('ov-lang', '${locale}');
  document.documentElement.setAttribute('lang', ${locale === 'zh' ? '"zh-Hant"' : '"en"'});
</script>\n`;

  // about/master use dedicated content components.
  if (page === 'about') {
    return `---
import BaseLayout from '../../layouts/BaseLayout.astro';
import BrandFunnel from '../../components/about/BrandFunnel.astro';
---
<BaseLayout title="${title}" description="${desc || ''}">
${header}<BrandFunnel locale="${locale}" />
</BaseLayout>
`;
  }
  if (page === 'master') {
    return `---
import BaseLayout from '../../layouts/BaseLayout.astro';
import MasterProfile from '../../components/about/MasterProfile.astro';
---
<BaseLayout title="${title}" description="${desc || ''}">
${header}<MasterProfile locale="${locale}" />
</BaseLayout>
`;
  }

  // Every other page reuses the existing top-level Astro component. Because
  // Astro treats it as a named component, it renders its full body inline.
  const importPath = SHARED_PAGE_IMPORT[page];
  const componentName = pageToComponentName(page);
  return `---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ${componentName} from '${importPath}';
---
<BaseLayout title="${title}" description="${desc || ''}">
${header}<${componentName} />
</BaseLayout>
`;
}

function pageToComponentName(page) {
  return 'Page' + page.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
}

// Top-level redirect wrapper: turns src/pages/X.astro (except admin.astro / blog/[id].astro)
// into a 0-delay meta refresh + JS redirect to the correct locale prefix.
function redirectWrapper(page) {
  const jsRedirect = `
<script is:inline>
  (function() {
    try {
      var saved = localStorage.getItem('ov-lang');
      var accept = (navigator.language || 'en').toLowerCase();
      var want = saved === 'zh' ? 'zh' : (saved === 'en' ? 'en' : (accept.indexOf('zh') >= 0 ? 'zh' : 'en'));
      var current = window.location.pathname.replace(/\\/+$/, '');
      var target = '/' + want;
      if ('${page === 'index' ? '/' : ( '/' + page)}' !== '/') target += '${page === 'index' ? '/' : ('/' + page)}';
      else target += '/';
      if (window.location.pathname !== target) window.location.replace(target);
    } catch(e) { window.location.replace('/en/'); }
  })();
</script>`;

  const noscript = `<noscript>
  <meta http-equiv="refresh" content="0; url=/en${page === 'index' ? '/' : '/' + page}" />
</noscript>`;

  return `---
import BaseLayout from '../layouts/BaseLayout.astro';
// Legacy route wrapper — redirects /${page === 'index' ? '' : page} → /en/${page === 'index' ? '' : page} or /zh/...
// This top-level page is kept for inbound historic links and as the
// shared-rendering Astro component imported by locale wrappers.
---
<BaseLayout title="Redirecting…" description="Redirecting to localized site.">
${noscript}
${jsRedirect}
  <main style="padding:120px 24px;text-align:center;color:#555;">
    <h1 style="font-size:18px;">Redirecting to localized site…</h1>
    <p><a href="/en/${page === 'index' ? '' : page}">Continue to English site</a> · <a href="/zh/${page === 'index' ? '' : page}">前往繁體中文網站</a></p>
  </main>
</BaseLayout>
`;
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function writeIfChanged(file, content) {
  if (fs.existsSync(file)) {
    const existing = fs.readFileSync(file, 'utf8');
    if (existing === content) return false;
  }
  fs.writeFileSync(file, content, 'utf8');
  return true;
}

ensureDir(path.join(PAGES, 'en'));
ensureDir(path.join(PAGES, 'zh'));

let generated = 0;
let rewrites = 0;
for (const page of PAGES_LIST) {
  for (const locale of ['en', 'zh']) {
    const folder = path.join(PAGES, locale);
    const file = path.join(folder, `${page}.astro`);
    if (writeIfChanged(file, wrapperFor(locale, page))) generated++;
  }
  // Rewrite the top-level page as a redirect wrapper (unless admin/blog dynamic).
  const topFile = path.join(PAGES, page + '.astro');
  if (fs.existsSync(topFile)) {
    if (writeIfChanged(topFile, redirectWrapper(page))) rewrites++;
  }
}

console.log(`✅ locale wrappers generated/updated: ${generated} (en × zh × ${PAGES_LIST.length})`);
console.log(`✅ top-level pages rewritten as redirect wrappers: ${rewrites}`);
