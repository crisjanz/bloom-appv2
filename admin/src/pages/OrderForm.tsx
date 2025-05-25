import { useState } from "react";



export default function OrderForm() {
  const [orderType, setOrderType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");

  return (
    
    <div className="p-6 max-w-4xl mx-auto space-y-6">
     


      <h1 className="text-2xl font-bold">Create Order</h1>

      {/* Order Type Toggle */}
      <div>
        <label className="block font-semibold mb-1">Order Type</label>
        <div className="flex gap-4">
          <label>
            <input
              type="radio"
              name="orderType"
              value="DELIVERY"
              checked={orderType === "DELIVERY"}
              onChange={() => setOrderType("DELIVERY")}
            />{" "}
            Delivery
          </label>
          <label>
            <input
              type="radio"
              name="orderType"
              value="PICKUP"
              checked={orderType === "PICKUP"}
              onChange={() => setOrderType("PICKUP")}
            />{" "}
            Pickup
          </label>
        </div>
      </div>
      

    {/* 💳 Customer Info Card */}
<div className="bg-card rounded-lg shadow p-4 space-y-4">
  <h2 className="text-lg font-semibold">Customer Info</h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium">First Name</label>
      <input
        type="text"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="John"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">Last Name</label>
      <input
        type="text"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="Doe"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">Phone</label>
      <input
        type="tel"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="(555) 123-4567"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">Email</label>
      <input
        type="email"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="john@example.com"
      />
    </div>
  </div>
</div>
{/* 👤 Recipient or Pickup Info */}
<div className="bg-card rounded shadow p-4 space-y-4">
  <h2 className="text-lg font-semibold">
    {orderType === "PICKUP" ? "Pickup Person" : "Recipient Info"}
  </h2>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <div>
      <label className="block text-sm font-medium">First Name</label>
      <input
        type="text"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="Jane"
      />
    </div>

    <div>
      <label className="block text-sm font-medium">Last Name</label>
      <input
        type="text"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="Smith"
      />
    </div>

    <div className="sm:col-span-2">
      <label className="block text-sm font-medium">Phone</label>
      <input
        type="tel"
        className="w-full mt-1 px-3 py-2 border rounded"
        placeholder="(555) 123-4567"
      />
    </div>
  </div>

  {orderType === "DELIVERY" && (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Address Line 1</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            placeholder="123 Main St"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Address Line 2</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            placeholder="Apt, Suite, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium">City</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            placeholder="Prince George"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Postal Code</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            placeholder="V2L 3T5"
          />
        </div>
      </div>
    </>
  )}
</div>

    </div>
  );
}
