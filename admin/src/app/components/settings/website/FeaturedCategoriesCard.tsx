import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import Label from "@shared/ui/forms/Label";
import Button from "@shared/ui/components/ui/button/Button";

interface Category {
  id: string;
  name: string;
}

const FeaturedCategoriesCard = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load all categories
      const categoriesResponse = await fetch('/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setCategories(categoriesData);
      }

      // Load saved featured category IDs
      const settingsResponse = await fetch('/api/settings/homepage');
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        if (settingsData.featuredCategoryIds && Array.isArray(settingsData.featuredCategoryIds)) {
          setSelectedCategoryIds(settingsData.featuredCategoryIds);
        }
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategoryIds((prev) => {
      if (prev.includes(categoryId)) {
        return prev.filter((id) => id !== categoryId);
      } else if (prev.length < 4) {
        return [...prev, categoryId];
      } else {
        alert('You can only select up to 4 featured categories');
        return prev;
      }
    });
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newIds = [...selectedCategoryIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setSelectedCategoryIds(newIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === selectedCategoryIds.length - 1) return;
    const newIds = [...selectedCategoryIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setSelectedCategoryIds(newIds);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/homepage', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featuredCategoryIds: selectedCategoryIds }),
      });

      if (response.ok) {
        alert('Featured categories saved successfully');
      } else {
        alert('Failed to save featured categories');
      }
    } catch (error) {
      console.error('Failed to save featured categories:', error);
      alert('Failed to save featured categories');
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryName = (id: string) => {
    return categories.find((cat) => cat.id === id)?.name || 'Unknown Category';
  };

  return (
    <ComponentCardCollapsible title="Featured Categories (Select 4)" defaultOpen={false}>
      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label>Selected Categories ({selectedCategoryIds.length}/4)</Label>
            {selectedCategoryIds.length > 0 ? (
              <div className="space-y-2 mt-2">
                {selectedCategoryIds.map((catId, index) => (
                  <div
                    key={catId}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded border border-stroke"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-500 dark:text-gray-400">
                        {index + 1}.
                      </span>
                      <span>{getCategoryName(catId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="px-2 py-1 text-sm rounded border border-stroke disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === selectedCategoryIds.length - 1}
                        className="px-2 py-1 text-sm rounded border border-stroke disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleCategoryToggle(catId)}
                        className="px-2 py-1 text-sm rounded border border-stroke text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm mt-2">No categories selected</p>
            )}
          </div>

          <div>
            <Label>Available Categories</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {categories
                .filter((cat) => !selectedCategoryIds.includes(cat.id))
                .map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryToggle(category.id)}
                    disabled={selectedCategoryIds.length >= 4}
                    className="px-4 py-2 text-left rounded border border-stroke hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {category.name}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={isSaving || selectedCategoryIds.length !== 4}
              className="bg-primary text-white"
            >
              {isSaving ? 'Saving...' : 'Save Featured Categories'}
            </Button>
          </div>
          {selectedCategoryIds.length !== 4 && (
            <p className="text-sm text-red-500 text-right">
              Please select exactly 4 categories
            </p>
          )}
        </div>
      )}
    </ComponentCardCollapsible>
  );
};

export default FeaturedCategoriesCard;
