import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import Select from "@shared/ui/forms/Select";
import InputField from "@shared/ui/forms/input/InputField";
import Button from "@shared/ui/components/ui/button/Button";
import {
  PaypalProviderConfig,
  ProviderUpdatePayload,
} from "./types";
import { toast } from "sonner";

interface PaypalCardProps {
  data: PaypalProviderConfig;
  isSaving?: boolean;
  onSave: (payload: ProviderUpdatePayload) => Promise<void> | void;
}

const environmentOptions = [
  { value: "sandbox", label: "Sandbox" },
  { value: "live", label: "Live" },
];

const PaypalCard: React.FC<PaypalCardProps> = ({ data, isSaving = false, onSave }) => {
  const [enabled, setEnabled] = useState<boolean>(data.enabled);
  const [environment, setEnvironment] = useState<string>(data.environment ?? "sandbox");
  const [clientId, setClientId] = useState<string>(data.clientId ?? "");
  const [secretInput, setSecretInput] = useState<string>("");
  const [secretChanged, setSecretChanged] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(data.enabled);
    setEnvironment(data.environment ?? "sandbox");
    setClientId(data.clientId ?? "");
    setSecretInput("");
    setSecretChanged(false);
  }, [data]);

  const isDirty = useMemo(() => {
    return (
      enabled !== data.enabled ||
      (data.environment ?? "sandbox") !== environment ||
      (data.clientId ?? "") !== clientId ||
      secretChanged
    );
  }, [enabled, environment, clientId, data, secretChanged]);

  const handleSecretChange = (value: string) => {
    setSecretInput(value);
    setSecretChanged(true);
  };

  const handleClearSecret = () => {
    setSecretInput("");
    setSecretChanged(true);
  };

  const handleSave = async () => {
    setErrorMessage(null);

    const payload: ProviderUpdatePayload = {
      enabled,
      environment,
      clientId: clientId.trim() || null,
    };

    if (secretChanged) {
      payload.secretKey = secretInput.trim();
    }

    try {
      await onSave(payload);
      toast.success("PayPal settings saved");
      setSecretInput("");
      setSecretChanged(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save PayPal settings";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <ComponentCard title="PayPal">
      <div className="space-y-6">
        <Switch
          label="Enable PayPal"
          checked={enabled}
          onChange={setEnabled}
        />

        <Select
          options={environmentOptions}
          value={environment}
          onChange={setEnvironment}
        />

        <InputField
          label="Client ID"
          placeholder="Abc123"
          value={clientId}
          onChange={(event) => setClientId(event.target.value)}
        />

        <div>
          <InputField
            label="Client Secret"
            type="password"
            placeholder={data.hasSecret ? "••••••••••••" : "Enter client secret"}
            value={secretInput}
            onChange={(event) => handleSecretChange(event.target.value)}
          />
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {data.hasSecret
              ? "Leave blank to keep the stored secret. Clear to remove."
              : "Store your PayPal client secret for website checkout."}
          </p>
          {data.hasSecret && (
            <button
              type="button"
              className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
              onClick={handleClearSecret}
            >
              Clear stored secret
            </button>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {errorMessage && (
              <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving…" : "Save PayPal Settings"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default PaypalCard;
