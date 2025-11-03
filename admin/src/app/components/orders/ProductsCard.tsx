// src/components/orders/ProductsCard.tsx
import { useState, useEffect } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import Label from "@shared/ui/forms/Label";
import Checkbox from "@shared/ui/forms/input/Checkbox";
import { useTaxRates } from "@shared/hooks/useTaxRates";
import ProductVariantModal from "../pos/ProductVariantModal";
import { useApiClient } from "@shared/hooks/useApiClient";



type Product = {
  description: string;
  category: string;
  price: string;
  qty: string;
  tax: boolean;
  productId?: string;
};

type AddOnProductSummary = {
  assignmentId: string;
  productId: string;
  product: {
    id: string;
    name: string;
    price: number | null;
    isTaxable: boolean;
    reportingCategoryId?: string | null;
  } | null;
};

type AddOnGroupDetail = {
  id: string;
  name: string;
  isDefault: boolean;
  addOns: AddOnProductSummary[];
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
  const [addOnPanel, setAddOnPanel] = useState<{
    productId: string;
    productName: string;
    groups: AddOnGroupDetail[];
  } | null>(null);
  const [addOnSelections, setAddOnSelections] = useState<Record<string, string[]>>({});
  const [addOnLoading, setAddOnLoading] = useState(false);
  const [addOnError, setAddOnError] = useState<string | null>(null);
  
  // Variant modal state
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState(null);
  const [pendingProductIndex, setPendingProductIndex] = useState<number | null>(null);

  // Get centralized tax rates
  const { calculateTax, individualTaxRates } = useTaxRates();

  // API client for making requests
  const apiClient = useApiClient();

  // Helper function to check if product has variants
  const hasMultipleVariants = (product: any) => {
    console.log('🔍 Checking variants for product:', product.name);
    console.log('📦 Product variants:', product.variants);
    
    const hasVariants = product.variants && product.variants.length > 1 && 
           product.variants.some((v: any) => !v.isDefault);
    
    console.log('✅ Has multiple variants:', hasVariants);
    return hasVariants;
  };

  // Helper function to add product to form
  const addProductToForm = (product: any, selectedVariant?: any) => {
    const emptyIndex = customProducts.findIndex(p => !p.description);
    const productName = selectedVariant ? `${product.name} - ${selectedVariant.name}` : product.name;
    const productPrice = selectedVariant ? selectedVariant.calculatedPrice || selectedVariant.price / 100 : product.defaultPrice;

    if (emptyIndex >= 0) {
      handleProductChange(emptyIndex, "description", productName);
      handleProductChange(emptyIndex, "category", product.reportingCategoryId);
      handleProductChange(emptyIndex, "price", productPrice.toFixed(2));
      handleProductChange(emptyIndex, "productId", product.id); // Store actual product ID
    } else {
      handleAddCustomProduct();
      setTimeout(() => {
        const newIndex = customProducts.length;
        handleProductChange(newIndex, "description", productName);
        handleProductChange(newIndex, "category", product.reportingCategoryId);
        handleProductChange(newIndex, "price", productPrice.toFixed(2));
        handleProductChange(newIndex, "productId", product.id); // Store actual product ID
      }, 100);
    }

    if (Array.isArray(product.addOnGroupIds) && product.addOnGroupIds.length > 0) {
      fetchAddOnGroups(product);
    } else {
      setAddOnPanel(null);
      setAddOnSelections({});
      setAddOnError(null);
    }
  };

  const addAddOnProductToForm = (product: {
    id: string;
    name: string;
    price: number | null;
    isTaxable: boolean;
    reportingCategoryId?: string | null;
  }) => {
    const priceValue = typeof product.price === "number" && Number.isFinite(product.price)
      ? product.price
      : 0;
    const priceString = priceValue.toFixed(2);
    const category = product.reportingCategoryId ?? "";
    const taxable = Boolean(product.isTaxable);

    const emptyIndex = customProducts.findIndex((p) => !p.description);

    const applyValues = (index: number) => {
      handleProductChange(index, "description", product.name);
      handleProductChange(index, "category", category);
      handleProductChange(index, "price", priceString);
      handleProductChange(index, "productId", product.id);
      handleProductChange(index, "tax", taxable);
    };

    if (emptyIndex >= 0) {
      applyValues(emptyIndex);
    } else {
      handleAddCustomProduct();
      setTimeout(() => {
        const newIndex = customProducts.length;
        applyValues(newIndex);
      }, 100);
    }
  };

  const fetchAddOnGroups = async (product: any) => {
    setAddOnLoading(true);
    setAddOnError(null);
    try {
      const data = await apiClient.get(`/api/addon-groups/by-product/${product.id}`);
      const groups: AddOnGroupDetail[] = Array.isArray(data)
        ? data
            .map((group: any) => {
              const addOns: AddOnProductSummary[] = Array.isArray(group?.addOns)
                ? group.addOns
                    .filter((item: any) => item?.product && item.product.id)
                    .map((item: any) => ({
                      assignmentId: String(item.assignmentId ?? item.productId ?? ""),
                      productId: String(item.product?.id ?? item.productId ?? ""),
                      product: item.product
                        ? {
                            id: String(item.product.id),
                            name: String(item.product.name ?? "Add-on"),
                            price:
                              typeof item.product.price === "number"
                                ? item.product.price
                                : null,
                            isTaxable: Boolean(item.product.isTaxable ?? true),
                            reportingCategoryId: item.product.reportingCategoryId ?? null,
                          }
                        : null,
                    }))
                : [];
              return {
                id: String(group.id),
                name: String(group.name ?? ""),
                isDefault: Boolean(group.isDefault),
                addOns,
              };
            })
            .filter((group: AddOnGroupDetail) => group.addOns.length > 0)
        : [];

      if (groups.length > 0) {
        setAddOnPanel({
          productId: product.id,
          productName: product.name,
          groups,
        });
        setAddOnSelections({});
      } else {
        setAddOnPanel(null);
        setAddOnSelections({});
      }
    } catch (error) {
      console.error('Failed to load add-ons for product:', error);
      setAddOnError('Failed to load add-ons for this product.');
      setAddOnPanel(null);
      setAddOnSelections({});
    } finally {
      setAddOnLoading(false);
    }
  };

  const toggleAddOnSelection = (groupId: string, productId: string) => {
    setAddOnSelections((previous) => {
      const current = new Set(previous[groupId] ?? []);
      if (current.has(productId)) {
        current.delete(productId);
      } else {
        current.add(productId);
      }
      return {
        ...previous,
        [groupId]: Array.from(current),
      };
    });
  };

  const handleAddSelectedAddOns = () => {
    if (!addOnPanel) {
      return;
    }

    let added = false;
    for (const group of addOnPanel.groups) {
      const selections = addOnSelections[group.id] ?? [];
      for (const productId of selections) {
        const addOn = group.addOns.find((item) => item.productId === productId && item.product);
        if (addOn && addOn.product) {
          addAddOnProductToForm(addOn.product);
          added = true;
        }
      }
    }

    if (added) {
      setAddOnPanel(null);
      setAddOnSelections({});
      setAddOnError(null);
    }
  };

  const handleSkipAddOns = () => {
    setAddOnPanel(null);
    setAddOnSelections({});
    setAddOnError(null);
  };

  const hasSelectedAddOns = Object.values(addOnSelections).some(
    (selection) => Array.isArray(selection) && selection.length > 0
  );

  // Handle variant selection
  const handleVariantSelection = (variant: any) => {
    if (selectedProductForVariants) {
      addProductToForm(selectedProductForVariants, variant);
    }
    setShowVariantModal(false);
    setSelectedProductForVariants(null);
    setPendingProductIndex(null);
    setSearchQuery("");
    setSearchResults([]);
  };


  
  // Fetch reporting categories on mount
  useEffect(() => {
    fetch("/api/settings/reporting-categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((err) => console.error("Failed to load reporting categories:", err));
  }, []);
  
  // Search products when query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        setIsSearching(true);
        fetch(`/api/products/search?q=${encodeURIComponent(searchQuery)}`)
          .then((res) => res.json())
          .then((data) => {
            console.log('🔍 TakeOrder product search results:', data);
            setSearchResults(data || []);
          })
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

  const calculateTaxableTotal = () => {
    return customProducts.reduce((total, item) => {
      if (item.tax) {
        return total + parseFloat(item.price || "0") * parseInt(item.qty || "0");
      }
      return total;
    }, 0);
  };

  const calculateTaxTotal = () => {
    const taxableAmount = calculateTaxableTotal();
    if (taxableAmount === 0) return 0;
    const taxCalc = calculateTax(taxableAmount);
    return taxCalc.totalAmount;
  };

  return (
    <>
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
            <div className="absolute z-[10] mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-60 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    // Check if product has multiple variants
                    if (hasMultipleVariants(product)) {
                      // Ensure the product has the price field that the modal expects
                      const productForModal = {
                        ...product,
                        price: product.defaultPrice || product.price || 0
                      };
                      setSelectedProductForVariants(productForModal);
                      setShowVariantModal(true);
                    } else {
                      // Add product directly if no variants or only default variant
                      addProductToForm(product);
                      setSearchQuery("");
                      setSearchResults([]);
                    }
                  }}
                  className="px-5 py-3 text-sm hover:bg-gray-2 cursor-pointer border-b border-stroke last:border-b-0 dark:hover:bg-meta-4 dark:border-strokedark"
                >
                  <div className="font-medium text-black dark:text-white">{product.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
  ${product.defaultPrice.toFixed(2)} • {product.reportingCategoryName || 'Uncategorized'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addOnPanel && (
        <div className="mt-4 rounded-md border border-stroke bg-white p-4 dark:border-strokedark dark:bg-boxdark">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 dark:text-white">
                Add-ons for {addOnPanel.productName}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select extras to include with this product.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSkipAddOns}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Skip
            </button>
          </div>

          {addOnLoading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading add-ons…</p>
          ) : addOnError ? (
            <p className="text-sm text-red-600 dark:text-red-300">{addOnError}</p>
          ) : (
            <div className="space-y-4">
              {addOnPanel.groups.map((group) => (
                <div key={group.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {group.name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {group.addOns.length} option{group.addOns.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {group.addOns.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No active add-ons available in this group.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {group.addOns.map((addOn) => {
                        if (!addOn.product) {
                          return null;
                        }
                        const checked = addOnSelections[group.id]?.includes(addOn.productId) ?? false;
                        const priceLabel =
                          typeof addOn.product.price === "number"
                            ? `$${addOn.product.price.toFixed(2)}`
                            : "Custom price";

                        return (
                          <label
                            key={addOn.productId}
                            className="flex cursor-pointer items-start justify-between rounded-md border border-transparent px-2 py-1 hover:border-primary/40 hover:bg-primary/5 dark:hover:border-primary/40 dark:hover:bg-primary/10"
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={checked}
                                onChange={() => toggleAddOnSelection(group.id, addOn.productId)}
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {addOn.product.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {priceLabel}
                                  {!addOn.product.isTaxable && " • non-taxable"}
                                </div>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleSkipAddOns}
              className="rounded-md border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasSelectedAddOns}
              onClick={handleAddSelectedAddOns}
              className={`rounded-md px-4 py-1.5 text-sm font-medium text-white ${
                hasSelectedAddOns
                  ? 'bg-primary hover:bg-primary/90'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Add selected add-ons
            </button>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div className="overflow-hidden">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="py-2 px-4 text-xs text-black dark:text-white">
                Description
              </th>
              <th className="w-42 py-2 px-4 text-xs text-black dark:text-white">
                Category
              </th>
              <th className="w-22 py-2 px-2 text-xs text-black dark:text-white text-center">
                Unit Price
              </th>
              <th className="w-16 py-2 px-2 text-xs text-black dark:text-white text-center">
                Qty
              </th>
              <th className="w-20 py-2 px-2 text-xs text-black dark:text-white text-center">
                Total
              </th>
              <th className="w-12 py-2 px-2 text-xs text-black dark:text-white text-center">
                Tax
              </th>
              <th className="w-10 py-2 px-2">
                {/* No title for actions */}
              </th>
            </tr>
          </thead>
          <tbody>
            {customProducts.map((item, idx) => {
              const itemTotal = parseFloat(item.price || "0") * parseInt(item.qty || "0");
              const taxCalculation = item.tax ? calculateTax(itemTotal) : null;

              return (
                <tr key={idx} className="border-b border-stroke dark:border-strokedark">
                  {/* Description */}
                  <td className="py-2 px-4">
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
                  <td className="w-42 py-2 px-2">
                    <Select
                      options={categories.map(cat => ({
                        value: cat.id,
                        label: cat.name
                      }))}
                      value={item.category}
                      placeholder="Select category"
                      onChange={(value) =>
                        handleProductChange(idx, "category", value)
                      }
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="w-22 py-2 px-1">
                    <InputField
                      type="number"
                      step={0.01}
                      min="0"
                      placeholder="0.00"
                      className="w-full text-center py-1 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={item.price}
                      onChange={(e) =>
                        handleProductChange(idx, "price", e.target.value)
                      }
                    />
                  </td>

                  {/* Quantity */}
                  <td className="w-16 py-2 px-2">
                    <InputField
                      type="number"
                      min="1"
                      placeholder="1"
                      className="w-12 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={item.qty}
                      onChange={(e) =>
                        handleProductChange(idx, "qty", e.target.value)
                      }
                    />
                  </td>

                  {/* Total */}
                  <td className="w-20 py-2 px-2 text-right">
                    <div className="font-medium text-black dark:text-white text-sm">
                      ${calculateRowTotal(item.price, item.qty)}
                    </div>
                    {item.tax && taxCalculation && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +${taxCalculation.totalAmount.toFixed(2)} tax
                      </div>
                    )}
                  </td>

                  {/* Tax Checkbox */}
                  <td className="w-12 py-2 px-2">
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
                  <td className="w-10 py-2 px-2">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title={customProducts.length === 1 ? "Clear item" : "Remove item"}
                      >
                        <svg
                          className="h-3.5 w-3.5"
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
          
          {/* Individual Tax Breakdown - Only show if there are taxable items */}
          {(() => {
            const taxableAmount = calculateTaxableTotal();
            if (taxableAmount === 0) return null;
            
            const taxCalc = calculateTax(taxableAmount);
            return taxCalc.breakdown.map((tax, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {tax.name} ({tax.rate.toFixed(1)}%):
                </span>
                <span className="font-medium text-black dark:text-white">
                  ${tax.amount.toFixed(2)}
                </span>
              </div>
            ));
          })()}
          
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
      
      {/* Product Variant Modal */}
      <ProductVariantModal
        open={showVariantModal}
        product={selectedProductForVariants}
        onClose={() => {
          setShowVariantModal(false);
          setSelectedProductForVariants(null);
          setPendingProductIndex(null);
        }}
        onSelectVariant={handleVariantSelection}
      />
    </>
  );
}
