import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PaymentElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import Breadcrumb from "../components/Breadcrumb.jsx";
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
import api from "../services/api.js";

// Checkout component imports
import {
  stripePromise,
  DELIVERY_FEE,
  TAX_RATE,
  instructionPresets,
  initialRecipient,
  initialCustomer,
  initialPayment,
  STRIPE_APPEARANCE,
} from "../components/Checkout/shared/constants";
import {
  smoothScrollTo,
  buildSavedRecipientOptions,
  sanitizeCustomerPayload,
  formatCurrency,
  formatDate,
} from "../components/Checkout/shared/utils";
import { useIsMobile } from "../components/Checkout/shared/hooks";
import { FormStep } from "../components/Checkout/shared/AccordionSections";
import MobileCheckout from "../components/Checkout/shared/MobileCheckout";
import SidebarSummary from "../components/Checkout/shared/SidebarSummary";
import CheckoutAuthBanner from "../components/Checkout/shared/CheckoutAuthBanner";
import EmptyCheckoutState from "../components/Checkout/shared/EmptyCheckoutState";
import SuccessCard from "../components/Checkout/shared/SuccessCard";
import { DesktopRecipientForm } from "../components/Checkout/RecipientStep";
import { DesktopCustomerForm } from "../components/Checkout/CustomerStep";
import { DesktopPaymentForm } from "../components/Checkout/PaymentStep";

const generateIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
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

  // Saved payment methods
  const [savedCards, setSavedCards] = useState([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("new"); // "new" or payment method ID
  const checkoutIdempotencyKeyRef = useRef(null);

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

  // Fetch saved payment methods for authenticated users
  const fetchSavedCards = useCallback(async () => {
    if (!authCustomer?.id) {
      setSavedCards([]);
      setSelectedPaymentMethod("new");
      return;
    }
    setSavedCardsLoading(true);
    try {
      const data = await api.post("/stripe/customer/payment-methods", {
        email: authCustomer.email,
        phone: authCustomer.phone,
        customerId: authCustomer.id,
      });
      const methods = data?.paymentMethods || [];
      setSavedCards(methods);
      // Auto-select first saved card if available
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (error) {
      console.error("Failed to fetch saved cards:", error);
      setSavedCards([]);
    } finally {
      setSavedCardsLoading(false);
    }
  }, [authCustomer?.id, authCustomer?.email, authCustomer?.phone]);

  useEffect(() => {
    fetchSavedCards();
  }, [fetchSavedCards]);

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

  // Handle return from 3D Secure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");

    if (!paymentIntentId) return;

    // Clear URL params
    window.history.replaceState({}, "", window.location.pathname);

    // Handle failed payment redirect
    if (redirectStatus !== "succeeded") {
      // Restore form data so user can retry
      const pending = sessionStorage.getItem("pendingCheckout");
      if (pending) {
        const pendingData = JSON.parse(pending);
        if (pendingData.recipient) {
          setRecipient((prev) => ({ ...prev, ...pendingData.recipient }));
        }
        if (pendingData.buyer) {
          setCustomer((prev) => ({
            ...prev,
            firstName: pendingData.buyer.firstName || prev.firstName,
            lastName: pendingData.buyer.lastName || prev.lastName,
            email: pendingData.buyer.email || prev.email,
            phone: pendingData.buyer.phone || prev.phone,
          }));
        }
        if (pendingData.deliveryDate) {
          setDeliveryDate(pendingData.deliveryDate);
        }
      }
      setActiveStep(3);
      setCardError("Your payment was not completed. Please try again or use a different card.");
      sessionStorage.removeItem("pendingCheckout");
      return;
    }

    const pending = sessionStorage.getItem("pendingCheckout");
    if (!pending) return;

    const pendingData = JSON.parse(pending);

    // Complete the order
    setIsSubmitting(true);
    createOrderDraft(pendingData.buyerId, {
      customerId: pendingData.buyerId,
      recipientCustomerId: pendingData.recipientCustomerId,
      deliveryAddressId: pendingData.deliveryAddressId,
      cardMessage: pendingData.cardMessage,
      deliveryInstructions: pendingData.deliveryInstructions,
      deliveryDate: pendingData.deliveryDate,
      deliveryFee: pendingData.deliveryFee,
      discountAmount: pendingData.discountAmount,
      appliedDiscounts: pendingData.appliedDiscounts,
      customProducts: pendingData.customProducts,
      paymentIntentId,
      paymentStatus: "succeeded",
    })
      .then((draftOrder) => {
        sessionStorage.removeItem("pendingCheckout");
        checkoutIdempotencyKeyRef.current = null;
        setOrderResult({
          drafts: draftOrder.drafts,
          buyer: pendingData.buyer,
          recipient: pendingData.recipient,
          deliveryDate: pendingData.deliveryDate,
          cardMessage: pendingData.cardMessage,
          isPickup: false,
          cartItems: pendingData.cartItems,
          totals: pendingData.totals,
        });
        clearCart();
      })
      .catch((err) => {
        setSubmitError(err.message || "Failed to complete your order after payment.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [clearCart, setDeliveryDate]);

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
  const discountLabel = useMemo(() => {
    if (!appliedDiscounts.length) return "Discount";

    if (appliedDiscounts.length === 1) {
      const discount = appliedDiscounts[0];
      if (discount.name) return `Discount (${discount.name})`;
      if (discount.code) return `Discount (${discount.code.toUpperCase()})`;
      return "Discount";
    }

    const primary = appliedDiscounts[0];
    const primaryLabel = primary.name || (primary.code ? primary.code.toUpperCase() : null);
    if (primaryLabel) {
      return `Discounts (${primaryLabel} +${appliedDiscounts.length - 1})`;
    }

    return "Discounts";
  }, [appliedDiscounts]);
  const couponFreeShipping = hasFreeShipping();
  const baseDeliveryFee = cart.length ? DELIVERY_FEE : 0;
  const deliveryFee = couponFreeShipping ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const checkoutIntentFingerprint = useMemo(
    () =>
      JSON.stringify({
        items: cart.map((item) => ({
          id: item.id,
          variantId: item.variantId || null,
          quantity: item.quantity,
          price: item.price,
        })),
        deliveryDate: deliveryDate || null,
        deliveryFee,
        discountAmount,
        estimatedTax,
        estimatedTotal,
      }),
    [cart, deliveryDate, deliveryFee, discountAmount, estimatedTax, estimatedTotal],
  );

  useEffect(() => {
    checkoutIdempotencyKeyRef.current = null;
  }, [checkoutIntentFingerprint]);

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
    setTimeout(() => {
      const section = document.querySelector(`[data-step="${nextStep}"]`);
      smoothScrollTo(section, 800);
    }, 50);
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

    const usingSavedCard = selectedPaymentMethod !== "new";
    const paymentElement = usingSavedCard ? null : elements.getElement(PaymentElement);
    if (!usingSavedCard && !paymentElement) {
      setActiveStep(3);
      setSubmitError("Add your card details to continue.");
      return;
    }

    setSubmitError(null);
    setCardError("");
    setIsSubmitting(true);

    try {
      if (!usingSavedCard) {
        const { error: submitPaymentElementError } = await elements.submit();
        if (submitPaymentElementError) {
          setCardError(submitPaymentElementError.message || "Add your card details to continue.");
          throw new Error(submitPaymentElementError.message || "Payment details are incomplete.");
        }
      }

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
      const idempotencyKey = checkoutIdempotencyKeyRef.current || generateIdempotencyKey();
      checkoutIdempotencyKeyRef.current = idempotencyKey;

      const shouldSaveCard = selectedPaymentMethod === "new" && payment.saveCard;
      const paymentIntent = await createCheckoutPaymentIntent({
        amountInCents,
        customer: buyerPayload,
        bloomCustomerId: buyerId,
        idempotencyKey,
        saveCard: shouldSaveCard,
      });

      // Build order data before payment (for 3D Secure redirect recovery)
      const customProducts = cart.map((item) => ({
        description: item.name,
        price: Number(item.price).toFixed(2),
        qty: item.quantity,
        tax: item.isTaxable !== false,
      }));

      // Save pending checkout in case of 3D Secure redirect
      sessionStorage.setItem("pendingCheckout", JSON.stringify({
        buyerId,
        buyer: { id: buyerId, ...customer },
        recipientCustomerId,
        deliveryAddressId,
        recipient: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          address1: recipient.address1,
          city: recipient.city,
          province: recipient.province,
          postalCode: recipient.postalCode,
        },
        cardMessage: recipient.cardMessage || null,
        deliveryInstructions: recipient.deliveryInstructions || null,
        deliveryDate,
        deliveryFee,
        discountAmount,
        appliedDiscounts,
        customProducts,
        cartItems: cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || null,
        })),
        totals: {
          subtotal,
          deliveryFee,
          tax: estimatedTax,
          discount: discountAmount,
          total: estimatedTotal,
        },
      }));

      const returnUrl = `${window.location.origin}/checkout?payment_status=pending`;
      const confirmation = usingSavedCard
        ? await stripe.confirmPayment({
            clientSecret: paymentIntent.clientSecret,
            confirmParams: {
              payment_method: selectedPaymentMethod,
              return_url: returnUrl,
            },
            redirect: "if_required",
          })
        : await stripe.confirmPayment({
            elements,
            clientSecret: paymentIntent.clientSecret,
            confirmParams: {
              return_url: returnUrl,
            },
            redirect: "if_required",
          });

      // Clear pending checkout on success (no redirect happened)
      sessionStorage.removeItem("pendingCheckout");

      if (confirmation.error) {
        setCardError(confirmation.error.message || "Payment was not completed.");
        throw new Error(confirmation.error.message || "Payment was not completed.");
      }

      if (!confirmation.paymentIntent || confirmation.paymentIntent.status !== "succeeded") {
        throw new Error("Payment was not completed.");
      }

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
      checkoutIdempotencyKeyRef.current = null;

      setOrderResult({
        drafts: draftOrder.drafts,
        buyer: { id: buyerId, ...customer },
        recipient: {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          address1: recipient.address1,
          city: recipient.city,
          province: recipient.province,
          postalCode: recipient.postalCode,
        },
        deliveryDate,
        cardMessage: recipient.cardMessage || null,
        isPickup: false,
        cartItems: cart.map((item) => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image || null,
        })),
        totals: {
          subtotal,
          deliveryFee,
          tax: estimatedTax,
          discount: discountAmount,
          total: estimatedTotal,
        },
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
          isAuthenticated={isAuthenticated}
          payment={payment}
          paymentErrors={formErrors.payment}
          onPaymentChange={handlePaymentChange}
          cardError={cardError}
          onCardChange={handleCardChange}
          savedCards={savedCards}
          savedCardsLoading={savedCardsLoading}
          selectedPaymentMethod={selectedPaymentMethod}
          onSelectPaymentMethod={setSelectedPaymentMethod}
          advanceStep={advanceStep}
          goBack={goBack}
          cart={cart}
          cartCount={cartCount}
          subtotal={subtotal}
          deliveryFee={deliveryFee}
          tax={estimatedTax}
          total={estimatedTotal}
          discountAmount={discountAmount}
          discountLabel={discountLabel}
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
                discountLabel={discountLabel}
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
                  setTimeout(() => {
                    const section = document.querySelector('[data-step="3"]');
                    smoothScrollTo(section, 800);
                  }, 50);
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
                  <DesktopRecipientForm
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
                <DesktopCustomerForm
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
                  <DesktopPaymentForm
                    data={payment}
                    onChange={handlePaymentChange}
                    errors={formErrors.payment}
                    cardError={cardError}
                    onCardChange={handleCardChange}
                    savedCards={savedCards}
                    savedCardsLoading={savedCardsLoading}
                    selectedPaymentMethod={selectedPaymentMethod}
                    onSelectPaymentMethod={setSelectedPaymentMethod}
                    cart={cart}
                    formatCurrency={formatCurrency}
                    deliveryDateLabel={formatDate(deliveryDate)}
                    recipient={recipient}
                    customer={customer}
                    discountLabel={discountLabel}
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

const CheckoutElements = () => {
  const { cart, getDiscountAmount, hasFreeShipping } = useCart();
  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );
  const discountAmount = getDiscountAmount();
  const deliveryFee = hasFreeShipping() ? 0 : cart.length ? DELIVERY_FEE : 0;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;
  const amountInCents = Math.max(Math.round(estimatedTotal * 100), 50);

  return (
    <Elements
      key={`checkout-elements-${amountInCents}`}
      stripe={stripePromise}
      options={{
        mode: "payment",
        amount: amountInCents,
        currency: "cad",
        appearance: STRIPE_APPEARANCE,
      }}
    >
      <CheckoutContent />
    </Elements>
  );
};

const Checkout = () => <CheckoutElements />;

export default Checkout;
