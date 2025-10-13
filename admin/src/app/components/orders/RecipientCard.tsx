// src/components/orders/RecipientCard.tsx
import { useState, useEffect } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import Label from "@shared/ui/forms/Label";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import { calculateDeliveryFee } from "@shared/utils/deliveryCalculations";
import RecipientUpdateModal from "./RecipientUpdateModal";



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
  recipientAddressType?: string;
  setRecipientAddressType?: (val: string) => void;
  recipientAddressLabel?: string; // NEW: Custom address label
  setRecipientAddressLabel?: (val: string) => void; // NEW
  shortcutQuery: string;
  setShortcutQuery: (val: string) => void;
  filteredShortcuts: any[];
  setFilteredShortcuts: (val: any[]) => void;
  savedRecipients?: any[]; // Now Customer[] instead of Address[]
  customerId?: string;
  onRecipientSaved?: () => void;
  onDeliveryFeeCalculated?: (fee: number) => void;
  currentDeliveryFee?: number;
  isManuallyEdited?: boolean;
  onManualEditChange?: (isManual: boolean) => void;
  activeTab?: number;
  // New props for recipient tracking
  selectedRecipientId?: string;
  onSelectedRecipientIdChange?: (id: string | undefined) => void;
  recipientDataChanged?: boolean;
  onRecipientDataChangedChange?: (changed: boolean) => void;
  originalRecipientData?: {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    city: string;
  };
  onOriginalRecipientDataChange?: (data: any) => void;
  // NEW: Customer-based recipient props
  recipientCustomer?: any; // Selected recipient as Customer
  setRecipientCustomer?: (customer: any) => void;
  recipientCustomerId?: string; // ID of recipient customer
  setRecipientCustomerId?: (id: string | undefined) => void;
  selectedAddressId?: string; // Which address from recipient's addresses[]
  setSelectedAddressId?: (id: string | undefined) => void;
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
  recipientAddressType,
  setRecipientAddressType,
  recipientAddressLabel,
  setRecipientAddressLabel,
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
  // New props
  selectedRecipientId,
  onSelectedRecipientIdChange,
  recipientDataChanged = false,
  onRecipientDataChangedChange,
  originalRecipientData,
  onOriginalRecipientDataChange,
  // NEW: Customer-based recipient props
  recipientCustomer,
  setRecipientCustomer,
  recipientCustomerId,
  setRecipientCustomerId,
  selectedAddressId,
  setSelectedAddressId,
}: Props) {
  const [allShortcuts, setAllShortcuts] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showRecipientUpdateModal, setShowRecipientUpdateModal] = useState(false);

  // NEW: Phone-first lookup state
  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientSearchResults, setRecipientSearchResults] = useState<any[]>([]);


  // Load address shortcuts
  useEffect(() => {
    fetch("/api/shortcuts")
      .then((res) => res.json())
      .then((data) => setAllShortcuts(data))
      .catch((err) => console.error("Failed to load shortcuts:", err));
  }, []);

  // Change detection for existing recipients
  useEffect(() => {
    if (!selectedRecipientId || !originalRecipientData || !onRecipientDataChangedChange) return;

    const currentData = {
      firstName: recipientFirstName,
      lastName: recipientLastName,
      phone: recipientPhone,
      address1: recipientAddress.address1,
      city: recipientAddress.city,
    };

    const hasChanges = 
      originalRecipientData.firstName !== currentData.firstName ||
      originalRecipientData.lastName !== currentData.lastName ||
      originalRecipientData.phone !== currentData.phone ||
      originalRecipientData.address1 !== currentData.address1 ||
      originalRecipientData.city !== currentData.city;

    if (hasChanges !== recipientDataChanged) {
      onRecipientDataChangedChange(hasChanges);
    }
  }, [
    recipientFirstName, 
    recipientLastName, 
    recipientPhone, 
    recipientAddress.address1, 
    recipientAddress.city,
    selectedRecipientId,
    originalRecipientData,
    recipientDataChanged,
    onRecipientDataChangedChange
  ]);


