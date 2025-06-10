// src/components/orders/RecipientCard.tsx
import React, { useState, useEffect } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";
import PhoneInput from "../form/group-input/PhoneInput";
import AddressAutocomplete from "../form/AddressAutocomplete";
import { calculateDeliveryFee } from "../../utils/deliveryCalculations";



type Props = {
  orderType: string;
  setOrderType: (val: "DELIVERY" | "PICKUP") => void;
  recipientFirstName: string;
  setRecipientFirstName: (val: string) => void;
  recipientLastName: string;
  setRecipientLastName: (val: string) => void;
  recipientCompany: string;
  setRecipientCompany: (val: string) => void;
  recipientPhone: string;
  setRecipientPhone: (val: string) => void;
  recipientAddress: any;
  setRecipientAddress: (val: any) => void;
  shortcutQuery: string;
  setShortcutQuery: (val: string) => void;
  filteredShortcuts: any[];
  setFilteredShortcuts: (val: any[]) => void;
  savedRecipients?: any[];
  customerId?: string;
  onRecipientSaved?: () => void;
  onDeliveryFeeCalculated?: (fee: number) => void;
  currentDeliveryFee?: number;
  isManuallyEdited?: boolean;
  onManualEditChange?: (isManual: boolean) => void;
  activeTab?: number;
};

