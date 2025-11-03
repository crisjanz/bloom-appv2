// src/components/OrderForm/MessageSuggestions.tsx
import { useEffect, useState } from "react";

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
  customerId?: string | null;
};

export default function MessageSuggestions({
  open,
  onClose,
  suggestions,
  selected,
  setSelected,
  onSubmit,
  customerId,
}: Props) {
  const [customerMessages, setCustomerMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      // Fetch customer's previously used messages
      setIsLoading(true);
      fetch(`/api/customers/${customerId}/messages`)
        .then((res) => {
          console.log('Customer messages response status:', res.status);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.text().then(text => {
            try {
              return JSON.parse(text);
            } catch (e) {
              console.error('Invalid JSON response:', text);
              throw new Error('Invalid JSON response from server');
            }
          });
        })
        .then((data) => {
          console.log('Customer messages loaded:', data);
          setCustomerMessages(data || []);
        })
        .catch((err) => console.error("Failed to load customer messages:", err))
        .finally(() => setIsLoading(false));
    }
  }, [open, customerId]);

  if (!open) return null;

  // Define category display names
  const categoryDisplayNames: Record<string, string> = {
    "SYMPATHY": "Sympathy",
    "BIRTHDAY": "Birthday", 
    "ANNIVERSARY": "Anniversary",
    "THANK_YOU": "Thank You",
    "LOVE": "Love & Romance",
    "GET_WELL": "Get Well",
    "CONGRATULATIONS": "Congratulations",
    "OTHER": "Other",
  };

  // Get unique categories from suggestions
  const categories = [...new Set(suggestions.map(s => s.label))];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-boxdark rounded-lg p-6 w-full max-w-2xl max-h-[90vh] shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-white">Message Ideas</h2>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2">
          {/* Customer's Previous Messages */}
          {customerMessages.length > 0 && (
            <div className="mb-6">
              <h3 className="font-semibold text-black dark:text-white mb-3">
                Previously Used Messages
              </h3>
              <div className="space-y-2">
                {customerMessages.map((msg, idx) => (
                  <label key={`customer-${idx}`} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer">
                    <input
                      type="radio"
                      name="suggestion"
                      value={msg}
                      checked={selected === msg}
                      onChange={() => setSelected(msg)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{msg}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Messages by Category */}
          {categories.map((category) => {
            const categoryMessages = suggestions
              .filter((msg) => msg.label === category)
              .filter((msg) => !customerMessages.includes(msg.message)); // Filter out duplicates
            if (categoryMessages.length === 0) return null;

            return (
              <div key={category} className="pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <h3 className="font-semibold text-black dark:text-white mb-3">
                  {categoryDisplayNames[category] || category}
                </h3>
                <div className="space-y-2">
                  {categoryMessages.map((msg) => (
                    <label key={msg.id} className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-meta-4 cursor-pointer">
                      <input
                        type="radio"
                        name="suggestion"
                        value={msg.message}
                        checked={selected === msg.message}
                        onChange={() => setSelected(msg.message)}
                        className="mt-1"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{msg.message}</span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}

          {suggestions.length === 0 && !isLoading && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No message suggestions available. Please add suggestions in the settings.
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:bg-opacity-90"
            style={{ backgroundColor: '#597485' }}
            onClick={onSubmit}
            disabled={!selected}
          >
            Use This Message
          </button>
        </div>
      </div>
    </div>
  );
}