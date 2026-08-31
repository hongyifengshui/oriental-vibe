// Drizzle schema — Cloudflare D1 (SQLite)
// 10 张表：admins / users / categories / products / orders / order_items /
//          consultations / contact_messages / memberships / ai_conversations /
//          settings（kv）
// 注：test_payments 合并入 orders（source=test_pay）以减少表数

import {
  sqliteTable,
  text,
  integer,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ---------- helpers ----------
const ts = (col: string) => integer(col, { mode: 'timestamp' });
const bool = (col: string, def = 0) => integer(col, { mode: 'boolean' }).default(Boolean(def));

// ---------- 1. admins ----------
export const admins = sqliteTable(
  'admins',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(), // bcrypt 60 chars
    role: text('role').notNull().default('ops'), // super_admin | ops | support
    name: text('name').notNull().default(''),
    lastLoginAt: ts('last_login_at'),
    resetToken: text('reset_token'),
    resetExpiresAt: ts('reset_expires_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqEmail: uniqueIndex('admins_email_unique').on(t.email),
    idxRole: index('admins_role_idx').on(t.role),
  })
);

// ---------- 2. users ----------
export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    name: text('name').notNull().default(''),
    phone: text('phone'),
    source: text('source').notNull().default('general'), // contact|booking|membership|cart|test_pay|ai|general
    elementResult: text('element_result'), // 金/木/水/火/土
    membershipTier: text('membership_tier'), // starter | harmony | premium
    membershipExpiresAt: ts('membership_expires_at'),
    notes: text('notes'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqEmail: uniqueIndex('users_email_unique').on(t.email),
    idxTier: index('users_tier_idx').on(t.membershipTier),
  })
);

// ---------- 3. categories ----------
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nameEn: text('name_en').notNull().default(''),
  nameZh: text('name_zh').notNull().default(''),
  nameEs: text('name_es').notNull().default(''),
  nameFr: text('name_fr').notNull().default(''),
  nameDe: text('name_de').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});

// ---------- 4. products ----------
export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    slug: text('slug').notNull(),
    status: text('status').notNull().default('active'), // active | inactive | draft
    categoryId: integer('category_id'),
    titleEn: text('title_en').notNull().default(''),
    titleZh: text('title_zh').notNull().default(''),
    titleEs: text('title_es').notNull().default(''),
    titleFr: text('title_fr').notNull().default(''),
    titleDe: text('title_de').notNull().default(''),
    priceUsd: real('price_usd').notNull().default(0),
    originalPriceUsd: real('original_price_usd'),
    imagesJson: text('images_json').notNull().default('[]'), // JSON [{src,alt}]
    descEn: text('desc_en'),
    descZh: text('desc_zh'),
    descEs: text('desc_es'),
    descFr: text('desc_fr'),
    descDe: text('desc_de'),
    stock: integer('stock').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    isBundle: bool('is_bundle', false),
    sourcingUrl: text('sourcing_url'), // 1688 拿货链接（Admin 可见）
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqSlug: uniqueIndex('products_slug_unique').on(t.slug),
    idxCategory: index('products_category_idx').on(t.categoryId),
    idxStatus: index('products_status_idx').on(t.status),
  })
);

// ---------- 5. orders ----------
export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderNo: text('order_no').notNull(),
    userId: integer('user_id'),
    status: text('status').notNull().default('pending'),
    // pending|paid|shipped|completed|cancelled|refunded
    totalUsd: real('total_usd').notNull().default(0),
    source: text('source').notNull().default('cart'),
    // cart|booking|membership|test_pay|manual
    paymentMethod: text('payment_method').notNull().default('stripe'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    paypalOrderId: text('paypal_order_id'),
    shippingName: text('shipping_name'),
    phone: text('phone'),
    address: text('address'),
    city: text('city'),
    state: text('state'),
    zip: text('zip'),
    country: text('country'),
    notes: text('notes'),
    internalNotes: text('internal_notes'),
    placedAt: ts('placed_at'),
    paidAt: ts('paid_at'),
    shippedAt: ts('shipped_at'),
    completedAt: ts('completed_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqNo: uniqueIndex('orders_no_unique').on(t.orderNo),
    idxUser: index('orders_user_idx').on(t.userId),
    idxStatus: index('orders_status_idx').on(t.status),
    idxPlacedAt: index('orders_placed_at_idx').on(t.placedAt),
  })
);

