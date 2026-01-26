import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";
// ...existing code...
import ProductGrid from "../components/Filters/ProductGrid.jsx";
import useCategoriesTree from "../hooks/useCategoriesTree.jsx";
import { flattenCategories } from "../utils/categoryTree";

const Filters = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [pendingCategoryParam, setPendingCategoryParam] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories } = useCategoriesTree();

  const categoryParam = searchParams.get("category");

  useEffect(() => {
    setPendingCategoryParam(categoryParam);
  }, [categoryParam]);

  const flatCategories = useMemo(
    () => flattenCategories(categories),
    [categories]
  );

  useEffect(() => {
    if (!pendingCategoryParam) {
      setSelectedCategory(null);
      return;
    }

    if (!flatCategories.length) {
      return;
    }

    const lowerParam = pendingCategoryParam.toLowerCase();
    const matched =
      flatCategories.find(
        (category) =>
          category.id === pendingCategoryParam ||
          category.slug === pendingCategoryParam ||
          category.name.toLowerCase() === lowerParam,
      )?.id ?? null;

    setSelectedCategory(matched);

    if (matched && matched !== pendingCategoryParam) {
      const params = new URLSearchParams(searchParams);
      params.set("category", matched);
      setSearchParams(params, { replace: true });
    }
  }, [
    flatCategories,
    pendingCategoryParam,
    searchParams,
    setSearchParams,
  ]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedCategory]);

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);

    const params = new URLSearchParams(searchParams);
    if (category) {
      params.set("category", category);
    } else {
      params.delete("category");
    }
    setSearchParams(params, { replace: true });

    setIsFilterOpen(false);
  };

  return (
    <>
      <Breadcrumb pageName="Shop" />

      <section className="bg-white pb-[90px] pt-3 dark:bg-dark">
        <div className="container mx-auto px-4 pb-12">
          {/* Show FilterTop */}
          <div className="">
            <FilterTop categories={categories} />
          </div>
         <div className="-mx-4 md-flex md-flex-wrap">
            {/* Products Grid */}
            <div className="w-full px-4 md-flex">
              <ProductGrid selectedCategoryIds={selectedCategory ? [selectedCategory] : null} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Filters;
