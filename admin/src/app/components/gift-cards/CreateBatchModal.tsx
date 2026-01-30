import { useEffect, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import FormFooter from "@shared/ui/components/ui/form/FormFooter";
import FormError from "@shared/ui/components/ui/form/FormError";
import { PlusIcon } from "@shared/assets/icons";
import { useApiClient } from "@shared/hooks/useApiClient";

const typeOptions = [
  { value: "PHYSICAL", label: "Physical" },
  { value: "DIGITAL", label: "Digital" },
];

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
};

export default function CreateBatchModal({ open, onClose, onSuccess }: Props) {
  const apiClient = useApiClient();
  const [quantity, setQuantity] = useState("100");
  const [cardType, setCardType] = useState<"PHYSICAL" | "DIGITAL">("PHYSICAL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMessage(null);
      setQuantity("100");
      setCardType("PHYSICAL");
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);

    const parsedQuantity = Number.parseInt(quantity, 10);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 1000) {
      setError("Quantity must be between 1 and 1000.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data, status } = await apiClient.post("/api/gift-cards/batch", {
        quantity: parsedQuantity,
        type: cardType,
      });

      if (status >= 400) {
        throw new Error(data?.error || "Failed to create gift card batch");
      }

      const createdCount = Array.isArray(data?.cards) ? data.cards.length : parsedQuantity;
      setSuccessMessage(`Created ${createdCount} gift card${createdCount === 1 ? "" : "s"}.`);
      onSuccess(createdCount);
    } catch (err) {
      console.error("Error creating gift card batch:", err);
      setError(err instanceof Error ? err.message : "Failed to create gift card batch");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-lg">
      <div className="p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Gift Card Batch</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Generate a batch of inactive gift cards for future activation.
          </p>
        </div>

        {successMessage && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMessage}
          </div>
        )}

        {error && <FormError error={error} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="Quantity"
            type="number"
            min="1"
            max="1000"
            value={quantity || ""}
            onChange={(e) => setQuantity(e.target.value)}
          />

          <Select
            label="Type"
            options={typeOptions}
            value={cardType}
            onChange={(value) => setCardType(value as "PHYSICAL" | "DIGITAL")}
          />
        </div>

        <FormFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitting={isSubmitting}
          submitText="Create Batch"
          submitIcon={<PlusIcon className="w-4 h-4" />}
        />
      </div>
    </Modal>
  );
}
