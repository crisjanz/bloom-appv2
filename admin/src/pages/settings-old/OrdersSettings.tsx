// src/pages/OrdersSettings.tsx
import React from "react";
import DeliveryCard from "../../components/settings/orders/DeliveryCard";






const OrdersSettings = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-4">Settings</h1>

      <DeliveryCard />


    </div>
  );
};

export default OrdersSettings;