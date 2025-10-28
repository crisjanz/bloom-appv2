import ComponentCardCollapsible from "@shared/ui/common/ComponentCardCollapsible";
import { Address } from "@shared/types/customer";

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addresses?: Address[];
}

interface RecipientAddressesCardProps {
  recipients: Recipient[];
  expanded: boolean;
  onToggle: (next: boolean) => void;
  onAdd: () => void;
  onView: (recipient: Recipient) => void;
  onDelete: (recipientId: string) => void;
  disabled?: boolean;
}

export default function RecipientAddressesCard({
  recipients,
  expanded,
  onToggle,
  onAdd,
  onView,
  onDelete,
  disabled = false,
}: RecipientAddressesCardProps) {
  return (
    <ComponentCardCollapsible
      title="Recipient Addresses"
      isOpen={expanded}
      onToggle={onToggle}
      defaultOpen={false}
    >
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Saved recipients make repeat deliveries faster.
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled}
          className="inline-flex items-center gap-2 rounded-lg bg-[#597485] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#4e6575] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add Recipient
        </button>
      </div>

      {disabled && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
          Save this customer first to add recipient addresses.
        </div>
      )}

      {!disabled && (
        <>
          {recipients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              No saved recipient addresses yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-[#597485]/40 dark:border-gray-800 dark:bg-white/[0.03]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {[recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || "Recipient"}
                      </div>
                      {recipient.email && (
                        <div className="text-sm text-gray-500 dark:text-gray-300">{recipient.email}</div>
                      )}
                      {recipient.phone && (
                        <div className="text-sm text-gray-500 dark:text-gray-300">{recipient.phone}</div>
                      )}
                      {recipient.addresses && recipient.addresses.length > 0 && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {recipient.addresses[0].address1}, {recipient.addresses[0].city}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onView(recipient)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#597485] hover:text-[#597485] dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#597485]"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(recipient.id)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </ComponentCardCollapsible>
  );
}
