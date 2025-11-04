
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import Label from "@shared/ui/forms/Label";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import Select from "@shared/ui/forms/Select";

interface CustomerInfoCardProps {
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    phoneLabel?: string;
    phoneNumbers?: Array<{ phone: string; label: string }>;
    notes?: string;
  };
  onCustomerChange: (field: string, value: any) => void;
  error?: string;
}

const countries = [
  { code: "CA", label: "+1" },
  { code: "US", label: "+1" },
  { code: "GB", label: "+44" },
  { code: "AU", label: "+61" },
];

const phoneLabelOptions = [
  { value: "Mobile", label: "Mobile" },
  { value: "Home", label: "Home" },
  { value: "Work", label: "Work" },
  { value: "Office", label: "Office" },
  { value: "Other", label: "Other" },
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
            className="focus:border-[#597485] focus:ring-[#597485]/20"
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
            className="focus:border-[#597485] focus:ring-[#597485]/20"
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
            className="focus:border-[#597485] focus:ring-[#597485]/20"
          />
        </div>

        <div className="md:col-span-4">
          <Label htmlFor="phone">Phone*</Label>
          <PhoneInput
            type="tel"
            id="phone"
            value={customer.phone || ""}
            onChange={(cleanedPhone) => onCustomerChange("phone", cleanedPhone)}
            countries={countries}
            selectPosition="none"
            placeholder="Phone"
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
            <InputField
              type="tel"
              value={phoneObj.phone}
              onChange={(e) => {
                const updated = [...customer.phoneNumbers];
                updated[index] = { ...updated[index], phone: e.target.value };
                onCustomerChange("phoneNumbers", updated);
              }}
              placeholder="Phone"
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
              className="text-red-600 hover:text-red-700 dark:text-red-400"
              title="Remove phone"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="text-sm font-medium text-[#597485] hover:text-[#4e6575] dark:text-[#7a9bb0] dark:hover:text-[#597485]"
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
          className="focus:border-[#597485] focus:ring-[#597485]/20"
          rows={3}
        />
      </div>
    </ComponentCard>
  );
}