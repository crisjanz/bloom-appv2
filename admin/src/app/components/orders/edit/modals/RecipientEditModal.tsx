import React from 'react';
import { SaveIcon } from '@shared/assets/icons';
import InputField from '@shared/ui/forms/input/InputField';
import PhoneInput from '@shared/ui/forms/PhoneInput';
import Select from '@shared/ui/forms/Select';
import FormFooter from '@shared/ui/components/ui/form/FormFooter';
import AddressAutocomplete from '@shared/ui/forms/AddressAutocomplete';
import { ParsedAddress } from '@shared/utils/googlePlaces';

interface RecipientEditModalProps {
  recipient: {
    firstName: string;
    lastName: string;
    company?: string;
    phone: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
    addressType?: string;
  };
  onChange: (recipient: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const RecipientEditModal: React.FC<RecipientEditModalProps> = ({
  recipient,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  const addressTypeOptions = [
    { value: 'RESIDENCE', label: 'Residence' },
    { value: 'BUSINESS', label: 'Business' },
    { value: 'CHURCH', label: 'Church' },
    { value: 'SCHOOL', label: 'School' },
    { value: 'FUNERAL_HOME', label: 'Funeral Home' },
    { value: 'OTHER', label: 'Other' }
  ];

  const handleAddressSelect = (parsedAddress: ParsedAddress) => {
    onChange({
      ...recipient,
      address1: parsedAddress.address1,
      address2: parsedAddress.address2 || '',
      city: parsedAddress.city,
      province: parsedAddress.province,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country || recipient.country || 'CA'
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="First Name"
          type="text"
          value={recipient.firstName || ''}
          onChange={(e) => onChange({ ...recipient, firstName: e.target.value })}
        />
        <InputField
          label="Last Name"
          type="text"
          value={recipient.lastName || ''}
          onChange={(e) => onChange({ ...recipient, lastName: e.target.value })}
        />
      </div>

      <InputField
        label="Company (Optional)"
        type="text"
        value={recipient.company || ''}
        onChange={(e) => onChange({ ...recipient, company: e.target.value })}
      />

      <PhoneInput
        label="Phone"
        value={recipient.phone || ''}
        onChange={(value) => onChange({ ...recipient, phone: value })}
      />

      <Select
        label="Address Type"
        value={recipient.addressType || "RESIDENCE"}
        onChange={(value) => onChange({ ...recipient, addressType: value })}
        options={addressTypeOptions}
      />

      <AddressAutocomplete
        label="Address Line 1"
        value={recipient.address1 || ''}
        onChange={(value) => onChange({ ...recipient, address1: value })}
        onAddressSelect={handleAddressSelect}
        placeholder="Start typing an address"
      />

      <InputField
        label="Address Line 2 (Optional)"
        type="text"
        value={recipient.address2 || ''}
        onChange={(e) => onChange({ ...recipient, address2: e.target.value })}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InputField
          label="City"
          type="text"
          value={recipient.city || ''}
          onChange={(e) => onChange({ ...recipient, city: e.target.value })}
        />
        <InputField
          label="Province"
          type="text"
          value={recipient.province || ''}
          onChange={(e) => onChange({ ...recipient, province: e.target.value })}
        />
        <InputField
          label="Postal Code"
          type="text"
          value={recipient.postalCode || ''}
          onChange={(e) => onChange({ ...recipient, postalCode: e.target.value })}
        />
      </div>

      <FormFooter
        onCancel={onCancel}
        onSubmit={onSave}
        submitting={saving}
        submitIcon={<SaveIcon className="w-4 h-4" />}
      />
    </div>
  );
};

export default RecipientEditModal;
