# 子项目 A — 后端持久层 + 管理员账号 设计文档
- **子项目代号**：A（P0）
- **创建日期**：2026-09-01
- **交付物**：Cloudflare D1 数据库 + Admin 登录体系（多账号/权限/忘记密码/清缓存不丢数据）
- **依赖**：无（B/C/E 子项目的前置基建）

---

## 1. 问题陈述（为什么要做）

当前全站**所有业务数据都存在访客/管理员自己浏览器的 `localStorage`**，有 4 个致命缺陷：

1. **数据即毁**：清浏览器缓存 / 换电脑 / 换浏览器 → 所有订单 / 用户 / 商品配置 100% 丢失，不可恢复。
2. **单人孤岛**：运营 + 客服 + 徐伟老师三端各自独立，运营在 Admin 改的商品，客服后台看不到；客服录的订单，徐伟老师端也看不到。
3. **无法验证身份**：admin 登录用 `localStorage.ov-admin-user` 存用户名，无密码校验，任何访客直接手动 `localStorage.setItem` 即可伪造管理员。
4. **无"忘记密码"路径**：忘记密码链接是 `href="#" onclick="return false;"`（死链接）。

**验收标准（Go / No-Go）**：
- [ ] 换 3 台不同电脑 / 浏览器登录 Admin，订单 / 用户 / 商品 / 设置全部一致
- [ ] 未登录访问 `/admin` 自动跳登录页，错误密码无法进入
- [ ] 管理员可"重置"子账号密码
- [ ] localStorage 被手动清空后，刷新页面数据从云端自动拉回（不丢任何数据）

---

## 2. 技术选型（三方案对比）

| 维度 | 方案 1 Cloudflare D1 + Drizzle（**推荐**） | 方案 2 Supabase Postgres | 方案 3 Cloudflare KV |
|---|---|---|---|
| 成本 | 免费（D1 500MB + 25M 读/5M 写/天） | 免费层 500MB，超了 $25/月 | 免费（1GB + 100K 读/天） |
| 部署一体化 | ✅ 和 Pages Function 同项目，`functions/api/_shared/db.js` 直接 import D1 binding | ❌ 需注册新账号 + 项目 + 配 RLS / Environment Varaibles | ✅ 同账号 |
| SQL 查询能力 | ✅ SQLite 几乎全支持，JOIN / WHERE / ORDER BY / LIMIT 都 OK | ✅ Postgres 最强 | ❌ KV 是 KV，查询靠 list() + filter，无排序性能 |
| 订单按时间范围筛选、Join 商品算 GMV | ✅ 原生 SQL | ✅ 原生 SQL | ⚠️ 慢，要遍历 keys |
| 迁移 / Seed 工具 | D1 Migrations + Drizzle Kit | Supabase CLI | 无迁移概念 |
| 学习曲线 | 低（SQLite 通用知识） | 中（RLS/Policy） | 低 |
| 未来迁无头 Shopify 兼容 | ✅ D1 可同步商品到 Shopify via Function | ✅ 直接用 Postgres | ⚠️ 需写转换脚本 |

**选定方案 1**：Cloudflare D1（SQLite）+ Drizzle ORM。零额外账号、免费额度足够跑到月销 $50k。

---

## 3. 架构总览

```
┌──────── 访客浏览器 ────────┐      ┌──────── Cloudflare 边缘 ──────────┐
│                            │      │                                   │
│  Astro 静态页面            │──────┼──▶ Pages CDN（已在生产）           │
│   ├ Contact Form           │ POST │                                   │
│   ├ Booking Form           │──────┼──▶ /api/form/* 系列 Function      │──┐
│   ├ Membership Form        │      │                                   │  │
│   ├ Element-Test Pay       │──────┼──▶ /api/payment/stripe-checkout   │  │
│   └ CartDrawer Checkout    │      │                                   │  │
│                            │      │                                   │  │
│  Cache Layer               │      │                                   │  │
│   └ localStorage.ov-cache  │◀─────┼── 读请求 /api/db/* → 缓存 60s ◀───┘  │
└────────────────────────────┘      │                                   │
                                    │  Drizzle ORM ─ D1 Binding          │
                                    │   ├ users            （客户/访客）  │
                                    │   ├ admins           （后台账号）   │
                                    │   ├ products         （商品）       │
                                    │   ├ orders + items   （订单+明细） │
                                    │   ├ consultations    （预约）       │
                                    │   ├ contact_messages （联系表单）   │
                                    │   ├ memberships      （会员）       │
                                    │   ├ test_payments    （测评付款）   │
                                    │   ├ ai_conversations （AI 对话）    │
                                    │   └ settings         （全局设置）   │
                                    └───────────────────────────────────┘
Admin 登录体系：
  POST /api/admin/login → 查 D1 admins 表 → bcrypt 校验密码 → Set-Cookie: ov_session=signed:...
  所有 /api/admin/* 路由读取 signed cookie → 校验 role (super_admin / ops / support)
```

