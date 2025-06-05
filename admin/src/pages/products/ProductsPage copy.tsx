import { useProducts } from "../../hooks/useProducts";


const ProductsPage = () => {
  const { products, loading, error } = useProducts();

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Products</h1>

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white dark:bg-card shadow rounded-lg p-4"
          >
            <h2 className="text-lg font-semibold">{product.name}</h2>
            <p className="text-sm text-gray-500">${product.price}</p>
            {/* Add Edit/Delete buttons later */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductsPage;