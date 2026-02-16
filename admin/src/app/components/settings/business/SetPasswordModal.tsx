import { useEffect, useMemo, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import InputField from "@shared/ui/forms/input/InputField";
import FormError from "@shared/ui/components/ui/form/FormError";
import FormFooter from "@shared/ui/components/ui/form/FormFooter";
import { EyeCloseIcon, EyeIcon, LockIcon, SaveIcon } from "@shared/assets/icons";
import type { Employee } from "@shared/hooks/useEmployees";
import { toast } from "sonner";

interface SetPasswordModalProps {
  isOpen: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSave: (employeeId: string, password: string) => Promise<unknown>;
}

const validatePassword = (password: string, confirmPassword: string) => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must include at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must include at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must include at least one number");
  }

  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Password must include at least one special character");
  }

  if (password !== confirmPassword) {
    errors.push("Passwords do not match");
  }

  return errors;
};

const SetPasswordModal: React.FC<SetPasswordModalProps> = ({
  isOpen,
  employee,
  onClose,
  onSave,
}) => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const emailMissing = useMemo(() => !employee?.email, [employee?.email]);

  useEffect(() => {
    if (!isOpen) return;
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors([]);
    setServerError(null);
  }, [isOpen, employee?.id]);

  const handleSubmit = async () => {
    if (!employee) return;

    if (emailMissing) {
      setErrors(["Employee must have an email before setting a password"]);
      return;
    }

    const validationErrors = validatePassword(password, confirmPassword);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setServerError(null);

    try {
      await onSave(employee.id, password);
      toast.success("Password set");
      onClose();
    } catch (err: any) {
      const message = err?.message ?? "Failed to set password";
      setServerError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl">
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <LockIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Set Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {employee ? `Set login credentials for ${employee.name}.` : ""}
            </p>
          </div>
        </div>

        {employee?.email && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Login email: <span className="font-medium text-gray-700 dark:text-gray-200">{employee.email}</span>
          </div>
        )}

        <FormError error={serverError} errors={errors} />

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password || ""}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeCloseIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword || ""}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? (
                <EyeCloseIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitting={saving}
          submitText="Set Password"
          submitIcon={<SaveIcon className="w-4 h-4" />}
          submitDisabled={emailMissing || !password || !confirmPassword}
        />
      </div>
    </Modal>
  );
};

export default SetPasswordModal;
