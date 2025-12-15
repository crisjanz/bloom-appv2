import { useState } from 'react';
import { SaveIcon, PlusIcon, TrashIcon } from '@shared/assets/icons';
import Label from '@shared/ui/forms/Label';

interface OrderItem {
  id: string;
  customName: string;
  description?: string;
  unitPrice: number;
  quantity: number;
  rowTotal: number;
}

interface ProductsEditModalProps {
  products: OrderItem[];
  onChange: (products: OrderItem[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const ProductsEditModal: React.FC<ProductsEditModalProps> = ({
  products,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const [editingProducts, setEditingProducts] = useState<OrderItem[]>([...products]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD'
    }).format(amount / 100);
  };

const updateProduct = (index: number, field: keyof OrderItem, value: any) => {
  const updated = [...editingProducts];
  updated[index] = { ...updated[index], [field]: value };
  
  // Recalculate row total if price or quantity changed
  if (field === 'unitPrice' || field === 'quantity') {
    updated[index].rowTotal = updated[index].unitPrice * updated[index].quantity;
  }
  
  setEditingProducts(updated);
  
  // 🔥 NEW: Also update the parent component immediately
  onChange(updated);
};

const addProduct = () => {
  const newProduct: OrderItem = {
    id: `temp-${Date.now()}`,
    customName: '',
    description: '',
    unitPrice: 0,
    quantity: 1,
    rowTotal: 0
  };
  const updated = [...editingProducts, newProduct];
  setEditingProducts(updated);
  onChange(updated); // 🔥 NEW: Update parent immediately
};

const removeProduct = (index: number) => {
  const updated = editingProducts.filter((_, i) => i !== index);
  setEditingProducts(updated);
  onChange(updated); // 🔥 NEW: Update parent immediately
};

const handleSave = () => {
  // Filter out empty products
  const validProducts = editingProducts.filter(p => p.customName.trim() !== '');
  setEditingProducts(validProducts);
  onChange(validProducts); // Make sure final valid products are set
  onSave();
};

  const subtotal = editingProducts.reduce((sum, item) => sum + item.rowTotal, 0);

  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto">
        {editingProducts.map((product, index) => (
          <div key={product.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Item {index + 1}
              </h4>
              {editingProducts.length > 1 && (
                <button
                  onClick={() => removeProduct(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label>Product Name</Label>
                <input
                  type="text"
                  value={product.customName}
                  onChange={(e) => updateProduct(index, 'customName', e.target.value)}
                  placeholder="Enter product name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <Label>Product Description</Label>
                <textarea
                  value={product.description || ''}
                  onChange={(e) => updateProduct(index, 'description', e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Price ($)</Label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(product.unitPrice / 100).toFixed(2)}
                    onChange={(e) => updateProduct(index, 'unitPrice', Math.round(parseFloat(e.target.value || '0') * 100))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) => updateProduct(index, 'quantity', parseInt(e.target.value || '1'))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <Label>Total</Label>
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300">
                    {formatCurrency(product.rowTotal)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addProduct}
        className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-[#597485] hover:text-[#597485] transition-colors flex items-center justify-center gap-2"
      >
        <PlusIcon className="w-4 h-4" />
        Add Product
      </button>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-700 dark:text-gray-300">Subtotal:</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(subtotal)}
          </span>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ProductsEditModal;
