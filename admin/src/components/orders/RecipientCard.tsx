// src/components/orders/OrderDetailsCard.tsx
import React, { useState, useEffect, useRef } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Select from "../form/Select";
import Label from "../form/Label";
import { LoadScript, Autocomplete } from '@react-google-maps/api';
import PhoneInput from "../form/group-input/PhoneInput";


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

};

const libraries: ("places")[] = ["places"];
const GOOGLE_MAPS_API_KEY = "AIzaSyB550tfeabwT0zRGecbLdmoITNsYoP2AIg";

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
}: Props) {
  const [allShortcuts, setAllShortcuts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Load address shortcuts
  useEffect(() => {
    fetch("/api/shortcuts")
      .then((res) => res.json())
      .then((data) => setAllShortcuts(data))
      .catch((err) => console.error("Failed to load shortcuts:", err));
  }, []);

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

useEffect(() => {
  if (orderType === "DELIVERY" && 
      recipientAddress.address1 && 
      recipientAddress.city && 
      recipientAddress.province) {
    const debounceTimer = setTimeout(() => {
      calculateDeliveryFee(
        recipientAddress.address1, 
        recipientAddress.city, 
        recipientAddress.postalCode
      );
    }, 1000); // Debounce for 1 second
    
    return () => clearTimeout(debounceTimer);
  }
}, [recipientAddress, orderType]);



 const cleanPhoneNumber = (value: string) => {
   if (value.startsWith('+')) {
     return '+' + value.slice(1).replace(/\D/g, '');
   }
   return value.replace(/\D/g, '');
 };

 const formatPhoneNumber = (value: string) => {
   if (value.startsWith('+')) return value; // Keep international numbers unformatted
   const cleaned = value.replace(/\D/g, '');
   const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
   if (match) {
     return match[1] ? `(${match[1]})${match[2] ? ' ' + match[2] : ''}${match[3] ? '-' + match[3] : ''}` : '';
   }
   return value;
 };





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
          phone: cleanPhoneNumber(recipientPhone).trim(),
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
      
    } catch (error) {
      console.error("Full error details:", {
        error,
        customerId,
        recipientData: {
          firstName: recipientFirstName,
          lastName: recipientLastName,
          // Include all other fields...
        }
      });
      alert(`Error: ${error.message}\n\nCheck console for details`);
    } finally {
      setIsSaving(false);
    }
  };

  const calculateDeliveryFee = async (address: string, city: string, postalCode: string) => {
  if (!address || !city) return;
  
  try {
    // Store address (Prince George BC default)
    const storeLocation = "Prince George, BC, Canada";
    const destinationAddress = `${address}, ${city}, ${recipientAddress.province || "BC"}, ${postalCode}`;
    
 
    
    service.getDistanceMatrix(
      {
        origins: [storeLocation],
        destinations: [destinationAddress],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      },
      (response, status) => {
        if (status === 'OK' && response) {
          const distance = response.rows[0]?.elements[0]?.distance;
          if (distance) {
            const km = distance.value / 1000; // Convert meters to km
            
            // Calculate fee based on distance
            let fee = 0;
            if (km <= 5) {
              fee = 5;
            } else if (km <= 10) {
              fee = 10;
            } else if (km <= 20) {
              fee = 15;
            } else if (km <= 30) {
              fee = 20;
            } else {
              fee = 25; // Max fee or calculate per km
            }
            
            if (onDeliveryFeeCalculated) {
              onDeliveryFeeCalculated(fee);
            }
          }
        }
      }
    );
  } catch (error) {
    console.error("Error calculating delivery fee:", error);
  }
};

const handlePlaceSelect = () => {
  if (autocompleteRef.current) {
    const place = autocompleteRef.current.getPlace();
    if (place && place.address_components) {
      let address1 = "";
      let city = "";
      let province = "";
      let postalCode = "";
      let country = "";

      place.address_components.forEach((component) => {
        const types = component.types;
        if (types.includes("street_number")) {
          address1 = component.long_name + " ";
        }
        if (types.includes("route")) {
          address1 += component.long_name;
        }
        if (types.includes("locality")) {
          city = component.long_name;
        }
        if (types.includes("administrative_area_level_1")) {
          province = component.short_name;
        }
        if (types.includes("postal_code")) {
          postalCode = component.long_name;
        }
        if (types.includes("country")) {
          country = component.short_name;
        }
      });

      setRecipientAddress({
        ...recipientAddress,
        address1,
        city,
        province,
        postalCode,
      });
      
      // Calculate delivery fee if it's a delivery order
      if (orderType === "DELIVERY") {
        calculateDeliveryFee(address1, city, postalCode);
      }
    }
  }
};

// Define bounds for Prince George, BC
const princeGeorgeBounds = {
  north: 54.0000, // Northern boundary of Prince George
  south: 53.8000, // Southern boundary
  east: -122.6000, // Eastern boundary
  west: -122.9000, // Western boundary
};

  const countries = [
    { code: "CA", label: "+1" },
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "AU", label: "+61" },
  ];
  const handlePhoneNumberChange = (phoneNumber: string) => {
    console.log("Updated phone number:", phoneNumber);
  };

return (
  <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
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
              value={formatPhoneNumber(recipientPhone)}
              onChange={(raw) => setRecipientPhone(cleanPhoneNumber(raw))}
              countries={countries}
              selectPosition="none"/>
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
              <Autocomplete
  onLoad={(autocomplete) => (autocompleteRef.current = autocomplete)}
  onPlaceChanged={handlePlaceSelect}
  bounds={princeGeorgeBounds} // Bias toward Prince George
  options={{ 
    strictBounds: false, // Allow results outside bounds
    componentRestrictions: { country: [] } // Allow all countries
  }}
>
                <InputField
                  type="text"
                  id="address1"
                  placeholder="Enter street address"
                  value={recipientAddress.address1}
                  onChange={(e) =>
                    setRecipientAddress({ ...recipientAddress, address1: e.target.value })
                  }
                />
              </Autocomplete>
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
    </LoadScript>
  );
}