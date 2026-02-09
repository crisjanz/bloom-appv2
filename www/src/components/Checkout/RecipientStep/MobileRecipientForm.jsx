import PropTypes from "prop-types";
import DeliveryDatePicker from "../../../components/DeliveryDatePicker.jsx";
import AddressAutocomplete from "../../../components/AddressAutocomplete.jsx";
import { MobileInput, MobileSelect, MobileTextArea, MobileSectionHeader } from "../shared/MobileInputs";
import SavedRecipientControls from "../shared/SavedRecipientControls";
import { provinceOptions } from "../shared/constants";

const MobileRecipientForm = ({
  data,
  errors,
  onChange,
  instructionPresets,
  onPresetSelect,
  deliveryDate,
  onDateChange,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedSavedRecipientOption,
  onSavedRecipientChange,
  isNewRecipient,
  onAddressAutocompleteSelect,
  recipientModifiedAfterAutofill,
}) => (
  <div className="space-y-0">
    <SavedRecipientControls
      variant="mobile"
      options={savedRecipientOptions}
      loading={savedRecipientsLoading}
      error={savedRecipientsError}
      selectedOption={selectedSavedRecipientOption}
      onSelectOption={onSavedRecipientChange}
      recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
    />

    <MobileSectionHeader>Recipient Information</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileInput label="First Name" name="firstName" value={data.firstName} onChange={onChange} error={errors.firstName} placeholder="John" required />
      <MobileInput label="Last Name" name="lastName" value={data.lastName} onChange={onChange} error={errors.lastName} placeholder="Doe" required />
      <MobileInput label="Phone" name="phone" value={data.phone} onChange={onChange} error={errors.phone} placeholder="(604) 555-1234" required />
      <MobileInput label="Email" type="email" name="email" value={data.email} onChange={onChange} placeholder="john@example.com" />
    </div>

    <MobileSectionHeader>Delivery Address</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      {isNewRecipient ? (
        <AddressAutocomplete
          label="Address"
          value={data.address1}
          onChange={onChange}
          onAddressSelect={onAddressAutocompleteSelect}
          placeholder="123 Main St"
          variant="mobile"
        />
      ) : (
        <MobileInput label="Address" name="address1" value={data.address1} onChange={onChange} error={errors.address1} placeholder="123 Main St" required />
      )}
      {isNewRecipient && errors.address1 && (
        <p className="text-red-500 px-4 pb-2 text-xs">{errors.address1}</p>
      )}
      <MobileInput label="Apt/Suite" name="address2" value={data.address2} onChange={onChange} placeholder="Suite 4B" />
      <MobileInput label="City" name="city" value={data.city} onChange={onChange} error={errors.city} placeholder="Vancouver" required />
      <MobileSelect label="Province" name="province" value={data.province} onChange={onChange} options={provinceOptions} required />
      <MobileInput label="Postal Code" name="postalCode" value={data.postalCode} onChange={onChange} error={errors.postalCode} placeholder="V6B 1A1" required />
    </div>

    <MobileSectionHeader>Delivery Details</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <div className="border-b border-stroke/30 px-4 py-3 dark:border-dark-3/30">
        <DeliveryDatePicker
          selectedDate={deliveryDate}
          onDateChange={onDateChange}
          required
          variant="compact"
        />
        {errors.deliveryDate && (
          <p className="text-red-500 mt-1 text-xs">{errors.deliveryDate}</p>
        )}
      </div>
      <MobileTextArea
        label="Card Message"
        name="cardMessage"
        value={data.cardMessage}
        onChange={onChange}
        placeholder="Happy Birthday! Love, Sarah"
        maxLength={250}
      />
      <div>
        <MobileTextArea
          label="Instructions"
          name="deliveryInstructions"
          value={data.deliveryInstructions}
          onChange={onChange}
          placeholder="Leave at the front door"
          maxLength={200}
        />
        <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
          <div className="flex flex-wrap gap-2">
            {instructionPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                className="rounded-full border border-stroke/60 px-3 py-1 text-xs text-body-color transition hover:border-primary hover:bg-primary hover:text-white dark:border-dark-3"
                onClick={() => onPresetSelect(preset)}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

MobileRecipientForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  instructionPresets: PropTypes.array.isRequired,
  onPresetSelect: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedSavedRecipientOption: PropTypes.string.isRequired,
  onSavedRecipientChange: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressAutocompleteSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

export default MobileRecipientForm;
