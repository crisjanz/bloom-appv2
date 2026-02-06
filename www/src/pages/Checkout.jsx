import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import DeliveryDatePicker from "../components/DeliveryDatePicker.jsx";
import AddressAutocomplete from "../components/AddressAutocomplete.jsx";
import { useCart } from "../contexts/CartContext.jsx";
import {
  createCustomer,
  createCustomerAddress,
  createCheckoutPaymentIntent,
  createOrderDraft,
  linkRecipientToCustomer,
  getSavedRecipients,
} from "../services/checkoutService.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import CreateAccountModal from "../components/CreateAccountModal.jsx";
import BirthdayOptIn from "../components/Checkouts/BirthdayOptIn.jsx";

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

const stripePromise = fetch(`${API_BASE}/stripe/public-key`)
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => (data?.publicKey ? loadStripe(data.publicKey) : null))
  .catch(() => null);

const DELIVERY_FEE = 15;
const TAX_RATE = 0.12;

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#111827",
      fontFamily: '"Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: "16px",
      "::placeholder": {
        color: "#94a3b8",
      },
    },
    invalid: {
      color: "#dc2626",
    },
  },
};

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(max-width: 767px)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia("(max-width: 767px)");
    const handleChange = (event) => setIsMobile(event.matches);

    handleChange(media);
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }

    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  return isMobile;
};

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
  password: "",
};

const initialPayment = {
  method: "CARD",
  notes: "",
  agreeToTerms: true,
};

