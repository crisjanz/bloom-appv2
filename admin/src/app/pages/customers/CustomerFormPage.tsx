import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CustomerInfoCard,
  HomeAddressCard,
  AdditionalAddressesCard,
} from "@app/components/customers/cards";
import { ParsedAddress } from "@shared/utils/googlePlaces";
import { Customer, Address } from "@shared/types/customer"; // 🆕 Import shared types

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== "new");
  
  const [customer, setCustomer] = useState<Customer>({
    id: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
    homeAddress: undefined,
  });
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEditMode && id) {
      fetch(`/api/customers/${id}`)
        .then((res) => res.json())
        .then((data) => {
          setCustomer(data);
          setAddresses(data.addresses || []);
        })
        .catch(() => setError("Failed to load customer"))
        .finally(() => setLoading(false));
    }
  }, [id, isEditMode]);

  const handleCustomerChange = (field: string, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const handleHomeAddressChange = (field: string, value: string) => {
    setCustomer(prev => ({
      ...prev,
      homeAddress: {
        ...prev.homeAddress,
        [field]: value,
      } as Address,
    }));
  };

  const handleHomeAddressSelect = (parsedAddress: ParsedAddress) => {
    setCustomer(prev => ({
      ...prev,
      homeAddress: {
        ...prev.homeAddress,
        address1: parsedAddress.address1,
        address2: parsedAddress.address2 || "",
        city: parsedAddress.city,
        province: parsedAddress.province,
        postalCode: parsedAddress.postalCode,
        country: parsedAddress.country || "CA", // 🆕 Add country support
      } as Address,
    }));
  };

  const handleSaveCustomer = async () => {
    if (!customer.firstName.trim() || !customer.lastName.trim()) {
      setError("First and Last Name are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEditMode ? `/api/customers/${id}` : "/api/customers";
      const method = isEditMode ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          homeAddress: customer.homeAddress,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        if (isEditMode) {
          // Stay on edit page and update data
          setCustomer(result);
          setAddresses(result.addresses || []);
        } else {
          // Navigate to edit page for the new customer
          navigate(`/customers/${result.id}`);
        }
      } else {
        setError(`Failed to ${isEditMode ? "save" : "create"} customer`);
      }
    } catch (err) {
      setError(`Failed to ${isEditMode ? "save" : "create"} customer`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (newAddress: Omit<Address, "id">) => {
    if (!customer.id) return;
    
    try {
      const res = await fetch(`/api/customers/${customer.id}/addresses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAddress),
      });

      if (res.ok) {
        const added = await res.json();
        setAddresses(prev => [...prev, added]);
      } else {
        setError("Failed to add address");
      }
    } catch (err) {
      setError("Failed to add address");
    }
  };

  const handleUpdateAddress = async (addressId: string, updatedAddress: Omit<Address, "id">) => {
    try {
      const res = await fetch(`/api/customers/addresses/${addressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedAddress),
      });

      if (res.ok) {
        const updated = await res.json();
        setAddresses(prev => prev.map(addr => addr.id === addressId ? updated : addr));
      } else {
        setError("Failed to update address");
      }
    } catch (err) {
      setError("Failed to update address");
    }
  };

  const handleDeleteAddress = async (addrId: string) => {
    try {
      const res = await fetch(`/api/customers/addresses/${addrId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setAddresses(prev => prev.filter(a => a.id !== addrId));
      } else {
        setError("Failed to delete address");
      }
    } catch (err) {
      setError("Failed to delete address");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <svg className="animate-spin h-8 w-8 text-[#597485]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">
          {isEditMode ? "Edit Customer" : "Add New Customer"}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/customers")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveCustomer}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 py-3 text-sm font-medium text-white hover:bg-[#4e6575] disabled:opacity-50"
          >
            {saving && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Customer"}
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Customer Information Card */}
        <CustomerInfoCard
          customer={customer}
          onCustomerChange={handleCustomerChange}
          error={error}
        />

        {/* Home Address Card - Only show in edit mode or if we have address data */}
        {(isEditMode || customer.homeAddress) && (
          <HomeAddressCard
            homeAddress={customer.homeAddress}
            onAddressChange={handleHomeAddressChange}
            onAddressSelect={handleHomeAddressSelect}
          />
        )}

        {/* Additional Addresses Card - Only show in edit mode */}
        {isEditMode && (
          <AdditionalAddressesCard
            addresses={addresses}
            onAddAddress={handleAddAddress}
            onUpdateAddress={handleUpdateAddress}
            onDeleteAddress={handleDeleteAddress}
          />
        )}
      </div>
    </>
  );
}