import { useState } from "react";
import PropTypes from 'prop-types';
import placeholderImage from "../../assets/ecom-images/products-details/details-01/big-image-01.jpg";

const ProductTab = ({ product }) => {
  const images = product.images && product.images.length > 0 ? product.images : [placeholderImage];
  const [activeTab, setActiveTab] = useState(0);

  const handleTab = (index) => {
    setActiveTab(index);
  };

  return (
    <>
      <div className="mb-12 lg:mb-0 lg:mr-5 xl:mr-10">
        <div className="mb-8 overflow-hidden rounded-lg">
          <img
            src={images[activeTab]}
            alt={product.name}
            className="w-full h-auto object-contain"
          />
        </div>

        {images.length > 1 && (
          <div className="-mx-4 flex items-center justify-between">
            {images.map((image, index) => (
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
};

export default ProductTab;
