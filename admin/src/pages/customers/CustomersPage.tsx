import { useEffect, useState } from "react";

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  notes?: string;
};


export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    notes: "",
  });
  

  useEffect(() => {
    fetch("/api/customers")
      .then((res) => res.json())
      .then(setCustomers)
      .catch(() => alert("Failed to load customers"));
  }, []);



  const handleAdd = async () => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCustomer),
    });

    if (!res.ok) return alert("Failed to add customer");

    const created = await res.json();
    setCustomers((prev) => [...prev, created]);
    setNewCustomer({ name: "", email: "", phone: "", notes: "" });
  };

  const handleUpdate = async (id: string, field: keyof Customer, value: string) => {
    const updated = customers.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setCustomers(updated);

    const customer = updated.find((c) => c.id === id);
    if (!customer) return;

    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(customer),
    });

    if (!res.ok) alert("Failed to save");
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (!res.ok) return alert("Delete failed");

    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };


  return (


 <div className="p-4">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Customers
            </h3>
          
          </div>
 
        </div>

        {/* Card Body - Starts Here */}
        <div
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6`}
        >
          
     <table className="w-full table-auto border">
        <thead>
          <tr className="bg-gray-100">
          <th className="p-2 text-left">First</th>
<th className="p-2 text-left">Last</th>

            <th className="p-2 text-left">Email</th>
            <th className="p-2 text-left">Phone</th>
            <th className="p-2 text-left">Notes</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-2">
  <input
    className="w-full border p-1"
    value={c.firstName}
    onChange={(e) => handleUpdate(c.id, "firstName", e.target.value)}
  />
</td>
<td className="p-2">
  <input
    className="w-full border p-1"
    value={c.lastName}
    onChange={(e) => handleUpdate(c.id, "lastName", e.target.value)}
  />
</td>

              <td className="p-2">
                <input
                  className="w-full border p-1"
                  value={c.email || ""}
                  onChange={(e) => handleUpdate(c.id, "email", e.target.value)}
                />
              </td>
              <td className="p-2">
                <input
                  className="w-full border p-1"
                  value={c.phone || ""}
                  onChange={(e) => handleUpdate(c.id, "phone", e.target.value)}
                />
              </td>
              <td className="p-2">
                <input
                  className="w-full border p-1"
                  value={c.notes || ""}
                  onChange={(e) => handleUpdate(c.id, "notes", e.target.value)}
                />
              </td>
              <td className="p-2 text-right">
  <a
    href={`/customers/${c.id}`}
    className="text-sm text-blue-600 hover:underline"
  >
    Edit
  </a>
</td>

            </tr>
          ))}
        </tbody>
      </table>



        </div>
      </div>
    </div>
  );
};










