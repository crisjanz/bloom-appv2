// ProductsPage.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "../../hooks/useProducts";
import ComponentCard from "../../components/common/ComponentCard";
import ProductTable from "../../components/products/ProductTable";
import InputField from "../../components/form/input/InputField";
import SelectField from "../../components/form/Select";
import { useCategories } from "../../hooks/useCategories";

export default function ProductsPage() {
  const { products } = useProducts();
  const { categories, loading, error } = useCategories();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filteredProducts, setFilteredProducts] = useState(products);

  const categoryOptions = [
    { label: "All", value: "" },
    ...categories.map((cat) => ({
      label: cat.name,
      value: cat.id,
    })),
  ];

useEffect(() => {
  const filtered = products.filter((p) => {
    const matchesSearch = p.name?.toLowerCase().includes(search.toLowerCase());
    const selected = category.trim();
    const matchesCategory = selected === "" || p.category?.id === selected;

    return matchesSearch && matchesCategory;
  });

  setFilteredProducts(filtered);
}, [search, category, products]);

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">Products</h2>

        <div className="flex flex-col gap-3 sm:flex-row">
          <InputField
            name="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
    {console.log("Example product:", products[0])}
      <ComponentCard>
    
        <ProductTable products={filteredProducts} />
      </ComponentCard>
    </>
  );
}