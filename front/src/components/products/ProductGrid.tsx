import React from 'react';
import { Link } from 'react-router-dom';

type Product = {
  id: string;
  name: string;
  slug: string; // ✅ make sure this is included
  price: number;
  imageUrl: string;
};

type ProductGridProps = {
  products: Product[];
};

const ProductGrid: React.FC<ProductGridProps> = ({ products }) => {
  console.log("ProductGrid products:", products); // ✅ inside component, now safe

  if (!products || products.length === 0) {
    return <div>No products found.</div>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <Link to={`/product/${product.slug}`} key={product.id}>
          <div className="bg-white shadow rounded-xl p-4 hover:shadow-lg transition">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-48 object-cover rounded-md mb-4"
            />
            <h2 className="text-lg font-semibold text-gray-800">{product.name}</h2>
            <p className="text-green-700 font-bold mt-2">${product.price.toFixed(2)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default ProductGrid;
