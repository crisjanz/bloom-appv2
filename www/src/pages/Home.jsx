import FrequentlySoldProducts from "../components/FrequentlySoldProducts.jsx";
import ProductCategory from "../components/ProductCategory.jsx";

const Home = () => {
  return (
    <>
      {/* Welcome/Hero Section - Build custom block here */}
      <section className="py-10 dark:bg-dark">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">Welcome to Bloom Flowers</h1>
          <p className="text-center text-gray-600">Fresh flowers for every occasion</p>
        </div>
      </section>

      <FrequentlySoldProducts />
      <ProductCategory />
    </>
  );
};

export default Home;
