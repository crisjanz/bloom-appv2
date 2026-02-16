import { FC, useMemo, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import ComponentCard from "@shared/ui/common/ComponentCard";
import { Modal } from "@shared/ui/components/ui/modal";
import { centsToDollars, dollarsToCents, formatCurrency, parseUserCurrency } from "@shared/utils/currency";
import { generateSkuCode } from "@shared/utils/skuGenerator";
import { toast } from "sonner";

// Simple UUID generator for browser compatibility
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type OptionValue = {
  label: string;
  priceAdjustment: number; // in dollars
};

type OptionGroup = {
  id: string;
  name: string;
  values: OptionValue[];
  impactsVariants: boolean;
  optionType?: string;
};

type Variant = {
  id: string;
  name: string; // e.g., "Large - Red"
  sku?: string; // Optional
  priceDifference: number; // In cents, e.g., 500 for +5.00
  stockLevel: number;
  trackInventory: boolean;
  isManuallyEdited?: boolean;
  featuredImageUrl?: string | null;
};

type PricingTier = {
  id: string;
  title: string;
  price: number;
  inventory: number;
  featuredImageUrl?: string;
};

type Props = {
  pricingTiers: PricingTier[];
  pricingGroupId: string | null;
  productSlug: string;
  optionGroups: OptionGroup[];
  variants: Variant[];
  productImages: string[];
  onPricingTiersChange: (tiers: PricingTier[]) => void;
  onChange: (
    field: "price" | "priceTitle" | "inventory",
    value: string | number
  ) => void;
  onOptionGroupsChange: (groups: OptionGroup[]) => void;
  onVariantsChange: (variants: Variant[]) => void;
};

const PricingCard: FC<Props> = ({
  pricingTiers,
  pricingGroupId,
  productSlug,
  optionGroups,
  variants,
  productImages,
  onPricingTiersChange,
  onChange,
  onOptionGroupsChange,
  onVariantsChange,
}) => {
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newPriceAdjustment, setNewPriceAdjustment] = useState(0);
  const [groupValues, setGroupValues] = useState<OptionValue[]>([]);

  const customizationGroups = useMemo(
    () => optionGroups.filter((group) => group.id !== pricingGroupId),
    [optionGroups, pricingGroupId]
  );

  const headerLabels = ["Price", "Title", "Inventory", "Featured Image"];

  const updateTierField = (
    index: number,
    field: "price" | "title" | "inventory",
    rawValue: string
  ) => {
    const updatedTiers = pricingTiers.map((tier, tierIndex) => {
      if (tierIndex !== index) {
        return tier;
      }

      if (field === "price") {
        const parsed = parseFloat(rawValue);
        return { ...tier, price: Number.isFinite(parsed) ? parsed : 0 };
      }

      if (field === "inventory") {
        const parsed = parseInt(rawValue, 10);
        return { ...tier, inventory: Number.isFinite(parsed) ? parsed : 0 };
      }

      return { ...tier, title: rawValue };
    });

    onPricingTiersChange(updatedTiers);

    if (index === 0) {
      if (field === "price") {
        const parsed = parseFloat(rawValue);
        onChange("price", Number.isFinite(parsed) ? parsed : 0);
      }
      if (field === "title") {
        onChange("priceTitle", rawValue);
      }
      if (field === "inventory") {
        const parsed = parseInt(rawValue, 10);
        onChange("inventory", Number.isFinite(parsed) ? parsed : 0);
      }
    }
  };

  const addPricingTier = () => {
    const nextLabel =
      pricingTiers.length === 1
        ? "Deluxe"
        : pricingTiers.length === 2
        ? "Premium"
        : `Tier ${pricingTiers.length + 1}`;

    const baseTier = pricingTiers[0];

    const newTier: PricingTier = {
      id: generateUUID(),
      title: nextLabel,
      price: baseTier?.price ?? 0,
      inventory: 0,
      featuredImageUrl: undefined,
    };

    onPricingTiersChange([...pricingTiers, newTier]);
  };

  const removePricingTier = (index: number) => {
    if (index === 0 || pricingTiers.length <= 1) {
      return;
    }

    onPricingTiersChange(pricingTiers.filter((_, tierIndex) => tierIndex !== index));
  };

  const handleFeaturedImageSelect = (index: number, imageUrl: string) => {
    const updatedTiers = pricingTiers.map((tier, tierIndex) =>
      tierIndex === index
        ? { ...tier, featuredImageUrl: imageUrl || undefined }
        : tier
    );

    onPricingTiersChange(updatedTiers);
  };

  // Options Modal
  const openOptionsModal = (group: OptionGroup | null = null) => {
    setEditingGroup(group);
    setGroupName(group?.name || "");
    setGroupValues(group?.values || []);
    setIsOptionsModalOpen(true);
  };

  const closeOptionsModal = () => {
    setIsOptionsModalOpen(false);
    setEditingGroup(null);
    setGroupName("");
    setNewValue("");
    setNewPriceAdjustment(0);
    setGroupValues([]);
  };

  const addOptionValue = () => {
    if (!newValue.trim()) return;
    setGroupValues([...groupValues, {
      label: newValue,
      priceAdjustment: newPriceAdjustment,
    }]);
    setNewValue("");
    setNewPriceAdjustment(0);
  };

  const saveOptionGroup = () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (groupValues.length === 0) {
      toast.error("At least one value is required");
      return;
    }
    const newGroup: OptionGroup = {
      id: editingGroup?.id || generateUUID(),
      name: groupName,
      values: groupValues,
      impactsVariants: true, // All options now create variants
    };
    const updatedGroups = editingGroup
      ? optionGroups.map((g) => (g.id === editingGroup.id ? newGroup : g))
      : [...optionGroups, newGroup];
    onOptionGroupsChange(updatedGroups);
    // Regenerate variants when option is added/edited
    generateVariants(updatedGroups);
    closeOptionsModal();
    toast.success(editingGroup ? "Customization option updated" : "Customization option added");
  };

  const deleteOptionGroup = (groupId: string) => {
    if (!confirm("Delete this customization option? This will remove all associated variants.")) {
      return;
    }
    const updatedGroups = optionGroups.filter((g) => g.id !== groupId);
    onOptionGroupsChange(updatedGroups);
    // Regenerate variants after deletion
    generateVariants(updatedGroups);
    toast.success("Customization option deleted");
  };

  // Variants Modal
  const openVariantsModal = () => {
    setIsVariantsModalOpen(true);
  };

  const closeVariantsModal = () => {
    setIsVariantsModalOpen(false);
  };

  const generateVariants = (groups: OptionGroup[] = optionGroups) => {
    const impactingGroups = groups.filter((g) => g.impactsVariants);
    if (impactingGroups.length === 0) {
      onVariantsChange([]);
      return;
    }
    // Generate all possible combinations
    const combinations = impactingGroups.reduce(
      (acc, group) =>
        acc.flatMap((combo) => group.values.map((value) => [...combo, value])),
      [[]] as OptionValue[][]
    );
    const newVariants = combinations.map((combo) => {
      const name = combo.map(v => v.label).join(" - ");
      const existingVariant = variants.find((v) => v.name === name);

      // Calculate price difference from all option adjustments (in cents)
      const totalAdjustment = combo.reduce((sum, v) => sum + (v.priceAdjustment || 0), 0);
      const priceDifferenceCents = dollarsToCents(totalAdjustment);

      return {
        id: existingVariant?.id || generateUUID(),
        name,
        sku: existingVariant?.sku || "",
        priceDifference: existingVariant?.priceDifference ?? priceDifferenceCents,
        stockLevel: existingVariant?.stockLevel || 0,
        trackInventory: existingVariant?.trackInventory ?? false,
        isManuallyEdited: existingVariant?.isManuallyEdited || false,
      };
    });
    onVariantsChange(newVariants);
  };

  const updateVariant = (id: string, field: keyof Variant, value: any) => {
    const updatedVariants = variants.map((v) => {
      if (v.id === id) {
        // Mark as manually edited if price is changed
        const isManuallyEdited = field === 'priceDifference' ? true : v.isManuallyEdited;
        return { ...v, [field]: value, isManuallyEdited };
      }
      return v;
    });
    onVariantsChange(updatedVariants);
  };

  return (
    <ComponentCard title="Pricing">
      {/* Input Titles + Grid Layout */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-medium text-black dark:text-white">
            Pricing Options
          </div>
          <button
            onClick={addPricingTier}
            className="inline-flex items-center rounded border border-primary px-3 py-1 text-sm font-medium text-primary hover:bg-primary hover:text-white"
            type="button"
          >
            + Add Tier
          </button>
        </div>

        {pricingTiers.length ? (
          <div className="space-y-3">
            <div className="hidden md:grid grid-cols-13 gap-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {headerLabels.map((label, columnIndex) => (
                <div
                  key={label}
                  className={
                    columnIndex === 0
                      ? "md:col-span-2"
                      : columnIndex === 1
                      ? "md:col-span-4"
                      : columnIndex === 2
                      ? "md:col-span-2"
                      : "md:col-span-3"
                  }
                >
                  {label}
                </div>
              ))}
              <div className="md:col-span-2 text-right">Actions</div>
            </div>

            {pricingTiers.map((tier, index) => (
              <div
                key={tier.id}
                className="grid grid-cols-1 gap-4 rounded border border-stroke p-4 md:grid-cols-13 md:items-start dark:border-dark-3"
              >
                <div className="md:col-span-2">
                  <InputField
                    type="number"
                    value={tier.price}
                    onChange={(event) =>
                      updateTierField(index, "price", event.target.value)
                    }
                    placeholder="e.g. 39.99"
                    label={index === 0 ? "Base Price" : undefined}
                  />
                </div>

                <div className="md:col-span-4">
                  <InputField
                    value={tier.title}
                    onChange={(event) =>
                      updateTierField(index, "title", event.target.value)
                    }
                    placeholder={index === 0 ? "Standard" : "Tier name"}
                    label={index === 0 ? "Tier Name" : undefined}
                  />
                </div>

                <div className="md:col-span-2">
                  <InputField
                    type="number"
                    value={tier.inventory}
                    onChange={(event) =>
                      updateTierField(index, "inventory", event.target.value)
                    }
                    placeholder="e.g. 10"
                    label={index === 0 ? "Inventory" : undefined}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="mb-2 block text-sm font-medium text-black dark:text-white md:hidden">
                    Featured Image
                  </label>
                  {productImages && productImages.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={tier.featuredImageUrl || ""}
                        onChange={(e) => handleFeaturedImageSelect(index, e.target.value)}
                        className="w-full rounded border border-stroke bg-transparent py-2 px-3 text-sm text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
                      >
                        <option value="">No image</option>
                        {productImages.map((url, idx) => (
                          <option key={url} value={url}>
                            Image {idx + 1}
                          </option>
                        ))}
                      </select>
                      {tier.featuredImageUrl && (
                        <img
                          src={tier.featuredImageUrl}
                          alt={`Preview for ${tier.title}`}
                          className="w-16 h-16 object-cover rounded border border-stroke dark:border-strokedark"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Upload product images first</p>
                  )}
                </div>

                <div className="md:col-span-2 flex items-center justify-start md:justify-end">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removePricingTier(index)}
                      className="mt-2 text-sm text-red-500 hover:text-red-600 md:mt-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Pricing tiers will appear here.</p>
        )}
      </div>

      <div className="text-sm font-medium text-black dark:text-white mb-2">
        Customization Options
      </div>
      <div className="mb-4">
        {customizationGroups.length === 0 ? (
          <p className="text-sm text-gray-500">No customization options added</p>
        ) : (
          <ul className="space-y-2">
            {customizationGroups.map((group) => (
              <li
                key={group.id}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded"
              >
                <div className="flex-1 cursor-pointer" onClick={() => openOptionsModal(group)}>
                  <span className="font-medium">{group.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({group.values.map(v => {
                      const priceText = v.priceAdjustment !== 0
                        ? ` ${v.priceAdjustment > 0 ? '+' : ''}$${v.priceAdjustment.toFixed(2)}`
                        : '';
                      return `${v.label}${priceText}`;
                    }).join(", ")})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openOptionsModal(group)}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteOptionGroup(group.id);
                    }}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={() => openOptionsModal()}
        className="inline-flex items-center justify-center rounded border border-stroke px-4 py-2 text-body hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 mb-4"
      >
        Add Custom Option
      </button>

      {/* Variant Preview */}
      {variants.length > 0 && (
        <div className="mb-4 p-4 border border-stroke dark:border-strokedark rounded-md bg-gray-50 dark:bg-meta-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-black dark:text-white">
              Generated Variants ({variants.length})
            </h4>
            <button
              onClick={openVariantsModal}
              className="text-blue-500 hover:underline text-xs"
            >
              Edit All
            </button>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {variants.slice(0, 10).map((variant) => (
              <div
                key={variant.id}
                className="flex items-center justify-between text-xs p-2 bg-white dark:bg-boxdark rounded"
              >
                <span className="font-medium text-black dark:text-white">
                  {variant.name}
                </span>
                <div className="flex items-center gap-3 text-bodydark dark:text-bodydark1">
                  <span>SKU: {variant.sku}</span>
                  <span>Stock: {variant.stockLevel || 0}</span>
                  {variant.priceDifference !== 0 && (
                    <span className="text-success">
                      {variant.priceDifference > 0 ? '+' : '-'}
                      {formatCurrency(Math.abs(variant.priceDifference))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {variants.length > 10 && (
              <p className="text-xs text-bodydark dark:text-bodydark1 text-center pt-2">
                ... and {variants.length - 10} more variants
              </p>
            )}
          </div>
        </div>
      )}

      {/* Manage Variants Link (shown only if variants exist) */}
      {variants.length === 0 && (
        <div className="mb-4">
          <p className="text-sm text-bodydark dark:text-bodydark1">
            No variants generated yet. Add pricing tiers or customization options above.
          </p>
        </div>
      )}

      {/* Options Modal */}
      <Modal
        isOpen={isOptionsModalOpen}
        onClose={closeOptionsModal}
        className="max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">
            {editingGroup ? "Edit Option" : "Add Option"}
          </h3>

            {/* Group Name */}
            <div className="mb-4">
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">
                Option Name
              </label>
              <InputField
                name="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Size, Color"
              />
            </div>

            {/* Option Values */}
            <div className="mb-4">
              <label className="text-sm font-medium text-black dark:text-white mb-2 block">
                Values
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <InputField
                  name="newValue"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. Large, Red"
                />
                <div className="flex gap-2">
                  <InputField
                    type="number"
                    name="newPriceAdjustment"
                    value={newPriceAdjustment}
                    onChange={(e) => setNewPriceAdjustment(Number(e.target.value))}
                    placeholder="Price +/-"
                    step="0.01"
                  />
                  <button
                    onClick={addOptionValue}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 whitespace-nowrap"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Enter price adjustment in dollars (e.g., 5 for +$5.00, -2 for -$2.00)
              </div>
              <div className="space-y-1">
                {groupValues.map((value, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded"
                  >
                    <span className="font-medium">{value.label}</span>
                    <div className="flex items-center gap-2">
                      {value.priceAdjustment !== 0 && (
                        <span className="text-sm text-blue-600 dark:text-blue-400">
                          {value.priceAdjustment > 0 ? '+' : ''}${value.priceAdjustment.toFixed(2)}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          setGroupValues(groupValues.filter((_, i) => i !== index))
                        }
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Info message - all options create variants now */}
            <div className="mb-4 text-xs text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
              ℹ️ All options create variant combinations. Set price adjustment to $0 if the option doesn't affect pricing.
            </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={closeOptionsModal}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={saveOptionGroup}
              className="px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Variants Modal */}
      <Modal
        isOpen={isVariantsModalOpen}
        onClose={() => setIsVariantsModalOpen(false)}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6">
          <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Manage Variants</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-black dark:text-white">
                <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2">Combination</th>
                    <th className="px-4 py-2">SKU</th>
                    <th className="px-4 py-2">Price Difference</th>
                    <th className="px-4 py-2">Stock</th>
                    <th className="px-4 py-2">Track Inventory</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-2 text-center text-gray-500">
                        No variants (add options that impact variants)
                      </td>
                    </tr>
                  ) : (
                    variants.map((variant) => (
                      <tr key={variant.id} className="border-b dark:border-gray-600">
                        <td className="px-4 py-2">{variant.name}</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-[160px]">
                              <InputField
                                value={variant.sku || ""}
                                onChange={(e) =>
                                  updateVariant(variant.id, "sku", e.target.value)
                                }
                                placeholder="Optional"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                updateVariant(variant.id, "sku", generateSkuCode())
                              }
                              className="whitespace-nowrap rounded-md border border-gray-300 px-2.5 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                            >
                              Generate SKU
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <InputField
                            type="number"
                            value={centsToDollars(variant.priceDifference).toFixed(2)}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "priceDifference",
                                parseUserCurrency(e.target.value)
                              )
                            }
                            placeholder="e.g. +5.00"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <InputField
                            type="number"
                            value={variant.stockLevel}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "stockLevel",
                                parseInt(e.target.value) || 0
                              )
                            }
                            placeholder="e.g. 10"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={variant.trackInventory}
                            onChange={(e) =>
                              updateVariant(variant.id, "trackInventory", e.target.checked)
                            }
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={closeVariantsModal}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded hover:bg-gray-400 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </ComponentCard>
  );
};

export default PricingCard;
