/**
 * Localized path helpers used by pages/en/* and pages/zh/* wrappers.
 * Files named with a leading underscore are ignored by Astro's file-based router
 * (i.e. this helper itself produces no HTTP route).
 */

// Static list of all top-level Astro pages that get dual locale wrappers.
// admin.astro is intentionally excluded (single-route English backend).
export const LOCALIZED_PAGES = [
  'index',
  'about',
  'master',
  'shop',
  'services',
  'courses',
  'blog',
  'membership',
  'element-test',
  'contact',
  'faq',
  'privacy',
  'terms',
  'shipping',
];

// For /en/master or /zh/master we import the NEW component (BrandFunnel/MasterProfile).
// Everything else re-uses the existing top-level page *content* by importing it as a
// named Astro component. We keep the old top-level Astro file as a lightweight
// "redirect wrapper" so legacy URLs don't 404.
export const PATH_TITLE_MAP = {
  index: {
    en: 'Oriental Vibe | Ancient Eastern Energy for Modern Living',
    zh: '東方能量空間 ｜ 正統東方智慧，現代生活應用',
  },
  about: {
    en: 'Our Story · Oriental Vibe',
    zh: '品牌故事 ｜ 東方能量空間',
  },
  master: {
    en: 'Master Xu Wei · Lineage Holder | Oriental Vibe',
    zh: '徐偉老師 ｜ 法脈掌門人 · 東方能量空間',
  },
  shop: {
    en: 'Shop · Crystals, Decor & Energy Jewelry',
    zh: '能量商城 ｜ 水晶、擺件、能量飾品',
  },
  services: {
    en: 'Services · Master-led Consultations',
    zh: '服務 ｜ 老師一對一諮詢',
  },
  courses: {
    en: 'Courses · Yuan Li Mechanics Curriculum',
    zh: '課程 ｜ 原理力學教學體系',
  },
  blog: {
    en: 'Blog · Energy Wisdom & Case Studies',
    zh: '部落格 ｜ 能量觀念與案例',
  },
  membership: {
    en: 'Membership · Ongoing Master Support',
    zh: '會員中心 ｜ 長期跟隨老師學習',
  },
  'element-test': {
    en: 'Five Elements Test · Free Assessment',
    zh: '五行元素測試 ｜ 免費能量測評',
  },
  contact: {
    en: 'Contact · Book a Consultation',
    zh: '聯絡我們 ｜ 預約諮詢',
  },
  faq: {
    en: 'FAQ · Answers Before You Engage',
    zh: '常見問答 ｜ 開始前的所有問題',
  },
  privacy: {
    en: 'Privacy Policy · Oriental Vibe',
    zh: '隱私權政策 ｜ 東方能量空間',
  },
  terms: {
    en: 'Terms of Service · Oriental Vibe',
    zh: '服務條款 ｜ 東方能量空間',
  },
  shipping: {
    en: 'Shipping & Returns · Oriental Vibe',
    zh: '運送與退貨 ｜ 東方能量空間',
  },
};
