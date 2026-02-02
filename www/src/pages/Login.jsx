import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import Breadcrumb from "../components/Breadcrumb.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, initializing } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!initializing && isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Login" />
      <section className="bg-tg-bg py-20 dark:bg-dark">
        <div className="container mx-auto">
          <div className="mx-auto max-w-[480px] rounded-2xl border border-stroke bg-white p-10 shadow-xl dark:border-dark-3 dark:bg-dark-2">
            <h1 className="text-dark mb-6 text-3xl font-bold dark:text-white">Welcome back</h1>
            <p className="text-body-color mb-8 text-base dark:text-dark-6">
              Sign in to view past orders, saved recipients, and manage your account.
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
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-base text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <div className="text-right">
                <Link to="/forgot-password" className="text-primary hover:text-primary-dark text-sm font-medium">
                  Forgot password?
                </Link>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="text-body-color mt-6 text-sm dark:text-dark-6">
              Need to check out as a guest? Return to the {" "}
              <Link to="/checkout" className="text-primary hover:text-primary-dark font-semibold">
                checkout page
              </Link>
              .
            </div>

            <div className="text-body-color mt-3 text-sm dark:text-dark-6">
              New to Bloom? {" "}
              <Link to="/signup" className="text-primary hover:text-primary-dark font-semibold">
                Create an account
              </Link>
              .
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default Login;
