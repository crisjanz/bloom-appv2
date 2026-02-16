import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import { centsToDollars, dollarsToCents, formatCurrency, parseUserCurrency } from '@shared/utils/currency';

type Variant = {
  id: string;
  name: string;
  price?: number;
  calculatedPrice?: number;
  priceDifference?: number;
  isDefault?: boolean;
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
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, string>>({});
  const priceInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes or product changes
  useEffect(() => {
    if (!open) {
      setEditingVariantId(null);
      setPriceOverrides({});
    }
  }, [open, product?.id]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingVariantId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingVariantId]);

  if (!open || !product) return null;

  const basePriceCents = dollarsToCents(product.price || 0);
  
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
      displayPrice: centsToDollars(basePriceCents),
      displayPriceCents: basePriceCents,
      priceDifferenceCents: 0,
      isDefault: true,
    });
  }
  
  // Add non-default variants with calculated prices
  nonDefaultVariants.forEach(variant => {
    const priceDifferenceCents = Math.round(variant.priceDifference || 0);
    const calculatedPriceCents = typeof variant.calculatedPrice === 'number'
      ? dollarsToCents(variant.calculatedPrice)
      : basePriceCents + priceDifferenceCents;

    displayVariants.push({
      ...variant,
      displayName: variant.name,
      displayPrice: centsToDollars(calculatedPriceCents),
      displayPriceCents: calculatedPriceCents,
      priceDifferenceCents,
      isDefault: false,
    } as any);
  });

  const handleVariantSelect = (variant: any) => {
    const overrideStr = priceOverrides[variant.id];
    const finalPriceCents = overrideStr != null
      ? parseUserCurrency(overrideStr)
      : variant.displayPriceCents;
    const selectedVariant = {
      ...variant,
      price: centsToDollars(finalPriceCents),
      displayPriceCents: finalPriceCents,
    };
    onSelectVariant(selectedVariant);
    onClose();
  };

  const handlePriceTap = (e: React.MouseEvent, variantId: string, currentCents: number) => {
    e.stopPropagation();
    if (editingVariantId === variantId) return;
    setEditingVariantId(variantId);
    if (priceOverrides[variantId] == null) {
      setPriceOverrides(prev => ({ ...prev, [variantId]: centsToDollars(currentCents).toFixed(2) }));
    }
  };

  const handlePriceChange = (variantId: string, value: string) => {
    // Allow only numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setPriceOverrides(prev => ({ ...prev, [variantId]: cleaned }));
  };

  const handlePriceBlur = () => {
    setEditingVariantId(null);
  };

  const handlePriceKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setEditingVariantId(null);
    }
  };

  const getProductImage = () => {
    if (product.image) return product.image;
    if (product.images && product.images.length > 0) return product.images[0];
    return undefined;
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      className="max-w-md max-h-[80vh] overflow-y-auto"
    >
        
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
            displayVariants.map((variant) => {
              const currentCents = variant.displayPriceCents ?? dollarsToCents(variant.displayPrice);
              const isEditing = editingVariantId === variant.id;
              const hasOverride = priceOverrides[variant.id] != null;
              const displayCents = hasOverride ? parseUserCurrency(priceOverrides[variant.id]) : currentCents;

              return (
                <div
                  key={variant.id}
                  className="w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 text-left group flex items-center justify-between"
                >
                  {/* Name area — tapping adds to cart */}
                  <button
                    className="flex-1 text-left"
                    onClick={() => handleVariantSelect(variant)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black dark:text-white group-hover:text-brand-500">
                        {variant.displayName}
                      </span>
                      {variant.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-brand-500 text-white rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    {!variant.isDefault && (variant.priceDifferenceCents ?? 0) !== 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {(variant.priceDifferenceCents ?? 0) > 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(variant.priceDifferenceCents ?? 0))} vs base
                      </p>
                    )}
                  </button>

                  {/* Price area — tapping makes it editable */}
                  <div
                    className="text-right shrink-0 ml-4 cursor-pointer"
                    onClick={(e) => handlePriceTap(e, variant.id, currentCents)}
                  >
                    {isEditing ? (
                      <div className="flex items-center justify-end">
                        <span className="text-lg font-bold text-brand-500">$</span>
                        <input
                          ref={priceInputRef}
                          type="text"
                          inputMode="decimal"
                          value={priceOverrides[variant.id] || ''}
                          onChange={(e) => handlePriceChange(variant.id, e.target.value)}
                          onBlur={handlePriceBlur}
                          onKeyDown={handlePriceKeyDown}
                          className="text-lg font-bold text-brand-500 bg-transparent border-none outline-none w-20 text-right p-0 m-0"
                        />
                      </div>
                    ) : (
                      <div className="text-lg font-bold text-brand-500">
                        {formatCurrency(displayCents)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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
    </Modal>
  );
}
