import React from 'react';
import { ProductHelper } from '../../../domains/products/entities/Product';

type Variant = {
  id: string;
  name: string;
  price: number;
  calculatedPrice?: number;
  priceDifference?: number;
  isDefault: boolean;
};

type Product = {
  id: string;
  name: string;
  price: number;
  variants?: Variant[];
  images?: string[];
  image?: string;
};

type Props = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSelectVariant: (variant: Variant) => void;
};

export default function ProductVariantModal({ open, product, onClose, onSelectVariant }: Props) {
  if (!open || !product) return null;

  const basePrice = product.price || 0;
  
  // Get all variants including default
  const allVariants = product.variants || [];
  const defaultVariant = allVariants.find(v => v.isDefault);
  const nonDefaultVariants = allVariants.filter(v => !v.isDefault);
  
  // Create display variants with calculated prices
  const displayVariants = [];
  
  // Add default variant first if it exists
  if (defaultVariant) {
    displayVariants.push({
      ...defaultVariant,
      displayName: defaultVariant.name,
      displayPrice: basePrice,
      isDefault: true
    });
  }
  
  // Add non-default variants with calculated prices
  nonDefaultVariants.forEach(variant => {
    // calculatedPrice is already in dollars from backend, priceDifference is in cents
    const calculatedPrice = variant.calculatedPrice || (basePrice + (variant.priceDifference || 0) / 100);
    displayVariants.push({
      ...variant,
      displayName: variant.name,
      displayPrice: calculatedPrice,
      priceDifferenceInDollars: (variant.priceDifference || 0) / 100,
      isDefault: false
    } as any);
  });

  const handleVariantSelect = (variant: any) => {
    const selectedVariant = {
      ...variant,
      price: variant.displayPrice
    };
    onSelectVariant(selectedVariant);
    onClose();
  };

  const getProductImage = () => {
    if (product.image) return product.image;
    if (product.images && product.images.length > 0) return product.images[0];
    return undefined;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000]">
      <div className="bg-white dark:bg-boxdark rounded-2xl max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
                Select Variant
              </h3>
              <div className="flex items-center gap-4">
                {getProductImage() && (
                  <img 
                    src={getProductImage()} 
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                )}
                <div>
                  <p className="font-medium text-black dark:text-white">
                    {product.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose your options
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Variants List */}
        <div className="p-6 space-y-3">
          {displayVariants.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No variants available
            </div>
          ) : (
            displayVariants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => handleVariantSelect(variant)}
                className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-[#597485] hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black dark:text-white group-hover:text-[#597485]">
                        {variant.displayName}
                      </span>
                      {variant.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-[#597485] text-white rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {!variant.isDefault && (variant.priceDifferenceInDollars ?? 0) !== 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {(variant.priceDifferenceInDollars ?? 0) > 0 ? '+' : ''}${(variant.priceDifferenceInDollars ?? 0).toFixed(2)} vs base
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#597485]">
                      ${variant.displayPrice.toFixed(2)}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}