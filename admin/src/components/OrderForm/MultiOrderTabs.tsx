import React from "react";
import RecipientCard from "./RecipientCard";
import DeliveryCard from "./DeliveryCard";
import ProductsCard from "./ProductsCard";

type Address = {
  address1: string;
  address2: string;
  city: string;
  province: string;
  postalCode: string;
};

type OrderEntry = {
  recipientFirstName: string;
  recipientLastName: string;
  recipientCompany: string;
  recipientPhone: string;
  recipientAddress: Address;
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

type Props = {
  orders: OrderEntry[];
  setOrders: (val: OrderEntry[]) => void;
  activeTab: number;
  setActiveTab: (val: number) => void;
  setShowSuggestions: (val: boolean) => void;
  setCardMessage: (val: string) => void;
};

export default function MultiOrderTabs({
  orders,
  setOrders,
  activeTab,
  setActiveTab,
  setShowSuggestions,
  setCardMessage,
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

  return (
    <div className="bg-card rounded-lg shadow p-4 space-y-4">
      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
      {orders.map((_, i) => (
  <div key={i} className="relative">
    <button
      onClick={() => setActiveTab(i)}
      className={`px-4 py-1 pr-6 rounded text-sm relative ${
        i === activeTab ? "bg-primary text-white" : "bg-white text-gray-700"
      }`}
    >
      Order #{i + 1}
    </button>
    {orders.length > 1 && (
      <button
        onClick={(e) => {
          e.stopPropagation(); // prevent switching tab
          handleRemoveTab(i);
        }}
        className="absolute top-0 right-0 px-2 py-1 text-xs"
        title="Remove this tab"
      >
        ×
      </button>
    )}
  </div>
))}


        <button
          onClick={handleAddTab}
          className="btn-primary text-sm px-3 py-1 disabled:opacity-50"
          disabled={orders.length >= maxTabs}
        >
          + Add Order
        </button>

        {orders.length > 1 && (
          <button
            onClick={() => handleRemoveTab(activeTab)}
            className="text-sm text-red-500 underline ml-2"
          >
            Remove
          </button>
        )}
      </div>

      {/* Order Type is now inside RecipientCard */}
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
        shortcutQuery={order.shortcutQuery}
        setShortcutQuery={(val) => updateOrder(activeTab, "shortcutQuery", val)}
        filteredShortcuts={order.filteredShortcuts}
        setFilteredShortcuts={(val) => updateOrder(activeTab, "filteredShortcuts", val)}
      
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
          setCardMessage(val); // also sync with global suggestions
        }}
        setShowSuggestions={setShowSuggestions}
      />

      <ProductsCard
        customProducts={order.customProducts}
        handleProductChange={(index, field, value) => {
          const updated = [...order.customProducts];
          updated[index][field] = value;
          updateProducts(activeTab, updated);
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
  );
}
