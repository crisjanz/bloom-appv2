import { useEffect, useState } from 'react';
import { fetchProducts } from '../api/fetchProducts';

type Product = {
  id: string;
  name: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => alert('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-600">Loading products...</div>;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Product Manager</h2>
      <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Price</th>
            <th className="p-2">Status</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">${(p.price / 100).toFixed(2)}</td>
              <td className="p-2">{p.status}</td>
              <td className="p-2">
                <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
