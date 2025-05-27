// src/pages/OrderForm.tsx

import { useState, useEffect } from "react";
import CustomerCard from "../components/OrderForm/CustomerCard";
import RecipientCard from "../components/OrderForm/RecipientCard";
import OrderDetailsCard from "../components/OrderForm/OrderDetailsCard";
import DeliveryCard from "../components/OrderForm/DeliveryCard";
import ProductsCard from "../components/OrderForm/ProductsCard";
import PaymentCard from "../components/OrderForm/PaymentCard";
import MessageSuggestions from "../components/OrderForm/MessageSuggestions";
import PaymentModal from "../components/OrderForm/PaymentModal";


export default function OrderForm() {
  // 🔹 Order Type & Employee
  const [orderType, setOrderType] = useState<"DELIVERY" | "PICKUP" | "">("DELIVERY");
  const [employee, setEmployee] = useState("");
  const [employeeList, setEmployeeList] = useState<{ id: string; name: string; type: string }[]>([]);
  const [formError, setFormError] = useState<string | null>(null);


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
    if (!customerQuery.trim()) {
      setCustomerResults([]);
      return;
    }
  
    const timeout = setTimeout(() => {
      fetch(`/api/customers?q=${encodeURIComponent(customerQuery)}`)
        .then((res) => res.json())
        .then((data) => setCustomerResults(data));
    }, 300); // debounce
  
    return () => clearTimeout(timeout);
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
    fetch("/api/shortcuts")
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
  const itemTotal = customProducts.reduce((sum, item) => {
    const lineTotal = parseFloat(item.price || "0") * parseInt(item.qty || "0");
    return sum + lineTotal;
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Order</h1>

      {/* 🔸 Order Type + Employee */}
      <OrderDetailsCard
        orderType={orderType}
        setOrderType={setOrderType}
        employee={employee}
        setEmployee={setEmployee}
        employeeList={employeeList}
      />

      {/* 🔸 Customer Info */}
  
<div className="relative mb-2">
  <input
    type="text"
    placeholder="Search customer by name or phone..."
    value={customerQuery}
    onChange={(e) => setCustomerQuery(e.target.value)}
    className="w-full px-3 py-2 rounded border"
  />
  {customerResults.length > 0 && (
    <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-40 overflow-y-auto text-sm">
      {customerResults.map((c) => (
        <div
          key={c.id}
          onClick={() => {
            setCustomer({
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
              email: c.email,
            });

            setCustomerQuery("");
            setCustomerResults([]);
            fetch(`/api/customers/${c.id}/recipients`)
  .then((res) => res.json())
  .then((data) => setSavedRecipients(data));
          }}
          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
        >
          <div className="font-medium">{c.firstName} {c.lastName}</div>
          <div className="text-gray-500">{c.phone}</div>
        </div>
      ))}
    </div>
  )}
</div>

<CustomerCard
  customer={customer}
  setCustomer={setCustomer}
  savedRecipients={savedRecipients}
  setRecipientFirstName={setRecipientFirstName}
  setRecipientLastName={setRecipientLastName}
  setRecipientPhone={setRecipientPhone}
  setRecipientAddress={setRecipientAddress}
  clearSavedRecipients={clearSavedRecipients}
/>


      {/* 🔸 Recipient Info */}
      <RecipientCard
        orderType={orderType}
        recipientFirstName={recipientFirstName}
        setRecipientFirstName={setRecipientFirstName}
        recipientLastName={recipientLastName}
        setRecipientLastName={setRecipientLastName}
        recipientCompany={recipientCompany}
        setRecipientCompany={setRecipientCompany}
        recipientPhone={recipientPhone}
        setRecipientPhone={setRecipientPhone}
        recipientAddress={recipientAddress}
        setRecipientAddress={setRecipientAddress}
        shortcutQuery={shortcutQuery}
        setShortcutQuery={setShortcutQuery}
        filteredShortcuts={filteredShortcuts}
        setFilteredShortcuts={setFilteredShortcuts}
      />

      {/* 🔸 Delivery Info + Card Message */}
      <DeliveryCard
        deliveryDate={deliveryDate}
        setDeliveryDate={setDeliveryDate}
        deliveryTime={deliveryTime}
        setDeliveryTime={setDeliveryTime}
        deliveryInstructions={deliveryInstructions}
        setDeliveryInstructions={setDeliveryInstructions}
        cardMessage={cardMessage}
        setCardMessage={setCardMessage}
        setShowSuggestions={setShowSuggestions}
      />

      {/* 🔸 Product Table */}
      <ProductsCard
        customProducts={customProducts}
        handleProductChange={handleProductChange}
        handleAddCustomProduct={handleAddCustomProduct}
        calculateRowTotal={calculateRowTotal}
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
  onConfirm={(method) => {
    alert(`Payment confirmed with ${method}`);
    setShowPaymentPopup(false);
    // Later: Save the order here
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
