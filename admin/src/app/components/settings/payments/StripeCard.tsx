import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import InputField from "@shared/ui/forms/input/InputField";
import Select from "@shared/ui/forms/Select";
import Button from "@shared/ui/components/ui/button/Button";
import {
  ProviderUpdatePayload,
  StripeProviderConfig,
  PaymentProviderMode,
} from "./types";
import { toast } from "sonner";

interface StripeCardProps {
  data: StripeProviderConfig;
  isSaving?: boolean;
  onSave: (payload: ProviderUpdatePayload) => Promise<void> | void;
}

const modeOptions = [
  { value: "TERMINAL", label: "Terminal (card reader)" },
  { value: "MANUAL", label: "Manual entry (keyed in)" },
  { value: "HYBRID", label: "Hybrid (switch per transaction)" },
];

const StripeCard: React.FC<StripeCardProps> = ({ data, isSaving = false, onSave }) => {
  const [enabled, setEnabled] = useState<boolean>(data.enabled);
  const [mode, setMode] = useState<PaymentProviderMode>(data.mode);
  const [publicKey, setPublicKey] = useState<string>(data.publicKey ?? "");
  const [terminalId, setTerminalId] = useState<string>(data.terminalId ?? "");
  const [accountId, setAccountId] = useState<string>(data.accountId ?? "");
  const [secretInput, setSecretInput] = useState<string>("");
  const [secretChanged, setSecretChanged] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(data.enabled);
    setMode(data.mode);
    setPublicKey(data.publicKey ?? "");
    setTerminalId(data.terminalId ?? "");
    setAccountId(data.accountId ?? "");
    setSecretInput("");
    setSecretChanged(false);
  }, [data]);

  const isDirty = useMemo(() => {
    return (
      enabled !== data.enabled ||
      mode !== data.mode ||
      (data.publicKey ?? "") !== publicKey ||
      (data.terminalId ?? "") !== terminalId ||
      (data.accountId ?? "") !== accountId ||
      secretChanged
    );
  }, [enabled, mode, publicKey, terminalId, accountId, data, secretChanged]);

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
      mode,
      publicKey: publicKey.trim() || null,
      terminalId: terminalId.trim() || null,
      accountId: accountId.trim() || null,
    };

    if (secretChanged) {
      payload.secretKey = secretInput.trim();
    }

    try {
      await onSave(payload);
      toast.success("Stripe settings saved");
      setSecretInput("");
      setSecretChanged(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Stripe settings";
      setErrorMessage(message);
      toast.error(message);
    }
  };

  return (
    <ComponentCard title="Stripe">
      <div className="space-y-6">
        <Switch
          label="Enable Stripe for card payments"
          checked={enabled}
          onChange={setEnabled}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            options={modeOptions}
            value={mode}
            onChange={(value) => setMode(value as PaymentProviderMode)}
            placeholder="Select mode"
          />
          <InputField
            label="Publishable Key"
            placeholder="pk_live_xxx"
            value={publicKey}
            onChange={(event) => setPublicKey(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <InputField
              label="Secret Key"
              type="password"
              placeholder={data.hasSecret ? "••••••••••••" : "sk_live_xxx"}
              value={secretInput}
              onChange={(event) => handleSecretChange(event.target.value)}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {data.hasSecret
                ? "Leave blank to keep the current secret. Clear to remove."
                : "Enter your Stripe secret key to save it securely."}
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

          <InputField
            label="Terminal Device ID"
            placeholder="tm_1234"
            value={terminalId}
            onChange={(event) => setTerminalId(event.target.value)}
          />
        </div>

        <InputField
          label="Connect Account ID (optional)"
          placeholder="acct_1234"
          value={accountId}
          onChange={(event) => setAccountId(event.target.value)}
        />

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
            {isSaving ? "Saving…" : "Save Stripe Settings"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default StripeCard;
