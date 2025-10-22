// src/components/orders/MultiOrderTabs.tsx
import { useEffect } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import RecipientCard from "./RecipientCard";
import DeliveryCard from "./DeliveryCard";
import ProductsCard from "./ProductsCard";
import { isGiftCardProduct, getGiftCardInfo, orderContainsGiftCards } from '@shared/utils/giftCardHelpers';


type Address = {
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
};

type OrderEntry = {
  recipientFirstName: string;
  recipientLastName: string;
  recipientCompany: string;
  recipientPhone: string;
  recipientAddress: Address;
  recipientAddressType: string;
  recipientAddressLabel: string; // NEW: Custom address label
  orderType: "DELIVERY" | "PICKUP";
  deliveryDate: string;
  deliveryTime: string;
  deliveryInstructions: string;
  cardMessage: string;
  deliveryFee: number;
  isDeliveryFeeManuallyEdited: boolean;
  customProducts: {
    description: string;
    category: string;
    price: string;
    qty: string;
    tax: boolean;
  }[];
  // Recipient tracking fields for 3-option workflow
  selectedRecipientId?: string;
  recipientDataChanged: boolean;
  originalRecipientData?: {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    city: string;
  };
  // NEW: Customer-based recipient fields
  recipientCustomer?: any;
  recipientCustomerId?: string;
  selectedAddressId?: string;
};

type Props = {
  orders: OrderEntry[];
  setOrders: (val: OrderEntry[]) => void;
  activeTab: number;
  setActiveTab: (val: number) => void;
  setShowSuggestions: (val: boolean) => void;
  setCardMessage: (val: string) => void;
  savedRecipients?: any[];
  customerId?: string | null;
  onRecipientSaved?: () => void;
  updateOrderDeliveryFee: (orderIndex: number, fee: number) => void; // ✅ Add this
  updateOrderManualEditFlag: (orderIndex: number, isManual: boolean) => void;
};

