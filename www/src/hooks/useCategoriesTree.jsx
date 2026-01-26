import { useEffect, useState } from "react";
import { getCategoriesTree } from "../services/categoryService";
import { filterActiveCategories } from "../utils/categoryTree";

const useCategoriesTree = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setLoading(true);
      try {
        const data = await getCategoriesTree();
        const normalized = filterActiveCategories(Array.isArray(data) ? data : []);
        if (isMounted) {
          setCategories(normalized);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message || "Failed to load categories");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  return { categories, loading, error };
};

export default useCategoriesTree;
