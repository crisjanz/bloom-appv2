import { useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import Select from "@shared/ui/forms/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@shared/ui/components/ui/table";
import { ParsedAddress } from "@shared/utils/googlePlaces";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";

interface Address {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string; // 🆕 Add country field
  phone?: string;
  company?: string;
}

interface AdditionalAddressesCardProps {
  addresses: Address[];
  onAddAddress: (address: Omit<Address, "id">) => void;
  onUpdateAddress: (addressId: string, address: Omit<Address, "id">) => void;
  onDeleteAddress: (addressId: string) => void;
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

// 🆕 Add international countries
const countryOptions = [
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "AU", label: "Australia" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "CH", label: "Switzerland" },
  { value: "AT", label: "Austria" },
  { value: "BE", label: "Belgium" },
  { value: "IE", label: "Ireland" },
  { value: "PT", label: "Portugal" },
  { value: "GR", label: "Greece" },
  { value: "PL", label: "Poland" },
  { value: "CZ", label: "Czech Republic" },
  { value: "HU", label: "Hungary" },
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" },
  { value: "IN", label: "India" },
  { value: "BR", label: "Brazil" },
  { value: "MX", label: "Mexico" },
  { value: "AR", label: "Argentina" },
  { value: "CL", label: "Chile" },
  { value: "ZA", label: "South Africa" },
  { value: "EG", label: "Egypt" },
  { value: "MA", label: "Morocco" },
  { value: "NG", label: "Nigeria" },
  { value: "KE", label: "Kenya" },
  { value: "GH", label: "Ghana" },
  // Add more countries as needed
];

export default function AdditionalAddressesCard({
  addresses,
  onAddAddress,
  onUpdateAddress,
  onDeleteAddress,
}: AdditionalAddressesCardProps) {
  const [newAddress, setNewAddress] = useState<Omit<Address, "id">>({
    firstName: "",
    lastName: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
    country: "CA", // 🆕 Default to Canada
    phone: "",
    company: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddressChange = (field: keyof typeof newAddress, value: string) => {
    setNewAddress(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = (parsedAddress: ParsedAddress) => {
    setNewAddress(prev => ({
      ...prev,
      address1: parsedAddress.address1,
      address2: parsedAddress.address2 || "",
      city: parsedAddress.city,
      province: parsedAddress.province,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country || "CA", // 🆕 Set country from autocomplete
    }));
  };

  const handleSubmit = () => {
    if (!newAddress.firstName.trim() || !newAddress.lastName.trim() || !newAddress.address1.trim()) {
      alert("Please fill in required fields: First Name, Last Name, and Address");
      return;
    }

    if (editingId) {
      // Update existing address
      onUpdateAddress(editingId, newAddress);
      setEditingId(null);
    } else {
      // Add new address
      onAddAddress(newAddress);
    }
    
    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setNewAddress({
      firstName: "",
      lastName: "",
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "CA", // 🆕 Reset to default country
      phone: "",
      company: "",
    });
    setEditingId(null);
  };

  const handleEdit = (address: Address) => {
    setNewAddress({
      firstName: address.firstName,
      lastName: address.lastName,
      address1: address.address1,
      address2: address.address2 || "",
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      country: address.country || "CA", // 🆕 Include country in edit
      phone: address.phone || "",
      company: address.company || "",
    });
    setEditingId(address.id);
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <ComponentCard title="Additional Addresses">
      {/* Add/Edit Address Form */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {editingId ? "Edit Address" : "Add New Address"}
          </h4>
          {editingId && (
            <button
              onClick={handleCancel}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel Edit
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="newFirstName">First Name</Label>
            <InputField
              type="text"
              id="newFirstName"
              placeholder="Enter first name"
              value={newAddress.firstName}
              onChange={(e) => handleAddressChange("firstName", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newLastName">Last Name</Label>
            <InputField
              type="text"
              id="newLastName"
              placeholder="Enter last name"
              value={newAddress.lastName}
              onChange={(e) => handleAddressChange("lastName", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newAddress1">Address Line 1</Label>
            <AddressAutocomplete
              id="newAddress1"
              value={newAddress.address1}
              onChange={(value) => handleAddressChange("address1", value)}
              onAddressSelect={handleAddressSelect}
              placeholder="Enter street address"
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newAddress2">Address Line 2</Label>
            <InputField
              type="text"
              id="newAddress2"
              placeholder="Apartment, suite, unit, etc."
              value={newAddress.address2}
              onChange={(e) => handleAddressChange("address2", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newCity">City</Label>
            <InputField
              type="text"
              id="newCity"
              placeholder="Enter city"
              value={newAddress.city}
              onChange={(e) => handleAddressChange("city", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newProvince">Province/State</Label>
            <InputField
              type="text"
              id="newProvince"
              placeholder="Enter province or state"
              value={newAddress.province}
              onChange={(e) => handleAddressChange("province", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
          
          <div>
            <Label htmlFor="newPostalCode">Postal/Zip Code</Label>
            <InputField
              type="text"
              id="newPostalCode"
              placeholder="Enter postal or zip code"
              value={newAddress.postalCode}
              onChange={(e) => handleAddressChange("postalCode", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>

          {/* 🆕 Country Field */}
          <div>
            <Label htmlFor="newCountry">Country</Label>
            <Select
              options={countryOptions}
              value={newAddress.country}
              placeholder="Select Country"
              onChange={(value) => handleAddressChange("country", value)}
            />
          </div>
          
<div>
  <Label htmlFor="newPhone">Phone</Label>
  <PhoneInput
    type="tel"
    id="newPhone"
    value={newAddress.phone || ""}
    onChange={(cleanedPhone) => handleAddressChange("phone", cleanedPhone)}
    countries={[
      { code: "CA", label: "+1" },
      { code: "US", label: "+1" },
      { code: "GB", label: "+44" },
      { code: "AU", label: "+61" },
      { code: "DE", label: "+49" },
      { code: "FR", label: "+33" },
    ]}
    selectPosition="start"
    placeholder="+1 (555) 000-0000"
  />
</div>

          {/* 🆕 Company Field */}
          <div>
            <Label htmlFor="newCompany">Company</Label>
            <InputField
              type="text"
              id="newCompany"
              placeholder="Enter company name"
              value={newAddress.company}
              onChange={(e) => handleAddressChange("company", e.target.value)}
              className="focus:border-[#597485] focus:ring-[#597485]/20"
            />
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 py-2 text-sm font-medium text-white hover:bg-[#4e6575]"
          >
            {editingId ? "Update Address" : "+ Add Address"}
          </button>
          
          {editingId && (
            <button
              onClick={handleCancel}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Addresses Table */}
      {addresses.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Name
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Address
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Country
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Phone
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {addresses.map((addr) => (
                  <TableRow key={addr.id} className={editingId === addr.id ? "bg-blue-50 dark:bg-blue-900/20" : ""}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="font-medium text-gray-800 text-theme-sm dark:text-white/90">
                        {addr.firstName} {addr.lastName}
                      </span>
                      {addr.company && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {addr.company}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {addr.address1}{addr.address2 && `, ${addr.address2}`}
                        <br />
                        {addr.city}, {addr.province} {addr.postalCode}
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {countryOptions.find(c => c.value === addr.country)?.label || addr.country}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {addr.phone || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(addr)}
                          disabled={editingId === addr.id}
                          className={`text-sm font-medium hover:underline ${
                            editingId === addr.id 
                              ? "text-gray-400 cursor-not-allowed" 
                              : "text-[#597485] hover:text-[#4e6575]"
                          }`}
                        >
                          {editingId === addr.id ? "Editing" : "Edit"}
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={() => onDeleteAddress(addr.id)}
                          disabled={editingId === addr.id}
                          className={`text-sm font-medium hover:underline ${
                            editingId === addr.id 
                              ? "text-gray-400 cursor-not-allowed" 
                              : "text-red-600 hover:text-red-500"
                          }`}
                        >
                          Delete
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">No additional addresses added yet.</p>
      )}
    </ComponentCard>
  );
}