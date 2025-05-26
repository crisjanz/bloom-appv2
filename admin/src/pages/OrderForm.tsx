import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function OrderForm() {
  const [orderType, setOrderType] = useState("");
  const [employee, setEmployee] = useState("");
  const [customProducts, setCustomProducts] = useState([
    { description: "", category: "", price: "", qty: "1", tax: true },
  ]);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");
  const [cardMessage, setCardMessage] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState("");
  const [itemTotal, setItemTotal] = useState(0);
  const [deliveryCharge, setDeliveryCharge] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("$");
  const [couponCode, setCouponCode] = useState("");
  const [gstRate] = useState(0.05);
  const [pstRate] = useState(0.07);
  const [useEmail, setUseEmail] = useState(true);
  const [subscribe, setSubscribe] = useState(false);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);

  const dummyCoupon = { code: "SAVE10", type: "%", amount: 10 };

  const applyCoupon = () => {
    if (couponCode.trim().toUpperCase() === dummyCoupon.code) {
      setDiscount(dummyCoupon.amount);
      setDiscountType(dummyCoupon.type);
    }
  };

  const calculateRowTotal = (price: string, qty: string) => {
    const total = parseFloat(price || "0") * parseInt(qty || "0");
    return total.toFixed(2);
  };

  const handleAddCustomProduct = () => {
    setCustomProducts([
      ...customProducts,
      { description: "", category: "", price: "", qty: "1", tax: true },
    ]);
  };

  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...customProducts];
    updated[index][field] = field === "tax" ? value : value;
    setCustomProducts(updated);

    const total = updated.reduce((sum, item) => {
      return sum + parseFloat(item.price || "0") * parseInt(item.qty || "0");
    }, 0);
    setItemTotal(total);
  };

  const calculateDiscountAmount = () => {
    return discountType === "%" ? itemTotal * (discount / 100) : discount;
  };

  const subtotal = itemTotal + deliveryCharge - calculateDiscountAmount();
  const gst = subtotal * gstRate;
  const pst = subtotal * pstRate;
  const grandTotal = subtotal + gst + pst;

  const suggestions = [
    "Best Wishes",
    "Congratulations",
    "Happy Anniversary",
    "Happy Birthday",
    "In Loving Memory",
    "Thank You",
    "Thinking of You",
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Create Order</h1>

      {/* 🧾 Order Info Card */}
      <div className="bg-card rounded shadow p-4 space-y-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Order Type */}
            <div>
              <select
                value={orderType}
                onChange={(e) =>
                  setOrderType(e.target.value as "DELIVERY" | "PICKUP")
                }
                className="select-primary w-40 mt-1"
              >
                <option value="" disabled hidden>
                  Order Type ⭵
                </option>
                <option value="DELIVERY">Delivery</option>
                <option value="PICKUP">Pickup</option>
              </select>
            </div>

            {/* Employee/User */}
            <div>
              <select
                value={employee}
                onChange={(e) => setEmployee(e.target.value)}
                className="select-primary w-48 mt-1"
              >
                <option value="" disabled hidden>
                  Employee ⭵
                </option>
                <option value="Jane">Jane</option>
                <option value="Mike">Mike</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Draft Save/Load */}
          <div className="flex items-end gap-2">
            <button className="btn-primary">Save Draft</button>
            <select className="select-primary w-48 mt-1">
              <option value="" disabled hidden>
                Load Draft...
              </option>
              <option>Draft #1 - May 25</option>
              <option>Draft #2 - Wedding</option>
            </select>
          </div>
        </div>
      </div>

      {/* 💳 Customer Info Card */}
      <div className="bg-card rounded-lg shadow p-4 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Customer Info</h2>
          <input
            type="text"
            placeholder="Search customer..."
            className="border rounded px-3 py-1 text-sm w-60"
          />
        </div>

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
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            {orderType === "PICKUP" ? "Pickup Person" : "Recipient Info"}
          </h2>
          {orderType === "DELIVERY" && (
            <input
              type="text"
              placeholder="Search address shortcuts..."
              className="border rounded px-3 py-1 text-sm w-60"
            />
          )}
        </div>

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

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium">Phone #2</label>
              <input
                type="tel"
                className="w-full mt-1 px-3 py-2 border rounded"
                placeholder="(555) 987-6543"
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium">Type</label>
              <select className="select-primary w-full mt-1">
                <option>Home</option>
                <option>Cell</option>
                <option>Work</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium">Phone #2</label>
              <input
                type="tel"
                className="w-full mt-1 px-3 py-2 border rounded"
                placeholder="(555) 987-6543"
              />
            </div>
            <div className="w-28">
            <label className="block text-sm font-medium">Type</label>
              <select className="select-primary w-full mt-1">
                <option value="" disabled hidden>Type ⭵</option>
                <option>Home</option>
                <option>Cell</option>
                <option>Work</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Company</label>
            <input
              type="text"
              className="w-full mt-1 px-3 py-2 border rounded"
              placeholder="Funeral Home, Church, etc."
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

