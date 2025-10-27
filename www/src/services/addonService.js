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
