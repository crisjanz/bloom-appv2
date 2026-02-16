import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApiClient } from '@shared/hooks/useApiClient';
import useOrderNumberPrefix from '@shared/hooks/useOrderNumberPrefix';
import { formatOrderNumber } from '@shared/utils/formatOrderNumber';

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
};

type Product = {
  id: string;
  name: string;
  variants?: { sku: string; price: number }[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  customer?: { firstName: string; lastName: string } | null;
};

type SearchResults = {
  customers: Customer[];
  products: Product[];
  order: Order | null;
};

export default function GlobalSearch() {
  const navigate = useNavigate();
  const apiClient = useApiClient();
  const orderNumberPrefix = useOrderNumberPrefix();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Search function
  const performSearch = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setIsOpen(false);
      return;
    }

    setLoading(true);

    try {
      // For customer search, if query looks like a phone number, strip formatting
      const digitsOnly = trimmed.replace(/\D/g, '');
      const hasPhoneFormatting = /[\d]/.test(trimmed) && /[-().\s]/.test(trimmed);
      const isPureDigits = /^\d+$/.test(trimmed);
      const customerQuery = (hasPhoneFormatting || isPureDigits) && digitsOnly.length >= 3
        ? digitsOnly
        : trimmed;

      // Check if we should also search for an order (has digits, extract them)
      const orderNumber = trimmed.startsWith('#') ? trimmed.slice(1) : digitsOnly;
      const shouldSearchOrder = orderNumber.length >= 3;

      // Search everything in parallel
      const [customerRes, productRes, orderRes] = await Promise.all([
        apiClient.get(`/api/customers/quick-search?query=${encodeURIComponent(customerQuery)}&limit=5`),
        apiClient.get(`/api/products/search?q=${encodeURIComponent(trimmed)}`),
        shouldSearchOrder
          ? apiClient.get(`/api/orders/by-number/${orderNumber}`)
          : Promise.resolve({ data: { order: null } })
      ]);

      const customers = Array.isArray(customerRes.data) ? customerRes.data : [];
      const products = Array.isArray(productRes.data) ? productRes.data.slice(0, 5) : [];
      const order = orderRes.data?.order || null;

      setResults({ customers, products, order });
      setIsOpen(true);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        performSearch(query);
      } else {
        setResults(null);
        setIsOpen(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Cmd+K to focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get all selectable items for keyboard nav
  const getSelectableItems = useCallback((): { type: 'customer' | 'product' | 'order'; id: string }[] => {
    if (!results) return [];
    const items: { type: 'customer' | 'product' | 'order'; id: string }[] = [];
    if (results.order) {
      items.push({ type: 'order', id: results.order.id });
    }
    items.push(...results.customers.map(c => ({ type: 'customer' as const, id: c.id })));
    items.push(...results.products.map(p => ({ type: 'product' as const, id: p.id })));
    return items;
  }, [results]);

  // Navigate to result
  const navigateToResult = useCallback((item: { type: 'customer' | 'product' | 'order'; id: string }) => {
    setIsOpen(false);
    setQuery('');
    if (item.type === 'order') {
      navigate(`/orders/${item.id}`);
    } else if (item.type === 'customer') {
      navigate(`/customers/${item.id}`);
    } else {
      navigate(`/products/${item.id}`);
    }
  }, [navigate]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = getSelectableItems();

    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        navigateToResult(items[selectedIndex]);
      } else if (items.length === 1) {
        navigateToResult(items[0]);
      }
    }
  };

  const hasResults = results && (
    results.order ||
    results.customers.length > 0 ||
    results.products.length > 0
  );

  const noResults = results && !hasResults;

  // Calculate index offsets for keyboard navigation
  const orderCount = results?.order ? 1 : 0;
  const customerCount = results?.customers?.length || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <span className="absolute -translate-y-1/2 pointer-events-none left-4 top-1/2">
          <svg
            className="fill-gray-500 dark:fill-gray-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
              fill=""
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => hasResults && setIsOpen(true)}
          placeholder="Search customers, products, or #order..."
          className="dark:bg-dark-900 h-9 w-full rounded-lg border border-gray-200 bg-transparent py-2 pl-12 pr-14 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800 xl:w-[430px]"
        />
        <button className="absolute right-2.5 top-1/2 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          <span> {'\u2318'} </span>
          <span> K </span>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-auto">
          {loading && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              Searching...
            </div>
          )}

          {!loading && noResults && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}

          {/* Order section */}
          {!loading && results?.order && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                Order
              </div>
              <button
                onClick={() => navigateToResult({ type: 'order', id: results.order!.id })}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 ${
                  selectedIndex === 0 ? 'bg-gray-50 dark:bg-gray-700' : ''
                }`}
              >
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center">
                  <span className="text-brand-600 dark:text-brand-400 text-xs font-bold">#</span>
                </span>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Order #{formatOrderNumber(results.order.orderNumber, orderNumberPrefix)}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {results.order.customer
                      ? `${results.order.customer.firstName} ${results.order.customer.lastName}`
                      : 'No customer'}
                    {' - '}
                    {results.order.status}
                  </div>
                </div>
              </button>
            </>
          )}

          {/* Customers section */}
          {!loading && results?.customers && results.customers.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                Customers
              </div>
              {results.customers.map((customer, index) => (
                <button
                  key={customer.id}
                  onClick={() => navigateToResult({ type: 'customer', id: customer.id })}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 ${
                    selectedIndex === orderCount + index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-600 dark:text-gray-300 text-xs font-bold">
                      {customer.firstName?.[0]}{customer.lastName?.[0]}
                    </span>
                  </span>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {customer.firstName} {customer.lastName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {customer.phone || customer.email || 'No contact info'}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Products section */}
          {!loading && results?.products && results.products.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
                Products
              </div>
              {results.products.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => navigateToResult({ type: 'product', id: product.id })}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 ${
                    selectedIndex === orderCount + customerCount + index ? 'bg-gray-50 dark:bg-gray-700' : ''
                  }`}
                >
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">P</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {product.variants?.[0]?.sku || 'No SKU'}
                      {product.variants?.[0]?.price != null && (
                        <> - ${(product.variants[0].price / 100).toFixed(2)}</>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
