// Pre-build / pre-preview sync script. Two syncs:
//   1) src/i18n/*.json       → public/i18n/*.json       (BaseLayout runtime fetch('/i18n/xx.json'))
//   2) src/utils/*.js         → public/utils/*.js         (Admin runtime fetch('/utils/admin-cloud.js'))
// Root cause doc:
//   Astro only copies files under public/ as-is into dist/. Files in src/ are
//   treated as module inputs to the Astro build; referencing them via absolute URL
//   (e.g. <script src="/utils/admin-cloud.js">) will return 404 at runtime unless
//   they are mirrored into public/ first. This script eliminates the bug permanently.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

// --------------------------------------------------------------------------
// Part 1 — i18n JSON mirror + legacy Dr. Ming Li sweep
// --------------------------------------------------------------------------
(function syncI18n() {
  const SRC = path.join(ROOT, 'src', 'i18n');
  const PUB = path.join(ROOT, 'public', 'i18n');
  // Plan A: only EN + Traditional Chinese are shipped. DE/FR/ES sources kept
  // on disk for future re-enable but are NOT mirrored → /i18n/de.json 404.
  const LANGS = ['en', 'zh'];
  if (!fs.existsSync(PUB)) fs.mkdirSync(PUB, { recursive: true });

  // Cleanup legacy mirrored files so we never accidentally serve them.
  ['de', 'fr', 'es'].forEach((drop) => {
    const f = path.join(PUB, drop + '.json');
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
      console.log(`  🗑 [i18n] removed stale public/i18n/${drop}.json`);
    }
  });

  let copied = 0;
  LANGS.forEach(lang => {
    const srcFile = path.join(SRC, lang + '.json');
    const pubFile = path.join(PUB, lang + '.json');
    if (!fs.existsSync(srcFile)) throw new Error('[sync] MISSING ' + srcFile);

    const obj = JSON.parse(fs.readFileSync(srcFile, 'utf8'));
    let swept = 0;
    const before = JSON.stringify(obj.services || {});
    (function sweep(o) {
      if (o && typeof o === 'object') {
        Object.keys(o).forEach(k => {
          const v = o[k];
          if (typeof v === 'string') {
            if (/Dr\. Ming Li|Dr\. Li|PhD in Environmental Psychology|20\+ Years Practice Experience|Certified Space Energy Consultant|International Speaker & Author|Oriental Vibe Energy Architect|With over 20 years of experience bridging traditional Chinese energy principles/.test(v)) {
              o[k] = '';
              swept++;
            }
          } else if (v && typeof v === 'object') {
            sweep(v);
          }
        });
      }
    })(obj.services || {});
    if (before !== JSON.stringify(obj.services || {})) {
      console.log(`  🧹 [${lang}.json] swept ${swept} legacy services strings`);
    }

    fs.writeFileSync(pubFile, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    copied++;
    JSON.parse(fs.readFileSync(pubFile, 'utf8'));
  });
  console.log(`✅ i18n: ${copied} files copied  src/i18n → public/i18n`);
})();

// --------------------------------------------------------------------------
// Part 2 — utils JS mirror (admin-cloud.js etc.)
// --------------------------------------------------------------------------
(function syncUtils() {
  const SRC = path.join(ROOT, 'src', 'utils');
  const PUB = path.join(ROOT, 'public', 'utils');
  if (!fs.existsSync(SRC)) return;
  if (!fs.existsSync(PUB)) fs.mkdirSync(PUB, { recursive: true });

  const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js'));
  let copied = 0;
  files.forEach(f => {
    const s = path.join(SRC, f);
    const p = path.join(PUB, f);
    const before = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    const src = fs.readFileSync(s, 'utf8');
    if (before !== src) {
      fs.writeFileSync(p, src, 'utf8');
      copied++;
    }
  });
  console.log(`✅ utils: ${copied}/${files.length} files copied  src/utils → public/utils`);
})();
