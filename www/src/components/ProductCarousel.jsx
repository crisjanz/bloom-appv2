import "swiper/css";
import "swiper/css/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import { Link } from "react-router-dom";
import { useCallback, useRef, useState, useEffect } from "react";
import { getFeaturedProducts } from "../services/productService";
import { useCart } from "../contexts/CartContext";

import placeholderImage from "../assets/ecom-images/products/product-carousel-02/image-01.jpg";

const ProductCarousel = () => {
  const sliderRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    async function loadProducts() {
      try {
        const featuredProducts = await getFeaturedProducts();
        setProducts(featuredProducts.slice(0, 8)); // Limit to 8 products
      } catch (error) {
        console.error('Failed to load featured products:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const handlePrev = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    if (!sliderRef.current) return;
    sliderRef.current.swiper.slideNext();
  }, []);

  const handleAddToCart = (product) => {
    addToCart(product);
  };

  if (loading) {
    return (
      <section className="dark:bg-dark">
        <div className="container mx-auto overflow-hidden py-20">
          <div className="text-center">
            <p className="text-body-color dark:text-dark-6">Loading featured products...</p>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't show section if no featured products
  }

  return (
    <>
      <section className="dark:bg-dark">
        <div className="container mx-auto overflow-hidden py-20">
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4">
              <div className="mx-auto mb-[65px] max-w-[510px] text-center">
                <h2 className="mb-4 text-3xl font-bold text-dark dark:text-white sm:text-4xl md:text-[40px] md:leading-[1.2]">
                  You may also like
                </h2>
                <span className="mx-auto mb-[18px] block h-[3px] w-[100px] bg-primary"></span>
                <p className="text-base text-body-color dark:text-dark-6">
                  There are many variations of passages of Lorem Ipsum available
                  but the majority have suffered alteration in some form.
                </p>
              </div>
            </div>
          </div>

          <Swiper
            className="overflow-visible!"
            loop={true}
            spaceBetween={30}
            ref={sliderRef}
            breakpoints={{
              640: {
                width: 640,
                slidesPerView: 1,
              },
              768: {
                width: 768,
                slidesPerView: 2.2,
              },
              1024: {
                width: 1024,
                slidesPerView: 2.2,
              },
              1280: {
                width: 1280,
                slidesPerView: 4,
              },
            }}
          >
            {products.map((product) => (
              <SwiperSlide key={product.id}>
                <div className="mb-10 overflow-hidden rounded-lg bg-white shadow-1 dark:bg-dark-2 dark:shadow-box-dark">
                  <div className="relative">
                    <img
                      src={product.images?.[0] || placeholderImage}
                      alt={product.name}
                      className="w-full h-64 object-cover"
                    />
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
                    <p className="text-lg font-medium text-dark dark:text-white">
                      ${product.price.toFixed(2)}
                    </p>
                    <div className="flex items-center justify-center gap-1 pb-5 pt-[18px]">
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
                        onClick={() => handleAddToCart(product)}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-7 py-3 text-center text-base font-medium text-white hover:bg-dark"
                      >
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </div>
              </SwiperSlide>
            ))}

            <div className="absolute -bottom-[52px] left-0 right-0 z-50 flex items-center justify-center space-x-4">
              <div className="prev-arrow cursor-pointer" onClick={handlePrev}>
                <button className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-body-color bg-white text-body-color hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6">
                  <svg
                    width={21}
                    height={20}
                    viewBox="0 0 21 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-current"
                  >
                    <path d="M18.25 9.3125H4.90625L10.2187 3.90625C10.5 3.625 10.5 3.1875 10.2187 2.90625C9.9375 2.625 9.5 2.625 9.21875 2.90625L2.75 9.46875C2.46875 9.75 2.46875 10.1875 2.75 10.4688L9.21875 17.0312C9.34375 17.1563 9.53125 17.25 9.71875 17.25C9.90625 17.25 10.0625 17.1875 10.2187 17.0625C10.5 16.7812 10.5 16.3438 10.2187 16.0625L4.9375 10.7187H18.25C18.625 10.7187 18.9375 10.4062 18.9375 10.0312C18.9375 9.625 18.625 9.3125 18.25 9.3125Z" />
                  </svg>
                </button>
              </div>
              <div className="next-arrow cursor-pointer" onClick={handleNext}>
                <button className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-body-color bg-white text-body-color hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6">
                  <svg
                    width={21}
                    height={20}
                    viewBox="0 0 21 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="fill-current"
                  >
                    <path d="M18.25 9.5L11.7812 2.9375C11.5 2.65625 11.0625 2.65625 10.7812 2.9375C10.5 3.21875 10.5 3.65625 10.7812 3.9375L16.0312 9.28125H2.75C2.375 9.28125 2.0625 9.59375 2.0625 9.96875C2.0625 10.3437 2.375 10.6875 2.75 10.6875H16.0937L10.7812 16.0938C10.5 16.375 10.5 16.8125 10.7812 17.0938C10.9062 17.2188 11.0937 17.2813 11.2812 17.2813C11.4687 17.2813 11.6562 17.2188 11.7812 17.0625L18.25 10.5C18.5312 10.2187 18.5312 9.78125 18.25 9.5Z" />
                  </svg>
                </button>
              </div>
            </div>
          </Swiper>
        </div>
      </section>
    </>
  );
};

export default ProductCarousel;
