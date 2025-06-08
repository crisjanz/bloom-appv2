import { useState } from 'react';

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

const createEmptyOrder = (): OrderEntry => ({
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
});

export const useOrderState = () => {
  const [orders, setOrders] = useState<OrderEntry[]>([createEmptyOrder()]);
  const [activeTab, setActiveTab] = useState(0);

  const addOrder = () => {
    setOrders([...orders, createEmptyOrder()]);
    setActiveTab(orders.length); // Switch to new tab
  };

  const removeOrder = (index: number) => {
    if (orders.length === 1) {
      // Reset the only order instead of removing
      setOrders([createEmptyOrder()]);
      setActiveTab(0);
    } else {
      const updated = orders.filter((_, i) => i !== index);
      setOrders(updated);
      // Adjust active tab if needed
      if (activeTab >= updated.length) {
        setActiveTab(updated.length - 1);
      }
    }
  };

  const updateOrder = (index: number, updates: Partial<OrderEntry>) => {
    const updated = [...orders];
    updated[index] = { ...updated[index], ...updates };
    setOrders(updated);
  };

  const resetOrders = () => {
    setOrders([createEmptyOrder()]);
    setActiveTab(0);
  };

  return {
    orders,
    setOrders,
    activeTab,
    setActiveTab,
    addOrder,
    removeOrder,
    updateOrder,
    resetOrders,
  };
};