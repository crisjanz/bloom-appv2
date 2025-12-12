import { ChangeEvent, useRef, useState } from "react";
import { useApiClient } from "@shared/hooks/useApiClient";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Button from "@shared/ui/components/ui/button/Button";

interface ImportResult {
  success: boolean;
  totalCustomers: number;
  totalRecipients: number;
  createdCustomers: number;
  createdRecipients: number;
  skippedCustomers: number;
  skippedRecipients: number;
  errors: Array<{
    customerId: string;
    error: string;
  }>;
}

const ImportJsonCard = () => {
  const apiClient = useApiClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".json")) {
      setError("Only JSON files are supported.");
      setFile(null);
      setResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setError(null);
    setResult(null);
    setFile(selectedFile);
  };

  const resetFileInput = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError("Please select a JSON file.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await apiClient.post("/api/import-json/floranext-complete", formData);

      if (response.status >= 200 && response.status < 300) {
        const data = response.data as ImportResult;
        setResult(data);
        resetFileInput();
      } else {
        setError(response.data?.error || "Import failed. Please try again.");
      }
    } catch (err: any) {
      console.error("Failed to import FloraNext data:", err);
      setError(err?.message || "Import failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const hasErrors = Boolean(result && result.errors.length > 0);
  const disabled = loading || !file;

  return (
    <ComponentCard title="Import FloraNext Complete Export">
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
          <p className="font-semibold mb-2">📦 Complete Import</p>
          <p className="mb-2">
            Upload your FloraNext complete export JSON file (from the export script).
          </p>
          <p className="text-xs">
            This will import all customers and their recipients, creating proper relationships.
          </p>
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-black dark:text-white"
            htmlFor="json-import-file"
          >
            JSON Export File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            id="json-import-file"
            onChange={handleFileChange}
            className="w-full cursor-pointer rounded-lg border border-stroke bg-transparent text-black file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white hover:file:bg-opacity-90 dark:border-strokedark dark:text-white"
          />
          {file && (
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <Button
          onClick={handleImport}
          disabled={disabled}
          className="w-full justify-center"
        >
          {loading ? "Importing..." : "Import Complete Export"}
        </Button>

        {error && (
          <div className="rounded border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`rounded p-4 text-sm ${
              hasErrors
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
            }`}
          >
            <p className="font-semibold mb-2">
              {hasErrors ? "Import completed with errors" : "Import complete!"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs opacity-75">Total in file:</p>
                <p className="font-semibold">{result.totalCustomers} customers</p>
                <p className="font-semibold">{result.totalRecipients} recipients</p>
              </div>
              <div>
                <p className="text-xs opacity-75">Created:</p>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {result.createdCustomers} customers
                </p>
                <p className="font-semibold text-green-700 dark:text-green-400">
                  {result.createdRecipients} recipients
                </p>
              </div>
            </div>
            {(result.skippedCustomers > 0 || result.skippedRecipients > 0) && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <p className="text-xs">
                  Skipped: {result.skippedCustomers} customers, {result.skippedRecipients} recipients
                  (already imported)
                </p>
              </div>
            )}
          </div>
        )}

        {result?.errors && result.errors.length > 0 && (
          <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-900/20 dark:text-red-200">
            <p className="font-semibold mb-2">Errors ({result.errors.length}):</p>
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto text-xs">
              {result.errors.map((item, idx) => (
                <li key={idx}>
                  Customer {item.customerId}: {item.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ComponentCard>
  );
};

export default ImportJsonCard;
