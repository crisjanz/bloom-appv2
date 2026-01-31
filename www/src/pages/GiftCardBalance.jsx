import { useState } from "react";
import Breadcrumb from "../components/Breadcrumb.jsx";
import api from "../services/api";

const formatCurrency = (amountInCents) => {
  const value = Number(amountInCents) || 0;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(value / 100);
};

const GiftCardBalance = () => {
  const [cardNumber, setCardNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = cardNumber.trim().toUpperCase();

    if (!trimmed) {
      setError("Enter your gift card number to continue.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await api.post("/gift-cards/check", { cardNumber: trimmed });
      setResult(data);
    } catch (err) {
      setResult(null);
      setError(err.message || "Unable to check balance right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Gift Card Balance" />
      <section className="bg-white py-16">
        <div className="container mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Check your gift card balance</h1>
            <p className="mt-3 text-base text-slate-600">
              Enter your gift card number to view the current balance.
            </p>
          </div>

          <div className="mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="gift-card-number" className="text-sm font-medium text-slate-700">
                  Gift card number
                </label>
                <input
                  id="gift-card-number"
                  type="text"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value.toUpperCase())}
                  placeholder="GC-XXXX-XXXX"
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 text-base text-slate-900 focus:border-primary-light focus:outline-none focus:ring-2 focus:ring-primary/15"
                />
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:bg-primary/30"
              >
                {loading ? "Checking..." : "Check Balance"}
              </button>
            </form>

            {result?.valid && (
              <div className="mt-6 rounded-xl border border-primary/25 bg-primary/10 p-4">
                <p className="text-sm text-primary-dark">Current balance</p>
                <p className="mt-1 text-2xl font-semibold text-primary-dark">
                  {formatCurrency(result.balance)}
                </p>
                <p className="mt-2 text-xs text-primary-dark">
                  Status: {result.status}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default GiftCardBalance;
