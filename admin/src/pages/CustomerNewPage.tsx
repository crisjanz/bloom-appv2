import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerNewPage() {
  const navigate = useNavigate();

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!customer.name.trim()) {
      setError("Name is required");
      return;
    }

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });

    if (res.ok) {
      const created = await res.json();
      navigate(`/customers`); // Redirect to full edit page
    } else {
      setError("Failed to create customer");
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-bold mb-4">Add New Customer</h1>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <label className="block mb-2">Name</label>
      <input
        className="w-full mb-4 p-2 border"
        value={customer.name}
        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
      />

      <label className="block mb-2">Email</label>
      <input
        className="w-full mb-4 p-2 border"
        value={customer.email}
        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
      />

      <label className="block mb-2">Phone</label>
      <input
        className="w-full mb-4 p-2 border"
        value={customer.phone}
        onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
      />

      <label className="block mb-2">Notes</label>
      <textarea
        className="w-full mb-4 p-2 border"
        rows={3}
        value={customer.notes}
        onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
      />

      <button
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        onClick={handleSave}
      >
        Save Customer
      </button>
    </div>
  );
}
