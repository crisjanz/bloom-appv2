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

type OrderEntry = {
  recipientFirstName: string;
  recipientLastName: string;
  recipientCompany: string;
  recipientPhone: string;
  recipientAddress: {
    address1: string;
    address2: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  orderType: "DELIVERY" | "PICKUP";
  deliveryDate: string;
  deliveryTime: string;
  deliveryInstructions: string;
  cardMessage: string;
  customProducts: {
    description: string;
    category: string;
    price: string;
    qty: string;
    tax: boolean;
  }[];
  shortcutQuery: string;
  filteredShortcuts: any[];
};

export default function TakeOrderPage() {
  // 🔹 Employee State
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<
    { id: string; name: string; type: string }[]
  >([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [orderSource, setOrderSource] = useState<"phone" | "walkin">("phone");

  // 🔹 Multi-Order State
  const [orders, setOrders] = useState<OrderEntry[]>([
    {
      recipientFirstName: "",
      recipientLastName: "",
      recipientCompany: "",
      recipientPhone: "",
      recipientAddress: {
        address1: "",
        address2: "",
        city: "",
        province: "",
        postalCode: "",
        country: "CA",
      },
      orderType: "DELIVERY",
      deliveryDate: "",
      deliveryTime: "",
      deliveryInstructions: "",
      cardMessage: "",
      customProducts: [
        { description: "", category: "", price: "", qty: "1", tax: true },
      ],
      shortcutQuery: "",
      filteredShortcuts: [],
    },
  ]);
  const [activeTab, setActiveTab] = useState(0);

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

  const customerState = useCustomerSearch();

  // 🔹 Payment State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [deliveryCharge, setDeliveryCharge] = useState(10);
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);

  const { itemTotal, subtotal, gst, pst, grandTotal } = usePaymentCalculations(
    orders,
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
            orders,
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
              customerState.setCustomer(draftData.customer); // ✅ Fixed
            }
            if (draftData.orders) {
              setOrders(draftData.orders);
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
          orders={orders}
          setOrders={setOrders}
          activeTab={activeTab}
          setCustomerId={customerState.setCustomerId}
        />

        {/* Multi-Order Tabs */}
        <MultiOrderTabs
          orders={orders}
          setOrders={setOrders}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setShowSuggestions={setShowSuggestions}
          setCardMessage={setSelectedSuggestion}
          savedRecipients={customerState.savedRecipients} // ✅ Fixed
          customerId={customerState.customerId} // ✅ Fixed
          onRecipientSaved={() => {
            if (customerState.customerId) {
              // ✅ Fixed
              fetch(`/api/customers/${customerState.customerId}/recipients`) // ✅ Fixed
                .then((res) => res.json())
                .then((data) => customerState.setSavedRecipients(data || [])) // ✅ Fixed
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
            for (const order of orders) {
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
                        country: order.recipientAddress.country || "CA", // 🆕 Add country support
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
            setOrders([
              {
                recipientFirstName: "",
                recipientLastName: "",
                recipientCompany: "",
                recipientPhone: "",
                recipientAddress: {
                  address1: "",
                  address2: "",
                  city: "",
                  province: "",
                  postalCode: "",
                  country: "CA",
                },
                orderType: "DELIVERY",
                deliveryDate: "",
                deliveryTime: "",
                deliveryInstructions: "",
                cardMessage: "",
                customProducts: [
                  {
                    description: "",
                    category: "",
                    price: "",
                    qty: "1",
                    tax: true,
                  },
                ],
                shortcutQuery: "",
                filteredShortcuts: [],
              },
            ]);
            setCouponCode("");
            setDiscount(0);
            setActiveTab(0);
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
          const updated = [...orders];
          updated[activeTab].cardMessage = selectedSuggestion;
          setOrders(updated);
          setShowSuggestions(false);
        }}
      />
    </div>
  );
}
