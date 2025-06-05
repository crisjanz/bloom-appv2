// useProducts.ts
import { useState, useEffect } from "react";
import { getAllProducts } from "../services/productService";

import { createProduct } from "../services/productService";



export function useProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getAllProducts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError("Failed to load products.");
    } finally {
      setLoading(false);
    }
  };

  // Inside export function useProducts() {...}
const addProduct = async (data: { name: string; price: number }) => {
  await createProduct(data);
  await fetchProducts();
};

  useEffect(() => {
    fetchProducts();
  }, []);

  return { products, loading, error, refetch: fetchProducts, addProduct, };
}