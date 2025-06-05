import { FC } from "react";
import InputField from "../../form/input/InputField";
import ComponentCard from "../../common/ComponentCard";

type Props = {
  price: number;
  priceTitle: string;
  inventory: number;
  onChange: (
    field: "price" | "priceTitle" | "inventory",
    value: string | number
  ) => void;
};

const PricingCard: FC<Props> = ({ price, priceTitle, inventory, onChange }) => {
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

      {/* Variant Section */}
      <div className="text-sm font-medium text-black dark:text-white mb-2">
        Price Variants
      </div>
      <div className="text-sm text-gray-500 mb-4">
        [Variant list UI coming soon]
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded border border-stroke px-4 py-2 text-body hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
        >
          Create Inventory
        </button>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded border border-stroke px-4 py-2 text-body hover:bg-gray-100 dark:border-strokedark dark:text-white dark:hover:bg-meta-4"
        >
          Manage Variants
        </button>
      </div>
    </ComponentCard>
  );
};

export default PricingCard;