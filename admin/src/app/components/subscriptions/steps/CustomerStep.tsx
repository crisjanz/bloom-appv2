import { useState, useCallback, useEffect, useRef } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import { useApiClient } from '@shared/hooks/useApiClient';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface Props {
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer) => void;
}

export default function CustomerStep({ selectedCustomer, onSelect }: Props) {
  const apiClient = useApiClient();
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await apiClient.get(`/api/customers/quick-search?query=${encodeURIComponent(query)}&limit=10`);
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, [apiClient]);

  const handleSearch = (query: string) => {
    setSearch(query);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 1: Customer</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Search for the customer who is purchasing this subscription.</p>

      <InputField
        label="Search Customer"
        value={search}
        onChange={(e) => handleSearch(e.target.value)}
        placeholder="Type name, email, or phone..."
      />

      {searching && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500"></div>
        </div>
      )}

      {results.length > 0 && !selectedCustomer && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                onSelect(c);
                setResults([]);
                setSearch('');
              }}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {c.firstName} {c.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {c.email || ''} {c.phone ? `| ${c.phone}` : ''}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <div className="border border-brand-200 bg-brand-50 dark:bg-brand-900/20 dark:border-brand-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </div>
              <div className="text-sm text-gray-500">
                {selectedCustomer.email || ''} {selectedCustomer.phone ? `| ${selectedCustomer.phone}` : ''}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onSelect(null as any)}
              className="text-sm text-red-500 hover:text-red-700"
            >
              Change
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
