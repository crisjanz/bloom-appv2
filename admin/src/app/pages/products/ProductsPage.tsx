// ProductsPage.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProductsEnhanced } from "@shared/hooks/useProductsNew";
import ComponentCard from "@shared/ui/common/ComponentCard";
import ProductTable from "@app/components/products/ProductTable";
import InputField from "@shared/ui/forms/input/InputField";
import SelectField from "@shared/ui/forms/Select";
import { useCategories } from "@shared/hooks/useCategories";

export default function ProductsPage() {
  const { products, searchTerm, updateSearchTerm, activeTab, updateActiveTab } = useProductsEnhanced();
  const { categories, loading, error } = useCategories();

  // Use domain search functionality
  const [category, setCategory] = useState("");

  const categoryOptions = [
    { label: "All", value: "" },
    ...categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
      depth: cat.depth || 0, // Add depth for hierarchical indentation
    })),
  ];

  // Filter by category (search is handled by domain)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const selected = category.trim();
      const matchesCategory = selected === "" || p.category?.id === selected;
      return matchesCategory;
    });
  }, [category, products]);

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">Products</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <InputField
            name="search"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => updateSearchTerm(e.target.value)}
          />


          <SelectField
  name="category"
  value={category}
  onChange={(value) => setCategory(value)} // ✅ value is passed directly, not e.target.value
  options={categoryOptions}
/>
        </div>

        <Link
          to="/products/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 py-3 text-sm font-medium text-white hover:bg-[#4e6575]"
        >
          + Add Product
        </Link>
      </div>
      <ComponentCard>
    
        <ProductTable products={filteredProducts} />
      </ComponentCard>
    </>
  );
}