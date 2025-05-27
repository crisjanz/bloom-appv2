// src/components/OrderForm/RecipientCard.tsx

import React from "react";

type Props = {
  orderType: string;
  recipientFirstName: string;
  setRecipientFirstName: (val: string) => void;
  recipientLastName: string;
  setRecipientLastName: (val: string) => void;
  recipientCompany: string;
  setRecipientCompany: (val: string) => void;
  recipientPhone: string;
  setRecipientPhone: (val: string) => void;
  recipientAddress: any;
  setRecipientAddress: (val: any) => void;
  shortcutQuery: string;
  setShortcutQuery: (val: string) => void;
  filteredShortcuts: any[];
  setFilteredShortcuts: (val: any[]) => void;
};

export default function RecipientCard({
  orderType,
  recipientFirstName,
  setRecipientFirstName,
  recipientLastName,
  setRecipientLastName,
  recipientCompany,
  setRecipientCompany,
  recipientPhone,
  setRecipientPhone,
  recipientAddress,
  setRecipientAddress,
  shortcutQuery,
  setShortcutQuery,
  filteredShortcuts,
  setFilteredShortcuts,
}: Props) {
  return (
    <div className="bg-card rounded shadow p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          {orderType === "PICKUP" ? "Pickup Person" : "Recipient Info"}
        </h2>

        {orderType === "DELIVERY" && (
          <div className="relative">
            <input
              type="text"
              placeholder="Search address shortcuts..."
              className="border rounded px-3 py-1 text-sm w-60"
              value={shortcutQuery}
              onChange={(e) => setShortcutQuery(e.target.value)}
            />
            {filteredShortcuts.length > 0 && (
              <div className="absolute z-50 mt-1 w-full bg-white border rounded shadow max-h-40 overflow-y-auto text-sm">
                {filteredShortcuts.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => {
                      setRecipientAddress({
                        address1: s.address1,
                        address2: s.address2 || "",
                        city: s.city,
                        province: s.province,
                        postalCode: s.postalCode,
                      });
                      if (s.phoneNumbers.length > 0) {
                        setRecipientPhone(s.phoneNumbers[0]);
                      }
                      setRecipientCompany(s.label);
                      setShortcutQuery("");
                      setFilteredShortcuts([]);
                    }}
                    className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">First Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={recipientFirstName}
            onChange={(e) => setRecipientFirstName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Last Name</label>
          <input
            type="text"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={recipientLastName}
            onChange={(e) => setRecipientLastName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input
            type="tel"
            className="w-full mt-1 px-3 py-2 border rounded"
            value={recipientPhone}
            onChange={(e) => setRecipientPhone(e.target.value)}
          />
        </div>

        {orderType === "DELIVERY" && (
          <div>
            <label className="block text-sm font-medium">Company</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              value={recipientCompany}
              onChange={(e) => setRecipientCompany(e.target.value)}
            />
          </div>
        )}
      </div>

      {orderType === "DELIVERY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Address Line 1</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              value={recipientAddress.address1}
              onChange={(e) =>
                setRecipientAddress({ ...recipientAddress, address1: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Address Line 2</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              value={recipientAddress.address2}
              onChange={(e) =>
                setRecipientAddress({ ...recipientAddress, address2: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              value={recipientAddress.city}
              onChange={(e) =>
                setRecipientAddress({ ...recipientAddress, city: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Postal Code</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              value={recipientAddress.postalCode}
              onChange={(e) =>
                setRecipientAddress({ ...recipientAddress, postalCode: e.target.value })
              }
            />
          </div>
        </div>
      )}

      <div className="flex justify-end mt-2">
        <button
          className="text-sm text-red-600 hover:underline"
          onClick={() => {
            setRecipientFirstName("");
            setRecipientLastName("");
            setRecipientCompany("");
            setRecipientPhone("");
            setRecipientAddress({
              address1: "",
              address2: "",
              city: "",
              province: "",
              postalCode: "",
            });
          }}
        >
          {orderType === "PICKUP" ? "Clear Pickup Info" : "Clear Recipient Info"}
        </button>
      </div>
    </div>
  );
}
