// src/components/orders/CustomerCard.tsx
import { FC } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Label from "@shared/ui/forms/Label";
import InputField from "@shared/ui/forms/input/InputField";
import PhoneInput from "@shared/ui/forms/group-input/PhoneInput";

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
    <ComponentCard
      title="Customer Information"
      headerAction={
        <div className="relative w-full sm:w-72">
          <Label htmlFor="customerSearch" className="sr-only">
            Search Customer
          </Label>
          <InputField
            type="text"
            id="customerSearch"
            placeholder="Search by name or phone..."
            value={customerQuery}
            onChange={(e) => setCustomerQuery(e.target.value)}
            className="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm focus:border-[#597485]"
          />

          {customerResults.length > 0 && (
            <div className="absolute left-0 right-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
              <div className="border-b border-stroke bg-gray-1 px-5 py-2 dark:border-strokedark dark:bg-meta-4">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Customer(s) found with this phone number:
                </p>
              </div>
              {customerResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setCustomer({
                      id: c.id,
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
                    fetch(`/api/customers/${c.id}/recipients`, {
                      method: "GET",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      cache: "no-cache",
                    })
                      .then((res) => {
                        if (!res.ok) {
                          throw new Error(`HTTP error! status: ${res.status}`);
                        }
                        return res.json();
                      })
                      .then((data) => {
                        setSavedRecipients(data || []);
                      })
                      .catch((err) => {
                        console.error("Failed to load recipients:", err);
                        setSavedRecipients([]);
                      });
                  }}
                  className="cursor-pointer border-b border-stroke px-5 py-3 text-sm hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  <div className="font-medium text-black dark:text-white">
                    ✓ Use: {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {c.phone} {c.email && `• ${c.email}`}
                  </div>
                </div>
              ))}
              <div
                onClick={() => {
                  setCustomerQuery("");
                  setCustomerResults([]);
                }}
                className="cursor-pointer border-t-2 border-stroke bg-white px-5 py-3 text-sm hover:bg-blue-50 dark:border-strokedark dark:bg-boxdark dark:hover:bg-meta-4"
              >
                <div className="font-medium text-[#597485] dark:text-blue-400">
                  + Create new customer with same phone
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  For spouse, family member, or separate account
                </div>
              </div>
            </div>
          )}
        </div>
      }
    >
      {/* Customer Details */}
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
        <div>
          <InputField
            type="text"
            id="firstName"
            placeholder="First name"
            value={customer.firstName}
            onChange={(e) =>
              setCustomer({ ...customer, firstName: e.target.value })
            }
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-[#597485]"
          />
        </div>

        <div>
          <InputField
            type="text"
            id="lastName"
            placeholder="Last name"
            value={customer.lastName}
            onChange={(e) =>
              setCustomer({ ...customer, lastName: e.target.value })
            }
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-[#597485]"
          />
        </div>

        <div>
          <PhoneInput
            type="tel"
            id="phone"
            value={customer.phone || ""}
            onChange={(cleanedPhone) => {
              setCustomer({ ...customer, phone: cleanedPhone });
            }}
            onBlur={(cleanedPhone) => {
              if (cleanedPhone.replace(/\D/g, "").length >= 10) {
                setCustomerQuery(cleanedPhone);
              } else {
                setCustomerQuery("");
              }
            }}
            countries={countries}
            selectPosition="none"
            placeholder="Phone number (primary identifier)"
          />
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-3 md:items-center">
        <div>
          <InputField
            type="email"
            id="email"
            placeholder="Email address"
            value={customer.email}
            onChange={(e) =>
              setCustomer({ ...customer, email: e.target.value })
            }
            className="h-11 rounded-lg border border-gray-300 bg-transparent px-4 text-sm focus:border-[#597485]"
          />
        </div>

        <div className="flex items-center justify-end">
          {savedRecipients.length > 0 && (
            <div className="inline-flex items-center rounded-sm bg-gray-2 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-meta-4 dark:text-gray-300">
              {savedRecipients.length} saved recipient
              {savedRecipients.length > 1 ? "s" : ""} available for this
              customer
            </div>
          )}
        </div>

        <div className="flex justify-start md:justify-end">
          <button
            onClick={clearCustomerInfo}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#597485] px-4 text-sm font-medium text-white hover:bg-[#4e6575]"
          >
            Clear Customer Info
          </button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default CustomerCard;
