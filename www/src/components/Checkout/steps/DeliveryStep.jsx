import { useState } from 'react';
import PropTypes from 'prop-types';
import DeliveryDatePicker from '../../DeliveryDatePicker.jsx';
import AddressAutocomplete from '../../AddressAutocomplete.jsx';
import SavedRecipientControls from '../shared/SavedRecipientControls';
import { InputGroup, SelectGroup, TextAreaGroup } from '../shared/DesktopInputs';
import { provinceOptions } from '../shared/constants';

const SurpriseWarningModal = ({ onAccept, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/60 px-4">
    <div className="w-full max-w-[480px] rounded-2xl border border-stroke bg-white p-6 shadow-2xl dark:border-dark-3 dark:bg-dark-2">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-bold text-dark dark:text-white">
        Important: Surprise Delivery Policy
      </h3>
      <div className="mb-6 space-y-3 text-sm text-body-color dark:text-dark-6">
        <p>
          Since we won&apos;t be contacting the recipient, please be aware of the following:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-dark dark:text-white">Redelivery fee:</strong> If the recipient is not home and the delivery cannot be completed, a redelivery fee will be charged to your card on file for a second attempt.
          </li>
          <li>
            <strong className="text-dark dark:text-white">No phone contact:</strong> Our driver will not call or text the recipient. If no one answers the door, we may leave the arrangement at the door depending on conditions, or return to the shop.
          </li>
          <li>
            <strong className="text-dark dark:text-white">Detailed instructions required:</strong> Please provide the best delivery time, which door to use, and any gate codes or access instructions to help ensure a successful first attempt.
          </li>
          <li>
            <strong className="text-dark dark:text-white">Weather conditions:</strong> Flowers left at the door in extreme heat or cold may be affected. We cannot guarantee quality if the recipient is unavailable.
          </li>
        </ul>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-stroke px-4 py-3 text-sm font-semibold text-dark transition hover:bg-gray-50 dark:border-dark-3 dark:text-white dark:hover:bg-dark-3"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          I Understand, Continue
        </button>
      </div>
    </div>
  </div>
);

SurpriseWarningModal.propTypes = {
  onAccept: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

const DeliveryStep = ({
  recipient,
  errors,
  onRecipientChange,
  deliveryDate,
  onDateChange,
  instructionPresets,
  onPresetSelect,
  isAuthenticated,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedSavedRecipientOption,
  onSavedRecipientChange,
  isNewRecipient,
  onAddressSelect,
  recipientModifiedAfterAutofill,
  isForMe,
  onToggleForMe,
  orderType,
  onOrderTypeChange,
  customerPreview,
  onContinue,
}) => {
  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const showRecipientIdentityFields = !isForMe;
  const showAddressFields = orderType === 'DELIVERY';

  const handleSurpriseToggle = (checked) => {
    if (checked) {
      setShowSurpriseModal(true);
    } else {
      onRecipientChange({ target: { name: 'isSurprise', type: 'checkbox', checked: false } });
    }
  };

  return (
    <div className="space-y-6">
      {showSurpriseModal && (
        <SurpriseWarningModal
          onAccept={() => {
            onRecipientChange({ target: { name: 'isSurprise', type: 'checkbox', checked: true } });
            setShowSurpriseModal(false);
          }}
          onCancel={() => setShowSurpriseModal(false)}
        />
      )}
      <div className="rounded-xl border border-stroke p-4 dark:border-dark-3">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-dark dark:text-white">Order Type</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOrderTypeChange('DELIVERY')}
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  orderType === 'DELIVERY'
                    ? 'border-primary bg-primary text-white'
                    : 'border-stroke text-dark hover:border-primary dark:border-dark-3 dark:text-white'
                }`}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => onOrderTypeChange('PICKUP')}
                className={`flex-1 rounded-md border px-4 py-2 text-sm font-semibold transition ${
                  orderType === 'PICKUP'
                    ? 'border-primary bg-primary text-white'
                    : 'border-stroke text-dark hover:border-primary dark:border-dark-3 dark:text-white'
                }`}
              >
                Pickup
              </button>
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-3 p-3">
            <input
              type="checkbox"
              checked={isForMe}
              onChange={(event) => onToggleForMe(event.target.checked)}
              className="h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-semibold text-dark dark:text-white">This order is for me</p>
              <p className="text-xs text-body-color dark:text-dark-6">
                Use your info from step 3 as the recipient.
              </p>
            </div>
          </label>
        </div>
      </div>

      {isForMe && orderType === 'PICKUP' && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-dark dark:text-white">
          {customerPreview?.firstName || customerPreview?.lastName
            ? `Recipient: ${[customerPreview.firstName, customerPreview.lastName].filter(Boolean).join(' ')}`
            : 'Recipient info will be filled from your info in step 3.'}
        </div>
      )}

      {isAuthenticated && !isForMe && (
        <SavedRecipientControls
          variant="desktop"
          options={savedRecipientOptions}
          loading={savedRecipientsLoading}
          error={savedRecipientsError}
          selectedOption={selectedSavedRecipientOption}
          onSelectOption={onSavedRecipientChange}
          recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
        />
      )}

      <div className="-mx-3 flex flex-wrap">
        {showRecipientIdentityFields && (
          <>
            <InputGroup
              labelTitle="Recipient first name"
              type="text"
              name="firstName"
              value={recipient.firstName || ''}
              onChange={onRecipientChange}
              error={errors.firstName}
              required
            />
            <InputGroup
              labelTitle="Recipient last name"
              type="text"
              name="lastName"
              value={recipient.lastName || ''}
              onChange={onRecipientChange}
              error={errors.lastName}
              required
            />
            <InputGroup
              labelTitle="Recipient phone"
              type="text"
              name="phone"
              value={recipient.phone || ''}
              onChange={onRecipientChange}
              error={errors.phone}
              required
            />
            <div className="w-full px-3 -mt-2 mb-2 space-y-2">
              <p className="text-xs text-body-color dark:text-dark-6">
                This number will be used for delivery arrangements.
              </p>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={recipient.isSurprise || false}
                  onChange={(event) => handleSurpriseToggle(event.target.checked)}
                  className="h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
                />
                <span className="text-sm text-dark dark:text-white">This is a surprise delivery</span>
              </label>
            </div>
          </>
        )}

        {showAddressFields && (
          <>
            {isNewRecipient ? (
              <div className="w-full px-3">
                <AddressAutocomplete
                  label="Address"
                  value={recipient.address1 || ''}
                  onChange={onRecipientChange}
                  onAddressSelect={onAddressSelect}
                  inputClassName="border rounded-md border-stroke px-5 py-3 text-body-color placeholder:text-body-color/70 focus:border-primary dark:border-dark-3 dark:text-dark-6"
                />
                {errors.address1 && <p className="mt-1 text-sm text-red-500">{errors.address1}</p>}
              </div>
            ) : (
              <InputGroup
                fullColumn
                labelTitle="Address"
                type="text"
                name="address1"
                value={recipient.address1 || ''}
                onChange={onRecipientChange}
                error={errors.address1}
                required
              />
            )}

            <InputGroup
              fullColumn
              labelTitle="Apartment / Suite"
              type="text"
              name="address2"
              value={recipient.address2 || ''}
              onChange={onRecipientChange}
            />
            <InputGroup
              labelTitle="City"
              type="text"
              name="city"
              value={recipient.city || ''}
              onChange={onRecipientChange}
              error={errors.city}
              required
            />
            <SelectGroup
              labelTitle="Province"
              name="province"
              value={recipient.province || 'BC'}
              onChange={onRecipientChange}
              options={provinceOptions}
              required
            />
            <InputGroup
              labelTitle="Postal code"
              type="text"
              name="postalCode"
              value={recipient.postalCode || ''}
              onChange={onRecipientChange}
              error={errors.postalCode}
              required
            />
          </>
        )}

        <div className="w-full px-3">
          <DeliveryDatePicker selectedDate={deliveryDate} onDateChange={onDateChange} required />
          {errors.deliveryDate && <p className="mt-1 text-sm text-red-500">{errors.deliveryDate}</p>}
        </div>

        {recipient.isSurprise && (
          <div className="w-full px-3 mb-4">
            <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-600/50 dark:bg-amber-900/20">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Since this is a surprise, please provide a preferred delivery time and which door to use so we don&apos;t spoil it!
              </p>
            </div>
            <div className="mt-3">
              <p className="mb-2 text-sm font-medium text-dark dark:text-white">
                Which door should we use? <span className="text-red-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {['Front door', 'Side door', 'Back door', 'Reception/Lobby'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onRecipientChange({ target: { name: 'deliveryDoor', value: option } })}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      recipient.deliveryDoor === option
                        ? 'border-primary bg-primary text-white'
                        : 'border-stroke text-body-color hover:border-primary dark:border-dark-3 dark:text-dark-6'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.deliveryDoor && <p className="mt-1 text-sm text-red-500">{errors.deliveryDoor}</p>}
            </div>
          </div>
        )}

        <TextAreaGroup
          labelTitle={recipient.isSurprise ? 'Delivery instructions *' : orderType === 'PICKUP' ? 'Pickup instructions' : 'Delivery instructions'}
          placeholder={recipient.isSurprise
            ? 'Preferred time, gate code, where to leave if not home...'
            : orderType === 'PICKUP'
              ? 'Preferred pickup time or other notes'
              : 'Gate code, call on arrival, or other notes'}
          name="deliveryInstructions"
          value={recipient.deliveryInstructions || ''}
          onChange={onRecipientChange}
          maxLength={200}
        >
          {errors.deliveryInstructions && (
            <p className="mt-1 text-sm text-red-500">{errors.deliveryInstructions}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {instructionPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onPresetSelect(preset)}
                className="rounded-full border border-stroke px-4 py-1 text-xs font-medium text-body-color transition hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3 dark:text-dark-6"
              >
                {preset}
              </button>
            ))}
          </div>
        </TextAreaGroup>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

DeliveryStep.propTypes = {
  recipient: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onRecipientChange: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  instructionPresets: PropTypes.arrayOf(PropTypes.string).isRequired,
  onPresetSelect: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedSavedRecipientOption: PropTypes.string.isRequired,
  onSavedRecipientChange: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
  isForMe: PropTypes.bool.isRequired,
  onToggleForMe: PropTypes.func.isRequired,
  orderType: PropTypes.oneOf(['DELIVERY', 'PICKUP']).isRequired,
  onOrderTypeChange: PropTypes.func.isRequired,
  customerPreview: PropTypes.object,
  onContinue: PropTypes.func.isRequired,
};

export default DeliveryStep;
