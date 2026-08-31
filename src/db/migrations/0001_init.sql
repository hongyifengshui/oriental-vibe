-- D1 migration 0001_init — A 子项目首版 Schema（Cloudflare D1 SQLite dialect）
-- 执行方式：
--   本地开发：wrangler d1 migrations apply oriental-vibe-db --local
--   Cloudflare 生产：wrangler d1 migrations apply oriental-vibe-db --remote
-- 注意：Cloudflare Pages Function 里用 env.DB 绑定（名称必须=DB）

CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'ops',
  name TEXT NOT NULL DEFAULT '',
  last_login_at INTEGER,
  reset_token TEXT,
  reset_expires_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS admins_role_idx ON admins(role);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'general',
  element_result TEXT,
  membership_tier TEXT,
  membership_expires_at INTEGER,
  notes TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS users_tier_idx ON users(membership_tier);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_en TEXT NOT NULL DEFAULT '',
  name_zh TEXT NOT NULL DEFAULT '',
  name_es TEXT NOT NULL DEFAULT '',
  name_fr TEXT NOT NULL DEFAULT '',
  name_de TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  category_id INTEGER,
  title_en TEXT NOT NULL DEFAULT '',
  title_zh TEXT NOT NULL DEFAULT '',
  title_es TEXT NOT NULL DEFAULT '',
  title_fr TEXT NOT NULL DEFAULT '',
  title_de TEXT NOT NULL DEFAULT '',
  price_usd REAL NOT NULL DEFAULT 0,
  original_price_usd REAL,
  images_json TEXT NOT NULL DEFAULT '[]',
  desc_en TEXT,
  desc_zh TEXT,
  desc_es TEXT,
  desc_fr TEXT,
  desc_de TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_bundle INTEGER NOT NULL DEFAULT 0,
  sourcing_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category_id);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  total_usd REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'cart',
  payment_method TEXT NOT NULL DEFAULT 'stripe',
  stripe_payment_intent_id TEXT,
  paypal_order_id TEXT,
  shipping_name TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  notes TEXT,
  internal_notes TEXT,
  placed_at INTEGER,
  paid_at INTEGER,
  shipped_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status);
CREATE INDEX IF NOT EXISTS orders_placed_at_idx ON orders(placed_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER,
  snapshot_name TEXT NOT NULL DEFAULT '',
  snapshot_price_usd REAL NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items(order_id);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  booking_no TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  service_id INTEGER,
  service_snapshot_name TEXT NOT NULL DEFAULT '',
  preferred_date TEXT,
  preferred_time TEXT,
  timezone TEXT,
  type TEXT NOT NULL DEFAULT 'virtual',
  status TEXT NOT NULL DEFAULT 'new',
  price_usd REAL NOT NULL DEFAULT 0,
  notes TEXT,
  staff_assigned_id INTEGER,
  actual_session_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS consultations_user_idx ON consultations(user_id);
CREATE INDEX IF NOT EXISTS consultations_status_idx ON consultations(status);

CREATE TABLE IF NOT EXISTS contact_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  subject TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  source_page TEXT NOT NULL DEFAULT 'contact',
  status TEXT NOT NULL DEFAULT 'new',
  assigned_to_admin_id INTEGER,
  reply_body TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  replied_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS contact_status_idx ON contact_messages(status);
CREATE INDEX IF NOT EXISTS contact_created_idx ON contact_messages(created_at);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  tier TEXT NOT NULL,
  price_usd REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  starts_at INTEGER,
  expires_at INTEGER,
  payment_reference TEXT,
  order_id INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_expires_idx ON memberships(expires_at);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL UNIQUE,
  user_id INTEGER,
  lead_name TEXT,
  lead_email TEXT,
  interest_tag TEXT,
  messages_json TEXT NOT NULL DEFAULT '[]',
  engine_used TEXT NOT NULL DEFAULT 'local-rule',
  detected_intent TEXT,
  cta_clicked TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  last_message_at INTEGER,
  archived INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ai_created_idx ON ai_conversations(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  updated_by_admin_id INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

-- -------- 迁移元数据表（drizzle-kit 风格） --------
CREATE TABLE IF NOT EXISTS __drizzle_migrations (
  id TEXT PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- 登记本 migration
INSERT OR IGNORE INTO __drizzle_migrations (id, hash, created_at)
VALUES ('0001_init', '0001_init_oriental_vibe_a_mvp', strftime('%s','now'));

-- -------- 默认设置 Seed --------
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('paymentInfo', '{"stripe":true,"paypal":false,"bankTransfer":false,"waCod":false,"stripePubKey":"","bankInfo":{}}', strftime('%s','now')),
  ('whatsappNumber', '""', strftime('%s','now')),
  ('membershipLevels', '[{"tier":"starter","name":{"en":"Starter","zh":"入门","es":"Inicial","fr":"Débutant","de":"Einsteiger"},"priceUsd":49,"discountPercent":5,"benefits":{}},{"tier":"harmony","name":{"en":"Harmony","zh":"和谐","es":"Armonía","fr":"Harmonie","de":"Harmonie"},"priceUsd":199,"discountPercent":10,"benefits":{}},{"tier":"premium","name":{"en":"Premium","zh":"尊享","es":"Premium","fr":"Premium","de":"Premium"},"priceUsd":499,"discountPercent":15,"benefits":{}}]', strftime('%s','now')),
  ('benefits', '[]', strftime('%s','now')),
  ('contactInfo', '{"address":"","email":"hello@orientalvibe1314.com","phone":""}', strftime('%s','now')),
  ('aiConfig', '{"enabled":true,"engine":"auto","systemPrompt":""}', strftime('%s','now'));
