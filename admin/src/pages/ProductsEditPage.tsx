import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

type Product = {
  id: string;
  name: string;
  slug: string;
  status: string;
  visibility: string;
};

export default function ProductsEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://localhost:4000/api/products/${id}`)
      .then(res => res.json())
      .then(setProduct)
      .catch(() => alert("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!product) return;

    const res = await fetch(`http://localhost:4000/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product),
    });

    if (res.ok) {
      alert("Saved!");
      navigate("/products");
    } else {
      alert("Save failed");
    }
  };

  if (loading) return <p className="p-6">Loading...</p>;
  if (!product) return <p className="p-6">Product not found.</p>;

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold mb-4">Edit Product</h1>

      <label className="block mb-2">Name</label>
      <input
        className="w-full mb-4 p-2 border"
        value={product.name}
        onChange={(e) => setProduct({ ...product, name: e.target.value })}
      />

      <label className="block mb-2">Slug</label>
      <input
        className="w-full mb-4 p-2 border"
        value={product.slug}
        onChange={(e) => setProduct({ ...product, slug: e.target.value })}
      />

      <label className="block mb-2">Status</label>
      <select
        className="w-full mb-4 p-2 border"
        value={product.status}
        onChange={(e) => setProduct({ ...product, status: e.target.value })}
      >
        <option value="ACTIVE">ACTIVE</option>
        <option value="INACTIVE">INACTIVE</option>
      </select>

      <label className="block mb-2">Visibility</label>
      <select
        className="w-full mb-4 p-2 border"
        value={product.visibility}
        onChange={(e) => setProduct({ ...product, visibility: e.target.value })}
      >
        <option value="ONLINE">ONLINE</option>
        <option value="POS">POS</option>
        <option value="BOTH">BOTH</option>
      </select>

      <button
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        onClick={handleSave}
      >
        Save
      </button>
    </div>
  );
}
