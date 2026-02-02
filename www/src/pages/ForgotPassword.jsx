import { useState } from "react";
import { Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/customers/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      if (!res.ok) {
        throw new Error("Something went wrong. Please try again.");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Forgot Password" />
      <section className="bg-tg-bg py-20 dark:bg-dark">
        <div className="container mx-auto">
          <div className="mx-auto max-w-[480px] rounded-2xl border border-stroke bg-white p-10 shadow-xl dark:border-dark-3 dark:bg-dark-2">
            {submitted ? (
              <>
                <h1 className="text-dark mb-4 text-3xl font-bold dark:text-white">Check your email</h1>
                <p className="text-body-color mb-6 text-base dark:text-dark-6">
                  If an account exists for <strong>{email}</strong>, we've sent a password reset link. It expires in 1 hour.
                </p>
                <Link
                  to="/login"
                  className="text-primary hover:text-primary-dark font-semibold text-sm"
                >
                  Back to login
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-dark mb-4 text-3xl font-bold dark:text-white">Forgot password?</h1>
                <p className="text-body-color mb-8 text-base dark:text-dark-6">
                  Enter your email and we'll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="email">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-base text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Sending..." : "Send Reset Link"}
                  </button>
                </form>

                <div className="text-body-color mt-6 text-sm dark:text-dark-6">
                  Remember your password?{" "}
                  <Link to="/login" className="text-primary hover:text-primary-dark font-semibold">
                    Sign in
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default ForgotPassword;
