import { Link } from "react-router-dom";
import ProductGrid from "../../components/Filters/ProductGrid";
import FilterTop from "../../components/Filters/FilterTop";
import Breadcrumb from "../../components/Breadcrumb";

const Valentines = () => {
  const categoryId = "16b4f5b3-f0a2-4807-88cd-c84101a52cc3";

  return (
    <div className="bg-gray-50 dark:bg-dark min-h-screen">
      <Breadcrumb
        pageName="Valentine's Day"
        path={[{ label: "Holidays", url: "#" }]}
      />

      {/* FULLY CUSTOM Valentine's Day Design */}
      <section className="relative w-full bg-gradient-to-br from-pink-50 via-red-50 to-pink-100 dark:from-dark-2 dark:via-dark-2 dark:to-dark-2">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl font-bold text-red-600 dark:text-red-400 mb-4">
              Valentine's Day ❤️
            </h1>
            <p className="text-2xl text-gray-700 dark:text-dark-6 mb-8">
              Show your love with beautiful roses and romantic arrangements
            </p>
            <div className="flex justify-center gap-4">
              <Link
                to="#"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-full transition-colors text-lg"
              >
                Shop Roses 🌹
              </Link>
              <Link
                to="#"
                className="bg-pink-600 hover:bg-pink-700 text-white font-semibold px-8 py-4 rounded-full transition-colors text-lg"
              >
                Romantic Bouquets 💕
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Filter and Sort */}
      <FilterTop />

      {/* Products Grid - same component, just filtered */}
      <div className="pb-12">
        <ProductGrid selectedCategory={categoryId} />
      </div>
    </div>
  );
};

export default Valentines;
