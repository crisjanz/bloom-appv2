
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import Label from "@shared/ui/forms/Label";
import PhoneInput from "@shared/ui/forms/PhoneInput";
import Select from "@shared/ui/forms/Select";
import Switch from "@shared/ui/forms/switch/Switch";

interface CustomerInfoCardProps {
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    phoneLabel?: string;
    phoneNumbers?: Array<{ phone: string; label: string }>;
    notes?: string;
    isHouseAccount?: boolean;
    houseAccountTerms?: string;
    houseAccountNotes?: string;
  };
  onCustomerChange: (field: string, value: any) => void;
  error?: string;
}

const phoneLabelOptions = [
  { value: "Mobile", label: "Mobile" },
  { value: "Home", label: "Home" },
  { value: "Work", label: "Work" },
  { value: "Office", label: "Office" },
  { value: "Other", label: "Other" },
];

const houseAccountTermOptions = [
  { value: "NET_15", label: "NET 15" },
  { value: "NET_30", label: "NET 30" },
  { value: "NET_45", label: "NET 45" },
  { value: "NET_60", label: "NET 60" },
  { value: "DUE_ON_RECEIPT", label: "Due on Receipt" },
];

export default function CustomerInfoCard({
  customer,
  onCustomerChange,
  error,
}: CustomerInfoCardProps) {
  const handleAddPhone = () => {
    const phoneNumbers = Array.isArray(customer.phoneNumbers) ? customer.phoneNumbers : [];
    const updated = [...phoneNumbers, { phone: "", label: "Mobile" }];
    onCustomerChange("phoneNumbers", updated);
  };

  const handleRemovePhone = (index: number) => {
    const phoneNumbers = Array.isArray(customer.phoneNumbers) ? customer.phoneNumbers : [];
    const updated = phoneNumbers.filter((_, i) => i !== index);
    onCustomerChange("phoneNumbers", updated);
  };

  return (
    <ComponentCard title="Customer Information">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <InputField
            type="text"
            id="firstName"
            placeholder="Enter first name"
            value={customer.firstName}
            onChange={(e) => onCustomerChange("firstName", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
            required
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <InputField
            type="text"
            id="lastName"
            placeholder="Enter last name"
            value={customer.lastName}
            onChange={(e) => onCustomerChange("lastName", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
            required
          />
        </div>
      </div>

      {/* Email and Primary Phone in Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6">
          <Label htmlFor="email">Email</Label>
          <InputField
            type="email"
            id="email"
            placeholder="Enter email address"
            value={customer.email || ""}
            onChange={(e) => onCustomerChange("email", e.target.value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
          />
        </div>

        <div className="md:col-span-4">
          <PhoneInput
            label="Phone*"
            value={customer.phone || ""}
            onChange={(cleanedPhone) => onCustomerChange("phone", cleanedPhone)}
            placeholder="(250) 301-5062"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="phoneLabel">Type</Label>
          <Select
            options={phoneLabelOptions}
            value={customer.phoneLabel || "Mobile"}
            onChange={(value) => onCustomerChange("phoneLabel", value)}
            placeholder="Type"
          />
        </div>
      </div>

      {/* Additional Phone Numbers */}
      {Array.isArray(customer.phoneNumbers) && customer.phoneNumbers.map((phoneObj, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6"></div>
          <div className="md:col-span-4">
            <PhoneInput
              label=""
              value={phoneObj.phone || ""}
              onChange={(cleanedPhone) => {
                const updated = [...customer.phoneNumbers];
                updated[index] = { ...updated[index], phone: cleanedPhone };
                onCustomerChange("phoneNumbers", updated);
              }}
              placeholder="(250) 301-5062"
            />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Select
              options={phoneLabelOptions}
              value={phoneObj.label}
              onChange={(value) => {
                const updated = [...customer.phoneNumbers];
                updated[index] = { ...updated[index], label: value };
                onCustomerChange("phoneNumbers", updated);
              }}
              placeholder="Type"
            />
            <button
              type="button"
              onClick={() => handleRemovePhone(index)}
              className="p-1 rounded-full text-red-400 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Remove phone"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}

      {/* Add Phone Link */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-6"></div>
        <div className="md:col-span-6">
          <button
            type="button"
            onClick={handleAddPhone}
            className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-[#7a9bb0] dark:hover:text-brand-500"
          >
            + Phone
          </button>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          placeholder="Enter any notes about the customer"
          value={customer.notes || ""}
          onChange={(value) => onCustomerChange("notes", value)}
          className="focus:border-brand-500 focus:ring-brand-500/20"
          rows={3}
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-800 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">House Account</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Enable to allow house account payments.</p>
          </div>
          <Switch
            label="Enabled"
            checked={Boolean(customer.isHouseAccount)}
            onChange={(value) => onCustomerChange("isHouseAccount", value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Terms"
            options={houseAccountTermOptions}
            value={customer.houseAccountTerms || "NET_30"}
            onChange={(value) => onCustomerChange("houseAccountTerms", value)}
            allowCustomValue
            customOptionLabel="Custom terms"
            disabled={!customer.isHouseAccount}
          />
        </div>

        <div>
          <Label htmlFor="houseAccountNotes">House Account Notes</Label>
          <TextArea
            placeholder="Internal notes for house account billing"
            value={customer.houseAccountNotes || ""}
            onChange={(value) => onCustomerChange("houseAccountNotes", value)}
            className="focus:border-brand-500 focus:ring-brand-500/20"
            rows={3}
            disabled={!customer.isHouseAccount}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
