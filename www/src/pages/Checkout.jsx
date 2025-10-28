import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import Breadcrumb from "../components/Breadcrumb.jsx";
import DeliveryDatePicker from "../components/DeliveryDatePicker.jsx";
import { useCart } from "../contexts/CartContext.jsx";
import {
  createCustomer,
  createCustomerAddress,
  createOrderDraft,
  linkRecipientToCustomer,
} from "../services/checkoutService.js";

const DELIVERY_FEE = 15;
const TAX_RATE = 0.12;

const provinceOptions = [
  "BC",
  "AB",
  "SK",
  "MB",
  "ON",
  "QC",
  "NB",
  "NS",
  "PE",
  "NL",
  "YT",
  "NT",
  "NU",
];

const instructionPresets = [
  "Leave at the door if no answer",
  "Please call on arrival",
  "Gate code 1234",
];

const initialRecipient = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  address1: "",
  address2: "",
  city: "Vancouver",
  province: "BC",
  postalCode: "",
  cardMessage: "",
  deliveryInstructions: "",
};

const initialCustomer = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  saveCustomer: true,
};

const initialPayment = {
  method: "CARD",
  notes: "",
  agreeToTerms: true,
};

const Checkout = () => {
  const {
    cart,
    deliveryDate,
    setDeliveryDate,
    clearCart,
    coupon,
    applyCouponCode,
    clearCoupon,
    getDiscountAmount,
    hasFreeShipping,
  } = useCart();

  const [recipient, setRecipient] = useState(initialRecipient);
  const [customer, setCustomer] = useState(initialCustomer);
  const [payment, setPayment] = useState(initialPayment);
  const [formErrors, setFormErrors] = useState({
    recipient: {},
    customer: {},
    payment: {},
  });
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  useEffect(() => {
    setCouponInput(coupon?.code || "");
    if (coupon) {
      setCouponMessage(coupon.discount?.name ? `${coupon.discount.name} applied` : "Coupon applied");
      setCouponError("");
    } else {
      setCouponMessage("");
    }
  }, [coupon]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const discountAmount = getDiscountAmount();
  const couponFreeShipping = hasFreeShipping();
  const baseDeliveryFee = cart.length ? DELIVERY_FEE : 0;
  const deliveryFee = couponFreeShipping ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(value);

  const formatDate = (dateString) => {
    if (!dateString) return "Select delivery date";
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleCouponSubmit = async (event) => {
    event.preventDefault();

    try {
      setApplyingCoupon(true);
      const result = await applyCouponCode(couponInput);
      setCouponMessage(result.discount?.name ? `${result.discount.name} applied` : "Coupon applied");
      setCouponError("");
    } catch (error) {
      setCouponMessage("");
      setCouponError(error.message || "Failed to apply coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput("");
    setCouponMessage("");
    setCouponError("");
  };

  const handleRecipientChange = (event) => {
    const { name, value } = event.target;
    setRecipient((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCustomer((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handlePaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPayment((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const validateRecipient = () => {
    const errors = {};
    if (!recipient.firstName.trim()) errors.firstName = "First name is required";
    if (!recipient.lastName.trim()) errors.lastName = "Last name is required";
    if (!recipient.phone.trim()) errors.phone = "Phone number is required";
    if (!recipient.address1.trim()) errors.address1 = "Address is required";
    if (!recipient.city.trim()) errors.city = "City is required";
    if (!recipient.postalCode.trim()) errors.postalCode = "Postal code is required";
    if (!deliveryDate) errors.deliveryDate = "Select a delivery date";
    return errors;
  };

  const validateCustomer = () => {
    const errors = {};
    if (!customer.firstName.trim()) errors.firstName = "First name is required";
    if (!customer.lastName.trim()) errors.lastName = "Last name is required";
    if (!customer.email.trim()) errors.email = "Email is required";
    if (!customer.phone.trim()) errors.phone = "Phone number is required";
    return errors;
  };

  const validatePayment = () => {
    const errors = {};
    if (!payment.method) errors.method = "Choose a payment method";
    if (!payment.agreeToTerms) errors.agreeToTerms = "Please agree to the terms";
    if (!cart.length) errors.cart = "Your cart is empty";
    return errors;
  };

  const stepKey = (step) => {
    switch (step) {
      case 1:
        return "recipient";
      case 2:
        return "customer";
      case 3:
        return "payment";
      default:
        return "recipient";
    }
  };

  const advanceStep = (currentStep) => {
    const validation =
      currentStep === 1
        ? validateRecipient()
        : currentStep === 2
          ? validateCustomer()
          : validatePayment();

    setFormErrors((prev) => ({ ...prev, [stepKey(currentStep)]: validation }));

    if (Object.keys(validation).length) {
      setActiveStep(currentStep);
      return;
    }

    setActiveStep(Math.min(currentStep + 1, 3));
  };

  const goBack = (currentStep) => {
    setActiveStep(Math.max(currentStep - 1, 1));
  };

  const handlePlaceOrder = async () => {
    const recipientErrors = validateRecipient();
    const customerErrors = validateCustomer();
    const paymentErrors = validatePayment();

    setFormErrors({
      recipient: recipientErrors,
      customer: customerErrors,
      payment: paymentErrors,
    });

    if (
      Object.keys(recipientErrors).length ||
      Object.keys(customerErrors).length ||
      Object.keys(paymentErrors).length
    ) {
      setActiveStep(
        Object.keys(recipientErrors).length
          ? 1
          : Object.keys(customerErrors).length
            ? 2
            : 3,
      );
      setSubmitError("Please complete all required fields before placing your order.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const buyer = await createCustomer(sanitizeCustomerPayload(customer));
      const recipientCustomer = await createCustomer(
        sanitizeCustomerPayload({
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          phone: recipient.phone,
          notes: "Website recipient",
        }),
      );

      const deliveryAddress = await createCustomerAddress(recipientCustomer.id, {
        label: "Delivery",
        firstName: recipient.firstName.trim(),
        lastName: recipient.lastName.trim(),
        phone: recipient.phone.trim(),
        address1: recipient.address1.trim(),
        address2: recipient.address2.trim() || null,
        city: recipient.city.trim(),
        province: recipient.province,
        postalCode: recipient.postalCode.trim(),
        country: "CA",
      });

      await linkRecipientToCustomer(buyer.id, recipientCustomer.id);

      const customProducts = cart.map((item) => ({
        description: item.name,
        price: Number(item.price).toFixed(2),
        qty: item.quantity,
        tax: item.isTaxable !== false,
      }));

      const draftOrder = await createOrderDraft(buyer.id, {
        orderType: "DELIVERY",
        orderSource: "WEBSITE",
        recipientCustomerId: recipientCustomer.id,
        deliveryAddressId: deliveryAddress.id,
        cardMessage: recipient.cardMessage || null,
        deliveryInstructions: recipient.deliveryInstructions || null,
        deliveryDate,
        deliveryFee,
        customProducts,
      });

      setOrderResult({
        drafts: draftOrder.drafts,
        buyer,
        deliveryDate,
      });

      clearCart();
      setRecipient(initialRecipient);
      setCustomer(initialCustomer);
      setPayment(initialPayment);
    } catch (error) {
      console.error("Checkout failed:", error);
      setSubmitError(error.message || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderResult) {
    return (
      <>
        <Breadcrumb pageName="Order Submitted" />
        <section className="bg-tg-bg pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
          <div className="container mx-auto">
            <SuccessCard orderResult={orderResult} />
          </div>
        </section>
      </>
    );
  }

  if (!cart.length) {
    return (
      <>
        <Breadcrumb pageName="Checkout" />
        <section className="bg-tg-bg pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
          <div className="container mx-auto">
            <EmptyCheckoutState />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Checkout" />
      <section className="bg-tg-bg pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
        <div className="container mx-auto">
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4 lg:w-5/12 xl:w-4/12">
              <SidebarSummary
                cart={cart}
                cartCount={cartCount}
                subtotal={subtotal}
                deliveryFee={deliveryFee}
                tax={estimatedTax}
                total={estimatedTotal}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                discountAmount={discountAmount}
                couponFreeShipping={couponFreeShipping}
                coupon={coupon}
                couponInput={couponInput}
                onCouponInputChange={setCouponInput}
                couponMessage={couponMessage}
                couponError={couponError}
                onApplyCoupon={handleCouponSubmit}
                onRemoveCoupon={handleRemoveCoupon}
                applyingCoupon={applyingCoupon}
                onJumpToPayment={() => {
                  setActiveStep(3);
                  requestAnimationFrame(() => {
                    const section = document.querySelector('[data-step="3"]');
                    section?.scrollIntoView({ behavior: "smooth", block: "start" });
                  });
                }}
              />
            </div>

            <div className="w-full px-4 lg:w-7/12 xl:w-8/12">
              <div className="mb-10 overflow-hidden rounded-[10px] border border-stroke bg-white px-5 py-8 shadow-testimonial-6 dark:border-dark-3 dark:bg-dark-2 dark:shadow-box-dark xl:p-9">
                <FormStep
                  step={1}
                  title="Recipient Information"
                  open={activeStep === 1}
                  onToggle={() => setActiveStep(activeStep === 1 ? 0 : 1)}
                >
                  <RecipientForm
                    data={recipient}
                    onChange={handleRecipientChange}
                    deliveryDate={deliveryDate}
                    onDateChange={setDeliveryDate}
                    errors={formErrors.recipient}
                    onPresetSelect={(preset) =>
                      setRecipient((prev) => ({
                        ...prev,
                        deliveryInstructions: prev.deliveryInstructions
                          ? `${prev.deliveryInstructions}\n${preset}`
                          : preset,
                      }))
                    }
                  />
                  <div className="mt-6 flex flex-wrap gap-3 px-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-[10px] text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                      onClick={() => advanceStep(1)}
                    >
                      Save & Continue
                    </button>
                  </div>
                </FormStep>

                <FormStep
                  step={2}
                  title="Customer Information"
                  open={activeStep === 2}
                  onToggle={() => setActiveStep(activeStep === 2 ? 0 : 2)}
                >
                  <CustomerForm
                    data={customer}
                    onChange={handleCustomerChange}
                    errors={formErrors.customer}
                  />
                  <div className="mt-6 flex flex-wrap gap-3 px-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-[10px] text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                      onClick={() => goBack(2)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-[10px] text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                      onClick={() => advanceStep(2)}
                    >
                      Save & Continue
                    </button>
                  </div>
                </FormStep>

                <FormStep
                  step={3}
                  title="Payment & Review"
                  open={activeStep === 3}
                  onToggle={() => setActiveStep(activeStep === 3 ? 0 : 3)}
                >
                  <PaymentForm
                    data={payment}
                    onChange={handlePaymentChange}
                    errors={formErrors.payment}
                    cart={cart}
                    formatCurrency={formatCurrency}
                    deliveryDateLabel={formatDate(deliveryDate)}
                    recipient={recipient}
                    customer={customer}
                    coupon={coupon}
                    couponFreeShipping={couponFreeShipping}
                    totals={{
                      subtotal: formatCurrency(subtotal),
                      deliveryFee: formatCurrency(deliveryFee),
                      discount: discountAmount > 0 ? formatCurrency(discountAmount) : null,
                      tax: formatCurrency(estimatedTax),
                      total: formatCurrency(estimatedTotal),
                    }}
                  />
                  <div className="mt-6 flex flex-wrap gap-3 px-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-[10px] text-center text-sm font-semibold text-white transition hover:bg-primary/90"
                      onClick={() => goBack(3)}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-[10px] text-center text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={handlePlaceOrder}
                    >
                      {isSubmitting ? "Submitting…" : "Place Order"}
                    </button>
                  </div>
                  {submitError && (
                    <p className="text-red-500 px-3 pt-3 text-sm font-medium">
                      {submitError}
                    </p>
                  )}
                </FormStep>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

const SidebarSummary = ({
  cart,
  cartCount,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
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
            label={`Discount (${coupon?.code?.toUpperCase()})`}
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

      <div className="mb-3">
        <button
          type="button"
          className="flex w-full items-center justify-center rounded-md bg-primary px-10 py-3 text-center text-base font-medium text-white transition hover:bg-primary/90"
          onClick={onJumpToPayment}
        >
          Place Order
        </button>
      </div>
      <div>
        <p className="text-sm text-body-color dark:text-dark-6">
          By placing your order, you agree to our company{" "}
          <a href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </a>
          <span className="px-0.5"> and </span>
          <a href="/terms" className="text-primary hover:underline">
            Conditions of Use
          </a>
        </p>
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

const FormStep = ({ step, title, open, onToggle, children }) => (
  <div
    className="mb-6 overflow-hidden rounded-md border border-stroke dark:border-dark-3"
    data-step={step}
  >
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-5 py-4 xl:px-8"
    >
      <span className="text-lg font-semibold text-dark dark:text-white">
        {title}
      </span>
      <span
        className={`text-body-color transition-transform dark:text-dark-6 ${open ? "rotate-180" : ""}`}
      >
        <svg
          width="16"
          height="8"
          viewBox="0 0 16 8"
          className="fill-current"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0.249946 1.42237L6.79504 7.57672L6.80132 7.58248C7.12214 7.87122 7.51003 8 7.89233 8C8.29531 8 8.67847 7.83258 8.9834 7.55814L15.5344 1.42264L15.539 1.41812C15.8326 1.12446 15.9148 0.607154 15.5634 0.255739C15.2711 -0.0365603 14.7572 -0.119319 14.4059 0.226496L7.89233 6.35117L1.36851 0.216817L1.36168 0.21097C1.04167 -0.0633254 0.541712 -0.0646794 0.221294 0.255739L0.21069 0.266343L0.20093 0.27773C-0.0733652 0.59774 -0.0747181 1.0977 0.2457 1.41812L0.249946 1.42237ZM15.3914 0.916253C15.3713 0.998351 15.3276 1.07705 15.2629 1.14175L8.72219 7.26758C8.47813 7.48723 8.18526 7.60926 7.89239 7.60926C7.59952 7.60926 7.30666 7.51164 7.0626 7.29199L0.521876 1.14175C0.406459 1.02633 0.369015 0.86636 0.402021 0.722033C0.368915 0.866425 0.406335 1.02652 0.521818 1.142L7.06254 7.29224C7.3066 7.51189 7.59947 7.60951 7.89233 7.60951C8.1852 7.60951 8.47807 7.48748 8.72213 7.26783L15.2628 1.142C15.3276 1.07723 15.3713 0.99844 15.3914 0.916253Z"
          ></path>
        </svg>
      </span>
    </button>
    <div
      className={`${open ? "block" : "hidden"} border-t border-stroke px-4 pb-8 pt-6 dark:border-dark-3 lg:px-5 xl:px-8`}
    >
      <div className="-mx-3 flex flex-wrap">{children}</div>
    </div>
  </div>
);

FormStep.propTypes = {
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const RecipientForm = ({
  data,
  onChange,
  deliveryDate,
  onDateChange,
  errors,
  onPresetSelect,
}) => (
  <>
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Recipient first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Recipient last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Recipient phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
    />
    <InputGroup
      labelTitle="Email (optional)"
      type="email"
      placeholder="Recipient email"
      name="email"
      value={data.email}
      onChange={onChange}
    />
    <InputGroup
      fullColumn
      labelTitle="Address"
      type="text"
      placeholder="Street address"
      name="address1"
      value={data.address1}
      onChange={onChange}
      error={errors.address1}
    />
    <InputGroup
      fullColumn
      labelTitle="Apartment / Suite"
      type="text"
      placeholder="Unit, suite, etc."
      name="address2"
      value={data.address2}
      onChange={onChange}
    />
    <InputGroup
      labelTitle="City"
      type="text"
      placeholder="City"
      name="city"
      value={data.city}
      onChange={onChange}
      error={errors.city}
    />
    <SelectGroup
      labelTitle="Province"
      name="province"
      value={data.province}
      onChange={onChange}
      options={provinceOptions}
    />
    <InputGroup
      labelTitle="Postal Code"
      type="text"
      placeholder="Postal code"
      name="postalCode"
      value={data.postalCode}
      onChange={onChange}
      error={errors.postalCode}
    />
    <div className="w-full px-3">
      <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
        Delivery Date
      </label>
      <DeliveryDatePicker
        selectedDate={deliveryDate}
        onDateChange={onDateChange}
        required
      />
      {errors.deliveryDate && (
        <p className="text-red-500 mt-1 text-sm">{errors.deliveryDate}</p>
      )}
    </div>
    <TextAreaGroup
      labelTitle="Card Message"
      placeholder="Write a heartfelt note to include with the arrangement."
      name="cardMessage"
      value={data.cardMessage}
      onChange={onChange}
    />
    <TextAreaGroup
      labelTitle="Delivery Instructions"
      placeholder="Gate codes, concierge details, or anything else we should know."
      name="deliveryInstructions"
      value={data.deliveryInstructions}
      onChange={onChange}
    >
      <div className="mt-3 flex flex-wrap gap-2">
        {instructionPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="border-stroke text-body-color hover:border-primary hover:bg-primary rounded-full border px-4 py-1 text-xs font-medium transition hover:text-white dark:border-dark-3 dark:text-dark-6"
            onClick={() => onPresetSelect(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </TextAreaGroup>
  </>
);

RecipientForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  onPresetSelect: PropTypes.func.isRequired,
};

const CustomerForm = ({ data, onChange, errors }) => (
  <>
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Your first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Your last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
    />
    <InputGroup
      labelTitle="Email"
      type="email"
      placeholder="you@example.com"
      name="email"
      value={data.email}
      onChange={onChange}
      error={errors.email}
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Your phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
    />
    <CheckboxGroup
      labelTitle="Save my information for future orders"
      name="saveCustomer"
      checked={data.saveCustomer}
      onChange={onChange}
    />
  </>
);

CustomerForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
};

const PaymentForm = ({
  data,
  onChange,
  errors,
  cart,
  formatCurrency,
  deliveryDateLabel,
  recipient,
  customer,
  totals,
  coupon,
  couponFreeShipping,
}) => {
  const paymentOptions = [
    {
      id: "CARD",
      title: "Pay with card",
      description: "Secure checkout — we’ll send you a secure payment link.",
    },
    {
      id: "PHONE",
      title: "Call me for payment",
      description: "We’ll reach out to confirm details and collect payment.",
    },
    {
      id: "IN_STORE",
      title: "Pay on pickup",
      description: "Reserve now and pay when you pick up in studio.",
    },
  ];

  return (
    <>
      <div className="w-full px-3">
        <div className="space-y-4">
          {paymentOptions.map((option) => (
            <label
              key={option.id}
              className={`border-stroke flex cursor-pointer items-start gap-4 rounded-md border px-5 py-[18px] transition dark:border-dark-3 ${
                data.method === option.id ? "border-primary bg-primary/10 dark:bg-primary/20" : ""
              }`}
            >
              <input
                type="radio"
                name="method"
                value={option.id}
                checked={data.method === option.id}
                onChange={onChange}
                className="h-5 w-5 text-primary focus:ring-primary"
              />
              <div>
                <p className="text-lg font-semibold text-dark dark:text-white">{option.title}</p>
                <p className="text-sm text-body-color dark:text-dark-6">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
        {errors.method && <p className="text-red-500 mt-2 text-sm">{errors.method}</p>}
      </div>

      <TextAreaGroup
        labelTitle="Notes for the florist"
        placeholder="Optional: delivery window preference, surprises, etc."
        name="notes"
        value={data.notes}
        onChange={onChange}
      />

      <div className="w-full px-3">
        <div className="rounded-md border border-stroke p-5 dark:border-dark-3">
          <p className="mb-4 text-lg font-semibold text-dark dark:text-white">
            Order review
          </p>
          <div className="space-y-2 text-sm text-body-color dark:text-dark-6">
            <p>
              <span className="font-semibold text-dark dark:text-white">Recipient:</span>{" "}
              {recipient.firstName} {recipient.lastName}
            </p>
            <p>
              <span className="font-semibold text-dark dark:text-white">Delivery date:</span>{" "}
              {deliveryDateLabel}
            </p>
            <p>
              <span className="font-semibold text-dark dark:text-white">Buyer:</span>{" "}
              {customer.firstName} {customer.lastName} ({customer.email})
            </p>
          </div>

          <div className="mt-4 space-y-2">
            {cart.map((item) => (
              <div key={`${item.id}-${item.variantId || "base"}`} className="flex justify-between">
                <span className="text-base text-dark dark:text-white">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-base font-semibold text-dark dark:text-white">
                  {formatCurrency(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1 border-t border-stroke pt-3 text-sm dark:border-dark-3">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{totals.subtotal}</span>
            </div>
            {totals.discount && (
              <div className="flex justify-between">
                <span>
                  Discount{coupon?.code ? ` (${coupon.code.toUpperCase()})` : ""}
                </span>
                <span>-{totals.discount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{couponFreeShipping ? "Delivery (waived)" : "Delivery"}</span>
              <span>{totals.deliveryFee}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (estimate)</span>
              <span>{totals.tax}</span>
            </div>
            <div className="flex justify-between text-base font-semibold text-dark dark:text-white">
              <span>Total</span>
              <span>{totals.total}</span>
            </div>
          </div>
        </div>
      </div>

      <CheckboxGroup
        labelTitle={
          <>
            I agree to Bloom’s{" "}
            <a href="/terms" className="text-primary underline">
              Terms &amp; Conditions
            </a>
          </>
        }
        name="agreeToTerms"
        checked={data.agreeToTerms}
        onChange={onChange}
      />
      {errors.agreeToTerms && (
        <p className="text-red-500 px-3 -mt-4 mb-2 text-sm">{errors.agreeToTerms}</p>
      )}
      {errors.cart && (
        <p className="text-red-500 px-3 -mt-2 text-sm">{errors.cart}</p>
      )}
    </>
  );
};

PaymentForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  cart: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  deliveryDateLabel: PropTypes.string.isRequired,
  recipient: PropTypes.object.isRequired,
  customer: PropTypes.object.isRequired,
  totals: PropTypes.object.isRequired,
  coupon: PropTypes.object,
  couponFreeShipping: PropTypes.bool.isRequired,
};

const InputGroup = ({
  labelTitle,
  type,
  placeholder,
  fullColumn,
  name,
  value,
  onChange,
  error,
}) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      {labelTitle && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {labelTitle}
        </label>
      )}
      <input
        type={type}
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full rounded-md border bg-transparent px-5 py-3 font-medium text-body-color outline-hidden transition focus:border-primary dark:border-dark-3 dark:text-dark-6 ${
          error ? "border-red-500" : "border-stroke"
        }`}
      />
      {error && <p className="text-red-500 mt-1 text-sm">{error}</p>}
    </div>
  </div>
);

InputGroup.propTypes = {
  labelTitle: PropTypes.string,
  type: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  fullColumn: PropTypes.bool,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
};

const SelectGroup = ({ fullColumn, labelTitle, name, value, onChange, options }) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
        {labelTitle}
      </label>
      <div className="relative">
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full appearance-none rounded-md border border-stroke bg-transparent px-5 py-3 font-medium text-dark-5 outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="absolute right-4 top-1/2 mt-[-2px] h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-b-2 border-r-2 border-body-color dark:border-dark-6"></span>
      </div>
    </div>
  </div>
);

SelectGroup.propTypes = {
  fullColumn: PropTypes.bool,
  labelTitle: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
};

const TextAreaGroup = ({
  labelTitle,
  placeholder,
  name,
  value,
  onChange,
  children,
}) => (
  <div className="w-full px-3">
    <div className="mb-6">
      {labelTitle && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {labelTitle}
        </label>
      )}
      <textarea
        placeholder={placeholder}
        name={name}
        value={value}
        onChange={onChange}
        rows="4"
        className="w-full rounded-md border border-stroke bg-transparent p-5 font-medium text-body-color outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
      ></textarea>
      {children}
    </div>
  </div>
);

TextAreaGroup.propTypes = {
  labelTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
};

const CheckboxGroup = ({ labelTitle, name, checked, onChange }) => (
  <div className="w-full px-3">
    <div className="mb-5">
      <label
        htmlFor={name}
        className="flex cursor-pointer select-none items-center text-body-color dark:text-dark-6"
      >
        <div className="relative">
          <input
            type="checkbox"
            id={name}
            name={name}
            checked={checked}
            onChange={onChange}
            className="sr-only"
          />
          <div
            className={`mr-4 flex h-5 w-5 items-center justify-center rounded border ${
              checked ? "border-primary bg-primary" : "border-stroke dark:border-dark-3"
            }`}
          >
            <span className={`${checked ? "opacity-100" : "opacity-0"}`}>
              <svg
                width="11"
                height="8"
                viewBox="0 0 11 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.0915 0.951972L10.0867 0.946075L10.0813 0.940568C9.90076 0.753564 9.61034 0.753146 9.42927 0.939309L4.16201 6.22962L1.58507 3.63469C1.40401 3.44841 1.11351 3.44879 0.932892 3.63584C0.755703 3.81933 0.755703 4.10875 0.932892 4.29224L0.932878 4.29225L0.934851 4.29424L3.58046 6.95832C3.73676 7.11955 3.94983 7.2 4.1473 7.2C4.36196 7.2 4.55963 7.11773 4.71406 6.9584L10.0468 1.60234C10.2436 1.4199 10.2421 1.1339 10.0915 0.951972ZM4.2327 6.30081L4.2317 6.2998C4.23206 6.30015 4.23237 6.30049 4.23269 6.30082L4.2327 6.30081Z"
                  fill="white"
                  stroke="white"
                  strokeWidth="0.4"
                ></path>
              </svg>
            </span>
          </div>
        </div>
        <span className="text-dark dark:text-white text-sm font-medium">{labelTitle}</span>
      </label>
    </div>
  </div>
);

CheckboxGroup.propTypes = {
  labelTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  name: PropTypes.string.isRequired,
  checked: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired,
};

const CartItem = ({ img, title, subtitle, price, quantity, unitPrice }) => (
  <div className="-mx-1 flex items-center justify-between py-4">
    <div className="flex items-center px-1">
      <div className="mr-4 h-12 w-full max-w-[48px] overflow-hidden rounded">
        {img ? (
          <img src={img} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="bg-gray-200 flex h-full w-full items-center justify-center text-xs text-dark">
            No image
          </div>
        )}
      </div>
      <div>
        <p className="mb-0.5 text-base font-medium text-dark dark:text-white">
          {title}
        </p>
        <p className="truncate text-sm text-body-color dark:text-dark-6">
          {subtitle}
        </p>
        <p className="text-xs text-body-color dark:text-dark-6">
          Qty {quantity} • {unitPrice}
        </p>
      </div>
    </div>
    <div className="px-1">
      <p className="text-base font-medium text-dark dark:text-white">{price}</p>
    </div>
  </div>
);

CartItem.propTypes = {
  img: PropTypes.string,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  price: PropTypes.string.isRequired,
  quantity: PropTypes.number.isRequired,
  unitPrice: PropTypes.string.isRequired,
};

const SummaryRow = ({ label, value }) => (
  <div className="mb-4 flex items-center justify-between">
    <div className="px-1">
      <p className="text-base text-dark dark:text-white">{label}</p>
    </div>
    <div className="px-1">
      <p className="text-base font-medium text-dark dark:text-white">{value}</p>
    </div>
  </div>
);

SummaryRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

const EmptyCheckoutState = () => (
  <div className="rounded-[20px] border border-dashed border-stroke bg-white p-12 text-center shadow-xl dark:border-dark-3 dark:bg-dark-2">
    <p className="text-2xl font-semibold text-dark dark:text-white">
      Your cart is empty
    </p>
    <p className="text-body-color mx-auto mt-3 max-w-md text-base dark:text-dark-6">
      Add something beautiful to your cart before heading to checkout.
    </p>
    <a
      href="/filters"
      className="bg-primary mt-6 inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
    >
      Browse products
    </a>
  </div>
);

const SuccessCard = ({ orderResult }) => (
  <div className="rounded-[20px] border border-success/40 bg-white p-12 text-center shadow-xl dark:border-success/20 dark:bg-dark-2">
    <p className="text-success text-xs font-semibold uppercase tracking-[4px]">
      Order received
    </p>
    <h2 className="text-dark mt-4 text-3xl font-bold dark:text-white">
      Thank you! We’re arranging everything.
    </h2>
    <p className="text-body-color mx-auto mt-4 max-w-2xl text-base dark:text-dark-6">
      Our team will review the order, confirm delivery details, and follow up with any
      payment information if needed. You’ll receive updates shortly.
    </p>

    <div className="mt-8 rounded-2xl border border-stroke p-6 text-left dark:border-dark-3">
      <p className="text-dark mb-3 text-lg font-semibold dark:text-white">
        Draft orders created
      </p>
      <ul className="space-y-3 text-sm text-body-color dark:text-dark-6">
        {orderResult.drafts.map((draft) => {
          const created = draft.createdAt
            ? new Date(draft.createdAt)
            : new Date();
          return (
            <li key={draft.id} className="flex justify-between">
              <span>Order #{draft.orderNumber || draft.id}</span>
              <span className="font-semibold text-dark dark:text-white">
                {created.toLocaleDateString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>

    <a
      href="/"
      className="bg-primary mt-8 inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
    >
      Back to home
    </a>
  </div>
);

SuccessCard.propTypes = {
  orderResult: PropTypes.shape({
    drafts: PropTypes.array.isRequired,
    buyer: PropTypes.object,
    deliveryDate: PropTypes.string,
  }).isRequired,
};

const sanitizeCustomerPayload = (payload) => ({
  firstName: payload.firstName.trim(),
  lastName: payload.lastName.trim(),
  email: payload.email?.trim().toLowerCase() || null,
  phone: payload.phone?.trim() || null,
  notes: payload.notes || null,
});

export default Checkout;
