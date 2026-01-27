// src/components/orders/DeliveryCard.tsx

import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import Label from "@shared/ui/forms/Label";
import DeliveryDatePicker from "@shared/ui/forms/DeliveryDatePicker"; // ✅ New component

type Props = {
  deliveryDate: string;
  setDeliveryDate: (val: string) => void;
  deliveryTime: string;
  setDeliveryTime: (val: string) => void;
  deliveryInstructions: string;
  setDeliveryInstructions: (val: string) => void;
  cardMessage: string;
  setCardMessage: (val: string) => void;
  setShowSuggestions: (val: boolean) => void;
  activeTab?: number; // Add activeTab for unique IDs
};

export default function DeliveryCard({
  deliveryDate,
  setDeliveryDate,
  deliveryTime,
  setDeliveryTime,
  deliveryInstructions,
  setDeliveryInstructions,
  cardMessage,
  setCardMessage,
  setShowSuggestions,
  activeTab = 0,
}: Props) {
  return (
    <ComponentCard title="Delivery Details & Message">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left Column - Date, Time, Instructions */}
        <div className="space-y-4.5">
          {/* Date and Time Row */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
              <DeliveryDatePicker
                key={`delivery-date-${activeTab}`}
                id={`delivery-date-picker-${activeTab}`}
                label="Delivery Date"
                placeholder="Select a date"
                value={deliveryDate}
                onChange={(date) => setDeliveryDate(date)}
              />
            </div>

            <div className="relative">
              <Label>Delivery Time (optional)</Label>
              <InputField
                type="time"
                id="tm"
                name="tm"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
              />
            </div>
          </div>

          {/* Delivery Instructions */}
          <div>
            <Label htmlFor="deliveryInstructions">Delivery Instructions</Label>
            <TextArea
              placeholder="Gate code, leave at door, call upon arrival, etc."
              rows={3}
              value={deliveryInstructions}
              onChange={(value) => setDeliveryInstructions(value)}
            />
          </div>
        </div>

        {/* Right Column - Card Message */}
        <div className="space-y-4.5">
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <Label>Card Message</Label>
              <button
                type="button"
                onClick={() => setShowSuggestions(true)}
                className="inline-flex items-center justify-center rounded-md py-2 px-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-6 xl:px-8"
                style={{ backgroundColor: 'brand-500' }}
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                Message Ideas
              </button>
            </div>

            <div className="flex flex-wrap gap-1 mb-1">
              {['♥', '♡', '★', '☆', '✿', '❀', '♪', '•', '~'].map((sym) => (
                <button
                  key={sym}
                  type="button"
                  onClick={() => setCardMessage(cardMessage + sym)}
                  className="w-7 h-7 text-sm rounded border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                >
                  {sym}
                </button>
              ))}
            </div>

            <TextArea
              placeholder="Write your personal message here..."
              rows={6}
              value={cardMessage}
              onChange={(value) => setCardMessage(value)}
            />
          </div>

        </div>
      </div>
    </ComponentCard>
  );
}