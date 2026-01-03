import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";

type ExternalProvider = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  sortOrder: number;
};

const ExternalProvidersPage = () => {
  const [providers, setProviders] = useState<ExternalProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/external-providers");
      if (!response.ok) {
        throw new Error("Failed to load external providers");
      }

      const data: ExternalProvider[] = await response.json();
      setProviders(data);
    } catch (err) {
      console.error("Error loading external providers:", err);
      setError(err instanceof Error ? err.message : "Failed to load external providers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Name and code are required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/external-providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase()
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create provider");
      }

      setName("");
      setCode("");
      await loadProviders();
    } catch (err) {
      console.error("Error creating external provider:", err);
      setError(err instanceof Error ? err.message : "Failed to create provider");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (provider: ExternalProvider) => {
    setError(null);
    try {
      const response = await fetch(`/api/external-providers/${provider.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isActive: !provider.isActive
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update provider");
      }

      await loadProviders();
    } catch (err) {
      console.error("Error updating external provider:", err);
      setError(err instanceof Error ? err.message : "Failed to update provider");
    }
  };

  const handleDelete = async (provider: ExternalProvider) => {
    const confirmed = window.confirm(`Delete external provider "${provider.name}"?`);
    if (!confirmed) return;

    setError(null);
    try {
      const response = await fetch(`/api/external-providers/${provider.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete provider");
      }

      await loadProviders();
    } catch (err) {
      console.error("Error deleting external provider:", err);
      setError(err instanceof Error ? err.message : "Failed to delete provider");
    }
  };

  return (
    <div className="p-6">
      <PageBreadcrumb />

      <ComponentCard title="External Providers">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-3 mb-6">
          <InputField
            label="Provider Name"
            placeholder="FTD"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <InputField
            label="Provider Code"
            placeholder="FTD"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Add Provider"}
            </button>
          </div>
        </form>

        {isLoading ? (
          <div className="text-sm text-gray-500">Loading providers...</div>
        ) : providers.length === 0 ? (
          <div className="text-sm text-gray-500">No external providers yet.</div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-boxdark"
              >
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {provider.name}
                  </div>
                  <div className="text-xs text-gray-500">{provider.code}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(provider)}
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      provider.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {provider.isActive ? "Active" : "Inactive"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(provider)}
                    className="rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ComponentCard>
    </div>
  );
};

export default ExternalProvidersPage;