### 3.1 双层读写策略（防止 localStorage 回归）

**D1 是唯一权威源（Source of Truth）**。localStorage 退化为只读缓存层：

| 动作 | 路径 | 写 D1？ | 写 localStorage？ |
|---|---|---|---|
| Admin 点「保存商品」 | `lsSet(PRODUCTS)` → 捕获后 `POST /api/admin/upsert/products` | ✅ 先写 D1 | ✅ 写 D1 成功后再回写（乐观缓存） |
| 前端页面加载 | `/api/db/products?cacheBust=xx` | ❌ 读 | ✅ 成功则写缓存 60s |
| localStorage 为空 / 过期 | 自动从 D1 回补 | ❌ | ✅ |

**迁移兼容**：现存（用户已积累的）localStorage 数据，在 Admin 首次登录新版本时弹出一个"同步到云端"提示，一键把现有商品/订单/设置推到 D1。

---

## 4. 数据表设计（10 张表）

> 所有表均带 `created_at` / `updated_at` / `deleted_at`（软删除）。

### 4.1 `admins`（后台账号表）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK | 自增 ID |
| email | TEXT UNIQUE | 登录邮箱（唯一） |
| password_hash | TEXT | bcrypt(密码)，长度 >=60 |
| role | TEXT ENUM | `super_admin`（唯一超级管理员=徐伟本人，可重置密码）/ `ops`（运营，可改商品/订单/设置）/ `support`（客服，只读订单 + 可留言） |
| name | TEXT | 真实姓名（打标签用） |
| last_login_at | TIMESTAMP | 最后登录时间 |
| reset_token | TEXT NULL | 忘记密码单次 token（sha256 hex + 1h 过期） |
| reset_expires_at | TIMESTAMP NULL |  |

### 4.2 `users`（C 端客户表）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| email | TEXT UNIQUE | 邮箱（来自 Contact/Booking/Membership/Test-Pay 任意表单首次提交） |
| name | TEXT | 姓名 |
| phone | TEXT NULL | 电话 |
| source | TEXT | 首单来源：`contact` / `booking` / `membership` / `cart` / `test_pay` / `ai` |
| element_result | TEXT NULL | 五元素测评结果（金/木/水/火/土），若测过则保留 |
| membership_tier | TEXT ENUM NULL | `starter` / `harmony` / `premium` 或 NULL（非会员） |
| membership_expires_at | TIMESTAMP NULL | 会员到期时间（付款后 +1 年） |
| notes | TEXT NULL | Admin 可写的内部备注（例如"2026 春上门过"） |

### 4.3 `products`（商品表 — 兼容现有 ov-admin-products 结构）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK | 与前端 `data-product-id` 对齐 |
| slug | TEXT UNIQUE | URL 友好标识 |
| status | TEXT ENUM | `active` / `inactive` / `draft`（下掉不上架） |
| category_id | INTEGER FK NULL | 外键 categories 表 |
| title_en / title_zh / title_es / title_fr / title_de | TEXT | 5 语言标题（前端之前用 i18n key 的方式保留渲染，但数据层存直值便于 Stripe/后台检索） |
| price_usd | NUMERIC(10,2) | USD 标价（2 位小数，与 data-price-usd 一致） |
| original_price_usd | NUMERIC(10,2) NULL | 划线原价（做折扣） |
| images_json | TEXT JSON | `[{src, alt}]` |
| desc_en/desc_zh/..._de | TEXT NULL | 长描述 |
| stock | INTEGER DEFAULT 0 | 库存（0 = 不追踪，服务类/课程类） |
| sort_order | INTEGER DEFAULT 0 | 展示排序 |
| is_bundle | BOOLEAN DEFAULT false | 是否套餐（影响详情页显示） |
| sourcing_url | TEXT NULL | 1688 拿货链接（Admin 内部可见） |

### 4.4 `categories`（商品分类表）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| name_en/name_zh/... | TEXT | 5 语言名 |
| sort_order | INTEGER |  |

