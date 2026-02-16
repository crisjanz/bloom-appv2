import { ChangeEvent, useRef, useState } from "react";
import { useApiClient } from "@shared/hooks/useApiClient";
import ComponentCard from "@shared/ui/common/ComponentCard";
import Button from "@shared/ui/components/ui/button/Button";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  total: number;
  created: number;
  errors: number;
  customerId?: string;
  createdCustomer?: boolean;
  customerName?: string;
  errorDetails?: Array<{
    row: number;
    firstname?: string | null;
    lastname?: string | null;
    error: string;
  }>;
  error?: string;
}

const ImportCard = () => {
  const apiClient = useApiClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null;

    if (selectedFile && !selectedFile.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files are supported.");
      toast.error("Only CSV files are supported");
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
      setError("Please select a CSV file.");
      toast.error("Please select a CSV file");
      return;
    }

    const trimmedCustomerId = customerId.trim();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (trimmedCustomerId) {
        formData.append("customerId", trimmedCustomerId);
      }

      const response = await apiClient.post("/api/import/floranext-recipients", formData);

      if (response.status >= 200 && response.status < 300) {
        const data = response.data as ImportResult;
        setResult(data);
        resetFileInput();
        toast.success(`Imported ${data.created} recipients`);

        if (trimmedCustomerId) {
          setCustomerId(trimmedCustomerId);
        } else if (data.customerId) {
          setCustomerId(data.customerId);
        } else {
          setCustomerId("");
        }
      } else {
        const message = response.data?.error || "Import failed. Please try again.";
        setError(message);
        toast.error(message);
      }
    } catch (err: any) {
      console.error("Failed to import Floranext recipients:", err);
      const message = err?.message || "Import failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const hasPartialErrors = Boolean(result && result.errors > 0);
  const disabled = loading || !file;

  return (
    <ComponentCard title="Import Floranext Recipients">
      <div className="space-y-4">
        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-black dark:text-white"
            htmlFor="floranext-import-file"
          >
            CSV File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            id="floranext-import-file"
            onChange={handleFileChange}
            className="w-full cursor-pointer rounded-lg border border-stroke bg-transparent text-black file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2 file:text-white hover:file:bg-opacity-90 dark:border-strokedark dark:text-white"
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-medium text-black dark:text-white"
            htmlFor="floranext-import-customer-id"
          >
            Bloom Customer ID (optional)
          </label>
          <input
            type="text"
            value={customerId}
            onChange={(event) => setCustomerId(event.target.value)}
            placeholder="Leave blank to create a new customer"
            id="floranext-import-customer-id"
            className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-strokedark dark:text-white"
          />
        </div>

        <Button
          onClick={handleImport}
          disabled={disabled}
          className="w-full justify-center"
        >
          {loading ? "Importing..." : "Import Recipients"}
        </Button>

        {error && (
          <div className="rounded border border-red-300 bg-red-100 p-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-900/30 dark:text-red-300">
            {error}
          </div>
        )}

        {result && (
          <div
            className={`rounded p-4 text-sm ${
              hasPartialErrors
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                : "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
            }`}
          >
            <p className="font-semibold">
              {hasPartialErrors ? "Import completed with warnings" : "Import complete"}
            </p>
            <ul className="mt-2 space-y-1">
              <li>Total rows: {result.total}</li>
              <li>Recipients created: {result.created}</li>
              <li>Rows with issues: {result.errors}</li>
              {result.customerId && (
                <li>
                  Sender customer ID:{" "}
                  <span className="font-mono text-xs">{result.customerId}</span>
                  {result.createdCustomer && (
                    <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      new sender customer created
                    </span>
                  )}
                </li>
              )}
              {result.customerName && (
                <li>Sender name: {result.customerName}</li>
              )}
            </ul>
          </div>
        )}

        {result?.errorDetails && result.errorDetails.length > 0 && (
          <div className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-900/20 dark:text-amber-200">
            <p className="font-semibold">Rows with issues</p>
            <ul className="mt-2 space-y-1">
              {result.errorDetails.map((item) => (
                <li key={`${item.row}-${item.firstname ?? ""}-${item.lastname ?? ""}`}>
                  Row {item.row}: {item.error}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ComponentCard>
  );
};

export default ImportCard;
