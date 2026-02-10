import { Fragment } from "react";

type RecipientPhoneMatchModalProps = {
  open: boolean;
  onClose: () => void;
  phone: string;
  matches: any[];
  onUseAddress: (customer: any, address: any) => void;
  onAddNewAddress: (customer: any) => void;
  onCreateNewRecipient: () => void;
};

const buildAddressList = (customer: any) => {
  const addresses: any[] = [];

  if (customer?.primaryAddress) {
    addresses.push({ ...customer.primaryAddress, __source: "primary" });
  }

  if (Array.isArray(customer?.addresses)) {
    customer.addresses.forEach((addr: any) =>
      addresses.push({ ...addr, __source: "address" }),
    );
  }

  if (Array.isArray(customer?.recipientAddresses)) {
    customer.recipientAddresses.forEach((addr: any) =>
      addresses.push({ ...addr, __source: "recipient" }),
    );
  }

  return addresses;
};

const formatAddressPreview = (address: any) => {
  const parts = [
    address?.label,
    address?.address1,
    address?.city,
    address?.province,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim());

  if (parts.length === 0 && typeof address?.postalCode === "string") {
    parts.push(address.postalCode.trim());
  }

  return parts.join(" • ");
};

const RecipientPhoneMatchModal = ({
  open,
  onClose,
  phone,
  matches,
  onUseAddress,
  onAddNewAddress,
  onCreateNewRecipient,
}: RecipientPhoneMatchModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100002] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl dark:bg-boxdark">
        <div className="flex items-center justify-between border-b border-stroke px-6 py-5 dark:border-strokedark">
          <div>
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Existing recipient found
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Matches for {phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-meta-4 dark:hover:text-gray-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          <div className="space-y-5">
            {matches.map((customer: any) => {
              const addresses = buildAddressList(customer);
              const fullName = `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim() || "Recipient";
              const contactLine = [
                customer?.phone,
                customer?.email,
              ]
                .filter((part) => typeof part === "string" && part.trim().length > 0)
                .join(" • ");

              return (
                <div
                  key={customer?.id || customer?.phone}
                  className="rounded-xl border border-gray-200 p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-semibold text-black dark:text-white">
                        {fullName}
                      </div>
                      {contactLine && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {contactLine}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onAddNewAddress(customer)}
                      className="rounded-lg border border-dashed border-brand-500 px-3 py-1.5 text-xs font-medium text-brand-500 transition hover:bg-brand-500 hover:text-white"
                    >
                      Add new address
                    </button>
                  </div>

                  {addresses.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {addresses.map((address, index) => {
                        const preview = formatAddressPreview(address);
                        return (
                          <Fragment
                            key={address.id || `${customer.id || index}-${index}`}
                          >
                            <button
                              type="button"
                              onClick={() => onUseAddress(customer, address)}
                              className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left transition hover:border-brand-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:border-[#7a9bb0] dark:hover:bg-gray-800"
                            >
                              <div className="flex flex-wrap items-center gap-2 text-sm text-black dark:text-white">
                                <span className="font-medium">
                                  {address.addressType || "RESIDENCE"}
                                </span>
                                {address.attention && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Attn: {address.attention}
                                  </span>
                                )}
                                {preview && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {preview}
                                  </span>
                                )}
                              </div>
                            </button>
                          </Fragment>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-400">
                      No saved addresses yet. Add one to use it again quickly.
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Need a different person with this phone number?
              </div>
              <button
                type="button"
                onClick={onCreateNewRecipient}
                className="rounded-lg border border-brand-500 px-4 py-2 text-sm font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-white"
              >
                Create new recipient
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientPhoneMatchModal;
