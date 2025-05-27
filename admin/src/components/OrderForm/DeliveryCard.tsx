import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
  return (
    <div className="bg-card rounded shadow p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Date + Time + Instructions */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium">Date</label>
              <DatePicker
                selected={deliveryDate ? new Date(deliveryDate) : null}
                onChange={(date) =>
                  setDeliveryDate(date ? date.toISOString().split("T")[0] : "")
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

          <div>
            <label className="block text-sm font-medium">
              Delivery Instructions
            </label>
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

        {/* Card Message */}
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
  );
}
