import { useEffect, useState } from "react";
import { Modal } from "@shared/ui/components/ui/modal";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import Checkbox from "@shared/ui/forms/input/Checkbox";
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
  const [printLabels, setPrintLabels] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [printMessage, setPrintMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setError(null);
      setSuccessMessage(null);
      setPrintMessage(null);
      setQuantity("100");
      setCardType("PHYSICAL");
      setPrintLabels(false);
    }
  }, [open]);

  useEffect(() => {
    if (cardType === "DIGITAL") {
      setPrintLabels(false);
    }
  }, [cardType]);

  const handleSubmit = async () => {
    setError(null);
    setSuccessMessage(null);
    setPrintMessage(null);

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
        printLabels: printLabels && cardType === "PHYSICAL",
      });

      if (status >= 400) {
        throw new Error(data?.error || "Failed to create gift card batch");
      }

      const createdCount = Array.isArray(data?.cards) ? data.cards.length : parsedQuantity;
      setSuccessMessage(`Created ${createdCount} gift card${createdCount === 1 ? "" : "s"}.`);
      const labelPrint = data?.labelPrint;
      if (labelPrint) {
        if (labelPrint.action === "browser-print" && labelPrint.pdfUrl) {
          window.open(labelPrint.pdfUrl, "_blank");
          setPrintMessage("Label PDF opened in a new tab.");
        } else if (labelPrint.action === "queued") {
          setPrintMessage("Labels queued for printing.");
        } else if (labelPrint.action === "skipped") {
          setPrintMessage("Label printing is disabled in Print Settings.");
        }
      }
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

        {printMessage && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {printMessage}
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

        <div className="rounded-lg border border-stroke dark:border-strokedark p-3">
          <Checkbox
            checked={printLabels}
            onChange={(checked) => setPrintLabels(checked)}
            disabled={cardType !== "PHYSICAL"}
            label="Print QR labels (40x30mm)"
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
