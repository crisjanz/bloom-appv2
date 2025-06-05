// src/components/orders/DeliveryCard.tsx
import React from "react";
import ComponentCard from "../common/ComponentCard";
import InputField from "../form/input/InputField";
import TextArea from "../form/input/TextArea";
import Label from "../form/Label";
import Select from "../form/Select";
import DatePicker from "../form/date-picker.tsx";

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
}: Props) {
  // Get today's date in YYYY-MM-DD format for min date
  const today = new Date().toISOString().split('T')[0];

  return (
    <ComponentCard title="Delivery Details & Message">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Left Column - Date, Time, Instructions */}
        <div className="space-y-4.5">
          {/* Date and Time Row */}
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="w-full sm:w-1/2">
             
          <DatePicker
            id="date-picker"
            label="Delivery Date"
            placeholder="Select a date"
            onChange={(e) => setDeliveryDate(e.target.value)}
          />
            </div>

            <div className="relative">
              <Label>Delivery Time (optional)</Label>
               <InputField
              type="time"
              id="tm"
              name="tm"
              onChange={(value) => setDeliveryTime(value)}
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
                style={{ backgroundColor: '#597485' }}
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

            <TextArea
              placeholder="Write your personal message here..."
              rows={6}
              value={cardMessage}
              onChange={(value) => setCardMessage(value)}
            />
          </div>

          {/* Message Preview */}
          {cardMessage.trim() && (
            <div className="rounded-md border border-stroke bg-gray-2 p-4 dark:border-strokedark dark:bg-meta-4">
              <div className="mb-2 text-sm font-medium text-black dark:text-white">
                Card Preview:
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 italic">
                "{cardMessage}"
              </div>
            </div>
          )}
        </div>
      </div>

    </ComponentCard>
  );
}