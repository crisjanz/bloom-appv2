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
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [submittingCoupon, setSubmittingCoupon] = useState(false);

  useEffect(() => {
    if (cart.length && !expandedItemId) {
      const firstKey = buildItemKey(cart[0]);
      setExpandedItemId(firstKey);
    }
    if (!cart.length) {
      setExpandedItemId(null);
    }
  }, [cart, expandedItemId]);

  useEffect(() => {
    setCouponInput(coupon?.code || "");
    if (coupon) {
      setCouponMessage(coupon.discount?.name ? `${coupon.discount.name} applied` : "Coupon applied");
      setCouponError("");
    } else {
      setCouponMessage("");
    }
  }, [coupon]);

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
    setExpandedItemId(buildItemKey(item));
    updateQuantity(item.id, item.variantId, Number(quantity));
  };

  const handleRemove = (item) => {
    removeFromCart(item.id, item.variantId);
  };

  const handleCheckout = () => {
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    navigate("/filters");
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

      <section className="bg-white py-20 dark:bg-dark lg:py-[120px]">
        <div className="container mx-auto">
          <div className="mb-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[4px] text-primary">
                Bloom Checkout
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
                    return (
                      <CartAccordionItem
                        key={itemKey}
                        item={item}
                        deliveryDate={formatDate(item.deliveryDate || deliveryDate)}
                        isExpanded={expandedItemId === itemKey}
                        onToggle={() =>
                          setExpandedItemId(
                            expandedItemId === itemKey ? null : itemKey,
                          )
                        }
                        onQuantityChange={(qty) => handleQuantityChange(item, qty)}
                        onRemove={() => handleRemove(item)}
                        formatCurrency={formatCurrency}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="w-full px-4 lg:w-4/12">
                <div className="2xl:pl-8">
                  <aside className="mb-8 rounded-[20px] border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
                    <h3 className="text-dark mb-4 text-lg font-semibold dark:text-white">
                      Delivery Date
                    </h3>
                    <DeliveryDatePicker
                      selectedDate={deliveryDate}
                      onDateChange={setDeliveryDate}
                      required
                    />
                  </aside>

                  <aside className="mb-8 rounded-[20px] border border-stroke bg-white p-6 shadow-xl dark:border-dark-3 dark:bg-dark-2">
                    <h3 className="text-dark mb-5 text-xl font-bold dark:text-white">
                      Apply Coupon to get discount!
                    </h3>
                    <form
                      className="flex flex-col gap-3 sm:flex-row"
                      onSubmit={handleCouponSubmit}
                    >
                      <input
                        type="text"
                        value={couponInput}
                        onChange={(event) => setCouponInput(event.target.value)}
                        className="border-form-stroke text-body-color focus:border-primary h-12 flex-1 rounded-lg border bg-white px-5 text-base font-medium outline-hidden focus-visible:shadow-none dark:border-dark-3 dark:bg-dark-2 dark:text-dark-6 disabled:cursor-not-allowed"
                        placeholder="Coupon code"
                        disabled={submittingCoupon}
                      />
                      <button
                        type="submit"
                        className="bg-primary h-12 rounded-lg px-5 text-base font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
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
                    <div className="-mx-1 border-b border-stroke pb-5 dark:border-dark-3">
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

const CartAccordionItem = ({
  item,
  deliveryDate,
  isExpanded,
  onToggle,
  onQuantityChange,
  onRemove,
  formatCurrency,
}) => {
  const quantityOptions = Array.from({ length: MAX_QTY }, (_, index) => index + 1);
  const itemTotal = formatCurrency(item.price * item.quantity);

  return (
    <div className="rounded-[20px] border border-stroke bg-white shadow-xl transition dark:border-dark-3 dark:bg-dark-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-6 py-4"
      >
        <div className="text-left">
          <p className="text-dark text-lg font-semibold dark:text-white">{item.name}</p>
          <p className="text-body-color text-sm dark:text-dark-6">
            {item.variantName ? `${item.variantName} • ` : ""}
            {deliveryDate}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-dark text-base font-semibold dark:text-white">{itemTotal}</p>
          <span
            className={`text-body-color transition-transform ${isExpanded ? "rotate-180" : ""}`}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.5 7.5L9 12L13.5 7.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </button>

      <div
        className={`transition-all duration-300 ${
          isExpanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="px-6 pb-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <div className="shrink-0">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-32 w-32 rounded-xl object-cover"
                />
              ) : (
                <div className="bg-gray-100 text-body-color flex h-32 w-32 items-center justify-center rounded-xl text-sm">
                  No image
                </div>
              )}
            </div>

            <div className="flex-1 space-y-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-body-color dark:text-dark-6">
                  Delivery date
                </p>
                <p className="text-dark text-base font-semibold dark:text-white">
                  {deliveryDate}
                </p>
              </div>

              <div className="flex flex-wrap gap-5">
                <div>
                  <label className="text-sm font-medium text-body-color dark:text-dark-6">
                    Quantity
                  </label>
                  <div className="relative mt-2 inline-block">
                    <select
                      className="border-form-stroke text-body-color focus:border-primary active:border-primary w-32 appearance-none rounded-lg border py-2 pl-4 pr-8 text-sm font-semibold outline-hidden transition dark:border-dark-3 dark:text-dark-6"
                      value={item.quantity}
                      onChange={(event) => onQuantityChange(event.target.value)}
                    >
                      {quantityOptions.map((qty) => (
                        <option key={qty} value={qty}>
                          {qty}
                        </option>
                      ))}
                    </select>
                    <span className="border-body-color pointer-events-none absolute right-3 top-1/2 mt-[-2px] h-2 w-2 -translate-y-1/2 rotate-45 border-b-[1.5px] border-r-[1.5px]" />
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-body-color dark:text-dark-6">
                    Each
                  </p>
                  <p className="text-dark mt-2 text-xl font-semibold dark:text-white">
                    {formatCurrency(item.price)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/product-details?id=${item.id}`}
                  className="border-body-color text-body-color hover:border-primary hover:bg-primary inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:text-white dark:border-dark-3 dark:text-dark-6"
                >
                  Edit item
                </Link>
                <button
                  type="button"
                  onClick={onRemove}
                  className="border-body-color text-body-color hover:border-danger hover:bg-danger inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition hover:text-white dark:border-dark-3 dark:text-dark-6"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

CartAccordionItem.propTypes = {
  item: PropTypes.object.isRequired,
  deliveryDate: PropTypes.string.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
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
