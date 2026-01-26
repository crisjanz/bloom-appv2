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
export async function getRelatedProducts(productId, categoryIds, limit = 4) {
  const allProducts = await getProducts();
  const resolvedCategoryIds = Array.isArray(categoryIds)
    ? categoryIds
    : categoryIds
      ? [categoryIds]
      : [];

  if (resolvedCategoryIds.length === 0) {
    return [];
  }

  return allProducts
    .filter((product) => {
      if (product.id === productId) return false;
      if (!product.isActive || product.visibility === 'POS_ONLY') return false;

      const productCategoryIds =
        Array.isArray(product.categoryIds) && product.categoryIds.length > 0
          ? product.categoryIds
          : product.categoryId
            ? [product.categoryId]
            : product.category?.id
              ? [product.category.id]
              : [];

      return resolvedCategoryIds.some((categoryId) =>
        productCategoryIds.includes(categoryId)
      );
    })
    .slice(0, limit);
}
