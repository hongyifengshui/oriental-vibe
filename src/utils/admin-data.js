/**
 * Shared data layer — reads admin data from localStorage.
 * Frontend pages use this to display admin-managed content.
 * Falls back to default static data when admin has no data.
 */

const ADMIN_PREFIX = 'ov-admin-';

function getAdminData(key) {
  try {
    return JSON.parse(localStorage.getItem(ADMIN_PREFIX + key));
  } catch { return null; }
}

// Get admin products, mapped to frontend format
export function getProducts(defaultProducts) {
  const adminProducts = getAdminData('products');
  if (!adminProducts || adminProducts.length === 0) return defaultProducts;

  return adminProducts
    .filter(p => p.status !== 'inactive')
    .map(p => ({
      id: p.id,
      nameKey: null,
      nameEn: p.name,
      category: p.category,
      price: p.price,
      rating: p.rating || 4,
      image: p.image || `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(p.name + ' minimalist product photo')}&image_size=square`,
      descKey: null,
      descEn: p.description || ''
    }));
}

// Get admin site settings
export function getSiteSettings() {
  return getAdminData('settings') || {};
}

// Get admin content pages
export function getContent(pageId) {
  const content = getAdminData('content');
  if (!content || !content[pageId]) return null;
  return content[pageId];
}

// Check if admin has any data (for switching between admin/frontend mode)
export function hasAdminData() {
  const products = getAdminData('products');
  return products && products.length > 0;
}