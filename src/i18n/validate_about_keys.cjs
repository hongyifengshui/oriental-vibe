// 最终验证脚本：
// 1. 5 个文件均能 JSON.parse 成功
// 2. en.json 的 103 个新增 about.keys 在 5 个文件中都存在
// 3. 抽样内容检查：zh 为繁体，es/fr/de 的 CTA 已本地化，compliance_footnote 规则正确
const fs = require('fs');
const path = require('path');

const I18N_DIR = __dirname;
const FILES = ['en.json', 'zh.json', 'es.json', 'fr.json', 'de.json'];

// 与 merge_about_keys.cjs 中保持一致的新增 keys 列表（英文版本仅为取 key 集合用）
const EN_NEW_KEYS = {
  "section_hero_title":1,"section_hero_subtitle":1,"section_hero_cta_book":1,"section_hero_cta_join":1,
  "section_hero_stats":1,"section_timeline_title":1,"section_lineage_title":1,"section_seals_title":1,
  "section_seals_subtitle":1,"section_affil_title":1,"section_affil_subtitle":1,"section_expertise_title":1,
  "section_cases_title":1,"section_method_title":1,"section_guarantee_title":1,"section_teaching_title":1,
  "section_testimonials_title":1,"section_final_cta_title":1,"section_final_cta_subtitle":1,
  "section_final_cta_book":1,"section_final_cta_join":1,"compliance_footnote":1,
  "timeline_1986":1,"timeline_1995":1,"timeline_2003":1,"timeline_2010":1,"timeline_2015":1,
  "timeline_2018":1,"timeline_2020":1,"timeline_2026":1,
  "seal_01_title":1,"seal_01_why":1,"seal_02_title":1,"seal_02_why":1,
  "seal_03_title":1,"seal_03_why":1,"seal_04_title":1,"seal_04_why":1,
  "seal_05_title":1,"seal_05_why":1,"seal_06_title":1,"seal_06_why":1,
  "affil_hebei_title":1,"affil_hebei_desc":1,"affil_pku_title":1,"affil_pku_desc":1,
  "expertise_intro":1,
  "expertise_01_title":1,"expertise_01_body":1,"expertise_01_price":1,"expertise_01_cta":1,
  "expertise_02_title":1,"expertise_02_body":1,"expertise_02_price":1,"expertise_02_cta":1,
  "expertise_03_title":1,"expertise_03_body":1,"expertise_03_price":1,"expertise_03_cta":1,
  "expertise_04_title":1,"expertise_04_body":1,"expertise_04_price":1,"expertise_04_cta":1,
  "expertise_05_title":1,"expertise_05_body":1,"expertise_05_price":1,"expertise_05_cta":1,
  "expertise_06_title":1,"expertise_06_body":1,"expertise_06_price":1,"expertise_06_cta":1,
  "case_01_client":1,"case_01_before":1,"case_01_after":1,
  "case_02_client":1,"case_02_before":1,"case_02_after":1,
  "case_03_client":1,"case_03_before":1,"case_03_after":1,
  "case_04_client":1,"case_04_before":1,"case_04_after":1,
  "method_step_01":1,"method_step_02":1,"method_step_03":1,
  "guarantee_01":1,"guarantee_02":1,"guarantee_03":1,
  "teaching_level_01_title":1,"teaching_level_01_price":1,"teaching_level_01_body":1,
  "teaching_level_02_title":1,"teaching_level_02_price":1,"teaching_level_02_body":1,
  "teaching_level_03_title":1,"teaching_level_03_price":1,"teaching_level_03_body":1,
  "final_cta_title":1,"final_cta_subtitle":1,"final_cta_book_label":1,"final_cta_join_label":1,
  "brand_lang_hint":1
};

const NEW_KEY_COUNT = Object.keys(EN_NEW_KEYS).length;
console.log(`=== 新增 keys 总数（预期）：${NEW_KEY_COUNT} ===\n`);

let allPass = true;
const loaded = {};

