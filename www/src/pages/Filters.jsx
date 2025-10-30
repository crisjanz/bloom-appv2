import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";
import FilterBoxes from "../components/Filters/FilterBoxes.jsx";
import ProductGrid from "../components/Filters/ProductGrid.jsx";

const Filters = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <>
      <Breadcrumb pageName="Shop" />

      <section className="bg-tg-bg pb-[90px] pt-3 dark:bg-dark">
        <div className="container mx-auto">
          <FilterTop />

          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4 lg:w-4/12 xl:w-3/12">
              <FilterBoxes onCategoryChange={setSelectedCategory} />
            </div>
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