### 4.5 `orders` + `order_items`（订单 + 明细）
**orders**：
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| order_no | TEXT UNIQUE | `OV-20260901-XXXXX` 人可读号 |
| user_id | INTEGER FK | 客户 id（若能匹配到邮箱） |
| status | TEXT ENUM | `pending`（未付） / `paid`（已付） / `shipped`（已发货） / `completed`（完成） / `cancelled`（取消） / `refunded`（已退款） |
| total_usd | NUMERIC(12,2) | 订单总额 USD |
| source | TEXT ENUM | `cart` / `booking` / `membership` / `test_pay` / `manual` |
| payment_method | TEXT | `stripe` / `paypal` / `bank_transfer` / `wa_cod` / `cash` |
| stripe_payment_intent_id | TEXT NULL | Stripe 对账用 |
| paypal_order_id | TEXT NULL | PayPal 对账用 |
| shipping_name / phone / address / city / state / zip / country | TEXT NULL | 收件人（实物商品必填） |
| notes | TEXT NULL | 客户备注 |
| internal_notes | TEXT NULL | Admin 内部备注 |
| placed_at / paid_at / shipped_at / completed_at | TIMESTAMP NULL | 各状态转换时间戳 |

**order_items**：
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| order_id | INTEGER FK |  |
| product_id | INTEGER FK NULL | NULL 代表一次性费用（如运费、手工折扣调整） |
| snapshot_name | TEXT | 下单当时商品名快照（后续商品改名不影响历史） |
| snapshot_price_usd | NUMERIC(10,2) | 下单当时单价 |
| qty | INTEGER | 数量 |

### 4.6 `consultations`（预约表 — 对应 Booking Form / 咨询套餐支付）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| booking_no | TEXT UNIQUE | `BK-YYYY-XXXXX`（与现有 localStorage 生成格式兼容） |
| user_id | INTEGER FK |  |
| service_id | INTEGER FK | 对应 services 表 id |
| service_snapshot_name | TEXT | 服务名快照 |
| preferred_date | DATE NULL | 期望日期 |
| type | TEXT ENUM | `virtual`（Zoom） / `inperson`（线下） |
| status | TEXT ENUM | `new` → `confirmed` → `paid` → `completed` / `no_show` / `cancelled` |
| price_usd | NUMERIC(10,2) |  |
| notes | TEXT NULL | 用户填写的讨论主题备注 |
| staff_assigned_id | INTEGER FK NULL | 指派哪位 staff 跟进（默认 super_admin=徐伟） |
| actual_session_at | TIMESTAMP NULL | 实际咨询时间（Admin 填，完成后） |

### 4.7 `contact_messages`（联系表单 — Contact Page）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| user_id | INTEGER FK NULL | 若 email 匹配到已有用户则关联 |
| name | TEXT |  |
| email | TEXT |  |
| subject | TEXT |  |
| message | TEXT |  |
| source_page | TEXT DEFAULT 'contact' | 未来 AI 对话转工单也写这里 |
| status | TEXT ENUM | `new` / `replied` / `closed` / `spam` |
| assigned_to_admin_id | INTEGER FK NULL | 分配给谁跟进 |
| reply_body | TEXT NULL | 客服回复正文（Admin 里填） |
| created_at / replied_at | TIMESTAMP |  |

### 4.8 `memberships`（会员付费记录）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| user_id | INTEGER FK |  |
| tier | TEXT ENUM | `starter` / `harmony` / `premium` |
| price_usd | NUMERIC(10,2) | 实际支付价（若有促销折扣则按实际） |
| status | TEXT ENUM | `pending` / `paid` / `expired` / `refunded` |
| starts_at / expires_at | TIMESTAMP | 会员期（付费后 +1 年，可累计续费延长） |
| payment_reference | TEXT NULL | Stripe/PayPal 号 |

### 4.9 `test_payments`（五行测评付费记录）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| user_id | INTEGER FK NULL |  |
| session_id | TEXT | 每次测评的随机会话号（用于关联结果） |
| amount_usd | NUMERIC(10,2) DEFAULT 9.99 | 固定 $9.99 |
| status | TEXT ENUM | `pending` / `paid` / `refunded` |
| element_result | TEXT NULL | 付完后保存的最终五元素结果，用于后续 CRM 营销 |
| payment_reference | TEXT NULL |  |

