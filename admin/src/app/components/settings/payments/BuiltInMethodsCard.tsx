import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import Button from "@shared/ui/components/ui/button/Button";
import { BuiltInMethodsPayload, PaymentSettingsResponse } from "./types";
import { toast } from "sonner";

interface BuiltInMethodsCardProps {
  methods: PaymentSettingsResponse["builtInMethods"];
  isSaving?: boolean;
  onSave: (payload: BuiltInMethodsPayload) => Promise<void> | void;
}

const BuiltInMethodsCard: React.FC<BuiltInMethodsCardProps> = ({ methods, isSaving = false, onSave }) => {
  const [codEnabled, setCodEnabled] = useState<boolean>(methods.cod);
  const [houseAccountEnabled, setHouseAccountEnabled] = useState<boolean>(methods.houseAccount);
  const [checkEnabled, setCheckEnabled] = useState<boolean>(methods.check);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setCodEnabled(methods.cod);
    setHouseAccountEnabled(methods.houseAccount);
    setCheckEnabled(methods.check);
  }, [methods]);

  const isDirty = useMemo(() => {
    return (
      codEnabled !== methods.cod ||
      houseAccountEnabled !== methods.houseAccount ||
      checkEnabled !== methods.check
    );
  }, [codEnabled, houseAccountEnabled, checkEnabled, methods]);

  const handleSave = async () => {
    setErrorMessage(null);

    const payload: BuiltInMethodsPayload = {
      codEnabled,
      houseAccountEnabled,
      checkEnabled
    };

    try {
      await onSave(payload);
      toast.success("Built-in payment methods updated");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update built-in payment methods";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <ComponentCard title="Built-in Offline Methods" desc="Toggle availability of standard offline tenders for POS and TakeOrder.">
      <div className="space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          These methods appear alongside custom offline payments. Disable any options your shop does not accept.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <Switch
            label="Pay Later"
            checked={codEnabled}
            onChange={setCodEnabled}
          />
          <Switch
            label="House Account"
            checked={houseAccountEnabled}
            onChange={setHouseAccountEnabled}
          />
          <Switch
            label="Cheque"
            checked={checkEnabled}
            onChange={setCheckEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {errorMessage && (
              <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving || !isDirty}>
            {isSaving ? "Saving…" : "Save Toggles"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default BuiltInMethodsCard;
