import React from 'react';
import { SaveIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import PhoneInput from '@shared/ui/forms/PhoneInput';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';

interface CustomerEditModalProps {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  onChange: (customer: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  customer,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="First Name"
          type="text"
          value={customer.firstName}
          onChange={(e) => onChange({ ...customer, firstName: e.target.value })}
        />
        <InputField
          label="Last Name"
          type="text"
          value={customer.lastName}
          onChange={(e) => onChange({ ...customer, lastName: e.target.value })}
        />
      </div>

      <InputField
        label="Email"
        type="email"
        value={customer.email}
        onChange={(e) => onChange({ ...customer, email: e.target.value })}
      />

      <PhoneInput
        label="Phone"
        value={customer.phone || ''}
        onChange={(value) => onChange({ ...customer, phone: value })}
      />

      <FormFooter
        onCancel={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitIcon={<SaveIcon className="w-4 h-4" />}
      />
    </div>
  );
};

export default CustomerEditModal;