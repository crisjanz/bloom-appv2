import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import Select from "@shared/ui/forms/Select";
import InputField from "@shared/ui/forms/input/InputField";
import Button from "@shared/ui/components/ui/button/Button";
import {
  PaymentProviderMode,
  ProviderUpdatePayload,
  SquareProviderConfig,
} from "./types";

interface SquareCardProps {
  data: SquareProviderConfig;
  isSaving?: boolean;
  onSave: (payload: ProviderUpdatePayload) => Promise<void> | void;
}

const modeOptions = [
  { value: "TERMINAL", label: "Square Terminal" },
  { value: "MANUAL", label: "Manual entry" },
  { value: "HYBRID", label: "Hybrid" },
];

const SquareCard: React.FC<SquareCardProps> = ({ data, isSaving = false, onSave }) => {
  const [enabled, setEnabled] = useState<boolean>(data.enabled);
  const [mode, setMode] = useState<PaymentProviderMode>(data.mode);
  const [appId, setAppId] = useState<string>(data.appId ?? "");
  const [locationId, setLocationId] = useState<string>(data.locationId ?? "");
  const [terminalId, setTerminalId] = useState<string>(data.terminalId ?? "");
  const [secretInput, setSecretInput] = useState<string>("");
  const [secretChanged, setSecretChanged] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnabled(data.enabled);
    setMode(data.mode);
    setAppId(data.appId ?? "");
    setLocationId(data.locationId ?? "");
    setTerminalId(data.terminalId ?? "");
    setSecretInput("");
    setSecretChanged(false);
  }, [data]);

  const isDirty = useMemo(() => {
    return (
      enabled !== data.enabled ||
      mode !== data.mode ||
      (data.appId ?? "") !== appId ||
      (data.locationId ?? "") !== locationId ||
      (data.terminalId ?? "") !== terminalId ||
      secretChanged
    );
  }, [enabled, mode, appId, locationId, terminalId, data, secretChanged]);

  const handleSecretChange = (value: string) => {
    setSecretInput(value);
    setSecretChanged(true);
  };

  const handleClearSecret = () => {
    setSecretInput("");
    setSecretChanged(true);
  };

  const handleSave = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: ProviderUpdatePayload = {
      enabled,
      mode,
      appId: appId.trim() || null,
      locationId: locationId.trim() || null,
      terminalId: terminalId.trim() || null,
    };

    if (secretChanged) {
      payload.secretKey = secretInput.trim();
    }

    try {
      await onSave(payload);
      setStatusMessage("Square settings saved");
      setSecretInput("");
      setSecretChanged(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save Square settings");
    }
  };

  return (
    <ComponentCard title="Square">
      <div className="space-y-6">
        <Switch
          label="Enable Square payments"
          checked={enabled}
          onChange={setEnabled}
        />

        <Select
          options={modeOptions}
          value={mode}
          onChange={(value) => setMode(value as PaymentProviderMode)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <InputField
            label="Application ID"
            placeholder="sq0idp-xxxx"
            value={appId}
            onChange={(event) => setAppId(event.target.value)}
          />
          <InputField
            label="Location ID"
            placeholder="L1234"
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <InputField
              label="Access Token"
              type="password"
              placeholder={data.hasSecret ? "••••••••••••" : "EAAAExxx"}
              value={secretInput}
              onChange={(event) => handleSecretChange(event.target.value)}
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {data.hasSecret
                ? "Leave blank to keep the stored token. Clear to remove."
                : "Paste your Square access token to save it securely."}
            </p>
            {data.hasSecret && (
              <button
                type="button"
                className="mt-2 text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400"
                onClick={handleClearSecret}
              >
                Clear stored token
              </button>
            )}
          </div>

          <InputField
            label="Terminal Device ID"
            placeholder="CCDI-12345"
            value={terminalId}
            onChange={(event) => setTerminalId(event.target.value)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {statusMessage && (
              <p className="text-sm text-success-600 dark:text-success-400">{statusMessage}</p>
            )}
            {errorMessage && (
              <p className="text-sm text-error-600 dark:text-error-400">{errorMessage}</p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving…" : "Save Square Settings"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default SquareCard;
