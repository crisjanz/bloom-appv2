import { useEffect, useMemo, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import { CheckCircleIcon, DollarLineIcon, ListIcon } from "@shared/assets/icons";
import Select from "@shared/ui/forms/Select";

type RefundModalProps = {
  isOpen: boolean;
  transactionNumber: string | null;
  onClose: () => void;
  onRefundComplete?: () => void;
};

type RefundStep = "type" | "details" | "confirm";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD"
  }).format((value || 0) / 100);

const parseCurrency = (value: string) => {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};

const RefundModal = ({ isOpen, transactionNumber, onClose, onRefundComplete }: RefundModalProps) => {
  const [step, setStep] = useState<RefundStep>("type");
  const [loading, setLoading] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [refundType, setRefundType] = useState<"FULL" | "PARTIAL">("FULL");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [itemRefunds, setItemRefunds] = useState<Record<string, number>>({});
  const [taxRefunded, setTaxRefunded] = useState(0);
  const [deliveryFeeRefunded, setDeliveryFeeRefunded] = useState(0);
  const [taxManualOverride, setTaxManualOverride] = useState(false);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const stepIndex = step === "type" ? 0 : step === "details" ? 1 : 2;

  useEffect(() => {
    if (!isOpen || !transactionNumber) {
      return;
    }

    setLoading(true);
    setError(null);
    setStep("type");
    setRefundType("FULL");
    setSelectedMethod("");
    setReason("");
    setNotes("");

    fetch(`/api/payment-transactions/${transactionNumber}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load transaction");
        }
        return res.json();
      })
      .then((data) => {
        setTransaction(data);
        const firstOrderId = data?.orderPayments?.[0]?.orderId ?? null;
        setSelectedOrderId(firstOrderId);
      })
      .catch((err) => {
        console.error("Failed to fetch transaction:", err);
        setError(err instanceof Error ? err.message : "Failed to load transaction");
      })
      .finally(() => setLoading(false));
  }, [isOpen, transactionNumber]);

  const orderRefundedMap = useMemo(() => {
    if (!transaction?.refunds) return {};
    const map: Record<string, number> = {};
    transaction.refunds.forEach((refund: any) => {
      (refund.orderRefunds || []).forEach((orderRefund: any) => {
        map[orderRefund.orderId] = (map[orderRefund.orderId] || 0) + orderRefund.amount;
      });
    });
    return map;
  }, [transaction]);

  const orders = useMemo(() => {
    return (transaction?.orderPayments || []).map((orderPayment: any) => {
      const order = orderPayment.order;
      const refunded = orderRefundedMap[orderPayment.orderId] || 0;
      const refundable = Math.max(0, orderPayment.amount - refunded);
      return {
        orderId: orderPayment.orderId,
        orderNumber: order?.orderNumber,
        amount: orderPayment.amount,
        refundable,
        order
      };
    });
  }, [transaction, orderRefundedMap]);

  const selectedOrder = orders.find((order) => order.orderId === selectedOrderId) || orders[0];
  const orderOptions = useMemo(
    () =>
      orders.map((order) => ({
        value: order.orderId,
        label: `#${order.orderNumber || order.orderId} • ${formatCurrency(order.refundable)}`
      })),
    [orders]
  );

  const paymentMethodOptions = useMemo(() => {
    if (!transaction?.paymentMethods) return [];
    const hasExternal = transaction.paymentMethods.some(
      (method: any) => method.type?.toUpperCase?.() === "EXTERNAL"
    );

    if (hasExternal) {
      const source = transaction.paymentMethods.find(
        (method: any) => method.type?.toUpperCase?.() === "EXTERNAL"
      )?.providerMetadata?.source;
      return [
        {
          value: "EXTERNAL:INTERNAL",
          label: source ? `${source} External` : "External Provider",
          methodType: "EXTERNAL",
          provider: "INTERNAL"
        }
      ];
    }

    const options = transaction.paymentMethods.map((method: any, index: number) => ({
      value: `${method.type}:${method.provider}:${method.id ?? index}`,
      label: `${method.type} (${method.provider})`,
      methodType: method.type,
      provider: method.provider
    }));

    options.push(
      {
        value: "STORE_CREDIT:INTERNAL",
        label: "Store Credit",
        methodType: "STORE_CREDIT",
        provider: "INTERNAL"
      },
      {
        value: "CASH:INTERNAL",
        label: "Cash",
        methodType: "CASH",
        provider: "INTERNAL"
      }
    );

    return options;
  }, [transaction]);
  const paymentMethodSelectOptions = useMemo(
    () =>
      paymentMethodOptions.map((option) => ({
        value: option.value,
        label: option.label
      })),
    [paymentMethodOptions]
  );

  useEffect(() => {
    if (!selectedMethod && paymentMethodOptions.length === 1) {
      setSelectedMethod(paymentMethodOptions[0].value);
    }
  }, [paymentMethodOptions, selectedMethod]);

  useEffect(() => {
    if (!selectedOrder) return;

    const items = selectedOrder.order?.orderItems || [];
    const initialRefunds: Record<string, number> = {};
    items.forEach((item: any) => {
      initialRefunds[item.id] = item.rowTotal || 0;
    });
    setItemRefunds(initialRefunds);
    setDeliveryFeeRefunded(refundType === "FULL" ? selectedOrder.order?.deliveryFee || 0 : 0);
    setTaxRefunded(refundType === "FULL" ? selectedOrder.order?.totalTax || 0 : 0);
    setTaxManualOverride(false);
  }, [selectedOrderId, refundType]);

  useEffect(() => {
    if (!selectedOrder || refundType !== "PARTIAL" || taxManualOverride) return;

    const items = selectedOrder.order?.orderItems || [];
    const itemsTotal = items.reduce((sum: number, item: any) => sum + (item.rowTotal || 0), 0);
    const refundSubtotal = Object.values(itemRefunds).reduce((sum, amount) => sum + amount, 0);
    const taxTotal = selectedOrder.order?.totalTax || 0;
    const ratio = itemsTotal > 0 ? refundSubtotal / itemsTotal : 0;
    setTaxRefunded(Math.round(taxTotal * ratio));
  }, [itemRefunds, refundType, selectedOrder, taxManualOverride]);

  const totalRefundAmount = useMemo(() => {
    if (!selectedOrder) return 0;
    if (refundType === "FULL") return selectedOrder.refundable;
    const itemsTotal = Object.values(itemRefunds).reduce((sum, amount) => sum + amount, 0);
    return itemsTotal + taxRefunded + deliveryFeeRefunded;
  }, [refundType, selectedOrder, itemRefunds, taxRefunded, deliveryFeeRefunded]);

  const handleSubmit = async () => {
    if (!transaction || !selectedOrder) return;
    if (!selectedMethod) {
      setError("Select a refund method.");
      return;
    }
    if (!reason.trim()) {
      setError("Refund reason is required.");
      return;
    }
    if (totalRefundAmount <= 0) {
      setError("Refund amount must be greater than $0.00.");
      return;
    }

    setLoading(true);
    setError(null);

    const method = paymentMethodOptions.find((option) => option.value === selectedMethod);
    if (!method) {
      setError("Select a valid refund method.");
      setLoading(false);
      return;
    }

    const itemBreakdown =
      refundType === "PARTIAL"
        ? (selectedOrder.order?.orderItems || []).map((item: any) => ({
            orderItemId: item.id,
            productName: item.customName || item.description || "Item",
            quantity: item.quantity || 1,
            unitPrice: item.unitPrice || 0,
            refundAmount: itemRefunds[item.id] || 0
          }))
        : [];

    try {
      const combinedReason = notes.trim()
        ? `${reason.trim()} - ${notes.trim()}`
        : reason.trim();

      const response = await fetch("/api/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          refundType,
          totalAmount: totalRefundAmount,
          reason: combinedReason,
          employeeId: undefined,
          orderRefunds: [{ orderId: selectedOrder.orderId, amount: totalRefundAmount }],
          itemBreakdown,
          taxRefunded: refundType === "PARTIAL" ? taxRefunded : selectedOrder.order?.totalTax || 0,
          deliveryFeeRefunded:
            refundType === "PARTIAL" ? deliveryFeeRefunded : selectedOrder.order?.deliveryFee || 0,
          refundMethods: [
            {
              paymentMethodType: method.methodType,
              provider: method.provider,
              amount: totalRefundAmount,
              status: "manual"
            }
          ]
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Refund failed");
      }

      onRefundComplete?.();
      onClose();
    } catch (err) {
      console.error("Refund failed:", err);
      setError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Process Refund</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Transaction {transactionNumber || "—"}
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading || !transaction ? (
          <div className="text-sm text-gray-500">Loading refund details...</div>
        ) : (
          <>
            {step === "type" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                    onClick={() => {
                      setRefundType("FULL");
                      setStep("details");
                    }}
                  >
                    Full refund
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-600"
                    onClick={() => {
                      setRefundType("PARTIAL");
                      setStep("details");
                    }}
                  >
                    Partial refund
                  </button>
                </div>
              </div>
            )}

            {step === "details" && selectedOrder && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Select
                    label="Order"
                    options={orderOptions}
                    placeholder="Select order"
                    value={selectedOrderId || ""}
                    onChange={(value) => setSelectedOrderId(value)}
                  />
                </div>

                {refundType === "PARTIAL" && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-700">Items</div>
                    <div className="space-y-2">
                      {(selectedOrder.order?.orderItems || []).map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3">
                          <div className="flex-1 text-sm text-gray-700">
                            {item.customName || item.description || "Item"}
                          </div>
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                            value={(itemRefunds[item.id] || 0) / 100}
                            onChange={(event) =>
                              setItemRefunds((prev) => ({
                                ...prev,
                                [item.id]: parseCurrency(event.target.value)
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-sm text-gray-700">Delivery Fee</div>
                      <input
                        type="number"
                        step="0.01"
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                        value={deliveryFeeRefunded / 100}
                        onChange={(event) => setDeliveryFeeRefunded(parseCurrency(event.target.value))}
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-sm text-gray-700">Tax</div>
                      <input
                        type="number"
                        step="0.01"
                        className="w-28 rounded-lg border border-gray-200 px-2 py-1 text-sm"
                        value={taxRefunded / 100}
                        onChange={(event) => {
                          setTaxManualOverride(true);
                          setTaxRefunded(parseCurrency(event.target.value));
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Select
                    label="Refund Method"
                    options={paymentMethodSelectOptions}
                    placeholder="Select method"
                    value={selectedMethod}
                    onChange={(value) => setSelectedMethod(value)}
                  />
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  <div>Refunding: {formatCurrency(totalRefundAmount)}</div>
                  <div>Order: {selectedOrder ? `#${selectedOrder.orderNumber || selectedOrder.orderId}` : "—"}</div>
                  <div>
                    Method: {paymentMethodOptions.find((option) => option.value === selectedMethod)?.label || "—"}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Reason *</label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    rows={3}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
                onClick={step === "type" ? onClose : () => setStep(step === "confirm" ? "details" : "type")}
              >
                {step === "type" ? "Cancel" : "Back"}
              </button>
              <div className="flex flex-1 justify-center">
                <div className="flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                  {[
                    { label: "Type", icon: DollarLineIcon },
                    { label: "Details", icon: ListIcon },
                    { label: "Confirm", icon: CheckCircleIcon }
                  ].map((item, index) => {
                    const isActive = stepIndex === index;
                    const isComplete = stepIndex > index;
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center">
                        <div
                          className={[
                            "flex h-6 w-6 items-center justify-center rounded-full border text-xs",
                            isComplete || isActive
                              ? "border-brand-500 bg-brand-500 text-white"
                              : "border-gray-300 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950"
                          ].join(" ")}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span
                          className={[
                            "ml-2 mr-3",
                            isActive ? "text-gray-900 dark:text-gray-100" : ""
                          ].join(" ")}
                        >
                          {item.label}
                        </span>
                        {index < 2 && (
                          <span
                            className={[
                              "h-px w-6",
                              isComplete ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-700"
                            ].join(" ")}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {step === "details" ? (
                <button
                  type="button"
                  className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white"
                  onClick={() => setStep(step === "type" ? "details" : "confirm")}
                >
                  Next
                </button>
              ) : (
                step === "confirm" ? (
                  <button
                    type="button"
                    className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? "Processing..." : "Process Refund"}
                  </button>
                ) : (
                  <div className="min-w-[88px]" />
                )
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default RefundModal;