### 4.10 `ai_conversations`（AI 智能体对话存档 — 子项目 C 的前置表）
| 字段 | 类型 | 描述 |
|---|---|---|
| id | INTEGER PK |  |
| conversation_id | TEXT UNIQUE | AI 前端生成的 uuid，每条对话一个 |
| user_id | INTEGER FK NULL | 若访客在对话中填了邮箱则绑定 |
| lead_name | TEXT NULL | AI 前置表单采集到的姓名 |
| lead_email | TEXT NULL | AI 前置表单采集到的邮箱 |
| interest_tag | TEXT NULL | AI 前置表单：`product` / `consultation` / `course` / `membership` / `general` |
| messages_json | TEXT JSON | `[{role:"user"|"assistant", content, ts}]` |
| engine_used | TEXT | `gpt-4o-mini`（云端） / `local-rule`（兜底） |
| detected_intent | TEXT NULL | AI 识别的最终意图标签（用于 CTA 推送） |
| cta_clicked | TEXT NULL | 访客点了哪个 CTA（`wa` / `book` / `shop_url` / `none`） |
| created_at / last_message_at | TIMESTAMP |  |
| archived | BOOLEAN DEFAULT false | Admin 看完后归档 |

### 4.11 `settings`（全局设置 — 对应 ov-admin-settings）
kv 结构：
| key | TEXT PK |  |
|---|---|---|
| value | TEXT JSON | 任意 JSON（paymentInfo / whatsappNumber / ai prompt / 会员等级权益等） |
| updated_by_admin_id | INTEGER FK | 最后更新人 |

---

## 5. API Endpoint 设计（Functions）

### 5.1 鉴权体系（admin）
```
POST /api/admin/login                 body: {email, password} → Set-Cookie: ov_session=...
POST /api/admin/logout                → 清除 Cookie
GET  /api/admin/me                    → 返回当前登录 admin{id, name, email, role}
POST /api/admin/admins                role=super_admin only → 新建子账号
POST /api/admin/admins/:id/reset-pwd  role=super_admin only → 重置任意账号密码（输出临时密码 + 强制首次登录修改）
POST /api/admin/forgot-password       匿名可访问 → 生成 reset_token 发到邮箱（MVP：Email + WA 双推链接，链接带 token）
POST /api/admin/reset-password        匿名可访问，带 {token, newPassword} → 完成重置
```
**Cookie 签名**：Cloudflare Workers Cookie + HMAC-SHA256 用 `AUTH_SECRET`（CF Environment Variable，不能 commit 到 git），有效期 7 天。

### 5.2 公共表单 API（匿名可调用，带限流）
```
POST /api/form/contact        rate: 8/min per IP → 写 contact_messages + 推送 Email+WA
POST /api/form/booking        rate: 5/min per IP → 写 consultations + 推送 Email+WA
POST /api/form/membership     rate: 2/min per IP → 写 memberships(pending) + 重定向到 Stripe Checkout
```
限流方式：走 D1 `rate_limits` 内存表（或 CF Function 自带的 per-IP 简单计数和 `/api/chat` 一样的模式）。

### 5.3 支付 API（Stripe Checkout 托管页）
```
POST /api/payment/create-checkout   入参 {line_items:[{product_id,qty}], mode:"payment"}
                                     → stripe.checkout.sessions.create()
                                     → 写 orders(status=pending)
                                     → 返回 clientSecret 或 checkoutUrl
POST /api/payment/webhook-stripe    Stripe signature 校验 + 写 orders.status=paid
                                  + 发 WA/Email "订单已付款感谢"
```

### 5.4 通用读 API（带缓存）
```
GET  /api/db/products       ?category=&status=active   Cache-Control: s-maxage=60
GET  /api/db/services                                             （同）
GET  /api/db/categories                                           （同）
GET  /api/db/membership-levels                                    （同）
GET  /api/db/settings          keys=paymentInfo,whatsappNumber... （s-maxage=5）
```

### 5.5 Admin 写 API（需登录）
```
POST /api/admin/upsert/products    批量保存
POST /api/admin/upsert/services    批量保存
POST /api/admin/upsert/content     批量保存页面内容
POST /api/admin/upsert/settings    kv 写
POST /api/admin/orders/:id         更新状态 / 内部备注 / 物流单号
... 等其它 CRUD
```

---

## 6. 迁移策略（把现 localStorage 搬上 D1）

> 不丢失用户已积累的 Admin 数据（商品 / 订单 / 设置），不要求用户手动导出 CSV。

**首次登录 A 版新 Admin 时**：
1. 登录后读浏览器 localStorage 所有 `ov-admin-*` 键
2. 前端弹出 **"数据云端同步"** 向导：
   - 发现 X 商品 / Y 订单 / Z 设置 / W 用户
   - [开始同步] 按钮 → 调 `POST /api/admin/seed-from-local` 批量推 D1
   - 若 D1 已存在同名数据（按 id / slug），问 Admin「以本地为准 / 以云端为准 / 两边都保留」
