import { useState } from "react";
import { Navigate, useNavigate, Link } from "react-router-dom";
import PropTypes from "prop-types";
import Breadcrumb from "../components/Breadcrumb.jsx";
import { useAuth } from "../contexts/AuthContext.jsx";

const Signup = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated, initializing } = useAuth();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!initializing && isAuthenticated) {
    return <Navigate to="/profile" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await register({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        rememberMe,
      });
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Breadcrumb pageName="Create Account" />
      <section className="bg-white py-20 dark:bg-dark">
        <div className="container mx-auto">
          <div className="mx-auto max-w-[520px] rounded-2xl border border-stroke bg-white p-10 shadow-xl dark:border-dark-3 dark:bg-dark-2">
            <h1 className="text-dark mb-3 text-3xl font-bold dark:text-white">Create an account</h1>
            <p className="text-body-color mb-8 text-sm leading-relaxed dark:text-dark-6">
              Create an account to view your order history, reuse saved recipients, and check out faster.
              If we already have your email from an in-store order, we’ll connect this login to your existing history.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  id="firstName"
                  label="First name"
                  value={form.firstName}
                  onChange={handleChange}
                  required
                />
                <Field
                  id="lastName"
                  label="Last name"
                  value={form.lastName}
                  onChange={handleChange}
                  required
                />
              </div>
              <Field
                id="email"
                label="Email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <Field
                id="password"
                label="Password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
              />
              <Field
                id="confirmPassword"
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
                />
                <span className="text-sm text-body-color dark:text-dark-6">Keep me logged in for 14 days</span>
              </label>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark flex h-12 w-full items-center justify-center rounded-lg text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <p className="text-body-color mt-6 text-sm dark:text-dark-6">
              Already have an account? {" "}
              <Link to="/login" className="text-primary hover:text-primary-dark font-semibold">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
};

const Field = ({ id, label, type = "text", value, onChange, required }) => (
  <div>
    <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor={id}>
      {label}
    </label>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={(event) => onChange(event)}
      required={required}
      className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-base text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
    />
  </div>
);

Field.propTypes = {
  id: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
};

export default Signup;
