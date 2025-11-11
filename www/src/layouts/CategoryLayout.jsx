import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import ProductGrid from "../components/Filters/ProductGrid.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";

const CategoryLayout = ({
  title,
  description,
  heroImage,
  categoryId,
  categoryType = "occasion" // "occasion" or "holiday"
}) => {
  const [priceRange, setPriceRange] = useState("");

  const breadcrumbPath = [
    { label: categoryType === "holiday" ? "Holidays" : "Occasions", url: "#" },
  ];

  return (
    <div className="bg-white dark:bg-dark min-h-screen">
      <Breadcrumb pageName={title} path={breadcrumbPath} />

      {/* Hero Section */}
      <section className="relative w-full bg-white dark:bg-dark">
        {heroImage && (
          <div className="relative h-[300px] lg:h-[400px]">
            <img
              src={heroImage}
              alt={title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-40"></div>
          </div>
        )}

        <div className="container mx-auto px-4 py-2 xl:py-6">
          {/* Mobile: Filter above title */}
          <div className="mb-2 md:hidden">
            <FilterTop onPriceChange={setPriceRange} />
          </div>

          {/* Desktop: Filter on left, title centered */}
          <div className="relative">
            <div className="hidden md:block absolute left-0 top-0">
              <FilterTop onPriceChange={setPriceRange} />
            </div>
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl lg:text-5xl font-bold text-dark dark:text-white mb-4">
                {title}
              </h1>
              {description && (
                <p className="text-lg text-gray-600 dark:text-dark-6">
                  {description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <div className="container mx-auto px-4 pb-12">
        <ProductGrid selectedCategory={categoryId} priceRange={priceRange} />
      </div>
    </div>
  );
};

export default CategoryLayout;
