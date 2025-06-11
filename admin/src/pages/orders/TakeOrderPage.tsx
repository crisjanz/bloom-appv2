// src/pages/TakeOrderPage.tsx
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState, useEffect } from "react";
import CustomerCard from "../../components/orders/CustomerCard";
import MessageSuggestions from "../../components/orders/MessageSuggestions";
import MultiOrderTabs from "../../components/orders/MultiOrderTabs";
import OrderDetailsCard from "../../components/orders/OrderDetailsCard";
import PaymentSection from "../../components/orders/payment/PaymentSection";
import { usePaymentCalculations } from "../../hooks/usePaymentCalculations";
import { useCustomerSearch } from "../../hooks/useCustomerSearch";
import { useOrderState } from '../../hooks/useOrderState';

export default function TakeOrderPage() {
  // 🔹 Employee State
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; type: string }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<"phone" | "walkin">("phone");
  
  // 🔹 ADD THESE: Discount state
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [manualDiscount, setManualDiscount] = useState(0);
  const [manualDiscountType, setManualDiscountType] = useState<"$" | "%">("$");

  const [giftCardDiscount, setGiftCardDiscount] = useState(0);

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

  // 🔥 Custom Hooks
  const customerState = useCustomerSearch();
  const orderState = useOrderState();

  // ✅ Get total delivery fee from all orders
  const totalDeliveryFee = orderState.getTotalDeliveryFee();

  // ✅ UPDATED: Calculate total discount and use it
  const manualDiscountAmount = manualDiscountType === "%" 
    ? (orderState.orders.reduce((sum, order) => sum + order.customProducts.reduce((pSum, p) => pSum + p.price * p.quantity, 0), 0) + totalDeliveryFee) * manualDiscount / 100
    : manualDiscount;
  
const totalDiscount = manualDiscountAmount + couponDiscount + giftCardDiscount;

  const { itemTotal, subtotal, gst, pst, grandTotal } = usePaymentCalculations(
    orderState.orders,
    totalDeliveryFee,
    totalDiscount, // ✅ Use combined discount
    "$" // ✅ Always $ since we calculate the amount above
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
        console.error("Failed to load message suggestions:", err)
      );
  }, []);

  return (
    <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
      <PageMeta title="Take Order" />
      <PageBreadcrumb pageTitle="Take Order" />

      <div className="space-y-6">
        {/* Employee Selection */}
        <OrderDetailsCard
          employee={employee}
          setEmployee={setEmployee}
          employeeList={employeeList}
          orderSource={orderSource}
          setOrderSource={setOrderSource}
          formData={{
            customer: customerState.customer,
            orders: orderState.orders,
            deliveryCharge: totalDeliveryFee,
            discount: manualDiscount, // ✅ Use manual discount
            discountType: manualDiscountType, // ✅ Use manual discount type
            couponCode: "",
            subscribe: false,
            sendEmailReceipt: false,
            orderSource,
          }}
          onSaveDraft={(draftData) => {
            if (draftData.customer) {
              customerState.setCustomer(draftData.customer);
            }
            if (draftData.orders) {
              orderState.setOrders(draftData.orders);
            }
            if (draftData.orderSource) {
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
                  console.error("Failed to refresh recipients:", err)
                );
            }
          }}
          updateOrderDeliveryFee={orderState.updateOrderDeliveryFee}
          updateOrderManualEditFlag={orderState.updateOrderManualEditFlag}
        />

        {/* Payment Summary - ✅ UPDATED with new props */}
        <PaymentSection
          customerState={customerState}
          orderState={orderState}
          itemTotal={itemTotal}
          gst={gst}
          pst={pst}
          grandTotal={grandTotal}
          totalDeliveryFee={totalDeliveryFee}
          employee={employee}
          orderSource={orderSource}
          cleanPhoneNumber={cleanPhoneNumber}
          // ✅ ADD THESE NEW PROPS:
          couponDiscount={couponDiscount}
          setCouponDiscount={setCouponDiscount}
          manualDiscount={manualDiscount}
          setManualDiscount={setManualDiscount}
          manualDiscountType={manualDiscountType}
          setManualDiscountType={setManualDiscountType}
          onOrderComplete={() => {
            customerState.resetCustomer();
            orderState.resetOrders();
            // ✅ RESET DISCOUNTS:
            setCouponDiscount(0);
            setManualDiscount(0);
            setManualDiscountType("$");
            setGiftCardDiscount(0);
          }}
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
          updated[orderState.activeTab].cardMessage = selectedSuggestion;
          orderState.setOrders(updated);
          setShowSuggestions(false);
        }}
      />
    </div>
  );
}