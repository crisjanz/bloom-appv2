// src/pages/TakeOrderPage.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import CustomerCard from "@app/components/orders/CustomerCard";
import MessageSuggestions from "@app/components/orders/MessageSuggestions";
import MultiOrderTabs from "@app/components/orders/MultiOrderTabs";
import OrderDetailsCard from "@app/components/orders/OrderDetailsCard";
import TakeOrderDraftModal from "@app/components/orders/TakeOrderDraftModal";
import PaymentSection from "@app/components/orders/payment/PaymentSection";
import { usePaymentCalculations } from "@domains/payments/hooks/usePaymentCalculations";
// MIGRATION: Using bridge file temporarily (will be replaced with direct domain imports)
import {
  useCustomerSearch,
  useSelectedCustomer,
} from "@domains/customers/hooks/useCustomerService.ts";
import { useApiClient } from "@shared/hooks/useApiClient";
import { useOrderState } from "@shared/hooks/useOrderState";
import { getOrCreateGuestCustomer } from "@shared/utils/customerHelpers";
import { centsToDollars, coerceCents } from "@shared/utils/currency";
import {
  deleteTakeOrderLocalDraft,
  getTakeOrderLocalDrafts,
  saveTakeOrderLocalDraft,
  TakeOrderLocalDraft,
} from "@shared/utils/takeOrderLocalDrafts";

type Props = {
  isOverlay?: boolean;
  onComplete?: (orderData: any) => void;
  onCancel?: () => void;
  initialCustomer?: any;
};

