import { useState, useEffect } from "react";
import Pagination from "./Pagination.jsx";
import { Link } from "react-router-dom";
import { getProducts } from "../../services/productService";
import { useCart } from "../../contexts/CartContext";
import placeholderImage from "../../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const ProductGrid = ({ selectedCategory = null, searchQuery = "" }) => {
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

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId === selectedCategory);
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

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

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
      <div className="grid grid-cols-2 gap-3 md:hidden">
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

      {/* DESKTOP: Original card layout */}
      <div className="hidden md:flex md:flex-wrap md:-mx-4">
        {filteredProducts.map((product) => (
          <div key={product.id} className="w-full h-full px-4 md:w-1/3 xl:w-1/4">
            <div className="mb-10 overflow-hidden bg-white rounded-lg shadow-1 dark:bg-dark-2 dark:shadow-box-dark">
              <div className="relative">
                <img
                  src={product.images?.[0] || placeholderImage}
                  alt={product.name}
                  className="w-full h-64 object-cover"
                />
                {product.showOnHomepage && (
                  <span className="absolute inline-flex items-center justify-center px-3 py-1 text-sm font-semibold text-white rounded-sm bg-secondary top-5 left-5">
                    Featured
                  </span>
                )}
              </div>
              <div className="px-5 pt-6 pb-8 text-center">
                <h3>
                  <Link
                    to={`/product-details?id=${product.id}`}
                    className="text-dark hover:text-primary xs:text-xl mb-[5px] block text-lg font-semibold dark:text-white"
                  >
                    {product.name}
                  </Link>
                </h3>
                <p className="text-lg font-medium text-dark dark:text-white">
                  ${product.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-px pt-4 pb-6">
                  {[...Array(5).keys()].map((index) => (
                    <span key={index}>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M18.6562 7.46875L12.9999 6.59375L10.4375 1.21875C10.25 0.84375 9.74995 0.84375 9.56245 1.21875L6.99995 6.625L1.37495 7.46875C0.9687 7.53125 0.81245 8.0625 1.12495 8.34375L5.2187 12.5625L4.24995 18.4688C4.18745 18.875 4.5937 19.2188 4.9687 18.9688L10.0624 16.1875L15.1249 18.9688C15.4687 19.1562 15.9062 18.8438 15.8124 18.4688L14.8437 12.5625L18.9374 8.34375C19.1874 8.0625 19.0624 7.53125 18.6562 7.46875Z"
                          fill="#FFA645"
                        />
                      </svg>
                    </span>
                  ))}
                </div>
                <div className="text-center">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="inline-flex items-center justify-center py-3 text-base font-medium text-center text-white rounded-md bg-primary hover:bg-dark px-7"
                  >
                    Add to Cart
                  </button>
                </div>
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
