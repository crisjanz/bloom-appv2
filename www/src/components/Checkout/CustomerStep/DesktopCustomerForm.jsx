import PropTypes from "prop-types";
import BirthdayOptIn from "../../../components/Checkouts/BirthdayOptIn.jsx";
import { InputGroup, CheckboxGroup } from "../shared/DesktopInputs";

const DesktopCustomerForm = ({ data, onChange, errors, birthday, onBirthdayToggle, onBirthdayChange, isAuthenticated }) => (
  <>
    <InputGroup
      labelTitle="First Name"
      type="text"
      placeholder="Your first name"
      name="firstName"
      value={data.firstName}
      onChange={onChange}
      error={errors.firstName}
      required
    />
    <InputGroup
      labelTitle="Last Name"
      type="text"
      placeholder="Your last name"
      name="lastName"
      value={data.lastName}
      onChange={onChange}
      error={errors.lastName}
      required
    />
    <InputGroup
      labelTitle="Email"
      type="email"
      placeholder="you@example.com"
      name="email"
      value={data.email}
      onChange={onChange}
      error={errors.email}
      required
    />
    <InputGroup
      labelTitle="Phone"
      type="text"
      placeholder="Your phone"
      name="phone"
      value={data.phone}
      onChange={onChange}
      error={errors.phone}
      required
    />
    <div className="px-3">
      <BirthdayOptIn
        value={birthday}
        onToggle={onBirthdayToggle}
        onChange={onBirthdayChange}
        errors={errors}
      />
    </div>
    {!isAuthenticated && (
      <>
        <CheckboxGroup
          labelTitle="Save my information for future orders"
          name="saveCustomer"
          checked={data.saveCustomer}
          onChange={onChange}
        />
        {data.saveCustomer && (
          <InputGroup
            labelTitle="Create a password"
            type="password"
            placeholder="Minimum 8 characters"
            name="password"
            value={data.password || ''}
            onChange={onChange}
            error={errors.password}
            fullColumn
            required
          />
        )}
      </>
    )}
  </>
);

DesktopCustomerForm.propTypes = {
  data: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  errors: PropTypes.object.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
};

export default DesktopCustomerForm;
