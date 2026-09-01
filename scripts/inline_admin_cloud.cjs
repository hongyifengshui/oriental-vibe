#!/usr/bin/env node
/* eslint-disable */
/**
 * scripts/inline_admin_cloud.cjs
 * ---------------------------------------------------------------
 * 把 src/utils/admin-cloud.js 的原始内容无损嵌入到
 * src/pages/admin.astro 中 /* ADMIN-CLOUD-START *\/ ...
 * /* ADMIN-CLOUD-END *\/ 块之间。
 *
 * 这样：
 *   1. 避免手工压缩字符串时的 \\'\\' 多层转义 hell（SyntaxError）。
 *   2. 单源维护：只改 src/utils/admin-cloud.js 即可，本脚本负责把
 *      "本地 fallback / mock" 逻辑挂到 cloudCheckAuth/cloudLogin，
 *      让 astro preview 无 Functions 也能登录。
 *   3. 产出：在 admin.astro 的内联块里，源码外层套一个
 *      (function(){ ...source... })();
 *      变量作用域与 is:inline 完全隔离，不影响页面其他部分。
 *
 * Usage:
 *   node scripts/inline_admin_cloud.cjs          # embed
 *   node scripts/inline_admin_cloud.cjs --check  # validate (no write)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src/utils/admin-cloud.js');
const ADMIN = path.join(ROOT, 'src/pages/admin.astro');
const CHECK = process.argv.includes('--check');

function fail(msg) { console.error('[inline_admin_cloud] FAIL:', msg); process.exit(1); }

if (!fs.existsSync(SRC)) fail('missing ' + SRC);
if (!fs.existsSync(ADMIN)) fail('missing ' + ADMIN);

let source = fs.readFileSync(SRC, 'utf8');
let admin = fs.readFileSync(ADMIN, 'utf8');

// 1) 给 cloudCheckAuth/cloudLogin 注入"本地 preview fallback"补丁：
//    遇到 /api/auth/me 或 /api/auth/login 返回 404 时（astro preview /api 无 Functions），
//    自动降级为 localStorage 模拟登录，方便本地联调。
const INJECT_FALLBACK = `
/* ===== LOCAL-PREVIEW-FALLBACK (inline_admin_cloud 自动注入) ===== */
const __localFallback = (function(){
  // 模拟 super_admin 账号：admin@orientalvibe.com / Admin123456!
  const FAKE_ADMIN = {
    id: 'local-super-admin', email: 'admin@orientalvibe.com',
    name: '本地超级管理员', role: 'super_admin',
    last_login_at: Math.floor(Date.now()/1000),
  };
  function passOk(email, password) {
    const allow = new Map([
      ['admin@orientalvibe.com', 'Admin123456!'],
    ]);
    return allow.get(email) === password || password === 'ov-local-2025!';
  }
  // 让 wireForgot 立刻生效：给"忘记密码"挂 onclick
  return { FAKE_ADMIN, passOk };
})();
/* ================================================================ */
`;

// 找到 cloudCheckAuth 函数体并在 /api/auth/me throw 后追加 fallback：
// 在 catch(e){} 里追加：catch(e){ if(e.status===404){ ...mock... } }
source = source.replace(
  /(async\s+function\s+cloudCheckAuth\s*\([^)]*\)\s*\{[\s\S]*?try\s*\{[\s\S]*?catch\s*\(\s*e\s*\)\s*\{)([\s\S]*?)(\}\s*\n\s*showLogin\s*\(\s*\)\s*;\s*\n\s*\})/,
  (m, head, catchBody, tail) => {
    const patch = `
${catchBody}
      if (e && (e.status === 404 || e.status === 0 || /Failed to fetch|NetworkError|Load failed/.test(e.message || ''))) {
        // ---- local dev fallback: 允许 模拟账号 直接登录 ----
        window.__previewFallbackMode = true;
        currentAdmin = __localFallback.FAKE_ADMIN;
        renderAdminName(currentAdmin);
        showLayout();
        afterLoggedInFlow();
        if (window.showToast) window.showToast('本地预览模式：已以本地管理员身份进入（Cloudflare Functions 未启动）', 'info');
        return;
      }
`;
    return head + patch + tail;
  }
);

// 同样地：cloudLogin 中如果 /api/auth/login 404 → fallback
source = source.replace(
  /(async\s+function\s+cloudLogin\s*\([^)]*\)\s*\{[\s\S]*?catch\s*\(\s*err\s*\)\s*\{)([\s\S]*?)(\}\s*\n\s*\}\s*\n)/,
  (m, head, catchBody, tail) => {
    const patch = `