const AUTO_RESTORE_WINDOW_MS = 5 * 60 * 1000;

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function TakeOrderPage({
  isOverlay = false,
  onComplete,
  onCancel,
  initialCustomer,
}: Props) {
  const migrateOrdersToCents = (orders: any[]) => {
    return orders.map((order) => ({
      ...order,
      customProducts: Array.isArray(order.customProducts)
        ? order.customProducts.map((product: any) => ({
            ...product,
            price: product.price ? coerceCents(product.price).toString() : "",
          }))
        : order.customProducts,
    }));
  };
  const apiClient = useApiClient();
  const [draftSessionId, setDraftSessionId] = useState<string>(() => generateUUID());
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [localDrafts, setLocalDrafts] = useState<TakeOrderLocalDraft[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftToast, setDraftToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 🔹 Employee State
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<
    "phone" | "walkin" | "external" | "website" | "pos"
  >("phone");

  // 🔹 Discount state
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<"$" | "%">("$");
  const [giftCardDiscount, setGiftCardDiscount] = useState(0);
  const [automaticDiscount, setAutomaticDiscount] = useState(0);
  const [appliedAutomaticDiscounts, setAppliedAutomaticDiscounts] = useState<
    any[]
  >([]);

  const cleanPhoneNumber = (value: string) => {
    if (value.startsWith("+")) {
      return "+" + value.slice(1).replace(/\D/g, "");
    }
    return value.replace(/\D/g, "");
  };

  const refreshLocalDrafts = useCallback(() => {
    setLocalDrafts(getTakeOrderLocalDrafts());
  }, []);

  const showDraftToast = useCallback((message: string, type: "success" | "error" = "success") => {
    setDraftToast({ message, type });
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setDraftToast(null);
    }, 3000);
  }, []);

  const mapOrdersToDraftPayload = (orders: any[]) => {
    return orders.map((order) => ({
      ...order,
      deliveryFee: centsToDollars(order.deliveryFee || 0),
      customProducts: Array.isArray(order.customProducts)
        ? order.customProducts.map((product: any) => ({
            ...product,
            price: centsToDollars(coerceCents(product.price || "0")).toFixed(2),
          }))
        : order.customProducts,
    }));
  };

  // 🔹 Message Suggestions
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [messageSuggestions, setMessageSuggestions] = useState<any[]>([]);

  // 🔹 Saved Recipients State
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);

  // 🔥 Custom Hooks - MIGRATED to Customer Domain
  const {
    query: customerQuery,
    setQuery: setCustomerQuery,
    results: customerResults,
    isSearching,
    clearSearch,
  } = useCustomerSearch();
  const { selectedCustomer, setSelectedCustomer, clearCustomer, hasCustomer } =
    useSelectedCustomer(initialCustomer);
  const orderState = useOrderState();

  // Debug: Check what selectedCustomer actually contains
  if (selectedCustomer) {
    console.log("🔍 TakeOrder selectedCustomer:", selectedCustomer);
    console.log("  Has ID?:", !!selectedCustomer.id, selectedCustomer.id);
  }

  // Legacy compatibility layer for existing code
  const customerState = {
    customer: selectedCustomer || {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      notes: "",
    },
    setCustomer: setSelectedCustomer,
    customerId: selectedCustomer?.id || null,
    customerName: selectedCustomer
      ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
      : null,
    setCustomerId: (id: string | null) => {
      if (id) {
        // Would need to load customer by ID - for now just keep simple
      } else {
        clearCustomer();
      }
    },
    customerQuery,
    setCustomerQuery,
    customerResults,
    setCustomerResults: () => {}, // Results are managed by domain hook
    savedRecipients: savedRecipients,
    setSavedRecipients: setSavedRecipients,
    clearSavedRecipients: () => setSavedRecipients([]),
    resetCustomer: clearCustomer,
  };

  // ✅ Get total delivery fee from all orders
  const totalDeliveryFee = orderState.getTotalDeliveryFee();

  // ✅ Helper function to calculate items total properly
  const calculateItemsTotal = () => {
    return orderState.orders.reduce((sum, order) => {
      return (
        sum +
        order.customProducts.reduce((pSum, p) => {
          const price = coerceCents(p.price || "0");
          const qty = parseInt(p.qty) || 0;
          return pSum + price * qty;
        }, 0)
      );
    }, 0);
  };

  const itemCount = orderState.orders.reduce((sum, order) => {
    return (
      sum +
      order.customProducts.reduce((pSum, p) => {
        const qty = parseInt(p.qty) || 0;
        const hasContent = Boolean(p.description?.trim()) || coerceCents(p.price || "0") > 0;
        return pSum + (hasContent ? qty || 1 : 0);
      }, 0)
    );
  }, 0);

  // ✅ Calculate manual discount amount with proper parsing
  const itemsTotal = calculateItemsTotal();
  const manualDiscountAmountCents =
    manualDiscountType === "%"
      ? Math.round(((itemsTotal + totalDeliveryFee) * manualDiscount) / 100)
      : manualDiscount;

  const totalDiscountCents =
    manualDiscountAmountCents +
    couponDiscount +
    giftCardDiscount +
    automaticDiscount;

  const { itemTotal, subtotal, gst, pst, grandTotal } = usePaymentCalculations(
    orderState.orders,
    totalDeliveryFee,
    totalDiscountCents,
    "$", // Always $ since we calculate the amount above
  );

  // 🔧 Effects
  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployeeList(data))
      .catch((err) => console.error("Failed to load employees:", err));
  }, []);

  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setMessageSuggestions(data))
      .catch((err) =>
        console.error("Failed to load message suggestions:", err),
      );
  }, []);

  useEffect(() => {
    const drafts = getTakeOrderLocalDrafts();
    if (drafts.length !== 1) return;

    const [draft] = drafts;
    const savedAt = new Date(draft.savedAt).getTime();
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > AUTO_RESTORE_WINDOW_MS) {
      return;
    }

    applyLocalDraft(draft);
    deleteTakeOrderLocalDraft(draft.id);
  }, []);

  useEffect(() => {
    if (showDraftModal) {
      refreshLocalDrafts();
    }
  }, [showDraftModal, refreshLocalDrafts]);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      if (itemCount > 0) {
        saveTakeOrderLocalDraft({
          id: draftSessionId,
          orders: orderState.orders,
          customer: customerState.customer || null,
          employee,
          orderSource,
          couponDiscount,
          manualDiscount,
          manualDiscountType,
          giftCardDiscount,
          automaticDiscount,
          appliedAutomaticDiscounts,
          activeTab: orderState.activeTab,
          savedAt: new Date().toISOString(),
          itemCount,
          totalCents: grandTotal,
        });
      } else {
        deleteTakeOrderLocalDraft(draftSessionId);
      }

      if (showDraftModal) {
        refreshLocalDrafts();
      }
    }, 1000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [
    orderState.orders,
    orderState.activeTab,
    customerState.customer,
    employee,
    orderSource,
    couponDiscount,
    manualDiscount,
    manualDiscountType,
    giftCardDiscount,
    automaticDiscount,
    appliedAutomaticDiscounts,
    itemCount,
    grandTotal,
    draftSessionId,
    showDraftModal,
    refreshLocalDrafts,
  ]);

  // Handle order completion - different behavior for POS overlay vs standalone page
  const handleOrderComplete = (transferData?: any) => {
    if (isOverlay && onComplete) {
      // If transferData is provided (from "Send to POS"), use it directly
      if (transferData) {
        console.log("🔄 Passing POS transfer data:", transferData);
        deleteTakeOrderLocalDraft(draftSessionId);
        setDraftSessionId(generateUUID());
        onComplete(transferData);
        return;
      }

      // Otherwise, regular POS overlay mode - return order data to POS
      const orderData = {
        type: "delivery_order",
        customer: customerState.customer,
        orders: orderState.orders,
        totals: {
          itemTotal,
          deliveryFee: totalDeliveryFee,
          discount: totalDiscountCents,
          gst,
          pst,
          grandTotal,
        },
        employee,
        orderSource: isOverlay ? "pos" : orderSource,
        description: `${orderState.orders[0]?.orderType === "PICKUP" ? "Pickup" : "Delivery"} Order - ${customerState.customer.firstName} ${customerState.customer.lastName}`,
        displayName: `${orderState.orders[0]?.orderType === "PICKUP" ? "Pickup" : "Delivery"} Order`,
        total: grandTotal,
      };

      onComplete(orderData);
      deleteTakeOrderLocalDraft(draftSessionId);
      setDraftSessionId(generateUUID());
    } else {
      // Standalone page mode - normal order completion
      customerState.resetCustomer();
      orderState.resetOrders();
      setCouponDiscount(0);
      setManualDiscount(0);
      setManualDiscountType("$");
      setGiftCardDiscount(0);
      setAutomaticDiscount(0);
      setAppliedAutomaticDiscounts([]);
      deleteTakeOrderLocalDraft(draftSessionId);
      setDraftSessionId(generateUUID());
    }
  };

  // Handler for automatic discount changes
  const handleAutomaticDiscountChange = (amount: number, discounts: any[]) => {
    setAutomaticDiscount(amount);
    setAppliedAutomaticDiscounts(discounts);
  };

  const handleSaveDraft = async () => {
    if (itemCount === 0) {
      showDraftToast("Order is empty, nothing to save.", "error");
      return;
    }

    try {
      setIsSavingDraft(true);

      let customerId = selectedCustomer?.id;
      if (!customerId) {
        customerId = await getOrCreateGuestCustomer();
      }

      const ordersInDollars = mapOrdersToDraftPayload(orderState.orders);
      const response = await apiClient.post("/api/orders/save-draft", {
        customerId,
        orders: ordersInDollars,
      });

      if (response.status < 200 || response.status >= 300 || !response.data?.success) {
        throw new Error(response.data?.error || "Failed to save draft");
      }

      const savedDraft = response.data?.drafts?.[0];
      const draftNumber = savedDraft?.orderNumber ?? savedDraft?.id ?? "Draft";
      showDraftToast(`Saved as Draft #${draftNumber}`);

      deleteTakeOrderLocalDraft(draftSessionId);
      setDraftSessionId(generateUUID());
      refreshLocalDrafts();
    } catch (error) {
      console.error("Failed to save draft:", error);
      showDraftToast("Failed to save draft. Please try again.", "error");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleLoadDrafts = () => {
    refreshLocalDrafts();
    setShowDraftModal(true);
  };

  const normalizeOrderSource = (source?: string) => {
    if (!source) return "phone";
    if (source === "wirein" || source === "wireout") return "external";
    if (source === "website" || source === "pos") return "phone";
    return source as "phone" | "walkin" | "external";
  };

  const applyLocalDraft = (draft: TakeOrderLocalDraft) => {
    if (draft.employee) {
      setEmployee(draft.employee);
    }
    if (!isOverlay) {
      setOrderSource(normalizeOrderSource(draft.orderSource));
    }
    customerState.setCustomer(draft.customer || null);
    orderState.setOrders(migrateOrdersToCents(draft.orders || []));
    orderState.setActiveTab(draft.activeTab || 0);
    setCouponDiscount(draft.couponDiscount || 0);
    setManualDiscount(draft.manualDiscount || 0);
    setManualDiscountType(draft.manualDiscountType || "$");
    setGiftCardDiscount(draft.giftCardDiscount || 0);
    setAutomaticDiscount(draft.automaticDiscount || 0);
    setAppliedAutomaticDiscounts(draft.appliedAutomaticDiscounts || []);
    setDraftSessionId(draft.id);
  };

  const mapDbOrderToDraft = (order: any) => {
    const address = order.deliveryAddress || {};
    const recipient = order.recipientCustomer || {};
    const orderItems = Array.isArray(order.orderItems) ? order.orderItems : [];

    const deliveryDate = order.deliveryDate
      ? new Date(order.deliveryDate).toISOString().split("T")[0]
      : "";

    const customProducts =
      orderItems.length > 0
        ? orderItems.map((item: any) => ({
            description: item.customName || item.description || "",
            category: "",
            price: centsToDollars(item.unitPrice || 0).toFixed(2),
            qty: String(item.quantity ?? 1),
            tax: true,
          }))
        : [{ description: "", category: "", price: "", qty: "1", tax: true }];

    return {
      recipientFirstName: address.firstName || recipient.firstName || "",
      recipientLastName: address.lastName || recipient.lastName || "",
      recipientCompany: address.company || "",
      recipientPhone: address.phone || recipient.phone || "",
      recipientAddress: {
        address1: address.address1 || "",
        address2: address.address2 || "",
        city: address.city || "",
        province: address.province || "",
        postalCode: address.postalCode || "",
        country: address.country || "CA",
      },
      recipientAddressType: address.addressType || "RESIDENCE",
      recipientAddressLabel: address.label || "",
      orderType: order.type || "DELIVERY",
      deliveryDate,
      deliveryTime: order.deliveryTime || "",
      deliveryInstructions: order.specialInstructions || "",
      cardMessage: order.cardMessage || "",
      deliveryFee: order.deliveryFee || 0,
      isDeliveryFeeManuallyEdited: false,
      customProducts,
      selectedRecipientId: order.recipientCustomerId || undefined,
      recipientDataChanged: false,
      originalRecipientData: undefined,
      recipientCustomer: order.recipientCustomer || undefined,
      recipientCustomerId: order.recipientCustomerId || undefined,
      selectedAddressId: order.deliveryAddressId || undefined,
    };
  };

  const handleLoadLocalDraft = (draft: TakeOrderLocalDraft) => {
    applyLocalDraft(draft);
    deleteTakeOrderLocalDraft(draft.id);
    refreshLocalDrafts();
    setShowDraftModal(false);
  };

  const handleLoadDbDraft = (order: any) => {
    const mappedOrder = mapDbOrderToDraft(order);
    orderState.setOrders([mappedOrder]);
    orderState.setActiveTab(0);
    if (order.customer) {
      customerState.setCustomer(order.customer);
    }
    if (!isOverlay && order.orderSource) {
      setOrderSource(normalizeOrderSource(String(order.orderSource).toLowerCase()));
    }
    setCouponDiscount(0);
    setManualDiscount(0);
    setManualDiscountType("$");
    setGiftCardDiscount(0);
    setAutomaticDiscount(0);
    setAppliedAutomaticDiscounts([]);
    setDraftSessionId(generateUUID());
    setShowDraftModal(false);
  };

  return (
    <div
      className={
        isOverlay ? "" : "mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10"
      }
    >
      {draftToast && (
        <div
          className={`fixed right-6 top-6 z-[120] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            draftToast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {draftToast.message}
        </div>
      )}
      <div className="space-y-6">
        {/* Employee Selection */}
        <OrderDetailsCard
          employee={employee}
          setEmployee={setEmployee}
          employeeList={employeeList}
          orderSource={isOverlay ? "pos" : orderSource}
          setOrderSource={setOrderSource}
          formData={{
            customer: customerState.customer,
            orders: orderState.orders,
            deliveryCharge: totalDeliveryFee,
            discount: manualDiscount,
            discountType: manualDiscountType,
            couponCode: "",
            subscribe: false,
            sendEmailReceipt: false,
            orderSource: isOverlay ? "pos" : orderSource,
          }}
          onSaveDraft={handleSaveDraft}
          onLoadDrafts={handleLoadDrafts}
          isSavingDraft={isSavingDraft}
        />

        {/* Customer Info */}
        <CustomerCard
          customer={customerState.customer}
          setCustomer={customerState.setCustomer}
          customerQuery={customerState.customerQuery}
          setCustomerQuery={customerState.setCustomerQuery}
          customerResults={customerState.customerResults}
          setCustomerResults={customerState.setCustomerResults}
          savedRecipients={customerState.savedRecipients}
          setSavedRecipients={customerState.setSavedRecipients}
          clearSavedRecipients={customerState.clearSavedRecipients}
          orders={orderState.orders}
          setOrders={orderState.setOrders}
          activeTab={orderState.activeTab}
          setCustomerId={customerState.setCustomerId}
        />

        {/* Multi-Order Tabs */}
        <MultiOrderTabs
          orders={orderState.orders}
          setOrders={orderState.setOrders}
          activeTab={orderState.activeTab}
          setActiveTab={orderState.setActiveTab}
          setShowSuggestions={setShowSuggestions}
          setCardMessage={setSelectedSuggestion}
          savedRecipients={customerState.savedRecipients}
          customerId={customerState.customerId}
          onRecipientSaved={() => {
            if (customerState.customerId) {
              fetch(`/api/customers/${customerState.customerId}/recipients`)
                .then((res) => res.json())
                .then((data) => customerState.setSavedRecipients(data || []))
                .catch((err) =>
                  console.error("Failed to refresh recipients:", err),
                );
            }
          }}
          updateOrderDeliveryFee={orderState.updateOrderDeliveryFee}
          updateOrderManualEditFlag={orderState.updateOrderManualEditFlag}
        />

        {/* Payment Summary */}
        <PaymentSection
          customerState={customerState}
          orderState={orderState}
          itemTotal={itemTotal}
          gst={gst}
          pst={pst}
          grandTotal={grandTotal}
          totalDeliveryFee={totalDeliveryFee}
          employee={employee}
          orderSource={isOverlay ? "pos" : orderSource}
          cleanPhoneNumber={cleanPhoneNumber}
          couponDiscount={couponDiscount}
          setCouponDiscount={setCouponDiscount}
          manualDiscount={manualDiscount}
          setManualDiscount={setManualDiscount}
          manualDiscountType={manualDiscountType}
          setManualDiscountType={setManualDiscountType}
          giftCardDiscount={giftCardDiscount}
          setGiftCardDiscount={setGiftCardDiscount}
          onOrderComplete={handleOrderComplete}
          isOverlay={isOverlay}
          onAutomaticDiscountChange={handleAutomaticDiscountChange}
        />
      </div>

      {/* Message Suggestions Popup */}
      <MessageSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={messageSuggestions}
        selected={selectedSuggestion}
        setSelected={setSelectedSuggestion}
        customerId={customerState.customerId}
        onSubmit={() => {
          const updated = [...orderState.orders];
          if (updated[orderState.activeTab]) {
            updated[orderState.activeTab].cardMessage = selectedSuggestion;
            orderState.setOrders(updated);
          }
          setShowSuggestions(false);
        }}
      />

      <TakeOrderDraftModal
        isOpen={showDraftModal}
        onClose={() => setShowDraftModal(false)}
        localDrafts={localDrafts}
        onLoadLocalDraft={handleLoadLocalDraft}
        onDeleteLocalDraft={(draftId) => {
          deleteTakeOrderLocalDraft(draftId);
          refreshLocalDrafts();
        }}
        onLoadDbDraft={handleLoadDbDraft}
        onNotify={showDraftToast}
      />
    </div>
  );
}
