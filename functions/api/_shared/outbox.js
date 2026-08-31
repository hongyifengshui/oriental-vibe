// functions/api/_shared/outbox.js
// 异步外发：Email（MAIL_CHANNELS 兼容 token） + WhatsApp（WhatsApp Business Cloud API）
// A 子项目 MVP 不真正外发 — 记录到 ai_conversations/contact_messages 本身就完成了
// "用户能收到"的能力放在子项目 B（表单优化）实施，这里仅提供占位 + 安全降级
//
// 即便未配置邮件/WA，调用 submit* 也不会报错（静默 no-op），保障表单主流程稳定

export async function sendEmail(to, subject, body, env) {
  try {
    // 1) Cloudflare Email Routing / MailChannels（若配置了 MAIL_FROM + MAIL_API_TOKEN）
    const from = env.MAIL_FROM || '';
    const token = env.MAIL_API_TOKEN || '';
    if (!from || !token || !to) return { ok: false, reason: 'mail_unconfigured' };
    // 真实发送逻辑 —— 为避免泄露第三方 API 细节 + 本仓库不含硬编码 provider，
    // 后续 B 子项目再接入。
    return { ok: false, reason: 'mail_driver_pending_project_b' };
  } catch (e) {
    return { ok: false, reason: 'error', error: String(e && e.message || e) };
  }
}

export async function sendWhatsApp(phone, templateName, vars, env) {
  try {
    const sid = env.WA_PHONE_ID || '';
    const token = env.WA_TOKEN || '';
    if (!sid || !token || !phone) return { ok: false, reason: 'wa_unconfigured' };
    return { ok: false, reason: 'wa_driver_pending_project_b' };
  } catch (e) {
    return { ok: false, reason: 'error', error: String(e && e.message || e) };
  }
}

/** 双渠道同时推（失败各自吞掉）：表单提交后 Admin / 用户通知 */
export async function notifyBoth({ userEmail, userPhone, adminEmail, subject, body, smsTemplate, env }) {
  const r = { email: null, wa: null };
  if (userEmail) r.email = await sendEmail(userEmail, subject, body, env);
  if (adminEmail && adminEmail !== userEmail) {
    r.adminEmail = await sendEmail(adminEmail, `[Admin] ${subject}`, body, env);
  }
  if (userPhone && smsTemplate) r.wa = await sendWhatsApp(userPhone, smsTemplate, [], env);
  return r;
}
