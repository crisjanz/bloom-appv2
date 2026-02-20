import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useAuth } from '../../contexts/AuthContext.jsx';

const CheckoutLoginModal = ({ isOpen, initialEmail, onClose }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setEmail(initialEmail || '');
    setPassword('');
    setRememberMe(true);
    setLoading(false);
    setError('');
  }, [isOpen, initialEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email.trim().toLowerCase(), password, rememberMe);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to log in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 px-4">
      <div className="w-full max-w-[480px] rounded-2xl border border-stroke bg-white p-8 shadow-2xl dark:border-dark-3 dark:bg-dark-2">
        <h2 className="text-dark mb-3 text-2xl font-bold dark:text-white">
          Log in to your account
        </h2>
        <p className="text-body-color mb-6 text-sm leading-relaxed dark:text-dark-6">
          We&apos;ll keep your checkout details here and load your saved recipients and payment methods.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="checkout-login-email">
              Email
            </label>
            <input
              id="checkout-login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <div>
            <label className="text-dark mb-2 block text-sm font-medium dark:text-white" htmlFor="checkout-login-password">
              Password
            </label>
            <input
              id="checkout-login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="h-12 w-full rounded-lg border border-stroke bg-transparent px-4 text-sm text-dark outline-hidden transition focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-stroke text-primary focus:ring-primary"
            />
            <span className="text-sm text-body-color dark:text-dark-6">Keep me logged in for 14 days</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="bg-primary hover:bg-primary-dark inline-flex flex-1 items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="border-stroke text-body-color hover:border-primary hover:text-primary inline-flex items-center justify-center rounded-lg border px-4 py-3 text-sm font-semibold transition dark:border-dark-3 dark:text-dark-6"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CheckoutLoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  initialEmail: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

CheckoutLoginModal.defaultProps = {
  initialEmail: '',
};

export default CheckoutLoginModal;
