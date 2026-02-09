import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { Elements, CardElement } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import Breadcrumb from "../components/Breadcrumb.jsx";
import AmountSelector from "../components/GiftCard/AmountSelector.jsx";
import RecipientForm from "../components/GiftCard/RecipientForm.jsx";
import PaymentSection from "../components/GiftCard/PaymentSection.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";
import {
  createDigitalGiftCardPaymentIntent,
  purchaseDigitalGiftCard,
} from "../services/giftCardService.js";
import { getStoreInfo } from "../services/storeInfoService.js";

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const API_BASE = rawApiUrl
  ? (rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`)
  : '/api';

const stripePromise = fetch(`${API_BASE}/stripe/public-key`)
  .then((res) => (res.ok ? res.json() : null))
  .then((data) => (data?.publicKey ? loadStripe(data.publicKey) : null))
  .catch(() => null);

const MIN_AMOUNT = 25;
const MAX_AMOUNT = 300;
const MESSAGE_MAX_LENGTH = 250;

const GiftCardContent = () => {
  const { customer } = useAuth();
  const [storeInfo, setStoreInfo] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedAmount, setSelectedAmount] = useState(100);
  const [customAmount, setCustomAmount] = useState("");
  const [recipient, setRecipient] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [purchaser, setPurchaser] = useState({
    name: "",
    email: "",
  });
  const [errors, setErrors] = useState({
    amount: "",
    recipient: {},
    purchaser: {},
  });
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successDetails, setSuccessDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getStoreInfo()
      .then((data) => {
        if (isMounted) {
          setStoreInfo(data);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle return from 3D Secure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const redirectStatus = params.get("redirect_status");

    if (!paymentIntentId || redirectStatus !== "succeeded") return;

    // Get pending order from sessionStorage
    const pending = sessionStorage.getItem("pendingGiftCard");
    if (!pending) return;

    const { amount: pendingAmount, recipient: pendingRecipient, purchaser: pendingPurchaser, bloomCustomerId } = JSON.parse(pending);

    // Clear URL params
    window.history.replaceState({}, "", window.location.pathname);

    // Complete the purchase
    setIsSubmitting(true);
    purchaseDigitalGiftCard({
      amount: pendingAmount,
      recipient: pendingRecipient,
      purchaser: pendingPurchaser,
      message: pendingRecipient.message,
      bloomCustomerId,
      paymentIntentId,
    })
      .then(() => {
        sessionStorage.removeItem("pendingGiftCard");
        setSuccessDetails({
          amount: pendingAmount,
          recipient: pendingRecipient,
          purchaser: pendingPurchaser,
          paymentIntentId,
        });
      })
      .catch((err) => {
        setSubmitError(err.message || "Failed to complete your gift card purchase.");
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, []);

  useEffect(() => {
    if (!customer) return;
    setPurchaser((prev) => {
      const next = { ...prev };
      if (!next.name) {
        next.name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
      }
      if (!next.email) {
        next.email = customer.email || "";
      }
      return next;
    });
  }, [customer]);

  const storeName = (storeInfo?.storeName || "").trim() || "Flower Shop";

  const amount = useMemo(() => {
    if (customAmount !== "") {
      const parsed = Number(customAmount);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return selectedAmount;
  }, [customAmount, selectedAmount]);

  const formattedAmount = useMemo(() => {
    if (!amount || Number.isNaN(amount)) return "$0.00";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  }, [amount]);

  const resetErrors = () =>
    setErrors({
      amount: "",
      recipient: {},
      purchaser: {},
    });

  const validateEmail = (value) => /\S+@\S+\.\S+/.test(value);

  const validateStep1 = () => {
    const nextErrors = { amount: "", recipient: {}, purchaser: {} };
    let hasError = false;

    if (!amount || Number.isNaN(amount)) {
      nextErrors.amount = "Enter an amount between $25 and $300.";
      hasError = true;
    } else if (amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      nextErrors.amount = `Amount must be between $${MIN_AMOUNT} and $${MAX_AMOUNT}.`;
      hasError = true;
    }

    setErrors(nextErrors);
    return !hasError;
  };

  const validateStep2 = () => {
    const nextErrors = { amount: "", recipient: {}, purchaser: {} };
    let hasError = false;

    if (!recipient.name.trim()) {
      nextErrors.recipient.name = "Recipient name is required.";
      hasError = true;
    }

    if (!recipient.email.trim()) {
      nextErrors.recipient.email = "Recipient email is required.";
      hasError = true;
    } else if (!validateEmail(recipient.email.trim())) {
      nextErrors.recipient.email = "Enter a valid email address.";
      hasError = true;
    }

    if (recipient.message.length > MESSAGE_MAX_LENGTH) {
      nextErrors.recipient.message = `Message cannot exceed ${MESSAGE_MAX_LENGTH} characters.`;
      hasError = true;
    }

    if (!purchaser.name.trim()) {
      nextErrors.purchaser.name = "Your name is required.";
      hasError = true;
    }

    if (!purchaser.email.trim()) {
      nextErrors.purchaser.email = "Your email is required.";
      hasError = true;
    } else if (!validateEmail(purchaser.email.trim())) {
      nextErrors.purchaser.email = "Enter a valid email address.";
      hasError = true;
    }

    setErrors(nextErrors);
    return !hasError;
  };

  const handleContinueStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleContinueStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRecipientChange = (field, value) => {
    if (field === "message") {
      setRecipient((prev) => ({
        ...prev,
        message: value.slice(0, MESSAGE_MAX_LENGTH),
      }));
      setErrors((prev) => ({
        ...prev,
        recipient: {
          ...prev.recipient,
          message: "",
        },
      }));
      return;
    }

    setRecipient((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      recipient: {
        ...prev.recipient,
        [field]: "",
      },
    }));
  };

  const handlePurchaserChange = (field, value) => {
    setPurchaser((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      purchaser: {
        ...prev.purchaser,
        [field]: "",
      },
    }));
  };

  const handleAmountSelect = (value) => {
    setSelectedAmount(value);
    setCustomAmount("");
    setErrors((prev) => ({
      ...prev,
      amount: "",
    }));
  };

  const handleCustomAmountChange = (value) => {
    setCustomAmount(value);
    setErrors((prev) => ({
      ...prev,
      amount: "",
    }));
  };

  const handleSubmit = async ({ stripe, elements }) => {
    resetErrors();
    setSubmitError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setSubmitError("Add your card details to continue.");
      return;
    }

    const trimmedRecipient = {
      name: recipient.name.trim(),
      email: recipient.email.trim(),
      message: recipient.message.trim(),
    };
    const trimmedPurchaser = {
      name: purchaser.name.trim(),
      email: purchaser.email.trim(),
    };

    try {
      setIsSubmitting(true);

      const paymentIntent = await createDigitalGiftCardPaymentIntent({
        amount,
        purchaser: trimmedPurchaser,
        recipient: trimmedRecipient,
        bloomCustomerId: customer?.id || null,
        storeName,
      });

      // Save pending order in case of 3D Secure redirect
      sessionStorage.setItem("pendingGiftCard", JSON.stringify({
        amount,
        recipient: trimmedRecipient,
        purchaser: trimmedPurchaser,
        bloomCustomerId: customer?.id || null,
        paymentIntentId: paymentIntent.paymentIntentId,
      }));

      const confirmation = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: trimmedPurchaser.name,
            email: trimmedPurchaser.email,
          },
        },
        return_url: window.location.href,
      });

      // Clear pending order on success (no redirect happened)
      sessionStorage.removeItem("pendingGiftCard");

      if (confirmation.error) {
        throw new Error(confirmation.error.message || "Payment was not completed.");
      }

      await purchaseDigitalGiftCard({
        amount,
        recipient: trimmedRecipient,
        purchaser: trimmedPurchaser,
        message: trimmedRecipient.message,
        bloomCustomerId: customer?.id || null,
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      cardElement.clear();
      setSuccessDetails({
        amount,
        recipient: trimmedRecipient,
        purchaser: trimmedPurchaser,
        paymentIntentId: paymentIntent.paymentIntentId,
      });

      // Reset form to step 1
      setRecipient({
        name: "",
        email: "",
        message: "",
      });
      setCustomAmount("");
      setSelectedAmount(100);
      setCurrentStep(1);
    } catch (error) {
      setSubmitError(error.message || "Something went wrong while processing your payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Digital Gift Cards" />
      <section className="bg-white py-16">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Send a gift in minutes</h1>
            <p className="mt-3 text-base text-slate-600">
              Choose an amount, add a heartfelt note, and we&apos;ll email a beautifully designed digital gift card
              instantly.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Already have a gift card?{" "}
              <Link to="/gift-cards/balance" className="font-semibold text-primary hover:text-primary-dark">
                Check your balance
              </Link>
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                      currentStep === step
                        ? "bg-primary text-white"
                        : currentStep > step
                        ? "bg-primary/15 text-primary-dark"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`h-0.5 w-12 transition sm:w-24 ${
                        currentStep > step ? "bg-primary" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 text-center text-sm font-medium text-slate-700">
              {currentStep === 1 && "Choose Amount"}
              {currentStep === 2 && "Gift Details"}
              {currentStep === 3 && "Payment"}
            </div>
          </div>

          {/* Step 1: Amount Selection */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <AmountSelector
                selectedAmount={selectedAmount}
                onSelect={handleAmountSelect}
                customAmount={customAmount}
                onCustomAmountChange={handleCustomAmountChange}
                min={MIN_AMOUNT}
                max={MAX_AMOUNT}
                error={errors.amount}
                disabled={isSubmitting}
              />

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueStep1}
                  className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Recipient & Purchaser Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <RecipientForm
                recipient={recipient}
                purchaser={purchaser}
                onRecipientChange={handleRecipientChange}
                onPurchaserChange={handlePurchaserChange}
                errors={errors}
                disabled={isSubmitting}
              />

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleContinueStep2}
                  className="rounded-xl bg-primary px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Payment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Gift Card Preview */}
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-slate-900">Gift card preview</h3>

                {/* Decorative Gift Card */}
                <div className="relative overflow-hidden rounded-2xl bg-[#0f0a2e] p-8 text-white shadow-xl">
                  {/* Blurred color blobs */}
                  <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#e8643c] opacity-80 blur-[80px]"></div>
                  <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-[#f4456e] opacity-75 blur-[70px]"></div>
                  <div className="absolute -bottom-16 -left-10 h-80 w-80 rounded-full bg-[#0c1445] opacity-90 blur-[60px]"></div>
                  <div className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-[#8b6cc1] opacity-50 blur-[70px]"></div>
                  <div className="absolute left-1/3 top-1/4 h-56 w-56 rounded-full bg-[#f09060] opacity-60 blur-[80px]"></div>

                  <div className="relative z-10">
                    <div className="mb-6">
                      <p className="text-sm font-medium uppercase tracking-wider text-white/70">
                        {storeName}
                      </p>
                      <p className="mt-1 text-xs text-white/70">Gift Card</p>
                    </div>

                    <div className="mb-8">
                      <p className="text-5xl font-bold tracking-tight">{formattedAmount}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                          To
                        </p>
                        <p className="mt-1 text-xl font-semibold">{recipient.name}</p>
                      </div>

                      {recipient.message && (
                        <div className="rounded-lg bg-white/20 p-3 backdrop-blur-sm">
                          <p className="text-sm italic">&ldquo;{recipient.message}&rdquo;</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-white/70">
                          From
                        </p>
                        <p className="mt-1 text-lg font-medium">{purchaser.name}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Order details</h3>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Delivery method</span>
                    <span className="font-medium text-slate-900">Instant email</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Recipient email</span>
                    <span className="font-medium text-slate-900">{recipient.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Receipt email</span>
                    <span className="font-medium text-slate-900">{purchaser.email}</span>
                  </div>
                  <hr className="my-3 border-slate-200" />
                  <div className="flex justify-between text-base">
                    <span className="font-semibold text-slate-900">Total due</span>
                    <span className="font-semibold text-slate-900">{formattedAmount}</span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <PaymentSection
                amount={Number.isFinite(amount) ? amount : 0}
                disabled={isSubmitting}
                loading={isSubmitting}
                error={submitError}
                onSubmit={handleSubmit}
              />

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {successDetails ? (
        <SuccessModal
          details={successDetails}
          onClose={() => setSuccessDetails(null)}
        />
      ) : null}
    </>
  );
};

const SuccessModal = ({ details, onClose }) => {
  const formattedAmount = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(details.amount);

  const recipientName = details.recipient?.name || "Your recipient";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Top accent */}
        <div className="h-1 rounded-t-2xl bg-gradient-to-r from-rose-400 via-rose-500 to-rose-400" />

        <div className="p-8">
          {/* Success Icon */}
          <div className="mb-6 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-100">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>

          {/* Main Message */}
          <div className="mb-8 text-center">
            <h3 className="mb-2 font-serif text-2xl text-gray-900">Gift Card Sent!</h3>
            <p className="text-gray-600">
              <span className="font-serif text-rose-600">{recipientName}</span> will receive their gift shortly
            </p>
          </div>

          {/* Gift Card Details */}
          <div className="mb-6 rounded-xl bg-gray-50 p-5">
            {/* Amount */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
              <span className="text-gray-500">Gift Card Amount</span>
              <span className="text-2xl font-semibold text-gray-800">{formattedAmount}</span>
            </div>

            {/* Recipient */}
            <div className="mb-4 border-b border-gray-200 pb-4">
              <p className="mb-1 text-sm text-gray-500">Sent to</p>
              <p className="font-medium text-gray-800">{details.recipient?.name || "—"}</p>
              <p className="text-gray-600">{details.recipient?.email}</p>
            </div>

            {/* Message if provided */}
            {details.recipient?.message && (
              <div className="mb-4 border-b border-gray-200 pb-4">
                <p className="mb-1 text-sm text-gray-500">Your message</p>
                <p className="italic text-gray-700">"{details.recipient.message}"</p>
              </div>
            )}

            {/* Purchaser */}
            <div>
              <p className="mb-1 text-sm text-gray-500">Receipt sent to</p>
              <p className="text-gray-600">{details.purchaser?.email}</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-200"
            >
              Send Another
            </button>
            <a
              href="/"
              className="flex-1 rounded-lg bg-rose-500 px-6 py-3 text-center font-medium text-white transition hover:bg-rose-600"
            >
              Continue Shopping
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

SuccessModal.propTypes = {
  details: PropTypes.shape({
    amount: PropTypes.number.isRequired,
    recipient: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      message: PropTypes.string,
    }).isRequired,
    purchaser: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
    }).isRequired,
    paymentIntentId: PropTypes.string,
  }).isRequired,
  onClose: PropTypes.func.isRequired,
};

const GiftCard = () => {
  return (
    <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}>
      <GiftCardContent />
    </Elements>
  );
};

export default GiftCard;
