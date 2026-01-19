import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Switch from "@shared/ui/forms/switch/Switch";
import Select from "@shared/ui/forms/Select";
import InputField from "@shared/ui/forms/input/InputField";
import LoadingButton from "@shared/ui/components/ui/button/LoadingButton";
import FormError from "@shared/ui/components/ui/form/FormError";
import { useApiClient } from "@shared/hooks/useApiClient";

type PrintDestination = "browser" | "receipt-agent" | "electron-agent";

type PrintSettings = {
  receiptsEnabled: boolean;
  receiptsDestination: PrintDestination;
  receiptsCopies: number;
  receiptsPrinterName: string | null;
  receiptsPrinterTray: number | null;
  ticketsEnabled: boolean;
  ticketsDestination: PrintDestination;
  ticketsPrinterName: string | null;
  ticketsPrinterTray: number | null;
  documentsEnabled: boolean;
  documentsDestination: PrintDestination;
  documentsPrinterName: string | null;
  documentsPrinterTray: number | null;
};

type PrintTypeCardProps = {
  title: string;
  description: string;
  enabled: boolean;
  onEnabledChange: (next: boolean) => void;
  destination: PrintDestination;
  onDestinationChange: (next: PrintDestination) => void;
  printerName: string | null;
  onPrinterNameChange: (next: string) => void;
  printerTray: number | null;
  onPrinterTrayChange: (next: number | null) => void;
  copies?: number;
  onCopiesChange?: (next: number) => void;
};

const PrintTypeCard = ({
  title,
  description,
  enabled,
  onEnabledChange,
  destination,
  onDestinationChange,
  printerName,
  onPrinterNameChange,
  printerTray,
  onPrinterTrayChange,
  copies,
  onCopiesChange,
}: PrintTypeCardProps) => {
  const showAgentFields = destination !== "browser";

  return (
    <ComponentCard
      title={title}
      desc={description}
      headerAction={
        <Switch
          checked={enabled}
          onChange={onEnabledChange}
          label={enabled ? "Enabled" : "Disabled"}
          ariaLabel={`Toggle ${title} printing`}
        />
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Select
          label="Destination"
          options={[
            { value: "browser", label: "Browser Print Dialog" },
            { value: "electron-agent", label: "Electron Agent" },
            { value: "receipt-agent", label: "Receipt Agent" },
          ]}
          value={destination}
          onChange={(value) => onDestinationChange(value as PrintDestination)}
          disabled={!enabled}
        />

        {typeof copies === "number" && onCopiesChange && (
          <InputField
            label="Copies"
            type="number"
            min={1}
            max={3}
            value={copies || ""}
            onChange={(event) => {
              const rawValue = event.target.value;
              const parsed = rawValue === "" ? 1 : Number(rawValue);
              if (!Number.isNaN(parsed)) {
                const clamped = Math.min(Math.max(Math.round(parsed), 1), 3);
                onCopiesChange(clamped);
              }
            }}
            disabled={!enabled}
          />
        )}

        {showAgentFields && (
          <InputField
            label="Printer Name"
            placeholder="Optional"
            value={printerName || ""}
            onChange={(event) => onPrinterNameChange(event.target.value)}
            disabled={!enabled}
          />
        )}

        {showAgentFields && (
          <InputField
            label="Paper Tray"
            type="number"
            min={1}
            max={3}
            placeholder="Default"
            value={printerTray ?? ""}
            onChange={(event) => {
              const rawValue = event.target.value;
              if (rawValue === "") {
                onPrinterTrayChange(null);
                return;
              }
              const parsed = Number(rawValue);
              if (!Number.isNaN(parsed)) {
                const clamped = Math.min(Math.max(Math.round(parsed), 1), 3);
                onPrinterTrayChange(clamped);
              }
            }}
            disabled={!enabled}
          />
        )}
      </div>
      {!showAgentFields && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Browser print will open on this device when the job is triggered.
        </p>
      )}
    </ComponentCard>
  );
};

