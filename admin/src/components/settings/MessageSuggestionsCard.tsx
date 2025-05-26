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
  const [isOpen, setIsOpen] = useState(true);

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
    <div className="bg-card p-4 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Message Suggestions</h2>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Preset messages for card suggestions.
      </p>

      {isOpen && (
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
            <input
              type="text"
              placeholder="Label (e.g. Sympathy)"
              className="input-primary"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
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
      )}
    </div>
  );
}
