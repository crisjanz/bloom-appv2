import { useEffect, useState } from "react";

type MessageSuggestion = {
  id: string;
  label: string;
  message: string;
};

export default function MessageSuggestionsCard() {
  const [messages, setMessages] = useState<MessageSuggestion[]>([]);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");
  const [isCardBodyVisible, setIsCardBodyVisible] = useState(false);

  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setMessages(data));
  }, []);

  const handleAdd = async () => {
    if (!label || !message) return;

    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, message }),
    });

    if (res.ok) {
      const newMsg = await res.json();
      setMessages([...messages, newMsg]);
      setLabel("");
      setMessage("");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this message?");
    if (!confirmed) return;

    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessages(messages.filter((msg) => msg.id !== id));
    }
  };

  return (
    <div className="p-4">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Message Suggestions
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage predefined messages for orders
            </p>
          </div>
          <span 
            onClick={() => setIsCardBodyVisible(!isCardBodyVisible)}
            className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>

        {/* Card Body - Starts Here */}
        <div
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: List */}
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className="border p-2 rounded text-sm flex justify-between"
                >
                  <div>
                    <div className="font-medium">{msg.label}</div>
                    <div className="text-gray-600">{msg.message}</div>
                  </div>
                  <button
                    className="text-red-600 text-sm hover:underline"
                    onClick={() => handleDelete(msg.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {/* Right: Form */}
            <div className="flex flex-col gap-3">
              <select
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="select-input"
              >
                <option value="" disabled hidden>Select category</option>
                <option value="SYMPATHY">Sympathy</option>
                <option value="BIRTHDAY">Birthday</option>
                <option value="ANNIVERSARY">Anniversary</option>
                <option value="THANK_YOU">Thank You</option>
                <option value="OTHER">Other</option>
              </select>

              <textarea
                placeholder="Message"
                className="input-primary"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="btn-primary w-fit" onClick={handleAdd}>
                Add Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}