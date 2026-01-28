import { useState } from "react";
import InputField from "@shared/ui/forms/input/InputField";
import PhoneInput from "@shared/ui/forms/PhoneInput";
import Select from "@shared/ui/forms/Select";
import LoadingButton from "@shared/ui/components/ui/button/LoadingButton";
import FormFooter from "@shared/ui/components/ui/form/FormFooter";
import FormError from "@shared/ui/components/ui/form/FormError";
import { Modal } from "@shared/ui/components/ui/modal";
import { LockIcon, PencilIcon, SaveIcon, TrashBinIcon } from "@shared/assets/icons";
import { useEmployees, type Employee } from "@shared/hooks/useEmployees";
import SetPasswordModal from "./SetPasswordModal";

export default function EmployeeSettingsCard() {
  const {
    employees,
    loading,
    error,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    setPassword,
    resetPassword,
  } = useEmployees();

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
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [passwordEmployee, setPasswordEmployee] = useState<Employee | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const employeeTypeOptions = [
    { value: "CASHIER", label: "Cashier" },
    { value: "DESIGNER", label: "Designer" },
    { value: "DRIVER", label: "Driver" },
    { value: "ADMIN", label: "Admin" },
  ];

  const getTypeLabel = (value: string) =>
    employeeTypeOptions.find((option) => option.value === value)?.label || value;

  const handleAdd = async () => {
    setFormError(null);

    if (!name || !type) {
      setFormError("Name and type are required");
      return;
    }

    setIsCreating(true);

    try {
      await createEmployee({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone || null,
        type,
      });

      setName("");
      setEmail("");
      setPhone("");
      setType("CASHIER");
    } catch (err: any) {
      setFormError(err?.message ?? "Failed to create employee");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this employee?");
    if (!confirmed) return;

    setActionError(null);

    try {
      await deleteEmployee(id);
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to delete employee");
    }
  };

  const handleEdit = (emp: Employee) => {
    setEditEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || "");
    setEditPhone(emp.phone || "");
    setEditType(emp.type);
    setEditError(null);
  };

  const handleUpdate = async () => {
    if (!editEmployee) return;

    setEditError(null);

    if (!editName || !editType) {
      setEditError("Name and type are required");
      return;
    }

    setIsUpdating(true);

    try {
      await updateEmployee(editEmployee.id, {
        name: editName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone || null,
        type: editType,
      });

      setEditEmployee(null);
      setEditName("");
      setEditEmail("");
      setEditPhone("");
      setEditType("CASHIER");
    } catch (err: any) {
      setEditError(err?.message ?? "Failed to update employee");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPassword = async (employee: Employee) => {
    const confirmed = confirm(`Reset password for ${employee.name}?`);
    if (!confirmed) return;

    setActionError(null);
    setResettingId(employee.id);

    try {
      await resetPassword(employee.id);
    } catch (err: any) {
      setActionError(err?.message ?? "Failed to reset password");
    } finally {
      setResettingId(null);
    }
  };

  const openPasswordModal = (employee: Employee) => {
    setPasswordEmployee(employee);
    setIsPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordEmployee(null);
  };

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
              Employees
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage staff that appear in the Take Order form.
            </p>
          </div>
          <span
            className="text-sm hover:underline font-medium text-gray-600 dark:text-gray-300"
          >
            {isCardBodyVisible ? "Hide" : "Show"}
          </span>
        </div>
        <div
          id="employee-settings-card-body"
          className={`p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6 ${isCardBodyVisible ? "" : "hidden"}`}
        >
          <div className="space-y-6">
            <FormError error={error || actionError} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {loading ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <p>No employees yet.</p>
                    <p className="text-sm">Add your first employee to get started.</p>
                  </div>
                ) : (
                  employees.map((emp) => (
                    <div
                      key={emp.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-gray-800 dark:text-gray-100">
                              {emp.name}
                            </strong>
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {getTypeLabel(emp.type)}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            {emp.email && <span>{emp.email}</span>}
                            {emp.phone && <span>{emp.phone}</span>}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <span className={`text-2xl ${emp.hasPassword ? "text-green-500" : "text-gray-300"}`}>
                              •
                            </span>
                            <span>{emp.hasPassword ? "Login enabled" : "No login"}</span>
                            {!emp.email && (
                              <span className="text-xs text-red-500">
                                Email required to enable login
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <LoadingButton
                            type="button"
                            variant="secondary"
                            loading={resettingId === emp.id}
                            loadingText="Resetting..."
                            icon={<LockIcon className="h-4 w-4" />}
                            disabled={(!emp.hasPassword && !emp.email) || resettingId === emp.id}
                            onClick={() =>
                              emp.hasPassword
                                ? handleResetPassword(emp)
                                : openPasswordModal(emp)
                            }
                          >
                            {emp.hasPassword ? "Reset Password" : "Set Password"}
                          </LoadingButton>
                          <button
                            onClick={() => handleEdit(emp)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(emp.id)}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Delete"
                          >
                            <TrashBinIcon className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-4">
                <InputField
                  label="Name"
                  type="text"
                  placeholder="Name"
                  value={name || ""}
                  onChange={(e) => setName(e.target.value)}
                />
                <InputField
                  label="Email (optional)"
                  type="email"
                  placeholder="Email (optional)"
                  value={email || ""}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <PhoneInput
                  label="Phone"
                  value={phone || ""}
                  onChange={(value) => setPhone(value)}
                />
                <Select
                  id="type"
                  label="Type"
                  value={type}
                  onChange={setType}
                  className="select-input"
                  options={employeeTypeOptions}
                />
                <FormError error={formError} />
                <LoadingButton
                  className="w-fit"
                  onClick={handleAdd}
                  loading={isCreating}
                  loadingText="Adding..."
                  icon={<SaveIcon className="w-4 h-4" />}
                >
                  Add Employee
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={!!editEmployee} onClose={() => setEditEmployee(null)} className="max-w-lg">
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Edit Employee</h3>
          <FormError error={editError} />
          <InputField
            label="Name"
            type="text"
            value={editName || ""}
            onChange={(e) => setEditName(e.target.value)}
          />
          <InputField
            label="Email (optional)"
            type="email"
            value={editEmail || ""}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <PhoneInput
            label="Phone"
            value={editPhone || ""}
            onChange={(value) => setEditPhone(value)}
          />
          <Select
            id="edit-type"
            label="Type"
            value={editType}
            onChange={(value) => setEditType(value)}
            className="select-input"
            options={employeeTypeOptions}
          />
          <FormFooter
            onCancel={() => setEditEmployee(null)}
            onSubmit={handleUpdate}
            submitting={isUpdating}
            submitIcon={<SaveIcon className="w-4 h-4" />}
          />
        </div>
      </Modal>

      <SetPasswordModal
        isOpen={isPasswordModalOpen}
        employee={passwordEmployee}
        onClose={closePasswordModal}
        onSave={setPassword}
      />
    </div>
  );
}
