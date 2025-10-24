import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import StripeCard from "@app/components/settings/payments/StripeCard";
import SquareCard from "@app/components/settings/payments/SquareCard";
import PaypalCard from "@app/components/settings/payments/PaypalCard";
import OtherMethodsCard from "@app/components/settings/payments/OtherMethodsCard";
import GeneralPaymentsCard from "@app/components/settings/payments/HouseAccountsCard";
import BuiltInMethodsCard from "@app/components/settings/payments/BuiltInMethodsCard";
import ComponentCard from "@shared/ui/common/ComponentCard";
import {
  GeneralSettingsPayload,
  OfflineMethodInput,
  OfflinePaymentMethod,
  PaymentProviderKey,
  PaymentSettingsResponse,
  PaymentsPagePayload,
  ProviderUpdatePayload,
  BuiltInMethodsPayload,
} from "@app/components/settings/payments/types";

type ProviderSavingState = PaymentProviderKey | null;

const PaymentsPage = () => {
  const [settings, setSettings] = useState<PaymentSettingsResponse | null>(null);
  const [offlineMethods, setOfflineMethods] = useState<OfflinePaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [providerSaving, setProviderSaving] = useState<ProviderSavingState>(null);
  const [generalSaving, setGeneralSaving] = useState<boolean>(false);
  const [offlineSaving, setOfflineSaving] = useState<boolean>(false);
  const [builtinSaving, setBuiltinSaving] = useState<boolean>(false);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/payments");
      if (!response.ok) {
        throw new Error("Failed to load payment settings");
      }

      const data: PaymentsPagePayload = await response.json();
      const { offlineMethods: offlineList, ...settingValues } = data;
      setSettings(settingValues);
      setOfflineMethods(offlineList ?? []);
    } catch (err) {
      console.error("Error loading payment settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load payment settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleProviderSave = async (provider: PaymentProviderKey, payload: ProviderUpdatePayload) => {
    if (!settings) return;

    setProviderSaving(provider);
    setError(null);

    try {
      const response = await fetch(`/api/settings/payments/providers/${provider.toLowerCase()}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Failed to update ${provider} settings`);
      }

      const updated: PaymentSettingsResponse = await response.json();
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
            }
          : updated
      );
      window.dispatchEvent(new Event('payment-settings:updated'));
    } catch (err) {
      console.error(`Error updating ${provider} settings:`, err);
      setError(err instanceof Error ? err.message : `Failed to update ${provider} settings`);
      throw err;
    } finally {
      setProviderSaving(null);
    }
  };

  const handleGeneralSave = async (payload: GeneralSettingsPayload) => {
    if (!settings) return;

    setGeneralSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/payments/general", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update general payment settings");
      }

      const updated: PaymentSettingsResponse = await response.json();
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
            }
          : updated
      );
      window.dispatchEvent(new Event('payment-settings:updated'));
    } catch (err) {
      console.error("Error updating general settings:", err);
      setError(err instanceof Error ? err.message : "Failed to update general payment settings");
      throw err;
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleOfflineCreate = async (input: OfflineMethodInput) => {
    setOfflineSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/payments/offline-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create offline payment method");
      }

      const created: OfflinePaymentMethod = await response.json();
      setOfflineMethods((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      window.dispatchEvent(new Event('payment-settings:updated'));
      return created;
    } catch (err) {
      console.error("Error creating offline payment method:", err);
      setError(err instanceof Error ? err.message : "Failed to create offline payment method");
      throw err;
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleOfflineUpdate = async (id: string, input: OfflineMethodInput) => {
    setOfflineSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings/payments/offline-methods/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update offline payment method");
      }

      const updated: OfflinePaymentMethod = await response.json();
      setOfflineMethods((prev) =>
        prev
          .map((method) => (method.id === updated.id ? updated : method))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
      window.dispatchEvent(new Event('payment-settings:updated'));
      return updated;
    } catch (err) {
      console.error("Error updating offline payment method:", err);
      setError(err instanceof Error ? err.message : "Failed to update offline payment method");
      throw err;
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleOfflineDelete = async (id: string) => {
    setOfflineSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/settings/payments/offline-methods/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to delete offline payment method");
      }

      setOfflineMethods((prev) => prev.filter((method) => method.id !== id));
      window.dispatchEvent(new Event('payment-settings:updated'));
    } catch (err) {
      console.error("Error deleting offline payment method:", err);
      setError(err instanceof Error ? err.message : "Failed to delete offline payment method");
      throw err;
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleOfflineReorder = async (order: string[]) => {
    setOfflineSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/payments/offline-methods/reorder", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reorder offline payment methods");
      }

      const reordered: OfflinePaymentMethod[] = await response.json();
      setOfflineMethods(reordered.sort((a, b) => a.sortOrder - b.sortOrder));
      window.dispatchEvent(new Event('payment-settings:updated'));
    } catch (err) {
      console.error("Error reordering offline payment methods:", err);
      setError(err instanceof Error ? err.message : "Failed to reorder offline payment methods");
      throw err;
    } finally {
      setOfflineSaving(false);
    }
  };

  const handleBuiltInSave = async (payload: BuiltInMethodsPayload) => {
    if (!settings) return;

    setBuiltinSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/payments/built-in", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to update built-in payment methods");
      }

      const updated: PaymentSettingsResponse = await response.json();
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
            }
          : updated
      );
      window.dispatchEvent(new Event('payment-settings:updated'));
    } catch (err) {
      console.error("Error updating built-in payment methods:", err);
      setError(err instanceof Error ? err.message : "Failed to update built-in payment methods");
      throw err;
    } finally {
      setBuiltinSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Payments Settings" />
      <h2 className="text-2xl font-semibold text-black dark:text-white">Payments Settings</h2>

      {error && (
        <ComponentCard title="Payment Settings Status">
          <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
        </ComponentCard>
      )}

      {isLoading && (
        <ComponentCard title="Loading">
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading payment settings…</p>
        </ComponentCard>
      )}

      {!isLoading && settings && (
        <>
          {!settings.encryptionConfigured && (
            <ComponentCard title="Credential Storage Warning" className="border-yellow-300 bg-yellow-50/70 dark:border-yellow-500/60 dark:bg-yellow-500/10">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Set <code className="font-mono text-xs">CONFIG_ENCRYPTION_KEY</code> in the backend environment before saving live API keys.
              </p>
            </ComponentCard>
          )}

          <GeneralPaymentsCard
            settings={settings}
            isSaving={generalSaving}
            onSave={handleGeneralSave}
          />
          <StripeCard
            data={settings.providers.stripe}
            isSaving={providerSaving === "STRIPE"}
            onSave={(payload) => handleProviderSave("STRIPE", payload)}
          />
          <SquareCard
            data={settings.providers.square}
            isSaving={providerSaving === "SQUARE"}
            onSave={(payload) => handleProviderSave("SQUARE", payload)}
          />
          <PaypalCard
            data={settings.providers.paypal}
            isSaving={providerSaving === "PAYPAL"}
            onSave={(payload) => handleProviderSave("PAYPAL", payload)}
          />
          <BuiltInMethodsCard
            methods={settings.builtInMethods}
            isSaving={builtinSaving}
            onSave={handleBuiltInSave}
          />
          <OtherMethodsCard
            methods={offlineMethods}
            isSaving={offlineSaving}
            onCreate={handleOfflineCreate}
            onUpdate={handleOfflineUpdate}
            onDelete={handleOfflineDelete}
            onReorder={handleOfflineReorder}
          />
        </>
      )}
    </div>
  );
};

export default PaymentsPage;
