import React, { useState, useEffect } from 'react';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useSubscriptionPlans, SubscriptionPlan } from '@shared/hooks/useSubscriptionPlans';
import { formatCurrency } from '@shared/utils/currency';
import Select from '@shared/ui/forms/Select';

type Style = 'DESIGNERS_CHOICE' | 'PICK_YOUR_OWN';

interface ProductData {
  style: Style;
  planId: string | null;
  colorPalette: string | null;
  defaultPriceCents: number;
  // For per-delivery products
  selectedProductId: string | null;
  deliveryProducts: {
    scheduledDate: string;
    productId: string | null;
    productName: string | null;
    priceCents: number;
  }[];
}

interface Product {
  id: string;
  name: string;
  images: string[];
  variants: { id: string; price: number }[];
}

interface Props {
  data: ProductData;
  onChange: (data: ProductData) => void;
  deliveryDates?: string[];
}

const COLOR_PALETTES = [
  { value: '', label: 'No Preference' },
  { value: 'Warm Tones', label: 'Warm Tones' },
  { value: 'Cool Tones', label: 'Cool Tones' },
  { value: 'Bright & Bold', label: 'Bright & Bold' },
  { value: 'Pastel & Soft', label: 'Pastel & Soft' },
];

export default function ProductStep({ data, onChange, deliveryDates = [] }: Props) {
  const apiClient = useApiClient();
  const { plans, loading: plansLoading } = useSubscriptionPlans();
  const [products, setProducts] = useState<Product[]>([]);
  const [customizeEach, setCustomizeEach] = useState(data.deliveryProducts.length > 0);

  useEffect(() => {
    if (data.style === 'PICK_YOUR_OWN') {
      apiClient.get('/api/subscriptions/storefront/products').then(({ data: prods }) => {
        setProducts(prods || []);
      });
    }
  }, [data.style, apiClient]);

  const update = (field: keyof ProductData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const selectPlan = (plan: SubscriptionPlan) => {
    onChange({
      ...data,
      planId: plan.id,
      defaultPriceCents: plan.priceCents,
    });
  };

  const selectProduct = (product: Product) => {
    const price = product.variants[0]?.price || 0;
    onChange({
      ...data,
      selectedProductId: product.id,
      defaultPriceCents: price,
      deliveryProducts: [],
    });
  };

  const setDeliveryProduct = (index: number, product: Product) => {
    const price = product.variants[0]?.price || 0;
    const updated = [...data.deliveryProducts];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      priceCents: price,
    };
    onChange({ ...data, deliveryProducts: updated });
  };

  const initPerDeliveryProducts = () => {
    setCustomizeEach(true);
    if (deliveryDates.length > 0) {
      const dp = deliveryDates.map((date) => ({
        scheduledDate: date,
        productId: data.selectedProductId || null,
        productName: null,
        priceCents: data.defaultPriceCents,
      }));
      onChange({ ...data, deliveryProducts: dp });
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 5: Products</h3>

      {/* Style Toggle */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange({ ...data, style: 'DESIGNERS_CHOICE', selectedProductId: null, deliveryProducts: [] })}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            data.style === 'DESIGNERS_CHOICE'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900 dark:text-white">Designer's Choice</div>
          <div className="text-xs text-gray-500 mt-1">Let our florists surprise you</div>
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...data, style: 'PICK_YOUR_OWN', planId: null, colorPalette: null })}
          className={`p-4 rounded-lg border-2 text-left transition-colors ${
            data.style === 'PICK_YOUR_OWN'
              ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
          }`}
        >
          <div className="font-medium text-gray-900 dark:text-white">Pick Your Arrangements</div>
          <div className="text-xs text-gray-500 mt-1">Choose specific products</div>
        </button>
      </div>

      {/* Designer's Choice: Plan tiers + Color palette */}
      {data.style === 'DESIGNERS_CHOICE' && (
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Choose a size:</label>
          {plansLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {plans.filter((p) => p.isActive).map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => selectPlan(plan)}
                  className={`p-4 rounded-lg border-2 text-center transition-colors ${
                    data.planId === plan.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  {plan.image && (
                    <img src={plan.image} alt={plan.name} className="w-full h-24 object-cover rounded mb-2" />
                  )}
                  <div className="font-medium text-gray-900 dark:text-white">{plan.name}</div>
                  <div className="text-sm text-brand-500 mt-1">{formatCurrency(plan.priceCents)}/delivery</div>
                  {plan.description && (
                    <div className="text-xs text-gray-500 mt-1">{plan.description}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          <Select
            label="Color Preference (optional)"
            value={data.colorPalette || ''}
            options={COLOR_PALETTES}
            onChange={(val) => update('colorPalette', val || null)}
          />
        </div>
      )}

      {/* Pick Your Own: Product grid */}
      {data.style === 'PICK_YOUR_OWN' && (
        <div className="space-y-4">
          {!customizeEach && (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Choose an arrangement:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectProduct(product)}
                    className={`p-3 rounded-lg border-2 text-center transition-colors ${
                      data.selectedProductId === product.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {product.images[0] && (
                      <img src={product.images[0]} alt={product.name} className="w-full h-20 object-cover rounded mb-2" />
                    )}
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                    <div className="text-xs text-brand-500">{formatCurrency(product.variants[0]?.price || 0)}</div>
                  </button>
                ))}
              </div>

              {deliveryDates.length > 0 && (
                <button
                  type="button"
                  onClick={initPerDeliveryProducts}
                  className="text-sm text-brand-500 hover:text-brand-600"
                >
                  Want different arrangements for each delivery?
                </button>
              )}
            </>
          )}

          {customizeEach && data.deliveryProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Customize each delivery:</label>
                <button
                  type="button"
                  onClick={() => { setCustomizeEach(false); onChange({ ...data, deliveryProducts: [] }); }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Use same for all
                </button>
              </div>
              {data.deliveryProducts.map((dp, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="text-sm text-gray-500 w-32">
                    {new Date(dp.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <select
                    className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                    value={dp.productId || ''}
                    onChange={(e) => {
                      const prod = products.find((p) => p.id === e.target.value);
                      if (prod) setDeliveryProduct(i, prod);
                    }}
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.variants[0]?.price || 0)}</option>
                    ))}
                  </select>
                  <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                    {formatCurrency(dp.priceCents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
