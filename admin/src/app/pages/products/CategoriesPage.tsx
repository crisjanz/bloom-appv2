import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import SelectField from "@shared/ui/forms/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@shared/ui/components/ui/table";
import Badge from "@shared/ui/components/ui/badge/Badge";

type Product = {
  id: string;
  name: string;
  isActive: boolean;
};

type Category = {
  id: string;
  name: string;
  slug?: string;
  parentId?: string | null;
  level: number;
  sortOrder: number;
  isActive: boolean;
  parent?: Category;
  children?: Category[];
  fullName?: string;
  depth?: number;
  _count?: {
    products: number;
  };
  products?: Product[];
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treeCategories, setTreeCategories] = useState<Category[]>([]); // For tree view
  const [newName, setNewName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Fetch flat list for dropdowns
      const flatRes = await fetch("/api/categories?include=count");
      if (!flatRes.ok) throw new Error("Failed to fetch categories");
      const flatData = await flatRes.json();
      setCategories(flatData);

      // Fetch tree structure for display
      const treeRes = await fetch("/api/categories?include=count&tree=true");
      if (!treeRes.ok) throw new Error("Failed to fetch tree categories");
      const treeData = await treeRes.json();
      setTreeCategories(treeData);
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
        
        // Update both flat categories and tree categories
        setCategories(prev =>
          prev.map(cat =>
            cat.id === categoryId
              ? { ...cat, products }
              : cat
          )
        );
        
        // Helper function to update products in nested tree structure
        const updateTreeWithProducts = (categories: Category[]): Category[] => {
          return categories.map(cat => {
            if (cat.id === categoryId) {
              return { ...cat, products };
            }
            if (cat.children) {
              return { ...cat, children: updateTreeWithProducts(cat.children) };
            }
            return cat;
          });
        };
        
        setTreeCategories(prev => updateTreeWithProducts(prev));
      }
    } catch (error) {
      console.error("Error fetching category products:", error);
    } finally {
      setLoadingProducts(null);
    }
  };

  // Create new category (with optional parent)
  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName.trim(),
          parentId: selectedParentId || null
        }),
      });

      if (res.ok) {
        await fetchCategories(); // Refresh both flat and tree data
        setNewName("");
        setSelectedParentId("");
      } else {
        const error = await res.json();
        alert(error.error || "Failed to add category");
      }
    } catch (error) {
      console.error("Error adding category:", error);
      alert("Failed to add category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a category
  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewName(category.name);
    setSelectedParentId(category.parentId || "");
  };

  // Save category updates
  const handleUpdate = async () => {
    if (!editingCategory || !newName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newName.trim(),
          parentId: selectedParentId || null
        }),
      });

      if (res.ok) {
        await fetchCategories();
        handleCancelEdit();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      alert("Failed to update category");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingCategory(null);
    setNewName("");
    setSelectedParentId("");
  };

  // Delete category
  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Are you sure you want to delete "${categoryName}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/categories/${categoryId}`, { 
        method: "DELETE" 
      });
      
      if (res.ok) {
        await fetchCategories();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete category");
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

  // Render mobile category item (simplified)
  const renderMobileCategoryItem = (category: Category, depth = 0): React.ReactNode => {
    const indent = depth * 16; // Smaller indent for mobile
    
    return (
      <React.Fragment key={category.id}>
        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
            {/* Level indicator for mobile */}
            {depth > 0 && (
              <span className="text-gray-400 text-xs">
                {'└─'.repeat(depth)}
              </span>
            )}
            
            {/* Category name */}
            <span className="font-medium text-gray-800 dark:text-white text-sm">
              {category.name}
            </span>
            
            {/* Small level badge */}
            <Badge size="sm" color={depth === 0 ? "primary" : depth === 1 ? "success" : "neutral"}>
              L{category.level}
            </Badge>
          </div>

          {/* Mobile actions - just edit button */}
          <button
            onClick={() => handleEdit(category)}
            className="text-xs font-medium text-[#597485] hover:text-[#4e6575] px-2 py-1 rounded"
          >
            Edit
          </button>
        </div>

        {/* Render children recursively for mobile */}
        {category.children && category.children.map(child => renderMobileCategoryItem(child, depth + 1))}
      </React.Fragment>
    );
  };

  // Render a single category row with TailAdmin styling
  const renderCategoryRow = (category: Category, depth = 0): React.ReactNode => {
    const isExpanded = expandedCategory === category.id;
    const indent = depth * 24; // 24px per level
    
    return (
      <React.Fragment key={category.id}>
        <TableRow className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05]">
          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${indent}px` }}>
              {/* Level indicator */}
              {depth > 0 && (
                <span className="text-gray-400 text-sm">
                  {'└─'.repeat(depth)}
                </span>
              )}
              
              {/* Expand/collapse for categories with products */}
              <button
                onClick={() => handleCategoryClick(category.id)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg
                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Category name */}
              <span className="font-medium text-gray-800 dark:text-white">
                {category.name}
              </span>
            </div>
          </TableCell>

          <TableCell className="px-5 py-4">
            <Badge size="sm" color={depth === 0 ? "primary" : depth === 1 ? "success" : "neutral"}>
              Level {category.level}
            </Badge>
          </TableCell>

          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-2">
              <Badge size="sm" color="neutral">
                {category._count?.products || 0}
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
            {category.children && category.children.length > 0 ? (
              <Badge size="sm" color="secondary">
                {category.children.length}
              </Badge>
            ) : (
              <span className="text-gray-400">—</span>
            )}
          </TableCell>

          <TableCell className="px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleEdit(category)}
                className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(category.id, category.name)}
                className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline"
              >
                Delete
              </button>
            </div>
          </TableCell>
        </TableRow>

        {/* Expanded Products Rows */}
        {isExpanded && category.products && category.products.map((product) => (
          <TableRow key={`product-${product.id}`} className="bg-gray-50 dark:bg-gray-800/50">
            <TableCell className="px-5 py-3">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${indent + 48}px` }}>
                <span className="text-gray-400 text-xs">└─ 📦</span>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {product.name}
                </span>
              </div>
            </TableCell>
            <TableCell className="px-5 py-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">Product</span>
            </TableCell>
            <TableCell className="px-5 py-3">
              <span className="text-xs text-gray-500 dark:text-gray-400">—</span>
            </TableCell>
            <TableCell className="px-5 py-3">
              <Badge size="sm" color={product.isActive ? "success" : "error"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="px-5 py-3">
              <button
                onClick={() => handleEditProduct(product.id)}
                className="text-sm font-medium text-[#597485] hover:text-[#4e6575] hover:underline"
              >
                Edit
              </button>
            </TableCell>
          </TableRow>
        ))}

        {/* Render children recursively */}
        {category.children && category.children.map(child => renderCategoryRow(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">
          Hierarchical Categories (3 Levels)
        </h2>
      </div>

      <div className="space-y-6">
        {/* Add/Edit Category Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Add Form */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#597485]/10">
                  <svg className="h-5 w-5 text-[#597485]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {editingCategory ? 'Edit Category' : 'Create New Category'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {editingCategory ? 'Update category details below' : 'Add a new category to organize your products'}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (editingCategory ? handleUpdate() : handleAdd())}
                      placeholder="e.g., Fresh Flowers, Wedding Arrangements"
                      className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm focus:border-[#597485] focus:outline-none focus:ring-3 focus:ring-[#597485]/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="w-48">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Parent Category
                    </label>
                    <SelectField
                      name="parentCategory"
                      value={selectedParentId}
                      onChange={(value) => setSelectedParentId(value)}
                      placeholder="Top Level"
                      options={[
                        { label: "Top Level", value: "" },
                        ...categories
                          .filter(cat => {
                            if (editingCategory) {
                              return cat.id !== editingCategory.id && cat.level < 3;
                            }
                            return cat.level < 3;
                          })
                          .map((cat) => ({
                            label: cat.name,
                            value: cat.id,
                            depth: cat.depth || 0,
                          }))
                      ]}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {editingCategory ? (
                    <>
                      <button
                        onClick={handleUpdate}
                        disabled={!newName.trim() || isSubmitting}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#597485] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Update Category
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleAdd}
                      disabled={!newName.trim() || isSubmitting}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#597485] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#4e6575] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Category
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">Category Stats</h4>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Total Categories</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{categories.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Top Level</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {categories.filter(c => c.level === 1).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subcategories</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {categories.filter(c => c.level > 1).length}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Hierarchical Categories Display */}
        <ComponentCard title="Category Hierarchy">
          {/* Mobile View */}
          <div className="block md:hidden">
            {treeCategories.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                No categories yet. Create your first category above.
              </div>
            ) : (
              <div className="space-y-2">
                {treeCategories.map(category => renderMobileCategoryItem(category, 0))}
              </div>
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
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
                      Level
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Products
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                    >
                      Subcategories
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
                  {treeCategories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="px-5 py-8 text-center text-gray-500 dark:text-gray-400">
                        No categories yet. Create your first category above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    treeCategories.map(category => renderCategoryRow(category, 0))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}