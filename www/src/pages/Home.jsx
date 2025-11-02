import AnnouncementBanner from "../components/AnnouncementBanner.jsx";
import HeroArea from "../components/HeroArea.jsx";
import FrequentlySoldProducts from "../components/FrequentlySoldProducts.jsx";
import SeasonalProducts from "../components/SeasonalProducts.jsx";
import ProductCategory from "../components/ProductCategory.jsx";

const Home = () => {
  return (
    <>
      <AnnouncementBanner />
      <HeroArea />
      <FrequentlySoldProducts />
      <SeasonalProducts />
      <ProductCategory />
    </>
  );
};

export default Home;
