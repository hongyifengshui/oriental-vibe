// RED test — verify public/i18n runtime translations match Xu Wei 2.0
// Expected: FAIL initially (still Dr. Ming Li from legacy public/i18n/*.json)
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, '..', '..', 'public', 'i18n');

const LANGS = [
  { file: 'en.json', nameContain: 'Xu Wei · 徐 偉', noContain: ['Ming Li', 'Dr. Li'], zhOnly: null },
  { file: 'zh.json', nameContain: '徐 偉',                   noContain: ['Ming Li', 'Dr. Li'], zhOnly: true  },
  { file: 'es.json', nameContain: 'Xu Wei · 徐 偉', noContain: ['Ming Li', 'Dr. Li'], zhOnly: null },
  { file: 'fr.json', nameContain: 'Xu Wei · 徐 偉', noContain: ['Ming Li', 'Dr. Li'], zhOnly: null },
  { file: 'de.json', nameContain: 'Xu Wei · 徐 偉', noContain: ['Ming Li', 'Dr. Li'], zhOnly: null },
];

const ABOUT_MIN_KEYS = [
  'section_hero_title','section_hero_subtitle','section_timeline_title',
  'section_lineage_title','section_seals_title','section_affil_title',
  'section_expertise_title','section_cases_title','section_method_title',
  'section_guarantee_title','section_teaching_title','section_final_cta_title',
  'seal_01_title','seal_05_title','final_cta_title','final_cta_subtitle',
];

let passed = 0, failed = 0, logs = [];
function assert(lbl, cond, detail) {
  if (cond) { passed++; logs.push('  ✓ ' + lbl); }
  else      { failed++; logs.push('  ✗ FAIL ' + lbl + ' — ' + (detail || '')); }
}

LANGS.forEach(L => {
  const fp = path.join(DIR, L.file);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(fp, 'utf8'));
    assert(`[${L.file}] JSON.parse 成功`, true);
  } catch (e) {
    assert(`[${L.file}] JSON.parse 成功`, false, e.message);
    return;
  }
  const svc = json.services || {};
  assert(`[${L.file}] services.expert_name === 目标 (${L.nameContain})`,
    typeof svc.expert_name === 'string' && svc.expert_name.includes(L.nameContain),
    `got: ${JSON.stringify(svc.expert_name)}`);
  L.noContain.forEach(bad => {
    assert(`[${L.file}] services.* 不含 "${bad}"`,
      !JSON.stringify(svc).includes(bad), `发现残留 "${bad}"`);
  });
  // 8 creds 非空
  for (let i = 1; i <= 8; i++) {
    const k = 'expert_cred_' + i;
    assert(`[${L.file}] services.${k} 非空`,
      typeof svc[k] === 'string' && svc[k].trim().length > 4,
      `got: ${JSON.stringify(svc[k])}`);
  }
  // 3 个新增 CTA / compliance
  ['expert_cta_about','expert_cta_book','expert_compliance'].forEach(k => {
    assert(`[${L.file}] services.${k} 非空`,
      typeof svc[k] === 'string' && svc[k].trim().length > 4,
      `got: ${JSON.stringify(svc[k])}`);
  });
  // about section 核心 key 16 条存在且非空
  const about = json.about || {};
  ABOUT_MIN_KEYS.forEach(k => {
    assert(`[${L.file}] about.${k} 存在且非空`,
      typeof about[k] === 'string' && about[k].trim().length > 2,
      `got: ${JSON.stringify(about[k])}`);
  });
});

console.log('===== PUBLIC/I18N TDD CHECK =====');
logs.forEach(l => console.log(l));
console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
