// src/components/settings/discounts/CouponListCard.tsx
import React, { useState, useEffect } from "react";
import ComponentCard from "../../common/ComponentCard";
import Button from "../../ui/button/Button";
import InputField from "../../form/input/InputField";
import TextArea from "../../form/input/TextArea";
import Select from "../../form/Select";
import Checkbox from "../../form/input/Checkbox";
import Label from "../../form/Label";
import { fetchCoupons, createCoupon, updateCoupon, deleteCoupon } from "../../../services/couponService";
import type { Coupon, CouponFormData, DiscountType } from "../../../types/coupon";

const CouponListCard = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  // Form state
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
    enabled: true
  });

  // Load coupons on mount
  useEffect(() => {
    loadCoupons();
  }, []);

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await fetchCoupons();
      setCoupons(data);
    } catch (err) {
      setError('Failed to load coupons');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
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
      enabled: true
    });
    setEditingCoupon(null);
    setShowForm(false);
    setError('');
  };

  const handleEdit = (coupon: Coupon) => {
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discountType: coupon.discountType as DiscountType,
      value: coupon.value,
      usageLimit: coupon.usageLimit || undefined,
      perCustomerLimit: coupon.perCustomerLimit || undefined,
      startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
      endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
      minimumOrder: coupon.minimumOrder || undefined,
      applicableProducts: coupon.applicableProducts,
      applicableCategories: coupon.applicableCategories,
      posOnly: coupon.posOnly,
      webOnly: coupon.webOnly,
      enabled: coupon.enabled
    });
    setEditingCoupon(coupon);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingCoupon) {
        await updateCoupon(editingCoupon.id, formData);
      } else {
        await createCoupon(formData);
      }
      await loadCoupons();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (coupon: Coupon) => {
    if (!confirm(`Are you sure you want to delete the coupon "${coupon.code}"?`)) {
      return;
    }

    try {
      await deleteCoupon(coupon.id);
      await loadCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to delete coupon');
    }
  };

  const toggleEnabled = async (coupon: Coupon) => {
    try {
      await updateCoupon(coupon.id, { enabled: !coupon.enabled });
      await loadCoupons();
    } catch (err: any) {
      setError(err.message || 'Failed to update coupon');
    }
  };

  const discountTypeOptions = [
    { value: 'PERCENTAGE', label: 'Percentage (%)' },
    { value: 'FIXED_AMOUNT', label: 'Fixed Amount ($)' },
    { value: 'FREE_SHIPPING', label: 'Free Shipping' }
  ];

  return (
    <ComponentCard title="Coupon Management">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage coupon codes for discounts and promotions
          </p>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-[#597485] hover:bg-[#597485]/90"
          >
            {showForm ? 'Cancel' : 'Add Coupon'}
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="border border-stroke rounded-lg p-6 dark:border-strokedark bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-medium text-black dark:text-white mb-4">
              {editingCoupon ? 'Edit Coupon' : 'Add New Coupon'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coupon Code */}
                <div>
                  <Label htmlFor="code">Coupon Code *</Label>
                  <InputField
                    id="code"
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., SAVE20"
                    required
                  />
                </div>

                {/* Coupon Name */}
                <div>
                  <Label htmlFor="name">Display Name *</Label>
                  <InputField
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Spring Sale 20% Off"
                    required
                  />
                </div>

                {/* Discount Type */}
                <div>
                  <Label htmlFor="discountType">Discount Type *</Label>
                  <Select
                    options={discountTypeOptions}
                    value={formData.discountType}
                    onChange={(value) => setFormData({ ...formData, discountType: value as DiscountType })}
                  />
                </div>

                {/* Discount Value */}
                <div>
                  <Label htmlFor="value">
                    {formData.discountType === 'PERCENTAGE' ? 'Percentage (%)' : 
                     formData.discountType === 'FIXED_AMOUNT' ? 'Amount ($)' : 'Value'} *
                  </Label>
                  <InputField
                    id="value"
                    type="number"
                    value={formData.value.toString()}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '25.00'}
                    min="0"
                    step={formData.discountType === 'PERCENTAGE' ? '1' : '0.01'}
                    required
                    disabled={formData.discountType === 'FREE_SHIPPING'}
                  />
                </div>

                {/* Usage Limit */}
                <div>
                  <Label htmlFor="usageLimit">Total Usage Limit</Label>
                  <InputField
                    id="usageLimit"
                    type="number"
                    value={formData.usageLimit?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                </div>

                {/* Per Customer Limit */}
                <div>
                  <Label htmlFor="perCustomerLimit">Per Customer Limit</Label>
                  <InputField
                    id="perCustomerLimit"
                    type="number"
                    value={formData.perCustomerLimit?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Leave empty for unlimited"
                    min="1"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <InputField
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                {/* End Date */}
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <InputField
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>

                {/* Minimum Order */}
                <div>
                  <Label htmlFor="minimumOrder">Minimum Order Amount ($)</Label>
                  <InputField
                    id="minimumOrder"
                    type="number"
                    value={formData.minimumOrder?.toString() || ''}
                    onChange={(e) => setFormData({ ...formData, minimumOrder: e.target.value ? parseFloat(e.target.value) : undefined })}
                    placeholder="e.g., 50.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Internal notes about this coupon..."
                  rows={2}
                />
              </div>

              {/* Channel Restrictions */}
              <div className="space-y-2">
                <Label>Channel Restrictions</Label>
                <div className="flex gap-4">
                  <Checkbox
                    checked={formData.posOnly}
                    onChange={(checked) => setFormData({ ...formData, posOnly: checked, webOnly: checked ? false : formData.webOnly })}
                    label="POS Only"
                    className="checked:bg-[#597485] checked:border-[#597485]"
                  />
                  <Checkbox
                    checked={formData.webOnly}
                    onChange={(checked) => setFormData({ ...formData, webOnly: checked, posOnly: checked ? false : formData.posOnly })}
                    label="Website Only"
                    className="checked:bg-[#597485] checked:border-[#597485]"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <Checkbox
                  checked={formData.enabled}
                  onChange={(checked) => setFormData({ ...formData, enabled: checked })}
                  label="Enabled"
                  className="checked:bg-[#597485] checked:border-[#597485]"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#597485] hover:bg-[#597485]/90"
                >
                  {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                </Button>
                <Button
                  type="button"
                  onClick={resetForm}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Coupons List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-[#597485] border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading coupons...</p>
            </div>
          ) : coupons.length === 0 ? (
            <div className="text-center py-8 text-gray-600 dark:text-gray-400">
              <p>No coupons created yet.</p>
              <p className="text-sm">Click "Add Coupon" to create your first coupon.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Code</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Name</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Discount</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Usage</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon, index) => (
                    <tr key={coupon.id} className={index % 2 === 0 ? 'bg-white dark:bg-boxdark' : 'bg-gray-2 dark:bg-meta-4'}>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <p className="text-black dark:text-white font-medium">{coupon.code}</p>
                        {(coupon.posOnly || coupon.webOnly) && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {coupon.posOnly ? 'POS Only' : 'Website Only'}
                          </p>
                        )}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <p className="text-black dark:text-white">{coupon.name}</p>
                        {coupon.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{coupon.description}</p>
                        )}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {coupon.discountType === 'PERCENTAGE' ? `${coupon.value}%` :
                           coupon.discountType === 'FIXED_AMOUNT' ? `$${coupon.value}` :
                           'Free Shipping'}
                        </p>
                        {coupon.minimumOrder && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">Min: ${coupon.minimumOrder}</p>
                        )}
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <p className="text-black dark:text-white">
                          {coupon.usageCount}{coupon.usageLimit ? `/${coupon.usageLimit}` : ''}
                        </p>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <button
                          onClick={() => toggleEnabled(coupon)}
                          className={`inline-flex rounded-full py-1 px-3 text-xs font-medium ${
                            coupon.enabled
                              ? 'bg-success bg-opacity-10 text-success'
                              : 'bg-danger bg-opacity-10 text-danger'
                          }`}
                        >
                          {coupon.enabled ? 'Active' : 'Disabled'}
                        </button>
                      </td>
                      <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                        <div className="flex items-center space-x-3.5">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="hover:text-primary"
                            title="Edit"
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18">
                              <path d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.20624 8.99981 3.20624C14.5686 3.20624 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.2656 8.99981 13.2656C13.1061 13.2656 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.73436 8.99981 4.73436C4.89356 4.73436 2.4748 7.95936 1.85605 8.99999Z"/>
                              <path d="M9 11.3906C7.67812 11.3906 6.60938 10.3219 6.60938 9C6.60938 7.67813 7.67812 6.60938 9 6.60938C10.3219 6.60938 11.3906 7.67813 11.3906 9C11.3906 10.3219 10.3219 11.3906 9 11.3906ZM9 8.10938C8.50313 8.10938 8.10938 8.50313 8.10938 9C8.10938 9.49688 8.50313 9.89063 9 9.89063C9.49688 9.89063 9.89063 9.49688 9.89063 9C9.89063 8.50313 9.49688 8.10938 9 8.10938Z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(coupon)}
                            className="hover:text-danger"
                            title="Delete"
                            disabled={coupon.usageCount > 0}
                          >
                            <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18">
                              <path d="M13.7535 2.47502H11.5879V1.9969C11.5879 1.15315 10.9129 0.478149 10.0691 0.478149H7.90352C7.05977 0.478149 6.38477 1.15315 6.38477 1.9969V2.47502H4.21914C3.40352 2.47502 2.72852 3.15002 2.72852 3.96565V4.8094C2.72852 5.42815 3.09414 5.9344 3.62852 6.1594L4.07852 15.4688C4.13477 16.6219 5.09102 17.5219 6.24414 17.5219H11.7004C12.8535 17.5219 13.8098 16.6219 13.866 15.4688L14.3441 6.13127C14.8785 5.90627 15.2441 5.3719 15.2441 4.78127V3.93752C15.2441 3.15002 14.5691 2.47502 13.7535 2.47502ZM7.67852 1.9969C7.67852 1.85627 7.79102 1.74377 7.93164 1.74377H10.0973C10.2379 1.74377 10.3504 1.85627 10.3504 1.9969V2.47502H7.70664V1.9969H7.67852ZM4.02227 3.96565C4.02227 3.85315 4.10664 3.74065 4.24727 3.74065H13.7535C13.866 3.74065 13.9785 3.82502 13.9785 3.96565V4.8094C13.9785 4.9219 13.8941 5.0344 13.7535 5.0344H4.24727C4.13477 5.0344 4.02227 4.95002 4.02227 4.8094V3.96565ZM11.7285 16.2563H6.27227C5.79414 16.2563 5.40039 15.8906 5.37227 15.3844L4.95039 6.2969H13.0785L12.6566 15.3844C12.6004 15.8625 12.2066 16.2563 11.7285 16.2563Z"/>
                              <path d="M9.00039 9.11255C8.66289 9.11255 8.35352 9.3938 8.35352 9.75942V13.3313C8.35352 13.6688 8.63477 13.9782 9.00039 13.9782C9.33789 13.9782 9.64727 13.6969 9.64727 13.3313V9.75942C9.64727 9.3938 9.33789 9.11255 9.00039 9.11255Z"/>
                              <path d="M11.2502 9.67504C10.8846 9.64692 10.6033 9.90004 10.5752 10.2657L10.4064 12.7407C10.3783 13.0782 10.6314 13.3875 10.9971 13.4157C11.0252 13.4157 11.0252 13.4157 11.0533 13.4157C11.3908 13.4157 11.6721 13.1625 11.6721 12.825L11.8408 10.35C11.8408 9.98442 11.5877 9.70317 11.2502 9.67504Z"/>
                              <path d="M6.72245 9.67504C6.38495 9.70317 6.1037 10.0125 6.13182 10.35L6.3287 12.825C6.35683 13.1625 6.63808 13.4157 6.94745 13.4157C6.97558 13.4157 6.97558 13.4157 7.0037 13.4157C7.34120 13.3875 7.62245 13.0782 7.59433 12.7407L7.39745 10.2657C7.39745 9.90004 7.08808 9.64692 6.72245 9.67504Z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ComponentCard>
  );
};

export default CouponListCard;