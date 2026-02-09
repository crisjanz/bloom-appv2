import PropTypes from "prop-types";
import CartItem from "./CartItem";
import SummaryRow from "./SummaryRow";

const SidebarSummary = ({
  cart,
  cartCount,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  discountLabel,
  couponFreeShipping,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  formatCurrency,
  formatDate,
  onJumpToPayment,
}) => (
  <>
    <div className="mb-10 overflow-hidden rounded-[10px] border border-stroke bg-white p-8 shadow-testimonial-6 dark:border-dark-3 dark:bg-dark-2 dark:shadow-box-dark">
      <div className="mb-4 border-b border-stroke pb-4 dark:border-dark-3">
        <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
          Shopping Cart
        </h3>
        <p className="text-sm text-body-color dark:text-dark-6">
          You have {cartCount} {cartCount === 1 ? "item" : "items"} in your cart
        </p>
      </div>

      <div className="border-b border-stroke pb-6 dark:border-dark-3">
        {cart.map((item) => (
          <CartItem
            key={`${item.id}-${item.variantId || "base"}`}
            img={item.image}
            title={item.name}
            subtitle={`${item.variantName ? `${item.variantName} • ` : ""}${formatDate(item.deliveryDate || null)}`}
            price={formatCurrency(item.price * item.quantity)}
            quantity={item.quantity}
            unitPrice={formatCurrency(item.price)}
          />
        ))}
      </div>

      <div className="-mx-1 border-b border-stroke pb-5 pt-6 dark:border-dark-3">
        <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
        {discountAmount > 0 && (
          <SummaryRow
            label={discountLabel}
            value={`-${formatCurrency(discountAmount)}`}
          />
        )}
        <SummaryRow
          label={couponFreeShipping ? "Delivery (+) (waived)" : "Delivery (+)"}
          value={formatCurrency(deliveryFee)}
        />
        <SummaryRow label="Tax (estimate)" value={formatCurrency(tax)} />
      </div>

      <div className="-mx-1 flex items-center justify-between pb-6 pt-5">
        <div className="px-1">
          <p className="text-base text-dark dark:text-white">Total Payable</p>
        </div>
        <div className="px-1">
          <p className="text-base font-medium text-dark dark:text-white">
            {formatCurrency(total)}
          </p>
        </div>
      </div>


      <div>

      </div>
    </div>

    <div className="mb-10 overflow-hidden rounded-[10px] border border-stroke bg-white px-8 pb-8 pt-6 shadow-testimonial-6 dark:border-dark-3 dark:bg-dark-2 dark:shadow-box-dark">
      <div className="mb-8 border-b border-stroke pb-4 dark:border-dark-3">
        <h3 className="mb-2 text-lg font-semibold text-dark dark:text-white">
          Coupon Code
        </h3>
        <p className="text-sm text-body-color dark:text-dark-6">
          Enter code to get discounts instantly
        </p>
      </div>

      <form className="relative" onSubmit={onApplyCoupon}>
        <input
          type="text"
          placeholder="Coupon code"
          value={couponInput}
          onChange={(event) => onCouponInputChange(event.target.value)}
          className="w-full rounded-lg border border-stroke bg-transparent py-3 pl-5 pr-20 font-medium text-body-color outline-hidden transition focus:border-primary active:border-primary disabled:cursor-not-allowed disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
          disabled={applyingCoupon}
        />
        <button
          type="submit"
          className="bg-dark hover:bg-dark/90 absolute right-2 top-1/2 h-[34px] -translate-y-1/2 rounded-md px-5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          disabled={applyingCoupon || !couponInput.trim()}
        >
          {coupon ? "Reapply" : "Apply"}
        </button>
      </form>
      {couponMessage && (
        <p className="text-success mt-4 text-sm font-medium">
          {couponMessage}
        </p>
      )}
      {couponError && (
        <p className="text-red-500 mt-4 text-sm font-medium">
          {couponError}
        </p>
      )}
      {coupon && (
        <button
          type="button"
          onClick={onRemoveCoupon}
          className="text-body-color hover:text-primary mt-4 text-sm font-medium"
        >
          Remove coupon
        </button>
      )}
    </div>
  </>
);

SidebarSummary.propTypes = {
  cart: PropTypes.array.isRequired,
  cartCount: PropTypes.number.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  discountLabel: PropTypes.string.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  onJumpToPayment: PropTypes.func.isRequired,
};

export default SidebarSummary;
