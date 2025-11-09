import { useEffect, useMemo, useState } from "react";
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

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const MIN_AMOUNT = 25;
const MAX_AMOUNT = 300;
const MESSAGE_MAX_LENGTH = 250;

const GiftCardContent = () => {
  const { customer } = useAuth();
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
      });

      const confirmation = await stripe.confirmCardPayment(paymentIntent.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: trimmedPurchaser.name,
            email: trimmedPurchaser.email,
          },
        },
      });

      if (confirmation.error) {
        throw new Error(confirmation.error.message || "Payment was not completed.");
      }

      await purchaseDigitalGiftCard({
        amount,
        recipient: trimmedRecipient,
        purchaser: trimmedPurchaser,
        message: trimmedRecipient.message,
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
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition ${
                      currentStep === step
                        ? "bg-emerald-500 text-white"
                        : currentStep > step
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step}
                  </div>
                  {step < 3 && (
                    <div
                      className={`h-0.5 w-12 transition sm:w-24 ${
                        currentStep > step ? "bg-emerald-500" : "bg-slate-200"
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
                  className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-600"
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
                  className="rounded-xl bg-emerald-500 px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-600"
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
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 text-white shadow-xl">
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10"></div>
                  <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10"></div>

                  <div className="relative z-10">
                    <div className="mb-6">
                      <p className="text-sm font-medium uppercase tracking-wider text-emerald-100">
                        Bloom Flower Shop
                      </p>
                      <p className="mt-1 text-xs text-emerald-100">Gift Card</p>
                    </div>

                    <div className="mb-8">
                      <p className="text-5xl font-bold tracking-tight">{formattedAmount}</p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">
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
                        <p className="text-xs font-medium uppercase tracking-wider text-emerald-100">
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
  const formattedTotal = new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(details.amount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="mt-4 text-2xl font-semibold text-slate-900">Gift card sent!</h3>
        <p className="mt-3 text-sm text-slate-600">
          We emailed {details.recipient.name || details.recipient.email} their {formattedTotal} gift card.
          A receipt has been sent to {details.purchaser.email}.
        </p>
        <div className="mt-4 rounded-lg bg-slate-50 p-4 text-left text-sm text-slate-600">
          <p className="font-medium text-slate-900">Reference</p>
          <p>Payment Intent: {details.paymentIntentId}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600"
        >
          Close
        </button>
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
  if (!stripePromise) {
    return (
      <>
        <Breadcrumb pageName="Digital Gift Cards" />
        <section className="bg-slate-50 py-16">
          <div className="container mx-auto max-w-2xl text-center text-red-600">
            Stripe publishable key is not configured. Add VITE_STRIPE_PUBLISHABLE_KEY to your environment.
          </div>
        </section>
      </>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ appearance: { theme: "stripe" } }}>
      <GiftCardContent />
    </Elements>
  );
};

export default GiftCard;
