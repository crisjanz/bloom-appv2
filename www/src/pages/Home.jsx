import { Link } from "react-router-dom";
import FrequentlySoldProducts from "../components/FrequentlySoldProducts.jsx";
import ProductCategory from "../components/ProductCategory.jsx";
import RecentProduct from "../components/RecentProduct.jsx";

const Home = () => {
  return (
    <>
      {/* Hero Section with Image and Content Box */}
      <section className="relative w-full">
        {/* Desktop: Image with overlay box */}
        <div className="hidden md:block relative h-[500px] lg:h-[600px]">
          <img
            src="/images/home.jpg"
            alt="Bloom Flowers Farm"
            className="w-full h-full object-cover"
          />

          {/* White content box - bottom left */}
          <div className="absolute bottom-8 left-8 lg:bottom-12 lg:left-12 bg-white p-8 lg:p-10 rounded-lg shadow-xl max-w-md">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Fresh Flowers from Our Farm
            </h1>
            <p className="text-gray-600 mb-6 text-base lg:text-lg">
              Locally grown, carefully arranged, and delivered with love to brighten your day.
            </p>
            <Link
              to="/shop"
              className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-md transition-colors"
            >
              Shop Now
            </Link>
          </div>
        </div>

        {/* Mobile: Image then content below */}
        <div className="md:hidden">
          <div className="w-full h-[300px]">
            <img
              src="/images/home.jpg"
              alt="Bloom Flowers Farm"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="bg-white p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Fresh Flowers from Our Farm
            </h1>
            <p className="text-gray-600 mb-5 text-base">
              Locally grown, carefully arranged, and delivered with love to brighten your day.
            </p>
            <Link
              to="/shop"
              className="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-md transition-colors w-full text-center"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </section>
      <ProductCategory />
      <RecentProduct />

    </>
  );
};

export default Home;