export default function RecipientCard({
  orderType,
  setOrderType,
  recipientFirstName,
  setRecipientFirstName,
  recipientLastName,
  setRecipientLastName,
  recipientCompany,
  setRecipientCompany,
  recipientPhone,
  setRecipientPhone,
  recipientAddress,
  setRecipientAddress,
  shortcutQuery,
  setShortcutQuery,
  filteredShortcuts,
  setFilteredShortcuts,
  savedRecipients = [],
  customerId,
  onRecipientSaved,
  onDeliveryFeeCalculated,
  currentDeliveryFee = 0,
  isManuallyEdited = false,
  onManualEditChange,
  activeTab = 0,
}: Props) {
  const [allShortcuts, setAllShortcuts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);


  // Load address shortcuts
  useEffect(() => {
    fetch("/api/shortcuts")
      .then((res) => res.json())
      .then((data) => setAllShortcuts(data))
      .catch((err) => console.error("Failed to load shortcuts:", err));
  }, []);

  // Add this useEffect in RecipientCard.tsx after your existing useEffects
useEffect(() => {
}, [recipientAddress]);

// Add this useEffect after your existing ones
  useEffect(() => {
    if (orderType === "DELIVERY" && 
        recipientAddress.address1 && 
        recipientAddress.city && 
        recipientAddress.province && 
        onDeliveryFeeCalculated &&
        !isManuallyEdited) { 
      const debounceTimer = setTimeout(() => {
        calculateDeliveryFee(
          recipientAddress.address1,
          recipientAddress.city,
          recipientAddress.postalCode,
          recipientAddress.province,
          onDeliveryFeeCalculated
        );
      }, 1000);

    
    return () => clearTimeout(debounceTimer);
  }
  }, [recipientAddress, orderType, onDeliveryFeeCalculated, isManuallyEdited]);
  // Filter shortcuts based on query
  useEffect(() => {
    if (!shortcutQuery.trim()) {
      setFilteredShortcuts([]);
      return;
    }

    const q = shortcutQuery.toLowerCase();
    const matches = allShortcuts.filter((s) =>
      s.label.toLowerCase().includes(q)
    );
    setFilteredShortcuts(matches);
  }, [shortcutQuery, allShortcuts]);



  const clearRecipientInfo = () => {
    setRecipientFirstName("");
    setRecipientLastName("");
    setRecipientCompany("");
    setRecipientPhone("");
    setRecipientAddress({
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
    });
    setShortcutQuery("");
    setFilteredShortcuts([]);
  };

  const handleSaveRecipient = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}/recipients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: recipientFirstName.trim(),
          lastName: recipientLastName.trim(),
          phone: recipientPhone.trim(), // Phone is already cleaned by PhoneInput
          address1: recipientAddress.address1.trim(),
          address2: recipientAddress.address2?.trim() || null,
          city: recipientAddress.city.trim(),
          province: recipientAddress.province,
          postalCode: recipientAddress.postalCode.trim(),
          company: recipientCompany?.trim() || null,
          country: recipientAddress.country?.trim() || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const savedAddress = await response.json();
      alert("Recipient saved successfully!");
      if (onRecipientSaved) onRecipientSaved();
      
    } catch (error: any) {
      console.error("Full error details:", {
        error,
        customerId,
        recipientData: {
          firstName: recipientFirstName,
          lastName: recipientLastName,
        }
      });
      alert(`Error: ${error.message}\n\nCheck console for details`);
    } finally {
      setIsSaving(false);
    }
  };

  const countries = [
    { code: "CA", label: "+1" },
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "AU", label: "+61" },
  ];

  return (
      <ComponentCard title={orderType === "PICKUP" ? "Pickup Person Information" : "Recipient Information"}>
        {/* Top Row: Saved Recipients, Address Shortcuts, Order Type */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-end">
          {/* Saved Recipients Dropdown */}
          <div>
            <Label>Saved Recipients</Label>
            <Select
              options={
                savedRecipients.length > 0
                  ? [
                      { value: "", label: "Select saved recipient..." },
                      ...savedRecipients.map((recipient) => ({
                        value: recipient.id,
                        label: `${recipient.firstName} ${recipient.lastName}`,
                      }))
                    ]
                  : [{ value: "", label: "No saved recipients" }]
              }
              value=""
              placeholder="Select recipient"
              onChange={(value) => {
                const selected = savedRecipients.find(r => r.id === value);
                if (selected) {
                  setRecipientFirstName(selected.firstName || "");
                  setRecipientLastName(selected.lastName || "");
                  setRecipientPhone(selected.phone || "");
                  setRecipientAddress({
                    address1: selected.address1 || "",
                    address2: selected.address2 || "",
                    city: selected.city || "",
                    province: selected.province || "",
                    postalCode: selected.postalCode || "",
                  });
                }
              }}
              disabled={savedRecipients.length === 0}
            />
          </div>

          {/* Address Shortcuts */}
          <div className="relative">
            <Label htmlFor="shortcuts">Address Shortcuts</Label>
            <InputField
              type="text"
              id="shortcuts"
              placeholder="Search shortcuts..."
              value={shortcutQuery}
              onChange={(e) => setShortcutQuery(e.target.value)}
              disabled={orderType === "PICKUP"}
            />
            {orderType === "DELIVERY" && Array.isArray(filteredShortcuts) && filteredShortcuts.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-40 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
                {filteredShortcuts.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setRecipientAddress({
                        address1: s.address1,
                        address2: s.address2 || "",
                        city: s.city,
                        province: s.province,
                        postalCode: s.postalCode,
                      });
                      if (s.phoneNumbers && s.phoneNumbers.length > 0) {
                        setRecipientPhone(s.phoneNumbers[0]);
                      }
                      setRecipientCompany(s.label);
                      setShortcutQuery("");
                      setFilteredShortcuts([]);
                    }}
                    className="px-5 py-3 text-sm hover:bg-gray-2 cursor-pointer border-b border-stroke last:border-b-0 dark:hover:bg-meta-4 dark:border-strokedark text-black dark:text-white"
                  >
                    <div className="font-medium">{s.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {s.address1}, {s.city}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Type Toggle */}
          <div>
            <Label>Order Type</Label>
            <div className="flex rounded-md bg-gray-2 p-1 dark:bg-meta-4">
              <button
                type="button"
                onClick={() => setOrderType("DELIVERY")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  orderType === "DELIVERY"
                    ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                    : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                }`}
                style={orderType === "DELIVERY" ? { backgroundColor: '#597485', color: 'white' } : {}}
              >
                Delivery
              </button>
              <button
                type="button"
                onClick={() => setOrderType("PICKUP")}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  orderType === "PICKUP"
                    ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                    : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                }`}
                style={orderType === "PICKUP" ? { backgroundColor: '#597485', color: 'white' } : {}}
              >
                Pickup
              </button>
            </div>
          </div>
        </div>

        {/* Name and Phone */}
        <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
          <div className="w-full xl:w-1/2">
            <Label htmlFor="firstName">First Name</Label>
            <InputField
              type="text"
              id="firstName"
              placeholder="Enter first name"
              value={recipientFirstName}
              onChange={(e) => setRecipientFirstName(e.target.value)}
            />
          </div>

          <div className="w-full xl:w-1/2">
            <Label htmlFor="lastName">Last Name</Label>
            <InputField
              type="text"
              id="lastName"
              placeholder="Enter last name"
              value={recipientLastName}
              onChange={(e) => setRecipientLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
          <div className="w-full xl:w-1/2">
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              type="tel"
              id="phone"
              value={recipientPhone}
              onChange={(cleanedPhone) => setRecipientPhone(cleanedPhone)}
              countries={countries}
              selectPosition="none"
            />
          </div>

          {orderType === "DELIVERY" && (
            <div className="w-full xl:w-1/2">
              <Label htmlFor="company">Company/Business</Label>
              <InputField
                type="text"
                id="company"
                placeholder="Enter company name"
                value={recipientCompany}
                onChange={(e) => setRecipientCompany(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Address Fields (only for delivery) */}
        {orderType === "DELIVERY" && (
          <div className="space-y-4.5">
            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <Label htmlFor="address1">Address Line 1</Label>
                <AddressAutocomplete
                  id="address1"
                  value={recipientAddress.address1}
                  onChange={(value) => setRecipientAddress({ ...recipientAddress, address1: value })}
onAddressSelect={(parsedAddress) => {
  
  const newAddress = {
    ...recipientAddress,
    ...parsedAddress,
  };
  
  setRecipientAddress(newAddress);
  
  // Add delivery calculation for autocomplete selections
  if (orderType === "DELIVERY" && onDeliveryFeeCalculated && !isManuallyEdited) { // ✅ Add check
    setTimeout(() => {
      calculateDeliveryFee(
        parsedAddress.address1,
        parsedAddress.city,
        parsedAddress.postalCode,
        parsedAddress.province,
        onDeliveryFeeCalculated
      );
    }, 100);
  }
}}

                  placeholder="Enter street address"
                />
              </div>

              <div className="w-full xl:w-1/2">
                <Label htmlFor="address2">Address Line 2</Label>
                <InputField
                  type="text"
                  id="address2"
                  placeholder="Apartment, suite, unit, etc."
                  value={recipientAddress.address2}
                  onChange={(e) =>
                    setRecipientAddress({ ...recipientAddress, address2: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="flex flex-col gap-6 xl:flex-row">
              <div className="w-full xl:w-1/2">
                <Label htmlFor="city">City</Label>
                <InputField
                  type="text"
                  id="city"
                  placeholder="Enter city"
                  value={recipientAddress.city}
                  onChange={(e) =>
                    setRecipientAddress({ ...recipientAddress, city: e.target.value })
                  }
                />
              </div>

              <div className="w-full xl:w-1/4">
                <Label>Province</Label>
                <Select
                  options={[
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
                  ]}
                  value={recipientAddress.province}
                  placeholder="Select Province"
                  onChange={(value) =>
                    setRecipientAddress({ ...recipientAddress, province: value })
                  }
                />
              </div>

              <div className="w-full xl:w-1/4">
                <Label htmlFor="postalCode">Postal Code</Label>
                <InputField
                  type="text"
                  id="postalCode"
                  placeholder="A1A 1A1"
                  value={recipientAddress.postalCode}
                  onChange={(e) =>
                    setRecipientAddress({ ...recipientAddress, postalCode: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
        )}

  {/* Editable Delivery Fee */}
  {orderType === "DELIVERY" && (
    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border sm:w-full lg:w-1/2">
      <div className="flex justify-between items-center">
        <Label htmlFor={`deliveryFee-${activeTab}`} className="mb-0 text-sm text-gray-600 dark:text-gray-400">
          Delivery Fee for this order:
        </Label>
        <div className="w-24">
          <InputField
            type="number"
            id={`deliveryFee-${activeTab}`}
            value={currentDeliveryFee.toString()}
            onChange={(e) => {
              const newFee = parseFloat(e.target.value) || 0;
              onManualEditChange?.(true);
              onDeliveryFeeCalculated?.(newFee);
            }}
            className="text-right text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            min="0"
            step="0.01"
          />
        </div>
      </div>
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-gray-500">
          {isManuallyEdited ? "✏️ Manually adjusted" : "🤖 Auto-calculated"}
        </div>
        {isManuallyEdited && (
          <button
            type="button"
            onClick={() => {
              onManualEditChange?.(false); 
              if (recipientAddress.address1 && recipientAddress.city) {
                calculateDeliveryFee(
                  recipientAddress.address1,
                  recipientAddress.city,
                  recipientAddress.postalCode,
                  recipientAddress.province,
                  onDeliveryFeeCalculated
                );
              }
            }}
            className="text-xs text-[#597485] hover:underline"
          >
            Recalculate
          </button>
        )}
      </div>
    </div>
  )}


        {/* Clear Button and Save Recipient */}
        <div className="flex justify-between items-center mt-6">
          {/* Save Recipient Button - only show for delivery orders with customer selected */}
          {orderType === "DELIVERY" && customerId && recipientFirstName && recipientAddress.address1 && (
            <button
              type="button"
              onClick={handleSaveRecipient}
              disabled={isSaving}
              className="text-sm text-[#597485] hover:underline disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Recipient"}
            </button>
          )}
          
          
          <button
            type="button"
            onClick={clearRecipientInfo}
            className="flex justify-center rounded-lg border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white ml-auto"
          >
            {orderType === "PICKUP" ? "Clear Pickup Info" : "Clear Recipient Info"}
          </button>
        </div>
      </ComponentCard>
  
  );
}