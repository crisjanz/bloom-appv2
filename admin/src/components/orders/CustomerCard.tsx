// src/components/orders/CustomerCard.tsx
import { FC } from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import PhoneInput from "../form/group-input/PhoneInput";

type Props = {
  customer: any;
  setCustomer: (val: any) => void;
  customerQuery: string;
  setCustomerQuery: (val: string) => void;
  customerResults: any[];
  setCustomerResults: (val: any[]) => void;
  savedRecipients: any[];
  setSavedRecipients: (val: any[]) => void;
  clearSavedRecipients: () => void;
  orders: any[];
  setOrders: (orders: any[]) => void;
  activeTab: number;
  setCustomerId?: (id: string | null) => void;
};

const CustomerCard: FC<Props> = ({
  customer,
  setCustomer,
  customerQuery,
  setCustomerQuery,
  customerResults,
  setCustomerResults,
  savedRecipients,
  setSavedRecipients,
  clearSavedRecipients,
  setCustomerId,
}) => {
  const clearCustomerInfo = () => {
    setCustomer({
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
    });
    setCustomerQuery("");
    setCustomerResults([]);
    setCustomerId?.(null);
    clearSavedRecipients();
  };

  const countries = [
    { code: "CA", label: "+1" },
    { code: "US", label: "+1" },
    { code: "GB", label: "+44" },
    { code: "AU", label: "+61" },
  ];

  return (
    <ComponentCard title="Customer Information">
      {/* Customer Search */}
      <div className="mb-6">
        <Label htmlFor="customerSearch">Search Customer</Label>
        <div className="relative">
          <InputField
            type="text"
            id="customerSearch"
            placeholder="Search by name or phone..."
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            className="focus:border-[#597485]"
          />
          
          {customerResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-60 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
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
                    if (setCustomerId) {
                      setCustomerId(c.id);
                    }
                    fetch(`/api/customers/${c.id}/recipients`)
                      .then((res) => res.json())
                      .then((data) => setSavedRecipients(data || []))
                      .catch((err) => {
                        console.error("Failed to load recipients:", err);
                        setSavedRecipients([]);
                      });
                  }}
                  className="px-5 py-3 text-sm hover:bg-gray-2 cursor-pointer border-b border-stroke last:border-b-0 dark:hover:bg-meta-4 dark:border-strokedark"
                >
                  <div className="font-medium text-black dark:text-white">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {c.phone} {c.email && `• ${c.email}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-1 gap-4.5 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <InputField
            type="text"
            id="firstName"
            placeholder="Enter first name"
            value={customer.firstName}
            onChange={(e) =>
              setCustomer({ ...customer, firstName: e.target.value })
            }
            className="focus:border-[#597485]"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <InputField
            type="text"
            id="lastName"
            placeholder="Enter last name"
            value={customer.lastName}
            onChange={(e) =>
              setCustomer({ ...customer, lastName: e.target.value })
            }
            className="focus:border-[#597485]"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number</Label>
          <PhoneInput
            type="tel"
            id="phone"
            value={customer.phone || ""}
            onChange={(cleanedPhone) => setCustomer({ ...customer, phone: cleanedPhone })}
            countries={countries}
            selectPosition="none"
            placeholder="(555) 000-0000"
          />
        </div>

        <div>
          <Label htmlFor="email">Email Address</Label>
          <InputField
            type="email"
            id="email"
            placeholder="Enter email address"
            value={customer.email}
            onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
            className="focus:border-[#597485]"
          />
        </div>
      </div>

      {/* Saved Recipients Info */}
      {savedRecipients.length > 0 && (
        <div className="mt-4 p-3 bg-gray-2 dark:bg-meta-4 rounded-sm">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {savedRecipients.length} saved recipient{savedRecipients.length > 1 ? 's' : ''} available for this customer
          </p>
        </div>
      )}

      {/* Clear Button */}
      <div className="flex justify-end mt-6">
        <button
          onClick={clearCustomerInfo}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 py-2 text-sm font-medium text-white hover:bg-[#4e6575]"
        >
          Clear Customer Info
        </button>
      </div>
    </ComponentCard>
  );
};

export default CustomerCard;