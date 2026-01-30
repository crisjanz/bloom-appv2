import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import FormError from "@shared/ui/components/ui/form/FormError";
import FormFooter from "@shared/ui/components/ui/form/FormFooter";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import StandardTable, { ColumnDef } from "@shared/ui/components/ui/table/StandardTable";
import { useApiClient } from "@shared/hooks/useApiClient";
import { useBusinessTimezone } from "@shared/hooks/useBusinessTimezone";
import { formatCurrency, parseUserCurrency } from "@shared/utils/currency";
import { getGiftCardStatusColor } from "@shared/utils/statusColors";
import { SaveIcon, TrashBinIcon } from "@shared/assets/icons";

const statusLabels: Record<string, string> = {
  INACTIVE: "Inactive",
  ACTIVE: "Active",
  USED: "Used",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

type GiftCardTransaction = {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  notes?: string;
  orderId?: string;
  employeeId?: string;
  createdAt: string;
};

type GiftCardDetail = {
  id: string;
  cardNumber: string;
  type: "PHYSICAL" | "DIGITAL";
  initialValue: number;
  currentBalance: number;
  status: "INACTIVE" | "ACTIVE" | "USED" | "EXPIRED" | "CANCELLED";
  purchasedBy?: string;
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  createdAt: string;
  expirationDate?: string | null;
  transactions: GiftCardTransaction[];
};

type Props = {
  open: boolean;
  cardId: string | null;
  onClose: () => void;
  onCardUpdated: () => void;
};

export default function GiftCardDetailModal({ open, cardId, onClose, onCardUpdated }: Props) {
  const apiClient = useApiClient();
  const { formatDate: formatBusinessDate, loading: timezoneLoading } = useBusinessTimezone();
  const [card, setCard] = useState<GiftCardDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const formatDate = useCallback((value?: string | null) => {
    if (!value) return "—";
    if (timezoneLoading) return value;
    return formatBusinessDate(new Date(value));
  }, [formatBusinessDate, timezoneLoading]);

  const loadCard = useCallback(async () => {
    if (!cardId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, status } = await apiClient.get(`/api/gift-cards/${cardId}`);
      if (status >= 400) {
        throw new Error(data?.error || "Failed to load gift card details");
      }
      setCard(data as GiftCardDetail);
    } catch (err) {
      console.error("Error loading gift card details:", err);
      setError(err instanceof Error ? err.message : "Failed to load gift card details");
    } finally {
      setLoading(false);
    }
  }, [apiClient, cardId]);

  useEffect(() => {
    if (open) {
      setActionError(null);
      setActionSuccess(null);
      setAdjustAmount("");
      setAdjustNotes("");
    } else {
      setCard(null);
    }
  }, [open]);

  useEffect(() => {
    if (open && cardId) {
      loadCard();
    }
  }, [open, cardId, loadCard]);

  const handleDeactivate = async () => {
    if (!card) return;
    const confirmed = window.confirm(`Deactivate gift card ${card.cardNumber}? This cannot be undone.`);
    if (!confirmed) return;

    setIsDeactivating(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { data, status } = await apiClient.patch(`/api/gift-cards/${card.id}/deactivate`);
      if (status >= 400) {
        throw new Error(data?.error || "Failed to deactivate gift card");
      }
      setActionSuccess("Gift card deactivated.");
      onCardUpdated();
      await loadCard();
    } catch (err) {
      console.error("Error deactivating gift card:", err);
      setActionError(err instanceof Error ? err.message : "Failed to deactivate gift card");
    } finally {
      setIsDeactivating(false);
    }
  };

  const handleAdjustBalance = async () => {
    if (!card) return;
    setActionError(null);
    setActionSuccess(null);

    const amountCents = parseUserCurrency(adjustAmount || "");
    if (!amountCents) {
      setActionError("Adjustment amount is required.");
      return;
    }

    try {
      setIsAdjusting(true);
      const { data, status } = await apiClient.post(`/api/gift-cards/${card.id}/adjust`, {
        amount: amountCents,
        notes: adjustNotes.trim() || undefined,
      });
      if (status >= 400) {
        throw new Error(data?.error || "Failed to adjust balance");
      }
      setActionSuccess("Balance adjusted successfully.");
      setAdjustAmount("");
      setAdjustNotes("");
      onCardUpdated();
      await loadCard();
    } catch (err) {
      console.error("Error adjusting gift card balance:", err);
      setActionError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setIsAdjusting(false);
    }
  };

  const transactionColumns = useMemo<ColumnDef<GiftCardTransaction>[]>(
    () => [
      {
        key: "createdAt",
        header: "Date",
        render: (transaction) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatDate(transaction.createdAt)}
          </span>
        ),
        className: "w-[140px]",
      },
      {
        key: "type",
        header: "Type",
        render: (transaction) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {transaction.type.replace(/_/g, " ")}
          </span>
        ),
        className: "w-[120px]",
      },
      {
        key: "amount",
        header: "Amount",
        render: (transaction) => {
          const isPositive = transaction.amount > 0;
          const formatted = formatCurrency(Math.abs(transaction.amount));
          return (
            <span className={`text-sm font-medium ${isPositive ? "text-green-600" : "text-red-600"}`}>
              {isPositive ? "+" : "-"}{formatted}
            </span>
          );
        },
        className: "w-[110px]",
      },
      {
        key: "balanceAfter",
        header: "Balance",
        render: (transaction) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(transaction.balanceAfter)}
          </span>
        ),
        className: "w-[110px]",
      },
      {
        key: "notes",
        header: "Notes",
        render: (transaction) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {transaction.notes || "—"}
          </span>
        ),
      },
    ],
    [formatDate]
  );

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-5xl">
      <div className="p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Gift Card Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View balances, transactions, and manage card status.
            </p>
          </div>
          {card && (
            <div className="flex items-center gap-2">
              <span className={`text-2xl leading-none ${getGiftCardStatusColor(card.status)}`}>•</span>
              <span className={`text-sm font-medium ${getGiftCardStatusColor(card.status)}`}>
                {statusLabels[card.status] || card.status}
              </span>
            </div>
          )}
        </div>

        {error && <FormError error={error} />}
        {actionError && <FormError error={actionError} />}
        {actionSuccess && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionSuccess}
          </div>
        )}

        {loading || !card ? (
          <div className="flex justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Card Number</span>
                  <div className="mt-1 text-sm font-mono text-gray-900 dark:text-white">{card.cardNumber}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Type</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">{card.type}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Created</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(card.createdAt)}</div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Expiration</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {card.expirationDate ? formatDate(card.expirationDate) : "No expiration"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Initial Value</span>
                  <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(card.initialValue)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Current Balance</span>
                  <div className="mt-1 text-2xl font-semibold text-brand-500">
                    {formatCurrency(card.currentBalance)}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Purchased By</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {card.purchasedBy || "—"}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-2">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Recipient</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {card.recipientName || "—"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {card.recipientEmail || ""}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Message</span>
                  <div className="mt-1 text-sm text-gray-900 dark:text-white">
                    {card.message || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Transaction History</h3>
              </div>
              <StandardTable
                columns={transactionColumns}
                data={card.transactions || []}
                emptyState={{ message: "No transactions yet" }}
              />
            </div>

            <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Admin Actions</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Adjust balances or deactivate cards.</p>
                </div>
                {card.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <TrashBinIcon className="h-4 w-4" />
                    {isDeactivating ? "Deactivating..." : "Deactivate"}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputField
                  label="Adjustment Amount"
                  type="number"
                  step="0.01"
                  placeholder="e.g. -10.00 or 25.00"
                  value={adjustAmount || ""}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />

                <div className="md:col-span-2">
                  <Label htmlFor="adjust-notes">Notes</Label>
                  <textarea
                    id="adjust-notes"
                    rows={3}
                    value={adjustNotes || ""}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-sm text-black outline-none transition focus:border-brand-500 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-brand-500"
                    placeholder="Optional reason for adjustment"
                  />
                </div>
              </div>

              <FormFooter
                onSubmit={handleAdjustBalance}
                submitting={isAdjusting}
                submitText="Apply Adjustment"
                submitIcon={<SaveIcon className="w-4 h-4" />}
                submitDisabled={!adjustAmount}
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
