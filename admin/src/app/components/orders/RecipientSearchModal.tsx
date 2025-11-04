import { useEffect, useMemo, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";

type RecipientSearchModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectRecipient: (recipient: any) => void;
  onSelectShortcut: (shortcut: any) => void;
  allowShortcutSelection?: boolean;
};

type ActiveTab = "recipients" | "shortcuts";

const MIN_RECIPIENT_QUERY_LENGTH = 3;

const RecipientSearchModal = ({
  open,
  onClose,
  onSelectRecipient,
  onSelectShortcut,
  allowShortcutSelection = true,
}: RecipientSearchModalProps) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>("recipients");

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientResults, setRecipientResults] = useState<any[]>([]);
  const [isRecipientLoading, setIsRecipientLoading] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [selectedCustomerForAddresses, setSelectedCustomerForAddresses] = useState<any | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [shortcutQuery, setShortcutQuery] = useState("");
  const [shortcuts, setShortcuts] = useState<any[]>([]);
  const [hasFetchedShortcuts, setHasFetchedShortcuts] = useState(false);
  const [isShortcutLoading, setIsShortcutLoading] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setActiveTab("recipients");
      setRecipientQuery("");
      setRecipientResults([]);
      setRecipientError(null);
      setShortcutQuery("");
      setShortcutError(null);
      setSelectedCustomerForAddresses(null);
      setIsLoadingAddresses(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || activeTab !== "recipients") return;

    if (
      recipientQuery.trim().length > 0 &&
      recipientQuery.trim().length < MIN_RECIPIENT_QUERY_LENGTH
    ) {
      setRecipientResults([]);
      setRecipientError(
        `Type at least ${MIN_RECIPIENT_QUERY_LENGTH} characters to search.`,
      );
      return;
    }

    if (recipientQuery.trim().length === 0) {
      setRecipientResults([]);
      setRecipientError(null);
      return;
    }

    setIsRecipientLoading(true);
    setRecipientError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/customers/quick-search?query=${encodeURIComponent(recipientQuery)}&limit=10`,
        { signal: controller.signal },
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to search recipients");
          }
          return res.json();
        })
        .then((data) => {
          setRecipientResults(Array.isArray(data) ? data : []);
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            console.error("Recipient search failed:", error);
            setRecipientError("Something went wrong while searching.");
            setRecipientResults([]);
          }
        })
        .finally(() => setIsRecipientLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [recipientQuery, activeTab, open]);

  useEffect(() => {
    if (
      !open ||
      !allowShortcutSelection ||
      activeTab !== "shortcuts" ||
      hasFetchedShortcuts
    ) {
      return;
    }

    setIsShortcutLoading(true);
    setShortcutError(null);

    fetch("/api/shortcuts")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load shortcuts");
        }
        return res.json();
      })
      .then((data) => {
        setShortcuts(Array.isArray(data) ? data : []);
        setHasFetchedShortcuts(true);
      })
      .catch((error) => {
        console.error("Shortcut fetch failed:", error);
        setShortcutError("Unable to load shortcuts right now.");
      })
      .finally(() => setIsShortcutLoading(false));
  }, [
    activeTab,
    allowShortcutSelection,
    hasFetchedShortcuts,
    open,
  ]);

  const filteredShortcuts = useMemo(() => {
    if (shortcutQuery.trim().length === 0) return shortcuts;
    const q = shortcutQuery.trim().toLowerCase();
    return shortcuts.filter((shortcut: any) => {
      const label = shortcut.label || "";
      const address = `${shortcut.address1 || ""} ${shortcut.city || ""}`;
      return (
        label.toLowerCase().includes(q) || address.toLowerCase().includes(q)
      );
    });
  }, [shortcutQuery, shortcuts]);

  if (!open) return null;

  const renderRecipientResults = () => {
    if (isRecipientLoading) {
      return (
        <div className="rounded-xl border border-stroke bg-gray-50 p-4 text-sm text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          Searching recipients…
        </div>
      );
    }

    if (recipientError) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
          {recipientError}
        </div>
      );
    }

    if (recipientResults.length === 0) {
      return (
        <div className="rounded-xl border border-stroke bg-gray-50 p-4 text-sm text-gray-500 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          No recipients found yet. Try searching by phone, email, or name.
        </div>
      );
    }

    return (
      <div className="max-h-80 overflow-y-auto rounded-xl border border-stroke shadow-sm dark:border-strokedark">
        {recipientResults.map((customer: any) => (
          <button
            type="button"
            key={customer.id}
            onClick={async () => {
              // Fetch full customer details with addresses
              setIsLoadingAddresses(true);
              try {
                const res = await fetch(`/api/customers/${customer.id}`);
                if (!res.ok) throw new Error("Failed to fetch customer details");
                const fullCustomer = await res.json();

                // Check if customer has multiple addresses
                const addresses = [];
                if (fullCustomer.homeAddress) addresses.push(fullCustomer.homeAddress);
                if (Array.isArray(fullCustomer.addresses)) {
                  fullCustomer.addresses.forEach((addr: any) => {
                    if (!fullCustomer.homeAddress || addr.id !== fullCustomer.homeAddress.id) {
                      addresses.push(addr);
                    }
                  });
                }

                if (addresses.length > 1) {
                  // Show address selection view
                  setSelectedCustomerForAddresses(fullCustomer);
                } else {
                  // Only one or no address, select directly
                  onSelectRecipient(fullCustomer);
                }
              } catch (error) {
                console.error("Failed to load customer details:", error);
                alert("Failed to load customer addresses. Please try again.");
              } finally {
                setIsLoadingAddresses(false);
              }
            }}
            className="flex w-full flex-col items-start gap-1 border-b border-stroke px-5 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
          >
            <span className="font-medium text-black dark:text-white">
              {customer.firstName} {customer.lastName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {customer.phone || "No phone on file"}
              {customer.email ? ` • ${customer.email}` : ""}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const renderShortcutResults = () => {
    if (!allowShortcutSelection) {
      return (
        <div className="rounded-xl border border-stroke bg-gray-50 p-4 text-sm text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          Shortcuts are available for delivery orders only.
        </div>
      );
    }

    if (isShortcutLoading) {
      return (
        <div className="rounded-xl border border-stroke bg-gray-50 p-4 text-sm text-gray-600 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          Loading shortcuts…
        </div>
      );
    }

    if (shortcutError) {
      return (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
          {shortcutError}
        </div>
      );
    }

    if (filteredShortcuts.length === 0) {
      return (
        <div className="rounded-xl border border-stroke bg-gray-50 p-4 text-sm text-gray-500 dark:border-strokedark dark:bg-meta-4/40 dark:text-gray-300">
          No shortcuts match this search.
        </div>
      );
    }

    return (
      <div className="max-h-80 overflow-y-auto rounded-xl border border-stroke shadow-sm dark:border-strokedark">
        {filteredShortcuts.map((shortcut: any) => (
          <button
            type="button"
            key={shortcut.id}
            onClick={() => onSelectShortcut(shortcut)}
            className="flex w-full flex-col items-start gap-1 border-b border-stroke px-5 py-3 text-left text-sm last:border-b-0 hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4"
          >
            <span className="font-medium text-black dark:text-white">
              {shortcut.label || "Shortcut"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-300">
              {shortcut.address1}, {shortcut.city}
            </span>
          </button>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    if (activeTab === "recipients") {
      return (
        <div className="space-y-4">
          <InputField
            type="text"
            placeholder="Search by phone, email, or name"
            value={recipientQuery}
            onChange={(event) => setRecipientQuery(event.target.value)}
          />
          {renderRecipientResults()}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <InputField
          type="text"
          placeholder="Search shortcuts..."
          value={shortcutQuery}
          onChange={(event) => setShortcutQuery(event.target.value)}
          disabled={!allowShortcutSelection}
        />
        {renderShortcutResults()}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-5 dark:border-strokedark">
          <h2 className="text-lg font-semibold text-black dark:text-white">
            Find Recipient
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-meta-4 dark:hover:text-gray-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-5">
          {isLoadingAddresses ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-sm text-gray-600 dark:text-gray-300">
                Loading addresses...
              </div>
            </div>
          ) : selectedCustomerForAddresses ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForAddresses(null)}
                  className="text-sm text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                >
                  ← Back to search
                </button>
              </div>
              <div className="mb-4">
                <h3 className="text-base font-semibold text-black dark:text-white">
                  Select Address for {selectedCustomerForAddresses.firstName}{" "}
                  {selectedCustomerForAddresses.lastName}
                </h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This customer has multiple addresses on file. Choose one:
                </p>
              </div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {selectedCustomerForAddresses.homeAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectRecipient(selectedCustomerForAddresses);
                      setSelectedCustomerForAddresses(null);
                    }}
                    className="flex w-full flex-col items-start gap-1 rounded-lg border-2 border-[#597485] bg-[#597485]/5 px-4 py-3 text-left transition hover:bg-[#597485]/10 dark:border-[#7a9bb0] dark:bg-[#7a9bb0]/10 dark:hover:bg-[#7a9bb0]/20"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#597485] px-2 py-0.5 text-xs font-medium text-white">
                        Home Address
                      </span>
                      {selectedCustomerForAddresses.homeAddress.label && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {selectedCustomerForAddresses.homeAddress.label}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-black dark:text-white">
                      {selectedCustomerForAddresses.homeAddress.address1}
                      {selectedCustomerForAddresses.homeAddress.address2 &&
                        `, ${selectedCustomerForAddresses.homeAddress.address2}`}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {selectedCustomerForAddresses.homeAddress.city},{" "}
                      {selectedCustomerForAddresses.homeAddress.province}{" "}
                      {selectedCustomerForAddresses.homeAddress.postalCode}
                    </span>
                  </button>
                )}
                {Array.isArray(selectedCustomerForAddresses.addresses) &&
                  selectedCustomerForAddresses.addresses
                    .filter(
                      (addr: any) =>
                        !selectedCustomerForAddresses.homeAddress ||
                        addr.id !== selectedCustomerForAddresses.homeAddress.id,
                    )
                    .map((address: any, index: number) => (
                      <button
                        key={address.id || index}
                        type="button"
                        onClick={() => {
                          // Create a modified customer object with this address as the selected one
                          const modifiedCustomer = {
                            ...selectedCustomerForAddresses,
                            selectedAddress: address,
                          };
                          onSelectRecipient(modifiedCustomer);
                          setSelectedCustomerForAddresses(null);
                        }}
                        className="flex w-full flex-col items-start gap-1 rounded-lg border border-stroke bg-white px-4 py-3 text-left transition hover:bg-gray-50 dark:border-strokedark dark:bg-boxdark dark:hover:bg-meta-4"
                      >
                        {address.label && (
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            {address.label}
                          </span>
                        )}
                        <span className="text-sm font-medium text-black dark:text-white">
                          {address.address1}
                          {address.address2 && `, ${address.address2}`}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {address.city}, {address.province} {address.postalCode}
                        </span>
                        {address.company && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {address.company}
                          </span>
                        )}
                      </button>
                    ))}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5 flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-meta-4/40">
                <button
                  type="button"
                  onClick={() => setActiveTab("recipients")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activeTab === "recipients"
                      ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                      : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                  }`}
                >
                  Recipients
                </button>
                <button
                  type="button"
                  onClick={() => allowShortcutSelection && setActiveTab("shortcuts")}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    activeTab === "shortcuts"
                      ? "bg-white text-black shadow-sm dark:bg-boxdark dark:text-white"
                      : "text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white"
                  } ${!allowShortcutSelection ? "cursor-not-allowed opacity-50" : ""}`}
                  disabled={!allowShortcutSelection}
                >
                  Shortcuts
                </button>
              </div>

              {renderTabContent()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipientSearchModal;

