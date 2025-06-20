import { useState, useEffect } from "react";
import { createCoupon, updateCoupon } from "../../services/couponService";
import { Coupon, CouponFormData, DiscountType } from "../../types/coupon";
import Button from "../../components/ui/button/Button";
import InputField from "../../components/form/input/InputField";
import Label from "../../components/form/Label";

interface CouponFormModalProps {
  coupon?: Coupon | null;
  onClose: (shouldReload?: boolean) => void;
}

export default function CouponFormModal({ coupon, onClose }: CouponFormModalProps) {
  const [formData, setFormData] = useState<CouponFormData>({
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    value: 0,
    usageLimit: undefined,
    perCustomerLimit: undefined,
    startDate: '',
    endDate: '',
    minimumOrder: undefined,
    applicableProducts: [],
    applicableCategories: [],
    posOnly: false,
    webOnly: false,
    enabled: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code,
        name: coupon.name,
        description: coupon.description || '',
        discountType: coupon.discountType,
        value: coupon.value,
        usageLimit: coupon.usageLimit,
        perCustomerLimit: coupon.perCustomerLimit,
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
        endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
        minimumOrder: coupon.minimumOrder,
        applicableProducts: coupon.applicableProducts,
        applicableCategories: coupon.applicableCategories,
        posOnly: coupon.posOnly,
        webOnly: coupon.webOnly,
        enabled: coupon.enabled,
      });
    }
  }, [coupon]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Coupon code is required';
    } else if (!/^[A-Z0-9_-]+$/.test(formData.code)) {
      newErrors.code = 'Code must contain only uppercase letters, numbers, hyphens, and underscores';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Coupon name is required';
    }

    if (formData.value <= 0) {
      newErrors.value = 'Discount value must be greater than 0';
    }

    if (formData.discountType === 'PERCENTAGE' && formData.value > 100) {
      newErrors.value = 'Percentage discount cannot exceed 100%';
    }

    if (formData.usageLimit !== undefined && formData.usageLimit <= 0) {
      newErrors.usageLimit = 'Usage limit must be greater than 0';
    }

    if (formData.perCustomerLimit !== undefined && formData.perCustomerLimit <= 0) {
      newErrors.perCustomerLimit = 'Per customer limit must be greater than 0';
    }

    if (formData.minimumOrder !== undefined && formData.minimumOrder < 0) {
      newErrors.minimumOrder = 'Minimum order amount cannot be negative';
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date';
    }

    if (formData.posOnly && formData.webOnly) {
      newErrors.posOnly = 'Cannot be both POS-only and Web-only';
      newErrors.webOnly = 'Cannot be both POS-only and Web-only';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    
    try {
      // Clean up the form data
      const submitData = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        usageLimit: formData.usageLimit || undefined,
        perCustomerLimit: formData.perCustomerLimit || undefined,
        minimumOrder: formData.minimumOrder || undefined,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      if (coupon) {
        await updateCoupon(coupon.id, submitData);
      } else {
        await createCoupon(submitData);
      }
      
      onClose(true); // Signal successful save
    } catch (error: any) {
      console.error('Error saving coupon:', error);
      setErrors({ submit: error.message || 'Failed to save coupon' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof CouponFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl mx-4">
        <div className="sticky top-0 bg-white dark:bg-gray-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {coupon ? 'Edit Coupon' : 'Create New Coupon'}
            </h2>
            <button
              onClick={() => onClose()}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Basic Information */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code">Coupon Code *</Label>
                <InputField
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER20"
                  error={errors.code}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Only uppercase letters, numbers, hyphens, and underscores
                </p>
              </div>
              
              <div>
                <Label htmlFor="name">Display Name *</Label>
                <InputField
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Summer Sale 20% Off"
                  error={errors.name}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="description">Description (Optional)</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Internal description for admin reference"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
              />
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Discount Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discountType">Discount Type *</Label>
                <select
                  id="discountType"
                  value={formData.discountType}
                  onChange={(e) => handleInputChange('discountType', e.target.value as DiscountType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="PERCENTAGE">Percentage Off</option>
                  <option value="FIXED_AMOUNT">Fixed Amount Off</option>
                  <option value="FREE_SHIPPING">Free Shipping</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="value">
                  {formData.discountType === 'PERCENTAGE' ? 'Percentage (%)' : 
                   formData.discountType === 'FIXED_AMOUNT' ? 'Amount ($)' : 
                   'Value (Leave as 0 for free shipping)'}
                  *
                </Label>
                <InputField
                  id="value"
                  type="number"
                  step={formData.discountType === 'PERCENTAGE' ? '0.01' : '0.01'}
                  min="0"
                  max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                  value={formData.value}
                  onChange={(e) => handleInputChange('value', parseFloat(e.target.value) || 0)}
                  error={errors.value}
                  disabled={formData.discountType === 'FREE_SHIPPING'}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label htmlFor="minimumOrder">Minimum Order Amount (Optional)</Label>
              <InputField
                id="minimumOrder"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimumOrder || ''}
                onChange={(e) => handleInputChange('minimumOrder', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g., 50.00"
                error={errors.minimumOrder}
              />
              <p className="text-xs text-gray-500 mt-1">
                Customer must spend at least this amount to use the coupon
              </p>
            </div>
          </div>

          {/* Usage Limits */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Usage Limits
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="usageLimit">Total Usage Limit (Optional)</Label>
                <InputField
                  id="usageLimit"
                  type="number"
                  min="1"
                  value={formData.usageLimit || ''}
                  onChange={(e) => handleInputChange('usageLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 100"
                  error={errors.usageLimit}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum number of times this coupon can be used (leave empty for unlimited)
                </p>
              </div>
              
              <div>
                <Label htmlFor="perCustomerLimit">Per Customer Limit (Optional)</Label>
                <InputField
                  id="perCustomerLimit"
                  type="number"
                  min="1"
                  value={formData.perCustomerLimit || ''}
                  onChange={(e) => handleInputChange('perCustomerLimit', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g., 1"
                  error={errors.perCustomerLimit}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum uses per customer (leave empty for unlimited)
                </p>
              </div>
            </div>
          </div>

          {/* Validity Period */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Validity Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date (Optional)</Label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When the coupon becomes active (leave empty for immediate)
                </p>
              </div>
              
              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                {errors.endDate && (
                  <p className="text-xs text-red-600 mt-1">{errors.endDate}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  When the coupon expires (leave empty for no expiration)
                </p>
              </div>
            </div>
          </div>

          {/* Channel Restrictions */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Channel Restrictions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="posOnly"
                  checked={formData.posOnly}
                  onChange={(e) => handleInputChange('posOnly', e.target.checked)}
                  className="mr-2"
                />
                <Label htmlFor="posOnly" className="mb-0">POS Terminal Only</Label>
                {errors.posOnly && (
                  <p className="text-xs text-red-600 ml-2">{errors.posOnly}</p>
                )}
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="webOnly"
                  checked={formData.webOnly}
                  onChange={(e) => handleInputChange('webOnly', e.target.checked)}
                  className="mr-2"
                />
                <Label htmlFor="webOnly" className="mb-0">Website Only</Label>
                {errors.webOnly && (
                  <p className="text-xs text-red-600 ml-2">{errors.webOnly}</p>
                )}
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Leave both unchecked to allow usage on all channels
            </p>
          </div>

          {/* Status */}
          <div className="mb-6">
            <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
              Status
            </h3>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                className="mr-2"
              />
              <Label htmlFor="enabled" className="mb-0">Enable this coupon</Label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Disabled coupons cannot be used but remain in the system
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button 
              type="submit" 
              disabled={saving}
              className="bg-[#597485] hover:bg-[#4e6575] text-white"
            >
              {saving ? 'Saving...' : coupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
            <Button 
              type="button" 
              onClick={() => onClose()}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}