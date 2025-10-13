// DeliverySection.tsx - Step 3: Delivery Details & Message
import { OrderPrototypeState } from "../TakeOrderPrototypePage";
import FloatingLabelInput from "./FloatingLabelInput";

interface Props {
  orderState: OrderPrototypeState;
  updateOrderState: (section: keyof OrderPrototypeState, data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function DeliverySection({ orderState, updateOrderState, onNext, onPrevious }: Props) {
  const handleDateChange = (date: string) => {
    updateOrderState("delivery", { date });
    // Mock auto-calculate delivery fee based on postal code
    if (orderState.recipient.address.postalCode) {
      const mockFee = Math.random() * 20 + 10; // $10-$30
      updateOrderState("delivery", { fee: parseFloat(mockFee.toFixed(2)) });
    }
  };

  const handleNext = () => {
    if (!orderState.delivery.date) {
      alert("Please select a delivery date");
      return;
    }
    onNext();
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-black dark:text-white mb-1">Delivery Details</h2>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          When should this order be delivered?
        </p>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FloatingLabelInput
          type="date"
          id="deliveryDate"
          label="Delivery Date"
          value={orderState.delivery.date}
          onChange={(e) => handleDateChange(e.target.value)}
          required
        />

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Time Window</label>
          <select
            id="deliveryTime"
            value={orderState.delivery.time}
            onChange={(e) => updateOrderState("delivery", { time: e.target.value })}
            className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary text-sm"
          >
            <option value="">Any time</option>
            <option value="8:00 AM - 12:00 PM">Morning (8AM - 12PM)</option>
            <option value="12:00 PM - 5:00 PM">Afternoon (12PM - 5PM)</option>
            <option value="5:00 PM - 8:00 PM">Evening (5PM - 8PM)</option>
          </select>
        </div>
      </div>

      {/* Delivery Fee */}
      {orderState.delivery.fee > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                Delivery Fee Auto-Calculated
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Based on postal code: {orderState.recipient.address.postalCode}
              </p>
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">
              ${orderState.delivery.fee.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Delivery Instructions */}
      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Delivery Instructions (Optional)</label>
        <textarea
          id="deliveryInstructions"
          rows={3}
          placeholder="e.g., Leave at front door, Ring doorbell, etc."
          value={orderState.delivery.instructions}
          onChange={(e) => updateOrderState("delivery", { instructions: e.target.value })}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        />
      </div>

      {/* Card Message */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Card Message (Optional)</label>
          <button className="text-xs text-[#597485] hover:underline dark:text-[#7a9bb0]">
            Message Ideas
          </button>
        </div>
        <textarea
          id="cardMessage"
          rows={4}
          placeholder="Write your heartfelt message here..."
          value={orderState.delivery.cardMessage}
          onChange={(e) => updateOrderState("delivery", { cardMessage: e.target.value })}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-sm font-medium outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {orderState.delivery.cardMessage.length}/250 characters
        </p>
      </div>

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
          Next: Products →
        </button>
      </div>
    </div>
  );
}
