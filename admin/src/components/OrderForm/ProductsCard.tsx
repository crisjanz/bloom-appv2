import React from "react";

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
  return (
    <div className="bg-card rounded shadow p-4 space-y-4">
      <h2 className="text-lg font-semibold">Products</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th className="px-4 py-2">Description</th>
            <th className="px-4 py-2">Category</th>
            <th className="px-4 py-2 text-right">Unit Price</th>
            <th className="px-4 py-2 text-right">Qty</th>
            <th className="px-4 py-2 text-right">Total</th>
            <th className="px-4 py-2 text-center">Tax</th>
          </tr>
        </thead>
        <tbody>
          {customProducts.map((item, idx) => {
            const taxAmount =
              parseFloat(item.price || "0") * parseInt(item.qty || "0") * 0.12;

            return (
              <tr key={idx}>
                <td className="px-4 py-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) =>
                      handleProductChange(idx, "description", e.target.value)
                    }
                    className="w-full px-2 py-1 rounded"
                    placeholder="Item description"
                  />
                </td>
                <td className="px-4 py-2">
                  <select
                    value={item.category}
                    onChange={(e) =>
                      handleProductChange(idx, "category", e.target.value)
                    }
                    className="select-input w-full px-2 py-1 rounded"
                  >
                    <option value="">Select category</option>
                    <option value="funeral">Funeral</option>
                    <option value="wedding">Wedding</option>
                    <option value="custom">Custom</option>
                  </select>
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.price}
                    onChange={(e) =>
                      handleProductChange(idx, "price", e.target.value)
                    }
                    className="w-20 px-2 py-1 rounded text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={item.qty}
                    onChange={(e) =>
                      handleProductChange(idx, "qty", e.target.value)
                    }
                    className="w-16 px-2 py-1 rounded text-right"
                  />
                </td>
                <td className="px-4 py-2 text-right">
                  ${calculateRowTotal(item.price, item.qty)}
                </td>
                <td className="px-4 py-2 text-center">
                  <label className="flex items-center gap-2 justify-center">
                    <input
                      type="checkbox"
                      checked={item.tax}
                      onChange={(e) =>
                        handleProductChange(idx, "tax", e.target.checked)
                      }
                    />
                    {item.tax && (
                      <span className="text-xs text-gray-600">
                        +${taxAmount.toFixed(2)}
                      </span>
                    )}
                  </label>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button className="btn-primary" onClick={handleAddCustomProduct}>
        + Add Item
      </button>
    </div>
  );
}
