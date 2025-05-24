import React from 'react';

type Variant = {
  id: string;
  name: string;
  price: number;
  customFields: {
    size?: string;
    vaseType?: string;
  };
};

type VariationSelectorProps = {
  variants: Variant[];
  selectedVariantId: string;
  onChange: (variantId: string) => void;
};

const VariationSelector: React.FC<VariationSelectorProps> = ({ variants, selectedVariantId, onChange }) => {
  return (
    <div className="mb-4">
      <label className="block font-semibold text-gray-700 mb-2">Choose a variation:</label>
      <select
        className="w-full border border-gray-300 rounded p-2"
        value={selectedVariantId}
        onChange={(e) => onChange(e.target.value)}
      >
        {variants.map((variant) => (
          <option key={variant.id} value={variant.id}>
            {variant.name} – ${(variant.price / 100).toFixed(2)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default VariationSelector;