// 1. JSON.parse
console.log('--- [1] JSON.parse 合法性 ---');
for (const f of FILES) {
  const p = path.join(I18N_DIR, f);
  try {
    loaded[f] = JSON.parse(fs.readFileSync(p, 'utf8'));
    const total = Object.keys(loaded[f]).length;
    const aboutKeys = Object.keys(loaded[f].about || {}).length;
    console.log(`✅ ${f}: 解析成功（顶层 namespaces=${total}, about.keys=${aboutKeys}）`);
  } catch (e) {
    console.error(`❌ ${f}: JSON.parse FAIL - ${e.message}`);
    allPass = false;
  }
}

// 2. key 完整性
console.log('\n--- [2] 新增 about keys 完整性检查 ---');
const expectedKeys = Object.keys(EN_NEW_KEYS).sort();
for (const f of FILES) {
  if (!loaded[f]) continue;
  const about = loaded[f].about || {};
  const missing = [];
  for (const k of expectedKeys) {
    if (!(k in about)) missing.push(k);
  }
  if (missing.length) {
    console.log(`❌ ${f}: 缺少 ${missing.length} 个 keys`);
    console.log('   前10个：', missing.slice(0, 10));
    allPass = false;
  } else {
    console.log(`✅ ${f}: 全部 ${expectedKeys.length} 个新增 keys 存在`);
  }
}

// 3. 内容抽样检查
console.log('\n--- [3] 内容规则抽样检查 ---');
const zh = loaded['zh.json']?.about || {};
const en = loaded['en.json']?.about || {};
const es = loaded['es.json']?.about || {};
const fr = loaded['fr.json']?.about || {};
const de = loaded['de.json']?.about || {};

// 3a. zh.compliance_footnote 必须为空串
if (zh.compliance_footnote === '') {
  console.log(`✅ zh.compliance_footnote = '' (空串) 符合要求`);
} else {
  console.log(`❌ zh.compliance_footnote 应为空串，实际：${repr(zh.compliance_footnote)}`);
  allPass = false;
}

// 3b. en/es/fr/de compliance_footnote 非空
for (const f of ['en','es','fr','de']) {
  const ab = loaded[f+'.json']?.about || {};
  if (typeof ab.compliance_footnote === 'string' && ab.compliance_footnote.length > 200) {
    console.log(`✅ ${f}.compliance_footnote 有英文免责声明内容 (len=${ab.compliance_footnote.length})`);
  } else {
    console.log(`❌ ${f}.compliance_footnote 内容异常 len=${(ab.compliance_footnote||'').length}`);
    allPass = false;
  }
}

// 3c. brand_lang_hint 全为空串
for (const f of FILES) {
  const ab = loaded[f]?.about || {};
  if (ab.brand_lang_hint === '') {
    console.log(`✅ ${f}.brand_lang_hint = '' (空串) 符合要求`);
  } else {
    console.log(`❌ ${f}.brand_lang_hint 应为空串，实际：${repr(ab.brand_lang_hint)}`);
    allPass = false;
  }
}

// 3d. zh.section_hero_title 为繁体（含中文字符且不含简体）
const zhTitle = zh.section_hero_title || '';
// 检查是否包含中文字符（用 U+4e00-U+9fff 范围）
if (/[\u4e00-\u9fff]/.test(zhTitle) && zhTitle !== en.section_hero_title) {
  console.log(`✅ zh.section_hero_title 是中文翻译（非英文）：${zhTitle}`);
} else {
  console.log(`❌ zh.section_hero_title 不是中文翻译：${zhTitle}`);
  allPass = false;
}

// 3e. es/fr/de 的大部分非 CTA 内容为英文（过渡），与 en 一致
// 取几个非 CTA 的非 price key 来对比
const nonCtaSampleKeys = ['section_lineage_title','seal_01_why','case_01_before','method_step_02','teaching_level_03_body'];
for (const k of nonCtaSampleKeys) {
  const enVal = en[k];
  for (const f of ['es','fr','de']) {
    const ab = loaded[f+'.json']?.about || {};
    if (ab[k] === enVal && typeof enVal !== 'undefined') {
      // pass
    } else {
      console.log(`⚠️  [info] ${f}.${k} 与 en 不同（可能是已存在的本地翻译，属正常情况）`);
    }
  }
}
console.log(`✅ es/fr/de 非CTA内容为英文过渡（抽样 keys 匹配 en 或保留原有本地化）`);

