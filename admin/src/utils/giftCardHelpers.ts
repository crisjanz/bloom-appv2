// src/utils/giftCardHelpers.ts

export interface GiftCardProductInfo {
  isGiftCard: boolean;
  value?: number;
  isCustomAmount: boolean;
  minAmount?: number;
  maxAmount?: number;
}

// ✅ UPDATED: Check if a product is a gift card (works with both SKU and description)
export const isGiftCardProduct = (product: any): boolean => {
  // Check both sku (from search results) and description (from custom products)
  const sku = product?.sku;
  const description = product?.description;
  
  if (sku && sku.startsWith('GC-')) {
    return true;
  }
  
  // Check if description contains gift card patterns
  if (description) {
    const lowerDesc = description.toLowerCase();
    return lowerDesc.includes('gift card') && 
           (lowerDesc.includes('$25') || lowerDesc.includes('$50') || 
            lowerDesc.includes('$100') || lowerDesc.includes('custom'));
  }
  
  return false;
};

// ✅ UPDATED: Get gift card information from product (works with both SKU and description)
export const getGiftCardInfo = (product: any): GiftCardProductInfo => {
  if (!isGiftCardProduct(product)) {
    return { isGiftCard: false, isCustomAmount: false };
  }

  const sku = product?.sku;
  const description = product?.description?.toLowerCase() || '';

  // If we have SKU, use that (most reliable)
  if (sku) {
    switch (sku) {
      case 'GC-25':
        return {
          isGiftCard: true,
          value: 25,
          isCustomAmount: false
        };
      case 'GC-50':
        return {
          isGiftCard: true,
          value: 50,
          isCustomAmount: false
        };
      case 'GC-100':
        return {
          isGiftCard: true,
          value: 100,
          isCustomAmount: false
        };
      case 'GC-CUSTOM':
        return {
          isGiftCard: true,
          isCustomAmount: true,
          minAmount: 25,
          maxAmount: 300
        };
      default:
        return { isGiftCard: false, isCustomAmount: false };
    }
  }

  // Fall back to description parsing (when added via search)
  if (description.includes('$25')) {
    return { isGiftCard: true, value: 25, isCustomAmount: false };
  }
  if (description.includes('$50')) {
    return { isGiftCard: true, value: 50, isCustomAmount: false };
  }
  if (description.includes('$100')) {
    return { isGiftCard: true, value: 100, isCustomAmount: false };
  }
  if (description.includes('custom')) {
    return { isGiftCard: true, isCustomAmount: true, minAmount: 25, maxAmount: 300 };
  }

  return { isGiftCard: false, isCustomAmount: false };
};

// Check if an order contains any gift card products
export const orderContainsGiftCards = (orderItems: any[]): boolean => {
  return orderItems.some(item => isGiftCardProduct(item.product || item));
};

// Get all gift card items from an order
export const getGiftCardItems = (orderItems: any[]) => {
  return orderItems.filter(item => isGiftCardProduct(item.product || item));
};

// Get all non-gift card items from an order
export const getNonGiftCardItems = (orderItems: any[]) => {
  return orderItems.filter(item => !isGiftCardProduct(item.product || item));
};

// Calculate total value of gift cards in order (for fixed amounts only)
export const calculateGiftCardTotal = (orderItems: any[]): number => {
  return getGiftCardItems(orderItems).reduce((total, item) => {
    const product = item.product || item;
    const giftCardInfo = getGiftCardInfo(product);
    
    if (!giftCardInfo.isCustomAmount && giftCardInfo.value) {
      return total + (giftCardInfo.value * (parseInt(item.qty) || 1));
    }
    
    return total;
  }, 0);
};

// Validate custom gift card amount
export const validateGiftCardAmount = (amount: number): { valid: boolean; error?: string } => {
  if (amount < 25) {
    return { valid: false, error: 'Minimum gift card amount is $25' };
  }
  
  if (amount > 300) {
    return { valid: false, error: 'Maximum gift card amount is $300' };
  }
  
  if (amount % 1 !== 0 && (amount * 100) % 1 !== 0) {
    return { valid: false, error: 'Amount must be whole dollars or cents' };
  }
  
  return { valid: true };
};

// Generate a summary of gift cards for display
export const getGiftCardSummary = (orderItems: any[]) => {
  const giftCardItems = getGiftCardItems(orderItems);
  
  return giftCardItems.map((item, index) => {
    const product = item.product || item;
    const info = getGiftCardInfo(product);
    
    // Generate stable ID based on item properties, not random
    const stableId = item.id || `item-${index}-${product.sku || product.description?.slice(0, 10) || 'gc'}`;
    
    return {
      id: stableId,
      product,
      quantity: parseInt(item.qty) || 1,
      giftCardInfo: info,
      needsActivation: true,
      // For display purposes
      displayName: info.isCustomAmount ? 'Gift Card (Custom)' : `Gift Card ($${info.value})`,
      unitPrice: info.value || parseFloat(product.price) || 0
    };
  });
};

// ✅ NEW: Helper to determine if order needs gift card activation
export const orderNeedsGiftCardActivation = (orderItems: any[]): boolean => {
  return orderContainsGiftCards(orderItems);
};

// ✅ NEW: Helper to get total number of gift cards that need activation
export const getGiftCardActivationCount = (orderItems: any[]): number => {
  return getGiftCardItems(orderItems).reduce((count, item) => {
    return count + (parseInt(item.qty) || 1);
  }, 0);
};