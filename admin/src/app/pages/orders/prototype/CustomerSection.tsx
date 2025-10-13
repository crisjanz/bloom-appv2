// CustomerSection.tsx - Step 1: Customer & Order Type
import { OrderPrototypeState } from "../TakeOrderPrototypePage";
import FloatingLabelInput from "./FloatingLabelInput";
import Select from "@shared/ui/forms/Select";

interface Props {
  orderState: OrderPrototypeState;
  updateOrderState: (section: keyof OrderPrototypeState, data: any) => void;
  onNext: () => void;
}

// Mock customer data for search
const MOCK_CUSTOMERS = [
  { id: "1", firstName: "John", lastName: "Doe", phone: "(604) 555-1234", email: "john@example.com" },
  { id: "2", firstName: "Jane", lastName: "Smith", phone: "(604) 555-5678", email: "jane@example.com" },
  { id: "3", firstName: "Bob", lastName: "Johnson", phone: "(778) 555-9012", email: "bob@example.com" },
];

export default function CustomerSection({ orderState, updateOrderState, onNext }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof MOCK_CUSTOMERS>([]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      const results = MOCK_CUSTOMERS.filter(
        (c) =>
          c.firstName.toLowerCase().includes(query.toLowerCase()) ||
          c.lastName.toLowerCase().includes(query.toLowerCase()) ||
          c.phone.includes(query)
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCustomer = (customer: typeof MOCK_CUSTOMERS[0]) => {
    updateOrderState("customer", customer);
    setSearchResults([]);
    setSearchQuery("");
  };

  const handleNext = () => {
    if (!orderState.customer.firstName || !orderState.customer.phone) {
      alert("Please enter customer name and phone");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-1">Customer Information</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Search for existing customer or enter new customer details
        </p>
      </div>

      {/* Customer Search */}
      <div className="relative">
        <FloatingLabelInput
          type="text"
          id="customerSearch"
          label="Quick Search"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Type to search..."
        />

        {searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-stroke rounded-sm shadow-default max-h-60 overflow-y-auto dark:bg-boxdark dark:border-strokedark">
            {searchResults.map((customer) => (
              <div
                key={customer.id}
                onClick={() => handleSelectCustomer(customer)}
                className="px-3 py-2 hover:bg-gray-2 cursor-pointer border-b border-stroke dark:hover:bg-meta-4 dark:border-strokedark"
              >
                <p className="text-sm font-medium text-black dark:text-white">
                  {customer.firstName} {customer.lastName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {customer.phone} • {customer.email}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Customer Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingLabelInput
          type="text"
          id="firstName"
          label="First Name"
          value={orderState.customer.firstName}
          onChange={(e) => updateOrderState("customer", { firstName: e.target.value })}
          required
        />

        <FloatingLabelInput
          type="text"
          id="lastName"
          label="Last Name"
          value={orderState.customer.lastName}
          onChange={(e) => updateOrderState("customer", { lastName: e.target.value })}
          required
        />

        <FloatingLabelInput
          type="tel"
          id="phone"
          label="Phone"
          value={orderState.customer.phone}
          onChange={(e) => updateOrderState("customer", { phone: e.target.value })}
          placeholder="(604) 555-1234"
          required
        />

        <FloatingLabelInput
          type="email"
          id="email"
          label="Email"
          value={orderState.customer.email}
          onChange={(e) => updateOrderState("customer", { email: e.target.value })}
          placeholder="customer@example.com"
        />
      </div>

      {/* Order Type Selection */}
      <div className="border-t border-stroke dark:border-strokedark pt-4 mt-4">
        <h3 className="text-base font-semibold text-black dark:text-white mb-3">Order Type</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Order Source</label>
            <Select
              id="orderType"
              options={[
                { value: "PHONE", label: "Phone Order" },
                { value: "WALKIN", label: "Walk-in" },
                { value: "WIREIN", label: "Wire-In" },
              ]}
              value={orderState.orderType}
              onChange={(value) => updateOrderState("orderType", value)}
              placeholder="Select order source"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Fulfillment Method</label>
            <Select
              id="orderMethod"
              options={[
                { value: "DELIVERY", label: "Delivery" },
                { value: "PICKUP", label: "Pickup" },
              ]}
              value={orderState.orderMethod}
              onChange={(value) => updateOrderState("orderMethod", value)}
              placeholder="Select fulfillment"
            />
          </div>
        </div>
      </div>

      {/* Compact Navigation */}
      <div className="flex justify-end pt-4 border-t border-stroke dark:border-strokedark">
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-[#597485] text-white rounded-lg text-sm font-semibold hover:bg-[#4e6575] transition-all"
        >
          Next: Recipient →
        </button>
      </div>
    </div>
  );
}

// Add useState import
import { useState } from "react";
