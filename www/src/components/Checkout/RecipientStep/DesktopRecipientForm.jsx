import PropTypes from "prop-types";
import DeliveryDatePicker from "../../../components/DeliveryDatePicker.jsx";
import AddressAutocomplete from "../../../components/AddressAutocomplete.jsx";
import { InputGroup, SelectGroup, TextAreaGroup } from "../shared/DesktopInputs";
import SavedRecipientControls from "../shared/SavedRecipientControls";
import { provinceOptions, instructionPresets } from "../shared/constants";

const DesktopRecipientForm = ({
  data,
  onChange,
  deliveryDate,
  onDateChange,
  errors,
  onPresetSelect,
  savedRecipientOptions,
  savedRecipientsLoading,
  savedRecipientsError,
  selectedSavedRecipientOption,
  onSavedRecipientChange,
  isNewRecipient,
  onAddressSelect,
  recipientModifiedAfterAutofill,
}) => (
  <>
    <SavedRecipientControls
      variant="desktop"
      options={savedRecipientOptions}
      loading={savedRecipientsLoading}
      error={savedRecipientsError}
      selectedOption={selectedSavedRecipientOption}
      onSelectOption={onSavedRecipientChange}
      recipientModifiedAfterAutofill={recipientModifiedAfterAutofill}
    />
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Recipient first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
      required
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Recipient last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
      required
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Recipient phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
      required
    />
    <InputGroup
      labelTitle="Email (optional)"
      type="email"
      placeholder="Recipient email"
      name="email"
      value={data.email}
      onChange={onChange}
    />
    {isNewRecipient ? (
      <div className="w-full px-3">
        <AddressAutocomplete
          label="Address"
          value={data.address1}
          onChange={onChange}
          onAddressSelect={onAddressSelect}
          inputClassName="border rounded-md border-stroke px-5 py-3 text-body-color placeholder:text-body-color/70 focus:border-primary dark:border-dark-3 dark:text-dark-6"
        />
        {errors.address1 && <p className="text-red-500 mt-1 text-sm">{errors.address1}</p>}
      </div>
    ) : (
      <InputGroup
        fullColumn
        labelTitle="Address"
        type="text"
        placeholder="Street address"
        name="address1"
        value={data.address1}
        onChange={onChange}
        error={errors.address1}
        required
      />
    )}
    <InputGroup
      fullColumn
      labelTitle="Apartment / Suite"
      type="text"
      placeholder="Unit, suite, etc."
      name="address2"
      value={data.address2}
      onChange={onChange}
    />
    <InputGroup
      labelTitle="City"
      type="text"
      placeholder="City"
      name="city"
      value={data.city}
      onChange={onChange}
      error={errors.city}
      required
    />
    <SelectGroup
      labelTitle="Province"
      name="province"
      value={data.province}
      onChange={onChange}
      options={provinceOptions}
      required
    />
    <InputGroup
      labelTitle="Postal Code"
      type="text"
      placeholder="Postal code"
      name="postalCode"
      value={data.postalCode}
      onChange={onChange}
      error={errors.postalCode}
      required
    />
    <div className="w-full px-3">
      <label className="mb-2.5 block text-base font-medium text-dark dark:text-white">
        Delivery Date
      </label>
      <DeliveryDatePicker
        selectedDate={deliveryDate}
        onDateChange={onDateChange}
        required
      />
      {errors.deliveryDate && (
        <p className="text-red-500 mt-1 text-sm">{errors.deliveryDate}</p>
      )}
    </div>
    <TextAreaGroup
      labelTitle="Card Message"
      placeholder="Write a heartfelt note to include with the arrangement."
      name="cardMessage"
      value={data.cardMessage}
      onChange={onChange}
      maxLength={250}
    />
    <TextAreaGroup
      labelTitle="Delivery Instructions"
      placeholder="Gate codes, concierge details, or anything else we should know."
      name="deliveryInstructions"
      value={data.deliveryInstructions}
      onChange={onChange}
      maxLength={200}
    >
      <div className="mt-3 flex flex-wrap gap-2">
        {instructionPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            className="border-stroke text-body-color hover:border-primary hover:bg-primary rounded-full border px-4 py-1 text-xs font-medium transition hover:text-white dark:border-dark-3 dark:text-dark-6"
            onClick={() => onPresetSelect(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </TextAreaGroup>
  </>
);

DesktopRecipientForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  deliveryDate: PropTypes.string,
  onDateChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  onPresetSelect: PropTypes.func.isRequired,
  savedRecipientOptions: PropTypes.array.isRequired,
  savedRecipientsLoading: PropTypes.bool.isRequired,
  savedRecipientsError: PropTypes.string,
  selectedSavedRecipientOption: PropTypes.string.isRequired,
  onSavedRecipientChange: PropTypes.func.isRequired,
  isNewRecipient: PropTypes.bool.isRequired,
  onAddressSelect: PropTypes.func.isRequired,
  recipientModifiedAfterAutofill: PropTypes.bool.isRequired,
};

export default DesktopRecipientForm;
