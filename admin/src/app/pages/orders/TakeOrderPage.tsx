// src/pages/TakeOrderPage.tsx
import { useState, useEffect } from "react";
import CustomerCard from "@app/components/orders/CustomerCard";
import MessageSuggestions from "@app/components/orders/MessageSuggestions";
import MultiOrderTabs from "@app/components/orders/MultiOrderTabs";
import OrderDetailsCard from "@app/components/orders/OrderDetailsCard";
import PaymentSection from "@app/components/orders/payment/PaymentSection";
import { usePaymentCalculations } from "@domains/payments/hooks/usePaymentCalculations";
// MIGRATION: Using bridge file temporarily (will be replaced with direct domain imports)
import {
  useCustomerSearch,
  useSelectedCustomer,
} from "@domains/customers/hooks/useCustomerService.ts";
import { useOrderState } from "@shared/hooks/useOrderState";

type Props = {
  isOverlay?: boolean;
  onComplete?: (orderData: any) => void;
  onCancel?: () => void;
  initialCustomer?: any;
};

export default function TakeOrderPage({
  isOverlay = false,
  onComplete,
  onCancel,
  initialCustomer,
}: Props) {
  // 🔹 Employee State
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<
    "phone" | "walkin" | "wirein" | "wireout" | "website" | "pos"
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
          const price = parseFloat(p.price) || 0;
          const qty = parseInt(p.qty) || 0;
          return pSum + price * qty;
        }, 0)
      );
    }, 0);
  };

  // ✅ Calculate manual discount amount with proper parsing
  const itemsTotal = calculateItemsTotal();
  const manualDiscountAmount =
    manualDiscountType === "%"
      ? ((itemsTotal + totalDeliveryFee) * manualDiscount) / 100
      : manualDiscount;

  const totalDiscount =
    manualDiscountAmount +
    couponDiscount +
    giftCardDiscount +
    automaticDiscount;

  const { itemTotal, subtotal, gst, pst, grandTotal } = usePaymentCalculations(
    orderState.orders,
    totalDeliveryFee,
    totalDiscount,
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

  // Handle order completion - different behavior for POS overlay vs standalone page
  const handleOrderComplete = (transferData?: any) => {
    if (isOverlay && onComplete) {
      // If transferData is provided (from "Send to POS"), use it directly
      if (transferData) {
        console.log("🔄 Passing POS transfer data:", transferData);
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
          discount: totalDiscount,
          gst,
          pst,
          grandTotal,
        },
        employee,
        orderSource: isOverlay ? "pos" : orderSource,
        description: `${orderState.orders[0]?.deliveryType === "pickup" ? "Pickup" : "Delivery"} Order - ${customerState.customer.firstName} ${customerState.customer.lastName}`,
        displayName: `${orderState.orders[0]?.deliveryType === "pickup" ? "Pickup" : "Delivery"} Order`,
        total: grandTotal,
      };

      onComplete(orderData);
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
    }
  };

  // Handler for automatic discount changes
  const handleAutomaticDiscountChange = (amount: number, discounts: any[]) => {
    setAutomaticDiscount(amount);
    setAppliedAutomaticDiscounts(discounts);
  };

  return (
    <div
      className={
        isOverlay ? "" : "mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10"
      }
    >
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
          onSaveDraft={(draftData) => {
            if (draftData.customer) {
              customerState.setCustomer(draftData.customer);
            }
            if (draftData.orders) {
              orderState.setOrders(draftData.orders);
            }
            if (draftData.orderSource && !isOverlay) {
              setOrderSource(draftData.orderSource);
            }
          }}
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
    </div>
  );
}
