import React, { useState, useRef, useEffect } from 'react';
import { SaveIcon, PlusIcon, TrashIcon } from '@shared/assets/icons';
import { centsToDollars, formatCurrency, dollarsToCents, parseUserCurrency } from '@shared/utils/currency';
import { useApiClient } from '@shared/hooks/useApiClient';
import ProductVariantModal from '@app/components/pos/ProductVariantModal';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';

const SearchIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

interface OrderItem {
  id: string;
  productId?: string;
  customName: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  rowTotal: number;
}

export interface FinancialsPaymentData {
  deliveryFee: number;
  discount: number;
  gst: number;
  pst: number;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  defaultPrice?: number;
  sku?: string;
  variants?: Array<{
    id: string;
    name: string;
    price?: number;
    calculatedPrice?: number;
    priceDifference?: number;
    isDefault?: boolean;
  }>;
  images?: string[];
}

type VariantModalProduct = Product & { price: number };

interface FinancialsEditModalProps {
  products: OrderItem[];
  payment: FinancialsPaymentData;
  onSave: (products: OrderItem[], payment: FinancialsPaymentData) => void;
  onCancel: () => void;
  saving: boolean;
}

const FinancialsEditModal: React.FC<FinancialsEditModalProps> = ({
  products,
  payment,
  onSave,
  onCancel,
  saving,
}) => {
  const apiClient = useApiClient();

  // --- Products state ---
  const [editingProducts, setEditingProducts] = useState<OrderItem[]>([...products]);
  const [priceDisplayValues, setPriceDisplayValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    products.forEach(p => { initial[p.id] = centsToDollars(p.unitPrice).toFixed(2); });
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<VariantModalProduct | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Payment state (string display values for inputs) ---
  const [deliveryFeeStr, setDeliveryFeeStr] = useState(centsToDollars(payment.deliveryFee).toFixed(2));
  const [discountStr, setDiscountStr] = useState(centsToDollars(payment.discount).toFixed(2));
  const [gstStr, setGstStr] = useState(centsToDollars(payment.gst).toFixed(2));
  const [pstStr, setPstStr] = useState(centsToDollars(payment.pst).toFixed(2));

  // Live total preview (all in cents)
  const deliveryFeeCents = parseUserCurrency(deliveryFeeStr);
  const discountCents = parseUserCurrency(discountStr);
  const gstCents = parseUserCurrency(gstStr);
  const pstCents = parseUserCurrency(pstStr);
  const subtotalCents = editingProducts.reduce((sum, item) => sum + item.rowTotal, 0);
  const newTotal = subtotalCents + deliveryFeeCents - discountCents + gstCents + pstCents;

  // Product search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await apiClient.get(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
        if (Array.isArray(data)) {
          setSearchResults(data.map((p: any) => ({
            ...p,
            defaultPrice: typeof p.defaultPrice === 'number'
              ? p.defaultPrice
              : p.variants?.find((v: any) => v.isDefault)?.calculatedPrice ?? p.price ?? 0,
          })));
        }
      } catch { /* ignore */ } finally { setSearching(false); }
    }, 300);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [searchQuery, apiClient]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Product helpers
  const hasMultipleVariants = (product: Product) =>
    Boolean(product.variants && product.variants.length > 1 && product.variants.some(v => !v.isDefault));

  const resolveVariantPriceCents = (variant?: Product['variants'][number]) => {
    if (!variant) return 0;
    if (typeof (variant as any).displayPriceCents === 'number') return (variant as any).displayPriceCents;
    if (typeof variant.calculatedPrice === 'number') return dollarsToCents(variant.calculatedPrice);
    if (typeof variant.price === 'number') return Number.isInteger(variant.price) ? variant.price : dollarsToCents(variant.price);
    return 0;
  };

  const resolveProductBasePriceCents = (product: Product) => {
    if (typeof product.defaultPrice === 'number') return dollarsToCents(product.defaultPrice);
    const defaultVariant = product.variants?.find(v => v.isDefault);
    if (defaultVariant) return resolveVariantPriceCents(defaultVariant);
    if (typeof product.price === 'number') return Number.isInteger(product.price) ? product.price : dollarsToCents(product.price);
    return 0;
  };

  const updateProduct = (index: number, field: keyof OrderItem, value: any) => {
    setEditingProducts(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'unitPrice' || field === 'quantity') {
        const price = field === 'unitPrice' ? value : updated[index].unitPrice;
        const qty = field === 'quantity' ? value : updated[index].quantity;
        updated[index].rowTotal = price * qty;
      }
      return updated;
    });
  };

  const handlePriceInputChange = (index: number, productId: string, inputValue: string) => {
    if (inputValue !== '' && !/^\d*\.?\d{0,2}$/.test(inputValue)) return;
    setPriceDisplayValues(prev => ({ ...prev, [productId]: inputValue }));
    updateProduct(index, 'unitPrice', dollarsToCents(parseFloat(inputValue) || 0));
  };

  const handlePriceBlur = (productId: string, unitPrice: number) => {
    setPriceDisplayValues(prev => ({ ...prev, [productId]: centsToDollars(unitPrice).toFixed(2) }));
  };

  const addProductFromSearch = (product: Product, selectedVariant?: Product['variants'][number]) => {
    const newId = `temp-${Date.now()}`;
    const unitPrice = selectedVariant ? resolveVariantPriceCents(selectedVariant) : resolveProductBasePriceCents(product);
    const customName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;
    setEditingProducts(prev => [...prev, { id: newId, productId: product.id, customName, description: product.description, unitPrice, quantity: 1, rowTotal: unitPrice }]);
    setPriceDisplayValues(prev => ({ ...prev, [newId]: centsToDollars(unitPrice).toFixed(2) }));
    setSearchQuery('');
    setShowSearch(false);
    setSearchResults([]);
  };

  const addCustomProduct = () => {
    const newId = `temp-${Date.now()}`;
    setEditingProducts(prev => [...prev, { id: newId, customName: '', unitPrice: 0, quantity: 1, rowTotal: 0 }]);
    setPriceDisplayValues(prev => ({ ...prev, [newId]: '0.00' }));
  };

  const removeProduct = (index: number) => {
    const productId = editingProducts[index].id;
    setEditingProducts(prev => prev.filter((_, i) => i !== index));
    setPriceDisplayValues(prev => { const n = { ...prev }; delete n[productId]; return n; });
  };

  const handleVariantSelection = (variant: Product['variants'][number]) => {
    if (selectedProductForVariants) addProductFromSearch(selectedProductForVariants, variant);
    setShowVariantModal(false);
    setSelectedProductForVariants(null);
  };

  const handleSave = () => {
    const validProducts = editingProducts.filter(p => p.customName.trim() !== '');
    onSave(validProducts, {
      deliveryFee: parseUserCurrency(deliveryFeeStr),
      discount: parseUserCurrency(discountStr),
      gst: parseUserCurrency(gstStr),
      pst: parseUserCurrency(pstStr),
    });
  };

  const feeInputClass = 'w-full pl-7 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:text-white';

  return (
    <div className="space-y-5">

      {/* === ORDER ITEMS === */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Order Items</h3>

        {/* Product Search */}
        <div ref={searchRef} className="relative mb-3">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              placeholder="Search products to add..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-brand-500 border-t-transparent" />
              </div>
            )}
          </div>
          {showSearch && searchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((product) => (
                <button
                  key={product.id}
                  onClick={() => {
                    if (hasMultipleVariants(product)) {
                      setSelectedProductForVariants({ ...product, price: product.defaultPrice ?? product.price ?? 0 });
                      setShowVariantModal(true);
                      setShowSearch(false);
                    } else {
                      addProductFromSearch(product);
                    }
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                    {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>}
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {hasMultipleVariants(product)
                      ? `From ${formatCurrency(resolveProductBasePriceCents(product))}`
                      : formatCurrency(resolveProductBasePriceCents(product))}
                  </span>
                </button>
              ))}
            </div>
          )}
          {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg p-3 text-sm text-gray-500">
              No products found
            </div>
          )}
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1 mb-1">
          <div className="col-span-5">Product</div>
          <div className="col-span-2 text-right">Price</div>
          <div className="col-span-2 text-center">Qty</div>
          <div className="col-span-2 text-right">Total</div>
          <div className="col-span-1" />
        </div>

        {/* Products list */}
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {editingProducts.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              No items. Search above or add a custom item.
            </div>
          ) : (
            editingProducts.map((product, index) => (
              <div key={product.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={product.customName || ''}
                    onChange={(e) => updateProduct(index, 'customName', e.target.value)}
                    placeholder="Product name"
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      data-price-id={product.id}
                      value={priceDisplayValues[product.id] ?? centsToDollars(product.unitPrice).toFixed(2)}
                      onFocus={() => {
                        const input = document.querySelector(`input[data-price-id="${product.id}"]`) as HTMLInputElement;
                        if (input) setTimeout(() => input.select(), 0);
                      }}
                      onChange={(e) => handlePriceInputChange(index, product.id, e.target.value)}
                      onBlur={() => handlePriceBlur(product.id, product.unitPrice)}
                      className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    value={product.quantity || 1}
                    onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(product.rowTotal)}
                </div>
                <div className="col-span-1 flex justify-center">
                  <button
                    onClick={() => removeProduct(index)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title="Remove item"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={addCustomProduct}
          className="mt-2 w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Add Custom Item
        </button>
      </div>

      {/* === FEES & ADJUSTMENTS === */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Fees & Adjustments</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Delivery Fee', value: deliveryFeeStr, onChange: setDeliveryFeeStr },
            { label: 'Discount', value: discountStr, onChange: setDiscountStr },
            { label: 'GST', value: gstStr, onChange: setGstStr },
            { label: 'PST', value: pstStr, onChange: setPstStr },
          ].map(({ label, value, onChange }) => (
            <div key={label}>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={feeInputClass}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* === LIVE TOTAL PREVIEW === */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Subtotal</span><span>{formatCurrency(subtotalCents)}</span>
        </div>
        <div className="flex justify-between text-gray-600 dark:text-gray-400">
          <span>Delivery Fee</span><span>{formatCurrency(deliveryFeeCents)}</span>
        </div>
        {discountCents > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Discount</span><span>-{formatCurrency(discountCents)}</span>
          </div>
        )}
        {gstCents > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>GST</span><span>{formatCurrency(gstCents)}</span>
          </div>
        )}
        {pstCents > 0 && (
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>PST</span><span>{formatCurrency(pstCents)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-gray-900 dark:text-white border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
          <span>New Total</span><span>{formatCurrency(newTotal)}</span>
        </div>
      </div>

      <FormFooter onCancel={onCancel} onSubmit={handleSave} submitting={saving} submitIcon={<SaveIcon className="w-4 h-4" />} />

      <ProductVariantModal
        open={showVariantModal}
        product={selectedProductForVariants}
        onClose={() => { setShowVariantModal(false); setSelectedProductForVariants(null); }}
        onSelectVariant={handleVariantSelection}
      />
    </div>
  );
};

export default FinancialsEditModal;
