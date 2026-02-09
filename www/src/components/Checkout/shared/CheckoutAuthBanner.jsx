import PropTypes from "prop-types";
import { Link } from "react-router-dom";

const CheckoutAuthBanner = ({
  isAuthenticated,
  customerName,
  savedRecipientsLoading,
  hasSavedRecipients,
}) => (
  <div className="mb-0 dark:bg-dark-2">
    <div className="container mx-auto px-4 md:px-3">
      <div className="bg-tg-bg px-6 py-3 text-sm text-dark dark:bg-dark-2">
        {isAuthenticated ? (
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-dark dark:text-white">
              Welcome back, {customerName || "friend"}!
            </p>
            <p className="text-body-color dark:text-dark-6">
              {savedRecipientsLoading
                ? "Syncing your saved recipients…"
                : hasSavedRecipients
                  ? "Choose a saved recipient below or enter new details."
                  : "Add a new recipient to save them for next time."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-dark dark:text-white">Login or continue as guest</p>
              <p className="text-body-color text-sm dark:text-dark-6">
                Sign in to access saved recipients and faster checkout.
              </p>
            </div>
            <Link
              to="/login"
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
            >
              Login
            </Link>
          </div>
        )}
      </div>
    </div>
  </div>
);

CheckoutAuthBanner.propTypes = {
  isAuthenticated: PropTypes.bool.isRequired,
  customerName: PropTypes.string,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  hasSavedRecipients: PropTypes.bool.isRequired,
};

export default CheckoutAuthBanner;
