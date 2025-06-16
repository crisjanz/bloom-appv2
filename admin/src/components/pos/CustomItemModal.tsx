// components/pos/CustomItemModal.tsx - Fixed to use correct hook API
import React, { useState, useEffect } from 'react';
import ComponentCard from '../common/ComponentCard';
import InputField from '../form/input/InputField';
import Select from '../form/Select';
import Label from '../form/Label';
import { useCategories } from '../../hooks/useCategories';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (customItem: {
    name: string;
    price: number;
    category?: string;
  }) => void;
};

export default function CustomItemModal({ open, onClose, onConfirm }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  
  // Fix: Use whatever your useCategories hook actually returns
  // Check your useCategories.ts file and see if it returns 'refetch', 'fetchCategories', or auto-fetches
  const { categories } = useCategories(); // Assuming it auto-fetches like useProducts

  useEffect(() => {
    if (open) {
      // Remove fetchCategories() call since it likely auto-fetches
      // Reset form when modal opens
      setName('');
      setPrice('');
      setSelectedCategory('');
      setErrors({});
    }
  }, [open]);

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
      category: selectedCategory || 'Custom Items'
    };

    onConfirm(customItem);
  };

  const handleCancel = () => {
    setName('');
    setPrice('');
    setSelectedCategory('');
    setErrors({});
    onClose();
  };

  if (!open) return null;

  // Category options for select
  const categoryOptions = [
    { value: '', label: 'Select category (optional)' },
    { value: 'Custom Items', label: 'Custom Items' },
    ...categories.map(cat => ({ value: cat.name, label: cat.name }))
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg shadow-default w-full max-w-md">
        
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-black dark:text-white">Add Custom Item</h2>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Name */}
          <div>
            <Label htmlFor="customItemName">Product Name *</Label>
            <InputField
              type="text"
              id="customItemName"
              placeholder="Enter product name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`focus:border-[#597485] focus:ring-[#597485]/20 ${
                errors.name ? 'border-red-500' : ''
              }`}
              autoFocus
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
                className={`pl-8 focus:border-[#597485] focus:ring-[#597485]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                  errors.price ? 'border-red-500' : ''
                }`}
                min="0"
                step="0.01"
              />
            </div>
            {errors.price && (
              <p className="text-red-500 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="customItemCategory">Category</Label>
            <Select
              options={categoryOptions}
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
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
              className="flex-1 py-3 px-4 bg-[#597485] hover:bg-[#4e6575] text-white rounded-lg font-medium transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}