import { FC, useState } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";

// Simple UUID generator for browser compatibility
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

type OptionGroup = {
  id: string;
  name: string;
  values: string[];
  impactsVariants: boolean;
};

type Variant = {
  id: string;
  name: string; // e.g., "Large - Red"
  sku: string; // Optional
  priceDifference: number; // In cents, e.g., 500 for +5.00
  stockLevel: number;
  trackInventory: boolean;
};

type Props = {
  price: number;
  priceTitle: string;
  inventory: number;
  productSlug: string;
  optionGroups: OptionGroup[];
  variants: Variant[];
  onChange: (
    field: "price" | "priceTitle" | "inventory",
    value: string | number
  ) => void;
  onOptionGroupsChange: (groups: OptionGroup[]) => void;
  onVariantsChange: (variants: Variant[]) => void;
};

const PricingCard: FC<Props> = ({
  price,
  priceTitle,
  inventory,
  productSlug,
  optionGroups,
  variants,
  onChange,
  onOptionGroupsChange,
  onVariantsChange,
}) => {
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [isVariantsModalOpen, setIsVariantsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<OptionGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [groupValues, setGroupValues] = useState<string[]>([]);
  const [impactsVariants, setImpactsVariants] = useState(true);

  // Options Modal
  const openOptionsModal = (group: OptionGroup | null = null) => {
    setEditingGroup(group);
    setGroupName(group?.name || "");
    setGroupValues(group?.values || []);
    setImpactsVariants(group?.impactsVariants ?? true);
    setIsOptionsModalOpen(true);
  };

  const closeOptionsModal = () => {
    setIsOptionsModalOpen(false);
    setEditingGroup(null);
    setGroupName("");
    setNewValue("");
    setGroupValues([]);
    setImpactsVariants(true);
  };

  const addOptionValue = () => {
    if (!newValue.trim()) return;
    setGroupValues([...groupValues, newValue]);
    setNewValue("");
  };

  const saveOptionGroup = () => {
    if (!groupName.trim()) {
      alert("Group name is required");
      return;
    }
    if (groupValues.length === 0) {
      alert("At least one value is required");
      return;
    }
    const newGroup: OptionGroup = {
      id: editingGroup?.id || generateUUID(),
      name: groupName,
      values: groupValues,
      impactsVariants,
    };
    const updatedGroups = editingGroup
      ? optionGroups.map((g) => (g.id === editingGroup.id ? newGroup : g))
      : [...optionGroups, newGroup];
    onOptionGroupsChange(updatedGroups);
    // Regenerate variants if impactsVariants changes
    if (impactsVariants !== editingGroup?.impactsVariants) {
      generateVariants(updatedGroups);
    }
    closeOptionsModal();
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
      [[]] as string[][]
    );
    const newVariants = combinations.map((combo) => {
      const name = combo.join(" - ");
      const existingVariant = variants.find((v) => v.name === name);
      return {
        id: existingVariant?.id || generateUUID(),
        name,
        sku: existingVariant?.sku || `${productSlug}-${name.toLowerCase().replace(/\s+/g, "-")}`,
        priceDifference: existingVariant?.priceDifference || 0,
        stockLevel: existingVariant?.stockLevel || 0,
        trackInventory: existingVariant?.trackInventory ?? false,
      };
    });
    onVariantsChange(newVariants);
  };

  const updateVariant = (id: string, field: keyof Variant, value: any) => {
    const updatedVariants = variants.map((v) =>
      v.id === id ? { ...v, [field]: value } : v
    );
    onVariantsChange(updatedVariants);
  };

  return (
    <ComponentCard title="Pricing">
      {/* Input Titles + Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="text-sm font-medium text-black dark:text-white mb-2 block">
            Base Price
          </label>
          <InputField
            name="price"
            type="number"
            value={price}
            onChange={(e) => onChange("price", parseFloat(e.target.value))}
            placeholder="e.g. 39.99"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-black dark:text-white mb-2 block">
            Price Title
          </label>
          <InputField
            name="priceTitle"
            value={priceTitle}
            onChange={(e) => onChange("priceTitle", e.target.value)}
            placeholder="e.g. Standard"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-black dark:text-white mb-2 block">
            Inventory
          </label>
          <InputField
            name="inventory"
            type="number"
            value={inventory}
            onChange={(e) => onChange("inventory", parseInt(e.target.value))}
            placeholder="e.g. 10"
          />
        </div>
      </div>

      {/* Product Options Section */}
      <div className="text-sm font-medium text-black dark:text-white mb-2">
        Product Options
      </div>
      <div className="mb-4">
        {optionGroups.length === 0 ? (
          <p className="text-sm text-gray-500">No options added</p>
        ) : (
          <ul className="space-y-2">
            {optionGroups.map((group) => (
              <li
                key={group.id}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded cursor-pointer"
                onClick={() => openOptionsModal(group)}
              >
                <div>
                  <span>{group.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({group.values.join(", ")})
                  </span>
                  {group.impactsVariants && (
                    <span className="text-sm text-blue-500 ml-2">[Impacts Variants]</span>
                  )}
                </div>
                <span className="text-blue-500 hover:underline">Edit</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        onClick={() => openOptionsModal()}
        className="inline-flex items-center justify-center rounded border border-stroke px-4 py-2 text-body hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4 mb-4"
      >
        Add Option
      </button>

      {/* Manage Variants Link */}
      <div>
        <button
          onClick={openVariantsModal}
          className="text-blue-500 hover:underline text-sm"
        >
          Manage Variants ({variants.length} combinations)
        </button>
      </div>

      {/* Options Modal */}
      {isOptionsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark p-6 rounded-lg max-w-lg w-full">
            <h3 className="text-lg font-medium mb-4">
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
              <div className="flex gap-2 mb-2">
                <InputField
                  name="newValue"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="e.g. Large, Red"
                />
                <button
                  onClick={addOptionValue}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {groupValues.map((value) => (
                  <span
                    key={value}
                    className="inline-block bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded"
                  >
                    {value}
                    <button
                      onClick={() =>
                        setGroupValues(groupValues.filter((v) => v !== value))
                      }
                      className="ml-2 text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Impacts Variants Checkbox */}
            <div className="mb-4">
              <label className="text-sm font-medium text-black dark:text-white flex items-center">
                <input
                  type="checkbox"
                  checked={impactsVariants}
                  onChange={(e) => setImpactsVariants(e.target.checked)}
                  className="mr-2"
                />
                Impacts Variants (affects SKUs and pricing)
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeOptionsModal}
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={saveOptionGroup}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variants Modal */}
      {isVariantsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-boxdark p-6 rounded-lg max-w-2xl w-full">
            <h3 className="text-lg font-medium mb-4">Manage Variants</h3>
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
                          <InputField
                            value={variant.sku}
                            onChange={(e) =>
                              updateVariant(variant.id, "sku", e.target.value)
                            }
                            placeholder="Optional"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <InputField
                            type="number"
                            value={variant.priceDifference / 100}
                            onChange={(e) =>
                              updateVariant(
                                variant.id,
                                "priceDifference",
                                Math.round(parseFloat(e.target.value) * 100) || 0
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
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ComponentCard>
  );
};

export default PricingCard;