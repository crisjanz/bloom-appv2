import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Button from "@shared/ui/components/ui/button/Button";
import { TrashBinIcon } from "@shared/assets/icons";
import { toast } from "sonner";

interface ReportingCategory {
  id: string;
  name: string;
}

const ReportingCategoriesCard = () => {
  const [categories, setCategories] = useState<ReportingCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/reporting-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Failed to load reporting categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/reporting-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        await loadCategories();
        setNewCategoryName("");
        toast.success("Reporting category added");
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add category');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const response = await fetch(`/api/settings/reporting-categories/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadCategories();
        toast.success("Reporting category deleted");
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  };

  if (isLoading) {
    return (
      <ComponentCardCollapsible
        title="Reporting Categories"
        desc="Manage product categories for sales reports"
      >
        <div className="animate-pulse">Loading categories...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible
      title="Reporting Categories"
      desc="Manage product categories for sales reports"
      defaultOpen={false}
    >
      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* LEFT COLUMN - Categories List */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Current Categories
          </h3>

          {categories.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {category.name}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(category.id, category.name)}
                    className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors ml-2"
                    title="Delete category"
                  >
                    <TrashBinIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
              <p>No categories configured yet.</p>
              <p className="text-sm mt-1">Use the form to add your first category.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - Add Form */}
        <div>
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
            Add New Category
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="categoryName">Category Name</Label>
              <InputField
                type="text"
                id="categoryName"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Arrangements, Plants, Gifts"
                required
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This will be used to group products in sales reports
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSaving || !newCategoryName.trim()}
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 w-full"
            >
              {isSaving ? 'Adding...' : 'Add Category'}
            </Button>
          </form>
        </div>
      </div>
    </ComponentCardCollapsible>
  );
};

export default ReportingCategoriesCard;
