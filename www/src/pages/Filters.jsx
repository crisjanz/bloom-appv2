import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";
import FilterBoxes from "../components/Filters/FilterBoxes.jsx";
import ProductGrid from "../components/Filters/ProductGrid.jsx";

const Filters = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setIsFilterOpen(false); // Close modal after selection
  };

  return (
    <>
      <Breadcrumb pageName="Shop" />

      <section className="bg-tg-bg pb-[90px] pt-3 dark:bg-dark">
        <div className="container mx-auto">
          {/* Desktop: Show FilterTop */}
          <div className="hidden md:block">
            <FilterTop />
          </div>

          {/* Mobile: Filter Button */}
          <div className="md:hidden mb-4 px-4">
            <button
              onClick={() => setIsFilterOpen(true)}
              className="w-full py-3 px-4 bg-primary text-white font-medium rounded-lg flex items-center justify-center gap-2 hover:bg-dark transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
          </div>

          {/* Mobile: Filter Modal */}
          {isFilterOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
              <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white dark:bg-dark-2 shadow-xl overflow-y-auto">
                <div className="sticky top-0 bg-white dark:bg-dark-2 border-b border-stroke dark:border-dark-3 px-4 py-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-dark dark:text-white">Filters</h2>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-dark-3 rounded-lg"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-4">
                  <FilterBoxes onCategoryChange={handleCategoryChange} />
                </div>
              </div>
              {/* Backdrop */}
              <div
                className="absolute inset-0 -z-10"
                onClick={() => setIsFilterOpen(false)}
              />
            </div>
          )}

          <div className="-mx-4 flex flex-wrap">
            {/* Desktop: Sidebar */}
            <div className="hidden lg:block w-full px-4 lg:w-4/12 xl:w-3/12">
              <FilterBoxes onCategoryChange={setSelectedCategory} />
            </div>

            {/* Products Grid */}
            <div className="w-full px-4 lg:w-8/12 xl:w-9/12">
              <ProductGrid selectedCategory={selectedCategory} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Filters;
