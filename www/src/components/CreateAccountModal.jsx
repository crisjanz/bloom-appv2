import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext.jsx";

const CreateAccountModal = ({ isOpen, email, firstName, lastName, onClose, onRegistered }) => {
  const { register } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setConfirmPassword("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await register({ email, password, firstName, lastName });
      onRegistered?.();
      onClose();
    } catch (err) {
      setError(err.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 px-4">
      <div className="w-full max-w-[480px] rounded-2xl border border-stroke bg-white p-8 shadow-2xl dark:border-dark-3 dark:bg-dark-2">
        <h2 className="text-dark mb-3 text-2xl font-bold dark:text-white">
          Save your info for next time
        </h2>
        <p className="text-body-color mb-6 text-sm leading-relaxed dark:text-dark-6">
          Create a password to turn this order into an account. You’ll be able to view past orders,
          reuse recipients, and check out faster.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="modal-email">
              Email
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              disabled
              className="h-12 w-full rounded-lg border border-stroke bg-gray-100 px-4 text-sm text-dark outline-hidden dark:border-dark-3 dark:bg-dark-3 dark:text-white"
            />
          </div>

          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="modal-password">
              Create password
            </label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="modal-confirm">
              Confirm password
            </label>
            <input
              id="modal-confirm"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark inline-flex flex-1 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create account"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-stroke text-body-color hover:border-primary hover:text-primary inline-flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold transition dark:border-dark-3 dark:text-dark-6"
              disabled={loading}
            >
              Maybe later
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateAccountModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  email: PropTypes.string,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onRegistered: PropTypes.func,
};

export default CreateAccountModal;
