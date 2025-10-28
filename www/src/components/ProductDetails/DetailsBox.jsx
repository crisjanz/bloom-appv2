import { useState } from "react";
import PropTypes from 'prop-types';
import { useCart } from "../../contexts/CartContext";
import DeliveryDatePicker from "../DeliveryDatePicker";
import AddOns from "./AddOns";

const DetailsBox = ({ product }) => {
  const [quantity, setQuantity] = useState(1);
  const { addToCart, deliveryDate, setDeliveryDate } = useCart();

  const increment = () => {
    setQuantity(quantity + 1);
  };

  const decrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    if (!deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    setQuantity(1);
  };

  return (
    <>
      <h2 className="mb-[22px] text-2xl font-bold text-dark dark:text-white sm:text-3xl md:text-4xl lg:text-3xl xl:text-4xl">
        {product.name}
      </h2>

      <div className="mb-6 flex items-center">
        <div className="flex items-center">
          <span className="pr-2">
            <svg
              width={20}
              height={20}
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_1031_24115)">
                <path
                  d="M10 0.5625C4.78125 0.5625 0.5625 4.78125 0.5625 10C0.5625 15.2188 4.78125 19.4688 10 19.4688C15.2188 19.4688 19.4688 15.2188 19.4688 10C19.4688 4.78125 15.2188 0.5625 10 0.5625ZM10 18.0625C5.5625 18.0625 1.96875 14.4375 1.96875 10C1.96875 5.5625 5.5625 1.96875 10 1.96875C14.4375 1.96875 18.0625 5.59375 18.0625 10.0312C18.0625 14.4375 14.4375 18.0625 10 18.0625Z"
                  fill="#22AD5C"
                />
                <path
                  d="M12.6874 7.09368L8.96868 10.7187L7.28118 9.06243C6.99993 8.78118 6.56243 8.81243 6.28118 9.06243C5.99993 9.34368 6.03118 9.78118 6.28118 10.0624L8.28118 11.9999C8.46868 12.1874 8.71868 12.2812 8.96868 12.2812C9.21868 12.2812 9.46868 12.1874 9.65618 11.9999L13.6874 8.12493C13.9687 7.84368 13.9687 7.40618 13.6874 7.12493C13.4062 6.84368 12.9687 6.84368 12.6874 7.09368Z"
                  fill="#22AD5C"
                />
              </g>
              <defs>
                <clipPath id="clip0_1031_24115">
                  <rect width={20} height={20} fill="white" />
                </clipPath>
              </defs>
            </svg>
          </span>
          <span className="text-base font-medium text-dark dark:text-white">
            {product.isActive ? 'Available' : 'Out of Stock'}
          </span>
        </div>
      </div>

      {product.description && product.description !== 'No description provided' && (
        <p className="mb-8 text-base font-medium text-body-color">
          {product.description}
        </p>
      )}

      <div className="mb-8">
        <p className="mb-2 text-base font-medium text-dark dark:text-white">
          Category: {product.category?.name}
        </p>
      </div>

      <DeliveryDatePicker
        selectedDate={deliveryDate}
        onDateChange={setDeliveryDate}
        required={true}
      />

      <div className="mb-7 flex-wrap justify-between xs:flex">
        <div className="mb-8 xs:mb-0">
          <p className="mb-3 text-base font-medium text-dark dark:text-white">
            Quantity
          </p>

          <div className="inline-flex items-center rounded-sm border border-stroke text-base font-medium text-dark dark:border-dark-3 dark:text-white">
            <span
              className="flex h-9 w-[34px] cursor-pointer select-none items-center justify-center text-dark dark:text-white"
              onClick={decrement}
            >
              <svg
                width={12}
                height={4}
                viewBox="0 0 12 4"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.3333 1.84615V2.15385C11.3333 2.52308 11.0385 2.84615 10.6667 2.84615H1.33332C0.988698 2.84615 0.666655 2.52308 0.666655 2.15385V1.84615C0.666655 1.47692 0.988698 1.15385 1.33332 1.15385H10.6667C11.0385 1.15385 11.3333 1.47692 11.3333 1.84615Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className="flex h-9 w-[31px] items-center justify-center">
              {quantity}
            </span>
            <span
              className="flex h-9 w-[34px] cursor-pointer select-none items-center justify-center text-dark dark:text-white"
              onClick={increment}
            >
              <svg
                width={12}
                height={12}
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11.3333 5.84615V6.15385C11.3333 6.52308 11.0385 6.84615 10.6667 6.84615H6.66666V10.8462C6.66666 11.2154 6.37179 11.5385 5.99999 11.5385H5.69231C5.32051 11.5385 4.99999 11.2154 4.99999 10.8462V6.84615H1.33332C0.961518 6.84615 0.666655 6.52308 0.666655 6.15385V5.84615C0.666655 5.47692 0.961518 5.15385 1.33332 5.15385H4.99999V1.15385C4.99999 0.784619 5.32051 0.461548 5.69231 0.461548H5.99999C6.37179 0.461548 6.66666 0.784619 6.66666 1.15385V5.15385H10.6667C11.0385 5.15385 11.3333 5.47692 11.3333 5.84615Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <span className="pr-2 text-3xl font-bold text-dark dark:text-white sm:text-4xl">
            ${product.price.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mb-8">
        <button
          onClick={handleAddToCart}
          disabled={!product.isActive}
          className="flex w-full items-center justify-center rounded-md bg-primary px-10 py-[13px] text-center text-base font-medium text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add to Cart
        </button>
      </div>

      <AddOns />
    </>
  );
};

DetailsBox.propTypes = {
  product: PropTypes.object.isRequired,
};

export default DetailsBox;
