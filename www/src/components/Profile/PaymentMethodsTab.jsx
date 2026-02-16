import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { PaymentElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import api from "../../services/api.js";

const stripePromise = api
  .get("/stripe/public-key")
  .then((data) => (data?.publicKey ? loadStripe(data.publicKey) : null))
  .catch(() => null);

const STRIPE_APPEARANCE = {
  theme: "stripe",
  variables: {
    colorPrimary: "#3c50e0",
    borderRadius: "8px",
    colorText: "#111827",
    colorDanger: "#dc2626",
  },
};

const PAYMENT_ELEMENT_OPTIONS = {
  layout: "tabs",
};

const AddCardForm = ({ clientSecret, onCancel, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || submitting) return;

    if (!clientSecret) {
      setFormError("Unable to start card setup. Please try again.");
      return;
    }

    const paymentElement = elements.getElement(PaymentElement);
    if (!paymentElement) {
      setFormError("Payment form is not ready yet.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const result = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/profile`,
        },
        redirect: "if_required",
      });

      if (result.error) {
        setFormError(result.error.message || "Unable to save card.");
        return;
      }

      if (result.setupIntent?.status !== "succeeded") {
        setFormError("Card setup did not complete. Please try again.");
        return;
      }

      await onSuccess();
    } catch (error) {
      setFormError(error.message || "Unable to save card.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg border border-stroke bg-white px-4 py-3 dark:border-dark-3 dark:bg-dark-2">
        <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
      </div>
      {formError && <p className="text-red-500 text-sm">{formError}</p>}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-11 items-center justify-center rounded-lg border border-stroke px-6 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-primary hover:bg-primary-dark inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!stripe || !elements || submitting || !clientSecret}
        >
          {submitting ? "Saving..." : "Save card"}
        </button>
      </div>
    </form>
  );
};

const PaymentMethodsTab = ({ customer }) => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [removingId, setRemovingId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupClientSecret, setSetupClientSecret] = useState("");

  const loadPaymentMethods = async () => {
    if (!customer?.id) return;
    try {
      setLoading(true);
      setError("");
      const data = await api.post("/stripe/customer/payment-methods", {
        email: customer.email,
        phone: customer.phone,
        customerId: customer.id,
      });
      setPaymentMethods(data?.paymentMethods || []);
    } catch (error) {
      setError(error.message || "Unable to load payment methods.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  const handleRemove = async (paymentMethodId) => {
    const confirmed = window.confirm("Remove this card?");
    if (!confirmed) return;

    try {
      setRemovingId(paymentMethodId);
      setActionError("");
      await api.post("/stripe/customer/payment-methods/detach", {
        paymentMethodId,
        customerId: customer.id,
      });
      setPaymentMethods((prev) => prev.filter((method) => method.id !== paymentMethodId));
    } catch (error) {
      setActionError(error.message || "Failed to remove card.");
    } finally {
      setRemovingId("");
    }
  };

  const createSetupIntent = async () => {
    if (!customer?.id) return;
    try {
      setSetupLoading(true);
      setActionError("");
      const data = await api.post("/stripe/setup-intent", { customerId: customer.id });
      if (!data?.clientSecret) {
        throw new Error("Unable to start card setup.");
      }
      setSetupClientSecret(data.clientSecret);
    } catch (error) {
      setActionError(error.message || "Unable to start card setup.");
      setSetupClientSecret("");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleStartAdd = async () => {
    setShowAddForm(true);
    setActionError("");
    if (!setupClientSecret) {
      await createSetupIntent();
    }
  };

  const handleCancelAdd = () => {
    setShowAddForm(false);
    setSetupClientSecret("");
    setActionError("");
  };

  const handleAddSuccess = async () => {
    setShowAddForm(false);
    setSetupClientSecret("");
    setActionError("");
    await loadPaymentMethods();
  };

  const formatCardBrand = (brand) => {
    if (!brand) return "Card";
    return brand.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatExpiry = (expMonth, expYear) => {
    if (!expMonth || !expYear) return "Exp --/--";
    const month = String(expMonth).padStart(2, "0");
    const year = String(expYear).slice(-2);
    return `Exp ${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-dark text-xl font-semibold dark:text-white">Payment Methods</h2>
        <p className="text-body-color mt-2 text-sm leading-relaxed dark:text-dark-6">
          Your saved cards are securely stored with Stripe. You can add or remove cards anytime.
        </p>
      </div>

      <div className="space-y-4">
        {loading && (
          <div className="flex items-center gap-3 text-body-color dark:text-dark-6">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
            Loading saved cards...
          </div>
        )}

        {!loading && error && <p className="text-red-500 text-sm">{error}</p>}

        {!loading && !error && paymentMethods.length === 0 && (
          <p className="text-body-color text-sm dark:text-dark-6">
            No saved payment methods. Cards are saved automatically during checkout, or you can
            add one below.
          </p>
        )}

        {!loading && paymentMethods.length > 0 && (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stroke px-4 py-3 dark:border-dark-3"
              >
                <div>
                  <p className="text-dark text-sm font-semibold dark:text-white">
                    {formatCardBrand(method.brand)} **** {method.last4}
                  </p>
                  <p className="text-body-color text-xs dark:text-dark-6">
                    {formatExpiry(method.expMonth, method.expYear)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(method.id)}
                  className="text-xs font-semibold text-red-500 transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={removingId === method.id}
                >
                  {removingId === method.id ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionError && <p className="text-red-500 text-sm">{actionError}</p>}

      <div className="space-y-4">
        {!showAddForm && (
          <button
            type="button"
            onClick={handleStartAdd}
            className="bg-primary hover:bg-primary-dark inline-flex h-11 items-center justify-center rounded-lg px-6 text-sm font-semibold text-white transition"
          >
            Add a card
          </button>
        )}

        {showAddForm && (
          <div className="rounded-xl border border-stroke p-5 dark:border-dark-3">
            <h3 className="text-dark mb-4 text-base font-semibold dark:text-white">Add a card</h3>
            {setupLoading && (
              <div className="flex items-center gap-3 text-body-color dark:text-dark-6">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></span>
                Preparing secure form...
              </div>
            )}
            {!setupLoading && !setupClientSecret && (
              <p className="text-body-color text-sm dark:text-dark-6">
                We could not start the secure form. Please try again.
              </p>
            )}
            {!setupLoading && setupClientSecret && (
              <Elements
                stripe={stripePromise}
                options={{ clientSecret: setupClientSecret, appearance: STRIPE_APPEARANCE }}
              >
                <AddCardForm
                  clientSecret={setupClientSecret}
                  onCancel={handleCancelAdd}
                  onSuccess={handleAddSuccess}
                />
              </Elements>
            )}
          </div>
        )}
      </div>

      <p className="text-body-color text-xs dark:text-dark-6">
        Questions? Email us at{" "}
        <a href="mailto:info@hellobloom.ca" className="text-primary">
          info@hellobloom.ca
        </a>{" "}
        and we will be happy to help.
      </p>
    </div>
  );
};

AddCardForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  onCancel: PropTypes.func.isRequired,
  onSuccess: PropTypes.func.isRequired,
};

PaymentMethodsTab.propTypes = {
  customer: PropTypes.object.isRequired,
};

export default PaymentMethodsTab;