export default function MultiOrderTabs({
  orders,
  setOrders,
  activeTab,
  setActiveTab,
  setShowSuggestions,
  setCardMessage,
  savedRecipients = [],
  customerId,
  onRecipientSaved,
  updateOrderDeliveryFee,
  updateOrderManualEditFlag,
}: Props) {
  
  const maxTabs = 5;


  const handleAddTab = () => {
    if (orders.length >= maxTabs) return;
    const newOrder: OrderEntry = {
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
        country: "",
      },
      recipientAddressType: "RESIDENCE",
      recipientAddressLabel: "", // NEW: Initialize label
      orderType: "DELIVERY",
      deliveryDate: "",
      deliveryTime: "",
      deliveryInstructions: "",
      cardMessage: "",
      deliveryFee: 0,
      isDeliveryFeeManuallyEdited: false,
      customProducts: [
        {
          description: "",
          category: "",
          price: "",
          qty: "1",
          tax: true,
        },
      ],
      recipientDataChanged: false,
      // NEW: Initialize customer-based recipient fields
      recipientCustomer: undefined,
      recipientCustomerId: undefined,
      selectedAddressId: undefined,
    };

    setOrders([...orders, newOrder]);
    setActiveTab(orders.length); // move to new tab
  };



  const handleRemoveTab = (index: number) => {
    if (orders.length <= 1) return;
    const updated = [...orders];
    updated.splice(index, 1);
    setOrders(updated);
    setActiveTab(Math.max(0, activeTab - (index === activeTab ? 1 : 0)));
  };

  const updateOrder = (index: number, field: keyof OrderEntry, value: any) => {
    const updated = [...orders];
    (updated[index] as any)[field] = value;
    setOrders(updated);
  };

  const updateAddress = (index: number, value: Address) => {
    const updated = [...orders];
    updated[index].recipientAddress = value;
    setOrders(updated);
  };

  const updateProducts = (index: number, newProducts: OrderEntry["customProducts"]) => {
    const updated = [...orders];
    updated[index].customProducts = newProducts;
    setOrders(updated);
  };

  const order = orders[activeTab];
  if (!order) {
    return (
      <ComponentCard title="Loading">
        <div className="p-4 text-center">
          <div className="text-gray-500">Loading order...</div>
        </div>
      </ComponentCard>
    );
  }


  return (
    <ComponentCard title="Order Details">
      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          {orders.map((_, i) => (
            <div key={i} className="relative">
              <button
  onClick={() => setActiveTab(i)}
  className={`relative inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 border-2 ${
    i === activeTab
      ? "border-[#597485] text-white shadow-sm"
      : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
  }`}
  style={i === activeTab ? { backgroundColor: '#597485', color: '#ffffff !important' } : {}}
>
  <span className="mr-2">Order #{i + 1}</span>
  {orders.length > 1 && (
    <div  // ✅ Change to div with onClick
      onClick={(e) => {
        e.stopPropagation();
        handleRemoveTab(i);
      }}
      className={`flex h-5 w-5 items-center justify-center rounded-full text-sm transition-colors cursor-pointer ${
        i === activeTab
          ? "hover:bg-white/20"
          : "hover:bg-red-100 text-red-500 dark:hover:bg-red-900/20"
      }`}
      style={i === activeTab ? { color: '#ffffff' } : {}}
      title="Remove this order"
    >
      ×
    </div>
  )}
</button>
            </div>
          ))}

          <button
            onClick={handleAddTab}
            disabled={orders.length >= maxTabs}
            className={`inline-flex items-center justify-center rounded-lg border-2 border-dashed px-4 py-2.5 text-sm font-medium transition-all ${
              orders.length >= maxTabs
                ? "border-gray-300 text-gray-400 cursor-not-allowed dark:border-gray-600 dark:text-gray-500"
                : "border-[#597485] text-[#597485] hover:text-white dark:border-[#597485] dark:text-[#597485] dark:hover:text-white"
            }`}
            style={{}}
            onMouseEnter={(e) => {
              if (orders.length < maxTabs) {
                e.currentTarget.style.backgroundColor = '#597485';
              }
            }}
            onMouseLeave={(e) => {
              if (orders.length < maxTabs) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Add Order
          </button>

          {orders.length > 1 && (
            <div className="ml-4 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 px-3 py-1 rounded-full dark:bg-gray-700">
              {orders.length} of {maxTabs} orders
            </div>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        <RecipientCard
          orderType={order.orderType}
          setOrderType={(val) => updateOrder(activeTab, "orderType", val)}
          recipientFirstName={order.recipientFirstName}
          setRecipientFirstName={(val) => updateOrder(activeTab, "recipientFirstName", val)}
          recipientLastName={order.recipientLastName}
          setRecipientLastName={(val) => updateOrder(activeTab, "recipientLastName", val)}
          recipientCompany={order.recipientCompany}
          setRecipientCompany={(val) => updateOrder(activeTab, "recipientCompany", val)}
          recipientPhone={order.recipientPhone}
          setRecipientPhone={(val) => updateOrder(activeTab, "recipientPhone", val)}
          recipientAddress={order.recipientAddress}
          setRecipientAddress={(val) => updateAddress(activeTab, val)}
          recipientAddressType={order.recipientAddressType}
          setRecipientAddressType={(val) => updateOrder(activeTab, "recipientAddressType", val)}
          recipientAddressLabel={order.recipientAddressLabel} // NEW
          setRecipientAddressLabel={(val) => updateOrder(activeTab, "recipientAddressLabel", val)} // NEW
          savedRecipients={savedRecipients}
          customerId={customerId || undefined}
          onRecipientSaved={onRecipientSaved}
          currentDeliveryFee={order.deliveryFee}
          isManuallyEdited={order.isDeliveryFeeManuallyEdited}
          onManualEditChange={(isManual) => updateOrderManualEditFlag(activeTab, isManual)}
          activeTab={activeTab}
          onDeliveryFeeCalculated={(fee) => updateOrderDeliveryFee(activeTab, fee)}
          // New recipient tracking props
          selectedRecipientId={order.selectedRecipientId}
          onSelectedRecipientIdChange={(id) => updateOrder(activeTab, "selectedRecipientId", id)}
          recipientDataChanged={order.recipientDataChanged}
          onRecipientDataChangedChange={(changed) => updateOrder(activeTab, "recipientDataChanged", changed)}
          originalRecipientData={order.originalRecipientData}
          onOriginalRecipientDataChange={(data) => updateOrder(activeTab, "originalRecipientData", data)}
          // NEW: Customer-based recipient props
          recipientCustomer={order.recipientCustomer}
          setRecipientCustomer={(customer) => updateOrder(activeTab, "recipientCustomer", customer)}
          recipientCustomerId={order.recipientCustomerId}
          setRecipientCustomerId={(id) => updateOrder(activeTab, "recipientCustomerId", id)}
          selectedAddressId={order.selectedAddressId}
          setSelectedAddressId={(id) => updateOrder(activeTab, "selectedAddressId", id)}
        />

        <DeliveryCard
          deliveryDate={order.deliveryDate}
          setDeliveryDate={(val) => updateOrder(activeTab, "deliveryDate", val)}
          deliveryTime={order.deliveryTime}
          setDeliveryTime={(val) => updateOrder(activeTab, "deliveryTime", val)}
          deliveryInstructions={order.deliveryInstructions}
          setDeliveryInstructions={(val) => updateOrder(activeTab, "deliveryInstructions", val)}
          cardMessage={order.cardMessage}
          setCardMessage={(val) => {
            updateOrder(activeTab, "cardMessage", val);
            setCardMessage(val);
          }}
          setShowSuggestions={setShowSuggestions}
          activeTab={activeTab}
        />

        <ProductsCard
          customProducts={order.customProducts}
          handleProductChange={(index, field, value) => {
            // Handle the special removeAt case
            if (field === "removeAt") {
              const updated = [...order.customProducts];
              updated.splice(value, 1);
              updateProducts(activeTab, updated);
            } else {
              const updated = [...order.customProducts];
              (updated[index] as any)[field] = value;
              updateProducts(activeTab, updated);
            }
          }}
          handleAddCustomProduct={() => {
            const updated = [...order.customProducts, {
              description: "",
              category: "",
              price: "",
              qty: "1",
              tax: true,
            }];
            updateProducts(activeTab, updated);
          }}
          calculateRowTotal={(price, qty) => {
            const total = parseFloat(price || "0") * parseInt(qty || "0");
            return total.toFixed(2);
          }}
        />
      </div>
    </ComponentCard>
  );
}