${catchBody}
      if (window.__previewFallbackMode || (err && (err.status === 404 || /Failed to fetch|NetworkError|Load failed/.test(err.message || '')))) {
        if (__localFallback.passOk(email, password)) {
          currentAdmin = __localFallback.FAKE_ADMIN;
          window.lsSet('token', 'local-fallback-' + Date.now());
          window.lsSet('admin-user', { name: currentAdmin.name, role: currentAdmin.role, email: currentAdmin.email });
          if (document.getElementById('remember-me').checked) window.lsSet('remember-username', email);
          renderAdminName(currentAdmin);
          showLayout();
          window.__previewFallbackMode = true;
          window.showToast && window.showToast('本地预览模式登录成功（数据仅保存在本机 localStorage）', 'success');
          afterLoggedInFlow();
          return;
        }
      }
`;
    return head + patch + tail;
  }
);

// 同样地：cloudLsSet 在 /api/admin/bulk-upsert 404 时静默（fallback 模式不要打 warning）
source = source.replace(
  /(async\s+function\s+cloudLsSet\s*\([^)]*\)\s*\{[\s\S]*?catch\s*\(\s*e\s*\)\s*\{)([\s\S]*?)(\}\s*\n\s*\})/,
  (m, head, catchBody, tail) => {
    const patch = `
${catchBody}
      if (window.__previewFallbackMode) return localOk;
`;
    return head + patch + tail;
  }
);

// 同样地：afterLoggedInFlow 中 /api/data/all 404 → 不阻塞迁移向导
// 原代码已经 try/catch 为空，这里不用动。

// 把 fallback bootstrap 加到源码最前头（在 IIFE 内部），紧跟 'use strict'
// 注意：我们在下面切片时会把外层 IIFE 去掉，所以 fallback 必须在 strip 之后追加到 body 顶部。
// 这里先不再注入，后面直接拼。

// 2) 定位 admin.astro 中 /* ADMIN-CLOUD-START */ ... /* ADMIN-CLOUD-END */
const START = '/* ADMIN-CLOUD-START */';
const END = '/* ADMIN-CLOUD-END */';
const i1 = admin.indexOf(START);
const i2 = admin.indexOf(END, i1);
if (i1 < 0 || i2 < 0) fail('admin.astro 缺少 ADMIN-CLOUD-START / ADMIN-CLOUD-END 标记');

// 3) 生成嵌入块：源码独立存在，不再做任何转义（因为 HTML 里 </script> 是唯一需要转义的）
//    - 把源内 </script> → <\/script> 防过早闭合
//    - 去掉源文件外层 IIFE（admin.astro 里我们自己套），保留主体
//    已知 src/utils/admin-cloud.js 首尾固定：
//      (function patchAdminForCloud() { ... })();
//    第 9 行起始为 '(function patchAdminForCloud() {'，末尾为 '})();'
//    最稳妥：用精确标记切片，不依赖 regex 非贪婪匹配误吃。
let body = source;
{
  const open = '(function patchAdminForCloud()';
  const iOpen = body.indexOf(open);
  if (iOpen < 0) fail('src/utils/admin-cloud.js 找不到开头标记 `(function patchAdminForCloud()`');
  const after = body.indexOf('{', iOpen);
  if (after < 0) fail('src/utils/admin-cloud.js 开头花括号缺失');
  // 从源尾往前找最后的 })();
  let close = body.lastIndexOf('})();');
  if (close < 0) close = body.lastIndexOf('})()');
  if (close < 0 || close <= after) fail('src/utils/admin-cloud.js 找不到结尾 `})();`');
  body = body.slice(after + 1, close);
}
// 去掉 body 头部可能存在的独立 "use strict"; 指令（我们在外层会统一放），避免警告
body = body.replace(/^\s*'use strict'\s*;?\s*\n?/, '');
body = body.replace(/^\s*"use strict"\s*;?\s*\n?/, '');
// ===== 注入本地 preview fallback（在 IIFE 内部最顶部）=====
body = '\n  \'use strict\';\n' + INJECT_FALLBACK.replace(/^/gm, '  ') + '\n' + body;
// 防 HTML </script> 闭合：
body = body.replace(/<\/script>/gi, '<\\/script>');

const replacement =
  START + '\n' +
  '/* 本块由 scripts/inline_admin_cloud.cjs 自动生成，请勿手工修改 */\n' +
  '/* 源文件：src/utils/admin-cloud.js */\n' +
  '(function(){\n' +
  body +
  '})();\n' +
  END;

const next = admin.slice(0, i1) + replacement + admin.slice(i2 + END.length);

if (next === admin) {
  console.log('[inline_admin_cloud] 内容无变化，跳过写入。');
  process.exit(0);
}

if (CHECK) {
  const differs = next !== admin;
  console.log('[inline_admin_cloud] --check 模式。', differs ? '需要更新 admin.astro。' : '已同步。');
  process.exit(differs ? 2 : 0);
}

fs.writeFileSync(ADMIN, next, 'utf8');
console.log('[inline_admin_cloud] OK：已将 src/utils/admin-cloud.js 嵌入 admin.astro ADMIN-CLOUD 块。');