3. 完成后显示「同步完成」，localStorage 内容保留为只读缓存（后续不允许脱机写，只写云端成功后再回写）

---

## 7. 错误处理 & 安全边界

1. **SQL 注入**：全部 Drizzle 参数化查询，不拼接字符串
2. **CSRF**：Admin 写操作带 `X-CSRF-Token` Header（从 Cookie 中签名派生）
3. **Bcrypt Cost**：12（在 CF Workers 中算 200-400ms，能接受）
4. **Rate Limit**：所有公共 `POST /api/form/*`、`/api/payment/*`、`/api/admin/login`、`/api/admin/forgot-password` 都是 5-8 次/min per IP，超限 HTTP 429
5. **Email / WA 推送失败**：不影响表单入库，D1 `outbox` 表异步重试（最多 3 次）
6. **D1 冷启动**：首个请求会慢 100ms，页面骨架提前渲染（已做到）

---

## 8. 文件清单（将被新增 / 修改）

**新增（~11 个文件）**：
```
drizzle.config.ts
src/db/schema.ts
src/db/migrate/0000_init.sql
functions/api/_shared/db.ts             # D1 binding + Drizzle instance + cache helpers
functions/api/_shared/auth.ts           # Cookie sign/verify + bcrypt
functions/api/_shared/outbox.ts         # Email + WA 异步推送（带重试）
functions/api/_shared/rate-limit.ts
functions/api/admin/login.js
functions/api/admin/logout.js
functions/api/admin/me.js
functions/api/admin/seed-from-local.js
functions/api/form/*.js                 # contact / booking / membership
functions/api/payment/create-checkout.js
functions/api/payment/webhook-stripe.js
functions/api/db/*.js                   # products / services / settings / categories
```

**修改（~5 个文件）**：
```
src/pages/admin.astro                   # 登录区改造（邮箱/密码、忘记密码、登出、D1 数据加载）
src/layouts/BaseLayout.astro            # localStorage 读 → 先调 /api/db/* 回源 失败用缓存
src/components/CartDrawer.astro         # Checkout 调 Stripe Checkout URL
src/pages/services.astro                # Booking Form 改 POST /api/form/booking
src/pages/contact.astro                 # Contact Form 改 POST /api/form/contact
src/pages/membership.astro              # Membership 改 POST /api/form/membership
src/pages/element-test.astro            # Pay $9.99 改 Stripe Checkout
```

---

## 9. 里程碑 & 验收清单

| 里程碑 | 内容 | 验收点 |
|---|---|---|
| M1 | D1 + Schema + Migrations + Local seed 工具 | 1条 CLI 命令完成本地 D1 创建 + 跑迁移；`POST /api/admin/seed-from-local` 能把 localStorage 100 条商品无损入库 |
| M2 | Admin 登录 + 多角色 + 忘记密码 | 3 个 role（super_admin/ops/support），ops 不能改 admin；忘记密码链接 1h 有效期可用 |
| M3 | 读接口 + 前端 Cache 层 | 5 个 `/api/db/*` 接口全部 200，前端页面在"删 localStorage + 强刷"后数据 100% 还原 |
| M4 | Admin 写接口 + 乐观回写缓存 | Admin 改 1 个商品，另一台电脑浏览器 5s 内同步看到 |
| M5 | 测试用例 | `清缓存 / 换电脑 / 错误密码 / 忘密码 / CSV 导出 / 订单筛选 + 排序` 全通过 |

---

## 10. 范围外（明确不做，避免 scope creep）

- ❌ 不做 Stripe Customer Portal（客户自己改订阅/退款），留子项目 F 再做
- ❌ 不做多仓储 / 多币种（已锁 USD）
- ❌ 不做 Affiliate / Referral 分销
- ❌ 不做 Admin 操作审计日志（下次 P2 子项目做）
- ❌ 不做 SMS / 短信（只 Email + WhatsApp）

---

## Spec 自审（写后立即检查）
1. **Placeholder 扫描**：无 TBD / TODO
2. **一致性**：所有金额列使用 `NUMERIC(10,2) USD`，与前面 BUG 修复（强制 USD-only）一致
3. **范围检查**：A 子项目是基建，不包含 B（表单实际逻辑）—— 边界清晰，B 子项目复用 A 的表与 APIs
4. **歧义检查**：role 权限枚举明确；Cache 策略 s-maxage 明确；迁移向导步骤明确

✅ 自审通过。
