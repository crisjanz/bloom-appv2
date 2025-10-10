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
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editType, setEditType] = useState("CASHIER");

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
      if (!employees.some(emp => emp.id === newEmp.id)) {
        setEmployees([...employees, newEmp]);
      }
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

  const handleEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || "");
    setEditPhone(emp.phone || "");
    setEditType(emp.type);
  };

  const handleUpdate = async () => {
    if (!editEmployee || !editName || !editType) return;

    try {
      const res = await fetch(`/api/employees/${editEmployee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, type: editType, phone: editPhone }),
      });

      if (res.ok) {
        const updatedEmp = await res.json();
        setEmployees(employees.map(emp => emp.id === updatedEmp.id ? updatedEmp : emp));
        setEditEmployee(null);
        setEditName("");
        setEditEmail("");
        setEditPhone("");
        setEditType("CASHIER");
      } else {
        console.error("Failed to update employee:", res.statusText);
      }
    } catch (error) {
      console.error("Error updating employee:", error);
    }
  };

  const employeeTypeOptions = [
    { value: "CASHIER", label: "Cashier" },
    { value: "DESIGNER", label: "Designer" },
    { value: "DRIVER", label: "Driver" },
    { value: "ADMIN", label: "Admin" },
  ];

  return (
    <div className="p-0">
      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
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
        <div
          id="employee-settings-card-body"
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span
                        className="text-blue-600 text-sm hover:underline cursor-pointer"
                        onClick={() => handleEdit(emp)}
                      >
                        Edit
                      </span>
                      <span
                        className="text-red-600 text-sm hover:text-red-800 cursor-pointer"
                        onClick={() => handleDelete(emp.id)}
                      >
                        ✕
                      </span>
                    </div>
                  </div>
                ))}
              </div>
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
    onChange={setType}
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
      {editEmployee && (
  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full">
      <h3 className="text-lg font-medium mb-4">Edit Employee</h3>
      <div className="space-y-4">
        <div>
          <Label htmlFor="edit-name">Name</Label>
          <InputField
            id="edit-name"
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="input-primary"
          />
        </div>
        <div>
          <Label htmlFor="edit-email">Email (optional)</Label>
          <InputField
            id="edit-email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            className="input-primary"
          />
        </div>
        <div>
          <Label htmlFor="edit-phone">Phone</Label>
          <InputField
            id="edit-phone"
            type="tel"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            className="input-primary"
          />
        </div>
        <div>
          <Label htmlFor="edit-type">Type</Label>
          <Select
            id="edit-type"
            value={editType}
            onChange={(option) => setEditType(option.value)}
            className="select-input"
            options={employeeTypeOptions}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            className="btn-secondary"
            onClick={() => setEditEmployee(null)}
          >
            Cancel
          </Button>
          <Button
            className="btn-primary"
            onClick={handleUpdate}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}