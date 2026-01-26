import { useState, useEffect } from "react";
import Pagination from "./Pagination.jsx";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { useCart } from "../../contexts/CartContext";
import placeholderImage from "../../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const ProductGrid = ({
  selectedCategory = null,
  selectedCategoryIds = null,
  searchQuery = "",
  priceRange = "",
}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadProducts() {
      try {
        const allProducts = await getProducts();
        // Filter for active products visible on website (BOTH, ONLINE, WEBSITE_ONLY)
        const activeProducts = allProducts.filter(
          (p) => p.isActive && p.visibility !== 'POS_ONLY'
        );
        setProducts(activeProducts);
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  useEffect(() => {
    let filtered = [...products];

    const categoryIds =
      Array.isArray(selectedCategoryIds) && selectedCategoryIds.length > 0
        ? selectedCategoryIds
        : selectedCategory
          ? [selectedCategory]
          : null;

    // Filter by category
    if (categoryIds) {
      filtered = filtered.filter((product) => {
        const productCategoryIds =
          Array.isArray(product.categoryIds) && product.categoryIds.length > 0
            ? product.categoryIds
            : product.categoryId
              ? [product.categoryId]
              : product.category?.id
                ? [product.category.id]
                : [];

        return categoryIds.some((categoryId) =>
          productCategoryIds.includes(categoryId)
        );
      });
    } else {
      // When showing all products, hide add-ons (they only show in their specific categories)
      filtered = filtered.filter((p) => p.productType !== 'ADDON');
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by price range
    if (priceRange) {
      filtered = filtered.filter((p) => {
        const price = p.price; // Use lowest price from product

        if (priceRange === "0-75") {
          return price >= 0 && price <= 75;
        } else if (priceRange === "75-120") {
          return price > 75 && price <= 120;
        } else if (priceRange === "120+") {
          return price > 120;
        }
        return true;
      });
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, selectedCategoryIds, searchQuery, priceRange]);

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  if (loading) {
    return (
      <div className="flex flex-wrap -mx-4">
        <div className="w-full px-4 text-center py-20">
          <p className="text-body-color dark:text-dark-6">Loading products...</p>
        </div>
      </div>
    );
  }

  if (filteredProducts.length === 0) {
    return (
      <div className="flex flex-wrap -mx-4">
        <div className="w-full px-4 text-center py-20">
          <p className="text-body-color dark:text-dark-6">No products found.</p>
        </div>
      </div>
    );
  }
  return (
    <>
      {/* MOBILE: Compact 2-column grid */}
      <div className="grid grid-cols-2 gap-3 mb-8 md:hidden">
        {filteredProducts.map((product) => (
          <Link
            key={product.id}
            to={`/product-details?id=${product.id}`}
            className="block"
          >
            <div className="relative mb-2">
              <img
                src={product.images?.[0] || placeholderImage}
                alt={product.name}
                className="w-full aspect-square object-cover rounded"
              />
              {product.showOnHomepage && (
                <span className="absolute top-1 left-1 px-2 py-0.5 text-xs font-semibold text-white rounded bg-secondary">
                  Featured
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium text-dark dark:text-white mb-1 line-clamp-2">
              {product.name}
            </h3>
            <p className="text-base font-semibold text-dark dark:text-white">
              ${product.price.toFixed(2)}
            </p>
          </Link>
        ))}
      </div>

      {/* DESKTOP: Clean square grid */}
      <div className="hidden md:flex md:flex-wrap md:-mx-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="w-full h-full px-4 md:w-1/3 xl:w-1/4">
            <div className="mb-10 overflow-hidden bg-white dark:bg-dark-2">
              <Link to={`/product-details?id=${product.id}`} className="block">
                <div className="relative">
                  <img
                    src={product.images?.[0] || placeholderImage}
                    alt={product.name}
                    className="w-full aspect-square object-cover"
                  />

                </div>
              </Link>
              <div className="px-5 pt-3 pb-8 text-center">
                <h3>
                  <Link
                    to={`/product-details?id=${product.id}`}
                    className="text-dark hover:text-primary xs:text-xl mb-[3px] block text-lg font-semibold dark:text-white"
                  >
                    {product.name}
                  </Link>
                </h3>
                <p className="text-lg font-medium text-dark dark:text-white">
                  ${product.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length > 9 && (
          <div className="w-full px-4 text-center">
            <Pagination totalPages={Math.ceil(filteredProducts.length / 9)} />
          </div>
        )}
      </div>
    </>
  );
};

export default ProductGrid;
