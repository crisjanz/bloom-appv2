import { useState, useEffect } from "react";
import PropTypes from 'prop-types';
import { Link } from "react-router-dom";
import { getRelatedProducts } from "../../services/productService";
import { useCart } from "../../contexts/CartContext";
import placeholderImage from "../../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const RelatedProducts = ({ productId, categoryId }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadRelatedProducts() {
      try {
        const products = await getRelatedProducts(productId, categoryId, 4);
        setRelatedProducts(products);
      } catch (error) {
        console.error('Failed to load related products:', error);
      } finally {
        setLoading(false);
      }
    }

    if (productId && categoryId) {
      loadRelatedProducts();
    }
  }, [productId, categoryId]);

  if (loading) {
    return (
      <section className="py-20 dark:bg-dark">
        <div className="container mx-auto">
          <p className="text-center text-body-color dark:text-dark-6">Loading related products...</p>
        </div>
      </section>
    );
  }

  if (relatedProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-20 dark:bg-dark">
      <div className="container mx-auto">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-dark dark:text-white sm:text-4xl md:text-[40px] md:leading-[1.2]">
            You May Also Like
          </h2>
          <span className="mx-auto mb-[18px] block h-[3px] w-[100px] bg-primary"></span>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {relatedProducts.map((product) => (
            <div key={product.id} className="overflow-hidden rounded-lg bg-white shadow-1 dark:bg-dark-2 dark:shadow-box-dark">
              <div className="relative">
                <Link to={`/product-details?id=${product.id}`}>
                  <img
                    src={product.images?.[0] || placeholderImage}
                    alt={product.name}
                    className="w-full h-64 object-cover"
                  />
                </Link>
                {product.showOnHomepage && (
                  <span className="absolute left-6 top-4 inline-flex items-center justify-center rounded-sm bg-secondary px-[10px] py-[3px] text-sm font-medium text-white">
                    Featured
                  </span>
                )}
              </div>
              <div className="px-6 pb-8 pt-6 text-center">
                <h3>
                  <Link
                    to={`/product-details?id=${product.id}`}
                    className="mb-[5px] block text-lg font-semibold text-dark hover:text-primary dark:text-white xs:text-xl"
                  >
                    {product.name}
                  </Link>
                </h3>
                <p className="mb-5 text-lg font-medium text-dark dark:text-white">
                  ${product.price.toFixed(2)}
                </p>
                <div className="flex items-center justify-center gap-1 pb-5">
                  {[...Array(5).keys()].map((index) => (
                    <span key={index}>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_1818_932)">
                          <path
                            d="M14.925 5.975L10.4 5.275L8.34996 0.975C8.19996 0.675 7.79996 0.675 7.64996 0.975L5.59996 5.3L1.09996 5.975C0.77496 6.025 0.64996 6.45 0.89996 6.675L4.17496 10.05L3.39996 14.775C3.34996 15.1 3.67496 15.375 3.97496 15.175L8.04996 12.95L12.1 15.175C12.375 15.325 12.725 15.075 12.65 14.775L11.875 10.05L15.15 6.675C15.35 6.45 15.25 6.025 14.925 5.975Z"
                            fill="#FFA645"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_1818_932">
                            <rect width="16" height="16" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                    </span>
                  ))}
                </div>
                <div className="text-center">
                  <button
                    onClick={() => addToCart(product)}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-3 text-center text-base font-medium text-white hover:bg-dark"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

RelatedProducts.propTypes = {
  productId: PropTypes.string.isRequired,
  categoryId: PropTypes.string.isRequired,
};

export default RelatedProducts;
