// ProductsPage.tsx
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useProductsEnhanced } from "@shared/hooks/useProductsNew";
import ComponentCard from "@shared/ui/common/ComponentCard";
import ProductTable from "@app/components/products/ProductTable";
import InputField from "@shared/ui/forms/input/InputField";
import SelectField from "@shared/ui/forms/Select";
import { useCategories } from "@shared/hooks/useCategories";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";

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
    <div className="p-6">
      <PageBreadcrumb />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your product catalog
          </p>
        </div>
        <Link
          to="/products/new"
          className="inline-flex items-center px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Product
        </Link>
      </div>

      {/* Card with Filters + Table */}
      <ComponentCard>
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              name="search"
              label="Search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => updateSearchTerm(e.target.value)}
            />
            <SelectField
              name="category"
              label="Category"
              value={category}
              onChange={(value) => setCategory(value)}
              options={categoryOptions}
            />
          </div>
        </div>

        {/* Table */}
        <ProductTable products={filteredProducts} />
      </ComponentCard>
    </div>
  );
}