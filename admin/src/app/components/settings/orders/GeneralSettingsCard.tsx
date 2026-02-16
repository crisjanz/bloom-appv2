import { useCallback, useEffect, useMemo, useState } from "react";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import InputField from "@shared/ui/forms/input/InputField";
import LoadingButton from "@shared/ui/components/ui/button/LoadingButton";
import FormError from "@shared/ui/components/ui/form/FormError";
import { useApiClient } from "@shared/hooks/useApiClient";
import { formatOrderNumber } from "@shared/utils/formatOrderNumber";
import { useOrderSettings } from "@app/contexts/OrderSettingsContext";
import { toast } from "sonner";

const DEFAULT_PREFIX = "B";
const PREFIX_PATTERN = /^[A-Za-z0-9]{0,5}$/;

const normalizePrefix = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }

  const trimmed = value.trim();
  if (!PREFIX_PATTERN.test(trimmed)) {
    return "";
  }

  return trimmed;
};

const sanitizePrefixInput = (value: string): string =>
  value.replace(/[^A-Za-z0-9]/g, "").slice(0, 5);

const GeneralSettingsCard = () => {
  const apiClient = useApiClient();
  const { setOrderNumberPrefix } = useOrderSettings();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefixEnabled, setPrefixEnabled] = useState(false);
  const [prefixValue, setPrefixValue] = useState(DEFAULT_PREFIX);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/api/settings/order-settings");
      if (response.status >= 400) {
        throw new Error("Failed to load order settings");
      }

      const prefix = normalizePrefix(response.data?.orderNumberPrefix);
      setPrefixEnabled(Boolean(prefix));
      setPrefixValue(prefix || DEFAULT_PREFIX);
    } catch (loadError) {
      console.error("Failed to load order settings:", loadError);
      setError("Failed to load order number prefix settings.");
      setPrefixEnabled(false);
      setPrefixValue(DEFAULT_PREFIX);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const previewPrefix = useMemo(() => {
    if (!prefixEnabled) {
      return "";
    }
    return normalizePrefix(prefixValue);
  }, [prefixEnabled, prefixValue]);

  const previewOrderNumber = formatOrderNumber(1001, previewPrefix);

  const handleToggle = (enabled: boolean) => {
    setPrefixEnabled(enabled);

    if (enabled && !normalizePrefix(prefixValue)) {
      setPrefixValue(DEFAULT_PREFIX);
    }
  };

  const handlePrefixChange = (value: string) => {
    setPrefixValue(sanitizePrefixInput(value));
  };

  const handleSave = async () => {
    const normalizedPrefix = normalizePrefix(prefixValue);
    const orderNumberPrefix = prefixEnabled ? normalizedPrefix : "";

    if (prefixEnabled && !orderNumberPrefix) {
      setError("Prefix must be alphanumeric and up to 5 characters.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await apiClient.put("/api/settings/order-settings", {
        orderNumberPrefix,
      });

      if (response.status >= 400) {
        throw new Error(response.data?.error || "Failed to save order settings");
      }

      setOrderNumberPrefix(orderNumberPrefix);
      toast.success("Order number prefix settings saved");
    } catch (saveError) {
      console.error("Failed to save order settings:", saveError);
      setError("Failed to save order number prefix settings.");
      toast.error("Failed to save order number prefix settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ComponentCard title="General Settings">
        <div className="py-6 text-sm text-gray-500 dark:text-gray-400">Loading order settings...</div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="General Settings" desc="Control how order numbers display across Bloom POS.">
      <div className="space-y-4">
        <Switch
          label="Add prefix to order numbers"
          checked={prefixEnabled}
          onChange={handleToggle}
        />

        {prefixEnabled && (
          <InputField
            label="Order Number Prefix"
            type="text"
            value={prefixValue || ""}
            onChange={(event) => handlePrefixChange(event.target.value)}
            placeholder={DEFAULT_PREFIX}
            maxLength={5}
            hint="Alphanumeric only, max 5 characters."
          />
        )}

        <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-300">
          Orders will display as: <span className="font-semibold">#{previewOrderNumber}</span>
        </div>

        <FormError error={error} />

        <div className="flex justify-end">
          <LoadingButton
            onClick={handleSave}
            loading={saving}
            loadingText="Saving..."
            variant="primary"
          >
            Save Settings
          </LoadingButton>
        </div>
      </div>
    </ComponentCard>
  );
};

export default GeneralSettingsCard;
