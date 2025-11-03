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
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (nextPage: number) => void;
  expanded: boolean;
  onToggle: (next: boolean) => void;
  onAdd: () => void;
  onView: (recipient: Recipient) => void;
  onEdit: (recipientId: string) => void;
  onDelete: (recipientId: string) => void;
  disabled?: boolean;
}

export default function RecipientAddressesCard({
  recipients,
  totalCount,
  page,
  pageSize,
  onPageChange,
  expanded,
  onToggle,
  onAdd,
  onView,
  onEdit,
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
          {totalCount === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              No saved recipient addresses yet.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                Showing{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {Math.min(page * pageSize + 1, totalCount)} –{" "}
                  {Math.min((page + 1) * pageSize, totalCount)}
                </span>{" "}
                of{" "}
                <span className="font-medium text-gray-900 dark:text-white">
                  {totalCount}
                </span>{" "}
                recipients
              </div>

              {recipients.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
                  No recipients on this page.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white dark:divide-white/[0.05] dark:border-gray-800 dark:bg-white/[0.03]">
                  {recipients.map((recipient) => {
                    const primaryAddress = recipient.addresses?.[0];
                    const fullName = [recipient.firstName, recipient.lastName]
                      .filter(Boolean)
                      .join(" ") || "Recipient";
                    const streetLine = primaryAddress?.address1 || "";

                    return (
                      <div
                        key={recipient.id}
                        className="grid gap-2 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-center"
                      >
                        <span className="font-medium text-gray-900 dark:text-white truncate">{fullName}</span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                          {recipient.phone || "—"}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                          {streetLine || "—"}
                        </span>
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => onView(recipient)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575]"
                          >
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onEdit(recipient.id)}
                            className="text-sm font-medium text-[#597485] hover:text-[#4e6575]"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(recipient.id)}
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-800 dark:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => onPageChange(Math.max(page - 1, 0))}
                  disabled={page === 0}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#597485] hover:text-[#597485] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#597485]"
                >
                  Previous
                </button>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Page {page + 1} / {Math.max(Math.ceil(totalCount / pageSize), 1)}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onPageChange(Math.min(page + 1, Math.max(Math.ceil(totalCount / pageSize) - 1, 0)))
                  }
                  disabled={(page + 1) * pageSize >= totalCount}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-[#597485] hover:text-[#597485] disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:border-[#597485]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </ComponentCardCollapsible>
  );
}
