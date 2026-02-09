import PropTypes from "prop-types";
import BirthdayOptIn from "../../../components/Checkouts/BirthdayOptIn.jsx";
import { MobileInput, MobileSectionHeader } from "../shared/MobileInputs";

const MobileCustomerForm = ({ data, errors, onChange, birthday, onBirthdayToggle, onBirthdayChange, isAuthenticated }) => (
  <div className="space-y-0">
    <MobileSectionHeader>Your Information</MobileSectionHeader>
    <div className="bg-white dark:bg-dark-2">
      <MobileInput label="First Name" name="firstName" value={data.firstName} onChange={onChange} error={errors.firstName} placeholder="Sarah" required />
      <MobileInput label="Last Name" name="lastName" value={data.lastName} onChange={onChange} error={errors.lastName} placeholder="Smith" required />
      <MobileInput label="Email" type="email" name="email" value={data.email} onChange={onChange} error={errors.email} placeholder="sarah@example.com" required />
      <MobileInput label="Phone" name="phone" value={data.phone} onChange={onChange} error={errors.phone} placeholder="(604) 555-5678" required />
      <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
        <BirthdayOptIn
          value={birthday}
          onToggle={onBirthdayToggle}
          onChange={onBirthdayChange}
          errors={errors}
          compact
        />
      </div>
      {!isAuthenticated && (
        <>
          <div className="border-t border-stroke/30 px-4 py-3 dark:border-dark-3/30">
            <label className="flex items-center gap-3 text-sm text-body-color dark:text-dark-6">
              <input
                type="checkbox"
                name="saveCustomer"
                checked={data.saveCustomer}
                onChange={onChange}
                className="h-4 w-4 rounded border border-stroke text-primary focus:ring-primary"
              />
              Save details for next time
            </label>
          </div>
          {data.saveCustomer && (
            <MobileInput
              label="Create a password"
              type="password"
              name="password"
              value={data.password || ''}
              onChange={onChange}
              error={errors.password}
              placeholder="Minimum 8 characters"
              required
            />
          )}
        </>
      )}
    </div>
  </div>
);

MobileCustomerForm.propTypes = {
  data: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
};

export default MobileCustomerForm;
