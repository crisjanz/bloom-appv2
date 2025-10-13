// ProductsSection.tsx - Step 4: Products & Items
import { useState } from "react";
import { OrderPrototypeState } from "../TakeOrderPrototypePage";
import FloatingLabelInput from "./FloatingLabelInput";

interface Props {
  orderState: OrderPrototypeState;
  updateOrderState: (section: keyof OrderPrototypeState, data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

// Mock product catalog
const MOCK_PRODUCTS = [
  { id: "p1", name: "Red Roses Bouquet", category: "Roses", price: 59.99 },
  { id: "p2", name: "Mixed Tulips", category: "Tulips", price: 45.00 },
  { id: "p3", name: "Orchid Plant", category: "Plants", price: 75.00 },
  { id: "p4", name: "Sympathy Arrangement", category: "Arrangements", price: 89.99 },
];

export default function ProductsSection({ orderState, updateOrderState, onNext, onPrevious }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    description: "",
    category: "",
    price: "",
    qty: "1",
    tax: true,
  });

  const handleAddProduct = () => {
    if (!newProduct.description || !newProduct.price) {
      alert("Please enter product description and price");
      return;
    }

    const product = {
      id: `product-${Date.now()}`,
      description: newProduct.description,
      category: newProduct.category,
      price: parseFloat(newProduct.price),
      qty: parseInt(newProduct.qty),
      tax: newProduct.tax,
    };

    updateOrderState("products", [...orderState.products, product]);
    calculateTotals([...orderState.products, product]);

    // Reset form
    setNewProduct({ description: "", category: "", price: "", qty: "1", tax: true });
    setShowAddModal(false);
  };

  const handleQuickAdd = (mockProduct: typeof MOCK_PRODUCTS[0]) => {
    const product = {
      id: `product-${Date.now()}`,
      description: mockProduct.name,
      category: mockProduct.category,
      price: mockProduct.price,
      qty: 1,
      tax: true,
    };

    updateOrderState("products", [...orderState.products, product]);
    calculateTotals([...orderState.products, product]);
  };

  const handleRemoveProduct = (productId: string) => {
    const updated = orderState.products.filter((p) => p.id !== productId);
    updateOrderState("products", updated);
    calculateTotals(updated);
  };

  const calculateTotals = (products: typeof orderState.products) => {
    const subtotal = products.reduce((sum, p) => sum + p.price * p.qty, 0);
    const taxableAmount = products.filter((p) => p.tax).reduce((sum, p) => sum + p.price * p.qty, 0);
    const gst = taxableAmount * 0.05; // 5%
    const pst = taxableAmount * 0.07; // 7%
    const deliveryFee = orderState.delivery.fee || 0;
    const total = subtotal + gst + pst + deliveryFee;

    updateOrderState("payment", {
      subtotal,
      deliveryFee,
      gst,
      pst,
      total,
      discount: 0,
      couponCode: "",
    });
  };

  const handleNext = () => {
    if (orderState.products.length === 0) {
      alert("Please add at least one product");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-1">Products & Items</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">Add items to this order</p>
      </div>

      {/* Quick Add Buttons */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Quick Add</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MOCK_PRODUCTS.map((product) => (
            <button
              key={product.id}
              onClick={() => handleQuickAdd(product)}
              className="p-3 border-2 border-stroke rounded-lg hover:border-[#597485] hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 transition-all text-left"
            >
              <p className="text-sm font-medium text-black dark:text-white">{product.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
              <p className="text-sm font-bold text-[#597485] mt-1">${product.price}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      {orderState.products.length > 0 && (
        <div className="border border-stroke dark:border-strokedark rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-meta-4">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                  Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                  Qty
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
                  Total
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stroke dark:divide-strokedark">
              {orderState.products.map((product) => (
                <tr key={product.id}>
                  <td className="px-4 py-3 text-sm text-black dark:text-white">
                    {product.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {product.category}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-gray-800 dark:text-gray-200">
                    {product.qty}
                  </td>
                  <td className="px-4 py-3 text-sm text-center font-medium text-black dark:text-white">
                    ${(product.price * product.qty).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleRemoveProduct(product.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Custom Product */}
      <button
        onClick={() => setShowAddModal(!showAddModal)}
        className="w-full px-4 py-3 border-2 border-dashed border-[#597485] text-[#597485] rounded-lg hover:bg-gray-50 dark:hover:bg-meta-4 transition-all font-medium"
      >
        + Add Custom Product
      </button>

      {showAddModal && (
        <div className="border border-stroke dark:border-strokedark rounded-lg p-4 bg-gray-50 dark:bg-meta-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="md:col-span-2">
              <FloatingLabelInput
                type="text"
                id="productDescription"
                label="Product Description"
                placeholder="e.g., Custom Bouquet"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                required
              />
            </div>

            <FloatingLabelInput
              type="text"
              id="productCategory"
              label="Category"
              placeholder="e.g., Roses"
              value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            />

            <FloatingLabelInput
              type="number"
              id="productPrice"
              label="Price"
              placeholder="0.00"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              required
            />

            <FloatingLabelInput
              type="number"
              id="productQty"
              label="Quantity"
              value={newProduct.qty}
              onChange={(e) => setNewProduct({ ...newProduct, qty: e.target.value })}
            />

            <div className="flex items-center">
              <input
                type="checkbox"
                id="productTax"
                checked={newProduct.tax}
                onChange={(e) => setNewProduct({ ...newProduct, tax: e.target.checked })}
                className="w-4 h-4 text-[#597485] rounded"
              />
              <label htmlFor="productTax" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Taxable
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddProduct}
              className="px-3 py-1.5 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] text-sm font-medium"
            >
              Add Product
            </button>
            <button
              onClick={() => setShowAddModal(false)}
              className="px-3 py-1.5 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-gray-800 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-stroke dark:border-strokedark">
        <button
          onClick={onPrevious}
          className="px-5 py-2 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 text-sm"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-[#597485] text-white rounded-lg text-sm font-semibold hover:bg-[#4e6575] transition-all"
        >
          Next: Review & Payment →
        </button>
      </div>
    </div>
  );
}
