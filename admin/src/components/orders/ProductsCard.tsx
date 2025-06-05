// src/components/orders/ProductsCard.tsx
import React, { useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";
import Checkbox from "../form/input/Checkbox";

type Product = {
  description: string;
  category: string;
  price: string;
  qty: string;
  tax: boolean;
};

type Props = {
  customProducts: Product[];
  handleProductChange: (index: number, field: string, value: any) => void;
  handleAddCustomProduct: () => void;
  calculateRowTotal: (price: string, qty: string) => string;
};

export default function ProductsCard({
  customProducts,
  handleProductChange,
  handleAddCustomProduct,
  calculateRowTotal,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data || []))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);
  
  // Search products when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        setIsSearching(true);
        fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => res.json())
          .then((data) => setSearchResults(data || []))
          .catch((err) => console.error("Failed to search products:", err))
          .finally(() => setIsSearching(false));
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);
  
  const handleRemoveProduct = (index: number) => {
    if (customProducts.length === 1) {
      // Clear the only product instead of removing
      handleProductChange(0, "description", "");
      handleProductChange(0, "category", "");
      handleProductChange(0, "price", "");
      handleProductChange(0, "qty", "1");
      handleProductChange(0, "tax", true);
    } else {
      const updated = [...customProducts];
      updated.splice(index, 1);
      // This is a bit hacky but we need to trigger the parent update
      handleProductChange(-1, "removeAt", index);
    }
  };

  const calculateSubtotal = () => {
    return customProducts.reduce((total, item) => {
      return total + parseFloat(item.price || "0") * parseInt(item.qty || "0");
    }, 0);
  };

  const calculateTaxTotal = () => {
    return customProducts.reduce((total, item) => {
      if (item.tax) {
        const itemTotal = parseFloat(item.price || "0") * parseInt(item.qty || "0");
        return total + (itemTotal * 0.12); // 12% tax (5% GST + 7% PST)
      }
      return total;
    }, 0);
  };

  return (
    <ComponentCard title="Products & Items">
      {/* Header with Add Button and Search */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={handleAddCustomProduct}
          className="inline-flex items-center justify-center rounded-md py-2 px-4 text-center font-medium text-white hover:bg-opacity-90"
          style={{ backgroundColor: '#597485' }}
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Add Item
        </button>
        
        {/* Product Search */}
        <div className="w-full max-w-md relative">
          <InputField
            type="text"
            placeholder="Search for products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <div className="absolute right-3 top-3 text-gray-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
          
          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-60 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    // Find first empty row or add new one
                    const emptyIndex = customProducts.findIndex(p => !p.description);
                    if (emptyIndex >= 0) {
                      handleProductChange(emptyIndex, "description", product.name);
                      handleProductChange(emptyIndex, "category", product.categoryId);
                      handleProductChange(emptyIndex, "price", product.defaultPrice || "0");
                    } else {
                      handleAddCustomProduct();
                      setTimeout(() => {
                        const newIndex = customProducts.length;
                        handleProductChange(newIndex, "description", product.name);
                        handleProductChange(newIndex, "category", product.categoryId);
                        handleProductChange(newIndex, "price", product.defaultPrice || "0");
                      }, 100);
                    }
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="px-5 py-3 text-sm hover:bg-gray-2 cursor-pointer border-b border-stroke last:border-b-0 dark:hover:bg-meta-4 dark:border-strokedark"
                >
                  <div className="font-medium text-black dark:text-white">{product.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ${product.defaultPrice || "0.00"} • {product.categoryName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[200px] py-4 px-4 font-medium text-black dark:text-white">
                Description
              </th>
              <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">
                Category
              </th>
              <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white text-right">
                Unit Price
              </th>
              <th className="min-w-[80px] py-4 px-4 font-medium text-black dark:text-white text-right">
                Qty
              </th>
              <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white text-right">
                Total
              </th>
              <th className="min-w-[80px] py-4 px-4 font-medium text-black dark:text-white text-center">
                Tax
              </th>
              <th className="py-4 px-4 font-medium text-black dark:text-white text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {customProducts.map((item, idx) => {
              const itemTotal = parseFloat(item.price || "0") * parseInt(item.qty || "0");
              const taxAmount = item.tax ? itemTotal * 0.12 : 0;

              return (
                <tr key={idx} className="border-b border-stroke dark:border-strokedark">
                  {/* Description */}
                  <td className="py-5 px-4">
                    <InputField
                      type="text"
                      placeholder="Enter item description..."
                      value={item.description}
                      onChange={(e) =>
                        handleProductChange(idx, "description", e.target.value)
                      }
                    />
                  </td>

                  {/* Category */}
                  <td className="py-5 px-4">
                    <Select
                      options={[
                        { value: "", label: "Select category" },
                        ...categories.map(cat => ({
                          value: cat.id,
                          label: cat.name
                        }))
                      ]}
                      value={item.category}
                      placeholder="Select category"
                      onChange={(value) =>
                        handleProductChange(idx, "category", value)
                      }
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="py-5 px-4">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400">
                        $
                      </span>
                      <InputField
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-8 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.price}
                        onChange={(e) =>
                          handleProductChange(idx, "price", e.target.value)
                        }
                      />
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-5 px-4">
                    <InputField
                      type="number"
                      min="1"
                      placeholder="1"
                      className="text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={item.qty}
                      onChange={(e) =>
                        handleProductChange(idx, "qty", e.target.value)
                      }
                    />
                  </td>

                  {/* Total */}
                  <td className="py-5 px-4 text-right">
                    <div className="font-medium text-black dark:text-white">
                      ${calculateRowTotal(item.price, item.qty)}
                    </div>
                    {item.tax && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +${taxAmount.toFixed(2)} tax
                      </div>
                    )}
                  </td>

                  {/* Tax Checkbox */}
                  <td className="py-5 px-4">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={item.tax}
                        onChange={(checked) =>
                          handleProductChange(idx, "tax", checked)
                        }
                        className="checked:bg-[#597485] checked:border-[#597485]"
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-5 px-4">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={customProducts.length === 1 ? "Clear item" : "Remove item"}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-6 flex justify-end">
        <div className="w-full max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
            <span className="font-medium text-black dark:text-white">
              ${calculateSubtotal().toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Tax (12%):</span>
            <span className="font-medium text-black dark:text-white">
              ${calculateTaxTotal().toFixed(2)}
            </span>
          </div>
          <div className="border-t border-stroke pt-2 dark:border-strokedark">
            <div className="flex justify-between">
              <span className="font-medium text-black dark:text-white">Total:</span>
              <span className="text-lg font-semibold text-black dark:text-white">
                ${(calculateSubtotal() + calculateTaxTotal()).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
}