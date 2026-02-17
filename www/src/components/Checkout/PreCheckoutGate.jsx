import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const PreCheckoutGate = ({ onContinueGuest }) => (
  <section className="bg-white pb-12 pt-10 dark:bg-dark lg:pb-16 lg:pt-16">
    <div className="container mx-auto px-4">
      <div className="mx-auto max-w-2xl rounded-2xl border border-stroke bg-white p-8 text-center dark:border-dark-3 dark:bg-dark-2">
        <h2 className="text-2xl font-semibold text-dark dark:text-white">
          Have an account?
        </h2>
        <p className="mt-3 text-base text-body-color dark:text-dark-6">
          Log in for saved addresses and faster checkout.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onContinueGuest}
            className="w-full rounded-full border border-stroke px-6 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white sm:w-auto"
          >
            Continue as Guest
          </button>
          <Link
            to="/login"
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  </section>
);

PreCheckoutGate.propTypes = {
  onContinueGuest: PropTypes.func.isRequired,
};

export default PreCheckoutGate;
