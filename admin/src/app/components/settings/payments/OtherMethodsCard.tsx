import { useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import TextArea from "@shared/ui/forms/input/TextArea";
import Switch from "@shared/ui/forms/switch/Switch";
import Button from "@shared/ui/components/ui/button/Button";
import {
  OfflineMethodInput,
  OfflinePaymentMethod,
} from "./types";

interface OtherMethodsCardProps {
  methods: OfflinePaymentMethod[];
  isSaving?: boolean;
  onCreate: (input: OfflineMethodInput) => Promise<OfflinePaymentMethod> | OfflinePaymentMethod;
  onUpdate: (id: string, input: OfflineMethodInput) => Promise<OfflinePaymentMethod> | OfflinePaymentMethod;
  onDelete: (id: string) => Promise<void> | void;
  onReorder: (order: string[]) => Promise<void> | void;
}

const defaultFormState: OfflineMethodInput = {
  name: "",
  code: "",
  description: "",
  instructions: "",
  isActive: true,
  visibleOnPos: true,
  visibleOnTakeOrder: true,
  requiresReference: false,
  allowChangeTracking: false,
};

const OtherMethodsCard: React.FC<OtherMethodsCardProps> = ({
  methods,
  isSaving = false,
  onCreate,
  onUpdate,
  onDelete,
  onReorder,
}) => {
  const [form, setForm] = useState<OfflineMethodInput>(defaultFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedMethods = useMemo(
    () => [...methods].sort((a, b) => a.sortOrder - b.sortOrder),
    [methods]
  );

  const resetForm = () => {
    setForm(defaultFormState);
    setEditingId(null);
  };

  const handleInputChange = (field: keyof OfflineMethodInput, value: any) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const populateForm = (method: OfflinePaymentMethod) => {
    setForm({
      name: method.name,
      code: method.code,
      description: method.description ?? "",
      instructions: method.instructions ?? "",
      isActive: method.isActive,
      visibleOnPos: method.visibleOnPos,
      visibleOnTakeOrder: method.visibleOnTakeOrder,
      requiresReference: method.requiresReference,
      allowChangeTracking: method.allowChangeTracking,
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setErrorMessage("Name is required for offline payment methods");
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    const payload: OfflineMethodInput = {
      ...form,
      name: form.name.trim(),
      code: form.code?.trim() || undefined,
      description: form.description?.trim() || undefined,
      instructions: form.instructions?.trim() || undefined,
      isActive: form.isActive,
      visibleOnPos: form.visibleOnPos,
      visibleOnTakeOrder: form.visibleOnTakeOrder,
      requiresReference: form.requiresReference,
      allowChangeTracking: form.allowChangeTracking,
    };

    try {
      if (editingId) {
        await onUpdate(editingId, payload);
        setStatusMessage("Offline payment method updated");
      } else {
        await onCreate(payload);
        setStatusMessage("Offline payment method added");
      }
      resetForm();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save offline payment method"
      );
    }
  };

  const handleEdit = (method: OfflinePaymentMethod) => {
    setEditingId(method.id);
    populateForm(method);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this offline payment method?")) {
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);

    try {
      await onDelete(id);
      if (editingId === id) {
        resetForm();
      }
      setStatusMessage("Offline payment method removed");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete offline payment method"
      );
    }
  };

  const moveMethod = async (id: string, direction: number) => {
    const currentIndex = sortedMethods.findIndex((method) => method.id === id);
    if (currentIndex < 0) return;

    const newIndex = currentIndex + direction;
    if (newIndex < 0 || newIndex >= sortedMethods.length) return;

    const newOrder = [...sortedMethods];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    try {
      await onReorder(newOrder.map((method) => method.id));
      setStatusMessage("Offline payment methods reordered");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to reorder offline payment methods"
      );
    }
  };

  const isEditing = Boolean(editingId);

  return (
    <ComponentCard
      title="Offline / Bank Payments"
      desc="Configure manual payment types like wire transfers, e-transfers, or house invoices."
    >
      <div className="space-y-6">
        <div className="space-y-3">
          {sortedMethods.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No offline payment methods yet. Add one below to help staff capture manual payments consistently.
            </p>
          )}

          {sortedMethods.map((method, index) => (
            <div
              key={method.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {method.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Code: {method.code}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {method.isActive ? (
                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                      Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600 dark:bg-gray-700/60 dark:text-gray-300">
                      Inactive
                    </span>
                  )}
                  {method.visibleOnPos ? (
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-brand-600 dark:bg-brand-500/20 dark:text-brand-200">
                      POS
                    </span>
                  ) : null}
                  {method.visibleOnTakeOrder ? (
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-600 dark:bg-blue-500/20 dark:text-blue-200">
                      Take Order
                    </span>
                  ) : null}
                  {method.requiresReference ? (
                    <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-600 dark:bg-purple-500/20 dark:text-purple-200">
                      Reference Required
                    </span>
                  ) : null}
                </div>
              </div>

              {method.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{method.description}</p>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {method.instructions && <span>Instructions: {method.instructions}</span>}
                <span>Updated {new Date(method.updatedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveMethod(method.id, -1)}
                  disabled={isSaving || index === 0}
                >
                  Move Up
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => moveMethod(method.id, 1)}
                  disabled={isSaving || index === sortedMethods.length - 1}
                >
                  Move Down
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(method)}
                  disabled={isSaving}
                >
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(method.id)}
                  disabled={isSaving}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-gray-200 pt-4 dark:border-gray-800">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {isEditing ? "Edit Offline Payment Method" : "Add Offline Payment Method"}
          </h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InputField
              label="Display Name"
              placeholder="Wire Transfer"
              value={form.name}
              onChange={(event) => handleInputChange("name", event.target.value)}
            />
            <InputField
              label="Code (optional)"
              placeholder="wire-transfer"
              value={form.code ?? ""}
              onChange={(event) => handleInputChange("code", event.target.value)}
              hint="Used internally; leave blank to generate automatically."
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <TextArea
              placeholder="Short description for staff"
              rows={3}
              value={form.description ?? ""}
              onChange={(value) => handleInputChange("description", value)}
            />
            <TextArea
              placeholder="Step-by-step instructions shown in POS"
              rows={3}
              value={form.instructions ?? ""}
              onChange={(value) => handleInputChange("instructions", value)}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Switch
              label="Visible in POS"
              checked={form.visibleOnPos ?? true}
              onChange={(checked) => handleInputChange("visibleOnPos", checked)}
            />
            <Switch
              label="Visible in Take Order"
              checked={form.visibleOnTakeOrder ?? true}
              onChange={(checked) => handleInputChange("visibleOnTakeOrder", checked)}
            />
            <Switch
              label="Active"
              checked={form.isActive ?? true}
              onChange={(checked) => handleInputChange("isActive", checked)}
            />
            <Switch
              label="Requires reference (transaction number)"
              checked={form.requiresReference ?? false}
              onChange={(checked) => handleInputChange("requiresReference", checked)}
            />
            <Switch
              label="Track change/tender details"
              checked={form.allowChangeTracking ?? false}
              onChange={(checked) => handleInputChange("allowChangeTracking", checked)}
            />
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="space-y-1">
              {statusMessage && (
                <p className="text-sm text-success-600 dark:text-success-400">{statusMessage}</p>
              )}
              {errorMessage && (
                <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
              )}
            </div>
            <div className="flex gap-2">
              {isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetForm}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSaving}
              >
                {isSaving ? "Saving…" : isEditing ? "Update Method" : "Add Method"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ComponentCard>
  );
};

export default OtherMethodsCard;
