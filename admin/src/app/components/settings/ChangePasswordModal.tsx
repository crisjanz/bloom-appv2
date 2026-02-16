import { useEffect, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import InputField from "@shared/ui/forms/input/InputField";
import FormError from "@shared/ui/components/ui/form/FormError";
import FormFooter from "@shared/ui/components/ui/form/FormFooter";
import { EyeCloseIcon, EyeIcon, LockIcon, SaveIcon } from "@shared/assets/icons";
import { useApiClient } from "@shared/hooks/useApiClient";
import { toast } from "sonner";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
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

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const apiClient = useApiClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setErrors([]);
    setServerError(null);
  }, [isOpen]);

  const handleSubmit = async () => {
    const validationErrors = validatePassword(newPassword, confirmPassword);

    if (!currentPassword) {
      validationErrors.unshift("Current password is required");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setServerError(null);

    try {
      const response = await apiClient.post("/api/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (response.status >= 400) {
        const message = response.data?.message || response.data?.error || "Failed to change password";
        throw new Error(message);
      }

      toast.success("Password updated");
      onClose();
    } catch (err: any) {
      const message = err?.message ?? "Failed to change password";
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
              Change Password
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Update your login password. This will sign you in automatically.
            </p>
          </div>
        </div>

        <FormError error={serverError} errors={errors} />

        <div className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField
                label="Current Password"
                type={showCurrent ? "text" : "password"}
                value={currentPassword || ""}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowCurrent((prev) => !prev)}
              className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? (
                <EyeCloseIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField
                label="New Password"
                type={showNew ? "text" : "password"}
                value={newPassword || ""}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowNew((prev) => !prev)}
              className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={showNew ? "Hide password" : "Show password"}
            >
              {showNew ? (
                <EyeCloseIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <InputField
                label="Confirm New Password"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword || ""}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowConfirm((prev) => !prev)}
              className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
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
          submitText="Update Password"
          submitIcon={<SaveIcon className="w-4 h-4" />}
          submitDisabled={!currentPassword || !newPassword || !confirmPassword}
        />
      </div>
    </Modal>
  );
};

export default ChangePasswordModal;
