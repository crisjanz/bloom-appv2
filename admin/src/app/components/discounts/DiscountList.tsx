import { useState, useEffect } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import StandardTable, { ColumnDef } from '@shared/ui/components/ui/table/StandardTable';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';

// Inline SVG icons
const PencilIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

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
  const { formatDate } = useBusinessTimezone();

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
    return types[type as keyof typeof types] || type;
  };

  const getTriggerTypeDisplay = (type: string) => {
    const types = {
      'COUPON_CODE': 'Coupon Code',
      'AUTOMATIC_PRODUCT': 'Auto Product',
      'AUTOMATIC_CATEGORY': 'Auto Category'
    };
    return types[type as keyof typeof types] || type;
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

  const filterOptions = [
    { value: 'ALL', label: 'All Types' },
    { value: 'FIXED_AMOUNT', label: '$ Fixed' },
    { value: 'PERCENTAGE', label: '% Percent' },
    { value: 'FREE_SHIPPING', label: 'Free Delivery' },
    { value: 'SALE_PRICE', label: 'Sale Price' },
    { value: 'BUY_X_GET_Y_FREE', label: 'Buy X Get Y' }
  ];

  // Define table columns
  const columns: ColumnDef<Discount>[] = [
    {
      key: 'status',
      header: 'Status',
      className: 'w-[120px]',
      render: (discount) => {
        const statusColor = discount.enabled ? 'text-green-500' : 'text-gray-500';
        const statusText = discount.enabled ? 'Active' : 'Inactive';
        return (
          <div className="flex items-center gap-2">
            <span className={`text-2xl leading-none ${statusColor}`}>•</span>
            <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
          </div>
        );
      },
    },
    {
      key: 'name',
      header: 'Discount Name',
      className: 'w-[200px] max-w-[200px]',
      render: (discount) => (
        <div className="max-w-[200px] truncate">
          <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate" title={discount.name}>
            {discount.name}
          </div>
          {discount.code && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={discount.code}>
              {discount.code}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      className: 'w-[120px]',
      render: (discount) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {getDiscountTypeDisplay(discount.discountType)}
        </span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      className: 'w-[100px]',
      render: (discount) => (
        <span className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
          {getDiscountValue(discount)}
        </span>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger',
      className: 'w-[140px]',
      render: (discount) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {getTriggerTypeDisplay(discount.triggerType)}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      className: 'w-[100px]',
      render: (discount) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {discount.usageLimit ? `${discount.usageCount}/${discount.usageLimit}` : discount.usageCount}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      className: 'w-[120px]',
      render: (discount) => (
        <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
          {formatDate(discount.createdAt)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'w-[80px]',
      render: (discount) => (
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditDiscount?.(discount);
            }}
            className="text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
            title="Edit discount"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Filters */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Search"
            placeholder="Search by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            label="Type"
            options={filterOptions}
            value={filterType}
            onChange={setFilterType}
          />
        </div>

        <div>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterType('ALL');
            }}
            className="text-sm text-brand-500 hover:text-brand-600 font-medium"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Table */}
      <StandardTable
        columns={columns}
        data={filteredDiscounts}
        loading={loading && discounts.length === 0}
        emptyState={{
          message: "No discounts found",
        }}
      />
    </div>
  );
}