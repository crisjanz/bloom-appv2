
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import Select from "@shared/ui/forms/Select";
import PhoneInput from "@shared/ui/forms/PhoneInput";
import { ParsedAddress } from "@shared/utils/googlePlaces";

interface PrimaryAddressCardProps {
  primaryAddress?: {
    id?: string;
    attention?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    phone?: string;
    country?: string;
    addressType?: string;
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

const countryOptions = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
];

const addressTypeOptions = [
  { value: "RESIDENCE", label: "Residence" },
  { value: "BUSINESS", label: "Business" },
  { value: "HOSPITAL", label: "Hospital" },
  { value: "FUNERAL_HOME", label: "Funeral Home" },
  { value: "CHURCH", label: "Church" },
  { value: "SCHOOL", label: "School" },
  { value: "OTHER", label: "Other" },
];

export default function PrimaryAddressCard({
  primaryAddress,
  onAddressChange,
  onAddressSelect,
}: PrimaryAddressCardProps) {
  return (
    <ComponentCard title="Primary Address">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <InputField
            label="Attention (optional)"
            type="text"
            id="attention"
            placeholder="e.g., Reception, Attn: John Doe"
            value={primaryAddress?.attention || ""}
            onChange={(e) => onAddressChange("attention", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryAddress1">Address Line 1</Label>
          <AddressAutocomplete
            id="primaryAddress1"
            value={primaryAddress?.address1 || ""}
            onChange={(value) => onAddressChange("address1", value)}
            onAddressSelect={(parsedAddress) => {
              onAddressSelect(parsedAddress);
              if (parsedAddress.country) {
                onAddressChange("country", parsedAddress.country);
              }
            }}
            placeholder="Enter street address"
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryAddress2">Address Line 2</Label>
          <InputField
            type="text"
            id="primaryAddress2"
            placeholder="Apartment, suite, unit, etc."
            value={primaryAddress?.address2 || ""}
            onChange={(e) => onAddressChange("address2", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryCity">City</Label>
          <InputField
            type="text"
            id="primaryCity"
            placeholder="Enter city"
            value={primaryAddress?.city || ""}
            onChange={(e) => onAddressChange("city", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryProvince">Province/State</Label>
          <InputField
            type="text"
            id="primaryProvince"
            placeholder="Enter province or state"
            value={primaryAddress?.province || ""}
            onChange={(e) => onAddressChange("province", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryPostalCode">Postal/Zip Code</Label>
          <InputField
            type="text"
            id="primaryPostalCode"
            placeholder="Enter postal or zip code"
            value={primaryAddress?.postalCode || ""}
            onChange={(e) => onAddressChange("postalCode", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div>
          <Label htmlFor="primaryCountry">Country</Label>
          <Select
            options={countryOptions}
            value={primaryAddress?.country || "CA"}
            placeholder="Select Country"
            onChange={(value) => onAddressChange("country", value)}
          />
        </div>

        <div>
          <Label htmlFor="primaryAddressType">Address Type</Label>
          <Select
            options={addressTypeOptions}
            value={primaryAddress?.addressType || "RESIDENCE"}
            placeholder="Select Address Type"
            onChange={(value) => onAddressChange("addressType", value)}
          />
        </div>

        <div className="md:col-span-2">
          <PhoneInput
            label="Phone"
            value={primaryAddress?.phone || ""}
            onChange={(cleanedPhone) => onAddressChange("phone", cleanedPhone)}
            placeholder="(250) 301-5062"
          />
        </div>
      </div>
    </ComponentCard>
  );
}
