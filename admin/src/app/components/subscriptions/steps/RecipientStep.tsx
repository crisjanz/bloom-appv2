import { useState, useEffect } from 'react';
import InputField from '@shared/ui/forms/input/InputField';
import PhoneInput from '@shared/ui/forms/PhoneInput';
import Select from '@shared/ui/forms/Select';
import AddressAutocomplete from '@shared/ui/forms/AddressAutocomplete';
import { ParsedAddress } from '@shared/utils/googlePlaces';
import { useApiClient } from '@shared/hooks/useApiClient';

interface RecipientData {
  recipientName: string;
  recipientPhone: string;
  recipientEmail: string;
  recipientAddress: string;
  recipientCity: string;
  recipientProvince: string;
  recipientPostalCode: string;
}

interface SavedRecipient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  primaryAddress?: {
    address1: string;
    city: string;
    province: string;
    postalCode: string;
  } | null;
}

interface Props {
  data: RecipientData;
  onChange: (data: RecipientData) => void;
  customerName?: string;
  customerId?: string | null;
}

const PROVINCES = [
  { value: 'BC', label: 'British Columbia' },
  { value: 'AB', label: 'Alberta' },
  { value: 'SK', label: 'Saskatchewan' },
  { value: 'MB', label: 'Manitoba' },
  { value: 'ON', label: 'Ontario' },
  { value: 'QC', label: 'Quebec' },
  { value: 'NB', label: 'New Brunswick' },
  { value: 'NS', label: 'Nova Scotia' },
  { value: 'PE', label: 'Prince Edward Island' },
  { value: 'NL', label: 'Newfoundland and Labrador' },
  { value: 'YT', label: 'Yukon' },
  { value: 'NT', label: 'Northwest Territories' },
  { value: 'NU', label: 'Nunavut' },
];

export default function RecipientStep({ data, onChange, customerName, customerId }: Props) {
  const apiClient = useApiClient();
  const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    if (!customerId) {
      setSavedRecipients([]);
      return;
    }
    setLoadingRecipients(true);
    apiClient.get(`/api/customers/${customerId}/recipients`)
      .then(({ data: recipients }) => {
        setSavedRecipients(Array.isArray(recipients) ? recipients : []);
      })
      .catch(() => setSavedRecipients([]))
      .finally(() => setLoadingRecipients(false));
  }, [customerId, apiClient]);

  const update = (field: keyof RecipientData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleSameAsCustomer = () => {
    if (customerName) {
      onChange({ ...data, recipientName: customerName });
    }
  };

  const handleSelectRecipient = (r: SavedRecipient) => {
    onChange({
      recipientName: `${r.firstName} ${r.lastName}`.trim(),
      recipientPhone: r.phone || '',
      recipientEmail: r.email || '',
      recipientAddress: r.primaryAddress?.address1 || '',
      recipientCity: r.primaryAddress?.city || '',
      recipientProvince: r.primaryAddress?.province || 'BC',
      recipientPostalCode: r.primaryAddress?.postalCode || '',
    });
  };

  const handleAddressSelect = (parsed: ParsedAddress) => {
    onChange({
      ...data,
      recipientAddress: parsed.address1,
      recipientCity: parsed.city || data.recipientCity,
      recipientProvince: parsed.province || data.recipientProvince,
      recipientPostalCode: parsed.postalCode || data.recipientPostalCode,
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 2: Recipient</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">Who will be receiving the flowers?</p>

      {/* Quick fill buttons */}
      <div className="flex flex-wrap gap-2">
        {customerName && (
          <button
            type="button"
            onClick={handleSameAsCustomer}
            className="text-sm text-brand-500 hover:text-brand-600 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg"
          >
            Same as customer ({customerName})
          </button>
        )}
      </div>

      {/* Saved recipients */}
      {loadingRecipients && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-500"></div>
          Loading saved recipients...
        </div>
      )}
      {savedRecipients.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Saved Recipients</p>
          <div className="flex flex-wrap gap-2">
            {savedRecipients.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleSelectRecipient(r)}
                className="text-left border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {r.firstName} {r.lastName}
                </div>
                {r.primaryAddress && (
                  <div className="text-xs text-gray-500 truncate max-w-[200px]">
                    {r.primaryAddress.address1}, {r.primaryAddress.city}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Recipient Name *"
          value={data.recipientName || ''}
          onChange={(e) => update('recipientName', e.target.value)}
          placeholder="Full name"
        />
        <PhoneInput
          label="Phone"
          value={data.recipientPhone || ''}
          onChange={(value) => update('recipientPhone', value)}
        />
      </div>

      <InputField
        label="Email"
        type="email"
        value={data.recipientEmail || ''}
        onChange={(e) => update('recipientEmail', e.target.value)}
        placeholder="recipient@email.com"
      />

      <AddressAutocomplete
        label="Delivery Address *"
        value={data.recipientAddress || ''}
        onChange={(val) => update('recipientAddress', val)}
        onAddressSelect={handleAddressSelect}
        placeholder="Start typing address..."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <InputField
          label="City *"
          value={data.recipientCity || ''}
          onChange={(e) => update('recipientCity', e.target.value)}
        />
        <Select
          label="Province"
          value={data.recipientProvince || 'BC'}
          options={PROVINCES}
          onChange={(val) => update('recipientProvince', val)}
        />
        <InputField
          label="Postal Code *"
          value={data.recipientPostalCode || ''}
          onChange={(e) => update('recipientPostalCode', e.target.value.toUpperCase())}
          placeholder="V6A 1A1"
        />
      </div>
    </div>
  );
}
