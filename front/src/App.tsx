// src/App.tsx
import { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProductGrid from './components/products/ProductGrid';
import ProductPage from './components/products/ProductPage';
import { fetchProducts } from './api/fetchProducts';

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts().then(setProducts);
  }, []);

  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <h1 className="text-3xl font-bold text-green-700 mb-6">Shop Flowers</h1>
              <ProductGrid products={products} />
            </>
          }
        />
        <Route path="/product/:id" element={<ProductPage />} />
      </Routes>
    </div>
  );
}

export default App;