{/* 📅 Date, Time, Instructions, and Card Message */}
<div className="bg-card rounded shadow p-4 space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
    
    {/* LEFT SIDE: Date/Time + Delivery Instructions (stacked) */}
    <div className="space-y-4">
      {/* Date + Time side by side */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium">Date</label>
          <DatePicker
  selected={deliveryDate ? new Date(deliveryDate) : null}
  onChange={(date) =>
    setDeliveryDate(date ? date.toISOString().split('T')[0] : "")
  }
  className="w-full px-3 py-2 rounded"
  placeholderText="Select a date"
/>

        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium">Time</label>
          <input
            type="time"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            className="w-full px-3 py-2 rounded"
          />
        </div>
      </div>

      {/* Delivery Instructions */}
      <div>
        <label className="block text-sm font-medium">Delivery Instructions</label>
        <textarea
          rows={2}
          value={deliveryInstructions}
          onChange={(e) => setDeliveryInstructions(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded"
          placeholder="Gate code, leave at door, etc."
          maxLength={150}
        />
      </div>
    </div>

    {/* RIGHT SIDE: Card Message */}
    <div>
      <label className="block text-sm font-medium">Card Message</label>
      <textarea
        rows={5}
        className="w-full mt-1 px-3 py-2 rounded"
        placeholder="Write your message here..."
        value={cardMessage}
        onChange={(e) => setCardMessage(e.target.value)}
      ></textarea>

      <button
        type="button"
        className="btn-primary mt-2"
        onClick={() => setShowSuggestions(true)}
      >
        Message Suggestions
      </button>
    </div>
  </div>
</div>


      {/* 💬 Suggestions Popup */}
      {showSuggestions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Suggested Card Messages</h2>
              <button
                className="text-blue-600 font-medium"
                onClick={() => setShowSuggestions(false)}
              >
                × Close
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {suggestions.map((msg) => (
                <label key={msg} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="suggestion"
                    value={msg}
                    checked={selectedSuggestion === msg}
                    onChange={() => setSelectedSuggestion(msg)}
                  />
                  <span>{msg}</span>
                </label>
              ))}
            </div>
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => {
                setCardMessage(selectedSuggestion);
                setShowSuggestions(false);
              }}
            >
              Submit
            </button>
          </div>
        </div>
      )}

      {/* 🛍️ Product Selection Table */}
      <div className="bg-card rounded shadow p-4 space-y-4">
        <h2 className="text-lg font-semibold">Products</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Unit Price</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Total</th>
              <th className="px-4 py-2 text-center">Tax</th>
            </tr>
          </thead>
          <tbody>
            {customProducts.map((item, idx) => {
              const taxAmount =
                parseFloat(item.price || "0") * parseInt(item.qty || "0") * 0.12;
              return (
                <tr key={idx}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) =>
                        handleProductChange(idx, "description", e.target.value)
                      }
                      className="w-full px-2 py-1 rounded"
                      placeholder="Item description"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleProductChange(idx, "category", e.target.value)
                      }
                      className="select-input w-full px-2 py-1 rounded"
                    >
                      <option value="">Select category</option>
                      <option value="funeral">Funeral</option>
                      <option value="wedding">Wedding</option>
                      <option value="custom">Custom</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.price}
                      onChange={(e) =>
                        handleProductChange(idx, "price", e.target.value)
                      }
                      className="w-20 px-2 py-1 rounded text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      inputMode="numeric"
                      value={item.qty}
                      onChange={(e) =>
                        handleProductChange(idx, "qty", e.target.value)
                      }
                      className="w-16 px-2 py-1 rounded text-right"
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    ${calculateRowTotal(item.price, item.qty)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <label className="flex items-center gap-2 justify-center">
                      <input
                        type="checkbox"
                        checked={item.tax}
                        onChange={(e) =>
                          handleProductChange(idx, "tax", e.target.checked)
                        }
                      />
                      {item.tax && (
                        <span className="text-xs text-gray-600">
                          +${taxAmount.toFixed(2)}
                        </span>
                      )}
                    </label>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn-primary" onClick={handleAddCustomProduct}>
          + Add Item
        </button>
      </div>

      {/* 💳 Order Summary & Payment Section */}
      <div className="bg-card rounded shadow p-4 space-y-4">
        <h2 className="text-lg font-bold">Order Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
          {/* LEFT: Totals */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Items Total</span>
              <span>${itemTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Delivery</span>
              <input
                type="number"
                value={deliveryCharge}
                onChange={(e) => setDeliveryCharge(parseFloat(e.target.value))}
                className="w-24 text-right px-2 py-1 rounded"
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex gap-2 items-center">
                <span>Discount</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-16 px-2 py-1 rounded"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                  className="select-input w-15 py-1"
                >
                  <option value="$">$</option>
                  <option value="%">%</option>
                </select>
              </div>
              <span className="ml-auto">-${calculateDiscountAmount().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (5%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>PST (7%)</span>
              <span>${pst.toFixed(2)}</span>
            </div>
            <hr />
            <div className="flex justify-between font-bold text-lg">
              <span>Grand Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* RIGHT: Payment & Options */}
          <div className="space-y-4">
            <div className="bg-gray-200 text-center p-6 rounded text-2xl font-bold">
              ${grandTotal.toFixed(2)}
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Coupon / Gift Card Code"
                className="w-full px-3 py-2 rounded"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                onBlur={applyCoupon}
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useEmail}
                  onChange={(e) => setUseEmail(e.target.checked)}
                />
                Email receipt to customer
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={subscribe}
                  onChange={(e) => setSubscribe(e.target.checked)}
                />
                Subscribe to newsletter
              </label>
            </div>
            <button
              type="button"
              className="btn-primary w-full py-3 text-lg"
              onClick={() => setShowPaymentPopup(true)}
            >
              Take Payment
            </button>
          </div>
        </div>
      </div>

      {/* 💰 Payment Modal */}
      {showPaymentPopup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded shadow p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
            <div className="space-y-2">
              <button className="btn-primary w-full">Cash</button>
              <button className="btn-primary w-full">Credit Card</button>
              <button className="btn-primary w-full">Other</button>
            </div>
            <button
              onClick={() => setShowPaymentPopup(false)}
              className="text-sm text-blue-600 mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
