// src/pages/TakeOrderPage.tsx
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState, useEffect } from "react";
import CustomerCard from "../../components/orders/CustomerCard";
import MessageSuggestions from "../../components/orders/MessageSuggestions";
import MultiOrderTabs from "../../components/orders/MultiOrderTabs";
import OrderDetailsCard from "../../components/orders/OrderDetailsCard";
import PaymentCard from "../../components/orders/PaymentCard";
import PaymentModal from "../../components/orders/PaymentModal";
import { usePaymentCalculations } from "../../hooks/usePaymentCalculations";
import { useCustomerSearch } from "../../hooks/useCustomerSearch";
import { useOrderState } from '../../hooks/useOrderState';

export default function TakeOrderPage() {
  // 🔹 Employee State
 // 🔹 Employee State
const [employee, setEmployee] = useState("");
const [employeeList, setEmployeeList] = useState<{ id: string; name: string; type: string }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<"phone" | "walkin">("phone");

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

  // 🔹 Payment State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [deliveryCharge, setDeliveryCharge] = useState(10);
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);

  const { itemTotal, subtotal, gst, pst, grandTotal } = usePaymentCalculations(
    orderState.orders,
    deliveryCharge,
    discount,
    discountType
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
            deliveryCharge,
            discount,
            discountType,
            couponCode,
            subscribe,
            sendEmailReceipt,
            orderSource,
          }}
          onSaveDraft={(draftData) => {
            if (draftData.customer) {
              customerState.setCustomer(draftData.customer);
            }
            if (draftData.orders) {
              orderState.setOrders(draftData.orders);
            }
            if (draftData.deliveryCharge !== undefined) {
              setDeliveryCharge(draftData.deliveryCharge);
            }
            if (draftData.discount !== undefined) {
              setDiscount(draftData.discount);
            }
            if (draftData.discountType) {
              setDiscountType(draftData.discountType);
            }
            if (draftData.couponCode) {
              setCouponCode(draftData.couponCode);
            }
            if (draftData.subscribe !== undefined) {
              setSubscribe(draftData.subscribe);
            }
            if (draftData.sendEmailReceipt !== undefined) {
              setSendEmailReceipt(draftData.sendEmailReceipt);
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
          onDeliveryFeeCalculated={(fee) => setDeliveryCharge(fee)}
        />

        {/* Payment Summary */}
        <PaymentCard
          deliveryCharge={deliveryCharge}
          setDeliveryCharge={setDeliveryCharge}
          couponCode={couponCode}
          setCouponCode={setCouponCode}
          discount={discount}
          setDiscount={setDiscount}
          discountType={discountType}
          setDiscountType={setDiscountType}
          itemTotal={itemTotal}
          gst={gst}
          pst={pst}
          grandTotal={grandTotal}
          subscribe={subscribe}
          setSubscribe={setSubscribe}
          sendEmailReceipt={sendEmailReceipt}
          setSendEmailReceipt={setSendEmailReceipt}
          onTriggerPayment={() => setShowPaymentPopup(true)}
        />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        open={showPaymentPopup}
        onClose={() => setShowPaymentPopup(false)}
        total={grandTotal}
        employee={employee}
        setFormError={setFormError}
        onConfirm={async (payments) => {
          if (!payments.length) {
            setFormError("No payments were entered.");
            return;
          }

          const groupId = crypto.randomUUID();

          try {
            for (const order of orderState.orders) {
              const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  customer: customerState.customer,
                  recipient: {
                    firstName: order.recipientFirstName,
                    lastName: order.recipientLastName,
                    company: order.recipientCompany,
                    phone: cleanPhoneNumber(order.recipientPhone),
                    address: order.recipientAddress,
                  },
                  orderType: order.orderType,
                  deliveryDate: order.deliveryDate,
                  deliveryTime: order.deliveryTime,
                  deliveryInstructions: order.deliveryInstructions,
                  cardMessage: order.cardMessage,
                  products: order.customProducts,
                  payments,
                  paymentMethod: payments.map((p) => p.method).join(" + "),
                  status: payments.some((p) =>
                    ["Pay in POS", "COD", "House Account", "Wire"].includes(
                      p.method
                    )
                  )
                    ? "unpaid"
                    : "paid",
                  groupId,
                  employeeId: employee,
                  orderSource: orderSource,
                  deliveryCharge: order.deliveryCharge,
                }),
              });

              if (!res.ok) {
                console.error("❌ Failed to save order");
                setFormError("Failed to save order. Try again.");
                return;
              }

              // Auto-save recipient if it's a delivery order with a customer
              if (
                order.orderType === "DELIVERY" &&
                customerState.customerId &&
                order.recipientFirstName &&
                order.recipientAddress.address1
              ) {
                try {
                  await fetch(
                    `/api/customers/${customerState.customerId}/recipients`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        firstName: order.recipientFirstName,
                        lastName: order.recipientLastName,
                        phone: cleanPhoneNumber(order.recipientPhone),
                        address1: order.recipientAddress.address1,
                        address2: order.recipientAddress.address2,
                        city: order.recipientAddress.city,
                        province: order.recipientAddress.province,
                        postalCode: order.recipientAddress.postalCode,
                        country: order.recipientAddress.country || "CA",
                        company: order.recipientCompany,
                      }),
                    }
                  );
                } catch (error) {
                  console.error("Failed to auto-save recipient:", error);
                }
              }
            }

            // Clear form after successful save
            setShowPaymentPopup(false);
            alert("✅ All orders saved successfully.");

            // Reset form to initial state
            customerState.resetCustomer();
            orderState.resetOrders();
            setCouponCode("");
            setDiscount(0);
          } catch (error) {
            console.error("Error saving orders:", error);
            setFormError("An error occurred while saving orders.");
          }
        }}
      />

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