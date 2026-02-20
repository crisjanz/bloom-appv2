import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import api from '../../services/api.js';
import {
  createCustomer,
  createCustomerAddress,
  createCheckoutPaymentIntent,
  createOrderDraft,
  createReminder,
  getSavedRecipients,
  linkRecipientToCustomer,
} from '../../services/checkoutService.js';
import {
  DELIVERY_FEE,
  TAX_RATE,
  instructionPresets,
  initialRecipient,
  initialCustomer,
  initialPayment,
  occasionOptions,
} from './shared/constants.js';
import {
  buildSavedRecipientOptions,
  sanitizeCustomerPayload,
  formatCurrency,
  formatDate,
} from './shared/utils.js';
import EmptyCheckoutState from './shared/EmptyCheckoutState.jsx';
import SuccessCard from './shared/SuccessCard.jsx';
import PreCheckoutGate from './PreCheckoutGate.jsx';
import ProgressBar from './ProgressBar.jsx';
import DeliveryStep from './steps/DeliveryStep.jsx';
import CardMessageStep from './steps/CardMessageStep.jsx';
import YourInfoStep from './steps/YourInfoStep.jsx';
import ReviewPayStep from './steps/ReviewPayStep.jsx';
import CheckoutLoginModal from './CheckoutLoginModal.jsx';
import CheckoutTermsModal from './CheckoutTermsModal.jsx';
import CreateAccountModal from '../CreateAccountModal.jsx';

const stepItems = [
  { id: 1, label: 'Delivery' },
  { id: 2, label: 'Message' },
  { id: 3, label: 'Your Info' },
  { id: 4, label: 'Payment' },
];

const generateIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
};

const mapOccasionLabel = (value) => {
  if (!value) return 'None selected';
  const option = occasionOptions.find((item) => item.value === value);
  return option?.label || value.replace(/_/g, ' ');
};

