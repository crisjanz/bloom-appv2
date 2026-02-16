import { useState, useEffect, useRef } from 'react';
import { Modal } from '@shared/ui/components/ui/modal';
import Select from '@shared/ui/forms/Select';

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
  const priceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName('Item');
      setPrice('');
      setSelectedReportingCategory(reportingCategories.length > 0 ? reportingCategories[0].id : '');
      setErrors({});
      // Focus price field after modal opens
      setTimeout(() => priceRef.current?.focus(), 100);
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

  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setPrice(cleaned);
  };

  const reportingCategoryOptions = [
    { value: '', label: 'None' },
    ...reportingCategories.map(cat => ({ value: cat.id, label: cat.name }))
  ];

  return (
    <Modal
      isOpen={open}
      onClose={handleCancel}
      className="max-w-md"
    >
      {/* Header — matches ProductVariantModal */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-2">
              Custom Item
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter item details and price
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="p-6 space-y-4">
          {/* Name — styled as a variant-like row */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Item Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl border bg-transparent text-black dark:text-white font-medium transition-all duration-200 focus:outline-none focus:border-brand-500 ${
                errors.name
                  ? 'border-red-500'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Price — large, prominent input matching variant price style */}
          <div>
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
              Price
            </label>
            <div
              className={`flex items-center px-4 py-3 rounded-xl border transition-all duration-200 focus-within:border-brand-500 ${
                errors.price
                  ? 'border-red-500'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <span className="text-lg font-bold text-brand-500">$</span>
              <input
                ref={priceRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={price}
                onChange={(e) => handlePriceChange(e.target.value)}
                className="flex-1 text-lg font-bold text-brand-500 bg-transparent border-none outline-none ml-1 p-0 m-0 placeholder-gray-400 dark:placeholder-gray-600"
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Reporting Category */}
          {reportingCategories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 block">
                Reporting Category
              </label>
              <Select
                options={reportingCategoryOptions}
                value={selectedReportingCategory}
                onChange={(value) => setSelectedReportingCategory(value)}
              />
            </div>
          )}
        </div>

        {/* Footer — matches ProductVariantModal */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </form>
    </Modal>
  );
}