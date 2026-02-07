import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CustomerInfoCard,
  AddressesCard,
  RecipientAddressesCard,
} from "@app/components/customers/cards";
import OrderHistoryCard from "@app/components/customers/cards/OrderHistoryCard";
import AddAddressModal, {
  AddressFormValues,
} from "@app/components/customers/modals/AddAddressModal";
import AddRecipientModal, {
  RecipientFormValues,
} from "@app/components/customers/modals/AddRecipientModal";
import ViewRecipientModal from "@app/components/customers/modals/ViewRecipientModal";
import { Customer, Address } from "@shared/types/customer";
import ComponentCard from "@shared/ui/common/ComponentCard";

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addresses?: Address[];
}

type ExpandedSectionKey = "addresses" | "recipients" | "orderHistory";

const emptyCustomer: Customer = {
  id: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  notes: "",
  isHouseAccount: false,
  houseAccountTerms: "NET_30",
  houseAccountNotes: "",
  homeAddress: undefined,
};

const RECIPIENTS_PER_PAGE = 25;

export default function CustomerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id && id !== "new");

  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [totalRecipients, setTotalRecipients] = useState(0);
  const [recipientPage, setRecipientPage] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<ExpandedSectionKey, boolean>>({
    addresses: false,
    recipients: false,
    orderHistory: false,
  });
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressDraft, setAddressDraft] = useState<Address | null>(null);

  const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
  const [isViewRecipientModalOpen, setIsViewRecipientModalOpen] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);

  const toggleSection = useCallback((section: ExpandedSectionKey, next?: boolean) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: typeof next === "boolean" ? next : !prev[section],
    }));
  }, []);

  const customerId = customer.id;

  const loadCustomer = useCallback(async () => {
    if (!isEditMode || !id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/customers/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch customer");
      }

      const data = await response.json();

      setCustomer((prev) => ({
        ...prev,
        ...data,
      }));

      const homeAddressId = data.homeAddress?.id;
      const additionalAddresses: Address[] = (data.addresses || []).filter(
        (address: Address) => address.id !== homeAddressId
      );
      setAddresses(additionalAddresses);
    } catch (err) {
      console.error(err);
      setError("Failed to load customer details.");
    } finally {
      setLoading(false);
    }
  }, [id, isEditMode]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  const loadRecipients = useCallback(async (pageToLoad = 0) => {
    if (!isEditMode || !customerId) return;

    try {
      const response = await fetch(
        `/api/customers/${customerId}/recipients?paginated=true&page=${pageToLoad}&pageSize=${RECIPIENTS_PER_PAGE}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recipients");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setRecipients(data);
        setTotalRecipients(data.length);
        setRecipientPage(0);
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      const total = typeof data.total === "number" ? data.total : items.length;
      const pageFromServer = typeof data.page === "number" ? data.page : pageToLoad;
      const pageSizeFromServer = typeof data.pageSize === "number" ? data.pageSize : RECIPIENTS_PER_PAGE;

      if (total > 0 && items.length === 0 && pageFromServer > 0) {
        const lastPage = Math.max(Math.ceil(total / pageSizeFromServer) - 1, 0);
        if (lastPage !== pageFromServer) {
          await loadRecipients(lastPage);
          return;
        }
      }

      setRecipients(items);
      setTotalRecipients(total);
      setRecipientPage(pageFromServer);
    } catch (err) {
      console.error(err);
      setError("Failed to load recipients.");
    }
  }, [customerId, isEditMode]);

  useEffect(() => {
    loadRecipients();
  }, [loadRecipients]);

  const displayAddresses = useMemo(() => {
    const homeAddress = customer.homeAddress;
    const filteredAdditional = homeAddress
      ? addresses.filter((address) => address.id !== homeAddress.id)
      : addresses;

    return homeAddress ? [homeAddress, ...filteredAdditional] : filteredAdditional;
  }, [addresses, customer.homeAddress]);

  const handleCustomerChange = (field: keyof Customer, value: any) => {
    setCustomer((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCustomer = async () => {
    if (!customer.firstName?.trim() || !customer.lastName?.trim()) {
      setError("First and last name are required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEditMode ? `/api/customers/${id}` : "/api/customers";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...customer,
          homeAddress: customer.homeAddress,
        }),
      });

      if (!response.ok) {
        throw new Error(isEditMode ? "Failed to save customer." : "Failed to create customer.");
      }

      const result = await response.json();

      if (isEditMode) {
        setCustomer((prev) => ({
          ...prev,
          ...result,
        }));

        const homeAddressId = result.homeAddress?.id;
        const additionalAddresses: Address[] = (result.addresses || []).filter(
          (address: Address) => address.id !== homeAddressId
        );
        setAddresses(additionalAddresses);
        await loadRecipients(0);
      } else {
        navigate(`/customers/${result.id}`);
      }
    } catch (err) {
      console.error(err);
      setError(isEditMode ? "Failed to save customer." : "Failed to create customer.");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAddressModal = (address?: Address) => {
    setAddressDraft(address ?? null);
    setIsAddressModalOpen(true);
  };

  const handleCloseAddressModal = () => {
    setAddressDraft(null);
    setIsAddressModalOpen(false);
  };

  const handleSaveAddress = async (values: AddressFormValues) => {
    if (!customerId) {
      throw new Error("Save the customer before managing addresses.");
    }

    const { id: addressId, ...payload } = values;
    const isUpdate = Boolean(addressId);
    const url = isUpdate
      ? `/api/customers/addresses/${addressId}`
      : `/api/customers/${customerId}/addresses`;
    const method = isUpdate ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(isUpdate ? "Failed to update address." : "Failed to add address.");
    }

    const savedAddress: Address = await response.json();

    setError("");
    toggleSection("addresses", true);

    setAddresses((prev) => {
      const existingIndex = prev.findIndex((addr) => addr.id === savedAddress.id);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = savedAddress;
        return next;
      }
      return [...prev, savedAddress];
    });

    setCustomer((prev) => ({
      ...prev,
      homeAddress:
        prev.homeAddress && prev.homeAddress.id === savedAddress.id
          ? savedAddress
          : prev.homeAddress ?? (!isUpdate ? savedAddress : prev.homeAddress),
    }));
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!customerId) {
      setError("Save the customer before deleting addresses.");
      return;
    }

    try {
      const response = await fetch(`/api/customers/addresses/${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete address.");
      }

      setError("");
      setAddresses((prev) => prev.filter((address) => address.id !== addressId));

      setCustomer((prev) => ({
        ...prev,
        homeAddress: prev.homeAddress && prev.homeAddress.id === addressId ? undefined : prev.homeAddress,
      }));
    } catch (err) {
      console.error(err);
      setError("Failed to delete address.");
    }
  };

  const handleAddRecipient = () => {
    setIsRecipientModalOpen(true);
  };

  const handleCloseRecipientModal = () => {
    setIsRecipientModalOpen(false);
  };

  const handleLinkExistingRecipient = async (recipientCustomerId: string) => {
    if (!customerId) {
      throw new Error("Save the customer before adding recipients.");
    }

    const response = await fetch(`/api/customers/${customerId}/save-recipient`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientCustomerId }),
    });

    if (!response.ok) {
      throw new Error("Failed to add recipient.");
    }

    await loadRecipients(0);
    toggleSection("recipients", true);
  };

  const handleCreateRecipient = async (details: RecipientFormValues) => {
    if (!customerId) {
      throw new Error("Save the customer before adding recipients.");
    }

    const response = await fetch(`/api/customers/${customerId}/recipients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(details),
    });

    if (!response.ok) {
      throw new Error("Failed to create recipient.");
    }

    await loadRecipients(0);
    toggleSection("recipients", true);
  };

  const handleDeleteRecipient = async (recipientId: string) => {
    if (!customerId) {
      setError("Save the customer before removing recipients.");
      return;
    }

    try {
      const response = await fetch(`/api/customers/${customerId}/recipients/${recipientId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove recipient.");
      }

      setError("");
      await loadRecipients(recipientPage);

      setSelectedRecipient((prev) => (prev && prev.id === recipientId ? null : prev));
    } catch (err) {
      console.error(err);
      setError("Failed to remove recipient.");
    }
  };

  const handleViewRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setIsViewRecipientModalOpen(true);
  };

  const handleCloseViewRecipient = () => {
    setIsViewRecipientModalOpen(false);
    setSelectedRecipient(null);
  };

  const handleRecipientPageChange = useCallback(
    (nextPage: number) => {
      loadRecipients(nextPage);
    },
    [loadRecipients]
  );

  if (loading) {
    return (
      <ComponentCard className="flex items-center justify-center py-14">
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500" />
          Loading customer…
        </div>
      </ComponentCard>
    );
  }

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-title-md font-bold text-black dark:text-white">
          {isEditMode ? "Edit Customer" : "Add New Customer"}
        </h2>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/customers")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveCustomer}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {saving ? "Saving..." : isEditMode ? "Save Changes" : "Create Customer"}
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        <CustomerInfoCard customer={customer} onCustomerChange={handleCustomerChange} error={error} />

        <AddressesCard
          addresses={displayAddresses}
          expanded={expandedSections.addresses}
          onToggle={(next) => toggleSection("addresses", next)}
          onAdd={() => handleOpenAddressModal()}
          onEdit={(address) => handleOpenAddressModal(address)}
          onDelete={handleDeleteAddress}
          disabled={!customerId}
        />

        <RecipientAddressesCard
          recipients={recipients}
          totalCount={totalRecipients}
          page={recipientPage}
          pageSize={RECIPIENTS_PER_PAGE}
          onPageChange={handleRecipientPageChange}
          expanded={expandedSections.recipients}
          onToggle={(next) => toggleSection("recipients", next)}
          onAdd={handleAddRecipient}
          onView={handleViewRecipient}
          onEdit={(recipientId) => navigate(`/customers/${recipientId}`)}
          onDelete={handleDeleteRecipient}
          disabled={!customerId}
        />

        {isEditMode && customerId && (
          <OrderHistoryCard
            customerId={customerId}
            expanded={expandedSections.orderHistory}
            onToggle={(next) => toggleSection("orderHistory", next)}
          />
        )}
      </div>

      <AddAddressModal
        isOpen={isAddressModalOpen}
        onClose={handleCloseAddressModal}
        onSave={handleSaveAddress}
        initialAddress={addressDraft ?? undefined}
      />

      <AddRecipientModal
        isOpen={isRecipientModalOpen}
        onClose={handleCloseRecipientModal}
        onLinkExisting={handleLinkExistingRecipient}
        onCreateRecipient={handleCreateRecipient}
      />

      <ViewRecipientModal
        isOpen={isViewRecipientModalOpen}
        onClose={handleCloseViewRecipient}
        recipient={selectedRecipient ?? undefined}
      />
    </>
  );
}