useEffect(() => {
    if (orderType === "DELIVERY" && 
        recipientAddress.address1 && 
        recipientAddress.city && 
        recipientAddress.province && 
        onDeliveryFeeCalculated &&
        !isManuallyEdited) { 
      const debounceTimer = setTimeout(() => {
        // Check if Google Maps is loaded before calculating
        if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
          console.log('🗺️ Google Maps loaded, calculating delivery fee...');
          calculateDeliveryFee(
            recipientAddress.address1,
            recipientAddress.city,
            recipientAddress.postalCode,
            recipientAddress.province,
            onDeliveryFeeCalculated
          );
        } else {
          console.warn('⚠️ Google Maps not loaded yet, retrying in 2 seconds...');
          // Retry after Google Maps loads
          setTimeout(() => {
            if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
              console.log('🗺️ Google Maps loaded on retry, calculating delivery fee...');
              calculateDeliveryFee(
                recipientAddress.address1,
                recipientAddress.city,
                recipientAddress.postalCode,
                recipientAddress.province,
                onDeliveryFeeCalculated
              );
            } else {
              console.error('❌ Google Maps failed to load, delivery fee calculation unavailable');
            }
          }, 2000);
        }
      }, 1000);

    
    return () => clearTimeout(debounceTimer);
  }
  }, [
    recipientAddress.address1, 
    recipientAddress.city, 
    recipientAddress.province, 
    recipientAddress.postalCode,
    orderType, 
    isManuallyEdited
  ]);
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

  // NEW: Phone-first recipient search (like CustomerCard)
  useEffect(() => {
    if (!recipientQuery.trim() || recipientQuery.length < 3) {
      setRecipientSearchResults([]);
      return;
    }

    const debounceTimer = setTimeout(() => {
      fetch(`/api/customers/quick-search?query=${encodeURIComponent(recipientQuery)}&limit=10`)
        .then((res) => res.json())
        .then((data) => {
          setRecipientSearchResults(data || []);
        })
        .catch((err) => {
          console.error("Failed to search recipients:", err);
          setRecipientSearchResults([]);
        });
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [recipientQuery]);



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
    setRecipientAddressType?.("RESIDENCE");
    setRecipientAddressLabel?.(""); // Clear label
    setShortcutQuery("");
    setFilteredShortcuts([]);

    // Clear recipient tracking data
    onSelectedRecipientIdChange?.(undefined);
    onOriginalRecipientDataChange?.(undefined);
    onRecipientDataChangedChange?.(false);

    // NEW: Clear customer-based recipient data
    setRecipientQuery("");
    setRecipientSearchResults([]);
    setRecipientCustomer?.(undefined);
    setRecipientCustomerId?.(undefined);
    setSelectedAddressId?.(undefined);
  };

  // NEW: Handle "Use Customer's Name" button click
  const handleUseCustomerName = async () => {
    if (!customerId) {
      alert("Please select a customer first");
      return;
    }

    try {
      // Fetch customer details
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer");
      }

      const customer = await response.json();

      // Set recipient customer data to the ordering customer
      setRecipientCustomer?.(customer);
      setRecipientCustomerId?.(customer.id);

      // Populate name fields
      setRecipientFirstName(customer.firstName || "");
      setRecipientLastName(customer.lastName || "");
      setRecipientPhone(customer.phone || "");

      // If customer has homeAddress, auto-select it
      if (customer.homeAddress) {
        setRecipientAddress({
          address1: customer.homeAddress.address1 || "",
          address2: customer.homeAddress.address2 || "",
          city: customer.homeAddress.city || "",
          province: customer.homeAddress.province || "",
          postalCode: customer.homeAddress.postalCode || "",
          country: customer.homeAddress.country || "CA",
        });
        setRecipientCompany(customer.homeAddress.company || "");
        setRecipientAddressType?.(customer.homeAddress.addressType || "RESIDENCE");
        setRecipientAddressLabel?.(customer.homeAddress.label || "");
        setSelectedAddressId?.(customer.homeAddress.id);
      }
    } catch (error) {
      console.error("Error loading customer:", error);
      alert("Failed to load customer information");
    }
  };

  const handleSaveRecipient = async () => {
    if (!customerId) {
      alert("Please select a customer first");
      return;
    }

    setIsSaving(true);
    try {
      // NEW: If recipientCustomer exists, create CustomerRecipient link
      if (recipientCustomerId) {
        const response = await fetch(`/api/customers/${customerId}/save-recipient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientCustomerId: recipientCustomerId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to save recipient link');
        }

        alert('Recipient saved successfully!');
        if (onRecipientSaved) onRecipientSaved();
      } else {
        // Create new customer as recipient
        // First create customer
        const createCustomerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: recipientFirstName.trim(),
            lastName: recipientLastName.trim(),
            phone: recipientPhone.trim(),
            email: '', // Recipients don't need email initially
          }),
        });

        if (!createCustomerResponse.ok) {
          throw new Error('Failed to create recipient customer');
        }

        const newCustomer = await createCustomerResponse.json();

        // Create address for this customer
        const createAddressResponse = await fetch(`/api/customers/${newCustomer.id}/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: recipientAddressLabel?.trim() || 'Home', // Use custom label or default
            firstName: recipientFirstName.trim(),
            lastName: recipientLastName.trim(),
            phone: recipientPhone.trim(),
            address1: recipientAddress.address1.trim(),
            address2: recipientAddress.address2?.trim() || '',
            city: recipientAddress.city.trim(),
            province: recipientAddress.province,
            postalCode: recipientAddress.postalCode.trim(),
            country: recipientAddress.country || 'CA',
            company: recipientCompany?.trim() || '',
            addressType: recipientAddressType || 'RESIDENCE',
          }),
        });

        if (!createAddressResponse.ok) {
          throw new Error('Failed to create recipient address');
        }

        // Link as recipient
        const linkResponse = await fetch(`/api/customers/${customerId}/save-recipient`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientCustomerId: newCustomer.id
          }),
        });

        if (!linkResponse.ok) {
          throw new Error('Failed to save recipient link');
        }

        alert('New recipient created and saved successfully!');
        if (onRecipientSaved) onRecipientSaved();
      }
    } catch (error: any) {
      console.error('Error saving recipient:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const performSaveRecipient = async (action: 'update' | 'new' | 'duplicate') => {
    setIsSaving(true);
    try {
      let endpoint = `/api/customers/${customerId}/recipients`;
      let method = 'POST';
      
      if (action === 'update' && selectedRecipientId) {
        endpoint = `/api/customers/${customerId}/recipients/${selectedRecipientId}`;
        method = 'PUT';
      }

      const response = await fetch(endpoint, {
        method,
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
          addressType: recipientAddressType || "RESIDENCE",
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const savedAddress = await response.json();
      
      const actionText = action === 'update' ? 'updated' : 'saved';
      alert(`Recipient ${actionText} successfully!`);
      
      // Update tracking data if we updated existing recipient
      if (action === 'update') {
        onOriginalRecipientDataChange?.({
          firstName: recipientFirstName,
          lastName: recipientLastName,
          phone: recipientPhone,
          address1: recipientAddress.address1,
          city: recipientAddress.city,
        });
        onRecipientDataChangedChange?.(false);
      } else {
        // Clear tracking for new recipient
        onSelectedRecipientIdChange?.(undefined);
        onOriginalRecipientDataChange?.(undefined);
        onRecipientDataChangedChange?.(false);
      }
      
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
      alert(`Error: ${error.message}\\n\\nCheck console for details`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecipientUpdateChoice = (choice: 'update' | 'new' | 'duplicate') => {
    performSaveRecipient(choice);
  };

  const countries = [
    { code: "CA", label: "+1" },
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "AU", label: "+61" },
  ];

  return (
    <>
      <ComponentCard title={orderType === "PICKUP" ? "Pickup Person Information" : "Recipient Information"}>
        {/* NEW: Phone-First Recipient Search */}
        {orderType === "DELIVERY" && (
          <div className="mb-6">
            <Label htmlFor="recipientSearch">Search Recipient by Phone</Label>
            <div className="relative">
              <InputField
                type="text"
                id="recipientSearch"
                placeholder="Search by phone number..."
                value={recipientQuery}
                onChange={(e) => setRecipientQuery(e.target.value)}
              />

              {recipientSearchResults.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-80 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
                  <div className="px-5 py-2 bg-gray-1 dark:bg-meta-4 border-b border-stroke dark:border-strokedark">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Customer(s) found with this phone number:
                    </p>
                  </div>
                  {recipientSearchResults.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        // Set recipient customer data
                        setRecipientCustomer?.(customer);
                        setRecipientCustomerId?.(customer.id);

                        // Populate name fields
                        setRecipientFirstName(customer.firstName || "");
                        setRecipientLastName(customer.lastName || "");
                        setRecipientPhone(customer.phone || "");

                        // If customer has homeAddress, auto-select it
                        if (customer.homeAddress) {
                          setRecipientAddress({
                            address1: customer.homeAddress.address1 || "",
                            address2: customer.homeAddress.address2 || "",
                            city: customer.homeAddress.city || "",
                            province: customer.homeAddress.province || "",
                            postalCode: customer.homeAddress.postalCode || "",
                            country: customer.homeAddress.country || "CA",
                          });
                          setRecipientCompany(customer.homeAddress.company || "");
                          setRecipientAddressType?.(customer.homeAddress.addressType || "RESIDENCE");
                          setSelectedAddressId?.(customer.homeAddress.id);
                        }

                        // Clear search
                        setRecipientQuery("");
                        setRecipientSearchResults([]);
                      }}
                      className="px-5 py-3 text-sm hover:bg-gray-2 cursor-pointer border-b border-stroke dark:hover:bg-meta-4 dark:border-strokedark"
                    >
                      <div className="font-medium text-black dark:text-white">
                        ✓ Use: {customer.firstName} {customer.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {customer.phone} {customer.email && `• ${customer.email}`}
                      </div>
                    </div>
                  ))}
                  <div
                    onClick={() => {
                      setRecipientQuery("");
                      setRecipientSearchResults([]);
                    }}
                    className="px-5 py-3 text-sm hover:bg-blue-50 cursor-pointer border-t-2 border-stroke bg-white dark:hover:bg-meta-4 dark:border-strokedark dark:bg-boxdark"
                  >
                    <div className="font-medium text-[#597485] dark:text-blue-400">
                      + Create new recipient
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Enter details below for a new recipient
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top Row: Saved Recipients, Address Shortcuts, Order Type */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-end">
          {/* Saved Recipients Dropdown - Now uses Customer[] instead of Address[] */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label>Saved Recipients</Label>
              {customerId && (
                <button
                  type="button"
                  onClick={handleUseCustomerName}
                  className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]"
                  title="Use customer's own information as recipient"
                >
                  Use Customer's Name
                </button>
              )}
            </div>
            <Select
              options={
                savedRecipients.length > 0
                  ? [
                      { value: "", label: "Select saved recipient..." },
                      ...savedRecipients.map((customer) => ({
                        value: customer.id,
                        label: `${customer.firstName} ${customer.lastName}`,
                      }))
                    ]
                  : [{ value: "", label: "No saved recipients" }]
              }
              value=""
              placeholder="Select recipient"
              onChange={(value) => {
                const selected = savedRecipients.find(r => r.id === value);
                if (selected) {
                  // Set recipient customer data
                  setRecipientCustomer?.(selected);
                  setRecipientCustomerId?.(selected.id);

                  // Populate name fields
                  setRecipientFirstName(selected.firstName || "");
                  setRecipientLastName(selected.lastName || "");
                  setRecipientPhone(selected.phone || "");

                  // If customer has homeAddress, auto-select it
                  if (selected.homeAddress) {
                    setRecipientAddress({
                      address1: selected.homeAddress.address1 || "",
                      address2: selected.homeAddress.address2 || "",
                      city: selected.homeAddress.city || "",
                      province: selected.homeAddress.province || "",
                      postalCode: selected.homeAddress.postalCode || "",
                      country: selected.homeAddress.country || "CA",
                    });
                    setRecipientCompany(selected.homeAddress.company || "");
                    setRecipientAddressType?.(selected.homeAddress.addressType || "RESIDENCE");
                    setRecipientAddressLabel?.(selected.homeAddress.label || "");
                    setSelectedAddressId?.(selected.homeAddress.id);
                  }
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
              onChange={(cleanedPhone) => {
                setRecipientPhone(cleanedPhone);
                // Trigger search when phone has 10+ digits
                if (cleanedPhone.replace(/\D/g, '').length >= 10) {
                  setRecipientQuery(cleanedPhone);
                }
              }}
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

        {/* NEW: Address Selection for Recipients with Saved Addresses */}
        {orderType === "DELIVERY" && recipientCustomer && (
          (() => {
            // Collect all addresses (homeAddress + addresses array)
            const allAddresses = [
              ...(recipientCustomer.homeAddress ? [recipientCustomer.homeAddress] : []),
              ...(recipientCustomer.addresses || [])
            ];

            // Show dropdown if recipient has any addresses
            if (allAddresses.length > 0) {
              return (
                <div className="mb-4.5">
                  <Label htmlFor="addressSelection">Select Delivery Address</Label>
                  <Select
                    id="addressSelection"
                    options={[
                      { value: "", label: "Select an address..." },
                      ...allAddresses.map((addr: any) => ({
                        value: addr.id,
                        label: `${addr.label || 'Address'} - ${addr.address1}, ${addr.city}`,
                      })),
                      { value: "new", label: "+ Add new address for this recipient" }
                    ]}
                    value={selectedAddressId || ""}
                    onChange={(value) => {
                      if (value === "new") {
                        // Clear address fields for manual entry
                        setRecipientAddress({
                          address1: "",
                          address2: "",
                          city: "",
                          province: "",
                          postalCode: "",
                          country: "CA",
                        });
                        setRecipientCompany("");
                        setRecipientAddressType?.("RESIDENCE");
                        setRecipientAddressLabel?.("");
                        setSelectedAddressId?.(undefined);
                        return;
                      }

                      // Find selected address
                      const selectedAddr = allAddresses.find((addr: any) => addr.id === value);

                      if (selectedAddr) {
                        setRecipientAddress({
                          address1: selectedAddr.address1 || "",
                          address2: selectedAddr.address2 || "",
                          city: selectedAddr.city || "",
                          province: selectedAddr.province || "",
                          postalCode: selectedAddr.postalCode || "",
                          country: selectedAddr.country || "CA",
                        });
                        setRecipientCompany(selectedAddr.company || "");
                        setRecipientAddressType?.(selectedAddr.addressType || "RESIDENCE");
                        setRecipientAddressLabel?.(selectedAddr.label || "");
                        setSelectedAddressId?.(value);
                      }
                    }}
                    placeholder="Select address"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Choose from saved addresses or add a new one
                  </p>
                </div>
              );
            }
            return null;
          })()
        )}

        {/* Address Label - only for delivery */}
        {orderType === "DELIVERY" && (
          <div className="mb-4.5 flex flex-col gap-6 xl:flex-row">
            <div className="w-full xl:w-1/2">
              <Label htmlFor="addressLabel">Address Label (Optional)</Label>
              <Select
                id="addressLabel"
                options={[
                  { value: "", label: "Select label..." },
                  { value: "Home", label: "Home" },
                  { value: "Office", label: "Office" },
                  { value: "Work", label: "Work" },
                  { value: "Cottage", label: "Cottage" },
                  { value: "Mom's House", label: "Mom's House" },
                  { value: "Dad's House", label: "Dad's House" },
                  { value: "Custom", label: "Custom..." }
                ]}
                value={recipientAddressLabel === "" || ["Home", "Office", "Work", "Cottage", "Mom's House", "Dad's House"].includes(recipientAddressLabel || "") ? recipientAddressLabel : "Custom"}
                onChange={(value) => {
                  if (value === "Custom") {
                    setRecipientAddressLabel?.(""); // Clear for custom entry
                  } else {
                    setRecipientAddressLabel?.(value);
                  }
                }}
                placeholder="Select label"
              />
              {(recipientAddressLabel === "" || !["Home", "Office", "Work", "Cottage", "Mom's House", "Dad's House"].includes(recipientAddressLabel || "")) && recipientAddressLabel !== undefined && (
                <div className="mt-2">
                  <InputField
                    type="text"
                    placeholder="Enter custom label (e.g., Grandma's House)"
                    value={recipientAddressLabel || ""}
                    onChange={(e) => setRecipientAddressLabel?.(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

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
                    if (orderType === "DELIVERY" && onDeliveryFeeCalculated && !isManuallyEdited) {
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
            step={0.01}
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

      {/* Recipient Update Modal */}
      {originalRecipientData && (
        <RecipientUpdateModal
          open={showRecipientUpdateModal}
          onClose={() => setShowRecipientUpdateModal(false)}
          originalRecipient={{
            id: selectedRecipientId || '',
            firstName: originalRecipientData.firstName,
            lastName: originalRecipientData.lastName,
            phone: originalRecipientData.phone,
            address1: originalRecipientData.address1,
            city: originalRecipientData.city,
          }}
          currentData={{
            firstName: recipientFirstName,
            lastName: recipientLastName,
            phone: recipientPhone,
            address1: recipientAddress.address1,
            city: recipientAddress.city,
          }}
          onChoice={handleRecipientUpdateChoice}
        />
      )}
    </>
  );
}