import { useEffect, useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import SelectField from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";

type MessageSuggestion = {
  id: string;
  label: string;
  message: string;
};

export default function MessageSuggestionsCard() {
  const [messages, setMessages] = useState<MessageSuggestion[]>([]);
  const [label, setLabel] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [isCardBodyVisible, setIsCardBodyVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetch("/api/messages")
      .then((res) => res.json())
      .then((data) => setMessages(data))
      .catch((error) => console.error("Error fetching messages:", error));
  }, []);

  const handleAdd = async () => {
    if (!label || !message) {
      console.error("Missing required fields", { label, message });
      return;
    }

    const payload = { label, message };
    console.log("Sending payload:", payload);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages([...messages, newMsg]);
        setLabel(null);
        setMessage("");
      } else {
        const errorData = await res.text();
        console.error("Failed to add message:", res.status, errorData);
      }
    } catch (error) {
      console.error("Error adding message:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this message?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/messages/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setMessages(messages.filter((msg) => msg.id !== id));
      } else {
        console.error("Failed to delete message:", res.status, await res.text());
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const groupedMessages = messages
    .sort((a, b) => a.label.localeCompare(b.label))
    .reduce((acc, msg) => {
      if (!acc[msg.label]) {
        acc[msg.label] = [];
      }
      acc[msg.label].push(msg);
      return acc;
    }, {} as { [key: string]: MessageSuggestion[] });

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const selectOptions = [
    { label: "Sympathy", value: "SYMPATHY" },
    { label: "Birthday", value: "BIRTHDAY" },
    { label: "Anniversary", value: "ANNIVERSARY" },
    { label: "Thank You", value: "THANK_YOU" },
    { label: "Other", value: "OTHER" },
  ];

  return (
    <div className="p-0">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div
          className="flex justify-between items-center px-6 py-5 cursor-pointer"
          role="button"
          tabIndex={0}
          onClick={() => setIsCardBodyVisible(!isCardBodyVisible)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsCardBodyVisible(!isCardBodyVisible);
            }
          }}
        >
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Message Suggestions
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage predefined messages for orders
            </p>
          </div>
          <span
            className="text-sm hover:underline font-medium text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>
        <div
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {Object.keys(groupedMessages).map((label) => (
                <div key={label} className="border rounded">
                  <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700">
                    <h4 className="font-medium text-gray-800 dark:text-white/90">
                      {label}
                    </h4>
                    <span
                      className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
                      onClick={() => toggleSection(label)}
                    >
                      {expandedSections[label] ? "Hide" : "Show"}
                    </span>
                  </div>
                  {expandedSections[label] && (
                    <div className="space-y-2 p-2">
                      {groupedMessages[label].map((msg) => (
                        <div
                          key={msg.id}
                          className="border p-2 rounded text-sm flex justify-between"
                        >
                          <div>
                            <div className="text-gray-600">{msg.message}</div>
                          </div>
                          <span
                            className="text-red-600 text-sm hover:text-red-800 cursor-pointer"
                            onClick={() => handleDelete(msg.id)}
                          >
                            ✕
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <SelectField
                placeholder="Select category"
                value={label || ""}
                onChange={(value) => {
                  console.log("SelectField onChange:", value);
                  setLabel(value || null);
                }}
                options={selectOptions}
                className="input-primary"
              />
              <TextArea
                placeholder="Message"
                rows={4}
                value={message}
                onChange={(value) => setMessage(value)}
                className="input-primary"
              />
              <Button className="btn-primary w-fit" onClick={handleAdd}>
                Add Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
