import { useState, useEffect } from 'react';
import InputField from '../form/input/InputField';
import Select from '../form/Select';

type Discount = {
  id: string;
  name: string;
  code?: string;
  discountType: string;
  triggerType: string;
  value: number;
  enabled: boolean;
  usageCount: number;
  usageLimit?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
};

type Props = {
  onEditDiscount?: (discount: Discount) => void;
};

export default function DiscountList({ onEditDiscount }: Props) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/discounts');
      if (response.ok) {
        const data = await response.json();
        setDiscounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDiscountStatus = async (discountId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      
      if (response.ok) {
        setDiscounts(prev => 
          prev.map(discount => 
            discount.id === discountId 
              ? { ...discount, enabled: !enabled }
              : discount
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle discount status:', error);
    }
  };

  const getDiscountTypeDisplay = (type: string) => {
    const types = {
      'FIXED_AMOUNT': '$ Fixed',
      'PERCENTAGE': '% Percent',
      'FREE_SHIPPING': 'Free Delivery',
      'SALE_PRICE': 'Sale Price',
      'BUY_X_GET_Y_FREE': 'Buy X Get Y'
    };
    return types[type] || type;
  };

  const getTriggerTypeDisplay = (type: string) => {
    const types = {
      'COUPON_CODE': 'Coupon Code',
      'AUTOMATIC_PRODUCT': 'Auto Product',
      'AUTOMATIC_CATEGORY': 'Auto Category'
    };
    return types[type] || type;
  };

  const getDiscountValue = (discount: Discount) => {
    if (discount.discountType === 'PERCENTAGE') {
      return `${discount.value}%`;
    } else if (discount.discountType === 'FIXED_AMOUNT') {
      return `$${discount.value}`;
    } else if (discount.discountType === 'FREE_SHIPPING') {
      return 'Free';
    } else if (discount.discountType === 'SALE_PRICE') {
      return `$${discount.value}`;
    }
    return discount.value.toString();
  };

  const filteredDiscounts = discounts.filter(discount => {
    const matchesSearch = discount.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (discount.code && discount.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'ALL' || discount.discountType === filterType;
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#597485]"></div>
      </div>
    );
  }

  const filterOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'FIXED_AMOUNT', label: '$ Fixed' },
    { value: 'PERCENTAGE', label: '% Percent' },
    { value: 'FREE_SHIPPING', label: 'Free Delivery' },
    { value: 'SALE_PRICE', label: 'Sale Price' },
    { value: 'BUY_X_GET_Y_FREE', label: 'Buy X Get Y' }
  ];

  return (
    <div>
      
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <InputField
            type="text"
            placeholder="Search discounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="sm:w-48">
          <Select
            options={filterOptions}
            value={filterType}
            onChange={setFilterType}
            placeholder="Filter by type"
          />
        </div>
      </div>

      {/* Discounts List */}
      <div className="space-y-4">
        {filteredDiscounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-lg font-medium mb-2">No discounts found</p>
            <p>Create your first discount using the buttons on the left</p>
          </div>
        ) : (
          filteredDiscounts.map((discount) => (
            <div
              key={discount.id}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-[#597485] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-black dark:text-white">
                      {discount.name}
                    </h3>
                    {discount.code && (
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded font-mono">
                        {discount.code}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded ${
                      discount.enabled 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {discount.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                    <span>{getDiscountTypeDisplay(discount.discountType)}</span>
                    <span>{getTriggerTypeDisplay(discount.triggerType)}</span>
                    <span className="font-semibold text-[#597485]">
                      {getDiscountValue(discount)}
                    </span>
                    {discount.usageLimit && (
                      <span>{discount.usageCount}/{discount.usageLimit} uses</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleDiscountStatus(discount.id, discount.enabled)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      discount.enabled
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
                        : 'bg-[#597485] hover:bg-[#4e6575] text-white'
                    }`}
                  >
                    {discount.enabled ? 'Disable' : 'Enable'}
                  </button>
                  
                  <button 
                    onClick={() => onEditDiscount?.(discount)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}