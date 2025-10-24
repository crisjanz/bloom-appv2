import { useState } from 'react';

type OrderEntry = {
  recipientFirstName: string;
  recipientLastName: string;
  recipientCompany: string;
  recipientPhone: string;
  recipientAddress: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
  };
  recipientAddressType: string;
  recipientAddressLabel?: string;
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
  recipientCustomer?: any;
  recipientCustomerId?: string;
  selectedAddressId?: string;
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
  recipientAddressType: "RESIDENCE",
  recipientAddressLabel: "",
  orderType: "DELIVERY",
  deliveryDate: "",
  deliveryTime: "",
  deliveryInstructions: "",
  cardMessage: "",
  deliveryFee: 0,
  isDeliveryFeeManuallyEdited: false,
  customProducts: [
    { description: "", category: "", price: "", qty: "1", tax: true },
  ],
  // Initialize new recipient tracking fields
  selectedRecipientId: undefined,
  recipientDataChanged: false,
  originalRecipientData: undefined,
  recipientCustomer: undefined,
  recipientCustomerId: undefined,
  selectedAddressId: undefined,
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

  const updateOrderDeliveryFee = (orderIndex: number, fee: number) => {
    // Guard against invalid order index
    if (orderIndex < 0 || orderIndex >= orders.length) {
      console.warn('updateOrderDeliveryFee: Invalid orderIndex', orderIndex, 'orders length:', orders.length);
      return;
    }
    
    const updated = [...orders];
    updated[orderIndex].deliveryFee = fee;
    setOrders(updated);
  };

  const updateOrderManualEditFlag = (orderIndex: number, isManual: boolean) => {
    const updated = [...orders];
    updated[orderIndex].isDeliveryFeeManuallyEdited = isManual;
    setOrders(updated);
  };

  const getTotalDeliveryFee = () => {
    return orders.reduce((sum, order) => sum + order.deliveryFee, 0);
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
    updateOrderDeliveryFee,
    updateOrderManualEditFlag,
    getTotalDeliveryFee,
    resetOrders,
  };
};
