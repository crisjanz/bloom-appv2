/**
 * Check if a product is out of stock.
 * A product is out of stock when ALL variants that track inventory have stockLevel <= 0.
 * Products with no inventory-tracked variants are considered in stock.
 */
export function isProductOutOfStock(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  if (variants.length === 0) return false;

  const trackedVariants = variants.filter((v) => v.trackInventory);
  if (trackedVariants.length === 0) return false;

  return trackedVariants.every((v) => (v.stockLevel ?? 0) <= 0);
}

/**
 * Check if a specific variant is out of stock.
 */
export function isVariantOutOfStock(variant) {
  if (!variant || !variant.trackInventory) return false;
  return (variant.stockLevel ?? 0) <= 0;
}
