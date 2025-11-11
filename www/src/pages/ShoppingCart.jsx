import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Breadcrumb from "../components/Breadcrumb.jsx";
import DeliveryDatePicker from "../components/DeliveryDatePicker.jsx";
import { useCart } from "../contexts/CartContext.jsx";

const MAX_QTY = 12;
const DELIVERY_FEE = 15;
const TAX_RATE = 0.12;

const ShoppingCart = () => {
  const navigate = useNavigate();
  const {
    cart,
    deliveryDate,
    setDeliveryDate,
    updateQuantity,
    removeFromCart,
    getCartTotal,
    coupon,
    applyCouponCode,
    clearCoupon,
    getDiscountAmount,
    hasFreeShipping,
  } = useCart();
  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setCouponInput(coupon?.code || "");
    if (coupon) {
      setCouponMessage(coupon.discount?.name ? `${coupon.discount.name} applied` : "Coupon applied");
      setCouponError("");
    } else {
      setCouponMessage("");
    }
  }, [coupon]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const subtotal = useMemo(() => getCartTotal(), [cart, getCartTotal]);
  const discountAmount = getDiscountAmount();
  const couponFreeShipping = hasFreeShipping();
  const baseDeliveryFee = cart.length ? DELIVERY_FEE : 0;
  const deliveryFee = couponFreeShipping ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);

  const formatDate = (dateString) => {
    if (!dateString) return "Select delivery date";
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleQuantityChange = (item, quantity) => {
    updateQuantity(item.id, item.variantId, Number(quantity));
  };

  const handleRemove = (item) => {
    removeFromCart(item.id, item.variantId);
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    navigate("/shop");
  };

  const handleCouponSubmit = async (event) => {
    event.preventDefault();

    try {
      setSubmittingCoupon(true);
      const result = await applyCouponCode(couponInput);
      setCouponMessage(result.discount?.name ? `${result.discount.name} applied` : "Coupon applied");
      setCouponError("");
    } catch (error) {
      setCouponMessage("");
      setCouponError(error.message || "Failed to apply coupon");
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput("");
    setCouponMessage("");
    setCouponError("");
  };

  const deliveryDateLabel = formatDate(deliveryDate);

  return (
    <>
      <Breadcrumb pageName="Shopping Cart" />

      <section className="bg-white py-3 dark:bg-dark lg:py-[60px]">
        <div className="container mx-auto">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[4px] text-primary">
                Checkout
              </p>
              <h2 className="text-dark text-3xl font-bold leading-tight dark:text-white sm:text-4xl">
                Shopping cart
              </h2>
            </div>
            <p className="text-body-color text-base font-medium dark:text-dark-6">
              {cartCount} {cartCount === 1 ? "item" : "items"} scheduled for{" "}
              {deliveryDateLabel.toLowerCase()}
            </p>
          </div>

          {cart.length === 0 ? (
            <EmptyCartState onContinue={handleContinueShopping} />
          ) : (
            <div className="-mx-4 flex flex-wrap">
              <div className="w-full px-4 lg:w-8/12">
                <div className="space-y-6">
                  {cart.map((item) => {
                    const itemKey = buildItemKey(item);
                    return isMobile ? (
                      <CartItemRow
                        key={itemKey}
                        item={item}
                        deliveryDate={formatDate(item.deliveryDate || deliveryDate)}
                        onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                        onRemove={() => handleRemove(item)}
                        formatCurrency={formatCurrency}
                      />
                    ) : (
                      <CartCardDesktop
                        key={itemKey}
                        item={item}
                        deliveryDate={formatDate(item.deliveryDate || deliveryDate)}
                        onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                        onRemove={() => handleRemove(item)}
                        formatCurrency={formatCurrency}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="w-full px-4 py-3 lg:w-4/12">
                <div className="2xl:pl-8 space-y-4">
                  <aside className="border-b border-gray-2 pb-1 dark:border-dark-3">
                    <h3 className="text-dark mb-3 text-lg font-semibold dark:text-white">
                      Delivery date
                    </h3>
                    <DeliveryDatePicker
                      selectedDate={deliveryDate}
                      onDateChange={setDeliveryDate}
                      required
                    />
                  </aside>

                  <aside className="border-b border-gray-2 pb-6 dark:border-dark-3">
                    <h3 className="text-dark mb-4 text-lg font-semibold dark:text-white">
                      Enter promo code
                    </h3>
                    <form
                      className="flex flex-col gap-3 sm:flex-row"
                      onSubmit={handleCouponSubmit}
                    >
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                        className="rounded-[8px] border border-stroke bg-transparent px-4 py-3 text-sm font-medium text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-white disabled:cursor-not-allowed"
                        placeholder="Enter promo code"
                        disabled={submittingCoupon}
                      />
                      <button
                        type="submit"
                        className="bg-primary h-12 rounded-[8px] px-6 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={submittingCoupon || !couponInput.trim()}
                      >
                        {coupon ? "Reapply" : "Apply"}
                      </button>
                    </form>
                    {couponMessage && (
                      <p className="text-success mt-3 text-sm font-medium">
                        {couponMessage}
                      </p>
                    )}
                    {couponError && (
                      <p className="text-red-500 mt-3 text-sm font-medium">
                        {couponError}
                      </p>
                    )}
                    {coupon && (
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-body-color hover:text-primary mt-3 text-sm font-medium"
                      >
                        Remove coupon
                      </button>
                    )}
                  </aside>

                  <aside className="rounded-[20px] border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
                    <div className="-mx-1 border-b border-gray-2 pb-5 dark:border-dark-3">
                      <SummaryLine label="Subtotal" value={formatCurrency(subtotal)} />
                      {discountAmount > 0 && (
                        <SummaryLine
                          label={`Discount (${coupon?.code?.toUpperCase()})`}
                          value={`-${formatCurrency(discountAmount)}`}
                        />
                      )}
                      <SummaryLine
                        label={couponFreeShipping ? "Delivery fee (waived)" : "Delivery fee"}
                        value={formatCurrency(deliveryFee)}
                      />
                      <SummaryLine label="Tax (estimate)" value={formatCurrency(estimatedTax)} />
                    </div>
                    <div className="-mx-1 flex items-center justify-between py-5">
                      <div className="px-1">
                        <p className="text-base font-medium text-dark dark:text-white">
                          Estimated Total
                        </p>
                      </div>
                      <div className="px-1">
                        <p className="text-base font-semibold text-dark dark:text-white">
                          {formatCurrency(estimatedTotal)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={handleCheckout}
                        disabled={!deliveryDate}
                        className="bg-primary flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Proceed to checkout
                      </button>
                      <button
                        type="button"
                        onClick={handleContinueShopping}
                        className="border-stroke text-body-color hover:border-primary hover:text-primary flex h-12 w-full items-center justify-center rounded-lg border text-base font-medium transition dark:border-dark-3 dark:text-dark-6"
                      >
                        Continue shopping
                      </button>
                    </div>
                    {!deliveryDate && (
                      <p className="text-warning mt-3 text-center text-sm font-medium">
                        Select a delivery date to enable checkout.
                      </p>
                    )}
                  </aside>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

const CartItemRow = ({
  item,
  deliveryDate,
  onQuantityChange,
  onRemove,
  formatCurrency,
}) => {
  const itemTotal = formatCurrency(item.price * item.quantity);

  return (
    <div className="border-b border-gray-200 pb-5 dark:border-dark-3">
      <div className="flex gap-4">
        <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100 dark:bg-dark-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-body-color">
              No image
            </div>
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-dark dark:text-white">{item.name}</p>
              {item.variantName && (
                <p className="text-sm text-body-color dark:text-dark-6">{item.variantName}</p>
              )}
              <p className="text-sm text-body-color dark:text-dark-6">{deliveryDate}</p>
            </div>
            <div className="text-right">
              <p className="text-base font-semibold text-[#b12704] dark:text-[#f87171]">
                {itemTotal}
              </p>
              <p className="text-xs text-body-color dark:text-dark-6">
                Each: {formatCurrency(item.price)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>

              <div className="relative mt-1 inline-flex items-center rounded-full border border-stroke px-3 py-1 dark:border-dark-3">
                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange(Math.max(1, item.quantity - 1))
                  }
                  className="px-2 text-lg leading-none text-dark transition hover:text-primary dark:text-white"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-dark dark:text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange(Math.min(MAX_QTY, item.quantity + 1))
                  }
                  className="px-2 text-lg leading-none text-dark transition hover:text-primary dark:text-white"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">

              <button
                type="button"
                onClick={onRemove}
                className="text-sm font-semibold text-body-color transition hover:text-danger dark:text-dark-6"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CartItemRow.propTypes = {
  item: PropTypes.object.isRequired,
  deliveryDate: PropTypes.string.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
};

const CartCardDesktop = ({
  item,
  deliveryDate,
  onQuantityChange,
  onRemove,
  formatCurrency,
}) => {
  const quantityOptions = Array.from({ length: MAX_QTY }, (_, index) => index + 1);
  const itemTotal = formatCurrency(item.price * item.quantity);

  return (
    <div className="rounded-[0px] border-b border-gray-2 bg-white p-6 transition dark:border-dark-3 dark:bg-dark-2">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
        <div className="h-32 w-32 flex-shrink-0 overflow-hidden bg-gray-100 dark:bg-dark-3">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-body-color">
              No image
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-lg font-semibold text-dark dark:text-white">{item.name}</p>
              {item.variantName && (
                <p className="text-sm text-body-color dark:text-dark-6">{item.variantName}</p>
              )}

            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-dark dark:text-white">{itemTotal}</p>
              <p className="text-xs text-body-color dark:text-dark-6">
                Each: {formatCurrency(item.price)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <div>

              <div className="relative mt-1 inline-flex items-center rounded-full border border-stroke px-3 py-1 dark:border-dark-3">
                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange(Math.max(1, item.quantity - 1))
                  }
                  className="px-2 text-lg leading-none text-dark transition hover:text-primary dark:text-white"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-semibold text-dark dark:text-white">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onQuantityChange(Math.min(MAX_QTY, item.quantity + 1))
                  }
                  className="px-2 text-lg leading-none text-dark transition hover:text-primary dark:text-white"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

          </div>
<button
              type="button"
              onClick={onRemove}
              className="h-8 border-body-color text-body-color hover:border-red hover:bg-danger inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:text-red dark:border-dark-3 dark:text-dark-6"
            >
              Remove
            </button>
          
        </div>
      </div>
    </div>
  );
};

CartCardDesktop.propTypes = {
  item: PropTypes.object.isRequired,
  deliveryDate: PropTypes.string.isRequired,
  onQuantityChange: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
  formatCurrency: PropTypes.func.isRequired,
};

const SummaryLine = ({ label, value }) => (
  <div className="mb-4 flex items-center justify-between">
    <div className="px-1">
      <p className="text-base font-medium text-dark dark:text-white">{label}</p>
    </div>
    <div className="px-1">
      <p className="text-base font-semibold text-dark dark:text-white">{value}</p>
    </div>
  </div>
);

SummaryLine.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const EmptyCartState = ({ onContinue }) => (
  <div className="rounded-[24px] border border-dashed border-stroke bg-white p-12 text-center shadow-xl dark:border-dark-3 dark:bg-dark-2">
    <p className="text-2xl font-semibold text-dark dark:text-white">
      Your cart is empty
    </p>
    <p className="text-body-color mx-auto mt-3 max-w-md text-base dark:text-dark-6">
      Add a bouquet or gift to get started. Your delivery date and card message can
      be set during checkout.
    </p>
    <button
      type="button"
      onClick={onContinue}
      className="bg-primary mt-6 inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
    >
      Browse products
    </button>
  </div>
);

EmptyCartState.propTypes = {
  onContinue: PropTypes.func.isRequired,
};

const buildItemKey = (item) => `${item.id}-${item.variantId || "base"}`;

export default ShoppingCart;
