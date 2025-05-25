import { useEffect, useState } from 'react';
import { fetchProducts } from '../api/fetchProducts';
import { useNavigate } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch(() => alert('Failed to load products'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-600">Loading products...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Product Manager</h2>
        <button
          onClick={() => navigate("/products/new")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + Add Product
        </button>
      </div>

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
                <button
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  onClick={() => navigate(`/products/${p.id}`)}
                >
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
