import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { buildCategoryUrl } from "../../utils/categoryTree";

const FilterTopCat = ({ onPriceChange, categories = [] }) => {
  const [selectedPrice, setSelectedPrice] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const categorySections = useMemo(() => {
    if (!Array.isArray(categories) || categories.length === 0) return [];

    return categories.map((category) => {
      const children = Array.isArray(category.children) ? category.children : [];
      const items = children.length
        ? [
            { name: `All ${category.name}`, url: buildCategoryUrl(category.slug) },
            ...children.map((child) => ({
              name: child.name,
              url: buildCategoryUrl(category.slug, child.slug),
            })),
          ]
        : [{ name: category.name, url: buildCategoryUrl(category.slug) }];

      return {
        title: category.name,
        items,
      };
    });
  }, [categories]);

  const handlePriceChange = (value) => {
    setSelectedPrice(value);
    if (onPriceChange) {
      onPriceChange(value);
    }
  };

  return (
    <>
      <div className="mb-1 bg-white p-4 dark:bg-dark-2">
        {/* Filter Button */}
        <button
          onClick={() => setFilterOpen(true)}
          className="inline-flex items-center gap-2 rounded-[5px] border border-stroke bg-transparent py-2 px-4 font-medium text-dark outline-none hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" className="stroke-current">
            <path d="M2.5 6H6.5M6.5 6C6.5 7.38071 7.61929 8.5 9 8.5C10.3807 8.5 11.5 7.38071 11.5 6M6.5 6C6.5 4.61929 7.61929 3.5 9 3.5C10.3807 3.5 11.5 4.61929 11.5 6M11.5 6H17.5M2.5 14H8.5M8.5 14C8.5 15.3807 9.61929 16.5 11 16.5C12.3807 16.5 13.5 15.3807 13.5 14M8.5 14C8.5 12.6193 9.61929 11.5 11 11.5C12.3807 11.5 13.5 12.6193 13.5 14M13.5 14H17.5" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Filters
        </button>
      </div>

      {/* Side Panel Overlay */}
      {filterOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40"
          onClick={() => setFilterOpen(false)}
        />
      )}

      {/* Side Panel */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white/100 dark:bg-dark-2/95 backdrop-blur-sm shadow-xl z-50 transform transition-transform duration-300 ${filterOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-stroke dark:border-dark-3">
            <h3 className="text-xl font-semibold text-dark dark:text-white">Filters</h3>
            <button
              onClick={() => setFilterOpen(false)}
              className="text-dark dark:text-white hover:text-primary"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="fill-current">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Price Range */}
            <div className="mb-8">
              <h4 className="text-sm font-semibold text-dark dark:text-white mb-3">Price Range</h4>
              <div className="space-y-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    value=""
                    checked={selectedPrice === ""}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-body-color dark:text-dark-6">All Prices</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    value="0-75"
                    checked={selectedPrice === "0-75"}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-body-color dark:text-dark-6">$0 - $75</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    value="75-120"
                    checked={selectedPrice === "75-120"}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-body-color dark:text-dark-6">$75 - $120</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    value="120+"
                    checked={selectedPrice === "120+"}
                    onChange={(e) => handlePriceChange(e.target.value)}
                    className="mr-3"
                  />
                  <span className="text-body-color dark:text-dark-6">$120+</span>
                </label>
              </div>
            </div>

            {/* Shop All */}
            <div className="mb-8">
              <Link
                to="/shop"
                className="block text-body-color dark:text-dark-6 hover:text-primary py-1 font-semibold"
                onClick={() => setFilterOpen(false)}
              >
                Shop All
              </Link>
            </div>

            {categorySections.map((section) => (
              <div key={section.title} className="mb-8">
                <h4 className="text-sm font-semibold text-dark dark:text-white mb-3">
                  {section.title}
                </h4>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.url}
                      to={item.url}
                      className="block text-body-color dark:text-dark-6 hover:text-primary py-1"
                      onClick={() => setFilterOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default FilterTopCat;
