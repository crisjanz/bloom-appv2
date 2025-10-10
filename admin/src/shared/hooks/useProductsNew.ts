// useProducts.ts
import { useState, useEffect, useCallback } from "react";
import { getAllProducts } from "../legacy-services/productService";

import { createProduct } from "../legacy-services/productService";



export function useProducts() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
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
  }, []);

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

// Enhanced hook with additional POS features
export function useProductsEnhanced() {
  const { products, loading, error, refetch, addProduct } = useProducts();
  
  // Add POS-specific functionality
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('');
  
  // Filter products by category and search term
  const filteredProducts = products.filter(p => {
    const categoryMatch = selectedCategory ? p.category === selectedCategory : true;
    const searchMatch = searchTerm ? p.name?.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return categoryMatch && searchMatch;
  });
  
  // Get unique categories
  useEffect(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category))].filter(Boolean);
    setCategories(uniqueCategories.map(cat => ({ id: cat, name: cat })));
  }, [products]);
  
  const updateSearchTerm = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);
  
  const updateActiveTab = useCallback((tab: string) => {
    setActiveTab(tab);
  }, []);
  
  return {
    products: filteredProducts,
    allProducts: products,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchTerm,
    activeTab,
    updateSearchTerm,
    updateActiveTab,
    loading,
    error,
    refetch,
    addProduct
  };
}