import { useState, useEffect } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import DatePicker from '@shared/ui/forms/date-picker';
import { useBusinessTimezone } from '@shared/hooks/useBusinessTimezone';
import { Modal } from '@shared/ui/components/ui/modal';
import { useApiClient } from '@shared/hooks/useApiClient';
import { useCustomerSearch, useCustomerService } from '@domains/customers/hooks/useCustomerService.ts';

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingDiscount?: any;
  onDelete?: (discountId: string) => void;
};

type DiscountType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FREE_SHIPPING' | 'SALE_PRICE' | 'BUY_X_GET_Y_FREE';
type TriggerType = 'COUPON_CODE' | 'AUTOMATIC_PRODUCT' | 'AUTOMATIC_CATEGORY';

export default function CreateDiscountModal({ open, onClose, onSuccess, editingDiscount, onDelete }: Props) {
  const { formatDate: formatBusinessDate, parseToBusinessDate } = useBusinessTimezone();
  const apiClient = useApiClient();
  const { query: customerQuery, setQuery: setCustomerQuery, results: customerResults, isSearching: isSearchingCustomers, clearSearch } = useCustomerSearch();
  const { getCustomer } = useCustomerService();
  const [discountType, setDiscountType] = useState<DiscountType | null>(null);
  const [triggerType, setTriggerType] = useState<TriggerType>('COUPON_CODE');
  const [autoApplyScope, setAutoApplyScope] = useState<'ALL' | 'CATEGORY' | 'PRODUCT'>('ALL');
  const [applicationMethod, setApplicationMethod] = useState<'COUPON_CODE' | 'AUTO_APPLY'>('COUPON_CODE');
  const [periodWindowType, setPeriodWindowType] = useState<'NONE' | 'CALENDAR' | 'ROLLING'>('NONE');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  
  // Selection state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  
  // Data state
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    value: '',
    minimumOrder: '',
    minimumQuantity: '',
    maximumQuantity: '',
    usageLimit: '',
    perCustomerLimit: '',
    periodLimit: '',
    periodType: '',
    periodWindowDays: '',
    startDate: '',
    endDate: '',
    applicableProducts: [],
    applicableCategories: [],
    autoApply: false,
    stackable: false,
    posOnly: false,
    webOnly: false,
    priority: '1',
    // Buy X Get Y specific
    buyQuantity: '',
    getQuantity: '',
    freeType: 'CHEAPEST'
  });
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Helper function to get discount type display name
  const getDiscountTypeDisplay = () => {
    switch (discountType) {
      case 'FIXED_AMOUNT':
        return 'discount';
      case 'PERCENTAGE':
        return 'discount';
      case 'FREE_SHIPPING':
        return 'free shipping offer';
      case 'SALE_PRICE':
        return 'sale';
      case 'BUY_X_GET_Y_FREE':
        return 'buy X get Y offer';
      default:
        return 'discount';
    }
  };

  // Load categories
  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await apiClient.get('/api/categories');
      if (response.status >= 200 && response.status < 300) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load products
  const loadProducts = async () => {
    setLoadingProducts(true);
    try {
      const response = await apiClient.get('/api/products');
      if (response.status >= 200 && response.status < 300) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (open) {
      // Load data
      loadCategories();
      loadProducts();
      clearSearch();

      const hydrateCustomer = async () => {
        if (editingDiscount?.customerId) {
          setLoadingCustomer(true);
          try {
            const customer = await getCustomer(editingDiscount.customerId);
            setSelectedCustomer(customer);
          } finally {
            setLoadingCustomer(false);
          }
        } else {
          setSelectedCustomer(null);
          setLoadingCustomer(false);
        }
      };
      hydrateCustomer();
      
      if (editingDiscount) {
        // Populate form with existing discount data
        setDiscountType(editingDiscount.discountType);
        setTriggerType(editingDiscount.triggerType);
        setApplicationMethod(editingDiscount.triggerType === 'COUPON_CODE' ? 'COUPON_CODE' : 'AUTO_APPLY');
        
        // Set auto apply scope based on trigger type
        if (editingDiscount.triggerType === 'AUTOMATIC_CATEGORY') {
          setAutoApplyScope('CATEGORY');
        } else if (editingDiscount.triggerType === 'AUTOMATIC_PRODUCT') {
          setAutoApplyScope(editingDiscount.applicableProducts?.length > 0 ? 'PRODUCT' : 'ALL');
        } else {
          setAutoApplyScope('ALL');
        }
        
        setSelectedCategories(editingDiscount.applicableCategories || []);
        setSelectedProducts(editingDiscount.applicableProducts || []);
        setProductSearchTerm('');
        
        setFormData({
          name: editingDiscount.name || '',
          description: editingDiscount.description || '',
          code: editingDiscount.code || '',
          value: editingDiscount.value?.toString() || '',
          minimumOrder: editingDiscount.minimumOrder?.toString() || '',
          minimumQuantity: editingDiscount.minimumQuantity?.toString() || '',
          maximumQuantity: editingDiscount.maximumQuantity?.toString() || '',
          usageLimit: editingDiscount.usageLimit?.toString() || '',
          perCustomerLimit: editingDiscount.perCustomerLimit?.toString() || '',
          periodLimit: editingDiscount.periodLimit?.toString() || '',
          periodType: editingDiscount.periodType || '',
          periodWindowDays: editingDiscount.periodWindowDays?.toString() || '',
          startDate: editingDiscount.startDate ? new Date(editingDiscount.startDate).toISOString().slice(0, 16) : '',
          endDate: editingDiscount.endDate ? new Date(editingDiscount.endDate).toISOString().slice(0, 16) : '',
          applicableProducts: editingDiscount.applicableProducts || [],
          applicableCategories: editingDiscount.applicableCategories || [],
          autoApply: editingDiscount.autoApply || false,
          stackable: editingDiscount.stackable || false,
          posOnly: editingDiscount.posOnly || false,
          webOnly: editingDiscount.webOnly || false,
          priority: editingDiscount.priority?.toString() || '1',
          buyQuantity: editingDiscount.buyXGetYFree?.buy?.toString() || '',
          getQuantity: editingDiscount.buyXGetYFree?.get?.toString() || '',
          freeType: editingDiscount.buyXGetYFree?.freeType || 'CHEAPEST'
        });

        if (editingDiscount.periodWindowDays) {
          setPeriodWindowType('ROLLING');
        } else if (editingDiscount.periodType) {
          setPeriodWindowType('CALENDAR');
        } else {
          setPeriodWindowType('NONE');
        }
      } else {
        // Reset form for new discount
        setDiscountType(null);
        setTriggerType('COUPON_CODE');
        setAutoApplyScope('ALL');
        setSelectedCategories([]);
        setSelectedProducts([]);
        setProductSearchTerm('');
        
        setFormData({
          name: '',
          description: '',
          code: '',
          value: '',
          minimumOrder: '',
          minimumQuantity: '',
          maximumQuantity: '',
          usageLimit: '',
          perCustomerLimit: '',
          periodLimit: '',
          periodType: '',
          periodWindowDays: '',
          startDate: '',
          endDate: '',
          applicableProducts: [],
          applicableCategories: [],
          autoApply: false,
          stackable: false,
          posOnly: false,
          webOnly: false,
          priority: '1',
          buyQuantity: '',
          getQuantity: '',
          freeType: 'CHEAPEST'
        });

        setPeriodWindowType('NONE');
        setSelectedCustomer(null);
      }
    }
  }, [open, editingDiscount, clearSearch, getCustomer]);

  if (!open) return null;

  const discountTypes = [
    { id: 'FIXED_AMOUNT', name: '$ Fixed', description: '$5 OFF' },
    { id: 'PERCENTAGE', name: '% Percent', description: '20% OFF' },
    { id: 'FREE_SHIPPING', name: 'Free Delivery', description: 'FREE SHIP' },
    { id: 'SALE_PRICE', name: 'Sale Price', description: '$19.99' },
    { id: 'BUY_X_GET_Y_FREE', name: 'Buy X Get Y', description: 'B2G1F' }
  ];

  const applicationMethods = [
    { id: 'COUPON_CODE', name: 'Coupon Code', description: 'Customer enters code at checkout' },
    { id: 'AUTO_APPLY', name: 'Auto-apply', description: 'Automatically applies when conditions are met' }
  ];

  const autoApplyScopes = [
    { value: 'ALL', label: 'Entire Shop' },
    { value: 'CATEGORY', label: 'Specific Categories' },
    { value: 'PRODUCT', label: 'Specific Products' }
  ];

  const periodWindowOptions = [
    { value: 'NONE', label: 'No period limit' },
    { value: 'CALENDAR', label: 'Calendar period' },
    { value: 'ROLLING', label: 'Rolling days' }
  ];

  const periodTypeOptions = [
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'MONTHLY', label: 'Monthly' },
    { value: 'YEARLY', label: 'Yearly' }
  ];

  const handleCustomerSelect = (customer: any) => {
    setSelectedCustomer(customer);
    setCustomerQuery('');
    clearSearch();
  };

  // Note: Toggle functions removed - now using single selection

  // Filter products by search term
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Map frontend trigger types to backend format
      let backendTriggerType: TriggerType;
      if (triggerType === 'COUPON_CODE') {
        backendTriggerType = 'COUPON_CODE';
      } else {
        // AUTO_APPLY - map based on scope
        if (autoApplyScope === 'PRODUCT') {
          backendTriggerType = 'AUTOMATIC_PRODUCT';
        } else if (autoApplyScope === 'CATEGORY') {
          backendTriggerType = 'AUTOMATIC_CATEGORY';
        } else {
          // ALL - use AUTOMATIC_PRODUCT but with empty product/category arrays
          backendTriggerType = 'AUTOMATIC_PRODUCT';
        }
      }

      // Determine applicable products and categories based on scope
      let applicableProducts: string[] = [];
      let applicableCategories: string[] = [];
      
      if (applicationMethod === 'AUTO_APPLY') {
        if (autoApplyScope === 'PRODUCT') {
          applicableProducts = selectedProducts;
        } else if (autoApplyScope === 'CATEGORY') {
          applicableCategories = selectedCategories;
        }
        // For 'ALL', both arrays stay empty
      }

      const periodLimitValue = formData.periodLimit ? parseInt(formData.periodLimit) : null;
      const periodWindowDaysValue =
        periodWindowType === 'ROLLING' && formData.periodWindowDays
          ? parseInt(formData.periodWindowDays)
          : null;
      const periodTypeValue =
        periodWindowType === 'CALENDAR' && formData.periodType ? formData.periodType : null;

      if (periodLimitValue && !periodWindowDaysValue && !periodTypeValue) {
        alert('Select a period window when setting a usage limit per period.');
        return;
      }

      const discountData = {
        ...formData,
        discountType,
        triggerType: backendTriggerType,
        value: parseFloat(formData.value) || 0,
        applicableProducts,
        applicableCategories,
        minimumOrder: formData.minimumOrder ? parseFloat(formData.minimumOrder) : null,
        minimumQuantity: formData.minimumQuantity ? parseInt(formData.minimumQuantity) : null,
        maximumQuantity: formData.maximumQuantity ? parseInt(formData.maximumQuantity) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
        perCustomerLimit: formData.perCustomerLimit ? parseInt(formData.perCustomerLimit) : null,
        periodLimit: periodLimitValue,
        periodType: periodLimitValue ? periodTypeValue : null,
        periodWindowDays: periodLimitValue ? periodWindowDaysValue : null,
        customerId: selectedCustomer?.id || null,
        priority: parseInt(formData.priority) || 1,
        autoApply: applicationMethod === 'AUTO_APPLY',
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        // Handle Buy X Get Y specific data
        buyXGetYFree: discountType === 'BUY_X_GET_Y_FREE' ? {
          buy: parseInt(formData.buyQuantity) || 1,
          get: parseInt(formData.getQuantity) || 1,
          freeType: formData.freeType
        } : null
      };

      const url = editingDiscount ? `/api/discounts/${editingDiscount.id}` : '/api/discounts';
      const method = editingDiscount ? 'PUT' : 'POST';
      
      const response = method === 'PUT'
        ? await apiClient.put(url, discountData)
        : await apiClient.post(url, discountData);

      if (response.status >= 200 && response.status < 300) {
        onSuccess();
      } else {
        const error = response.data || {};
        alert(`Failed to create discount: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to create discount:', error);
      alert('Failed to create discount');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingDiscount || !onDelete) return;
    
    setLoading(true);
    try {
      const response = await apiClient.delete(`/api/discounts/${editingDiscount.id}`);

      if (response.status >= 200 && response.status < 300) {
        onDelete(editingDiscount.id);
        onClose();
      } else {
        const error = response.data || {};
        alert(`Failed to delete discount: ${error.error || error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete discount:', error);
      alert('Failed to delete discount');
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
          How should this discount be applied?
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Choose how customers will access this {getDiscountTypeDisplay().toLowerCase()}
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => setTriggerType('COUPON_CODE')}
          className={`w-full p-6 rounded-xl border-2 transition-all ${
            triggerType === 'COUPON_CODE'
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-500/50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              triggerType === 'COUPON_CODE' ? 'border-brand-500' : 'border-gray-300'
            }`}>
              {triggerType === 'COUPON_CODE' && (
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-black dark:text-white">Coupon Code</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Customer enters a code at checkout (e.g., "SUMMER20")
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setTriggerType('AUTOMATIC_PRODUCT')}
          className={`w-full p-6 rounded-xl border-2 transition-all ${
            triggerType === 'AUTOMATIC_PRODUCT'
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-500/50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              triggerType === 'AUTOMATIC_PRODUCT' ? 'border-brand-500' : 'border-gray-300'
            }`}>
              {triggerType === 'AUTOMATIC_PRODUCT' && (
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-black dark:text-white">Automatic Product</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Applies automatically when specific products are added to cart
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setTriggerType('AUTOMATIC_CATEGORY')}
          className={`w-full p-6 rounded-xl border-2 transition-all ${
            triggerType === 'AUTOMATIC_CATEGORY'
              ? 'border-brand-500 bg-brand-500/5'
              : 'border-gray-200 dark:border-gray-700 hover:border-brand-500/50'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              triggerType === 'AUTOMATIC_CATEGORY' ? 'border-brand-500' : 'border-gray-300'
            }`}>
              {triggerType === 'AUTOMATIC_CATEGORY' && (
                <div className="w-3 h-3 rounded-full bg-brand-500"></div>
              )}
            </div>
            <div className="flex-1 text-left">
              <div className="font-semibold text-black dark:text-white">Automatic Category</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Applies automatically for products in selected categories
              </div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="font-semibold text-black dark:text-white">Basic Information</h4>
        
        <InputField
          label="Discount Name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Summer Sale 20% Off"
          required
        />

        <InputField
          label="Description (Optional)"
          type="text"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Internal note about this discount"
        />

        {triggerType === 'COUPON_CODE' && (
          <InputField
            label="Coupon Code"
            type="text"
            value={formData.code}
            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="SUMMER20"
            required
          />
        )}
      </div>

      {/* Discount Value */}
      <div className="space-y-4">
        <h4 className="font-semibold text-black dark:text-white">Discount Value</h4>
        
        {discountType === 'FIXED_AMOUNT' && (
          <InputField
            label="Discount Amount ($)"
            type="number"
            step={0.01}
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder="5.00"
            required
          />
        )}

        {discountType === 'PERCENTAGE' && (
          <InputField
            label="Discount Percentage (%)"
            type="number"
            step={0.01}
            min="0"
            max="100"
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder="20"
            required
          />
        )}

        {discountType === 'SALE_PRICE' && (
          <InputField
            label="Sale Price ($)"
            type="number"
            step={0.01}
            value={formData.value}
            onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
            placeholder="19.99"
            required
          />
        )}

        {discountType === 'BUY_X_GET_Y_FREE' && (
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label="Buy Quantity"
              type="number"
              min="1"
              value={formData.buyQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, buyQuantity: e.target.value }))}
              placeholder="2"
              required
            />
            <InputField
              label="Get Quantity"
              type="number"
              min="1"
              value={formData.getQuantity}
              onChange={(e) => setFormData(prev => ({ ...prev, getQuantity: e.target.value }))}
              placeholder="1"
              required
            />
          </div>
        )}
      </div>

      {/* Usage Limits */}
      <div className="space-y-4">
        <h4 className="font-semibold text-black dark:text-white">Usage Limits (Optional)</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Total Usage Limit"
            type="number"
            value={formData.usageLimit}
            onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
            placeholder="Unlimited"
          />
          <InputField
            label="Per Customer Limit"
            type="number"
            value={formData.perCustomerLimit}
            onChange={(e) => setFormData(prev => ({ ...prev, perCustomerLimit: e.target.value }))}
            placeholder="Unlimited"
          />
        </div>

        <InputField
          label="Minimum Order Amount ($)"
          type="number"
          step={0.01}
          value={formData.minimumOrder}
          onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
          placeholder="No minimum"
        />
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <h4 className="font-semibold text-black dark:text-white">Valid Date Range (Optional)</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Start Date"
            type="datetime-local"
            value={formData.startDate}
            onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <InputField
            label="End Date"
            type="datetime-local"
            value={formData.endDate}
            onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {loading ? 'Creating...' : 'Create Discount'}
        </button>
      </div>
    </form>
  );

  return (
    <>
      <Modal
        isOpen={open}
        onClose={onClose}
        className="max-w-6xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-black dark:text-white">
            {editingDiscount ? 'Edit Discount' : 'Create New Discount'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Configure your discount settings
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Discount Type Selection - Top Row */}
          <div>
            <h4 className="text-lg font-semibold text-black dark:text-white mb-4">Select Discount Type</h4>
            <div className="grid grid-cols-5 gap-4">
              {discountTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setDiscountType(type.id as DiscountType)}
                  className={`p-4 rounded-lg border-2 transition-all text-center ${
                    discountType === type.id
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-brand-500/50'
                  }`}
                >
                  <div className="font-medium text-black dark:text-white text-sm">
                    {type.name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Application Method - Second Row */}
          {discountType && (
            <div>
              <h4 className="text-lg font-semibold text-black dark:text-white mb-4">How should this be applied?</h4>
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                {applicationMethods.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => {
                      setApplicationMethod(method.id as 'COUPON_CODE' | 'AUTO_APPLY');
                      if (method.id === 'COUPON_CODE') {
                        setTriggerType('COUPON_CODE');
                      } else {
                        // For AUTO_APPLY, we'll set the triggerType based on scope later
                        setTriggerType('AUTOMATIC_PRODUCT'); // Default for now
                      }
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-center ${
                      applicationMethod === method.id
                        ? 'border-brand-500 bg-brand-500/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-brand-500/50'
                    }`}
                  >
                    <div className="font-medium text-black dark:text-white text-sm">
                      {method.name}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {method.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Form */}
          {discountType && (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <InputField
                  label="Discount Name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Summer Sale 20% Off"
                  required
                />

                {triggerType === 'COUPON_CODE' && (
                  <InputField
                    label="Coupon Code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="SUMMER20"
                    required
                  />
                )}

                {applicationMethod === 'AUTO_APPLY' && (
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-2">
                      Apply To
                    </label>
                    <Select
                      options={autoApplyScopes}
                      value={autoApplyScope}
                      onChange={(value) => setAutoApplyScope(value as 'ALL' | 'CATEGORY' | 'PRODUCT')}
                      placeholder="Select scope"
                    />
                  </div>
                )}
              </div>

              {/* Product/Category Selection */}
              {applicationMethod === 'AUTO_APPLY' && autoApplyScope !== 'ALL' && (
                <div>
                  <h5 className="text-md font-semibold text-black dark:text-white mb-4">
                    Select {autoApplyScope === 'CATEGORY' ? 'Categories' : 'Products'}
                  </h5>
                  
                  {autoApplyScope === 'CATEGORY' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Select categories this discount applies to ({selectedCategories.length} selected):
                      </p>
                      <div className="space-y-3">
                        {loadingCategories ? (
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                            Loading categories...
                          </div>
                        ) : (
                          <Select
                            options={categories.filter(cat => !selectedCategories.includes(cat.id)).map(category => ({
                              value: category.id,
                              label: category.name
                            }))}
                            value=""
                            onChange={(value) => {
                              if (value && !selectedCategories.includes(value)) {
                                setSelectedCategories(prev => [...prev, value]);
                              }
                            }}
                            placeholder="Add a category"
                          />
                        )}
                        
                        {/* Selected Categories */}
                        {selectedCategories.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Selected categories:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedCategories.map(categoryId => {
                                const category = categories.find(c => c.id === categoryId);
                                return category ? (
                                  <span
                                    key={categoryId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/10 text-brand-500 rounded text-xs"
                                  >
                                    {category.name}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCategories(prev => prev.filter(id => id !== categoryId))}
                                      className="hover:text-brand-500/70"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {autoApplyScope === 'PRODUCT' && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Search and select products this discount applies to ({selectedProducts.length} selected):
                      </p>
                      <div className="space-y-3">
                        <InputField
                          type="text"
                          placeholder="Search products..."
                          value={productSearchTerm}
                          onChange={(e) => setProductSearchTerm(e.target.value)}
                        />
                        {productSearchTerm && (
                          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg">
                            {loadingProducts ? (
                              <div className="flex items-center gap-2 text-sm text-gray-500 p-3">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
                                Loading products...
                              </div>
                            ) : filteredProducts.length === 0 ? (
                              <div className="text-sm text-gray-500 dark:text-gray-400 p-3">
                                No products found matching your search
                              </div>
                            ) : (
                              filteredProducts.filter(product => !selectedProducts.includes(product.id)).map((product) => (
                                <button
                                  key={product.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProducts(prev => [...prev, product.id]);
                                    setProductSearchTerm('');
                                  }}
                                  className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                >
                                  <div className="flex-1">
                                    <span className="text-sm text-black dark:text-white block">
                                      {product.name}
                                    </span>
                                    {product.category && (
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        in {product.category.name}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                        
                        {/* Selected Products */}
                        {selectedProducts.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Selected products:</p>
                            <div className="flex flex-wrap gap-2">
                              {selectedProducts.map(productId => {
                                const product = products.find(p => p.id === productId);
                                return product ? (
                                  <span
                                    key={productId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-brand-500/10 text-brand-500 rounded text-xs"
                                  >
                                    {product.name}
                                    <button
                                      type="button"
                                      onClick={() => setSelectedProducts(prev => prev.filter(id => id !== productId))}
                                      className="hover:text-brand-500/70"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Discount Value */}
              <div className="grid grid-cols-2 gap-6">
                {discountType === 'FIXED_AMOUNT' && (
                  <InputField
                    label="Discount Amount ($)"
                    type="number"
                    step={0.01}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="5.00"
                    required
                  />
                )}

                {discountType === 'PERCENTAGE' && (
                  <InputField
                    label="Discount Percentage (%)"
                    type="number"
                    step={0.01}
                    min="0"
                    max="100"
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="20"
                    required
                  />
                )}

                {discountType === 'SALE_PRICE' && (
                  <InputField
                    label="Sale Price ($)"
                    type="number"
                    step={0.01}
                    value={formData.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="19.99"
                    required
                  />
                )}

                {discountType === 'BUY_X_GET_Y_FREE' && (
                  <>
                    <InputField
                      label="Buy Quantity"
                      type="number"
                      min="1"
                      value={formData.buyQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, buyQuantity: e.target.value }))}
                      placeholder="2"
                      required
                    />
                    <InputField
                      label="Get Quantity"
                      type="number"
                      min="1"
                      value={formData.getQuantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, getQuantity: e.target.value }))}
                      placeholder="1"
                      required
                    />
                  </>
                )}

                <InputField
                  label="Usage Limit (Optional)"
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-6">
                <InputField
                  label="Per Customer Limit (Optional)"
                  type="number"
                  value={formData.perCustomerLimit}
                  onChange={(e) => setFormData(prev => ({ ...prev, perCustomerLimit: e.target.value }))}
                  placeholder="Unlimited"
                />

                <InputField
                  label="Minimum Order Amount (Optional)"
                  type="number"
                  step={0.01}
                  value={formData.minimumOrder}
                  onChange={(e) => setFormData(prev => ({ ...prev, minimumOrder: e.target.value }))}
                  placeholder="No minimum"
                />
              </div>

              {/* Usage Limit Per Period */}
              <div className="space-y-3">
                <h5 className="text-md font-semibold text-black dark:text-white">
                  Usage Limit Per Period (Optional)
                </h5>
                <div className="grid grid-cols-2 gap-6">
                  <InputField
                    label="Uses per period"
                    type="number"
                    value={formData.periodLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodLimit: e.target.value }))}
                    placeholder="Unlimited"
                  />
                  <Select
                    options={periodWindowOptions}
                    value={periodWindowType}
                    onChange={(value) => {
                      const nextType = value as 'NONE' | 'CALENDAR' | 'ROLLING';
                      setPeriodWindowType(nextType);
                      if (nextType === 'NONE') {
                        setFormData(prev => ({
                          ...prev,
                          periodLimit: '',
                          periodType: '',
                          periodWindowDays: ''
                        }));
                      } else if (nextType === 'CALENDAR') {
                        setFormData(prev => ({
                          ...prev,
                          periodType: prev.periodType || 'MONTHLY',
                          periodWindowDays: ''
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          periodType: '',
                          periodWindowDays: prev.periodWindowDays || '30'
                        }));
                      }
                    }}
                    placeholder="Select window"
                  />
                </div>
                {periodWindowType === 'CALENDAR' && (
                  <Select
                    options={periodTypeOptions}
                    value={formData.periodType}
                    onChange={(value) => setFormData(prev => ({ ...prev, periodType: value }))}
                    placeholder="Select calendar period"
                  />
                )}
                {periodWindowType === 'ROLLING' && (
                  <InputField
                    label="Rolling days"
                    type="number"
                    value={formData.periodWindowDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodWindowDays: e.target.value }))}
                    placeholder="30"
                  />
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Examples: 4 uses per 30 days, 1 use per 7 days.
                </p>
              </div>

              {/* Customer Restriction */}
              <div className="space-y-3">
                <h5 className="text-md font-semibold text-black dark:text-white">
                  Restrict to Customer (Optional)
                </h5>
                {loadingCustomer ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">Loading customer...</div>
                ) : selectedCustomer ? (
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[selectedCustomer.email, selectedCustomer.phone].filter(Boolean).join(' • ') || 'No contact info'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(null)}
                      className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <InputField
                      label="Search customers"
                      value={customerQuery}
                      onChange={(e) => setCustomerQuery(e.target.value)}
                      placeholder="Start typing name, phone, or email"
                    />
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700">
                      {isSearchingCustomers ? (
                        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          Searching...
                        </div>
                      ) : customerQuery.length < 3 ? (
                        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          Type at least 3 characters to search.
                        </div>
                      ) : customerResults.length === 0 ? (
                        <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No customers found.
                        </div>
                      ) : (
                        customerResults.map((result) => (
                          <div
                            key={result.id}
                            className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-700"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {result.firstName} {result.lastName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {[result.email, result.phone].filter(Boolean).join(' • ') || 'No contact info'}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCustomerSelect(result)}
                              className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-medium text-white hover:bg-brand-600"
                            >
                              Select
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date Range */}
              <div>
                <h5 className="text-md font-semibold text-black dark:text-white mb-4">
                  Valid Date Range (Optional)
                </h5>
                <div className="grid grid-cols-2 gap-6">
                  <DatePicker
                    id="discount-start-date"
                    label="Start Date"
                    defaultDate={formData.startDate ? formData.startDate.split('T')[0] : undefined}
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        const date = selectedDates[0];
                        const dateStr = date.toISOString().split('T')[0];
                        setFormData(prev => ({ ...prev, startDate: `${dateStr}T00:00` }));
                      } else {
                        setFormData(prev => ({ ...prev, startDate: '' }));
                      }
                    }}
                    placeholder="Select start date"
                  />
                  <DatePicker
                    id="discount-end-date"
                    label="End Date"
                    defaultDate={formData.endDate ? formData.endDate.split('T')[0] : undefined}
                    onChange={(selectedDates) => {
                      if (selectedDates.length > 0) {
                        const date = selectedDates[0];
                        const dateStr = date.toISOString().split('T')[0];
                        setFormData(prev => ({ ...prev, endDate: `${dateStr}T23:59` }));
                      } else {
                        setFormData(prev => ({ ...prev, endDate: '' }));
                      }
                    }}
                    placeholder="Select end date"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
                <div>
                  {editingDiscount && onDelete && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Delete Discount
                    </button>
                  )}
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {loading ? (editingDiscount ? 'Updating...' : 'Creating...') : (editingDiscount ? 'Update Discount' : 'Create Discount')}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        className="max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
            Delete Discount
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete "{editingDiscount?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
