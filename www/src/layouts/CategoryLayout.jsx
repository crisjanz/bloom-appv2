import Breadcrumb from "../components/Breadcrumb.jsx";
import ProductGrid from "../components/Filters/ProductGridCat.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";

const CategoryLayout = ({
  title,
  description,
  heroImage,
  categoryId,
  categoryType = "occasion" // "occasion" or "holiday"
}) => {
  const breadcrumbPath = [
    { label: categoryType === "holiday" ? "Holidays" : "Occasions", url: "#" },
  ];

  return (
    <>
      <Breadcrumb pageName={title} path={breadcrumbPath} />

      {/* Hero Section */}
      <section className="relative w-full bg-white dark:bg-dark-2">
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

        <div className="container mx-auto px-4 py-12">
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
      </section>

      {/* Filter and Sort */}
<div className="container mx-auto px-4">
      <FilterTop /></div>

      {/* Products Grid */}
<div className="container mx-auto px-4">
      <ProductGrid selectedCategory={categoryId} /></div>
    </>
  );
};

export default CategoryLayout;
