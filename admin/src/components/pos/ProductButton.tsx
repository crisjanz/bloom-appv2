// components/pos/ProductButton.tsx - Fixed size version
import React from 'react';

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
    // For products with variants, use the default variant price (stored in cents)
    if (product.variants && product.variants.length > 0) {
      const defaultVariant = product.variants.find(v => v.isDefault);
      if (defaultVariant && defaultVariant.price !== undefined) {
        return defaultVariant.price / 100;
      }
    }
    
    // For products without variants, use the base price (already in dollars)
    if (product.price !== undefined && product.price !== null) {
      return product.price;
    }
    
    return 0;
  };

  const getProductImage = () => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return product.image || null;
  };

  const price = getProductPrice();
  const imageUrl = getProductImage();

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
            <svg className="w-8 h-8 text-[#597485] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Product Info - Fixed height and centered */}
      <div className="bg-white dark:bg-boxdark h-16 flex flex-col justify-center items-center px-2">
        <div className="text-xs font-semibold text-black dark:text-white group-hover:text-[#597485] transition-colors text-center leading-tight mb-1 line-clamp-2">
          {product.name && product.name.length > 16 
            ? `${product.name.substring(0, 16)}...`
            : product.name || 'Unnamed Product'
          }
        </div>
        <div className="text-sm font-bold text-[#597485] text-center">
          ${price.toFixed(2)}
        </div>
      </div>
    </button>
  );
}