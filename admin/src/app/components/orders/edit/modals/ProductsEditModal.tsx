import { useState, useEffect, useRef } from 'react';
import { SaveIcon, PlusIcon, TrashIcon } from '@shared/assets/icons';
import { centsToDollars, formatCurrency, dollarsToCents } from '@shared/utils/currency';
import { useApiClient } from '@shared/hooks/useApiClient';

// Inline search icon since SearchIcon doesn't exist
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

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  sku?: string;
}

interface ProductsEditModalProps {
  products: OrderItem[];
  onChange: (products: OrderItem[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const ProductsEditModal: React.FC<ProductsEditModalProps> = ({
  products,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const apiClient = useApiClient();
  const [editingProducts, setEditingProducts] = useState<OrderItem[]>([...products]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track display values for prices to prevent cursor jumping
  const [priceDisplayValues, setPriceDisplayValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    products.forEach(p => {
      initial[p.id] = centsToDollars(p.unitPrice).toFixed(2);
    });
    return initial;
  });

  // Search products as user types
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await apiClient.get(`/api/products/search?q=${encodeURIComponent(searchQuery)}`);
        if (Array.isArray(data)) {
          const products = data.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.variants?.[0]?.price || p.price || 0,
            sku: p.variants?.[0]?.sku || p.sku
          }));
          setSearchResults(products);
        }
      } catch (error) {
        console.error('Product search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery, apiClient]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateProduct = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...editingProducts];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'unitPrice' || field === 'quantity') {
      const price = field === 'unitPrice' ? value : updated[index].unitPrice;
      const qty = field === 'quantity' ? value : updated[index].quantity;
      updated[index].rowTotal = price * qty;
    }

    setEditingProducts(updated);
    onChange(updated);
  };

  const handlePriceFocus = (productId: string, currentValue: string) => {
    // Select all on focus for easy replacement
    const input = document.querySelector(`input[data-price-id="${productId}"]`) as HTMLInputElement;
    if (input) {
      setTimeout(() => input.select(), 0);
    }
  };

  const handlePriceInputChange = (index: number, productId: string, inputValue: string) => {
    // Allow only valid decimal input
    if (inputValue !== '' && !/^\d*\.?\d{0,2}$/.test(inputValue)) {
      return;
    }

    // Update display value immediately (no formatting)
    setPriceDisplayValues(prev => ({ ...prev, [productId]: inputValue }));

    // Convert to cents and update product
    const dollars = parseFloat(inputValue) || 0;
    const cents = dollarsToCents(dollars);
    updateProduct(index, 'unitPrice', cents);
  };

  const handlePriceBlur = (productId: string, unitPrice: number) => {
    // Format on blur
    setPriceDisplayValues(prev => ({
      ...prev,
      [productId]: centsToDollars(unitPrice).toFixed(2)
    }));
  };

  const addProductFromSearch = (product: Product) => {
    const newId = `temp-${Date.now()}`;
    const newItem: OrderItem = {
      id: newId,
      productId: product.id,
      customName: product.name,
      description: product.description,
      unitPrice: product.price,
      quantity: 1,
      rowTotal: product.price
    };
    const updated = [...editingProducts, newItem];
    setEditingProducts(updated);
    onChange(updated);

    // Set display value for new product
    setPriceDisplayValues(prev => ({
      ...prev,
      [newId]: centsToDollars(product.price).toFixed(2)
    }));

    setSearchQuery('');
    setShowSearch(false);
    setSearchResults([]);
  };

  const addCustomProduct = () => {
    const newId = `temp-${Date.now()}`;
    const newProduct: OrderItem = {
      id: newId,
      customName: '',
      unitPrice: 0,
      quantity: 1,
      rowTotal: 0
    };
    const updated = [...editingProducts, newProduct];
    setEditingProducts(updated);
    onChange(updated);

    setPriceDisplayValues(prev => ({ ...prev, [newId]: '0.00' }));
  };

  const removeProduct = (index: number) => {
    const productId = editingProducts[index].id;
    const updated = editingProducts.filter((_, i) => i !== index);
    setEditingProducts(updated);
    onChange(updated);

    setPriceDisplayValues(prev => {
      const newValues = { ...prev };
      delete newValues[productId];
      return newValues;
    });
  };

  const handleSave = () => {
    const validProducts = editingProducts.filter(p => p.customName.trim() !== '');
    setEditingProducts(validProducts);
    onChange(validProducts);
    onSave();
  };

  const subtotal = editingProducts.reduce((sum, item) => sum + item.rowTotal, 0);

  return (
    <div className="space-y-4">
      {/* Product Search */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearch(true);
            }}
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

        {/* Search Results Dropdown */}
        {showSearch && searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((product) => (
              <button
                key={product.id}
                onClick={() => addProductFromSearch(product)}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {product.name}
                  </div>
                  {product.sku && (
                    <div className="text-xs text-gray-500">SKU: {product.sku}</div>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {formatCurrency(product.price)}
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

      {/* Header */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide px-1">
        <div className="col-span-5">Product</div>
        <div className="col-span-2 text-right">Price</div>
        <div className="col-span-2 text-center">Qty</div>
        <div className="col-span-2 text-right">Total</div>
        <div className="col-span-1"></div>
      </div>

      {/* Products List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {editingProducts.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
            No items. Search above or add a custom item.
          </div>
        ) : (
          editingProducts.map((product, index) => (
            <div
              key={product.id}
              className="grid grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2"
            >
              {/* Product Name */}
              <div className="col-span-5">
                <input
                  type="text"
                  value={product.customName || ''}
                  onChange={(e) => updateProduct(index, 'customName', e.target.value)}
                  placeholder="Product name"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Price */}
              <div className="col-span-2">
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    data-price-id={product.id}
                    value={priceDisplayValues[product.id] ?? centsToDollars(product.unitPrice).toFixed(2)}
                    onFocus={() => handlePriceFocus(product.id, priceDisplayValues[product.id] || '')}
                    onChange={(e) => handlePriceInputChange(index, product.id, e.target.value)}
                    onBlur={() => handlePriceBlur(product.id, product.unitPrice)}
                    className="w-full pl-5 pr-2 py-1.5 text-sm text-right border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="col-span-2">
                <input
                  type="number"
                  min="1"
                  value={product.quantity || 1}
                  onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full px-2 py-1.5 text-sm text-center border border-gray-300 dark:border-gray-600 rounded focus:ring-1 focus:ring-brand-500 focus:border-brand-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Row Total */}
              <div className="col-span-2 text-right text-sm font-medium text-gray-900 dark:text-white">
                {formatCurrency(product.rowTotal)}
              </div>

              {/* Remove Button */}
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

      {/* Add Custom Item Button */}
      <button
        onClick={addCustomProduct}
        className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-4 h-4" />
        Add Custom Item
      </button>

      {/* Subtotal */}
      <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600">
        <span className="font-medium text-gray-700 dark:text-gray-300">Subtotal</span>
        <span className="text-lg font-semibold text-gray-900 dark:text-white">
          {formatCurrency(subtotal)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductsEditModal;
