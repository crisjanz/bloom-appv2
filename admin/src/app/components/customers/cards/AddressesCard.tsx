import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import { Address } from "@shared/types/customer";

interface AddressesCardProps {
  addresses: Address[];
  primaryAddressId?: string;
  expanded: boolean;
  onToggle: (next: boolean) => void;
  onAdd: () => void;
  onEdit: (address: Address) => void;
  onDelete: (addressId: string) => void;
  onSetPrimary: (addressId: string) => void;
  disabled?: boolean;
}

const formatAddress = (address: Address) => {
  const lines = [
    [address.address1, address.address2].filter(Boolean).join(", "),
    [address.city, address.province].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(" • ");

  return lines || "No address details available";
};

export default function AddressesCard({
  addresses,
  primaryAddressId,
  expanded,
  onToggle,
  onAdd,
  onEdit,
  onDelete,
  onSetPrimary,
  disabled = false,
}: AddressesCardProps) {
  return (
    <ComponentCardCollapsible
      title="Addresses"
      isOpen={expanded}
      onToggle={onToggle}
      defaultOpen={false}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Manage all delivery addresses on file for this customer.
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Address
        </button>
      </div>

      {disabled && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
          Save this customer first to add addresses.
        </div>
      )}

      {!disabled && (
        <>
          {addresses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              No addresses on file yet.
            </div>
          ) : (
            <div className="space-y-4">
              {addresses.map((address) => {
                const isPrimary = address.id === primaryAddressId;
                return (
                  <div
                    key={address.id}
                    className={`rounded-xl border p-4 shadow-sm transition ${
                      isPrimary
                        ? "border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-900/20"
                        : "border-gray-200 bg-white hover:border-brand-500/40 dark:border-gray-800 dark:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          {address.attention && (
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              {address.attention}
                            </div>
                          )}
                          {isPrimary && (
                            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {address.addressType || "RESIDENCE"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">
                          {formatAddress(address)}
                        </div>
                        {address.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Phone: {address.phone}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => onSetPrimary(address.id)}
                            className="rounded-lg border border-brand-300 px-3 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:border-brand-700 dark:text-brand-400 dark:hover:bg-brand-900/20"
                          >
                            Set as Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEdit(address)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-500 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(address.id)}
                          disabled={isPrimary}
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                          title={isPrimary ? "Cannot delete primary address" : ""}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </ComponentCardCollapsible>
  );
}
