import PropTypes from 'prop-types';
import TermsContent from '../TermsContent.jsx';

const CheckoutTermsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 px-4 py-6">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-stroke bg-white shadow-2xl dark:border-dark-3 dark:bg-dark-2">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-4 dark:border-dark-3">
          <h2 className="text-lg font-semibold text-dark dark:text-white">Terms & Conditions</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-body-color transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-dark-6"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <TermsContent />
        </div>
      </div>
    </div>
  );
};

CheckoutTermsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CheckoutTermsModal;
