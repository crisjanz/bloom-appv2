import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import FilterTop from "../components/Filters/FilterTop.jsx";
// ...existing code...
import ProductGrid from "../components/Filters/ProductGrid.jsx";

const Filters = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [pendingCategoryParam, setPendingCategoryParam] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const categoryParam = searchParams.get("category");

  useEffect(() => {
    setPendingCategoryParam(categoryParam);
  }, [categoryParam]);

  const flattenCategories = useCallback((tree) => {
    const result = [];

    const traverse = (nodes) => {
      nodes.forEach((node) => {
        result.push(node);
        if (Array.isArray(node.children) && node.children.length > 0) {
          traverse(node.children);
        }
      });
    };

    traverse(tree);
    return result;
  }, []);

  useEffect(() => {
    if (!pendingCategoryParam) {
      setSelectedCategory(null);
      return;
    }

    if (!categoriesTree.length) {
      return;
    }

    const flat = flattenCategories(categoriesTree);
    const lowerParam = pendingCategoryParam.toLowerCase();
    const matched =
      flat.find(
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
    categoriesTree,
    flattenCategories,
    pendingCategoryParam,
    searchParams,
    setSearchParams,
  ]);

  const handleCategoriesLoaded = useCallback((tree) => {
    setCategoriesTree(tree);
  }, []);

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
            <FilterTop />
          </div>
         <div className="-mx-4 md-flex md-flex-wrap">
            {/* Products Grid */}
            <div className="w-full px-4 md-flex">
              <ProductGrid selectedCategory={selectedCategory} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Filters;