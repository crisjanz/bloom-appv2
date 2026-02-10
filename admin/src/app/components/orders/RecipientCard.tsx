// src/components/orders/RecipientCard.tsx
import { useState, useEffect, useRef } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";
import AddressAutocomplete from "@shared/ui/forms/AddressAutocomplete";
import { calculateDeliveryFee, DeliveryZoneResult } from "@shared/utils/deliveryCalculations";
import { centsToDollars, parseUserCurrency } from "@shared/utils/currency";
import RecipientUpdateModal from "./RecipientUpdateModal";
import RecipientSearchModal from "./RecipientSearchModal";
import RecipientPhoneMatchModal from "./RecipientPhoneMatchModal";
import WireoutDetectionModal from "./WireoutDetectionModal";

type Props = {
  orderType: string;
  setOrderType: (val: "DELIVERY" | "PICKUP" | "WIREOUT") => void;
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
  const [isSaving, setIsSaving] = useState(false);
  const [showRecipientUpdateModal, setShowRecipientUpdateModal] =
    useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPhoneMatchModalOpen, setIsPhoneMatchModalOpen] = useState(false);
  const [phoneMatchResults, setPhoneMatchResults] = useState<any[]>([]);
  const [phoneMatchQuery, setPhoneMatchQuery] = useState("");
  const phoneChangeSource = useRef<"manual" | "programmatic">("programmatic");
  const lastPhoneQueryRef = useRef<string | null>(null);
  const phoneLookupControllerRef = useRef<AbortController | null>(null);
  const phoneMatchDetailsCacheRef = useRef<Map<string, any>>(new Map());

  // Phone management state
  const [additionalPhones, setAdditionalPhones] = useState<Array<{ phone: string; label: string }>>([]);

  // Wireout detection state
  const [showWireoutModal, setShowWireoutModal] = useState(false);
  const [pendingAddressForWireout, setPendingAddressForWireout] = useState<string>("");

  const orderTypeOptions = [
    { value: "DELIVERY" as const, label: "Delivery" },
    { value: "PICKUP" as const, label: "Pickup" },
    { value: "WIREOUT" as const, label: "Wire Order" },
  ];

  const updateRecipientPhoneProgrammatically = (value: string) => {
    phoneChangeSource.current = "programmatic";
    setRecipientPhone(value);
  };

  const enrichPhoneMatchesWithDetails = async (matches: any[]) => {
    const cache = phoneMatchDetailsCacheRef.current;
    const enriched = await Promise.all(
      matches.map(async (match) => {
        const id = match?.id;
        if (!id) return match;
        if (cache.has(id)) {
          return { ...match, ...cache.get(id) };
        }
        try {
          const res = await fetch(`/api/customers/${id}`);
          if (!res.ok) throw new Error("Failed to fetch customer");
          const details = await res.json();
          cache.set(id, details);
          return { ...match, ...details };
        } catch (error) {
          console.error("Failed to load recipient detail:", error);
          return match;
        }
      })
    );

    return enriched;
  };

  const resolveCustomerAddress = (customer: any) => {
    if (!customer) return undefined;
    // Priority 1: If a specific address was selected from the search modal
    if (customer.selectedAddress) return customer.selectedAddress;
    // Priority 2: Primary address
    if (customer.primaryAddress) return customer.primaryAddress;
    // Priority 3: Addresses array (first default, or first available)
    if (Array.isArray(customer.addresses) && customer.addresses.length > 0) {
      const defaultAddress = customer.addresses.find(
        (addr: any) => addr.isDefault,
      );
      return defaultAddress || customer.addresses[0];
    }
    // Priority 4: Recipient addresses (legacy)
    if (
      Array.isArray(customer.recipientAddresses) &&
      customer.recipientAddresses.length > 0
    ) {
      return customer.recipientAddresses[0];
    }
    // Priority 5: Direct address property (legacy)
    if (customer.address) return customer.address;
    return undefined;
  };

  const applyAddressFromSource = (address?: any) => {
    if (address) {
      setRecipientAddress({
        address1: address.address1 || "",
        address2: address.address2 || "",
        city: address.city || "",
        province: address.province || "",
        postalCode: address.postalCode || "",
        country: address.country || recipientAddress.country || "CA",
      });
      setRecipientCompany(address.company || "");
      setRecipientAddressType?.(address.addressType || "RESIDENCE");
      setRecipientAddressLabel?.(address.attention || "");
      const addressId =
        address && address.id !== undefined ? String(address.id) : undefined;
      setSelectedAddressId?.(addressId);
    } else {
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
    }
  };

  const applyRecipientCustomer = (
    customer: any,
    options: { trackSelection?: boolean; addressOverride?: any } = {},
  ) => {
    if (!customer) return;

    const { trackSelection, addressOverride } = options;
    const primaryAddress = addressOverride ?? resolveCustomerAddress(customer);
    const customerIdValue =
      customer && customer.id !== undefined ? String(customer.id) : undefined;

    setRecipientCustomer?.(customer);
    setRecipientCustomerId?.(customerIdValue);
    if (trackSelection === true) {
      onSelectedRecipientIdChange?.(customerIdValue);
    } else if (trackSelection === false) {
      onSelectedRecipientIdChange?.(undefined);
    }

    setRecipientFirstName(customer.firstName || "");
    setRecipientLastName(customer.lastName || "");
    updateRecipientPhoneProgrammatically(customer.phone || "");

    applyAddressFromSource(primaryAddress);

    onOriginalRecipientDataChange?.({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phone: customer.phone || "",
      address1: primaryAddress?.address1 || "",
      city: primaryAddress?.city || "",
    });
    onRecipientDataChangedChange?.(false);
  };

  const applyShortcutAddress = (shortcut: any) => {
    if (!shortcut) return;
    setRecipientAddress({
      address1: shortcut.address1 || "",
      address2: shortcut.address2 || "",
      city: shortcut.city || "",
      province: shortcut.province || "",
      postalCode: shortcut.postalCode || "",
      country: shortcut.country || recipientAddress.country || "CA",
    });
    if (
      Array.isArray(shortcut.phoneNumbers) &&
      shortcut.phoneNumbers.length > 0
    ) {
      updateRecipientPhoneProgrammatically(shortcut.phoneNumbers[0]);
    }
    setRecipientCompany(shortcut.label || "");
    setRecipientAddressType?.(shortcut.addressType || "RESIDENCE");
    setRecipientAddressLabel?.(shortcut.label || "");
    setSelectedAddressId?.(undefined);
    setRecipientCustomer?.(undefined);
    setRecipientCustomerId?.(undefined);
    onSelectedRecipientIdChange?.(undefined);
  };

  const handlePhoneMatchModalClose = () => {
    phoneChangeSource.current = "programmatic";
    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
      phoneLookupControllerRef.current = null;
    }
    setIsPhoneMatchModalOpen(false);
    setPhoneMatchResults([]);
    setPhoneMatchQuery("");
  };

  const handleUseExistingAddressFromMatch = (customer: any, address: any) => {
    phoneChangeSource.current = "programmatic";
    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
      phoneLookupControllerRef.current = null;
    }
    applyRecipientCustomer(customer, {
      trackSelection: true,
      addressOverride: address,
    });
    const addressId =
      address && address.id !== undefined ? String(address.id) : undefined;
    setSelectedAddressId?.(addressId);
    if (address?.attention) {
      setRecipientAddressLabel?.(address.attention);
    }
    if (address?.company) {
      setRecipientCompany(address.company);
    }
    setIsPhoneMatchModalOpen(false);
    setPhoneMatchResults([]);
    setPhoneMatchQuery("");
  };

  const handleAddNewAddressForMatch = (customer: any) => {
    phoneChangeSource.current = "programmatic";
    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
      phoneLookupControllerRef.current = null;
    }
    applyRecipientCustomer(customer, { trackSelection: true });
    setRecipientAddress({
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "CA",
    });
    setRecipientCompany("");
    setRecipientAddressLabel?.("");
    setSelectedAddressId?.(undefined);
    onOriginalRecipientDataChange?.(undefined);
    onRecipientDataChangedChange?.(false);
    setIsPhoneMatchModalOpen(false);
    setPhoneMatchResults([]);
    setPhoneMatchQuery("");
  };

  const handleCreateNewRecipientFromMatch = () => {
    setRecipientCustomer?.(undefined);
    setRecipientCustomerId?.(undefined);
    onSelectedRecipientIdChange?.(undefined);
    setSelectedAddressId?.(undefined);
    setRecipientFirstName("");
    setRecipientLastName("");
    setRecipientCompany("");
    setRecipientAddress({
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "CA",
    });
    setRecipientAddressLabel?.("");
    onOriginalRecipientDataChange?.(undefined);
    onRecipientDataChangedChange?.(false);
    phoneChangeSource.current = "programmatic";
    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
      phoneLookupControllerRef.current = null;
    }
    updateRecipientPhoneProgrammatically(recipientPhone);
    setIsPhoneMatchModalOpen(false);
    setPhoneMatchResults([]);
    setPhoneMatchQuery("");
  };

  // Change detection for existing recipients
  useEffect(() => {
    if (
      !selectedRecipientId ||
      !originalRecipientData ||
      !onRecipientDataChangedChange
    )
      return;

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
    onRecipientDataChangedChange,
  ]);

  useEffect(() => {
    if (
      (orderType === "DELIVERY" || orderType === "WIREOUT") &&
      recipientAddress.address1 &&
      recipientAddress.city &&
      recipientAddress.province &&
      onDeliveryFeeCalculated &&
      !isManuallyEdited
    ) {
      const debounceTimer = setTimeout(() => {
        // Check if Google Maps is loaded before calculating
        if (
          typeof google !== "undefined" &&
          google.maps &&
          google.maps.DistanceMatrixService
        ) {
          console.log("🗺️ Google Maps loaded, calculating delivery fee...");

          const handleZoneResult = (result: DeliveryZoneResult) => {
            // If address is out of zone and order is currently DELIVERY, ask if it's a wireout
            if (!result.inZone && orderType === "DELIVERY") {
              const addressSummary = `${recipientAddress.address1}, ${recipientAddress.city}, ${recipientAddress.province}`;
              setPendingAddressForWireout(addressSummary);
              setShowWireoutModal(true);
            }
          };

          calculateDeliveryFee(
            recipientAddress.address1,
            recipientAddress.city,
            recipientAddress.postalCode,
            recipientAddress.province,
            onDeliveryFeeCalculated,
            handleZoneResult
          );
        } else {
          console.warn(
            "⚠️ Google Maps not loaded yet, retrying in 2 seconds...",
          );
          // Retry after Google Maps loads
          setTimeout(() => {
            if (
              typeof google !== "undefined" &&
              google.maps &&
              google.maps.DistanceMatrixService
            ) {
              console.log(
                "🗺️ Google Maps loaded on retry, calculating delivery fee...",
              );

              const handleZoneResult = (result: DeliveryZoneResult) => {
                if (!result.inZone && orderType === "DELIVERY") {
                  const addressSummary = `${recipientAddress.address1}, ${recipientAddress.city}, ${recipientAddress.province}`;
                  setPendingAddressForWireout(addressSummary);
                  setShowWireoutModal(true);
                }
              };

              calculateDeliveryFee(
                recipientAddress.address1,
                recipientAddress.city,
                recipientAddress.postalCode,
                recipientAddress.province,
                onDeliveryFeeCalculated,
                handleZoneResult
              );
            } else {
              console.error(
                "❌ Google Maps failed to load, delivery fee calculation unavailable",
              );
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
    isManuallyEdited,
  ]);

  useEffect(() => {
    const digits = (recipientPhone || "").replace(/\D/g, "");

    if (phoneChangeSource.current !== "manual") {
      return;
    }

    if (digits.length < 10) {
      lastPhoneQueryRef.current = null;
      return;
    }

    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
    }

    const controller = new AbortController();
    phoneLookupControllerRef.current = controller;
    let isActive = true;

    const runLookup = async () => {
      try {
        const res = await fetch(
          `/api/customers/quick-search?query=${encodeURIComponent(digits)}&limit=10`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error("Failed to search recipients");
        const data = await res.json();
        if (!isActive) return;

        lastPhoneQueryRef.current = digits;

        if (Array.isArray(data) && data.length > 0) {
          const enriched = await enrichPhoneMatchesWithDetails(data);
          if (!isActive) return;
          setPhoneMatchResults(enriched);
          setPhoneMatchQuery(digits);
          setIsPhoneMatchModalOpen(true);
          phoneChangeSource.current = "programmatic";
        } else {
          setPhoneMatchResults([]);
          setIsPhoneMatchModalOpen(false);
        }
      } catch (error: any) {
        if (error.name !== "AbortError") {
          console.error("Phone lookup failed:", error);
        }
      } finally {
        if (phoneLookupControllerRef.current === controller) {
          phoneLookupControllerRef.current = null;
        }
      }
    };

    const timer = setTimeout(runLookup, 250);

    return () => {
      isActive = false;
      clearTimeout(timer);
      controller.abort();
      if (phoneLookupControllerRef.current === controller) {
        phoneLookupControllerRef.current = null;
      }
    };
  }, [recipientPhone]);
  const handleAddPhoneField = () => {
    setAdditionalPhones([...additionalPhones, { phone: "", label: "Mobile" }]);
  };

  const handleRemovePhoneField = (index: number) => {
    setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
  };

  const handlePhoneFieldChange = (index: number, value: string) => {
    const updated = [...additionalPhones];
    updated[index] = { ...updated[index], phone: value };
    setAdditionalPhones(updated);
  };

  const handlePhoneLabelChange = (index: number, label: string) => {
    const updated = [...additionalPhones];
    updated[index] = { ...updated[index], label };
    setAdditionalPhones(updated);
  };

  const getPrimaryPhoneLabel = () => {
    return recipientCustomer?.phoneLabel || "Mobile";
  };

  const handlePrimaryPhoneLabelChange = async (newLabel: string) => {
    if (!recipientCustomerId) return;

    try {
      // Update customer's phoneLabel
      const response = await fetch(`/api/customers/${recipientCustomerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneLabel: newLabel }),
      });

      if (!response.ok) throw new Error("Failed to update phone label");

      const updatedCustomer = await response.json();
      setRecipientCustomer?.(updatedCustomer);
    } catch (error) {
      console.error("Failed to update phone label:", error);
    }
  };

  const clearRecipientInfo = () => {
    setRecipientFirstName("");
    setRecipientLastName("");
    setRecipientCompany("");
    updateRecipientPhoneProgrammatically("");
    setRecipientAddress({
      address1: "",
      address2: "",
      city: "",
      province: "",
      postalCode: "",
      country: "",
    });
    setRecipientAddressType?.("RESIDENCE");
    setRecipientAddressLabel?.(""); // Clear label

    // Clear recipient tracking data
    onSelectedRecipientIdChange?.(undefined);
    onOriginalRecipientDataChange?.(undefined);
    onRecipientDataChangedChange?.(false);

    // NEW: Clear customer-based recipient data
    setRecipientCustomer?.(undefined);
    setRecipientCustomerId?.(undefined);
    setSelectedAddressId?.(undefined);
    lastPhoneQueryRef.current = null;
    phoneMatchDetailsCacheRef.current.clear();
    if (phoneLookupControllerRef.current) {
      phoneLookupControllerRef.current.abort();
      phoneLookupControllerRef.current = null;
    }
    setIsPhoneMatchModalOpen(false);
    setPhoneMatchResults([]);
    setPhoneMatchQuery("");
  };

  // NEW: Handle "Use Customer's Name" button click
  const handleUseCustomerName = async () => {
    if (!customerId) {
      alert("Please select a customer first");
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer");
      }

      const customer = await response.json();

      applyRecipientCustomer(customer, { trackSelection: false });
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
        const response = await fetch(
          `/api/customers/${customerId}/save-recipient`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientCustomerId: recipientCustomerId,
            }),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to save recipient link");
        }

        alert("Recipient saved successfully!");
        if (onRecipientSaved) onRecipientSaved();
      } else {
        // Create new customer as recipient
        // First create customer
        const createCustomerResponse = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: recipientFirstName.trim(),
            lastName: recipientLastName.trim(),
            phone: recipientPhone.trim(),
            email: "", // Recipients don't need email initially
          }),
        });

        if (!createCustomerResponse.ok) {
          throw new Error("Failed to create recipient customer");
        }

        const newCustomer = await createCustomerResponse.json();

        // Create address for this customer
        const createAddressResponse = await fetch(
          `/api/customers/${newCustomer.id}/addresses`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              attention: recipientAddressLabel?.trim() || "",
              phone: recipientPhone.trim(),
              address1: recipientAddress.address1.trim(),
              address2: recipientAddress.address2?.trim() || "",
              city: recipientAddress.city.trim(),
              province: recipientAddress.province,
              postalCode: recipientAddress.postalCode.trim(),
              country: recipientAddress.country || "CA",
              company: recipientCompany?.trim() || "",
              addressType: recipientAddressType || "RESIDENCE",
            }),
          },
        );

        if (!createAddressResponse.ok) {
          throw new Error("Failed to create recipient address");
        }

        // Link as recipient
        const linkResponse = await fetch(
          `/api/customers/${customerId}/save-recipient`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              recipientCustomerId: newCustomer.id,
            }),
          },
        );

        if (!linkResponse.ok) {
          throw new Error("Failed to save recipient link");
        }

        alert("New recipient created and saved successfully!");
        if (onRecipientSaved) onRecipientSaved();
      }
    } catch (error: any) {
      console.error("Error saving recipient:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const performSaveRecipient = async (
    action: "update" | "new" | "duplicate",
  ) => {
    setIsSaving(true);
    try {
      let endpoint = `/api/customers/${customerId}/recipients`;
      let method = "POST";

      if (action === "update" && selectedRecipientId) {
        endpoint = `/api/customers/${customerId}/recipients/${selectedRecipientId}`;
        method = "PUT";
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

      const actionText = action === "update" ? "updated" : "saved";
      alert(`Recipient ${actionText} successfully!`);

      // Update tracking data if we updated existing recipient
      if (action === "update") {
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
        },
      });
      alert(`Error: ${error.message}\\n\\nCheck console for details`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRecipientUpdateChoice = (
    choice: "update" | "new" | "duplicate",
  ) => {
    performSaveRecipient(choice);
  };

  const countries = [
    { code: "CA", label: "+1" },
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "AU", label: "+61" },
  ];

  const savedRecipientOptionMap = new Map<
    string,
    {
      customer: any;
      address?: any;
      recipientId: string;
      addressId?: string;
    }
  >();

  const savedRecipientOptions =
    savedRecipients.length > 0
      ? savedRecipients.flatMap((customer: any) => {
          if (!customer || customer.id === undefined || customer.id === null) {
            return [];
          }

          const customerIdValue = String(customer.id);
          const options: { value: string; label: string }[] = [];
          const seenKeys = new Set<string>();

          const addAddressOption = (address: any) => {
            if (!address) return;

            const addressId =
              address.id !== undefined && address.id !== null
                ? String(address.id)
                : undefined;
            const dedupeKey =
              addressId ??
              `${address.address1 || ""}|${address.address2 || ""}|${address.city || ""}|${address.postalCode || ""}`;

            if (seenKeys.has(dedupeKey)) return;
            seenKeys.add(dedupeKey);

            const previewParts = [address.address1, address.city]
              .map((part) =>
                typeof part === "string" ? part.trim() : undefined,
              )
              .filter(Boolean);
            const preview =
              previewParts.length > 0 ? ` - ${previewParts.join(", ")}` : "";

            const value = addressId
              ? `${customerIdValue}::${addressId}`
              : `${customerIdValue}::${dedupeKey}`;

            savedRecipientOptionMap.set(value, {
              customer,
              address,
              recipientId: customerIdValue,
              addressId,
            });

            options.push({
              value,
              label: `${customer.firstName} ${customer.lastName}${preview}`,
            });
          };

          addAddressOption(customer.homeAddress);
          if (Array.isArray(customer.addresses)) {
            customer.addresses.forEach(addAddressOption);
          }
          if (Array.isArray(customer.recipientAddresses)) {
            customer.recipientAddresses.forEach(addAddressOption);
          }

          if (options.length === 0) {
            const value = customerIdValue;
            savedRecipientOptionMap.set(value, {
              customer,
              address: undefined,
              recipientId: customerIdValue,
              addressId: undefined,
            });

            return [
              {
                value,
                label: `${customer.firstName} ${customer.lastName}`,
              },
            ];
          }

          return options;
        })
      : [];

  const selectedRecipientOptionValue = (() => {
    if (savedRecipientOptions.length === 0 || !selectedRecipientId) return "";
    const recipientIdValue = String(selectedRecipientId);

    if (selectedAddressId) {
      const compositeKey = `${recipientIdValue}::${selectedAddressId}`;
      if (savedRecipientOptionMap.has(compositeKey)) {
        return compositeKey;
      }
    }

    if (savedRecipientOptionMap.has(recipientIdValue)) {
      return recipientIdValue;
    }

    for (const [key, meta] of savedRecipientOptionMap.entries()) {
      if (meta.recipientId === recipientIdValue) {
        return key;
      }
    }

    return "";
  })();

  const orderTypeRadioName = `order-type-${activeTab ?? "single"}`;

  const cardTitle =
    orderType === "PICKUP"
      ? "Pickup Person Information"
      : "Recipient Information";

  const titleContent = (
    <div className="flex flex-wrap items-center gap-3">
      <span className="whitespace-nowrap">{cardTitle}</span>
      <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs font-medium text-gray-600 dark:bg-white/10 dark:text-white/70">
        {orderTypeOptions.map(({ value, label }) => (
          <label key={value} className="cursor-pointer select-none">
            <input
              type="radio"
              name={orderTypeRadioName}
              value={value}
              checked={orderType === value}
              onChange={() => setOrderType(value)}
              className="sr-only"
            />
            <span
              className={`block rounded-full px-3 py-1 text-sm transition-colors ${
                orderType === value
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );

  const headerAction = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
      <button
        type="button"
        onClick={() => setIsSearchModalOpen(true)}
        className="inline-flex w-full items-center justify-center rounded-lg border border-brand-500 px-3 py-2 text-sm font-medium text-brand-500 transition hover:bg-brand-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 sm:w-auto"
      >
        Search Customers / Places
      </button>
      <div className="w-full sm:w-64">
        <Select
          options={savedRecipientOptions}
          value={selectedRecipientOptionValue}
          placeholder={
            savedRecipients.length > 0
              ? "Saved recipients"
              : "No saved recipients"
          }
          onChange={(value) => {
            if (!value) {
              onSelectedRecipientIdChange?.(undefined);
              setSelectedAddressId?.(undefined);
              return;
            }
            const optionMeta = savedRecipientOptionMap.get(value);
            if (!optionMeta) {
              onSelectedRecipientIdChange?.(undefined);
              setSelectedAddressId?.(undefined);
              return;
            }

            applyRecipientCustomer(optionMeta.customer, {
              trackSelection: true,
              addressOverride: optionMeta.address,
            });
          }}
          disabled={savedRecipientOptions.length === 0}
        />
      </div>
    </div>
  );

  return (
    <>
      <ComponentCard title={titleContent} headerAction={headerAction}>
        {customerId && (
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleUseCustomerName}
              className="text-xs font-medium text-brand-500 hover:underline dark:text-[#7a9bb0]"
              title="Use customer's own information as recipient"
            >
              Use Customer's Name
            </button>
          </div>
        )}

        {/* Row 1: First Name, Last Name, Company, [Address Label for DELIVERY] */}
        <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
          <InputField
            type="text"
            id="firstName"
            placeholder="First name"
            value={recipientFirstName}
            onChange={(e) => setRecipientFirstName(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
          />
          <InputField
            type="text"
            id="lastName"
            placeholder="Last name"
            value={recipientLastName}
            onChange={(e) => setRecipientLastName(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
          />
          <InputField
            type="text"
            id="company"
            placeholder="Company"
            value={recipientCompany}
            onChange={(e) => setRecipientCompany(e.target.value)}
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
          />
          {orderType === "DELIVERY" ? (
            <InputField
              type="text"
              id="attention"
              placeholder="Attention (optional)"
              value={recipientAddressLabel || ""}
              onChange={(e) => setRecipientAddressLabel?.(e.target.value)}
              className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
            />
          ) : (
            <div></div>
          )}
        </div>

        {/* Phone fields for PICKUP */}
        {orderType === "PICKUP" && (
          <>
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div></div>
              <div></div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <PhoneInput
                    type="tel"
                    id="phone"
                    value={recipientPhone}
                    onChange={(cleanedPhone) => {
                      phoneChangeSource.current = "manual";
                      setRecipientPhone(cleanedPhone);
                    }}
                    countries={countries}
                    selectPosition="none"
                    placeholder="Phone*"
                  />
                </div>
                <div className="w-24">
                  <Select
                    options={[
                      { value: "Mobile", label: "Mobile" },
                      { value: "Home", label: "Home" },
                      { value: "Work", label: "Work" },
                      { value: "Office", label: "Office" },
                      { value: "Other", label: "Other" },
                    ]}
                    value={getPrimaryPhoneLabel()}
                    onChange={(value) => handlePrimaryPhoneLabelChange(value)}
                    placeholder="Type"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleAddPhoneField}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-[#7a9bb0] dark:hover:text-brand-500"
                >
                  + Phone
                </button>
              </div>
            </div>

            {/* Additional Customer Phones (from saved customer data) */}
            {recipientCustomer && Array.isArray(recipientCustomer.phoneNumbers) && recipientCustomer.phoneNumbers.map((phoneObj: any, index: number) => (
              <div key={`saved-${index}`} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div></div>
                <div></div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <InputField
                      type="tel"
                      value={phoneObj.phone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      onFocus={(e) => {
                        phoneChangeSource.current = "manual";
                        setRecipientPhone(phoneObj.phone);
                      }}
                      placeholder="Phone"
                      className="h-11 cursor-pointer"
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Mobile", label: "Mobile" },
                        { value: "Home", label: "Home" },
                        { value: "Work", label: "Work" },
                        { value: "Office", label: "Office" },
                        { value: "Other", label: "Other" },
                      ]}
                      value={phoneObj.label}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                </div>
                <div></div>
              </div>
            ))}

            {/* Additional Phones (new/temporary for this order) */}
            {additionalPhones.map((phoneObj, index) => (
              <div key={`new-${index}`} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div></div>
                <div></div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <PhoneInput
                      type="tel"
                      value={phoneObj.phone}
                      onChange={(value) => handlePhoneFieldChange(index, value)}
                      countries={countries}
                      selectPosition="none"
                      placeholder="Phone"
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Mobile", label: "Mobile" },
                        { value: "Home", label: "Home" },
                        { value: "Work", label: "Work" },
                        { value: "Office", label: "Office" },
                        { value: "Other", label: "Other" },
                      ]}
                      value={phoneObj.label}
                      onChange={(value) => handlePhoneLabelChange(index, value)}
                      placeholder="Type"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleRemovePhoneField(index)}
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
          </>
        )}

        {orderType === "DELIVERY" && (
          <>
            {/* Row 2: Address 1, Address 2, City, Province */}
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <AddressAutocomplete
                id="address1"
                value={recipientAddress.address1}
                onChange={(value) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    address1: value,
                  })
                }
                onAddressSelect={(parsedAddress) => {
                  const newAddress = {
                    ...recipientAddress,
                    ...parsedAddress,
                  };

                  setRecipientAddress(newAddress);

                  if (
                    orderType === "DELIVERY" &&
                    onDeliveryFeeCalculated &&
                    !isManuallyEdited
                  ) {
                    setTimeout(() => {
                      calculateDeliveryFee(
                        parsedAddress.address1,
                        parsedAddress.city,
                        parsedAddress.postalCode,
                        parsedAddress.province,
                        onDeliveryFeeCalculated,
                      );
                    }, 100);
                  }
                }}
                placeholder="Address line 1"
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
              />
              <InputField
                type="text"
                id="address2"
                placeholder="Address line 2"
                value={recipientAddress.address2}
                onChange={(e) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    address2: e.target.value,
                  })
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
              />
              <InputField
                type="text"
                id="city"
                placeholder="City"
                value={recipientAddress.city}
                onChange={(e) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    city: e.target.value,
                  })
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
              />
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
                placeholder="Province / State"
                onChange={(value) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    province: value,
                  })
                }
              />
            </div>

            {/* Row 3: Country, Postal Code, Phone+Type, + Phone */}
            <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
              <InputField
                type="text"
                id="country"
                placeholder="Country"
                value={recipientAddress.country || ""}
                onChange={(e) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    country: e.target.value,
                  })
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
              />
              <InputField
                type="text"
                id="postalCode"
                placeholder="Postal / ZIP code"
                value={recipientAddress.postalCode}
                onChange={(e) =>
                  setRecipientAddress({
                    ...recipientAddress,
                    postalCode: e.target.value,
                  })
                }
                className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-brand-500"
              />
              <div className="flex gap-2">
                <div className="flex-1">
                  <PhoneInput
                    type="tel"
                    id="phone"
                    value={recipientPhone}
                    onChange={(cleanedPhone) => {
                      phoneChangeSource.current = "manual";
                      setRecipientPhone(cleanedPhone);
                    }}
                    countries={countries}
                    selectPosition="none"
                    placeholder="Phone*"
                  />
                </div>
                <div className="w-24">
                  <Select
                    options={[
                      { value: "Mobile", label: "Mobile" },
                      { value: "Home", label: "Home" },
                      { value: "Work", label: "Work" },
                      { value: "Office", label: "Office" },
                      { value: "Other", label: "Other" },
                    ]}
                    value={getPrimaryPhoneLabel()}
                    onChange={(value) => handlePrimaryPhoneLabelChange(value)}
                    placeholder="Type"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={handleAddPhoneField}
                  className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-[#7a9bb0] dark:hover:text-brand-500"
                >
                  + Phone
                </button>
              </div>
            </div>

            {/* Additional Customer Phones (from saved customer data) */}
            {recipientCustomer && Array.isArray(recipientCustomer.phoneNumbers) && recipientCustomer.phoneNumbers.map((phoneObj: any, index: number) => (
              <div key={`saved-${index}`} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div></div>
                <div></div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <InputField
                      type="tel"
                      value={phoneObj.phone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      onFocus={(e) => {
                        phoneChangeSource.current = "manual";
                        setRecipientPhone(phoneObj.phone);
                      }}
                      placeholder="Phone"
                      className="h-11 cursor-pointer"
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Mobile", label: "Mobile" },
                        { value: "Home", label: "Home" },
                        { value: "Work", label: "Work" },
                        { value: "Office", label: "Office" },
                        { value: "Other", label: "Other" },
                      ]}
                      value={phoneObj.label}
                      onChange={() => {}}
                      disabled
                    />
                  </div>
                </div>
                <div></div>
              </div>
            ))}

            {/* Additional Phones (new/temporary for this order) */}
            {additionalPhones.map((phoneObj, index) => (
              <div key={`new-${index}`} className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                <div></div>
                <div></div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <PhoneInput
                      type="tel"
                      value={phoneObj.phone}
                      onChange={(value) => handlePhoneFieldChange(index, value)}
                      countries={countries}
                      selectPosition="none"
                      placeholder="Phone"
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      options={[
                        { value: "Mobile", label: "Mobile" },
                        { value: "Home", label: "Home" },
                        { value: "Work", label: "Work" },
                        { value: "Office", label: "Office" },
                        { value: "Other", label: "Other" },
                      ]}
                      value={phoneObj.label}
                      onChange={(value) => handlePhoneLabelChange(index, value)}
                      placeholder="Type"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={() => handleRemovePhoneField(index)}
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
          </>
        )}

        {orderType === "DELIVERY" ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Delivery fee
                </div>
                <InputField
                  type="number"
                  id={`deliveryFee-${activeTab}`}
                  placeholder="$0.00"
                  value={
                    typeof currentDeliveryFee === "number"
                      ? centsToDollars(currentDeliveryFee).toFixed(2)
                      : ""
                  }
                  onChange={(e) => {
                    const newFee = parseUserCurrency(e.target.value);
                    onManualEditChange?.(true);
                    onDeliveryFeeCalculated?.(newFee);
                  }}
                  className="mt-1 h-10 w-24 rounded-lg border border-gray-300 bg-transparent px-3 text-sm focus:border-brand-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none dark:border-gray-600 dark:bg-transparent"
                  min="0"
                  step={0.01}
                />
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
                        onDeliveryFeeCalculated,
                      );
                    }
                  }}
                  className="text-sm font-medium text-brand-500 hover:underline"
                >
                  Recalculate
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {customerId &&
                recipientFirstName &&
                recipientAddress.address1 && (
                  <button
                    type="button"
                    onClick={handleSaveRecipient}
                    disabled={isSaving}
                    className="text-sm font-medium text-brand-500 hover:underline disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Recipient"}
                  </button>
                )}
              <button
                type="button"
                onClick={clearRecipientInfo}
                className="flex items-center rounded-lg border border-stroke px-5 py-2 text-sm font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
              >
                Clear Recipient Info
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={clearRecipientInfo}
              className="flex items-center rounded-lg border border-stroke px-5 py-2 text-sm font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
            >
              Clear Pickup Info
            </button>
          </div>
        )}
      </ComponentCard>

      <RecipientPhoneMatchModal
        open={isPhoneMatchModalOpen}
        onClose={handlePhoneMatchModalClose}
        phone={phoneMatchQuery}
        matches={phoneMatchResults}
        onUseAddress={handleUseExistingAddressFromMatch}
        onAddNewAddress={handleAddNewAddressForMatch}
        onCreateNewRecipient={handleCreateNewRecipientFromMatch}
      />

      <RecipientSearchModal
        open={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        allowShortcutSelection={orderType === "DELIVERY"}
        onSelectRecipient={(customer) => {
          applyRecipientCustomer(customer, { trackSelection: true });
          setIsSearchModalOpen(false);
        }}
        onSelectShortcut={(shortcut) => {
          applyShortcutAddress(shortcut);
          setIsSearchModalOpen(false);
        }}
      />

      {/* Recipient Update Modal */}
      {originalRecipientData && (
        <RecipientUpdateModal
          open={showRecipientUpdateModal}
          onClose={() => setShowRecipientUpdateModal(false)}
          originalRecipient={{
            id: selectedRecipientId || "",
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

      {/* Wireout Detection Modal */}
      <WireoutDetectionModal
        open={showWireoutModal}
        onClose={() => setShowWireoutModal(false)}
        onWireout={() => {
          setOrderType("WIREOUT");
        }}
        onDirectDelivery={() => {
          // Keep as DELIVERY, user will handle out-of-zone fee manually
        }}
        addressSummary={pendingAddressForWireout}
      />
    </>
  );
}
