import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "@shared/ui/components/ui/modal";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import { ParsedAddress } from "@shared/utils/googlePlaces";
import { Address } from "@shared/types/customer";

export interface AddressFormValues {
  id?: string;
  label?: string;
  firstName?: string; // Optional - auto-populated from Customer
  lastName?: string;  // Optional - auto-populated from Customer
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  company?: string;
  addressType?: string;
}

interface AddAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: AddressFormValues) => Promise<void> | void;
  initialAddress?: Address | null;
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
  { value: "IT", label: "Italy" },
  { value: "ES", label: "Spain" },
  { value: "NL", label: "Netherlands" },
  { value: "SE", label: "Sweden" },
  { value: "NO", label: "Norway" },
  { value: "DK", label: "Denmark" },
  { value: "FI", label: "Finland" },
  { value: "JP", label: "Japan" },
];

const addressTypeOptions = [
  { value: "RESIDENCE", label: "Residence" },
  { value: "BUSINESS", label: "Business" },
  { value: "CHURCH", label: "Church" },
  { value: "SCHOOL", label: "School" },
  { value: "FUNERAL_HOME", label: "Funeral Home" },
  { value: "OTHER", label: "Other" },
];

const phoneCountries = [
  { code: "CA", label: "+1" },
  { code: "US", label: "+1" },
  { code: "GB", label: "+44" },
  { code: "AU", label: "+61" },
  { code: "DE", label: "+49" },
  { code: "FR", label: "+33" },
];

const presetLabels = [
  { value: "Home", label: "Home" },
  { value: "Office", label: "Office" },
  { value: "Work", label: "Work" },
  { value: "Mom's House", label: "Mom's House" },
  { value: "Dad's House", label: "Dad's House" },
  { value: "Cottage", label: "Cottage" },
];

const emptyForm: AddressFormValues = {
  label: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
  phone: "",
  company: "",
  addressType: "RESIDENCE",
};

export default function AddAddressModal({
  isOpen,
  onClose,
  onSave,
  initialAddress,
}: AddAddressModalProps) {
  const [form, setForm] = useState<AddressFormValues>(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEditMode = Boolean(initialAddress?.id);

  useEffect(() => {
    if (isOpen) {
      if (initialAddress) {
        setForm({
          id: initialAddress.id,
          label: initialAddress.label || "",
          address1: initialAddress.address1 || "",
          address2: initialAddress.address2 || "",
          city: initialAddress.city || "",
          province: initialAddress.province || "",
          postalCode: initialAddress.postalCode || "",
          country: initialAddress.country || "CA",
          phone: initialAddress.phone || "",
          company: initialAddress.company || "",
          addressType: initialAddress.addressType || "RESIDENCE",
        });
      } else {
        setForm(emptyForm);
      }
      setSaving(false);
    }
  }, [isOpen, initialAddress]);

  const handleFieldChange = (field: keyof AddressFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressSelect = (parsedAddress: ParsedAddress) => {
    setForm((prev) => ({
      ...prev,
      address1: parsedAddress.address1,
      address2: parsedAddress.address2 || "",
      city: parsedAddress.city,
      province: parsedAddress.province,
      postalCode: parsedAddress.postalCode,
      country: parsedAddress.country || "CA",
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.address1.trim() || !form.city.trim() || !form.province.trim() || !form.postalCode.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (error) {
      console.error("Failed to save address", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-3xl w-full">
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isEditMode ? "Edit Address" : "Add Address"}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Complete the delivery details for this address.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="address-label">Label</Label>
            <Select
              options={presetLabels}
              value={form.label || ""}
              placeholder="Choose preset or type custom label"
              onChange={(value) => handleFieldChange("label", value)}
              allowCustomValue
            />
          </div>
          <div>
            <Label htmlFor="address-type">Address type</Label>
            <Select
              options={addressTypeOptions}
              value={form.addressType || "RESIDENCE"}
              onChange={(value) => handleFieldChange("addressType", value)}
            />
          </div>
        </div>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="address-address1">Address line 1</Label>
            <AddressAutocomplete
              id="address-address1"
              value={form.address1}
              onChange={(value) => handleFieldChange("address1", value)}
              onAddressSelect={handleAddressSelect}
              placeholder="Start typing an address"
            />
          </div>
          <div>
            <Label htmlFor="address-address2">Address line 2</Label>
            <InputField
              id="address-address2"
              value={form.address2 || ""}
              onChange={(event) => handleFieldChange("address2", event.target.value)}
              placeholder="Apartment, suite, unit, etc."
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="address-city">City</Label>
            <InputField
              id="address-city"
              value={form.city}
              onChange={(event) => handleFieldChange("city", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="address-province">Province / State</Label>
            <Select
              options={provinceOptions}
              value={form.province}
              placeholder="Select province/state"
              onChange={(value) => handleFieldChange("province", value)}
              allowCustomValue
            />
          </div>
          <div>
            <Label htmlFor="address-postal">Postal / Zip code</Label>
            <InputField
              id="address-postal"
              value={form.postalCode}
              onChange={(event) => handleFieldChange("postalCode", event.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="address-country">Country</Label>
            <Select
              options={countryOptions}
              value={form.country}
              onChange={(value) => handleFieldChange("country", value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="address-phone">Phone</Label>
            <PhoneInput
              id="address-phone"
              value={form.phone || ""}
              onChange={(value) => handleFieldChange("phone", value)}
              countries={phoneCountries}
              selectPosition="start"
              placeholder="+1 (555) 000-0000"
            />
          </div>
          <div>
            <Label htmlFor="address-company">Company</Label>
            <InputField
              id="address-company"
              value={form.company || ""}
              onChange={(event) => handleFieldChange("company", event.target.value)}
              placeholder="Optional company name"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4e6575] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Add Address"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

AddAddressModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialAddress: PropTypes.object,
};
