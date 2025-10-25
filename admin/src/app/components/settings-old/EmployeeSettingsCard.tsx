
import { useEffect, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import Label from "@shared/ui/forms/Label";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";

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
  const [isCardBodyVisible, setIsCardBodyVisible] = useState(false);

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

  // Define options for the Select component
  const employeeTypeOptions = [
    { value: "CASHIER", label: "Cashier" },
    { value: "DESIGNER", label: "Designer" },
    { value: "DRIVER", label: "Driver" },
    { value: "ADMIN", label: "Admin" },
  ];

  return (
    <div className="p-4">
      <div
        className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
      >
        {/* Custom Header */}
        <div className="flex justify-between items-center px-6 py-5">
          <div>
            <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
              Employees
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage staff that appear in the Take Order form.
            </p>
          </div>
          <span 
            onClick={() => setIsCardBodyVisible(!isCardBodyVisible)}
            className="text-sm hover:underline font-medium cursor-pointer text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>
        {/* Card Body */}
        <div
          id="employee-settings-card-body"
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          <div className="space-y-6">
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
                      <Button
                        className="text-blue-600 text-sm hover:underline"
                        disabled
                      >
                        Edit
                      </Button>
                      <Button
                        className="text-red-600 text-sm hover:underline"
                        onClick={() => handleDelete(emp.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right: Add New */}
              <div>
                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <InputField
                      id="name"
                      type="text"
                      placeholder="Name"
                      className="input-primary"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email (optional)</Label>
                    <InputField
                      id="email"
                      type="email"
                      placeholder="Email (optional)"
                      className="input-primary"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <InputField
                      id="phone"
                      type="tel"
                      placeholder="Phone"
                      className="input-primary"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select
                      id="type"
                      value={type}
                      onChange={(value) => setType(value)}
                      className="select-input"
                      options={employeeTypeOptions}
                    />
                  </div>
                  <Button
                    className="btn-primary w-fit"
                    onClick={handleAdd}
                  >
                    Add Employee
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    

    
  );
}