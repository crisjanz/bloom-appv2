import { useMemo } from "react";
import { useParams } from "react-router-dom";
import CategoryLayout from "../layouts/CategoryLayout.jsx";
import Breadcrumb from "../components/Breadcrumb.jsx";
import useCategoriesTree from "../hooks/useCategoriesTree.jsx";
import {
  buildCategoryUrl,
  collectDescendantIds,
  findCategoryBySlug,
} from "../utils/categoryTree";

const CategoryPage = () => {
  const { topSlug, childSlug } = useParams();
  const { categories, loading, error } = useCategoriesTree();

  const normalizedTopSlug = (topSlug || "").toLowerCase();
  const normalizedChildSlug = (childSlug || "").toLowerCase();

  const topCategory = useMemo(
    () => categories.find((cat) => cat.slug === normalizedTopSlug),
    [categories, normalizedTopSlug]
  );

  const childCategory = useMemo(() => {
    if (!normalizedChildSlug || !topCategory) return null;
    return findCategoryBySlug(topCategory.children || [], normalizedChildSlug);
  }, [normalizedChildSlug, topCategory]);

  const selectedCategoryIds = useMemo(() => {
    if (childSlug) {
      return childCategory ? collectDescendantIds(childCategory) : [];
    }
    return topCategory ? collectDescendantIds(topCategory) : [];
  }, [childSlug, childCategory, topCategory]);

  const breadcrumbPath = useMemo(() => {
    const path = [{ label: "Shop", url: "/shop" }];

    if (childSlug && topCategory) {
      path.push({
        label: topCategory.name,
        url: buildCategoryUrl(topCategory.slug),
      });
    }

    return path;
  }, [childSlug, topCategory]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark min-h-screen">
        <Breadcrumb pageName="Shop" path={[]} />
        <div className="container mx-auto px-4 py-10 text-center text-body-color dark:text-dark-6">
          Loading categories...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-dark min-h-screen">
        <Breadcrumb pageName="Shop" path={[]} />
        <div className="container mx-auto px-4 py-10 text-center text-body-color dark:text-dark-6">
          {error}
        </div>
      </div>
    );
  }

  if (!topCategory) {
    return (
      <div className="bg-white dark:bg-dark min-h-screen">
        <Breadcrumb pageName="Category not found" path={[{ label: "Shop", url: "/shop" }]} />
        <div className="container mx-auto px-4 py-10 text-center text-body-color dark:text-dark-6">
          Category not found.
        </div>
      </div>
    );
  }

  if (childSlug && !childCategory) {
    return (
      <div className="bg-white dark:bg-dark min-h-screen">
        <Breadcrumb
          pageName="Category not found"
          path={[
            { label: "Shop", url: "/shop" },
            { label: topCategory.name, url: buildCategoryUrl(topCategory.slug) },
          ]}
        />
        <div className="container mx-auto px-4 py-10 text-center text-body-color dark:text-dark-6">
          Category not found.
        </div>
      </div>
    );
  }

  const pageTitle = childCategory?.name || topCategory.name;

  return (
    <CategoryLayout
      title={pageTitle}
      description=""
      categoryIds={selectedCategoryIds}
      breadcrumbPath={breadcrumbPath}
      categories={categories}
    />
  );
};

export default CategoryPage;
