import { useMemo, useState, useEffect } from "react";
import PropTypes from 'prop-types';
import placeholderImage from "../../assets/ecom-images/products-details/details-01/big-image-01.jpg";

const normalizeImages = (images) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .map((image) => {
      if (!image) return null;
      if (typeof image === "string") {
        return image;
      }
      if (typeof image === "object" && typeof image.url === "string") {
        return image.url;
      }
      return null;
    })
    .filter((url) => typeof url === "string" && url.length > 0);
};

const ProductTab = ({ product, selectedVariant = null }) => {
  const normalizedImages = useMemo(
    () => normalizeImages(product?.images),
    [product?.images]
  );

  const displayImages = useMemo(() => {
    const featured = selectedVariant?.featuredImageUrl;
    if (!featured) {
      return normalizedImages;
    }

    let removed = false;
    const remaining = normalizedImages.filter((image) => {
      if (!removed && image === featured) {
        removed = true;
        return false;
      }
      return true;
    });

    return [featured, ...remaining];
  }, [selectedVariant?.featuredImageUrl, normalizedImages]);

  const imagesToRender = displayImages.length > 0 ? displayImages : [placeholderImage];
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    setActiveTab(0);
  }, [product?.id, selectedVariant?.id, selectedVariant?.featuredImageUrl, normalizedImages]);

  const handleTab = (index) => {
    setActiveTab(index);
  };

  return (
    <>
      <div className="mb-12 lg:mb-0 lg:mr-5 xl:mr-10">
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={imagesToRender[activeTab]}
            alt={product.name}
            className="w-full h-auto object-contain"
          />
        </div>

        {imagesToRender.length > 1 && (
          <div className="-mx-4 flex items-center justify-between">
            {imagesToRender.map((image, index) => (
              <div key={index} className="w-1/3 px-4">
                <button
                  onClick={() => handleTab(index)}
                  className={`w-full overflow-hidden rounded-lg ${activeTab === index ? "opacity-60 border-2 border-primary" : ""}`}
                >
                  <img
                    src={image}
                    alt={`${product.name} - Image ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

ProductTab.propTypes = {
  product: PropTypes.object.isRequired,
  selectedVariant: PropTypes.object,
};

export default ProductTab;
