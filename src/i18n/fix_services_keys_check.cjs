/* fix_services_keys_check.cjs
 * 验证 5 个 i18n JSON 文件 services 命名空间的修改结果。
 *
 * 检查项：
 *   1. 每个 JSON 都能 JSON.parse 成功。
 *   2. 每个 JSON 都有 services.expert_cred_1..8 共 8 条。
 *   3. 英文/西/法/德文的 expert_name 不能再出现 "Ming Li" / "Dr. Li"。
 *   4. zh 的 expert_name 必须包含 "徐 偉"（或"徐偉"）。
 *   5. 每个 JSON 都有新增的 3 个 key：expert_cta_about / expert_cta_book / expert_compliance。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASE_DIR = __dirname;
const FILES = ['en.json', 'zh.json', 'es.json', 'fr.json', 'de.json'];
const LANG_CHECK_MINGLI = ['en', 'es', 'fr', 'de'];

let errors = 0;
let passes = 0;

function log(label, ok, msg) {
  const tag = ok ? '✓ PASS' : '✗ FAIL';
  console.log(`${label}  ${tag}  ${msg}`);
  if (ok) passes++;
  else errors++;
}

console.log('===== fix_services_keys_check.cjs =====\n');

for (const fname of FILES) {
  const fpath = path.join(BASE_DIR, fname);
  const lang = fname.replace('.json', '');
  const label = `[${fname.padEnd(10)}]`;

  let raw;
  // 1. JSON.parse 成功
  try {
    raw = fs.readFileSync(fpath, 'utf8');
  } catch (e) {
    log(label, false, `无法读取文件: ${e.message}`);
    continue;
  }

  let data;
  try {
    data = JSON.parse(raw);
    log(label, true, `JSON.parse 成功`);
  } catch (e) {
    log(label, false, `JSON.parse 失败: ${e.message}`);
    continue;
  }

  if (!data || typeof data !== 'object' || !data.services || typeof data.services !== 'object') {
    log(label, false, `缺少 services 命名空间`);
    continue;
  }

  const svc = data.services;

  // 2. expert_cred_1..8 共 8 条
  let credCount = 0;
  for (let i = 1; i <= 8; i++) {
    const key = `expert_cred_${i}`;
    if (typeof svc[key] === 'string' && svc[key].trim().length > 0) {
      credCount++;
    }
  }
  log(
    label,
    credCount === 8,
    `services.expert_cred_1..8 数量 = ${credCount} (expect 8)`
  );

  // 3. en/es/fr/de 不能出现 Ming Li / Dr. Li
  if (LANG_CHECK_MINGLI.includes(lang)) {
    const name = svc.expert_name || '';
    const bad = name.includes('Ming Li') || name.includes('Dr. Li');
    log(
      label,
      !bad,
      `expert_name 不含 Ming Li / Dr. Li  (got: "${name}")`
    );
  }

  // 4. zh 的 expert_name 必须包含 徐 偉 或 徐偉
  if (lang === 'zh') {
    const name = svc.expert_name || '';
    const ok = name.includes('徐 偉') || name.includes('徐偉');
    log(
      label,
      ok,
      `expert_name 包含"徐 偉"/"徐偉"  (got: "${name}")`
    );
  }

  // 5. 新增 3 个 key
  const newKeys = ['expert_cta_about', 'expert_cta_book', 'expert_compliance'];
  let newKeysOk = 0;
  const missing = [];
  for (const k of newKeys) {
    if (typeof svc[k] === 'string' && svc[k].trim().length > 0) {
      newKeysOk++;
    } else {
      missing.push(k);
    }
  }
  log(
    label,
    newKeysOk === 3,
    newKeysOk === 3
      ? `新增 3 个 key 全部存在 (${newKeys.join(', ')})`
      : `新增 key 缺失: ${missing.join(', ')}`
  );

  // 额外：确保 expert_title / expert_name / expert_bio 存在且非空（属于覆盖更新的 11 核心之一）
  const coreKeys = ['expert_title', 'expert_name', 'expert_bio'];
  let coreOk = true;
  for (const k of coreKeys) {
    if (!(typeof svc[k] === 'string' && svc[k].trim().length > 0)) {
      coreOk = false;
      missing.push(k);
    }
  }
  log(label, coreOk, `核心覆盖 key expert_title/name/bio 非空`);
}

console.log(`\n===== SUMMARY: ${passes} passed, ${errors} failed =====`);
process.exit(errors === 0 ? 0 : 1);
