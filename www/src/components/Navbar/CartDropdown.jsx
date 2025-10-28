import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../contexts/CartContext";
import placeholderImage from "../../assets/ecom-images/checkout/checkout-02/image-02.jpg";

const CartDropdown = () => {
  const [openDropDown, setOpenDropDown] = useState(false);
  const { cart, getCartTotal, getCartCount, removeFromCart } = useCart();

  const handleDropDownToggle = () => {
    setOpenDropDown(!openDropDown);
  };

  const cartRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        cartRef.current &&
        !cartRef.current.contains(event.target) &&
        !event.target.closest(".dropdown-toggle")
      ) {
        setOpenDropDown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <div className="relative z-20">
        <div className="flex max-w-[200px] justify-end">
          <button
            onClick={handleDropDownToggle}
            className="border-stroke dropdown-toggle bg-gray-2 text-dark dark:border-dark-3 dark:bg-dark-2 relative flex h-[42px] w-[42px] items-center justify-center rounded-full border-[.5px] dark:text-white"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-current"
            >
              <path d="M19.3875 6.7375H18.5625L16.3281 1.1C16.1562 0.687499 15.7094 0.515624 15.3312 0.653124C14.9187 0.824999 14.7469 1.27187 14.8844 1.65L16.8781 6.7375H5.12187L7.11562 1.68437C7.28749 1.27187 7.08124 0.824999 6.66874 0.687499C6.29062 0.515624 5.84374 0.687499 5.67187 1.1L3.43749 6.7375H2.61249C1.99374 6.7375 1.47812 7.25312 1.47812 7.87187V10.6562C1.47812 11.2406 1.89062 11.6875 2.47499 11.7562L3.33437 19.25C3.47187 20.4875 4.50312 21.4156 5.74062 21.4156H16.2594C17.4969 21.4156 18.5281 20.4875 18.6656 19.25L19.525 11.7562C20.075 11.6875 20.5219 11.2062 20.5219 10.6562V7.8375C20.5219 7.21875 20.0062 6.7375 19.3875 6.7375ZM3.02499 8.28437H18.975V10.2437H3.02499V8.28437ZM16.2594 19.8687H5.74062C5.29374 19.8687 4.91562 19.525 4.84687 19.0781L4.02187 11.7906H17.9781L17.1531 19.0781C17.0844 19.525 16.7062 19.8687 16.2594 19.8687Z" />
              <path d="M7.49375 13.3375C7.08125 13.3375 6.70312 13.6812 6.70312 14.1281V16.7062C6.70312 17.1187 7.04687 17.4969 7.49375 17.4969C7.94062 17.4969 8.28438 17.1531 8.28438 16.7062V14.0937C8.28438 13.6812 7.94062 13.3375 7.49375 13.3375Z" />
              <path d="M14.5062 13.3375C14.0937 13.3375 13.7156 13.6812 13.7156 14.1281V16.7062C13.7156 17.1187 14.0594 17.4969 14.5062 17.4969C14.9531 17.4969 15.2969 17.1531 15.2969 16.7062V14.0937C15.2625 13.6812 14.9187 13.3375 14.5062 13.3375Z" />
            </svg>
            {getCartCount() > 0 && (
              <span className="bg-primary absolute -top-1 -right-1 h-[18px] w-[18px] rounded-full text-[10px] leading-[18px] font-semibold text-white">
                {getCartCount()}
              </span>
            )}
          </button>
        </div>

        <div ref={cartRef}>
          <div
            className={`absolute top-full right-0 mt-3 w-[330px] ${openDropDown ? "block" : "hidden"}`}
          >
            <div className="p-8 overflow-hidden bg-white rounded-lg shadow-1 dark:bg-dark-2 dark:shadow-box-dark">
              {cart.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-body-color dark:text-dark-6">Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div className="pb-3 mb-5 border-b border-stroke dark:border-dark-3 max-h-[300px] overflow-y-auto">
                    {cart.map((item, index) => (
                      <div
                        key={`${item.id}-${item.variantId || 'default'}`}
                        className={`-mx-1 flex items-center justify-between ${index === 0 ? "pb-4" : "py-4"}`}
                      >
                        <div className="flex items-center px-1 flex-1 min-w-0">
                          <div className="mr-3 h-10 w-full max-w-[40px] overflow-hidden rounded-sm flex-shrink-0">
                            <img
                              src={item.image || placeholderImage}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <Link
                              to={`/product-details?id=${item.id}`}
                              className="text-sm font-medium text-dark hover:text-primary dark:text-white block truncate"
                            >
                              {item.name}
                            </Link>
                            <p className="text-xs font-medium text-body-color dark:text-dark-6">
                              Qty: {item.quantity}
                            </p>
                          </div>
                        </div>
                        <div className="px-1 flex items-center gap-2 flex-shrink-0">
                          <p className="text-base font-semibold text-dark dark:text-white">
                            ${(item.price * item.quantity).toFixed(2)}
                          </p>
                          <button
                            onClick={() => removeFromCart(item.id, item.variantId)}
                            className="text-red-500 hover:text-red-700 text-sm"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-5 pb-6 -mx-1 border-t border-stroke dark:border-dark-3">
                    <div className="px-1">
                      <p className="text-lg font-semibold text-dark dark:text-white">
                        Total
                      </p>
                    </div>
                    <div className="px-1">
                      <p className="text-lg font-bold text-dark dark:text-white">
                        ${getCartTotal().toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Link
                      to="/shopping-cart"
                      className="bg-gray-200 hover:bg-gray-300 dark:bg-dark-3 dark:hover:bg-dark flex w-full items-center justify-center rounded-md px-10 py-[13px] text-center text-base font-medium text-dark dark:text-white"
                    >
                      View Cart
                    </Link>
                    <Link
                      to="/checkout"
                      className="bg-primary hover:bg-primary-dark flex w-full items-center justify-center rounded-md px-10 py-[13px] text-center text-base font-medium text-white"
                    >
                      Checkout
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CartDropdown;