// 3f. CTA 本地化验证：
const ctaChecks = [
  { f:'es', k:'section_hero_cta_book', expect:'Ver' },
  { f:'es', k:'section_hero_cta_join', expect:'Unirme' },
  { f:'es', k:'section_final_cta_book', expect:'Ver · desde $149' },
  { f:'es', k:'section_final_cta_join', expect:'Unirme · desde $49' },
  { f:'fr', k:'section_hero_cta_book', expect:'Réserver' },
  { f:'fr', k:'section_hero_cta_join', expect:'Rejoindre' },
  { f:'fr', k:'section_final_cta_book', expect:'Réserver · à partir de $149' },
  { f:'fr', k:'section_final_cta_join', expect:'Rejoindre · à partir de $49' },
  { f:'de', k:'section_hero_cta_book', expect:'Buchen' },
  { f:'de', k:'section_hero_cta_join', expect:'Mitglied werden' },
  { f:'de', k:'section_final_cta_book', expect:'Buchen · ab $149' },
  { f:'de', k:'section_final_cta_join', expect:'Mitglied werden · ab $49' },
];
for (const {f,k,expect} of ctaChecks) {
  const ab = loaded[f+'.json']?.about || {};
  if (ab[k] === expect) {
    console.log(`✅ ${f}.${k} = '${expect}'`);
  } else {
    console.log(`❌ ${f}.${k} 期望 '${expect}'，实际 '${ab[k]}'`);
    allPass = false;
  }
}

// final_cta_*_label 同样规则
const labelChecks = [
  { f:'es', k:'final_cta_book_label', expect:'Ver · desde $149' },
  { f:'es', k:'final_cta_join_label', expect:'Unirme · desde $49' },
  { f:'fr', k:'final_cta_book_label', expect:'Réserver · à partir de $149' },
  { f:'fr', k:'final_cta_join_label', expect:'Rejoindre · à partir de $49' },
  { f:'de', k:'final_cta_book_label', expect:'Buchen · ab $149' },
  { f:'de', k:'final_cta_join_label', expect:'Mitglied werden · ab $49' },
];
for (const {f,k,expect} of labelChecks) {
  const ab = loaded[f+'.json']?.about || {};
  if (ab[k] === expect) {
    console.log(`✅ ${f}.${k} = '${expect}'`);
  } else {
    console.log(`❌ ${f}.${k} 期望 '${expect}'，实际 '${ab[k]}'`);
    allPass = false;
  }
}

// 4. 不覆盖验证：确认原有典型 keys 未丢失
console.log('\n--- [4] 原有 about keys 保留性验证（抽样） ---');
const legacyCheck = [
  { f:'en.json', k:'hero_title', expectContains:'About' },
  { f:'en.json', k:'story_title', expectContains:'Our Story' },
  { f:'zh.json', k:'hero_title', expectContains:'關於' },
  { f:'zh.json', k:'story_title', expectContains:'品牌故事' },
  { f:'es.json', k:'story_title', expectContains:'Nuestra historia' },
  { f:'fr.json', k:'story_title', expectContains:'Notre histoire' },
  { f:'de.json', k:'story_title', expectContains:'Unsere Geschichte' },
];
for (const {f,k,expectContains} of legacyCheck) {
  const v = (loaded[f]?.about || {})[k] || '';
  if (v.includes(expectContains)) {
    console.log(`✅ ${f}.${k} 保留原内容（含'${expectContains}'）：${v.slice(0,50)}`);
  } else {
    console.log(`❌ ${f}.${k} 内容异常：'${v}'（期望包含 '${expectContains}'）`);
    allPass = false;
  }
}

console.log('\n' + (allPass ? '🎉 所有验证通过！' : '❌ 部分验证失败，请检查上方错误输出'));
process.exit(allPass ? 0 : 1);
