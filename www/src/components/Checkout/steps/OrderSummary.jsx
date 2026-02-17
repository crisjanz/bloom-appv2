import PropTypes from 'prop-types';

const OrderSummary = ({
  recipient,
  orderType,
  deliveryDate,
  customer,
  occasion,
  cardMessage,
  formatDate,
  onEditStep,
}) => {
  const recipientName = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ').trim() || 'Recipient';
  const customerName = [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim() || 'Customer';

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-dark dark:text-white">Delivery</h4>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-body-color dark:text-dark-6">{orderType === 'PICKUP' ? 'Pickup order' : 'Delivery order'}</p>
        <p className="text-sm text-body-color dark:text-dark-6">Recipient: {recipientName}</p>
        {orderType === 'DELIVERY' && (
          <p className="text-sm text-body-color dark:text-dark-6">
            {recipient.address1}, {recipient.city}, {recipient.province} {recipient.postalCode}
          </p>
        )}
        <p className="text-sm text-body-color dark:text-dark-6">Date: {formatDate(deliveryDate)}</p>
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-dark dark:text-white">Card message</h4>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-body-color dark:text-dark-6">Occasion: {occasion || 'None selected'}</p>
        <p className="text-sm text-body-color dark:text-dark-6">
          {cardMessage ? cardMessage : 'No card message'}
        </p>
      </div>

      <div className="rounded-md border border-stroke p-4 dark:border-dark-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-dark dark:text-white">Your info</h4>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            className="text-sm font-medium text-primary hover:underline"
          >
            Edit
          </button>
        </div>
        <p className="text-sm text-body-color dark:text-dark-6">{customerName}</p>
        <p className="text-sm text-body-color dark:text-dark-6">{customer.email}</p>
        <p className="text-sm text-body-color dark:text-dark-6">{customer.phone}</p>
      </div>
    </div>
  );
};

OrderSummary.propTypes = {
  recipient: PropTypes.object.isRequired,
  orderType: PropTypes.oneOf(['DELIVERY', 'PICKUP']).isRequired,
  deliveryDate: PropTypes.string,
  customer: PropTypes.object.isRequired,
  occasion: PropTypes.string,
  cardMessage: PropTypes.string,
  formatDate: PropTypes.func.isRequired,
  onEditStep: PropTypes.func.isRequired,
};

export default OrderSummary;