// ---------- 6. order_items ----------
export const orderItems = sqliteTable(
  'order_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    orderId: integer('order_id').notNull(),
    productId: integer('product_id'),
    snapshotName: text('snapshot_name').notNull().default(''),
    snapshotPriceUsd: real('snapshot_price_usd').notNull().default(0),
    qty: integer('qty').notNull().default(1),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => ({
    idxOrder: index('order_items_order_idx').on(t.orderId),
  })
);

// ---------- 7. consultations (Booking Form) ----------
export const consultations = sqliteTable(
  'consultations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    bookingNo: text('booking_no').notNull(),
    userId: integer('user_id'),
    serviceId: integer('service_id'),
    serviceSnapshotName: text('service_snapshot_name').notNull().default(''),
    preferredDate: text('preferred_date'), // ISO date (YYYY-MM-DD)
    preferredTime: text('preferred_time'), // "10:00"
    timezone: text('timezone'),
    type: text('type').notNull().default('virtual'), // virtual | inperson
    status: text('status').notNull().default('new'),
    // new|confirmed|paid|completed|no_show|cancelled
    priceUsd: real('price_usd').notNull().default(0),
    notes: text('notes'),
    staffAssignedId: integer('staff_assigned_id'),
    actualSessionAt: ts('actual_session_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    uniqNo: uniqueIndex('consultations_no_unique').on(t.bookingNo),
    idxUser: index('consultations_user_idx').on(t.userId),
    idxStatus: index('consultations_status_idx').on(t.status),
  })
);

// ---------- 8. contact_messages ----------
export const contactMessages = sqliteTable(
  'contact_messages',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id'),
    name: text('name').notNull().default(''),
    email: text('email').notNull().default(''),
    phone: text('phone'),
    subject: text('subject').notNull().default(''),
    message: text('message').notNull().default(''),
    sourcePage: text('source_page').notNull().default('contact'),
    status: text('status').notNull().default('new'),
    // new|replied|closed|spam
    assignedToAdminId: integer('assigned_to_admin_id'),
    replyBody: text('reply_body'),
    createdAt: ts('created_at').notNull().defaultNow(),
    repliedAt: ts('replied_at'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    idxStatus: index('contact_status_idx').on(t.status),
    idxCreated: index('contact_created_idx').on(t.createdAt),
  })
);

// ---------- 9. memberships（付费记录） ----------
export const memberships = sqliteTable(
  'memberships',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id').notNull(),
    tier: text('tier').notNull(), // starter|harmony|premium
    priceUsd: real('price_usd').notNull().default(0),
    status: text('status').notNull().default('pending'),
    // pending|paid|expired|refunded
    startsAt: ts('starts_at'),
    expiresAt: ts('expires_at'),
    paymentReference: text('payment_reference'),
    orderId: integer('order_id'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    idxUser: index('memberships_user_idx').on(t.userId),
    idxExpires: index('memberships_expires_idx').on(t.expiresAt),
  })
);

// ---------- 10. ai_conversations ----------
export const aiConversations = sqliteTable(
  'ai_conversations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    conversationId: text('conversation_id').notNull(),
    userId: integer('user_id'),
    leadName: text('lead_name'),
    leadEmail: text('lead_email'),
    interestTag: text('interest_tag'),
    messagesJson: text('messages_json').notNull().default('[]'),
    engineUsed: text('engine_used').notNull().default('local-rule'),
    detectedIntent: text('detected_intent'),
    ctaClicked: text('cta_clicked'),
    createdAt: ts('created_at').notNull().defaultNow(),
    lastMessageAt: ts('last_message_at'),
    archived: bool('archived', false),
  },
  (t) => ({
    uniqCid: uniqueIndex('ai_conv_cid_unique').on(t.conversationId),
    idxCreated: index('ai_created_idx').on(t.createdAt),
  })
);

// ---------- 11. settings (kv table) ----------
export const settings = sqliteTable(
  'settings',
  {
    key: text('key').primaryKey(),
    value: text('value').notNull().default('{}'), // JSON string
    updatedByAdminId: integer('updated_by_admin_id'),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  }
);
