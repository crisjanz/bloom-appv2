import api from './api';
import { getProducts } from './productService';

/**
 * Get add-on products (balloons, chocolates, teddy bears, etc.)
 * These are products with productType = 'ADDON'
 */
export async function getAddons(limit = 6) {
  const allProducts = await getProducts();
  return allProducts
    .filter(p => p.productType === 'ADDON' && p.isActive && p.visibility !== 'POS_ONLY')
    .slice(0, limit);
}

export async function getAddonGroupsForProduct(productId) {
  if (!productId) {
    return [];
  }

  const data = await api.get(`/addon-groups/by-product/${productId}`);
  return Array.isArray(data) ? data : [];
}