const PrintPage = () => {
  const apiClient = useApiClient();
  const [settings, setSettings] = useState<PrintSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/api/print-settings");
      if (response.status >= 400) {
        throw new Error(response.data?.error || "Failed to load print settings");
      }
      setSettings(response.data as PrintSettings);
    } catch (err) {
      console.error("Error loading print settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load print settings");
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = useCallback(<K extends keyof PrintSettings>(key: K, value: PrintSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    const payload: PrintSettings = {
      ...settings,
      receiptsPrinterName: settings.receiptsPrinterName?.trim() || null,
      ticketsPrinterName: settings.ticketsPrinterName?.trim() || null,
      documentsPrinterName: settings.documentsPrinterName?.trim() || null,
    };

    try {
      const response = await apiClient.put("/api/print-settings", payload);
      if (response.status >= 400) {
        const errorMessage =
          Array.isArray(response.data?.error)
            ? response.data.error.map((item: any) => item.message).join(", ")
            : response.data?.error;
        throw new Error(errorMessage || "Failed to save print settings");
      }
      setSettings(response.data as PrintSettings);
      setSuccessMessage("Settings saved successfully!");
    } catch (err) {
      console.error("Error saving print settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save print settings");
    } finally {
      setIsSaving(false);
    }
  }, [apiClient, settings]);

  if (isLoading && !settings) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Print Settings" />
        <div className="text-sm text-gray-500">Loading print settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumb pageTitle="Print Settings" />

      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-white">Print Settings</h1>
        <p className="text-sm text-gray-500">
          Configure destinations, printers, and copy counts for each print type.
        </p>
      </div>

      {error && <FormError error={error} />}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200">
          {successMessage}
        </div>
      )}

      {settings && (
        <>
          <PrintTypeCard
            title="Receipts"
            description="Thermal/POS receipts for in-person sales."
            enabled={settings.receiptsEnabled}
            onEnabledChange={(next) => updateField("receiptsEnabled", next)}
            destination={settings.receiptsDestination}
            onDestinationChange={(next) => updateField("receiptsDestination", next)}
            printerName={settings.receiptsPrinterName}
            onPrinterNameChange={(next) => updateField("receiptsPrinterName", next)}
            printerTray={settings.receiptsPrinterTray}
            onPrinterTrayChange={(next) => updateField("receiptsPrinterTray", next)}
            copies={settings.receiptsCopies}
            onCopiesChange={(next) => updateField("receiptsCopies", next)}
          />

          <PrintTypeCard
            title="Order Tickets"
            description="Delivery tags for flower orders."
            enabled={settings.ticketsEnabled}
            onEnabledChange={(next) => updateField("ticketsEnabled", next)}
            destination={settings.ticketsDestination}
            onDestinationChange={(next) => updateField("ticketsDestination", next)}
            printerName={settings.ticketsPrinterName}
            onPrinterNameChange={(next) => updateField("ticketsPrinterName", next)}
            printerTray={settings.ticketsPrinterTray}
            onPrinterTrayChange={(next) => updateField("ticketsPrinterTray", next)}
          />

          <PrintTypeCard
            title="Documents"
            description="Invoices and reports for standard paper."
            enabled={settings.documentsEnabled}
            onEnabledChange={(next) => updateField("documentsEnabled", next)}
            destination={settings.documentsDestination}
            onDestinationChange={(next) => updateField("documentsDestination", next)}
            printerName={settings.documentsPrinterName}
            onPrinterNameChange={(next) => updateField("documentsPrinterName", next)}
            printerTray={settings.documentsPrinterTray}
            onPrinterTrayChange={(next) => updateField("documentsPrinterTray", next)}
          />
        </>
      )}

      <div className="flex justify-end">
        <LoadingButton
          onClick={handleSave}
          loading={isSaving}
          loadingText="Saving..."
          variant="primary"
          disabled={!settings}
        >
          Save Settings
        </LoadingButton>
      </div>

      <ComponentCard title="Preview Templates" desc="Test print templates using your most recent completed order.">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={async () => {
              try {
                const response = await apiClient.get("/api/print/preview/receipt");
                if (response.data?.pdfUrl) {
                  window.open(response.data.pdfUrl, "_blank");
                }
              } catch (err) {
                console.error("Error previewing receipt:", err);
                alert("Failed to generate receipt preview. Make sure you have at least one completed order.");
              }
            }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            Preview Receipt (PDF)
          </button>

          <button
            onClick={async () => {
              try {
                const response = await apiClient.get("/api/print/preview/thermal");
                if (response.data?.pdfUrl) {
                  window.open(response.data.pdfUrl, "_blank");
                }
              } catch (err) {
                console.error("Error previewing thermal:", err);
                alert("Failed to generate thermal preview. Make sure you have at least one completed order.");
              }
            }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            Preview Receipt (Thermal)
          </button>

          <button
            onClick={async () => {
              try {
                const response = await apiClient.get("/api/print/preview/invoice");
                if (response.data?.pdfUrl) {
                  window.open(response.data.pdfUrl, "_blank");
                }
              } catch (err) {
                console.error("Error previewing invoice:", err);
                alert("Failed to generate invoice preview. Make sure you have at least one completed order.");
              }
            }}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 transition"
          >
            Preview Invoice
          </button>
        </div>
      </ComponentCard>
    </div>
  );
};

export default PrintPage;
