import React from "react";
import ComponentCard from "../../common/ComponentCard";
import InputField from "../../form/input/InputField";
import TextArea from "../../form/input/TextArea";
import Label from "../../form/Label";
import PhoneInput from "../../form/group-input/PhoneInput";

interface CustomerInfoCardProps {
  customer: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
  onCustomerChange: (field: string, value: string) => void;
  error?: string;
}

const countries = [
  { code: "CA", label: "+1" },
  { code: "US", label: "+1" },
  { code: "GB", label: "+44" },
  { code: "AU", label: "+61" },
];

export default function CustomerInfoCard({
  customer,
  onCustomerChange,
  error,
}: CustomerInfoCardProps) {
  return (
    <ComponentCard title="Customer Information">
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
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
          <Label htmlFor="lastName">Last Name</Label>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
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
        
        <div>
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput
            type="tel"
            id="phone"
            value={customer.phone || ""}
            onChange={(cleanedPhone) => onCustomerChange("phone", cleanedPhone)}
            countries={countries}
            selectPosition="none"
            placeholder="(555) 000-0000"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <TextArea
          id="notes"
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