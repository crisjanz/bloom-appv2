import PropTypes from "prop-types";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useMemo } from "react";

const PAYMENT_ELEMENT_OPTIONS = {
  layout: "tabs",
};

const PaymentSection = ({ amount, disabled = false, loading = false, error, onSubmit }) => {
  const stripe = useStripe();
  const elements = useElements();

  const formattedAmount = useMemo(() => {
    if (!amount || Number.isNaN(amount)) return "$0";
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount);
  }, [amount]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || disabled || loading) {
      return;
    }
    await onSubmit({ stripe, elements });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Payment details</h2>
        <p className="mt-1 text-sm text-slate-500">
          Secure checkout powered by Stripe. We only charge your card once the gift email is ready to send.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={!stripe || !elements || disabled || loading}
        className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/30"
      >
        {loading ? "Processing..." : `Send gift card – ${formattedAmount}`}
      </button>
    </form>
  );
};

PaymentSection.propTypes = {
  amount: PropTypes.number.isRequired,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
};

export default PaymentSection;
