import { useState, useEffect } from "react";
import { getCategoriesTree } from "../../services/categoryService";
import PropTypes from "prop-types";

const FilterBoxes = ({
  selectedCategory = null,
  onCategoryChange,
  onCategoriesLoaded = undefined,
}) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const categoriesData = await getCategoriesTree();
        const activeCategories = categoriesData.filter((cat) => cat.isActive);
        setCategories(activeCategories);
        if (typeof onCategoriesLoaded === "function") {
          onCategoriesLoaded(activeCategories);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, [onCategoriesLoaded]);

  const handleCategoryClick = (categoryId) => {
    const newCategory = selectedCategory === categoryId ? null : categoryId;
    onCategoryChange(newCategory);
  };

  if (loading) {
    return (
      <div className="mb-8 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2 p-8">
        <p className="text-body-color dark:text-dark-6">
          Loading filters...
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-dark-2">
        <div className="border-b border-stroke px-8 py-[14px] dark:border-dark-3 lg:px-6 xl:px-8">
          <h3 className="text-lg font-semibold text-dark dark:text-white">
            Categories
          </h3>
        </div>

        <div className="space-y-3 lg:p-6 xl:p-8">
          <button
            onClick={() => handleCategoryClick(null)}
            className={`w-full rounded-md px-3 py-2 text-left transition-colors ${
              selectedCategory === null
                ? "bg-primary text-white"
                : "text-dark hover:bg-gray-100 dark:text-white dark:hover:bg-dark-3"
            }`}
          >
            All Products
          </button>

          {categories.map((category) => (
            <div key={category.id}>
              <button
                onClick={() => handleCategoryClick(category.id)}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  selectedCategory === category.id
                    ? "bg-primary text-white"
                    : "text-dark hover:bg-gray-100 dark:text-white dark:hover:bg-dark-3"
                }`}
              >
                {category.name}
              </button>

              {/* Show subcategories if they exist */}
              {category.children && category.children.length > 0 && (
                <div className="ml-4 mt-2 space-y-2">
                  {category.children.map((subcat) => (
                    <button
                      key={subcat.id}
                      onClick={() => handleCategoryClick(subcat.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === subcat.id
                          ? "bg-primary text-white"
                          : "text-body-color hover:bg-gray-100 dark:text-dark-6 dark:hover:bg-dark-3"
                      }`}
                    >
                      {subcat.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

FilterBoxes.propTypes = {
  selectedCategory: PropTypes.string,
  onCategoryChange: PropTypes.func.isRequired,
  onCategoriesLoaded: PropTypes.func,
};

export default FilterBoxes;
