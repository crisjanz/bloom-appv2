import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComponentCard from "../../components/common/ComponentCard";
import InputField from "../../components/form/input/InputField";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";

type Product = {
  id: string;
  name: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  _count?: {
    products: number;
  };
  products?: Product[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories?include=count");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      } else {
        throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      alert("Failed to load categories");
    }
  };

  const fetchCategoryProducts = async (categoryId: string) => {
    if (loadingProducts === categoryId) return;
    
    setLoadingProducts(categoryId);
    try {
      const res = await fetch(`/api/categories/${categoryId}/products`);
      if (res.ok) {
        const products = await res.json();
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? { ...cat, products }
              : cat
          )
        );
      }
    } catch (error) {
      console.error("Error fetching category products:", error);
    } finally {
      setLoadingProducts(null);
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (res.ok) {
        const added = await res.json();
        setCategories([...categories, { ...added, _count: { products: 0 } }]);
        setNewName("");
      } else {
        alert("Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
    }
  };

  const handleUpdate = async (categoryId: string, name: string) => {
    if (!name.trim()) return;

    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        alert("Failed to update category");
        fetchCategories(); // Revert changes
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category");
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
      const res = await fetch(`/api/categories/${categoryId}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      } else {
        alert("Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category");
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
      fetchCategoryProducts(categoryId);
    }
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/products/edit/${productId}`);
  };

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">Categories</h2>
      </div>

      <div className="space-y-6">
        {/* Add New Category */}
        <ComponentCard title="Add New Category">
          <div className="flex gap-3">
            <div className="flex-1">
              <InputField
                name="newCategory"
                placeholder="Category name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-6 py-3 text-sm font-medium text-white hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Category
            </button>
          </div>
        </ComponentCard>

        {/* Categories Table */}
        <ComponentCard title="Categories">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Category Name
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Product Count
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {categories.map((category) => {
                    const isExpanded = expandedCategory === category.id;
                    
                    return (
                      <React.Fragment key={category.id}>
                        {/* Main Category Row */}
                        <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleCategoryClick(category.id)}
                                className="flex items-center gap-2 text-left"
                              >
                                <svg
                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                    isExpanded ? 'rotate-90' : ''
                                  }`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <input
                                  value={category.name}
                                  onChange={(e) =>
                                    setCategories(prev =>
                                      prev.map(cat =>
                                        cat.id === category.id 
                                          ? { ...cat, name: e.target.value }
                                          : cat
                                      )
                                    )
                                  }
                                  onBlur={() => handleUpdate(category.id, category.name)}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className="font-medium text-gray-800 dark:text-white bg-transparent border-none outline-none focus:bg-gray-50 dark:focus:bg-gray-800 px-2 py-1 rounded"
                                />
                              </button>
                            </div>
                          </TableCell>

                          <TableCell className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <Badge size="sm" color="neutral">
                                {category._count?.products || 0} products
                              </Badge>
                              {loadingProducts === category.id && (
                                <svg className="animate-spin h-4 w-4 text-[#597485]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="px-5 py-4">
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
                            >
                              Delete
                            </button>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Products - Outside Table Row */}
                        {isExpanded && category.products && (
                          <tr>
                            <td colSpan={3} className="p-0">
                              <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-4 border-b border-gray-100 dark:border-white/[0.05]">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                                  Products in this category:
                                </h4>
                                {category.products.length === 0 ? (
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No products in this category
                                  </p>
                                ) : (
                                  <div className="space-y-2">
                                    {category.products.map((product) => (
                                      <div
                                        key={`product-${product.id}`}
                                        className="flex items-center justify-between bg-white dark:bg-gray-700 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-600"
                                      >
                                        <div className="flex items-center gap-3">
                                          <span className="font-medium text-gray-800 dark:text-white">
                                            {product.name}
                                          </span>
                                          <Badge size="sm" color={product.isActive ? "success" : "error"}>
                                            {product.isActive ? "Active" : "Inactive"}
                                          </Badge>
                                        </div>
                                        <button
                                          onClick={() => handleEditProduct(product.id)}
                                          className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
                                        >
                                          Edit
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}