const CheckoutContent = () => {
  const stripe = useStripe();
  const elements = useElements();
  const isMobile = useIsMobile();
  const {
    cart,
    deliveryDate,
    setDeliveryDate,
    clearCart,
    coupon,
    autoDiscounts,
    applyCouponCode,
    clearCoupon,
    getDiscountAmount,
    hasFreeShipping,
  } = useCart();
  const { customer: authCustomer, isAuthenticated, refreshProfile, register } = useAuth();

  const [recipient, setRecipient] = useState(initialRecipient);
  const [customer, setCustomer] = useState(initialCustomer);
  const [payment, setPayment] = useState(initialPayment);
  const [formErrors, setFormErrors] = useState({
    recipient: {},
    customer: {},
    payment: {},
  });
  const [birthday, setBirthday] = useState({
    optIn: false,
    month: "",
    day: "",
    year: "",
  });
  const [activeStep, setActiveStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [cardError, setCardError] = useState("");
  const [orderResult, setOrderResult] = useState(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [lastOrderEmail, setLastOrderEmail] = useState("");
  const [couponInput, setCouponInput] = useState(coupon?.code || "");
  const [couponMessage, setCouponMessage] = useState("");
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [savedRecipients, setSavedRecipients] = useState([]);
  const [savedRecipientsLoading, setSavedRecipientsLoading] = useState(false);
  const [savedRecipientsError, setSavedRecipientsError] = useState("");
  const [selectedSavedRecipientOption, setSelectedSavedRecipientOption] = useState("new");
  const [recipientWasAutofilled, setRecipientWasAutofilled] = useState(false);
  const resetSavedRecipientState = useCallback(() => {
    setSavedRecipients([]);
    setSavedRecipientsError("");
    setSelectedSavedRecipientOption("new");
    setSavedRecipientsLoading(false);
  }, []);

  const fetchSavedRecipients = useCallback(async () => {
    if (!authCustomer?.id) {
      resetSavedRecipientState();
      return;
    }
    setSavedRecipientsLoading(true);
    setSavedRecipientsError("");
    try {
      const data = await getSavedRecipients(authCustomer.id);
      const list = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [];
      setSavedRecipients(list);
    } catch (error) {
      console.error("Failed to fetch saved recipients:", error);
      setSavedRecipients([]);
      setSavedRecipientsError(error.message || "Failed to load saved recipients");
    } finally {
      setSavedRecipientsLoading(false);
    }
  }, [authCustomer?.id, resetSavedRecipientState]);

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
    if (!authCustomer) return;
    setCustomer((prev) => ({
      ...prev,
      firstName: authCustomer.firstName || prev.firstName,
      lastName: authCustomer.lastName || prev.lastName,
      email: authCustomer.email || prev.email,
      phone: authCustomer.phone || prev.phone,
    }));
  }, [authCustomer]);

  useEffect(() => {
    if (isAuthenticated) {
      setShowCreateAccountModal(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSavedRecipients();
  }, [fetchSavedRecipients]);

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const discountAmount = getDiscountAmount();
  const appliedDiscounts = useMemo(() => {
    const autoApplied = Array.isArray(autoDiscounts)
      ? autoDiscounts.map((discount) => ({
          id: discount.id,
          name: discount.name,
          discountType: discount.discountType,
          discountAmount: Number(discount.discountAmount) || 0,
        }))
      : [];

    const couponApplied =
      coupon?.discount?.id
        ? [
            {
              id: coupon.discount.id,
              name: coupon.discount.name,
              discountType: coupon.discount.discountType,
              discountAmount: Number(coupon.discountAmount) || 0,
              code: coupon.code,
            },
          ]
        : [];

    return [...autoApplied, ...couponApplied];
  }, [autoDiscounts, coupon]);
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

  const savedRecipientOptions = useMemo(
    () => buildSavedRecipientOptions(savedRecipients),
    [savedRecipients],
  );

  const savedRecipientOptionMap = useMemo(() => {
    const map = new Map();
    savedRecipientOptions.forEach((option) => map.set(option.value, option));
    return map;
  }, [savedRecipientOptions]);

  const selectedRecipientMeta =
    savedRecipientOptionMap.get(selectedSavedRecipientOption) || null;
  const selectedSavedRecipient = selectedRecipientMeta?.recipient || null;

  const isNewRecipient = selectedSavedRecipientOption === "new";
  const savedRecipientsAvailable = savedRecipients.length > 0;
  const customerGreetingName =
    (authCustomer?.firstName || authCustomer?.lastName
      ? `${authCustomer?.firstName || ""} ${authCustomer?.lastName || ""}`.trim()
      : authCustomer?.email) || "there";

  useEffect(() => {
    if (
      selectedSavedRecipientOption !== "new" &&
      !savedRecipientOptionMap.has(selectedSavedRecipientOption)
    ) {
      setSelectedSavedRecipientOption("new");
    }
  }, [selectedSavedRecipientOption, savedRecipientOptionMap]);

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
    if (!isNewRecipient) {
      setRecipientWasAutofilled(true);
    }
  };

  const handleCustomerChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCustomer((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleBirthdayToggle = (checked) => {
    setBirthday((prev) => ({
      ...prev,
      optIn: checked,
      // reset values if toggled off
      ...(checked ? {} : { month: "", day: "", year: "" }),
    }));
  };

  const handleBirthdayChange = (field, value) => {
    setBirthday((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPayment((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleCardChange = (event) => {
    if (event?.error?.message) {
      setCardError(event.error.message);
      return;
    }
    if (cardError) {
      setCardError("");
    }
  };

  const applySavedRecipientFields = useCallback((optionMeta) => {
    if (!optionMeta?.recipient) return;
    const { recipient: savedRecipientRecord, address } = optionMeta;
    setRecipient((prev) => ({
      ...prev,
      firstName: savedRecipientRecord.firstName || "",
      lastName: savedRecipientRecord.lastName || "",
      phone: savedRecipientRecord.phone || "",
      email: savedRecipientRecord.email || "",
      address1: address?.address1 || "",
      address2: address?.address2 || "",
      city: address?.city || "",
      province: address?.province || prev.province || "BC",
      postalCode: address?.postalCode || "",
    }));
    setRecipientWasAutofilled(false);
  }, []);

  const handleSelectSavedRecipient = (value) => {
    setSelectedSavedRecipientOption(value);
    setRecipientWasAutofilled(false);
    if (value === "new") {
      // Clear the recipient form when selecting "New recipient"
      setRecipient(initialRecipient);
      return;
    }
    const optionMeta = savedRecipientOptionMap.get(value);
    applySavedRecipientFields(optionMeta);
  };

  const handleAddressAutocompleteSelect = useCallback((parsedAddress) => {
    if (!parsedAddress) return;
    setRecipient((prev) => ({
      ...prev,
      address1: parsedAddress.address1 || prev.address1,
      address2: parsedAddress.address2 || prev.address2,
      city: parsedAddress.city || prev.city,
      province: parsedAddress.province || prev.province,
      postalCode: parsedAddress.postalCode || prev.postalCode,
    }));
  }, []);

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
    if (birthday.optIn) {
      if (!birthday.month) errors.birthdayMonth = "Select month";
      if (!birthday.day) errors.birthdayDay = "Select day";
    }
    if (customer.saveCustomer && !authCustomer?.id) {
      if (!customer.password || customer.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      }
    }
    return errors;
  };

  const validatePayment = () => {
    const errors = {};
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

    const nextStep = Math.min(currentStep + 1, 3);
    setActiveStep(nextStep);
    requestAnimationFrame(() => {
      const section = document.querySelector(`[data-step="${nextStep}"]`);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

    if (!stripe || !elements) {
      setActiveStep(3);
      setSubmitError("Payment system is still loading. Please try again.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setActiveStep(3);
      setSubmitError("Add your card details to continue.");
      return;
    }

    setSubmitError(null);
    setCardError("");
    setIsSubmitting(true);

    try {
      const birthdayPayload = birthday.optIn
        ? {
            birthdayOptIn: true,
            birthdayMonth: Number(birthday.month),
            birthdayDay: Number(birthday.day),
            birthdayYear: birthday.year ? Number(birthday.year) : null,
          }
        : {};
      const buyerPayload = sanitizeCustomerPayload(customer, birthdayPayload);

      // Use existing customer ID if logged in, otherwise create new customer
      let buyerId;
      if (authCustomer?.id) {
        buyerId = authCustomer.id;
      } else {
        const buyer = await createCustomer(buyerPayload);
        buyerId = buyer.id;

        // Register account if "save my info" is on and password provided
        if (customer.saveCustomer && customer.password) {
          try {
            await register({
              email: customer.email.trim().toLowerCase(),
              password: customer.password,
              firstName: customer.firstName.trim(),
              lastName: customer.lastName.trim(),
              phone: customer.phone.trim(),
            });
          } catch (regError) {
            console.warn("Account registration failed (non-blocking):", regError);
          }
        }
      }

      // If using saved recipient, reuse that customer ID; otherwise create new recipient
      let recipientCustomerId;
      let deliveryAddressId;

      if (!isNewRecipient && selectedSavedRecipient) {
        // Using saved recipient
        recipientCustomerId = selectedSavedRecipient.id;

        // Use the address that was selected
        if (selectedRecipientMeta?.address?.id) {
          deliveryAddressId = selectedRecipientMeta.address.id;
        } else {
          // No address was pre-selected, create new address for existing recipient
          const deliveryAddress = await createCustomerAddress(recipientCustomerId, {
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
          deliveryAddressId = deliveryAddress.id;
        }
      } else {
        // Creating new recipient
        const recipientCustomer = await createCustomer(
          sanitizeCustomerPayload(
            {
              firstName: recipient.firstName,
              lastName: recipient.lastName,
              email: recipient.email,
              phone: recipient.phone,
              notes: "Website recipient",
            },
            birthdayPayload,
          ),
        );
        recipientCustomerId = recipientCustomer.id;

        const deliveryAddress = await createCustomerAddress(recipientCustomerId, {
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
        deliveryAddressId = deliveryAddress.id;

        // Link new recipient to buyer (only if it's a new recipient)
        await linkRecipientToCustomer(buyerId, recipientCustomerId);

        // Refresh saved recipients list for logged-in users after creating new recipient
        if (authCustomer?.id) {
          try {
            await fetchSavedRecipients();
          } catch (error) {
            console.error("Failed to refresh saved recipients:", error);
          }
        }
      }

      const amountInCents = Math.round(estimatedTotal * 100);
      if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
        throw new Error("Invalid order total. Please refresh and try again.");
      }

      const paymentIntent = await createCheckoutPaymentIntent({
        amountInCents,
        customer: buyerPayload,
        bloomCustomerId: buyerId,
      });

      const confirmation = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: [buyerPayload.firstName, buyerPayload.lastName].filter(Boolean).join(" ") || undefined,
            email: buyerPayload.email || undefined,
            phone: buyerPayload.phone || undefined,
          },
        },
      });

      if (confirmation.error) {
        setCardError(confirmation.error.message || "Payment was not completed.");
        throw new Error(confirmation.error.message || "Payment was not completed.");
      }

      if (!confirmation.paymentIntent || confirmation.paymentIntent.status !== "succeeded") {
        throw new Error("Payment was not completed.");
      }

      const customProducts = cart.map((item) => ({
        description: item.name,
        price: Number(item.price).toFixed(2),
        qty: item.quantity,
        tax: item.isTaxable !== false,
      }));

      const draftOrder = await createOrderDraft(buyerId, {
        orderType: "DELIVERY",
        orderSource: "WEBSITE",
        recipientCustomerId,
        deliveryAddressId,
        cardMessage: recipient.cardMessage || null,
        deliveryInstructions: recipient.deliveryInstructions || null,
        deliveryDate,
        deliveryFee,
        discountAmount,
        appliedDiscounts,
        customProducts,
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentStatus: confirmation.paymentIntent?.status || null,
        ...birthdayPayload,
      });

      cardElement.clear();

      setOrderResult({
        drafts: draftOrder.drafts,
        buyer: { id: buyerId, ...customer },
        deliveryDate,
      });

      setLastOrderEmail(customer.email || "");

      clearCart();
      setRecipient(initialRecipient);
      setCustomer(initialCustomer);
      setPayment(initialPayment);
      setCardError("");
      setBirthday({
        optIn: false,
        month: "",
        day: "",
        year: "",
      });
      clearCoupon();
      setSelectedSavedRecipientOption("new");
      setRecipientWasAutofilled(false);

      if (!isAuthenticated && !customer.saveCustomer) {
        setShowCreateAccountModal(true);
      }
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
        <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
          <div className="container mx-auto">
            <SuccessCard orderResult={orderResult} />
          </div>
        </section>
        <CreateAccountModal
          isOpen={showCreateAccountModal}
          email={lastOrderEmail || customer.email || authCustomer?.email || ""}
          firstName={orderResult?.buyer?.firstName}
          lastName={orderResult?.buyer?.lastName}
          onClose={() => setShowCreateAccountModal(false)}
          onRegistered={refreshProfile}
        />
      </>
    );
  }

  if (!cart.length) {
    return (
      <>
        <Breadcrumb pageName="Checkout" />
        <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
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
      <CheckoutAuthBanner
        isAuthenticated={isAuthenticated}
        customerName={customerGreetingName}
        savedRecipientsLoading={savedRecipientsLoading}
        hasSavedRecipients={savedRecipientsAvailable}
      />
      {isMobile ? (
        <MobileCheckout
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          recipient={recipient}
          recipientErrors={formErrors.recipient}
          onRecipientChange={handleRecipientChange}
          deliveryDate={deliveryDate}
          onDateChange={setDeliveryDate}
          onRecipientPreset={(preset) =>
            setRecipient((prev) => ({
              ...prev,
              deliveryInstructions: prev.deliveryInstructions
                ? `${prev.deliveryInstructions}\n${preset}`
                : preset,
            }))
          }
          customer={customer}
          customerErrors={formErrors.customer}
          onCustomerChange={handleCustomerChange}
          birthday={birthday}
          onBirthdayToggle={handleBirthdayToggle}
          onBirthdayChange={handleBirthdayChange}
          payment={payment}
          paymentErrors={formErrors.payment}
          onPaymentChange={handlePaymentChange}
          cardError={cardError}
          onCardChange={handleCardChange}
          advanceStep={advanceStep}
          goBack={goBack}
          cart={cart}
          cartCount={cartCount}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          tax={estimatedTax}
          total={estimatedTotal}
          discountAmount={discountAmount}
          couponFreeShipping={couponFreeShipping}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          coupon={coupon}
          couponInput={couponInput}
          onCouponInputChange={setCouponInput}
          couponMessage={couponMessage}
          couponError={couponError}
          onApplyCoupon={handleCouponSubmit}
          onRemoveCoupon={handleRemoveCoupon}
          applyingCoupon={applyingCoupon}
          onPlaceOrder={handlePlaceOrder}
          isSubmitting={isSubmitting}
          submitError={submitError}
          instructionPresets={instructionPresets}
          hasSubmitError={Boolean(submitError)}
          savedRecipientOptions={savedRecipientOptions}
          savedRecipientsLoading={savedRecipientsLoading}
          savedRecipientsError={savedRecipientsError}
          selectedRecipientOption={selectedSavedRecipientOption}
          onSelectSavedRecipient={handleSelectSavedRecipient}
          isNewRecipient={isNewRecipient}
          onAddressAutocompleteSelect={handleAddressAutocompleteSelect}
          recipientModifiedAfterAutofill={recipientWasAutofilled}
        />
      ) : (
        <section className="hidden bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16 md:block">
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

            <div className="w-full px-0 lg:w-7/12 xl:w-8/12">
              <div className="mb-10 overflow-hidden rounded-[10px] bg-white px-5 py-0 dark:border-dark-3 dark:bg-dark-2 dark:shadow-box-dark xl:px-9 xl:pb-9">
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
                    savedRecipientOptions={savedRecipientOptions}
                    savedRecipientsLoading={savedRecipientsLoading}
                    savedRecipientsError={savedRecipientsError}
                    selectedSavedRecipientOption={selectedSavedRecipientOption}
                    onSavedRecipientChange={handleSelectSavedRecipient}
                    isNewRecipient={isNewRecipient}
                    onAddressSelect={handleAddressAutocompleteSelect}
                    recipientModifiedAfterAutofill={recipientWasAutofilled}
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
                  birthday={birthday}
                  onBirthdayToggle={handleBirthdayToggle}
                  onBirthdayChange={handleBirthdayChange}
                  isAuthenticated={isAuthenticated}
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
                    cardError={cardError}
                    onCardChange={handleCardChange}
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
      )}
    </>
  );
};

const MobileCheckout = ({
  activeStep,
  setActiveStep,
  recipient,
  recipientErrors,
  onRecipientChange,
  deliveryDate,
  onDateChange,
  onRecipientPreset,
  instructionPresets,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedRecipientOption,
  onSelectSavedRecipient,
  isNewRecipient,
  onAddressAutocompleteSelect,
  recipientModifiedAfterAutofill,
  customer,
  customerErrors,
  onCustomerChange,
  birthday,
  onBirthdayToggle,
  onBirthdayChange,
  payment,
  paymentErrors,
  onPaymentChange,
  cardError,
  onCardChange,
  advanceStep,
  goBack,
  cart,
  cartCount,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  couponFreeShipping,
  formatCurrency,
  formatDate,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  onPlaceOrder,
  isSubmitting,
  submitError,
}) => (
  <section className="bg-white pb-32 pt-6 dark:bg-dark md:hidden">
    <div className="container mx-auto px-4">
      <div className="space-y-6">
        <MobileAccordionSection
          step={1}
          title="Recipient"
          open={activeStep === 1}
          onToggle={() => setActiveStep(activeStep === 1 ? 0 : 1)}
        >
          <MobileRecipientForm
            data={recipient}
            errors={recipientErrors}
            onChange={onRecipientChange}
            instructionPresets={instructionPresets}
            onPresetSelect={onRecipientPreset}
            deliveryDate={deliveryDate}
            onDateChange={onDateChange}
            savedRecipientOptions={savedRecipientOptions}
            savedRecipientsLoading={savedRecipientsLoading}
            savedRecipientsError={savedRecipientsError}
            selectedSavedRecipientOption={selectedRecipientOption}
            onSavedRecipientChange={onSelectSavedRecipient}
            isNewRecipient={isNewRecipient}
            onAddressAutocompleteSelect={onAddressAutocompleteSelect}
            recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
          />
          <MobileStepActions
            primaryLabel="Save & Continue"
            onPrimary={() => advanceStep(1)}
            primaryDisabled={false}
          />
        </MobileAccordionSection>

        <MobileAccordionSection
          step={2}
          title="Customer"
          open={activeStep === 2}
          onToggle={() => setActiveStep(activeStep === 2 ? 0 : 2)}
        >
        <MobileCustomerForm
          data={customer}
          errors={customerErrors}
          onChange={onCustomerChange}
          birthday={birthday}
          onBirthdayToggle={onBirthdayToggle}
          onBirthdayChange={onBirthdayChange}
          isAuthenticated={isAuthenticated}
        />
          <MobileStepActions
            primaryLabel="Save & Continue"
            onPrimary={() => advanceStep(2)}
            secondaryLabel="Previous"
            onSecondary={() => goBack(2)}
            primaryDisabled={false}
          />
        </MobileAccordionSection>

        <MobileAccordionSection
          step={3}
          title="Payment & Review"
          open={activeStep === 3}
          onToggle={() => setActiveStep(activeStep === 3 ? 0 : 3)}
        >
          <MobilePaymentForm
            data={payment}
            errors={paymentErrors}
            onChange={onPaymentChange}
            cardError={cardError}
            onCardChange={onCardChange}
            cart={cart}
            formatCurrency={formatCurrency}
            coupon={coupon}
            couponInput={couponInput}
            onCouponInputChange={onCouponInputChange}
            couponMessage={couponMessage}
            couponError={couponError}
            onApplyCoupon={onApplyCoupon}
            onRemoveCoupon={onRemoveCoupon}
            applyingCoupon={applyingCoupon}
            subtotal={subtotal}
            deliveryFee={deliveryFee}
            tax={tax}
            total={total}
            discountAmount={discountAmount}
            couponFreeShipping={couponFreeShipping}
          />
          <MobileStepActions
            primaryLabel={isSubmitting ? "Submitting…" : "Place Order"}
            onPrimary={onPlaceOrder}
            primaryDisabled={isSubmitting}
            secondaryLabel="Previous"
            onSecondary={() => goBack(3)}
          />
          {submitError && (
            <p className="text-red-500 pt-2 text-sm">{submitError}</p>
          )}
        </MobileAccordionSection>
      </div>
    </div>

    <MobileStickyBottomSummary
      cart={cart}
      subtotal={subtotal}
      deliveryFee={deliveryFee}
      tax={tax}
      total={total}
      discountAmount={discountAmount}
      coupon={coupon}
      couponFreeShipping={couponFreeShipping}
      formatCurrency={formatCurrency}
      formatDate={formatDate}
    />
  </section>
);

MobileCheckout.propTypes = {
  activeStep: PropTypes.number.isRequired,
  setActiveStep: PropTypes.func.isRequired,
  recipient: PropTypes.object.isRequired,
  recipientErrors: PropTypes.object.isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  onRecipientPreset: PropTypes.func.isRequired,
  instructionPresets: PropTypes.array.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedRecipientOption: PropTypes.string.isRequired,
  onSelectSavedRecipient: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressAutocompleteSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
  customer: PropTypes.object.isRequired,
  customerErrors: PropTypes.object.isRequired,
  onCustomerChange: PropTypes.func.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
  payment: PropTypes.object.isRequired,
  paymentErrors: PropTypes.object.isRequired,
  onPaymentChange: PropTypes.func.isRequired,
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
  advanceStep: PropTypes.func.isRequired,
  goBack: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  cartCount: PropTypes.number.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  onPlaceOrder: PropTypes.func.isRequired,
  isSubmitting: PropTypes.bool.isRequired,
  submitError: PropTypes.string,
};

const MobileAccordionSection = ({ step, title, open, onToggle, children }) => {
  const sectionRef = useCallback((node) => {
    if (node && open) {
      // Scroll to the section with some offset for better UX
      setTimeout(() => {
        const yOffset = -80; // Offset to account for header/spacing
        const y = node.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 100);
    }
  }, [open]);

  return (
    <div ref={sectionRef} className="border-b border-stroke/40 pb-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold text-dark dark:text-white">
          {step}. {title}
        </span>
        <svg
          width="16"
          height="8"
          viewBox="0 0 16 8"
          className={`text-body-color transition-transform dark:text-dark-6 ${open ? "rotate-180" : ""}`}
        >
          <path
            fill="currentColor"
            d="M0.25 1.422 6.795 7.577C7.116 7.866 7.504 7.995 7.886 7.995c.403 0 .786-.167 1.091-.441L15.534 1.423c.293-.294.375-.811.023-1.162-.292-.292-.806-.375-1.157-.029L7.886 6.351 1.362.217C1.042-.058.542-.059.222.261c-.274.32-.275.82.046 1.141Z"
          />
        </svg>
      </button>
      {open && <div className="pt-3">{children}</div>}
    </div>
  );
};

MobileAccordionSection.propTypes = {
  step: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  open: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
};

const MobileInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  error,
  placeholder,
  required = false,
}) => (
  <div className="w-full">
    <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
      <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/40"
      />
    </div>
    {error && <p className="text-red-500 -mt-1 pb-2 pl-2 text-xs">{error}</p>}
  </div>
);

MobileInput.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onChange: PropTypes.func.isRequired,
  type: PropTypes.string,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  required: PropTypes.bool,
};

const MobileSelect = ({ label, name, value, onChange, options, required = false }) => (
  <div className="w-full">
    <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
      <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="flex-1 bg-transparent text-base text-dark outline-hidden dark:text-white"
      >
        {!value && <option value="">Select...</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  </div>
);

MobileSelect.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.array.isRequired,
  required: PropTypes.bool,
};

const MobileTextArea = ({ label, name, value, onChange, placeholder, maxLength }) => {
  const remaining = maxLength ? maxLength - value.length : null;

  return (
    <div className="w-full">
      <div className="flex border-b border-stroke/30 py-3 dark:border-dark-3/30">
        <label className="w-[35%] shrink-0 pr-3 pt-1 text-sm font-medium text-dark dark:text-white">
          {label}
        </label>
        <div className="flex-1">
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            maxLength={maxLength}
            rows="3"
            className="w-full resize-none bg-transparent text-base text-dark outline-hidden placeholder:text-body-color/40 dark:text-white dark:placeholder:text-dark-6/40"
          ></textarea>
          {maxLength && (
            <p className="mt-1 text-right text-xs text-body-color dark:text-dark-6">
              {remaining}/{maxLength}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

MobileTextArea.propTypes = {
  label: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  maxLength: PropTypes.number,
};

const MobileSectionHeader = ({ children }) => (
  <div className="bg-gray-50 px-4 py-2 dark:bg-dark-3/20">
    <h4 className="text-xs font-semibold uppercase tracking-wide text-body-color dark:text-dark-6">
      {children}
    </h4>
  </div>
);

MobileSectionHeader.propTypes = {
  children: PropTypes.node.isRequired,
};

const MobileRecipientForm = ({
  data,
  errors,
  onChange,
  instructionPresets,
  onPresetSelect,
  deliveryDate,
  onDateChange,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedSavedRecipientOption,
  onSavedRecipientChange,
  isNewRecipient,
  onAddressAutocompleteSelect,
  recipientModifiedAfterAutofill,
}) => (
  <div className="space-y-0">
    <SavedRecipientControls
      variant="mobile"
      options={savedRecipientOptions}
      loading={savedRecipientsLoading}
      error={savedRecipientsError}
      selectedOption={selectedSavedRecipientOption}
      onSelectOption={onSavedRecipientChange}
      recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
    />

    <MobileSectionHeader>Recipient Information</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileInput label="First Name" name="firstName" value={data.firstName} onChange={onChange} error={errors.firstName} placeholder="John" required />
      <MobileInput label="Last Name" name="lastName" value={data.lastName} onChange={onChange} error={errors.lastName} placeholder="Doe" required />
      <MobileInput label="Phone" name="phone" value={data.phone} onChange={onChange} error={errors.phone} placeholder="(604) 555-1234" required />
      <MobileInput label="Email" type="email" name="email" value={data.email} onChange={onChange} placeholder="john@example.com" />
    </div>

    <MobileSectionHeader>Delivery Address</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      {isNewRecipient ? (
        <AddressAutocomplete
          label="Address"
          value={data.address1}
          onChange={onChange}
          onAddressSelect={onAddressAutocompleteSelect}
          placeholder="123 Main St"
        />
      ) : (
        <MobileInput label="Address" name="address1" value={data.address1} onChange={onChange} error={errors.address1} placeholder="123 Main St" required />
      )}
      {isNewRecipient && errors.address1 && (
        <p className="text-red-500 px-4 pb-2 text-xs">{errors.address1}</p>
      )}
      <MobileInput label="Apt/Suite" name="address2" value={data.address2} onChange={onChange} placeholder="Suite 4B" />
      <MobileInput label="City" name="city" value={data.city} onChange={onChange} error={errors.city} placeholder="Vancouver" required />
      <MobileSelect label="Province" name="province" value={data.province} onChange={onChange} options={provinceOptions} required />
      <MobileInput label="Postal Code" name="postalCode" value={data.postalCode} onChange={onChange} error={errors.postalCode} placeholder="V6B 1A1" required />
    </div>

    <MobileSectionHeader>Delivery Details</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <div className="border-b border-stroke/30 px-4 py-3 dark:border-dark-3/30">
        <DeliveryDatePicker
          selectedDate={deliveryDate}
          onDateChange={onDateChange}
          required
          variant="compact"
        />
        {errors.deliveryDate && (
          <p className="text-red-500 mt-1 text-xs">{errors.deliveryDate}</p>
        )}
      </div>
      <MobileTextArea
        label="Card Message"
        name="cardMessage"
        value={data.cardMessage}
        onChange={onChange}
        placeholder="Happy Birthday! Love, Sarah"
        maxLength={250}
      />
      <div>
        <MobileTextArea
          label="Instructions"
          name="deliveryInstructions"
          value={data.deliveryInstructions}
          onChange={onChange}
          placeholder="Leave at the front door"
          maxLength={200}
        />
        <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
          <div className="flex flex-wrap gap-2">
            {instructionPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className="rounded-full border border-stroke/60 px-3 py-1 text-xs text-body-color transition hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3"
                onClick={() => onPresetSelect(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

MobileRecipientForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  instructionPresets: PropTypes.array.isRequired,
  onPresetSelect: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedSavedRecipientOption: PropTypes.string.isRequired,
  onSavedRecipientChange: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressAutocompleteSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

const MobileCustomerForm = ({ data, errors, onChange, birthday, onBirthdayToggle, onBirthdayChange, isAuthenticated }) => (
  <div className="space-y-0">
    <MobileSectionHeader>Your Information</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileInput label="First Name" name="firstName" value={data.firstName} onChange={onChange} error={errors.firstName} placeholder="Sarah" required />
      <MobileInput label="Last Name" name="lastName" value={data.lastName} onChange={onChange} error={errors.lastName} placeholder="Smith" required />
      <MobileInput label="Email" type="email" name="email" value={data.email} onChange={onChange} error={errors.email} placeholder="sarah@example.com" required />
      <MobileInput label="Phone" name="phone" value={data.phone} onChange={onChange} error={errors.phone} placeholder="(604) 555-5678" required />
      <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
        <BirthdayOptIn
          value={birthday}
          onToggle={onBirthdayToggle}
          onChange={onBirthdayChange}
          errors={errors}
          compact
        />
      </div>
      {!isAuthenticated && (
        <>
          <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
            <label className="flex items-center gap-3 text-sm text-body-color dark:text-dark-6">
              <input
                type="checkbox"
                name="saveCustomer"
                checked={data.saveCustomer}
                onChange={onChange}
                className="h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
              />
              Save details for next time
            </label>
          </div>
          {data.saveCustomer && (
            <MobileInput
              label="Create a password"
              type="password"
              name="password"
              value={data.password || ''}
              onChange={onChange}
              error={errors.password}
              placeholder="Minimum 8 characters"
              required
            />
          )}
        </>
      )}
    </div>
  </div>
);

MobileCustomerForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
};

const MobilePaymentForm = ({
  data,
  errors,
  onChange,
  cardError,
  onCardChange,
  cart,
  formatCurrency,
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  couponFreeShipping,
}) => (
  <div className="space-y-0">
    <MobileSectionHeader>Coupon Code</MobileSectionHeader>
    <div className="bg-white px-4 py-4 dark:bg-dark-2">
      <form className="flex flex-col gap-3" onSubmit={onApplyCoupon}>
        <input
          type="text"
          value={couponInput}
          onChange={(event) => onCouponInputChange(event.target.value)}
          placeholder="Enter coupon code"
          className="w-full rounded-md border border-stroke bg-transparent px-4 py-3 text-base text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
          disabled={applyingCoupon}
        />
        <button
          type="submit"
          disabled={applyingCoupon || !couponInput.trim()}
          className="w-full rounded-full bg-dark py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-dark/60 dark:bg-primary"
        >
          {coupon ? "Reapply" : "Apply Coupon"}
        </button>
      </form>
      {couponMessage && (
        <p className="text-success mt-2 text-sm">{couponMessage}</p>
      )}
      {couponError && (
        <p className="text-red-500 mt-2 text-sm">{couponError}</p>
      )}
      {coupon && (
        <button
          type="button"
          onClick={onRemoveCoupon}
          className="mt-2 text-sm text-body-color underline dark:text-dark-6"
        >
          Remove coupon
        </button>
      )}
    </div>

    <MobileSectionHeader>Payment Details</MobileSectionHeader>
    <div className="space-y-3 bg-white px-4 py-4 dark:bg-dark-2">
      <p className="text-sm text-body-color dark:text-dark-6">
        Secure checkout powered by Stripe.
      </p>
      <div className="rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
        <CardElement options={CARD_ELEMENT_OPTIONS} onChange={onCardChange} />
      </div>
      {cardError && <p className="text-red-500 text-xs">{cardError}</p>}
    </div>

    <MobileSectionHeader>Additional Notes</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileTextArea
        label="Notes"
        name="notes"
        value={data.notes}
        onChange={onChange}
        placeholder="Any special requests..."
      />
    </div>

    <MobileSectionHeader>Order Summary</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <div className="space-y-2 px-4 py-4">
        {cart.map((item) => (
          <div key={`${item.id}-${item.variantId || "base"}`} className="flex items-center justify-between text-sm">
            <span className="text-dark dark:text-white">
              {item.name} × {item.quantity}
            </span>
            <span className="font-semibold text-dark dark:text-white">
              {formatCurrency(item.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-stroke/30 px-4 py-4 dark:border-dark-3/30">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-body-color dark:text-dark-6">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount {coupon?.code ? `(${coupon.code.toUpperCase()})` : ""}</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-body-color dark:text-dark-6">
            <span>Delivery{couponFreeShipping ? " (waived)" : ""}</span>
            <span className={couponFreeShipping ? "line-through" : ""}>{formatCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between text-body-color dark:text-dark-6">
            <span>Tax</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between border-t border-stroke/30 pt-2 text-base font-semibold text-dark dark:border-dark-3/30 dark:text-white">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="bg-white px-4 py-4 dark:bg-dark-2">
      <label className="flex items-start gap-3 text-sm text-body-color dark:text-dark-6">
        <input
          type="checkbox"
          name="agreeToTerms"
          checked={data.agreeToTerms}
          onChange={onChange}
          className="mt-1 h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
        />
        I agree to Blom's{" "}
        <Link to="/terms" className="text-primary underline">
          Terms &amp; Conditions
        </Link>
      </label>

      {errors.agreeToTerms && (
        <p className="text-red-500 mt-2 text-xs">{errors.agreeToTerms}</p>
      )}
      {errors.cart && <p className="text-red-500 mt-2 text-xs">{errors.cart}</p>}
    </div>
  </div>
);

MobilePaymentForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
  cart: PropTypes.array.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
};

const MobileStepActions = ({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}) => (
  <div className="mt-4 flex flex-col gap-3">
    {secondaryLabel && (
      <button
        type="button"
        onClick={onSecondary}
        className="w-full rounded-full border border-stroke/80 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:text-white"
      >
        {secondaryLabel}
      </button>
    )}
    <button
      type="button"
      onClick={onPrimary}
      disabled={primaryDisabled}
      className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-primary/60"
    >
      {primaryLabel}
    </button>
  </div>
);

MobileStepActions.propTypes = {
  primaryLabel: PropTypes.string.isRequired,
  onPrimary: PropTypes.func.isRequired,
  primaryDisabled: PropTypes.bool,
  secondaryLabel: PropTypes.string,
  onSecondary: PropTypes.func,
};

const MobileStickyBottomSummary = ({
  cart,
  subtotal,
  deliveryFee,
  tax,
  total,
  discountAmount,
  coupon,
  couponFreeShipping,
  formatCurrency,
  formatDate,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-stroke bg-tg-bg shadow-lg dark:border-dark-3 md:hidden">
      {isExpanded && (
        <div className="max-h-[60vh] overflow-y-auto border-b border-stroke p-4 dark:bg-dark-2 dark:border-dark-3">
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={`${item.id}-${item.variantId || "base"}`}
                className="flex items-start justify-between text-sm"
              >
                <div className="flex-1">
                  <p className="font-medium text-dark dark:text-white">{item.name}</p>
                  <p className="text-xs text-body-color dark:text-dark-6">
                    {item.variantName ? `${item.variantName} • ` : ""}
                    {formatDate(item.deliveryDate || null)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-body-color dark:text-dark-6">Qty {item.quantity}</p>
                  <p className="font-semibold text-dark dark:text-white">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t border-stroke/30 pt-3 dark:border-dark-3/30">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount {coupon?.code ? `(${coupon.code.toUpperCase()})` : ""}</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Delivery{couponFreeShipping ? " (waived)" : ""}</span>
                  <span className={couponFreeShipping ? "line-through" : ""}>
                    {formatCurrency(deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between text-body-color dark:text-dark-6">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-2 dark:bg-dark-2"
      >
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium text-body-color dark:text-dark-6">Total</span>
            <span className="text-lg font-bold text-dark dark:text-white">
              {formatCurrency(total)}
            </span>
          </div>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 8"
          className={`text-body-color transition-transform dark:text-dark-6 ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          <path
            fill="currentColor"
            d="M0.25 1.422 6.795 7.577C7.116 7.866 7.504 7.995 7.886 7.995c.403 0 .786-.167 1.091-.441L15.534 1.423c.293-.294.375-.811.023-1.162-.292-.292-.806-.375-1.157-.029L7.886 6.351 1.362.217C1.042-.058.542-.059.222.261c-.274.32-.275.82.046 1.141Z"
          />
        </svg>
      </button>
    </div>
  );
};

MobileStickyBottomSummary.propTypes = {
  cart: PropTypes.array.isRequired,
  subtotal: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  coupon: PropTypes.object,
  couponFreeShipping: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
};

const MobileCouponForm = ({
  coupon,
  couponInput,
  onCouponInputChange,
  couponMessage,
  couponError,
  onApplyCoupon,
  onRemoveCoupon,
  applyingCoupon,
}) => (
  <div className="mt-8 space-y-3">
    <h3 className="text-base font-semibold text-dark dark:text-white">Coupon</h3>
    <form className="flex flex-col gap-3" onSubmit={onApplyCoupon}>
      <input
        type="text"
        value={couponInput}
        onChange={(event) => onCouponInputChange(event.target.value)}
        placeholder="Enter coupon code"
        className="w-full border-b border-stroke/60 bg-transparent px-0 py-3 text-base text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
        disabled={applyingCoupon}
      />
      <button
        type="submit"
        disabled={applyingCoupon || !couponInput.trim()}
        className="w-full rounded-full bg-dark py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-dark/60"
      >
        {coupon ? "Reapply" : "Apply"}
      </button>
    </form>
    {couponMessage && (
      <p className="text-success text-sm">{couponMessage}</p>
    )}
    {couponError && (
      <p className="text-red-500 text-sm">{couponError}</p>
    )}
    {coupon && (
      <button
        type="button"
        onClick={onRemoveCoupon}
        className="text-sm text-body-color underline"
      >
        Remove coupon
      </button>
    )}
  </div>
);

MobileCouponForm.propTypes = {
  coupon: PropTypes.object,
  couponInput: PropTypes.string.isRequired,
  onCouponInputChange: PropTypes.func.isRequired,
  couponMessage: PropTypes.string,
  couponError: PropTypes.string,
  onApplyCoupon: PropTypes.func.isRequired,
  onRemoveCoupon: PropTypes.func.isRequired,
  applyingCoupon: PropTypes.bool.isRequired,
};

const MobileCartSummary = ({
  cart,
  cartCount,
  subtotal,
  tax,
  deliveryFee,
  total,
  discountAmount,
  couponFreeShipping,
  formatCurrency,
  formatDate,
  coupon,
}) => (
  <div className="mt-10 space-y-4">
    <div>
      <p className="text-sm uppercase tracking-wide text-body-color">
        Shopping Cart · {cartCount} {cartCount === 1 ? "item" : "items"}
      </p>
    </div>
    <div className="space-y-3 rounded-2xl bg-white/70 p-4 shadow-sm dark:bg-dark-2">
      {cart.map((item) => (
        <div key={`${item.id}-${item.variantId || "base"}`} className="flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold text-dark dark:text-white">{item.name}</p>
            <p className="text-body-color text-xs">
              {item.variantName ? `${item.variantName} • ` : ""}
              {formatDate(item.deliveryDate || null)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-body-color">Qty {item.quantity}</p>
            <p className="font-semibold text-dark dark:text-white">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
        </div>
      ))}
    </div>
    <div className="space-y-2 text-sm text-dark dark:text-white">
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discountAmount > 0 && (
        <div className="flex justify-between text-success">
          <span>Discount {coupon?.code ? `(${coupon.code.toUpperCase()})` : ""}</span>
          <span>-{formatCurrency(discountAmount)}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>{couponFreeShipping ? "Delivery (waived)" : "Delivery"}</span>
        <span>{formatCurrency(deliveryFee)}</span>
      </div>
      <div className="flex justify-between">
        <span>Tax (estimate)</span>
        <span>{formatCurrency(tax)}</span>
      </div>
      <div className="flex justify-between border-t border-dashed border-stroke/60 pt-3 text-base font-semibold">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  </div>
);

MobileCartSummary.propTypes = {
  cart: PropTypes.array.isRequired,
  cartCount: PropTypes.number.isRequired,
  subtotal: PropTypes.number.isRequired,
  tax: PropTypes.number.isRequired,
  deliveryFee: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  discountAmount: PropTypes.number.isRequired,
  couponFreeShipping: PropTypes.bool.isRequired,
  formatCurrency: PropTypes.func.isRequired,
  formatDate: PropTypes.func.isRequired,
  coupon: PropTypes.object,
};

const SavedRecipientControls = ({
  variant,
  options,
  loading,
  error,
  selectedOption,
  onSelectOption,
  recipientModifiedAfterAutofill,
}) => {
  const hasOptions = options.length > 0;
  const shouldRender = loading || hasOptions || Boolean(error);
  if (!shouldRender) return null;

  if (variant === "mobile") {
    return (
      <div className="mb-4 bg-white dark:bg-dark-2">
        <div className="flex items-center border-b border-stroke/30 py-3 dark:border-dark-3/30">
          <label className="w-[35%] shrink-0 pr-3 text-sm font-medium text-dark dark:text-white">
            Saved
            {selectedOption !== "new" && hasOptions && (
              <span className="ml-1 text-xs text-primary">
                {recipientModifiedAfterAutofill ? "(edited)" : "✓"}
              </span>
            )}
          </label>
          <select
            className="flex-1 bg-transparent text-base text-dark outline-hidden dark:text-white"
            value={selectedOption}
            onChange={(event) => onSelectOption(event.target.value)}
            disabled={loading || !hasOptions}
          >
            <option value="new">New recipient</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {loading && <p className="px-4 pb-2 text-sm text-body-color">Loading saved recipients…</p>}
        {error && <p className="px-4 pb-2 text-sm text-red-500">{error}</p>}
      </div>
    );
  }

  // Desktop variant
  return (
    <div className="w-full px-3 mb-4">
      <label className="text-sm font-semibold text-dark dark:text-white">
        Saved recipient
        {selectedOption !== "new" && hasOptions && (
          <span className="ml-2 text-xs text-primary">
            {recipientModifiedAfterAutofill ? "(modified)" : "(applied)"}
          </span>
        )}
      </label>
      <select
        className="w-full rounded-md border border-stroke bg-transparent px-4 py-2 text-sm text-dark outline-hidden focus:border-primary dark:border-dark-3 dark:text-white"
        value={selectedOption}
        onChange={(event) => onSelectOption(event.target.value)}
        disabled={loading || !hasOptions}
      >
        <option value="new">New recipient</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {loading && <p className="text-sm text-body-color">Loading saved recipients…</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

SavedRecipientControls.propTypes = {
  variant: PropTypes.oneOf(["desktop", "mobile"]).isRequired,
  options: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  error: PropTypes.string,
  selectedOption: PropTypes.string.isRequired,
  onSelectOption: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

const CheckoutAuthBanner = ({
  isAuthenticated,
  customerName,
  savedRecipientsLoading,
  hasSavedRecipients,
}) => (
  <div className="mb-0 dark:bg-dark-2">
    <div className="container mx-auto px-4 md:px-3">
      <div className="bg-tg-bg px-6 py-3 text-sm text-dark dark:bg-dark-2">
        {isAuthenticated ? (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-dark dark:text-white">
              Welcome back, {customerName || "friend"}!
            </p>
            <p className="text-body-color dark:text-dark-6">
              {savedRecipientsLoading
                ? "Syncing your saved recipients…"
                : hasSavedRecipients
                  ? "Choose a saved recipient below or enter new details."
                  : "Add a new recipient to save them for next time."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-dark dark:text-white">Login or continue as guest</p>
              <p className="text-body-color text-sm dark:text-dark-6">
                Sign in to access saved recipients and faster checkout.
              </p>
            </div>
            <Link
              to="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
);

CheckoutAuthBanner.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  customerName: PropTypes.string,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  hasSavedRecipients: PropTypes.bool.isRequired,
};

const formatRecipientLabel = (recipient) => {
  if (!recipient) return "Recipient";
  const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (recipient.company) return recipient.company;
  if (recipient.email) return recipient.email;
  return "Recipient";
};

const formatAddressLabel = (address, index) => {
  if (!address) return `Address ${index + 1}`;
  return (
    address.label ||
    [address.address1, address.city].filter(Boolean).join(", ") ||
    `Address ${index + 1}`
  );
};

const buildSavedRecipientOptions = (recipients) => {
  if (!Array.isArray(recipients)) return [];

  const options = [];

  recipients.forEach((recipient) => {
    const baseLabel = formatRecipientLabel(recipient);
    const addressList = [];

    if (recipient.homeAddress) {
      addressList.push({ ...recipient.homeAddress, __home: true });
    }

    if (Array.isArray(recipient.addresses)) {
      recipient.addresses.forEach((address) => {
        addressList.push(address);
      });
    }

    if (addressList.length === 0) {
      options.push({
        value: `recipient-${recipient.id}`,
        label: baseLabel,
        recipient,
        address: null,
      });
      return;
    }

    addressList.forEach((address, index) => {
      const suffix = formatAddressLabel(address, index);
      options.push({
        value: `recipient-${recipient.id}::${address.id || index}`,
        label: `${baseLabel} — ${suffix}`,
        recipient,
        address,
      });
    });
  });

  return options;
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
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedSavedRecipientOption,
  onSavedRecipientChange,
  isNewRecipient,
  onAddressSelect,
  recipientModifiedAfterAutofill,
}) => (
  <>
    <SavedRecipientControls
      variant="desktop"
      options={savedRecipientOptions}
      loading={savedRecipientsLoading}
      error={savedRecipientsError}
      selectedOption={selectedSavedRecipientOption}
      onSelectOption={onSavedRecipientChange}
      recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
    />
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Recipient first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
      required
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Recipient last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
      required
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Recipient phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
      required
    />
    <InputGroup
      labelTitle="Email (optional)"
      type="email"
      placeholder="Recipient email"
      name="email"
      value={data.email}
      onChange={onChange}
    />
    {isNewRecipient ? (
      <div className="w-full px-3">
        <AddressAutocomplete
          label="Address"
          value={data.address1}
          onChange={onChange}
          onAddressSelect={onAddressSelect}
          inputClassName="border rounded-md border-stroke px-5 py-3 text-body-color placeholder:text-body-color/70 focus:border-primary dark:border-dark-3 dark:text-dark-6"
        />
        {errors.address1 && <p className="text-red-500 mt-1 text-sm">{errors.address1}</p>}
      </div>
    ) : (
      <InputGroup
        fullColumn
        labelTitle="Address"
        type="text"
        placeholder="Street address"
        name="address1"
        value={data.address1}
        onChange={onChange}
        error={errors.address1}
        required
      />
    )}
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
      required
    />
    <SelectGroup
      labelTitle="Province"
      name="province"
      value={data.province}
      onChange={onChange}
      options={provinceOptions}
      required
    />
    <InputGroup
      labelTitle="Postal Code"
      type="text"
      placeholder="Postal code"
      name="postalCode"
      value={data.postalCode}
      onChange={onChange}
      error={errors.postalCode}
      required
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
      maxLength={250}
    />
    <TextAreaGroup
      labelTitle="Delivery Instructions"
      placeholder="Gate codes, concierge details, or anything else we should know."
      name="deliveryInstructions"
      value={data.deliveryInstructions}
      onChange={onChange}
      maxLength={200}
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
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedSavedRecipientOption: PropTypes.string.isRequired,
  onSavedRecipientChange: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

const CustomerForm = ({ data, onChange, errors, birthday, onBirthdayToggle, onBirthdayChange, isAuthenticated }) => (
  <>
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Your first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
      required
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Your last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
      required
    />
    <InputGroup
      labelTitle="Email"
      type="email"
      placeholder="you@example.com"
      name="email"
      value={data.email}
      onChange={onChange}
      error={errors.email}
      required
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Your phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
      required
    />
    <div className="px-3">
      <BirthdayOptIn
        value={birthday}
        onToggle={onBirthdayToggle}
        onChange={onBirthdayChange}
        errors={errors}
      />
    </div>
    {!isAuthenticated && (
      <>
        <CheckboxGroup
          labelTitle="Save my information for future orders"
          name="saveCustomer"
          checked={data.saveCustomer}
          onChange={onChange}
        />
        {data.saveCustomer && (
          <InputGroup
            labelTitle="Create a password"
            type="password"
            placeholder="Minimum 8 characters"
            name="password"
            value={data.password || ''}
            onChange={onChange}
            error={errors.password}
            fullColumn
            required
          />
        )}
      </>
    )}
  </>
);

CustomerForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
};

const PaymentForm = ({
  data,
  onChange,
  errors,
  cardError,
  onCardChange,
  cart,
  formatCurrency,
  deliveryDateLabel,
  recipient,
  customer,
  totals,
  coupon,
  couponFreeShipping,
}) => {
  return (
    <>
      <div className="w-full px-3">
        <div className="rounded-md border border-stroke p-5 dark:border-dark-3">
          <p className="text-lg font-semibold text-dark dark:text-white">Payment details</p>
          <p className="mt-1 text-sm text-body-color dark:text-dark-6">
            Secure checkout powered by Stripe.
          </p>
          <div className="mt-4 rounded-md border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark">
            <CardElement options={CARD_ELEMENT_OPTIONS} onChange={onCardChange} />
          </div>
          {cardError && <p className="text-red-500 mt-2 text-sm">{cardError}</p>}
        </div>
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
            I agree to{" "}
            <Link to="/terms" className="text-primary underline">
              Terms &amp; Conditions
            </Link>
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
  cardError: PropTypes.string.isRequired,
  onCardChange: PropTypes.func.isRequired,
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
  required = false,
}) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      {labelTitle && (
        <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
          {labelTitle}
          {required && <span className="text-red-500 ml-0.5">*</span>}
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

const SelectGroup = ({ fullColumn, labelTitle, name, value, onChange, options, required = false }) => (
  <div className={`${fullColumn ? "w-full px-3" : "w-full px-3 md:w-1/2"}`}>
    <div className="mb-6">
      <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
        {labelTitle}
        {required && <span className="text-red-500 ml-0.5">*</span>}
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
  maxLength,
}) => {
  const remaining = maxLength ? maxLength - value.length : null;

  return (
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
          maxLength={maxLength}
          rows="4"
          className="w-full rounded-md border border-stroke bg-transparent p-5 font-medium text-body-color outline-hidden transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-[#F5F7FD] dark:border-dark-3 dark:text-dark-6"
        ></textarea>
        {maxLength && (
          <p className="mt-2 text-right text-sm text-body-color dark:text-dark-6">
            {remaining}/{maxLength}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

TextAreaGroup.propTypes = {
  labelTitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  children: PropTypes.node,
  maxLength: PropTypes.number,
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
            className={`mr-4 flex h-5 w-5 mt-2 items-center justify-center rounded border ${
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
        <span className="text-dark dark:text-white text-sm mt-2 font-medium">{labelTitle}</span>
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
      href="/shop"
      className="bg-primary mt-6 inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white transition hover:bg-primary/90"
    >
      Browse products
    </a>
  </div>
);

const SuccessCard = ({ orderResult }) => (
  <div className="rounded-[20px] border border-success/40 bg-white p-12 text-center shadow-xl dark:border-success/20 dark:bg-dark-2">
    <p className="text-success text-xs font-semibold uppercase tracking-[4px]">
      Order confirmed
    </p>
    <h2 className="text-dark mt-4 text-3xl font-bold dark:text-white">
      Thank you! Your payment is complete.
    </h2>
    <p className="text-body-color mx-auto mt-4 max-w-2xl text-base dark:text-dark-6">
      We’re arranging your order now and will follow up with delivery updates shortly.
    </p>

    <div className="mt-8 rounded-2xl border border-stroke p-6 text-left dark:border-dark-3">
      <p className="text-dark mb-3 text-lg font-semibold dark:text-white">
        Order confirmation
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

const sanitizeCustomerPayload = (payload, birthdayPayload = {}) => ({
  firstName: payload.firstName.trim(),
  lastName: payload.lastName.trim(),
  email: payload.email?.trim().toLowerCase() || null,
  phone: payload.phone?.trim() || null,
  notes: payload.notes || null,
  ...birthdayPayload,
});

const Checkout = () => (
  <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}>
    <CheckoutContent />
  </Elements>
);

export default Checkout;
