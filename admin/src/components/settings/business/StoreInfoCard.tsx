import { useState } from "react";
import ComponentCardCollapsible from "../../common/ComponentCardCollapsible";
import InputField from "../../form/input/InputField";
import AddressAutocomplete from "../../form/AddressAutocomplete";
import Button from "../../ui/button/Button";
import { STORE_CONFIG } from "../../../constants/config";

interface StoreInfo {
  storeName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  taxId: string;
  currency: string;
  logoUrl?: string;
}

const StoreInfoCard = () => {
  // Initialize with config values
  const [formData, setFormData] = useState<StoreInfo>(STORE_CONFIG);
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (field: keyof StoreInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressSelect = (addressData: any) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address,
      city: addressData.city,
      state: addressData.state,
      zipCode: addressData.zipCode,
      country: addressData.country || "CA"
    }));
  };

  const handleSave = () => {
    // For now, just show the values that need to be updated in config.ts
    console.log('Update config.ts with these values:');
    console.log(JSON.stringify(formData, null, 2));
    alert('Values logged to console. Update src/constants/config.ts manually with these values.');
    setIsEditing(false);
  };

  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
  ];

  return (
    <ComponentCardCollapsible 
      title="Store Info" 
      desc="Basic store information and settings"
      defaultOpen={false}
    >
      <div className="space-y-6">
        {!isEditing ? (
          // Display Mode
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Store Name
                </label>
                <p className="text-gray-900 dark:text-white">{formData.storeName}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <p className="text-gray-900 dark:text-white">{formData.phone}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <p className="text-gray-900 dark:text-white">{formData.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Currency
                </label>
                <p className="text-gray-900 dark:text-white">{formData.currency}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <p className="text-gray-900 dark:text-white">
                {formData.address}, {formData.city}, {formData.state} {formData.zipCode}, {formData.country}
              </p>
            </div>
            
            {formData.taxId && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax ID
                </label>
                <p className="text-gray-900 dark:text-white">{formData.taxId}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2"
              >
                Edit Store Info
              </Button>
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
            <InputField
              label="Store Name"
              type="text"
              value={formData.storeName}
              onChange={(e) => handleInputChange('storeName', e.target.value)}
              placeholder="Bloom Flower Shop"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Phone Number"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="(250) 555-1234"
                required
              />
              <InputField
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="info@bloomflowers.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Store Address
              </label>
              <AddressAutocomplete
                onAddressSelect={handleAddressSelect}
                defaultValue={formData.address}
                placeholder="Enter store address"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InputField
                label="City"
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                placeholder="City"
                required
              />
              <InputField
                label="State/Province"
                type="text"
                value={formData.state}
                onChange={(e) => handleInputChange('state', e.target.value)}
                placeholder="State"
                required
              />
              <InputField
                label="ZIP/Postal Code"
                type="text"
                value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="V2L 1A1"
                required
              />
              <InputField
                label="Country"
                type="text"
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="CA"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Tax ID / Business Number"
                type="text"
                value={formData.taxId}
                onChange={(e) => handleInputChange('taxId', e.target.value)}
                placeholder="123456789BC0001"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="w-full rounded-lg border border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-white disabled:border-gray-200 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                >
                  {currencyOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                onClick={() => {
                  setFormData(STORE_CONFIG); // Reset to original
                  setIsEditing(false);
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2"
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </ComponentCardCollapsible>
  );
};

export default StoreInfoCard;