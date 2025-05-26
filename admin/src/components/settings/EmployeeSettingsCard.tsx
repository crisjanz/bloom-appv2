import { useEffect, useState } from "react";

type Employee = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  type: string;
};

export default function EmployeeSettingsCard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState("CASHIER");
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    fetch("/api/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data));
  }, []);

  const handleAdd = async () => {
    if (!name || !type) return;

    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, type, phone }),
    });

    if (res.ok) {
      const newEmp = await res.json();
      setEmployees([...employees, newEmp]);
      setName("");
      setEmail("");
      setPhone("");
      setType("CASHIER");
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this employee?");
    if (!confirmed) return;

    const res = await fetch(`/api/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees(employees.filter((emp) => emp.id !== id));
    }
  };

  return (
    <div className="bg-card p-4 rounded-2xl shadow">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold">Employees</h2>
        <button
          className="text-sm text-blue-600 hover:underline"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Manage staff that appear in the Take Order form.
      </p>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Employee List */}
          <div className="space-y-2">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className="flex justify-between items-center border p-2 rounded"
              >
                <div>
                  <strong>{emp.name}</strong>
                  <span className="ml-2 text-sm text-gray-500">
                    {emp.type.charAt(0) + emp.type.slice(1).toLowerCase()}
                  </span>
                  {emp.email && (
                    <span className="ml-2 text-sm text-gray-500">
                      ({emp.email})
                    </span>
                  )}
                  {emp.phone && (
                    <span className="ml-2 text-sm text-gray-500">
                      {emp.phone}
                    </span>
                  )}
                </div>
                <div className="space-x-2">
                  <button
                    className="text-blue-600 text-sm hover:underline"
                    disabled
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-600 text-sm hover:underline"
                    onClick={() => handleDelete(emp.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Right: Add New */}
          <div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name"
                className="input-primary"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                type="email"
                placeholder="Email (optional)"
                className="input-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                type="tel"
                placeholder="Phone"
                className="input-primary"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="select-input"
              >
                <option value="CASHIER">Cashier</option>
                <option value="DESIGNER">Designer</option>
                <option value="DRIVER">Driver</option>
                <option value="ADMIN">Admin</option>
              </select>
              <button
                className="btn-primary w-fit"
                onClick={handleAdd}
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
