// components/pos/CustomItemModal.tsx - Fixed to use correct hook API
import { useState, useEffect } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import InputField from '@shared/ui/forms/input/InputField';
import Select from '@shared/ui/forms/Select';
import Label from '@shared/ui/forms/Label';
type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (customItem: {
    name: string;
    price: number;
    category?: string;
    reportingCategoryId?: string;
  }) => void;
};

export default function CustomItemModal({ open, onClose, onConfirm }: Props) {
  const [name, setName] = useState('Item');
  const [price, setPrice] = useState('');
  const [selectedReportingCategory, setSelectedReportingCategory] = useState('');
  const [reportingCategories, setReportingCategories] = useState<{ id: string; name: string }[]>([]);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (open) {
      setName('Item');
      setPrice('');
      setSelectedReportingCategory(reportingCategories.length > 0 ? reportingCategories[0].id : '');
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    fetch('/api/settings/reporting-categories')
      .then(r => r.json())
      .then(data => {
        if (data.categories) {
          setReportingCategories(data.categories);
          if (data.categories.length > 0) setSelectedReportingCategory(data.categories[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Product name is required';
    }

    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum <= 0) {
        newErrors.price = 'Price must be a positive number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const customItem = {
      name: name.trim(),
      price: parseFloat(price),
      reportingCategoryId: selectedReportingCategory || undefined
    };

    onConfirm(customItem);
  };

  const handleCancel = () => {
    setName('Item');
    setPrice('');
    setSelectedReportingCategory('');
    setErrors({});
    onClose();
  };

  const reportingCategoryOptions = [
    { value: '', label: 'Select reporting category (optional)' },
    ...reportingCategories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      className="max-w-md"
    >
      <div className="p-6">
        {/* Header */}
        <h2 className="text-xl font-semibold text-black dark:text-white mb-6">Add Custom Item</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <Label htmlFor="customItemName">Product Name *</Label>
            <InputField
              type="text"
              id="customItemName"
              placeholder="Enter product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`focus:border-brand-500 focus:ring-brand-500/20 ${
                errors.name ? 'border-red-500' : ''
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price */}
          <div>
            <Label htmlFor="customItemPrice">Price *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                $
              </span>
              <InputField
                type="number"
                id="customItemPrice"
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={`pl-8 focus:border-brand-500 focus:ring-brand-500/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  errors.price ? 'border-red-500' : ''
                }`}
                autoFocus
                min="0"
                step={0.01}
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Reporting Category */}
          <div>
            <Label htmlFor="customItemReportingCategory">Reporting Category</Label>
            <Select
              options={reportingCategoryOptions}
              value={selectedReportingCategory}
              onChange={(value) => setSelectedReportingCategory(value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}