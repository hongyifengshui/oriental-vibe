// src/utils/admin-cloud.js — 挂到 admin.astro，在 lsSet/handleLogin/checkAuth/logout/saveSettings 等函数之后执行
// 作用：
//   1) 优先走 D1 云端 API（/api/auth/*, /api/admin/*），成功再乐观回写 localStorage
//   2) 首次登录若无 D1 数据，提供"一键迁移 localStorage → D1"向导
//   3) 登录、登出、忘记密码 接入真实后端
//
// 依赖：此文件必须 is:inline 执行（因为 Astro 打包会把 import 去掉，破坏全局 patch）
// 实际上我们直接把代码注入 admin.astro 尾部（见 admin.astro 末尾 patch），这里留一个独立副本方便测试
(function patchAdminForCloud() {
  // ---- CSRF ----
  function readCookie(name) {
    const m = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[2]) : '';
  }
  function csrfHeader() {
    const t = readCookie('ov_csrf');
    return t ? { 'X-CSRF-Token': t } : {};
  }

  // ---- 包装 fetch JSON ----
  async function requestJSON(url, opts = {}) {
    const headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    if (opts.body && typeof opts.body !== 'string') {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }
    const r = await fetch(url, Object.assign({ credentials: 'same-origin' }, opts, { headers }));
    let data = {};
    try { data = await r.json(); } catch {}
    if (!r.ok) {
      const e = new Error((data && data.error) || `HTTP ${r.status}`);
      e.status = r.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  // ---- 当前状态 ----
  let currentAdmin = null;
  let migrationDone = false;

  function getAdmin() { return currentAdmin; }

  // ---- patch checkAuth ----
  // 在 admin.astro 中，checkAuth / handleLogin / logout 是用 function 声明挂到 window 上的，
  // 因此可通过 window.checkAuth = newFn 覆盖。
  const oldCheckAuth = typeof window.checkAuth === 'function' ? window.checkAuth : null;
  const oldLogin = window.handleLogin;
  const oldLogout = window.logout;
  const oldLsSet = window.lsSet;
  const oldLsGet = window.lsGet;
  const oldSaveSettings = window.saveSettings;
  const oldShowAdminProfile = window.showAdminProfile;

  async function cloudCheckAuth() {
    // URL hash 路由：#reset/<email>/<token>
    const hash = location.hash || '';
    if (/^#reset\//.test(hash)) return renderResetPasswordView(hash);

    try {
      const r = await requestJSON('/api/auth/me', { method: 'GET' });
      if (r && r.ok && r.admin) {
        currentAdmin = r.admin;
        renderAdminName(r.admin);
        showLayout();
        afterLoggedInFlow();
        return;
      }
    } catch (e) {
      // 401 不报错；其它忽略
    }
    showLogin();
  }

  function renderAdminName(a) {
    document.querySelectorAll('.admin-info .name').forEach(el => { el.textContent = a.name || a.email || 'Admin'; });
    const roleMap = { super_admin: '超级管理员', ops: '运营', support: '客服' };
    document.querySelectorAll('.admin-info .role').forEach(el => { el.textContent = roleMap[a.role] || a.role || ''; });
    document.querySelectorAll('.admin-avatar').forEach(el => {
      const ch = (a.name || a.email || 'A').trim().charAt(0).toUpperCase();
      el.textContent = ch;
    });
  }

  function showLayout() {
    const login = document.getElementById('login-page');
    const layout = document.getElementById('admin-layout');
    if (login) login.style.display = 'none';
    if (layout) layout.classList.add('show');
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
  }
  function showLogin() {
    const login = document.getElementById('login-page');
    const layout = document.getElementById('admin-layout');
    if (login) login.style.display = 'flex';
    if (layout) layout.classList.remove('show');
  }

  // ---- patch handleLogin ----
  async function cloudLogin(e) {
    if (e) e.preventDefault();
    const email = (document.getElementById('login-username').value || '').trim().toLowerCase();
    const password = (document.getElementById('login-password').value || '').toString();
    const errorEl = document.getElementById('login-error');
    errorEl && errorEl.classList.remove('show');
    if (!email || !password) {
      return showLoginError('请输入邮箱和密码');
    }
    try {
      const r = await requestJSON('/api/auth/login', { method: 'POST', body: { email, password } });
      if (!r || !r.ok) throw new Error(r && r.error || 'login failed');
      currentAdmin = r.admin;
      window.lsSet('token', 'cookie-based-' + Date.now()); // 保留旧 localStorage token，兼容旧代码分支
      window.lsSet('admin-user', { name: r.admin.name || r.admin.email, role: r.admin.role, email: r.admin.email });
      if (document.getElementById('remember-me').checked) window.lsSet('remember-username', email);
      else localStorage.removeItem('ov-admin-remember-username');
      renderAdminName(r.admin);
      showLayout();
      window.showToast && window.showToast('登录成功，欢迎回来！', 'success');
      afterLoggedInFlow();
    } catch (err) {
      showLoginError((err && err.message) || '账号或密码错误');
    }
  }
  function showLoginError(msg) {
    const el = document.getElementById('login-error');
    if (!el) return alert(msg);
    el.textContent = msg || '登录失败';
    el.classList.add('show');
    el.style.animation = 'none'; void el.offsetHeight; el.style.animation = '';
  }

  // ---- patch logout ----
  async function cloudLogout() {
    if (!confirm('确定要退出登录吗？')) return;
    try { await requestJSON('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('ov-admin-token');
    localStorage.removeItem('ov-admin-admin-user');
    currentAdmin = null;
    document.getElementById('admin-layout').classList.remove('show');
    const loginEl = document.getElementById('login-page');
    if (loginEl) loginEl.style.display = 'flex';
    const pw = document.getElementById('login-password'); if (pw) pw.value = '';
    document.getElementById('login-error')?.classList.remove('show');
    location.hash = '';
    location.reload();
  }

  // ---- 忘记密码 UI ----
  function openForgotPassword(e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const html = `
      <div class="form-group">
        <label class="form-label">管理员邮箱</label>
        <input id="fg-email" class="form-input" type="email" placeholder="name@company.com" autocomplete="email" />
        <div class="form-hint">提交后会生成一个 1 小时有效的重置链接。如果配置了 Email，我们会自动发送；否则请把下一页显示的链接手动复制给管理员。</div>
      </div>
      <div id="fg-result" style="display:none;"></div>`;
    const footer = `<button class="btn btn-outline" onclick="closeModal()">取消</button>
      <button class="btn btn-primary" onclick="submitForgotPassword()">生成重置链接</button>`;
    window.openModal && window.openModal('忘记密码', html, footer);
  }
  window.openForgotPassword = openForgotPassword;

  async function submitForgotPassword() {
    const email = document.getElementById('fg-email').value.trim();
    const out = document.getElementById('fg-result');
    out.style.display = 'block';
    out.innerHTML = '<div style="color:#8A948C;">处理中...</div>';
    try {
      const r = await requestJSON('/api/auth/forgot-password', { method: 'POST', body: { email } });
      if (r._devOnlyResetLink) {
        const u = location.origin + '/admin' + r._devOnlyResetLink;
        out.innerHTML = `<div class="badge badge-success" style="margin-bottom:10px;">重置链接已生成（请在 1 小时内使用）</div>
          <div class="form-hint">把以下链接发给该管理员：</div>
          <div style="background:#FAFAF8;border:1px solid #E8E4DE;border-radius:8px;padding:10px 14px;word-break:break-all;margin-top:8px;">
            <a href="${u}" target="_blank" rel="noopener" style="color:#BFAF96;">${u}</a>
          </div>
          <div class="form-hint" style="margin-top:10px;">生产环境下会把该链接发送到配置的 Email，不在页面显示。</div>`;
      } else {
        out.innerHTML = `<div class="badge badge-success">已发送。若该邮箱已注册，包含重置链接的邮件将在几分钟内送达。</div>`;
      }
    } catch (e) {
      out.innerHTML = `<div class="badge badge-danger">失败：${e.message || e}</div>`;
    }
  }
  window.submitForgotPassword = submitForgotPassword;

  // ---- 重置密码页 ----
  function renderResetPasswordView(hash) {
    const parts = decodeURIComponent(hash).replace(/^#reset\//, '').split('/');
    const email = parts[0] || '';
    const token = parts[1] || '';
    const loginEl = document.getElementById('login-page');
    if (loginEl) loginEl.style.display = 'flex';
    document.getElementById('admin-layout').classList.remove('show');
    // 复用 login-card
    const card = loginEl.querySelector('.login-card');
    const oldHtml = card.innerHTML;
    card.innerHTML = `
      <div class="login-logo">
        <div class="login-logo-icon">&#128274;</div>
        <h1>重置密码</h1>
        <p>请输入新密码（至少 10 位）</p>
      </div>
      <div class="login-error" id="reset-error"></div>
      <form class="login-form" onsubmit="return submitResetPassword(event)">
        <div class="form-group"><label>管理员邮箱</label><input type="email" class="form-input" id="reset-email" value="${email.replace(/"/g,'&quot;')}" autocomplete="username" /></div>
        <div class="form-group"><label>新密码</label><input type="password" class="form-input" id="reset-p1" autocomplete="new-password" /></div>
        <div class="form-group"><label>确认新密码</label><input type="password" class="form-input" id="reset-p2" autocomplete="new-password" /></div>
        <button type="submit" class="login-btn">提交新密码并登录</button>
        <div style="margin-top:14px;text-align:center;"><a href="#!" onclick="location.hash='';location.reload()" style="color:#BFAF96;font-size:13px;">← 返回登录页</a></div>
      </form>`;
    // 把原 HTML 暂存到 dataset，避免反复构造
    card._oldHtml = oldHtml;
    return false;
  }
  window.renderResetPasswordView = renderResetPasswordView;

  async function submitResetPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('reset-email').value.trim().toLowerCase();
    const p1 = document.getElementById('reset-p1').value;
    const p2 = document.getElementById('reset-p2').value;
    const errEl = document.getElementById('reset-error');
    if (p1.length < 10) return resetErr(errEl, '新密码至少 10 位');
    if (p1 !== p2) return resetErr(errEl, '两次密码不一致');
    const hash = location.hash || '';
    const token = decodeURIComponent(hash).split('/')[2] || decodeURIComponent(hash).split('/')[1] || '';
    try {
      await requestJSON('/api/auth/reset-password', { method: 'POST', body: { email, token, newPassword: p1 } });
      window.showToast && window.showToast('密码已重置，正在跳转登录页...', 'success');
      setTimeout(() => { location.hash = ''; location.reload(); }, 1200);
    } catch (err) {
      return resetErr(errEl, (err && err.message) || '重置失败');
    }
    return false;
  }
  function resetErr(el, msg) {
    if (!el) { alert(msg); return false; }
    el.textContent = msg; el.classList.add('show'); el.style.animation = 'none'; void el.offsetHeight; el.style.animation = '';
    return false;
  }
  window.submitResetPassword = submitResetPassword;

  // ---- patch lsSet 为"双写"----
  // 具体键的映射：
  //   products|categories|orders|users|content -> /api/admin/bulk-upsert
  //   settings|paymentInfo|whatsappNumber|membershipLevels|benefits|page-* -> /api/admin/bulk-upsert kv
  async function cloudLsSet(k, v) {
    // 1. 乐观本地写（确保前台同 tab 立即刷新）
    const localOk = oldLsSet ? oldLsSet(k, v) : true;
    if (!currentAdmin) return localOk; // 未登录，本地当唯一源

    // 2. 异步云端写 —— 不阻塞 UI，失败仅 toast 提示
    let body = null;
    switch (k) {
      case 'products':   body = { table: 'products', rows: Array.isArray(v) ? v : [] }; break;
      case 'categories': body = { table: 'categories', rows: Array.isArray(v) ? v : [] }; break;
      case 'orders':     body = { table: 'orders', rows: Array.isArray(v) ? v : [] }; break;
      case 'users':      body = { table: 'users', rows: Array.isArray(v) ? v : [] }; break;
      case 'settings':
      case 'paymentInfo':
      case 'whatsappNumber':
      case 'membershipLevels':
      case 'benefits':
      case 'content':
      case 'page-home':
      case 'page-about':
      case 'page-faq':
      case 'page-services':
      case 'page-blog':
      case 'page-courses':
      case 'page-membership':
      case 'page-contact':
        body = { kv: { [k]: v } }; break;
      default:
        return localOk;
    }
    try {
      const r = await requestJSON('/api/admin/bulk-upsert', { method: 'POST', body });
      if (!r || !r.ok) throw new Error((r && r.error) || 'save rejected');
      return true;
    } catch (e) {
      const msg = '云端保存失败（已保留在本机）：' + (e.message || e);
      window.showToast ? window.showToast(msg, 'warning') : console.warn(msg);
      return localOk;
    }
  }

  // ---- after login flow ----
  async function afterLoggedInFlow() {
    // 首次进入 D1 版本：拉 D1 公开快照，填 localStorage；若云端空则提示迁移
    try {
      const snap = await requestJSON('/api/data/all');
      if (snap && snap.ok) mergeCloudSnapshotToLocal(snap);
    } catch {}
    maybeOfferMigrationWizard();
  }
  function mergeCloudSnapshotToLocal(snap) {
    const write = (k, v) => { if (v != null) { localStorage.setItem('ov-admin-' + k, typeof v === 'string' ? v : JSON.stringify(v)); } };
    if (Array.isArray(snap.products) && snap.products.length) write('products', snap.products);
    if (Array.isArray(snap.categories) && snap.categories.length) write('categories', snap.categories);
    if (snap.membershipLevels) write('membershipLevels', snap.membershipLevels);
    if (snap.benefits) write('benefits', snap.benefits);
    if (snap.settings) {
      write('whatsappNumber', snap.settings.whatsappNumber);
      if (snap.settings.paymentInfo) write('paymentInfo', snap.settings.paymentInfo);
      if (snap.settings.contactInfo) write('contactInfo', snap.settings.contactInfo);
      if (snap.settings.aiConfig) write('aiConfig', snap.settings.aiConfig);
    }
    if (snap.content) {
      for (const [k, v] of Object.entries(snap.content)) write(k, v);
    }
  }
  function countLocalOvKeys() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('ov-admin-')) continue;
      try {
        const raw = localStorage.getItem(k);
        let size = '—';
        try { size = JSON.parse(raw); size = Array.isArray(size) ? size.length : (size && typeof size === 'object' ? '{...}' : '—'); } catch {}
        out[k] = size;
      } catch {}
    }
    return out;
  }
  function maybeOfferMigrationWizard() {
    if (migrationDone) return;
    const migratedFlag = localStorage.getItem('ov-admin-d1-migrated');
    if (migratedFlag) { migrationDone = true; return; }
    // 简单判断：products + orders + users 均为空则跳过
    const stats = {
      products: ((oldLsGet && oldLsGet('products')) || []).length,
      orders:   ((oldLsGet && oldLsGet('orders')) || []).length,
      users:    ((oldLsGet && oldLsGet('users')) || []).length,
      settings: (oldLsGet && oldLsGet('settings')) ? 1 : 0,
    };
    const total = stats.products + stats.orders + stats.users + stats.settings;
    if (total === 0) { migrationDone = true; localStorage.setItem('ov-admin-d1-migrated', '1'); return; }
    // 弹迁移向导
    showMigrationWizard(stats);
  }
  function showMigrationWizard(stats) {
    const body = `
      <div style="margin-bottom:16px;">
        <div style="font-size:15px;font-weight:600;color:#3A403D;margin-bottom:6px;">&#9889; 升级到云端持久化数据库</div>
        <div style="font-size:13px;color:#6B726F;line-height:1.6;">新版本管理后台现在支持"多人多设备登录 + 清缓存不丢数据"。
        检测到本机已有历史数据，是否一次性同步到云端？</div>
      </div>
      <div style="background:#FAFAF8;border:1px solid #E8E4DE;border-radius:10px;padding:14px;margin-bottom:16px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px;">
          <div>商品：<b>${stats.products || 0}</b> 条</div>
          <div>订单：<b>${stats.orders || 0}</b> 条</div>
          <div>用户：<b>${stats.users || 0}</b> 条</div>
          <div>设置/内容：已检测</div>
        </div>
      </div>
      <div id="mw-progress" style="display:none;margin-bottom:12px;">
        <div style="background:#FAFAF8;border:1px solid #E8E4DE;border-radius:8px;padding:10px 14px;font-size:13px;color:#6B726F;" id="mw-progress-text">准备同步...</div>
      </div>
      <div class="form-hint" style="color:#8A948C;">冲突策略：以 slug / email / order_no 为唯一键 —— 云端已有则保留云端版本（以避免覆盖团队新编辑的内容）。本机独有的数据会追加进去。</div>`;
    const footer = `<button class="btn btn-outline" onclick="closeModal();localStorage.setItem('ov-admin-d1-migrated','1');">暂不</button>
      <button class="btn btn-primary" onclick="runLocalSeed()">&#9889; 开始同步到云端</button>`;
    window.openModal && window.openModal('数据云端同步向导', body, footer);
  }
  window.showMigrationWizard = showMigrationWizard;
  window.runLocalSeed = async function runLocalSeed() {
    const p = document.getElementById('mw-progress'); const t = document.getElementById('mw-progress-text');
    if (p) p.style.display = 'block';
    if (t) t.textContent = '打包本机 ov-admin-* 数据并上送...';
    const body = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith('ov-admin-')) continue;
      const raw = localStorage.getItem(k);
      try { body[k] = JSON.parse(raw); } catch { body[k] = raw; }
    }
    try {
      const r = await requestJSON('/api/admin/seed-from-local', { method: 'POST', body });
      if (!r || !r.ok) throw new Error((r && r.error) || 'seed rejected');
      const m = r.migrated || {};
      if (t) t.innerHTML = `
        <div style="font-weight:600;color:#5a7a5a;">同步完成 ✓</div>
        <div style="margin-top:6px;font-size:12px;color:#6B726F;">
          商品 ${m.products} / 分类 ${m.categories} / 订单 ${m.orders} / 用户 ${m.users} / 设置 ${m.kv} KV
        </div>
        <div style="margin-top:8px;font-size:12px;color:#8A948C;">本机 localStorage 已保留为只读缓存；后续编辑优先写入云端。<br>你可以清理浏览器缓存而不丢失数据。</div>`;
      migrationDone = true;
      localStorage.setItem('ov-admin-d1-migrated', '1');
      const footer = document.getElementById('modal-footer');
      if (footer) footer.innerHTML = `<button class="btn btn-primary" onclick="closeModal();location.reload();">完成并刷新</button>`;
    } catch (e) {
      if (t) t.innerHTML = `<div style="color:#C47B6B;">失败：${e.message || e}</div><div style="font-size:12px;color:#8A948C;margin-top:4px;">本机数据不受影响，稍后可在仪表盘顶部重新启动此向导。</div>`;
    }
  };

  // ---- 顶部仪表盘"重新同步"按钮入口 ----
  function pinMigrationEntry() {
    const tb = document.getElementById('page-header-actions')
      || document.querySelector('#page-dashboard .page-header-actions');
    if (!tb) return;
    if (document.getElementById('btn-d1-resync')) return;
    const b = document.createElement('button');
    b.id = 'btn-d1-resync';
    b.className = 'btn btn-outline';
    b.innerHTML = '&#9729; D1 同步';
    b.title = '查看 / 重启 localStorage → D1 迁移向导';
    b.onclick = () => showMigrationWizard({});
    tb.insertBefore(b, tb.firstChild);
  }

  // ---- patch admin profile ----
  function cloudShowAdminProfile() {
    const a = currentAdmin || {};
    const roleMap = { super_admin: '超级管理员', ops: '运营', support: '客服' };
    const init = (a.name || a.email || 'A').charAt(0).toUpperCase();
    window.openModal && window.openModal('个人资料', `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#BFAF96,#8A948C);display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:600;margin:0 auto 14px;">${init}</div>
        <div style="font-size:16px;font-weight:600;color:#3A403D;">${escapeHtml(a.name || '未命名')}</div>
        <div style="font-size:13px;color:#8A948C;margin-top:4px;">${roleMap[a.role] || a.role || ''}</div>
      </div>
      <div class="form-group"><label class="form-label">ID</label><input class="form-input" value="${a.id || ''}" readonly /></div>
      <div class="form-group"><label class="form-label">邮箱（登录账号）</label><input class="form-input" value="${escapeHtml(a.email || '')}" readonly /></div>
      <div class="form-group"><label class="form-label">昵称</label><input class="form-input" id="admin-nickname" value="${escapeHtml(a.name || '')}" /></div>
      <div class="form-group"><label class="form-label">最后登录</label><input class="form-input" value="${a.last_login_at ? new Date(a.last_login_at*1000).toLocaleString() : '—'}" readonly /></div>
    `, `<button class="btn btn-outline" onclick="closeModal()">关闭</button><button class="btn btn-primary" onclick="saveAdminProfile()">保存</button>`);
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x])); }

  // ---- apply patches ----
  window.checkAuth = cloudCheckAuth;
  window.handleLogin = cloudLogin;
  window.logout = cloudLogout;
  if (oldLsSet) window.lsSet = cloudLsSet;
  window.saveSettings = async function cloudSaveSettings() {
    if (oldSaveSettings) oldSaveSettings(); // 触发原始 lsSet('settings', settings) + toast
    // cloudLsSet 已在 patch lsSet 时执行 upsert kv，无需重复
  };
  window.showAdminProfile = cloudShowAdminProfile;

  // ---- 在登录页把忘记密码链接改为真实调用 ----
  function wireForgot() {
    const links = document.querySelectorAll('a[href="#"]');
    links.forEach(a => {
      const txt = (a.textContent || '').trim();
      if (/忘记密码/.test(txt) && a.getAttribute('onclick') && a.getAttribute('onclick').indexOf('return false') >= 0) {
        a.onclick = openForgotPassword;
        a.removeAttribute('href');
        a.style.cursor = 'pointer';
      }
    });
    // 侧边栏退出登录：原本 logout() 已被 patch
    // 修改密码菜单：保留 showChangePassword（本地 form 足够）
  }

  // ---- Dashboard 顶部挂"重新同步"入口 ----
  const origRenderDashboard = window.renderDashboard;
  window.renderDashboard = function() {
    if (origRenderDashboard) origRenderDashboard();
    setTimeout(pinMigrationEntry, 30);
  };

  // ---- CSRF header 自动注入 ----
  // 给 window.fetch 包一层自动塞 cookie 里的 ov_csrf
  const _origFetch = window.fetch;
  window.fetch = function(url, opts = {}) {
    const u = typeof url === 'string' ? url : (url && url.url);
    if (u && /^\/api\/(admin|auth\/logout|form|payment)/.test(u) && /^(POST|PUT|PATCH|DELETE)$/.test((opts.method || 'GET').toUpperCase())) {
      opts.headers = Object.assign({}, opts.headers || {});
      const t = readCookie('ov_csrf');
      if (t && !opts.headers['X-CSRF-Token']) opts.headers['X-CSRF-Token'] = t;
      opts.credentials = opts.credentials || 'same-origin';
    }
    return _origFetch.apply(this, arguments);
  };

  wireForgot();
  try { window.__adminCloudPatched = true; } catch (e) {}

  // ---- 启动 ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      // 覆盖 admin.astro 原始 boot（先旧 checkAuth 再我们 cloud 版跑一次）
      window.checkAuth();
    });
  } else {
    window.checkAuth();
  }
})();
