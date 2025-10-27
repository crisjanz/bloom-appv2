import api from './api';

/**
 * Fetch all categories in tree format (hierarchical)
 */
export async function getCategoriesTree() {
  return api.get('/categories?tree=true');
}

/**
 * Fetch all categories in flat format
 */
export async function getCategories() {
  return api.get('/categories');
}

/**
 * Get products in a specific category
 */
export async function getCategoryProducts(categoryId) {
  return api.get(`/categories/${categoryId}/products`);
}
