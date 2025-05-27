// src/components/OrderForm/CustomerCard.tsx

import React from "react";

type Props = {
  customer: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };
  setCustomer: (val: any) => void;

  savedRecipients: {
    id: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
    phone?: string;
  }[];
  clearSavedRecipients: () => void;
  setRecipientFirstName: (val: string) => void;
  setRecipientLastName: (val: string) => void;
  setRecipientPhone: (val: string) => void;
  setRecipientAddress: (val: {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    postalCode: string;
  }) => void;
};

export default function CustomerCard({
    customer,
    setCustomer,
    savedRecipients,
    setRecipientFirstName,
    setRecipientLastName,
    setRecipientPhone,
    setRecipientAddress,
    clearSavedRecipients,
  }: Props) {
  
  return (
    <div className="bg-card rounded-lg shadow p-4 space-y-4">
      <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold">Customer Info</h2>

      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">First Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={customer.firstName}
            onChange={(e) =>
              setCustomer({ ...customer, firstName: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Last Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={customer.lastName}
            onChange={(e) =>
              setCustomer({ ...customer, lastName: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            type="tel"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={customer.phone}
            onChange={(e) =>
              setCustomer({ ...customer, phone: e.target.value })
            }
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
          />
          <div className="flex justify-end mt-2">
            <button
              className="text-sm text-red-600 hover:underline"
              onClick={() => {
                setCustomer({ firstName: "", lastName: "", phone: "", email: "" });
                clearSavedRecipients(); // ← now clears recipients too
              }}
              
              
            >

              Clear Customer Info
            </button>
          </div>
        </div>
       
        <div className="mt-4">
  <label className="block text-sm font-medium">Saved Recipients</label>
  <select
    className="select-primary mt-1"
    onChange={(e) => {
      const selected = savedRecipients.find((r) => r.id === e.target.value);
      if (selected) {
        setRecipientFirstName(selected.firstName);
        setRecipientLastName(selected.lastName);
        setRecipientPhone(selected.phone || "");
        setRecipientAddress({
          address1: selected.address1,
          address2: selected.address2 || "",
          city: selected.city,
          province: selected.province,
          postalCode: selected.postalCode,
        });
      }
    }}
    disabled={savedRecipients.length === 0}
    defaultValue=""
  >
    <option value="" disabled>
      {savedRecipients.length === 0 ? "No saved recipients" : "Select saved address"}
    </option>

    {savedRecipients.map((r) => (
      <option key={r.id} value={r.id}>
        {r.firstName} {r.lastName} – {r.address1}
      </option>
    ))}
  </select>
</div>

      </div>
    </div>
  );
}
