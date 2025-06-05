// src/pages/OrderForm.tsx
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useState, useEffect } from "react";
import CustomerCard from "../../components/orders/CustomerCard";
import DeliveryCard from "../../components/orders/DeliveryCard";
import MessageSuggestions from "../../components/orders/MessageSuggestions";
import MultiOrderTabs from "../../components/orders/MultiOrderTabs";
import OrderDetailsCard from "../../components/orders/OrderDetailsCard";
import PaymentCard from "../../components/orders/PaymentCard";
import PaymentModal from "../../components/orders/PaymentModal";
import ProductsCard from "../../components/orders/ProductsCard";
import RecipientCard from "../../components/orders/RecipientCard";

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
    }[]; // ← array
    shortcutQuery: string;
    filteredShortcuts: any[];
  };
  


export default function OrderForm() {
  // 🔹 Order Type & Employee
  const [orderType, setOrderType] = useState<"DELIVERY" | "PICKUP" | "">("DELIVERY");
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; type: string }[]>([]);
  
  const [formError, setFormError] = useState<string | null>(null);
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
      },
      orderType: "DELIVERY",
      deliveryDate: "",
      deliveryTime: "",
      deliveryInstructions: "",
      cardMessage: "",
      customProducts: [
        { description: "", category: "", price: "", qty: "1", tax: true },
      ],
    },
  ]);
  const [activeTab, setActiveTab] = useState(0);
  
  

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployeeList(data));
  }, []);

  // 🔹 Customer
  const [savedRecipients, setSavedRecipients] = useState<any[]>([]);
  const clearSavedRecipients = () => setSavedRecipients([]);

  const [customerQuery, setCustomerQuery] = useState("");
const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

useEffect(() => {
  if (customerQuery.trim() !== "") {
    const timeout = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
        .then((res) => res.json())
        .then((data) => setCustomerResults(data))
        .catch((err) => console.error("Search failed:", err));
    }, 300);

    return () => clearTimeout(timeout);
  }
}, [customerQuery]);
  

  // 🔹 Recipient
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientAddress, setRecipientAddress] = useState({
    address1: "",
    address2: "",
    city: "",
    province: "",
    postalCode: "",
  });

  // 🔹 Address Shortcuts
  const [shortcutQuery, setShortcutQuery] = useState("");
  const [allShortcuts, setAllShortcuts] = useState<any[]>([]);
  const [filteredShortcuts, setFilteredShortcuts] = useState<any[]>([]);

  useEffect(() => {
    fetch("http://cristians-macbook-air.local:4000/api/shortcuts")
      .then((res) => res.json())
      .then((data) => setAllShortcuts(data));
  }, []);

  useEffect(() => {
    if (!shortcutQuery.trim()) {
      setFilteredShortcuts([]);
      return;
    }

    const q = shortcutQuery.toLowerCase();
    const matches = allShortcuts.filter((s) =>
      s.label.toLowerCase().includes(q)
    );
    setFilteredShortcuts(matches);
  }, [shortcutQuery, allShortcuts]);

  // 🔹 Delivery Info
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  // 🔹 Card Message
  const [cardMessage, setCardMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [messageSuggestions, setMessageSuggestions] = useState<
    { id: string; label: string; message: string }[]
  >([]);

  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setMessageSuggestions(data));
  }, []);

  // 🔹 Product Table
  const [customProducts, setCustomProducts] = useState([
    { description: "", category: "", price: "", qty: "1", tax: true },
  ]);

  // 🔧 Product Helpers
  const handleAddCustomProduct = () => {
    setCustomProducts([
      ...customProducts,
      { description: "", category: "", price: "", qty: "1", tax: true },
    ]);
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...customProducts];
    updated[index][field] = field === "tax" ? value : value;
    setCustomProducts(updated);
  };

  const calculateRowTotal = (price: string, qty: string) => {
    const total = parseFloat(price || "0") * parseInt(qty || "0");
    return total.toFixed(2);
  };

  // 🔹 Payment State
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"$" | "%">("$");
  const [deliveryCharge, setDeliveryCharge] = useState(10);
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [sendEmailReceipt, setSendEmailReceipt] = useState(false);


  // 🔧 Payment Helpers
  const itemTotal = orders.reduce((total, order) => {
    const subtotal = order.customProducts.reduce((sum, item) => {
      return sum + parseFloat(item.price || "0") * parseInt(item.qty || "0");
    }, 0);
    return total + subtotal;
  }, 0);
  

  const calculateDiscountAmount = () => {
    return discountType === "%" ? itemTotal * (discount / 100) : discount;
  };

  const subtotal = itemTotal + deliveryCharge - calculateDiscountAmount();
  const gst = subtotal * 0.05;
  const pst = subtotal * 0.07;
  const grandTotal = subtotal + gst + pst;

  // ✅ Final Render

  return (
 <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
    <PageMeta title="Take Order" />
    <PageBreadcrumb pageTitle="Take Order" />

      {/* 🔸 Order Type + Employee */}
      <OrderDetailsCard
        orderType={orderType}
        setOrderType={setOrderType}
        employee={employee}
        setEmployee={setEmployee}
        employeeList={employeeList}
      />

      {/* 🔸 Customer Info */}


<CustomerCard
  customer={customer}
  setCustomer={setCustomer}
  customerQuery={customerQuery}
  setCustomerQuery={setCustomerQuery}
  customerResults={customerResults}
  setCustomerResults={setCustomerResults}
  savedRecipients={savedRecipients}
  clearSavedRecipients={clearSavedRecipients}
  orders={orders}
  setOrders={setOrders}
  activeTab={activeTab}
/>


<MultiOrderTabs
  orders={orders}
  setOrders={setOrders}
  activeTab={activeTab}
  setActiveTab={setActiveTab}
  setShowSuggestions={setShowSuggestions}
  setCardMessage={setCardMessage}
/>


      {/* 🔸 Payment Summary */}
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
  
    for (const order of orders) {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          recipient: {
            firstName: order.recipientFirstName,
            lastName: order.recipientLastName,
            company: order.recipientCompany,
            phone: order.recipientPhone,
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
            ["Pay in POS", "COD", "House Account", "Wire"].includes(p.method)
          )
            ? "unpaid"
            : "paid",
          groupId,
        }),
      });
  
      if (!res.ok) {
        console.error("❌ Failed to save order");
        setFormError("Failed to save order. Try again.");
        return;
      }
    }
  
    setShowPaymentPopup(false);
    alert("✅ All orders saved successfully.");
  }}
/>



      {/* 🔸 Message Suggestions Popup */}
      <MessageSuggestions
        open={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        suggestions={messageSuggestions}
        selected={selectedSuggestion}
        setSelected={setSelectedSuggestion}
        onSubmit={() => {
          setCardMessage(selectedSuggestion);
          setShowSuggestions(false);
        }}
      />
    </div>
  );
}
