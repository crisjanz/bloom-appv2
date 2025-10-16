import { useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Select from "@shared/ui/forms/Select";
import Switch from "@shared/ui/forms/switch/Switch";
import Button from "@shared/ui/components/ui/button/Button";
import {
  GeneralSettingsPayload,
  PaymentProviderKey,
  PaymentSettingsResponse,
} from "./types";

interface GeneralPaymentsCardProps {
  settings: PaymentSettingsResponse;
  isSaving?: boolean;
  onSave: (payload: GeneralSettingsPayload) => Promise<void> | void;
}

const providerLabelMap: Record<PaymentProviderKey, string> = {
  STRIPE: "Stripe",
  SQUARE: "Square",
  PAYPAL: "PayPal",
};

const GeneralPaymentsCard: React.FC<GeneralPaymentsCardProps> = ({ settings, isSaving = false, onSave }) => {
  const [defaultProvider, setDefaultProvider] = useState<string>(settings.defaultCardProvider ?? "NONE");
  const [allowSplitPayments, setAllowSplitPayments] = useState<boolean>(settings.allowSplitPayments);
  const [allowOfflineNotes, setAllowOfflineNotes] = useState<boolean>(settings.allowOfflineNotes);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDefaultProvider(settings.defaultCardProvider ?? "NONE");
    setAllowSplitPayments(settings.allowSplitPayments);
    setAllowOfflineNotes(settings.allowOfflineNotes);
  }, [settings]);

  const providerOptions = useMemo(() => {
    const options = [
      { value: "NONE", label: "No default (choose at checkout)" },
    ];

    (["STRIPE", "SQUARE", "PAYPAL"] as PaymentProviderKey[]).forEach((provider) => {
      const config = settings.providers[provider.toLowerCase() as keyof typeof settings.providers];
      const enabled = config?.enabled ?? false;
      options.push({
        value: provider,
        label: `${providerLabelMap[provider]}${enabled ? "" : " (disabled)"}`,
      });
    });

    return options;
  }, [settings.providers]);

  const isDirty = useMemo(() => {
    return (
      (settings.defaultCardProvider ?? "NONE") !== defaultProvider ||
      settings.allowSplitPayments !== allowSplitPayments ||
      settings.allowOfflineNotes !== allowOfflineNotes
    );
  }, [settings, defaultProvider, allowSplitPayments, allowOfflineNotes]);

  const handleSave = async () => {
    setStatusMessage(null);
    setErrorMessage(null);

    const payload: GeneralSettingsPayload = {
      defaultCardProvider: defaultProvider === "NONE" ? null : (defaultProvider as PaymentProviderKey),
      allowSplitPayments,
      allowOfflineNotes,
    };

    try {
      await onSave(payload);
      setStatusMessage("General payment settings saved");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update general payment settings"
      );
    }
  };

  return (
    <ComponentCard title="General Payment Behaviour">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            options={providerOptions}
            value={defaultProvider}
            onChange={setDefaultProvider}
          />
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Choose the default processor for POS/phone card payments.
          </div>
        </div>

        <div className="space-y-4">
          <Switch
            label="Allow split payments (multiple tenders per order)"
            checked={allowSplitPayments}
            onChange={setAllowSplitPayments}
          />
          <Switch
            label="Allow offline payment notes (reference numbers, bank confirmations)"
            checked={allowOfflineNotes}
            onChange={setAllowOfflineNotes}
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
            {isSaving ? "Saving…" : "Save General Settings"}
          </Button>
        </div>
      </div>
    </ComponentCard>
  );
};

export default GeneralPaymentsCard;
