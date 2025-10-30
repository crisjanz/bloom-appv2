import PropTypes from "prop-types";

const RecipientForm = ({
  recipient,
  purchaser,
  onRecipientChange,
  onPurchaserChange,
  errors,
  disabled = false,
}) => {
  const handleRecipientChange = (event) => {
    const { name, value } = event.target;
    onRecipientChange(name, value);
  };

  const handlePurchaserChange = (event) => {
    const { name, value } = event.target;
    onPurchaserChange(name, value);
  };

  return (
    <div className="space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      <section>
        <h2 className="text-lg font-semibold text-slate-900">Recipient details</h2>
        <p className="mt-1 text-sm text-slate-500">We’ll email the gift card to this person as soon as payment clears.</p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="recipient-name" className="text-sm font-medium text-slate-700">
              Recipient name
            </label>
            <input
              id="recipient-name"
              name="name"
              type="text"
              value={recipient.name}
              onChange={handleRecipientChange}
              disabled={disabled}
              placeholder="e.g. Alex Bloom"
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {errors?.recipient?.name ? <p className="mt-2 text-sm text-red-600">{errors.recipient.name}</p> : null}
          </div>

          <div>
            <label htmlFor="recipient-email" className="text-sm font-medium text-slate-700">
              Recipient email
            </label>
            <input
              id="recipient-email"
              name="email"
              type="email"
              value={recipient.email}
              onChange={handleRecipientChange}
              disabled={disabled}
              placeholder="alex@example.com"
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {errors?.recipient?.email ? <p className="mt-2 text-sm text-red-600">{errors.recipient.email}</p> : null}
          </div>

          <div>
            <label htmlFor="recipient-message" className="text-sm font-medium text-slate-700">
              Personal message <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="recipient-message"
              name="message"
              rows={4}
              value={recipient.message}
              onChange={handleRecipientChange}
              disabled={disabled}
              placeholder="Write a short note to include with the email."
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            <div className="mt-1 flex justify-between text-xs text-slate-400">
              <span>Max 250 characters</span>
              <span>{recipient.message.length}/250</span>
            </div>
            {errors?.recipient?.message ? <p className="mt-2 text-sm text-red-600">{errors.recipient.message}</p> : null}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">From you</h2>
        <p className="mt-1 text-sm text-slate-500">
          We use this information for the receipt and to introduce you in the gift email.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label htmlFor="purchaser-name" className="text-sm font-medium text-slate-700">
              Your name
            </label>
            <input
              id="purchaser-name"
              name="name"
              type="text"
              value={purchaser.name}
              onChange={handlePurchaserChange}
              disabled={disabled}
              placeholder="Your full name"
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {errors?.purchaser?.name ? <p className="mt-2 text-sm text-red-600">{errors.purchaser.name}</p> : null}
          </div>

          <div>
            <label htmlFor="purchaser-email" className="text-sm font-medium text-slate-700">
              Your email
            </label>
            <input
              id="purchaser-email"
              name="email"
              type="email"
              value={purchaser.email}
              onChange={handlePurchaserChange}
              disabled={disabled}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-slate-200 px-4 py-2 text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-50"
            />
            {errors?.purchaser?.email ? <p className="mt-2 text-sm text-red-600">{errors.purchaser.email}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
};

RecipientForm.propTypes = {
  recipient: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
  purchaser: PropTypes.shape({
    name: PropTypes.string,
    email: PropTypes.string,
  }).isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  onPurchaserChange: PropTypes.func.isRequired,
  errors: PropTypes.shape({
    recipient: PropTypes.object,
    purchaser: PropTypes.object,
  }),
  disabled: PropTypes.bool,
};

export default RecipientForm;
