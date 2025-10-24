import { useState, useEffect } from "react";
import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import InputField from "@shared/ui/forms/input/InputField";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import Button from "@shared/ui/components/ui/button/Button";
import Select from "@shared/ui/forms/Select"; 

// Same countries array as CustomerInfoCard
const countries = [
  { code: "CA", label: "+1" },
  { code: "US", label: "+1" },
  { code: "GB", label: "+44" },
  { code: "AU", label: "+61" },
];

interface StoreInfo {
  id?: string;
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
  timezone: string;
}

const StoreInfoCard = () => {
  const [formData, setFormData] = useState<StoreInfo>({
    storeName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    country: "CA",
    taxId: "",
    currency: "CAD",
    timezone: "America/Vancouver",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load store settings on mount
  useEffect(() => {
    loadStoreSettings();
  }, []);

  const loadStoreSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/store-info');
      if (response.ok) {
        const data = await response.json();
        // Ensure all values are strings, not undefined
        setFormData({
          storeName: data.storeName || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          country: data.country || "CA",
          taxId: data.taxId || "",
          currency: data.currency || "CAD",
          timezone: data.timezone || "America/Vancouver",
        });
      } else {
        console.error('Failed to load store settings');
      }
    } catch (error) {
      console.error('Failed to load store settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof StoreInfo, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddressSelect = (addressData: any) => {
    console.log('Address data received:', addressData);
    
    setFormData(prev => ({
      ...prev,
      address: addressData.address1 || addressData.street_number + ' ' + addressData.route || addressData.formatted_address || '',
      city: addressData.city || '',
      state: addressData.province || addressData.state || '',
      zipCode: addressData.postalCode || addressData.zipCode || '',
      country: addressData.country || "CA"
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/store-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        console.log('Store settings saved successfully');
        await loadStoreSettings();
      } else {
        console.error('Failed to save store settings');
      }
    } catch (error) {
      console.error('Error saving store settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currencyOptions = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "CAD", label: "CAD - Canadian Dollar" },
    { value: "EUR", label: "EUR - Euro" },
    { value: "GBP", label: "GBP - British Pound" },
  ];

  const timezoneOptions = [
    { value: "America/Vancouver", label: "Pacific Time (Vancouver, BC)" },
    { value: "America/Edmonton", label: "Mountain Time (Edmonton, AB)" },
    { value: "America/Winnipeg", label: "Central Time (Winnipeg, MB)" },
    { value: "America/Toronto", label: "Eastern Time (Toronto, ON)" },
    { value: "America/Halifax", label: "Atlantic Time (Halifax, NS)" },
    { value: "America/St_Johns", label: "Newfoundland Time (St. John's, NL)" },
    { value: "America/New_York", label: "US Eastern Time" },
    { value: "America/Chicago", label: "US Central Time" },
    { value: "America/Denver", label: "US Mountain Time" },
    { value: "America/Los_Angeles", label: "US Pacific Time" },
  ];

  if (isLoading) {
    return (
      <ComponentCardCollapsible title="Store Info" desc="Basic store information and settings">
        <div className="animate-pulse">Loading store settings...</div>
      </ComponentCardCollapsible>
    );
  }

  return (
    <ComponentCardCollapsible 
      title="Store Info" 
      desc="Basic store information and settings"
      defaultOpen={false}
    >
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
        <div>
          <Label htmlFor="storeName">Store Name</Label>
          <InputField
            type="text"
            id="storeName"
            value={formData.storeName}
            onChange={(e) => handleInputChange('storeName', e.target.value)}
            placeholder="Bloom Flower Shop"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(cleanedPhone) => handleInputChange('phone', cleanedPhone || "")}
              countries={countries}
              selectPosition="none"
              placeholder="(250) 555-1234"
            />
          </div>
          <div>
            <Label htmlFor="email">Email Address</Label>
            <InputField
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="info@bloomflowers.com"
              required
            />
          </div>
        </div>

<div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
    Store Address
  </label>
  <AddressAutocomplete
    onAddressSelect={handleAddressSelect}
    onChange={(value) => handleInputChange('address', value)}
    value={formData.address} // This line was missing!
    placeholder="Enter store address"
  />
</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <InputField
              type="text"
              id="city"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="state">State/Province</Label>
            <InputField
              type="text"
              id="state"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="zipCode">ZIP/Postal Code</Label>
            <InputField
              type="text"
              id="zipCode"
              value={formData.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <InputField
              type="text"
              id="country"
              value={formData.country}
              onChange={(e) => handleInputChange('country', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="taxId">Tax ID or Business Number</Label>
            <InputField
              type="text"
              id="taxId"
              value={formData.taxId}
              onChange={(e) => handleInputChange('taxId', e.target.value)}
              placeholder="123456789BC0001"
            />
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              options={currencyOptions}
              placeholder="Select Currency"
              value={formData.currency}
              onChange={(value) => handleInputChange('currency', value)}
              className="dark:bg-dark-900"
            />
          </div>
          <div>
            <Label htmlFor="timezone">Business Timezone</Label>
            <Select
              options={timezoneOptions}
              placeholder="Select Timezone"
              value={formData.timezone}
              onChange={(value) => handleInputChange('timezone', value)}
              className="dark:bg-dark-900"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-primary hover:bg-primary/90 text-white px-6 py-2"
          >
            {isSaving ? 'Saving...' : 'Save Store Info'}
          </Button>
        </div>
      </form>
    </ComponentCardCollapsible>
  );
};

export default StoreInfoCard;
