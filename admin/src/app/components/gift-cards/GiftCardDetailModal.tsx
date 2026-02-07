import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import FormError from "@shared/ui/components/ui/form/FormError";
import InputField from "@shared/ui/forms/input/InputField";
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
  const [isResending, setIsResending] = useState(false);
  const [isPrintingLabel, setIsPrintingLabel] = useState(false);
  const [isPrintingDetails, setIsPrintingDetails] = useState(false);

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

  const handleResendEmail = async () => {
    if (!card || !card.recipientEmail) return;
    setIsResending(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { data, status } = await apiClient.post(`/api/gift-cards/${card.id}/resend`);
      if (status >= 400) {
        throw new Error(data?.error || "Failed to resend gift card email");
      }
      setActionSuccess(`Gift card email resent to ${card.recipientEmail}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  const handlePrintLabel = async () => {
    if (!card) return;
    setIsPrintingLabel(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const { data, status } = await apiClient.post(`/api/print/gift-card-label/${card.id}`);
      if (status >= 400) {
        throw new Error(data?.error || "Failed to print gift card label");
      }

      if (data?.action === "browser-print" && data?.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
        setActionSuccess("Gift card label opened in a new tab.");
      } else if (data?.action === "queued") {
        setActionSuccess("Gift card label queued for printing.");
      } else if (data?.action === "skipped") {
        setActionError("Label printing is disabled in Print Settings.");
      } else {
        setActionSuccess("Gift card label queued for printing.");
      }
    } catch (err) {
      console.error("Error printing gift card label:", err);
      setActionError(err instanceof Error ? err.message : "Failed to print gift card label");
    } finally {
      setIsPrintingLabel(false);
    }
  };

  const handlePrintDetails = async () => {
    if (!card) return;
    setIsPrintingDetails(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      const amount = card.initialValue > 0 ? card.initialValue : card.currentBalance;
      const { data, status } = await apiClient.post('/api/print/gift-cards', {
        customerName: card.recipientName || card.purchasedBy || undefined,
        cards: [
          {
            cardNumber: card.cardNumber,
            amount,
            type: card.type,
            recipientName: card.recipientName || null,
            recipientEmail: card.recipientEmail || null,
            message: card.message || null,
          },
        ],
      });

      if (status >= 400) {
        throw new Error(data?.error || 'Failed to print gift card');
      }

      if (data?.action === 'browser-print' && data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
        setActionSuccess('Gift card PDF opened in a new tab.');
      } else if (data?.action === 'queued') {
        setActionSuccess('Gift card queued for printing.');
      } else if (data?.action === 'skipped') {
        setActionError('Printing is disabled in Print Settings.');
      } else {
        setActionSuccess('Gift card queued for printing.');
      }
    } catch (err) {
      console.error('Error printing gift card:', err);
      setActionError(err instanceof Error ? err.message : 'Failed to print gift card');
    } finally {
      setIsPrintingDetails(false);
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
    <Modal isOpen={open} onClose={onClose} className="max-w-3xl max-h-[85vh] overflow-y-auto">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gift Card Details</h2>
          {card && (
            <div className="flex items-center gap-1.5">
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-3 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Card Number</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{card.type}</span>
                </div>
                <div className="text-sm font-mono text-gray-900 dark:text-white">{card.cardNumber}</div>
                <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
                  <span>Created {formatDate(card.createdAt)}</span>
                  <span>{card.expirationDate ? `Exp ${formatDate(card.expirationDate)}` : "No expiration"}</span>
                </div>
                {card.purchasedBy && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Purchased by {card.purchasedBy}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-3 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Balance</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">of {formatCurrency(card.initialValue)}</span>
                </div>
                <div className="text-xl font-semibold text-brand-500">
                  {formatCurrency(card.currentBalance)}
                </div>
                {(card.recipientName || card.recipientEmail) && (
                  <div className="pt-1 border-t border-stroke dark:border-strokedark">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Recipient: </span>
                    <span className="text-sm text-gray-900 dark:text-white">{card.recipientName || card.recipientEmail}</span>
                    {card.recipientName && card.recipientEmail && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">{card.recipientEmail}</div>
                    )}
                  </div>
                )}
                {card.message && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">"{card.message}"</div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Transactions</h3>
              <StandardTable
                columns={transactionColumns}
                data={card.transactions || []}
                emptyState={{ message: "No transactions yet" }}
              />
            </div>

            <div className="rounded-lg border border-stroke dark:border-strokedark bg-white dark:bg-boxdark p-3 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Actions</h3>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <InputField
                    label="Adjust Balance"
                    type="number"
                    step="0.01"
                    placeholder="e.g. -10.00 or 25.00"
                    value={adjustAmount || ""}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <InputField
                    label="Notes"
                    placeholder="Reason (optional)"
                    value={adjustNotes || ""}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAdjustBalance}
                  disabled={isAdjusting || !adjustAmount}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap"
                >
                  <SaveIcon className="w-4 h-4" />
                  {isAdjusting ? "Applying..." : "Apply"}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-stroke dark:border-strokedark">
                {card.type === "PHYSICAL" && (
                  <button
                    type="button"
                    onClick={handlePrintLabel}
                    disabled={isPrintingLabel}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPrintingLabel ? "Printing..." : "Print Label"}
                  </button>
                )}
                {card.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={handlePrintDetails}
                    disabled={isPrintingDetails}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPrintingDetails ? "Printing..." : "Print Gift Card"}
                  </button>
                )}
                {card.type === "DIGITAL" && card.recipientEmail && (
                  <button
                    type="button"
                    onClick={handleResendEmail}
                    disabled={isResending}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isResending ? "Sending..." : "Resend to Recipient"}
                  </button>
                )}
                {card.status === "ACTIVE" && (
                  <button
                    type="button"
                    onClick={handleDeactivate}
                    disabled={isDeactivating}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60 ml-auto"
                  >
                    <TrashBinIcon className="h-4 w-4" />
                    {isDeactivating ? "Deactivating..." : "Deactivate"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
