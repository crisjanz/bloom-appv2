import { useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import api from "../services/api.js";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/customers/reset-password", { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.message || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <>
        <Breadcrumb pageName="Reset Password" />
        <section className="bg-white py-20 dark:bg-dark">
          <div className="container mx-auto">
            <div className="mx-auto max-w-[480px] rounded-2xl border border-stroke bg-white p-10 shadow-xl dark:border-dark-3 dark:bg-dark-2">
              <h1 className="text-dark mb-4 text-3xl font-bold dark:text-white">Invalid link</h1>
              <p className="text-body-color mb-6 text-base dark:text-dark-6">
                This reset link is invalid or has expired.
              </p>
              <Link to="/forgot-password" className="text-primary hover:text-primary-dark font-semibold text-sm">
                Request a new reset link
              </Link>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <Breadcrumb pageName="Reset Password" />
      <section className="bg-white py-20 dark:bg-dark">
        <div className="container mx-auto">
          <div className="mx-auto max-w-[480px] rounded-2xl border border-stroke bg-white p-10 shadow-xl dark:border-dark-3 dark:bg-dark-2">
            {success ? (
              <>
                <h1 className="text-dark mb-4 text-3xl font-bold dark:text-white">Password reset</h1>
                <p className="text-body-color mb-6 text-base dark:text-dark-6">
                  Your password has been updated. Redirecting to login...
                </p>
                <Link to="/login" className="text-primary hover:text-primary-dark font-semibold text-sm">
                  Go to login
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-dark mb-4 text-3xl font-bold dark:text-white">Set new password</h1>
                <p className="text-body-color mb-8 text-base dark:text-dark-6">
                  Enter your new password below.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="password">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-base text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      placeholder="Enter new password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="confirm">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-base text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>

                  {error && <p className="text-red-500 text-sm">{error}</p>}

                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary-dark flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={loading}
                  >
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default ResetPassword;
