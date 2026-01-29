// components/pos/ProductButton.tsx - Fixed size version
import React from 'react';
import { dollarsToCents, formatCurrency } from '@shared/utils/currency';

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
    images?: string[];
    category?: string;
    variants?: any[];
  };
  onClick: () => void;
};

export default function ProductButton({ product, onClick }: Props) {
  const getProductPrice = () => {
    // For products with variants, calculate final price
    if (product.variants && product.variants.length > 0) {
      // Find the default variant or use the first one
      const defaultVariant = product.variants.find(v => v.isDefault) || product.variants[0];
      const basePriceCents = dollarsToCents(product.price ?? 0);
      const priceDifferenceCents = Math.round(defaultVariant.priceDifference || 0);
      return formatCurrency(basePriceCents + priceDifferenceCents);
    }

    // For regular products, price is already in dollars
    return formatCurrency(dollarsToCents(product.price ?? 0));
  };

  const getProductImage = () => {
    if (product.image) return product.image;
    if (product.images && product.images.length > 0) return product.images[0];
    return null;
  };

  const formatProductName = (name: string, maxLength: number = 16) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 3) + '...';
  };

  const price = getProductPrice();
  const imageUrl = getProductImage();
  const displayName = formatProductName(product.name);

  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-boxdark rounded-2xl items-center shadow-md hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden group transform hover:scale-105 active:scale-95"
      style={{ 
        width: '130px',   // 1.25" at 96 DPI
        height: '168px'   // 1.75" at 96 DPI
      }}
    >
      {/* Product Image */}
      <div className="flex-1 bg-white dark:bg-boxdark flex items-center justify-center p-3 relative overflow-hidden">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={product.name || 'Product'}
            className="w-full h-full object-cover rounded-xl group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-500 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info - Fixed height and centered */}
      <div className="bg-white dark:bg-boxdark h-12 flex flex-col justify-top items-center px-2">
        <div className="text-xs font-semibold text-black dark:text-white group-hover:text-brand-500 transition-colors text-center leading-tight mb-1 line-clamp-2">
          {displayName}
        </div>
        <div className="text-sm font-bold text-brand-500 text-center">
          {price}
        </div>
      </div>
    </button>
  );
}
