
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import Select from "@shared/ui/forms/Select";
import PhoneInput from "@shared/ui/forms/PhoneInput";
import { ParsedAddress } from "@shared/utils/googlePlaces";

interface HomeAddressCardProps {
  homeAddress?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    country?: string; // Add this
  };
  onAddressChange: (field: string, value: string) => void;
  onAddressSelect: (address: ParsedAddress) => void;
}

const provinceOptions = [
  { value: "BC", label: "British Columbia" },
  { value: "AB", label: "Alberta" },
  { value: "SK", label: "Saskatchewan" },
  { value: "MB", label: "Manitoba" },
  { value: "ON", label: "Ontario" },
  { value: "QC", label: "Quebec" },
  { value: "NB", label: "New Brunswick" },
  { value: "NS", label: "Nova Scotia" },
  { value: "PE", label: "Prince Edward Island" },
  { value: "NL", label: "Newfoundland and Labrador" },
  { value: "YT", label: "Yukon" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
];

// Add international countries for future use
const countryOptions = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  // Add more countries as needed
];

export default function HomeAddressCard({
  homeAddress,
  onAddressChange,
  onAddressSelect,
}: HomeAddressCardProps) {
  return (
    <ComponentCard title="Home Address">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="homeAddress1">Address Line 1</Label>
          <AddressAutocomplete
            id="homeAddress1"
            value={homeAddress?.address1 || ""}
            onChange={(value) => onAddressChange("address1", value)}
            onAddressSelect={(parsedAddress) => {
              onAddressSelect(parsedAddress);
              // Also set the country when address is selected
              if (parsedAddress.country) {
                onAddressChange("country", parsedAddress.country);
              }
            }}
            placeholder="Enter street address"
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>
        
        <div>
          <Label htmlFor="homeAddress2">Address Line 2</Label>
          <InputField
            type="text"
            id="homeAddress2"
            placeholder="Apartment, suite, unit, etc."
            value={homeAddress?.address2 || ""}
            onChange={(e) => onAddressChange("address2", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>
        
        <div>
          <Label htmlFor="homeCity">City</Label>
          <InputField
            type="text"
            id="homeCity"
            placeholder="Enter city"
            value={homeAddress?.city || ""}
            onChange={(e) => onAddressChange("city", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>
        
        <div>
          <Label htmlFor="homeProvince">Province/State</Label>
          <InputField
            type="text"
            id="homeProvince"
            placeholder="Enter province or state"
            value={homeAddress?.province || ""}
            onChange={(e) => onAddressChange("province", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>
        
        <div>
          <Label htmlFor="homePostalCode">Postal/Zip Code</Label>
          <InputField
            type="text"
            id="homePostalCode"
            placeholder="Enter postal or zip code"
            value={homeAddress?.postalCode || ""}
            onChange={(e) => onAddressChange("postalCode", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>
        
        <div>
          <Label htmlFor="homeCountry">Country</Label>
          <Select
            options={countryOptions}
            value={homeAddress?.country || "CA"}
            placeholder="Select Country"
            onChange={(value) => onAddressChange("country", value)}
          />
        </div>
        
        <div className="md:col-span-2">
          <PhoneInput
            label="Phone"
            value={homeAddress?.phone || ""}
            onChange={(cleanedPhone) => onAddressChange("phone", cleanedPhone)}
            placeholder="(250) 301-5062"
          />
        </div>
      </div>
    </ComponentCard>
  );
}