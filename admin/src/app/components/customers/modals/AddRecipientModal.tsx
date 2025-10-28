import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Modal } from "@shared/ui/components/ui/modal";
import Label from "@shared/ui/forms/Label";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import { ParsedAddress } from "@shared/utils/googlePlaces";
import { useCustomerSearch } from "@domains/customers/hooks/useCustomerService.ts";

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
];

const phoneCountries = [
  { code: "CA", label: "+1" },
  { code: "US", label: "+1" },
  { code: "GB", label: "+44" },
  { code: "AU", label: "+61" },
  { code: "DE", label: "+49" },
  { code: "FR", label: "+33" },
];

export interface RecipientFormValues {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

interface AddRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkExisting: (recipientCustomerId: string) => Promise<void> | void;
  onCreateRecipient: (details: RecipientFormValues) => Promise<void> | void;
}

const emptyRecipientForm: RecipientFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  postalCode: "",
  country: "CA",
};

export default function AddRecipientModal({
  isOpen,
  onClose,
  onLinkExisting,
  onCreateRecipient,
}: AddRecipientModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "new">("search");
  const [form, setForm] = useState<RecipientFormValues>(emptyRecipientForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { query, setQuery, results, isSearching, clearSearch } = useCustomerSearch();

  useEffect(() => {
    if (isOpen) {
      setActiveTab("search");
      setForm(emptyRecipientForm);
      setSaving(false);
      setError("");
      clearSearch();
    }
  }, [isOpen, clearSearch]);

  const handleAddressSelect = (parsed: ParsedAddress) => {
    setForm((prev) => ({
      ...prev,
      address1: parsed.address1,
      address2: parsed.address2 || "",
      city: parsed.city,
      province: parsed.province,
      postalCode: parsed.postalCode,
      country: parsed.country || "CA",
    }));
  };

  const handleFormChange = (field: keyof RecipientFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required");
      return;
    }

    if (!form.address1.trim() || !form.city.trim() || !form.province.trim() || !form.postalCode.trim()) {
      setError("Complete address is required");
      return;
    }

    setSaving(true);
    try {
      await onCreateRecipient(form);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to create recipient");
    } finally {
      setSaving(false);
    }
  };

  const handleAttach = async (recipientId: string) => {
    setSaving(true);
    setError("");
    try {
      await onLinkExisting(recipientId);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to add recipient");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl w-full">
      <div className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Recipient</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Link an existing customer or create a new recipient address to reuse for deliveries.
            </p>
          </div>
        </div>

        <div className="flex gap-3 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => setActiveTab("search")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "search"
                ? "border-b-2 border-[#597485] text-[#597485]"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            Search existing
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("new")}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === "new"
                ? "border-b-2 border-[#597485] text-[#597485]"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            New recipient
          </button>
        </div>

        {activeTab === "search" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient-search">Search customers</Label>
              <InputField
                id="recipient-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Start typing name, phone, or email"
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700">
              {isSearching ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                  No customers found. Try a different search or switch to the "New recipient" tab.
                </div>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-700"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {result.firstName} {result.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {[result.email, result.phone].filter(Boolean).join(" • ") || "No contact info"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttach(result.id)}
                      disabled={saving}
                      className="rounded-lg bg-[#597485] px-3 py-2 text-sm font-medium text-white hover:bg-[#4e6575] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="recipient-firstName">First name</Label>
                <InputField
                  id="recipient-firstName"
                  value={form.firstName}
                  onChange={(event) => handleFormChange("firstName", event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recipient-lastName">Last name</Label>
                <InputField
                  id="recipient-lastName"
                  value={form.lastName}
                  onChange={(event) => handleFormChange("lastName", event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recipient-email">Email (optional)</Label>
                <InputField
                  id="recipient-email"
                  type="email"
                  value={form.email || ""}
                  onChange={(event) => handleFormChange("email", event.target.value)}
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <Label htmlFor="recipient-phone">Phone</Label>
                <PhoneInput
                  id="recipient-phone"
                  value={form.phone || ""}
                  onChange={(value) => handleFormChange("phone", value)}
                  countries={phoneCountries}
                  selectPosition="start"
                  placeholder="Optional"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="recipient-address1">Address line 1</Label>
              <AddressAutocomplete
                id="recipient-address1"
                value={form.address1}
                onChange={(value) => handleFormChange("address1", value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Start typing an address"
              />
            </div>
            <div>
              <Label htmlFor="recipient-address2">Address line 2</Label>
              <InputField
                id="recipient-address2"
                value={form.address2 || ""}
                onChange={(event) => handleFormChange("address2", event.target.value)}
                placeholder="Apartment, suite, etc."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="recipient-city">City</Label>
                <InputField
                  id="recipient-city"
                  value={form.city}
                  onChange={(event) => handleFormChange("city", event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recipient-province">Province / State</Label>
                <Select
                  options={provinceOptions}
                  value={form.province}
                  placeholder="Select province/state"
                  onChange={(value) => handleFormChange("province", value)}
                  allowCustomValue
                />
              </div>
              <div>
                <Label htmlFor="recipient-postal">Postal / Zip code</Label>
                <InputField
                  id="recipient-postal"
                  value={form.postalCode}
                  onChange={(event) => handleFormChange("postalCode", event.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="recipient-country">Country</Label>
                <Select
                  options={countryOptions}
                  value={form.country}
                  onChange={(value) => handleFormChange("country", value)}
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <div className="flex justify-end gap-3">
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
                {saving ? "Saving..." : "Create & Add"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

AddRecipientModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onLinkExisting: PropTypes.func.isRequired,
  onCreateRecipient: PropTypes.func.isRequired,
};
