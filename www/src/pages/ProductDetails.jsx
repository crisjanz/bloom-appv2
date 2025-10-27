import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import ProductTab from "../components/ProductDetails/ProductTab.jsx";
import DetailsBox from "../components/ProductDetails/DetailsBox.jsx";
import RelatedProducts from "../components/ProductDetails/RelatedProducts.jsx";
import { getProductById } from "../services/productService";

const ProductDetails = () => {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('id');
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const productData = await getProductById(productId);
        setProduct(productData);
      } catch (error) {
        console.error('Failed to load product:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <>
        <Breadcrumb pageName="Product Details" />
        <section className="bg-tg-bg pt-24 pb-20 dark:bg-dark">
          <div className="container mx-auto text-center">
            <p className="text-body-color dark:text-dark-6">Loading product...</p>
          </div>
        </section>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Breadcrumb pageName="Product Not Found" />
        <section className="bg-tg-bg pt-24 pb-20 dark:bg-dark">
          <div className="container mx-auto text-center">
            <p className="text-body-color dark:text-dark-6">Product not found.</p>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName={product.name} />

      <section className="bg-tg-bg pt-24 dark:bg-dark lg:pb-[90px]">
        <div className="container mx-auto">
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4 lg:w-1/2 xl:w-7/12">
              <ProductTab product={product} />
            </div>

            <div className="w-full px-4 lg:w-1/2 xl:w-5/12">
              <div>
                <DetailsBox product={product} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <RelatedProducts productId={product.id} categoryId={product.categoryId} />
    </>
  );
};

export default ProductDetails;
