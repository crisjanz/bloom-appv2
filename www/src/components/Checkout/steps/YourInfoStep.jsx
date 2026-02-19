import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import BirthdayOptIn from '../../Checkouts/BirthdayOptIn.jsx';
import AddressAutocomplete from '../../AddressAutocomplete.jsx';
import { InputGroup, SelectGroup, CheckboxGroup } from '../shared/DesktopInputs';
import { provinceOptions } from '../shared/constants';

const YourInfoStep = ({
  customer,
  errors,
  onCustomerChange,
  onBillingAddressSelect,
  birthday,
  onBirthdayToggle,
  onBirthdayChange,
  isAuthenticated,
  showOptionalMessageLink,
  onOpenCardMessageStep,
  onBack,
  onContinue,
}) => {
  const handleBillingAddressLineChange = (event) => {
    onCustomerChange({
      target: {
        name: 'billingAddress1',
        value: event.target.value,
        type: 'text',
      },
    });
  };

  return (
    <div className="space-y-6">
      {showOptionalMessageLink && (
        <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-dark dark:text-white">
          <button
            type="button"
            onClick={onOpenCardMessageStep}
            className="font-semibold text-primary hover:underline"
          >
            Want to add a card message?
          </button>
        </div>
      )}

      <div>
        <h2 className="text-xl font-semibold text-dark dark:text-white">Buyer Information</h2>
        <p className="mt-1 text-sm text-body-color dark:text-dark-6">
          Enter your contact and billing details for this order.
        </p>
      </div>

      <div className="-mx-3 flex flex-wrap">
        <InputGroup
          labelTitle="First name"
          type="text"
          name="firstName"
          value={customer.firstName || ''}
          onChange={onCustomerChange}
          error={errors.firstName}
          required
        />
        <InputGroup
          labelTitle="Last name"
          type="text"
          name="lastName"
          value={customer.lastName || ''}
          onChange={onCustomerChange}
          error={errors.lastName}
          required
        />
        <InputGroup
          labelTitle="Email"
          type="email"
          name="email"
          value={customer.email || ''}
          onChange={onCustomerChange}
          error={errors.email}
          required
        />
        <InputGroup
          labelTitle="Phone"
          type="text"
          name="phone"
          value={customer.phone || ''}
          onChange={onCustomerChange}
          error={errors.phone}
          required
        />

        <div className="w-full px-3">
          <AddressAutocomplete
            label="Billing street"
            value={customer.billingAddress1 || ''}
            onChange={handleBillingAddressLineChange}
            onAddressSelect={onBillingAddressSelect}
            inputClassName="border rounded-md border-stroke px-5 py-3 text-body-color placeholder:text-body-color/70 focus:border-primary dark:border-dark-3 dark:text-dark-6"
          />
          {errors.billingAddress1 && <p className="mt-1 text-sm text-red-500">{errors.billingAddress1}</p>}
        </div>

        <InputGroup
          fullColumn
          labelTitle="Apartment / Suite"
          type="text"
          name="billingAddress2"
          value={customer.billingAddress2 || ''}
          onChange={onCustomerChange}
        />
        <InputGroup
          labelTitle="City"
          type="text"
          name="billingCity"
          value={customer.billingCity || ''}
          onChange={onCustomerChange}
          error={errors.billingCity}
          required
        />
        <SelectGroup
          labelTitle="Province"
          name="billingProvince"
          value={customer.billingProvince || 'BC'}
          onChange={onCustomerChange}
          options={provinceOptions}
          required
        />
        <InputGroup
          labelTitle="Postal code"
          type="text"
          name="billingPostalCode"
          value={customer.billingPostalCode || ''}
          onChange={onCustomerChange}
          error={errors.billingPostalCode}
          required
        />

        <div className="w-full px-3">
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
              labelTitle="Create an account for faster checkout"
              name="saveCustomer"
              checked={Boolean(customer.saveCustomer)}
              onChange={onCustomerChange}
            />
            {customer.saveCustomer && (
              <InputGroup
                fullColumn
                labelTitle="Create a password"
                type="password"
                name="password"
                value={customer.password || ''}
                onChange={onCustomerChange}
                error={errors.password}
                required
              />
            )}

            <div className="w-full px-3">
              <p className="text-sm text-body-color dark:text-dark-6">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-stroke px-6 py-3 text-sm font-semibold text-dark transition hover:border-primary hover:text-primary dark:border-dark-3 dark:text-white"
        >
          Back
        </button>
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

YourInfoStep.propTypes = {
  customer: PropTypes.object.isRequired,
  errors: PropTypes.object.isRequired,
  onCustomerChange: PropTypes.func.isRequired,
  onBillingAddressSelect: PropTypes.func.isRequired,
  birthday: PropTypes.object.isRequired,
  onBirthdayToggle: PropTypes.func.isRequired,
  onBirthdayChange: PropTypes.func.isRequired,
  isAuthenticated: PropTypes.bool.isRequired,
  showOptionalMessageLink: PropTypes.bool.isRequired,
  onOpenCardMessageStep: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  onContinue: PropTypes.func.isRequired,
};

export default YourInfoStep;
