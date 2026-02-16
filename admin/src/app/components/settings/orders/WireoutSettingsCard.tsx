import { useState, useEffect } from 'react';
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import LoadingButton from "@shared/ui/components/ui/button/LoadingButton";
import { centsToDollars, dollarsToCents } from "@shared/utils/currency";
import { toast } from "sonner";

const WireoutSettingsCard = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wireoutServiceFee, setWireoutServiceFee] = useState('15.00');
  const [wireoutServiceName, setWireoutServiceName] = useState('FTD');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/settings/operations');
      if (response.ok) {
        const data = await response.json();
        setWireoutServiceFee(centsToDollars(data.wireoutServiceFee || 1500).toFixed(2));
        setWireoutServiceName(data.wireoutServiceName || 'FTD');
      } else if (response.status === 404) {
        // No settings yet, use defaults
        setWireoutServiceFee('15.00');
        setWireoutServiceName('FTD');
      } else {
        throw new Error('Failed to load settings');
      }
    } catch (err) {
      console.error('Error loading wireout settings:', err);
      setError('Failed to load wireout settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const feeInCents = dollarsToCents(parseFloat(wireoutServiceFee));

      const response = await fetch('/api/settings/operations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wireoutServiceFee: feeInCents,
          wireoutServiceName: wireoutServiceName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success("Wire-out settings saved");
    } catch (err) {
      console.error('Error saving wireout settings:', err);
      setError('Failed to save wireout settings');
      toast.error("Failed to save wire-out settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ComponentCard title="Wireout Settings">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Wire-Out Settings (Outgoing Orders)">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure default settings for outgoing wire orders sent through relay services.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InputField
            label="Wire Service Name"
            type="text"
            value={wireoutServiceName}
            onChange={(e) => setWireoutServiceName(e.target.value)}
            placeholder="FTD"
          />

          <InputField
            label="Default Wire Service Fee"
            type="text"
            value={wireoutServiceFee}
            onChange={(e) => {
              const value = e.target.value;
              if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
                setWireoutServiceFee(value);
              }
            }}
            onBlur={() => {
              const parsed = parseFloat(wireoutServiceFee);
              if (!isNaN(parsed)) {
                setWireoutServiceFee(parsed.toFixed(2));
              }
            }}
            placeholder="15.00"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:border-red-800">
            <span className="text-red-800 dark:text-red-200 text-sm font-medium">{error}</span>
          </div>
        )}

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

export default WireoutSettingsCard;
