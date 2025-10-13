// RecipientSection.tsx - Step 2: Recipient Information
import { OrderPrototypeState } from "../TakeOrderPrototypePage";
import FloatingLabelInput from "./FloatingLabelInput";
import Select from "@shared/ui/forms/Select";

interface Props {
  orderState: OrderPrototypeState;
  updateOrderState: (section: keyof OrderPrototypeState, data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function RecipientSection({ orderState, updateOrderState, onNext, onPrevious }: Props) {
  const isPickup = orderState.orderMethod === "PICKUP";

  const handleUseCustomer = () => {
    updateOrderState("recipient", {
      useCustomer: true,
      firstName: orderState.customer.firstName,
      lastName: orderState.customer.lastName,
      phone: orderState.customer.phone,
    });
  };

  const handleNext = () => {
    if (orderState.recipient.useCustomer) {
      onNext();
      return;
    }

    if (!orderState.recipient.firstName || !orderState.recipient.phone) {
      alert("Please enter recipient name and phone");
      return;
    }

    if (!isPickup && !orderState.recipient.address.address1) {
      alert("Please enter delivery address");
      return;
    }

    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-1">
          {isPickup ? "Pickup Person" : "Recipient Information"}
        </h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {isPickup
            ? "Who will pick up this order?"
            : "Who is receiving this delivery?"}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleUseCustomer}
          className="px-3 py-1.5 border-2 border-[#597485] text-[#597485] rounded-lg hover:bg-[#597485] hover:text-white transition-all text-sm font-medium"
        >
          ✓ Use Customer's Information
        </button>
        {!isPickup && (
          <button className="px-3 py-1.5 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 text-sm">
            Load Saved Recipient
          </button>
        )}
      </div>

      {!orderState.recipient.useCustomer && (
        <>
          {/* Recipient Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FloatingLabelInput
              type="text"
              id="recipientFirstName"
              label="First Name"
              value={orderState.recipient.firstName}
              onChange={(e) =>
                updateOrderState("recipient", { firstName: e.target.value })
              }
              required
            />

            <FloatingLabelInput
              type="text"
              id="recipientLastName"
              label="Last Name"
              value={orderState.recipient.lastName}
              onChange={(e) =>
                updateOrderState("recipient", { lastName: e.target.value })
              }
              required
            />

            <FloatingLabelInput
              type="tel"
              id="recipientPhone"
              label="Phone"
              value={orderState.recipient.phone}
              onChange={(e) =>
                updateOrderState("recipient", { phone: e.target.value })
              }
              placeholder="(604) 555-1234"
              required
            />

            {!isPickup && (
              <FloatingLabelInput
                type="text"
                id="recipientCompany"
                label="Company (Optional)"
                value={orderState.recipient.company}
                onChange={(e) =>
                  updateOrderState("recipient", { company: e.target.value })
                }
              />
            )}
          </div>

          {/* Delivery Address - Only for DELIVERY orders */}
          {!isPickup && (
            <div className="border-t border-stroke dark:border-strokedark pt-4 mt-4">
              <h3 className="text-base font-semibold text-black dark:text-white mb-3">
                Delivery Address
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Address Label</label>
                  <Select
                    id="addressLabel"
                    options={[
                      { value: "", label: "Select label..." },
                      { value: "Home", label: "Home" },
                      { value: "Office", label: "Office" },
                      { value: "Mom's House", label: "Mom's House" },
                      { value: "Custom", label: "Custom..." },
                    ]}
                    value={orderState.recipient.addressLabel}
                    onChange={(value) =>
                      updateOrderState("recipient", { addressLabel: value })
                    }
                    placeholder="Select label"
                  />
                </div>

                <FloatingLabelInput
                  type="text"
                  id="address1"
                  label="Street Address"
                  placeholder="123 Main Street"
                  value={orderState.recipient.address.address1}
                  onChange={(e) =>
                    updateOrderState("recipient", {
                      address: { ...orderState.recipient.address, address1: e.target.value },
                    })
                  }
                  required
                />

                <FloatingLabelInput
                  type="text"
                  id="address2"
                  label="Unit/Suite (Optional)"
                  placeholder="Apt 4B"
                  value={orderState.recipient.address.address2}
                  onChange={(e) =>
                    updateOrderState("recipient", {
                      address: { ...orderState.recipient.address, address2: e.target.value },
                    })
                  }
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="col-span-2">
                    <FloatingLabelInput
                      type="text"
                      id="city"
                      label="City"
                      placeholder="Vancouver"
                      value={orderState.recipient.address.city}
                      onChange={(e) =>
                        updateOrderState("recipient", {
                          address: { ...orderState.recipient.address, city: e.target.value },
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Province</label>
                    <Select
                      id="province"
                      options={[
                        { value: "BC", label: "BC" },
                        { value: "AB", label: "AB" },
                        { value: "ON", label: "ON" },
                      ]}
                      value={orderState.recipient.address.province}
                      onChange={(value) =>
                        updateOrderState("recipient", {
                          address: { ...orderState.recipient.address, province: value },
                        })
                      }
                      placeholder="Province"
                    />
                  </div>

                  <div>
                    <FloatingLabelInput
                      type="text"
                      id="postalCode"
                      label="Postal Code"
                      placeholder="V6B 1A1"
                      value={orderState.recipient.address.postalCode}
                      onChange={(e) =>
                        updateOrderState("recipient", {
                          address: {
                            ...orderState.recipient.address,
                            postalCode: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {orderState.recipient.useCustomer && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✓ Using customer's information: {orderState.customer.firstName}{" "}
            {orderState.customer.lastName}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-stroke dark:border-strokedark">
        <button
          onClick={onPrevious}
          className="px-5 py-2 border border-stroke rounded-lg hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4 text-sm"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          className="px-5 py-2 bg-[#597485] text-white rounded-lg text-sm font-semibold hover:bg-[#4e6575] transition-all"
        >
          Next: {isPickup ? "Products" : "Delivery"} →
        </button>
      </div>
    </div>
  );
}
