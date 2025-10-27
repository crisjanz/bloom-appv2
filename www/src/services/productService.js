import api from './api';

/**
 * Fetch all products with variants and categories
 */
export async function getProducts() {
  return api.get('/products');
}

/**
 * Fetch a single product by ID
 */
export async function getProductById(id) {
  return api.get(`/products/${id}`);
}

/**
 * Search products by query string
 */
export async function searchProducts(query) {
  return api.get(`/products/search?q=${encodeURIComponent(query)}`);
}

/**
 * Get featured products (those marked as showOnHomepage)
 */
export async function getFeaturedProducts() {
  const allProducts = await getProducts();
  return allProducts.filter(product => product.showOnHomepage && product.isActive);
}

/**
 * Get related products (same category, excluding current product)
 */
export async function getRelatedProducts(productId, categoryId, limit = 4) {
  const allProducts = await getProducts();
  return allProducts
    .filter(p => p.id !== productId && p.categoryId === categoryId && p.isActive && p.visibility !== 'POS_ONLY')
    .slice(0, limit);
}
