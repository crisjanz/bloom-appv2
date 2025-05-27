// src/components/OrderForm/MessageSuggestions.tsx

import React from "react";

type Message = {
  id: string;
  label: string;
  message: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  suggestions: Message[];
  selected: string;
  setSelected: (val: string) => void;
  onSubmit: () => void;
};

export default function MessageSuggestions({
  open,
  onClose,
  suggestions,
  selected,
  setSelected,
  onSubmit,
}: Props) {
  if (!open) return null;

  const categories = ["SYMPATHY", "BIRTHDAY", "ANNIVERSARY", "THANK_YOU", "OTHER"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Suggested Card Messages</h2>
          <button
            className="text-blue-600 font-medium"
            onClick={onClose}
          >
            × Close
          </button>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {categories.map((category) => {
            const messages = suggestions.filter((msg) => msg.label === category);
            if (messages.length === 0) return null;

            return (
              <div key={category} className="mb-3">
                <div className="font-semibold text-gray-800 mb-1">
                  {category.replace("_", " ")}
                </div>
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <label key={msg.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="suggestion"
                        value={msg.message}
                        checked={selected === msg.message}
                        onChange={() => setSelected(msg.message)}
                      />
                      <span className="text-sm text-gray-700">{msg.message}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <button
          className="btn-primary mt-4 w-full"
          onClick={onSubmit}
        >
          Submit
        </button>
      </div>
    </div>
  );
}