const WizardCheckout = ({ onOrderPlaced, persistedOrderResult = null }) => {
  const stripe = useStripe();
  const elements = useElements();

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

  const [preCheckoutReady, setPreCheckoutReady] = useState(isAuthenticated);
  const [activeStep, setActiveStep] = useState(1);
  const activeStepRef = useRef(1);
  const [completedSteps, setCompletedSteps] = useState([]);

  const [recipient, setRecipient] = useState(initialRecipient);
  const [customer, setCustomer] = useState(initialCustomer);
  const [payment, setPayment] = useState(initialPayment);
  const [birthday, setBirthday] = useState({
    optIn: false,
    month: '',
    day: '',
    year: '',
  });

  const [orderType, setOrderType] = useState('DELIVERY');
  const [isForMe, setIsForMe] = useState(false);
  const [savedRecipientDraft, setSavedRecipientDraft] = useState(initialRecipient);
  const [rememberDate, setRememberDate] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [messageSuggestions, setMessageSuggestions] = useState([]);

  const [formErrors, setFormErrors] = useState({
    recipient: {},
    customer: {},
    payment: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [cardError, setCardError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [lastOrderEmail, setLastOrderEmail] = useState('');

  const [couponInput, setCouponInput] = useState(coupon?.code || '');
  const [couponMessage, setCouponMessage] = useState('');
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const [savedRecipients, setSavedRecipients] = useState([]);
  const [savedRecipientsLoading, setSavedRecipientsLoading] = useState(false);
  const [savedRecipientsError, setSavedRecipientsError] = useState('');
  const [selectedSavedRecipientOption, setSelectedSavedRecipientOption] = useState('new');
  const [recipientWasAutofilled, setRecipientWasAutofilled] = useState(false);

  const [savedCards, setSavedCards] = useState([]);
  const [savedCardsLoading, setSavedCardsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('new');

  const checkoutIdempotencyKeyRef = useRef(null);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  useEffect(() => {
    if (isAuthenticated) {
      setPreCheckoutReady(true);
    }
  }, [isAuthenticated]);

  const skippedSteps = useMemo(() => [], []);

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
    if (!appliedDiscounts.length) return 'Discount';

    if (appliedDiscounts.length === 1) {
      const discount = appliedDiscounts[0];
      if (discount.name) return `Discount (${discount.name})`;
      if (discount.code) return `Discount (${discount.code.toUpperCase()})`;
      return 'Discount';
    }

    const primary = appliedDiscounts[0];
    const primaryLabel = primary.name || (primary.code ? primary.code.toUpperCase() : null);
    if (primaryLabel) {
      return `Discounts (${primaryLabel} +${appliedDiscounts.length - 1})`;
    }

    return 'Discounts';
  }, [appliedDiscounts]);

  const couponFreeShipping = hasFreeShipping();
  const baseDeliveryFee = cart.length ? DELIVERY_FEE : 0;
  const deliveryFee = orderType === 'PICKUP' ? 0 : couponFreeShipping ? 0 : baseDeliveryFee;
  const discountedSubtotal = Math.max(subtotal - discountAmount, 0);
  const estimatedTax = Number((discountedSubtotal * TAX_RATE).toFixed(2));
  const estimatedTotal = discountedSubtotal + deliveryFee + estimatedTax;

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
        orderType,
      }),
    [cart, deliveryDate, deliveryFee, discountAmount, estimatedTax, estimatedTotal, orderType],
  );

  useEffect(() => {
    checkoutIdempotencyKeyRef.current = null;
  }, [checkoutIntentFingerprint]);

  const effectiveRecipient = useMemo(() => {
    if (!isForMe) return recipient;

    return {
      ...recipient,
      firstName: customer.firstName || recipient.firstName,
      lastName: customer.lastName || recipient.lastName,
      phone: customer.phone || recipient.phone,
      email: customer.email || recipient.email,
      address1: recipient.address1 || customer.billingAddress1 || '',
      address2: recipient.address2 || customer.billingAddress2 || '',
      city: recipient.city || customer.billingCity || '',
      province: recipient.province || customer.billingProvince || 'BC',
      postalCode: recipient.postalCode || customer.billingPostalCode || '',
    };
  }, [recipient, customer, isForMe]);

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
      setShowLoginModal(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRememberDate(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    api
      .get('/messages')
      .then((data) => {
        setMessageSuggestions(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        console.error('Failed to fetch message suggestions:', error);
        setMessageSuggestions([]);
      });
  }, []);

  const resetSavedRecipientState = useCallback(() => {
    setSavedRecipients([]);
    setSavedRecipientsError('');
    setSelectedSavedRecipientOption('new');
    setSavedRecipientsLoading(false);
  }, []);

  const fetchSavedRecipients = useCallback(async () => {
    if (!authCustomer?.id) {
      resetSavedRecipientState();
      return;
    }

    setSavedRecipientsLoading(true);
    setSavedRecipientsError('');
    try {
      const data = await getSavedRecipients(authCustomer.id);
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setSavedRecipients(list);
    } catch (error) {
      console.error('Failed to fetch saved recipients:', error);
      setSavedRecipients([]);
      setSavedRecipientsError(error.message || 'Failed to load saved recipients');
    } finally {
      setSavedRecipientsLoading(false);
    }
  }, [authCustomer?.id, resetSavedRecipientState]);

  useEffect(() => {
    fetchSavedRecipients();
  }, [fetchSavedRecipients]);

  const fetchSavedCards = useCallback(async () => {
    if (!authCustomer?.id) {
      setSavedCards([]);
      setSelectedPaymentMethod('new');
      return;
    }

    setSavedCardsLoading(true);
    try {
      const data = await api.post('/stripe/customer/payment-methods', {
        email: authCustomer.email,
        phone: authCustomer.phone,
        customerId: authCustomer.id,
      });
      const methods = data?.paymentMethods || [];
      setSavedCards(methods);
      if (methods.length > 0) {
        setSelectedPaymentMethod(methods[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch saved cards:', error);
      setSavedCards([]);
    } finally {
      setSavedCardsLoading(false);
    }
  }, [authCustomer?.id, authCustomer?.email, authCustomer?.phone]);

  useEffect(() => {
    fetchSavedCards();
  }, [fetchSavedCards]);

  useEffect(() => {
    setCouponInput(coupon?.code || '');
    if (coupon) {
      setCouponMessage(coupon.discount?.name ? `${coupon.discount.name} applied` : 'Coupon applied');
      setCouponError('');
    } else {
      setCouponMessage('');
    }
  }, [coupon]);

  const savedRecipientOptions = useMemo(() => buildSavedRecipientOptions(savedRecipients), [savedRecipients]);

  const savedRecipientOptionMap = useMemo(() => {
    const map = new Map();
    savedRecipientOptions.forEach((option) => map.set(option.value, option));
    return map;
  }, [savedRecipientOptions]);

  const selectedRecipientMeta = savedRecipientOptionMap.get(selectedSavedRecipientOption) || null;
  const selectedSavedRecipient = selectedRecipientMeta?.recipient || null;

  const isNewRecipient = selectedSavedRecipientOption === 'new';

  useEffect(() => {
    if (
      selectedSavedRecipientOption !== 'new' &&
      !savedRecipientOptionMap.has(selectedSavedRecipientOption)
    ) {
      setSelectedSavedRecipientOption('new');
    }
  }, [selectedSavedRecipientOption, savedRecipientOptionMap]);

  const navigateToStep = useCallback(
    (step, { fromPop = false } = {}) => {
      const normalized = Math.max(1, Math.min(step, 4));
      const targetStep = normalized;
      const current = activeStepRef.current;
      if (current === targetStep) return;

      setActiveStep(targetStep);
      if (!fromPop && preCheckoutReady) {
        window.history.pushState({ checkoutStep: targetStep }, '', window.location.pathname);
      }
    },
    [preCheckoutReady],
  );

  useEffect(() => {
    if (!preCheckoutReady) return;
    window.history.replaceState({ checkoutStep: activeStepRef.current }, '', window.location.pathname);
  }, [preCheckoutReady]);

  useEffect(() => {
    if (!preCheckoutReady) return undefined;

    const handlePopState = (event) => {
      const step = Number(event.state?.checkoutStep);
      if (Number.isFinite(step) && step >= 1 && step <= 4) {
        navigateToStep(step, { fromPop: true });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [preCheckoutReady, navigateToStep]);

  const markStepCompleted = (step) => {
    setCompletedSteps((prev) => (prev.includes(step) ? prev : [...prev, step]));
  };

  const handleCouponSubmit = async (event) => {
    event.preventDefault();

    try {
      setApplyingCoupon(true);
      const result = await applyCouponCode(couponInput);
      setCouponMessage(result.discount?.name ? `${result.discount.name} applied` : 'Coupon applied');
      setCouponError('');
    } catch (error) {
      setCouponMessage('');
      setCouponError(error.message || 'Failed to apply coupon');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    clearCoupon();
    setCouponInput('');
    setCouponMessage('');
    setCouponError('');
  };

  const handleRecipientChange = (event) => {
    const { name, value, type, checked } = event.target;
    setRecipient((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (!isNewRecipient) {
      setRecipientWasAutofilled(true);
    }
  };

  const handleCustomerChange = (event) => {
    const { name, value, type, checked } = event.target;
    setCustomer((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBillingAddressSelect = (parsedAddress) => {
    if (!parsedAddress) return;
    setCustomer((prev) => ({
      ...prev,
      billingAddress1: parsedAddress.address1 || prev.billingAddress1,
      billingAddress2: parsedAddress.address2 || prev.billingAddress2,
      billingCity: parsedAddress.city || prev.billingCity,
      billingProvince: parsedAddress.province || prev.billingProvince,
      billingPostalCode: parsedAddress.postalCode || prev.billingPostalCode,
    }));
  };

  const handleBirthdayToggle = (checked) => {
    setBirthday((prev) => ({
      ...prev,
      optIn: checked,
      ...(checked ? {} : { month: '', day: '', year: '' }),
    }));
  };

  const handleBirthdayChange = (field, value) => {
    setBirthday((prev) => ({ ...prev, [field]: value }));
  };

  const handlePaymentChange = (event) => {
    const { name, value, type, checked } = event.target;
    setPayment((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleCardChange = (event) => {
    if (event?.error?.message) {
      setCardError(event.error.message);
      return;
    }
    if (cardError) {
      setCardError('');
    }
  };

  const handleOccasionChange = (event) => {
    setRecipient((prev) => ({ ...prev, occasion: event.target.value }));
  };

  const handleCardMessageChange = (valueOrEvent) => {
    const nextMessage = typeof valueOrEvent === 'string' ? valueOrEvent : valueOrEvent.target.value;
    setRecipient((prev) => ({ ...prev, cardMessage: nextMessage }));
    if (typeof valueOrEvent === 'string') {
      setShowSuggestions(false);
    }
  };

  const applySavedRecipientFields = useCallback((optionMeta) => {
    if (!optionMeta?.recipient) return;

    const { recipient: savedRecipientRecord, address } = optionMeta;
    setRecipient((prev) => ({
      ...prev,
      firstName: savedRecipientRecord.firstName || '',
      lastName: savedRecipientRecord.lastName || '',
      phone: savedRecipientRecord.phone || '',
      email: savedRecipientRecord.email || '',
      address1: address?.address1 || '',
      address2: address?.address2 || '',
      city: address?.city || '',
      province: address?.province || prev.province || 'BC',
      postalCode: address?.postalCode || '',
    }));
    setRecipientWasAutofilled(false);
  }, []);

  const handleSelectSavedRecipient = (value) => {
    setSelectedSavedRecipientOption(value);
    setRecipientWasAutofilled(false);

    if (value === 'new') {
      setRecipient((prev) => ({
        ...initialRecipient,
        cardMessage: prev.cardMessage,
        occasion: prev.occasion,
        deliveryInstructions: prev.deliveryInstructions,
      }));
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

  const handleToggleForMe = (checked) => {
    if (checked) {
      setSavedRecipientDraft(recipient);
      setIsForMe(true);
      setShowMessageStepForForMe(false);
      if (selectedSavedRecipientOption !== 'new') {
        setSelectedSavedRecipientOption('new');
      }
      return;
    }

    setIsForMe(false);
    setRecipient((prev) => ({
      ...savedRecipientDraft,
      cardMessage: prev.cardMessage,
      occasion: prev.occasion,
      deliveryInstructions: prev.deliveryInstructions,
    }));
  };

  const validateRecipientStep = () => {
    const errors = {};

    if (!isForMe) {
      if (!effectiveRecipient.firstName?.trim()) errors.firstName = 'First name is required';
      if (!effectiveRecipient.lastName?.trim()) errors.lastName = 'Last name is required';
      if (!effectiveRecipient.phone?.trim()) errors.phone = 'Phone number is required';
    }

    if (orderType === 'DELIVERY') {
      if (!effectiveRecipient.address1?.trim()) errors.address1 = 'Address is required';
      if (!effectiveRecipient.city?.trim()) errors.city = 'City is required';
      if (!effectiveRecipient.postalCode?.trim()) errors.postalCode = 'Postal code is required';
    }

    if (!deliveryDate) errors.deliveryDate = 'Select a delivery date';

    if (recipient.isSurprise) {
      if (!recipient.deliveryDoor?.trim()) errors.deliveryDoor = 'Please select which door to use';
      if (!recipient.deliveryInstructions?.trim()) errors.deliveryInstructions = 'Delivery instructions are required for surprise deliveries';
    }

    return errors;
  };

  const validateCustomerStep = () => {
    const errors = {};

    if (!customer.firstName?.trim()) errors.firstName = 'First name is required';
    if (!customer.lastName?.trim()) errors.lastName = 'Last name is required';
    if (!customer.email?.trim()) errors.email = 'Email is required';
    if (!customer.phone?.trim()) errors.phone = 'Phone number is required';

    if (!customer.billingAddress1?.trim()) errors.billingAddress1 = 'Billing address is required';
    if (!customer.billingCity?.trim()) errors.billingCity = 'Billing city is required';
    if (!customer.billingPostalCode?.trim()) errors.billingPostalCode = 'Billing postal code is required';

    if (birthday.optIn) {
      if (!birthday.month) errors.birthdayMonth = 'Select month';
      if (!birthday.day) errors.birthdayDay = 'Select day';
    }

    if (customer.saveCustomer && !authCustomer?.id) {
      if (!customer.password || customer.password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
    }

    return errors;
  };

  const validatePaymentStep = () => {
    const errors = {};
    if (!payment.agreeToTerms) errors.agreeToTerms = 'Please agree to the terms';
    if (!cart.length) errors.cart = 'Your cart is empty';
    return errors;
  };

  const goToFirstErrorStep = (recipientErrors, customerErrors, paymentErrors) => {
    if (Object.keys(recipientErrors).length) {
      navigateToStep(1);
      return;
    }

    if (Object.keys(customerErrors).length) {
      navigateToStep(3);
      return;
    }

    if (Object.keys(paymentErrors).length) {
      navigateToStep(4);
    }
  };

  const handleContinueFromDelivery = () => {
    const errors = validateRecipientStep();
    setFormErrors((prev) => ({ ...prev, recipient: errors }));

    if (Object.keys(errors).length) {
      setSubmitError('Please complete required delivery fields.');
      return;
    }

    markStepCompleted(1);
    setSubmitError(null);

    navigateToStep(2);
  };

  const handleContinueFromMessage = () => {
    markStepCompleted(2);
    navigateToStep(3);
  };

  const handleContinueFromCustomer = () => {
    const errors = validateCustomerStep();
    setFormErrors((prev) => ({ ...prev, customer: errors }));

    if (Object.keys(errors).length) {
      setSubmitError('Please complete required customer fields.');
      return;
    }

    if (isForMe) {
      setRecipient((prev) => ({
        ...prev,
        firstName: customer.firstName || prev.firstName,
        lastName: customer.lastName || prev.lastName,
        phone: customer.phone || prev.phone,
        email: customer.email || prev.email,
      }));
    }

    markStepCompleted(3);
    setSubmitError(null);
    navigateToStep(4);
  };

  const maybeCreateReminder = async (occasionValue, dateValue, recipientName) => {
    if (!isAuthenticated || !dateValue) {
      return;
    }

    try {
      await createReminder({
        occasion: occasionValue || 'OTHER',
        deliveryDate: dateValue,
        recipientName,
      });
    } catch (error) {
      console.error('Failed to save reminder:', error);
    }
  };

  const handlePlaceOrder = async () => {
    const recipientErrors = validateRecipientStep();
    const customerErrors = validateCustomerStep();
    const paymentErrors = validatePaymentStep();

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
      setSubmitError('Please complete all required fields before placing your order.');
      goToFirstErrorStep(recipientErrors, customerErrors, paymentErrors);
      return;
    }

    if (!stripe || !elements) {
      navigateToStep(4);
      setSubmitError('Payment system is still loading. Please try again.');
      return;
    }

    const usingSavedCard = selectedPaymentMethod !== 'new';
    const paymentElement = usingSavedCard ? null : elements.getElement(PaymentElement);
    if (!usingSavedCard && !paymentElement) {
      navigateToStep(4);
      setSubmitError('Add your card details to continue.');
      return;
    }

    setSubmitError(null);
    setCardError('');
    setIsSubmitting(true);

    try {
      if (!usingSavedCard) {
        const { error: submitPaymentElementError } = await elements.submit();
        if (submitPaymentElementError) {
          setCardError(submitPaymentElementError.message || 'Add your card details to continue.');
          throw new Error(submitPaymentElementError.message || 'Payment details are incomplete.');
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

      let buyerId;
      if (authCustomer?.id) {
        buyerId = authCustomer.id;
      } else {
        const buyer = await createCustomer(buyerPayload);
        buyerId = buyer.id;

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
            console.warn('Account registration failed (non-blocking):', regError);
          }
        }
      }

      let recipientCustomerId;
      let deliveryAddressId = null;

      if (customer.billingAddress1?.trim()) {
        try {
          await createCustomerAddress(buyerId, {
            label: 'Billing',
            firstName: customer.firstName.trim(),
            lastName: customer.lastName.trim(),
            phone: customer.phone.trim(),
            address1: customer.billingAddress1.trim(),
            address2: customer.billingAddress2?.trim() || null,
            city: customer.billingCity?.trim() || 'Vancouver',
            province: customer.billingProvince || 'BC',
            postalCode: customer.billingPostalCode?.trim() || '',
            country: 'CA',
          });
        } catch (billingAddressError) {
          console.warn('Failed to save billing address (non-blocking):', billingAddressError);
        }
      }

      if (isForMe) {
        recipientCustomerId = buyerId;

        if (orderType === 'DELIVERY') {
          const deliveryAddress = await createCustomerAddress(recipientCustomerId, {
            label: 'Delivery',
            firstName: effectiveRecipient.firstName?.trim() || customer.firstName.trim(),
            lastName: effectiveRecipient.lastName?.trim() || customer.lastName.trim(),
            phone: (effectiveRecipient.phone || customer.phone || '').trim(),
            address1: effectiveRecipient.address1.trim(),
            address2: effectiveRecipient.address2?.trim() || null,
            city: effectiveRecipient.city.trim(),
            province: effectiveRecipient.province || 'BC',
            postalCode: effectiveRecipient.postalCode.trim(),
            country: 'CA',
          });
          deliveryAddressId = deliveryAddress.id;
        }
      } else if (!isNewRecipient && selectedSavedRecipient) {
        recipientCustomerId = selectedSavedRecipient.id;

        if (orderType === 'DELIVERY') {
          if (selectedRecipientMeta?.address?.id && !recipientWasAutofilled) {
            deliveryAddressId = selectedRecipientMeta.address.id;
          } else {
            const deliveryAddress = await createCustomerAddress(recipientCustomerId, {
              label: 'Delivery',
              firstName: effectiveRecipient.firstName.trim(),
              lastName: effectiveRecipient.lastName.trim(),
              phone: effectiveRecipient.phone.trim(),
              address1: effectiveRecipient.address1.trim(),
              address2: effectiveRecipient.address2?.trim() || null,
              city: effectiveRecipient.city.trim(),
              province: effectiveRecipient.province,
              postalCode: effectiveRecipient.postalCode.trim(),
              country: 'CA',
            });
            deliveryAddressId = deliveryAddress.id;
          }
        }
      } else {
        const recipientCustomer = await createCustomer(
          sanitizeCustomerPayload(
            {
              firstName: effectiveRecipient.firstName,
              lastName: effectiveRecipient.lastName,
              email: effectiveRecipient.email,
              phone: effectiveRecipient.phone,
              notes: 'Website recipient',
            },
            {},
          ),
        );

        recipientCustomerId = recipientCustomer.id;

        if (orderType === 'DELIVERY') {
          const deliveryAddress = await createCustomerAddress(recipientCustomerId, {
            label: 'Delivery',
            firstName: effectiveRecipient.firstName.trim(),
            lastName: effectiveRecipient.lastName.trim(),
            phone: effectiveRecipient.phone.trim(),
            address1: effectiveRecipient.address1.trim(),
            address2: effectiveRecipient.address2?.trim() || null,
            city: effectiveRecipient.city.trim(),
            province: effectiveRecipient.province,
            postalCode: effectiveRecipient.postalCode.trim(),
            country: 'CA',
          });
          deliveryAddressId = deliveryAddress.id;
        }

        await linkRecipientToCustomer(buyerId, recipientCustomerId);

        if (authCustomer?.id) {
          try {
            await fetchSavedRecipients();
          } catch (refreshError) {
            console.error('Failed to refresh saved recipients:', refreshError);
          }
        }
      }

      const amountInCents = Math.round(estimatedTotal * 100);
      if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
        throw new Error('Invalid order total. Please refresh and try again.');
      }

      const idempotencyKey = checkoutIdempotencyKeyRef.current || generateIdempotencyKey();
      checkoutIdempotencyKeyRef.current = idempotencyKey;

      const shouldSaveCard = selectedPaymentMethod === 'new' && payment.saveCard;
      const paymentIntent = await createCheckoutPaymentIntent({
        amountInCents,
        customer: buyerPayload,
        bloomCustomerId: buyerId,
        idempotencyKey,
        saveCard: shouldSaveCard,
      });

      const customProducts = cart.map((item) => ({
        description: item.name,
        price: Number(item.price).toFixed(2),
        qty: item.quantity,
        tax: item.isTaxable !== false,
      }));

      const occasionValue = recipient.occasion || null;

      sessionStorage.setItem(
        'pendingCheckout',
        JSON.stringify({
          buyerId,
          buyer: { id: buyerId, ...customer },
          recipientCustomerId,
          deliveryAddressId,
          orderType,
          recipient: {
            firstName: effectiveRecipient.firstName,
            lastName: effectiveRecipient.lastName,
            address1: effectiveRecipient.address1,
            city: effectiveRecipient.city,
            province: effectiveRecipient.province,
            postalCode: effectiveRecipient.postalCode,
          },
          occasion: occasionValue,
          cardMessage: recipient.cardMessage || null,
          deliveryInstructions: recipient.deliveryInstructions || null,
          deliveryDate,
          deliveryFee,
          discountAmount,
          appliedDiscounts,
          customProducts,
          rememberDate,
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
        }),
      );

      const returnUrl = `${window.location.origin}/checkout?payment_status=pending`;
      const confirmation = usingSavedCard
        ? await stripe.confirmPayment({
            clientSecret: paymentIntent.clientSecret,
            confirmParams: {
              payment_method: selectedPaymentMethod,
              return_url: returnUrl,
            },
            redirect: 'if_required',
          })
        : await stripe.confirmPayment({
            elements,
            clientSecret: paymentIntent.clientSecret,
            confirmParams: {
              return_url: returnUrl,
            },
            redirect: 'if_required',
          });

      sessionStorage.removeItem('pendingCheckout');

      if (confirmation.error) {
        setCardError(confirmation.error.message || 'Payment was not completed.');
        throw new Error(confirmation.error.message || 'Payment was not completed.');
      }

      if (!confirmation.paymentIntent || confirmation.paymentIntent.status !== 'succeeded') {
        throw new Error('Payment was not completed.');
      }

      // Build delivery instructions with surprise info if applicable
      let fullDeliveryInstructions = recipient.deliveryInstructions || '';
      if (recipient.isSurprise) {
        const surprisePrefix = `SURPRISE DELIVERY - Do NOT call recipient. Door: ${recipient.deliveryDoor || 'Not specified'}.`;
        fullDeliveryInstructions = fullDeliveryInstructions
          ? `${surprisePrefix}\n${fullDeliveryInstructions}`
          : surprisePrefix;
      }

      const draftOrder = await createOrderDraft(buyerId, {
        orderType,
        orderSource: 'WEBSITE',
        recipientCustomerId,
        deliveryAddressId,
        occasion: occasionValue,
        cardMessage: recipient.cardMessage || null,
        deliveryInstructions: fullDeliveryInstructions || null,
        deliveryDate,
        deliveryFee,
        discountAmount,
        appliedDiscounts,
        customProducts,
        notes: payment.notes || null,
        paymentIntentId: paymentIntent.paymentIntentId,
        paymentStatus: confirmation.paymentIntent?.status || null,
        ...birthdayPayload,
      });
      checkoutIdempotencyKeyRef.current = null;

      const recipientName = [effectiveRecipient.firstName, effectiveRecipient.lastName].filter(Boolean).join(' ').trim();
      if (rememberDate) {
        await maybeCreateReminder(occasionValue, deliveryDate, recipientName);
      }

      const result = {
        drafts: draftOrder.drafts,
        buyer: { id: buyerId, ...customer },
        recipient: {
          firstName: effectiveRecipient.firstName,
          lastName: effectiveRecipient.lastName,
          address1: effectiveRecipient.address1,
          city: effectiveRecipient.city,
          province: effectiveRecipient.province,
          postalCode: effectiveRecipient.postalCode,
        },
        deliveryDate,
        occasion: occasionValue,
        cardMessage: recipient.cardMessage || null,
        isPickup: orderType === 'PICKUP',
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
      };

      setOrderResult(result);
      if (typeof onOrderPlaced === 'function') {
        onOrderPlaced(result);
      }

      setLastOrderEmail(customer.email || '');
      clearCart();
      setRecipient(initialRecipient);
      setCustomer(initialCustomer);
      setPayment(initialPayment);
      setCardError('');
      setBirthday({ optIn: false, month: '', day: '', year: '' });
      setRememberDate(false);
      setShowMessageStepForForMe(false);
      clearCoupon();
      setSelectedSavedRecipientOption('new');
      setRecipientWasAutofilled(false);

      if (!isAuthenticated && !customer.saveCustomer) {
        setShowCreateAccountModal(true);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      setSubmitError(error.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');

    if (!paymentIntentId) return;

    setPreCheckoutReady(true);
    window.history.replaceState({}, '', window.location.pathname);

    if (redirectStatus !== 'succeeded') {
      const pending = sessionStorage.getItem('pendingCheckout');
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
        if (pendingData.orderType) {
          setOrderType(pendingData.orderType);
        }
      }

      setActiveStep(4);
      setCardError('Your payment was not completed. Please try again or use a different card.');
      sessionStorage.removeItem('pendingCheckout');
      return;
    }

    const pending = sessionStorage.getItem('pendingCheckout');
    if (!pending) return;

    const pendingData = JSON.parse(pending);

    setIsSubmitting(true);
    createOrderDraft(pendingData.buyerId, {
      orderType: pendingData.orderType || 'DELIVERY',
      orderSource: 'WEBSITE',
      customerId: pendingData.buyerId,
      recipientCustomerId: pendingData.recipientCustomerId,
      deliveryAddressId: pendingData.deliveryAddressId,
      occasion: pendingData.occasion || null,
      cardMessage: pendingData.cardMessage,
      deliveryInstructions: pendingData.deliveryInstructions,
      deliveryDate: pendingData.deliveryDate,
      deliveryFee: pendingData.deliveryFee,
      discountAmount: pendingData.discountAmount,
      appliedDiscounts: pendingData.appliedDiscounts,
      customProducts: pendingData.customProducts,
      paymentIntentId,
      paymentStatus: 'succeeded',
    })
      .then(async (draftOrder) => {
        sessionStorage.removeItem('pendingCheckout');
        checkoutIdempotencyKeyRef.current = null;

        if (pendingData.rememberDate && pendingData.deliveryDate && isAuthenticated) {
          try {
            const recipientName = [pendingData.recipient?.firstName, pendingData.recipient?.lastName]
              .filter(Boolean)
              .join(' ')
              .trim();
            await maybeCreateReminder(pendingData.occasion, pendingData.deliveryDate, recipientName);
          } catch (error) {
            console.error('Failed to save reminder after redirect:', error);
          }
        }

        setOrderResult({
          drafts: draftOrder.drafts,
          buyer: pendingData.buyer,
          recipient: pendingData.recipient,
          deliveryDate: pendingData.deliveryDate,
          occasion: pendingData.occasion,
          cardMessage: pendingData.cardMessage,
          isPickup: pendingData.orderType === 'PICKUP',
          cartItems: pendingData.cartItems,
          totals: pendingData.totals,
        });
        clearCart();
      })
      .catch((error) => {
        setSubmitError(error.message || 'Failed to complete your order after payment.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [clearCart, isAuthenticated, setDeliveryDate]);

  const occasionLabel = mapOccasionLabel(recipient.occasion);
  const displayOrderResult = orderResult || persistedOrderResult;

  if (displayOrderResult) {
    return (
      <>
        <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
          <div className="container mx-auto px-4">
            <SuccessCard orderResult={displayOrderResult} />
          </div>
        </section>
        <CreateAccountModal
          isOpen={showCreateAccountModal}
          email={lastOrderEmail || customer.email || authCustomer?.email || ''}
          firstName={displayOrderResult?.buyer?.firstName}
          lastName={displayOrderResult?.buyer?.lastName}
          onClose={() => setShowCreateAccountModal(false)}
          onRegistered={refreshProfile}
        />
      </>
    );
  }

  if (!cart.length) {
    return (
      <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
        <div className="container mx-auto px-4">
          <EmptyCheckoutState />
        </div>
      </section>
    );
  }

  if (!preCheckoutReady) {
    return <PreCheckoutGate onContinueGuest={() => setPreCheckoutReady(true)} />;
  }

  const handleStepClick = (step) => {
    if (step === activeStep) return;
    if (!completedSteps.includes(step)) return;
    navigateToStep(step);
  };

  return (
    <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
      <div className="container mx-auto max-w-5xl px-4">
        <ProgressBar
          steps={stepItems}
          currentStep={activeStep}
          completedSteps={completedSteps}
          skippedSteps={skippedSteps}
          onStepClick={handleStepClick}
        />

        <div className="rounded-2xl border border-stroke bg-white p-4 sm:p-6 dark:border-dark-3 dark:bg-dark-2">
          {activeStep === 1 && (
            <DeliveryStep
              recipient={effectiveRecipient}
              errors={formErrors.recipient}
              onRecipientChange={handleRecipientChange}
              deliveryDate={deliveryDate}
              onDateChange={setDeliveryDate}
              instructionPresets={instructionPresets}
              onPresetSelect={(preset) =>
                setRecipient((prev) => ({
                  ...prev,
                  deliveryInstructions: prev.deliveryInstructions
                    ? `${prev.deliveryInstructions}\n${preset}`
                    : preset,
                }))
              }
              isAuthenticated={isAuthenticated}
              savedRecipientOptions={savedRecipientOptions}
              savedRecipientsLoading={savedRecipientsLoading}
              savedRecipientsError={savedRecipientsError}
              selectedSavedRecipientOption={selectedSavedRecipientOption}
              onSavedRecipientChange={handleSelectSavedRecipient}
              isNewRecipient={isNewRecipient}
              onAddressSelect={handleAddressAutocompleteSelect}
              recipientModifiedAfterAutofill={recipientWasAutofilled}
              isForMe={isForMe}
              onToggleForMe={handleToggleForMe}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
              customerPreview={customer}
              onContinue={handleContinueFromDelivery}
            />
          )}

          {activeStep === 2 && (
            <CardMessageStep
              occasion={recipient.occasion || ''}
              cardMessage={recipient.cardMessage || ''}
              onOccasionChange={handleOccasionChange}
              onCardMessageChange={handleCardMessageChange}
              suggestions={messageSuggestions}
              showSuggestions={showSuggestions}
              onToggleSuggestions={() => setShowSuggestions((prev) => !prev)}
              isAuthenticated={isAuthenticated}
              rememberDate={rememberDate}
              onRememberDateChange={setRememberDate}
              onBack={() => navigateToStep(1)}
              onContinue={handleContinueFromMessage}
            />
          )}

          {activeStep === 3 && (
            <YourInfoStep
              customer={customer}
              errors={formErrors.customer}
              onCustomerChange={handleCustomerChange}
              onBillingAddressSelect={handleBillingAddressSelect}
              birthday={birthday}
              onBirthdayToggle={handleBirthdayToggle}
              onBirthdayChange={handleBirthdayChange}
              isAuthenticated={isAuthenticated}
              showOptionalMessageLink={false}
              onOpenCardMessageStep={() => {}}
              onOpenLoginModal={() => setShowLoginModal(true)}
              onBack={() => navigateToStep(1)}
              onContinue={handleContinueFromCustomer}
            />
          )}

          {activeStep === 4 && (
            <ReviewPayStep
              orderType={orderType}
              recipient={effectiveRecipient}
              customer={customer}
              deliveryDate={deliveryDate}
              occasionLabel={occasionLabel}
              cardMessage={recipient.cardMessage || ''}
              cart={cart}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onEditStep={(step) => {
                navigateToStep(step);
              }}
              subtotal={subtotal}
              deliveryFee={deliveryFee}
              tax={estimatedTax}
              total={estimatedTotal}
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
              payment={payment}
              errors={formErrors.payment}
              onPaymentChange={handlePaymentChange}
              cardError={cardError}
              onCardChange={handleCardChange}
              savedCards={savedCards}
              savedCardsLoading={savedCardsLoading}
              selectedPaymentMethod={selectedPaymentMethod}
              onSelectPaymentMethod={setSelectedPaymentMethod}
              submitError={submitError}
              isSubmitting={isSubmitting}
              onOpenTermsModal={() => setShowTermsModal(true)}
              onBack={() => navigateToStep(3)}
              onPlaceOrder={handlePlaceOrder}
            />
          )}
        </div>
      </div>
      <CheckoutLoginModal
        isOpen={showLoginModal}
        initialEmail={customer.email || ''}
        onClose={() => setShowLoginModal(false)}
      />
      <CheckoutTermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </section>
  );
};

WizardCheckout.propTypes = {
  onOrderPlaced: PropTypes.func,
  persistedOrderResult: PropTypes.object,
};

export default WizardCheckout;
