import { useCallback, useEffect, useState } from "react";
import PageBreadcrumb from "@shared/ui/common/PageBreadCrumb";
import ComponentCard from "@shared/ui/common/ComponentCard";
import InputField from "@shared/ui/forms/input/InputField";
import PhoneInput from "@shared/ui/forms/PhoneInput";
import Select from "@shared/ui/forms/Select";
import Switch from "@shared/ui/forms/switch/Switch";
import LoadingButton from "@shared/ui/components/ui/button/LoadingButton";
import FormError from "@shared/ui/components/ui/form/FormError";
import { useApiClient } from "@shared/hooks/useApiClient";
import { toast } from "sonner";

type EmailProvider = "sendgrid" | "smtp" | "disabled";

type EmailSettings = {
  id: string;
  provider: EmailProvider;
  enabled: boolean;
  apiKey: string | null;
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUser: string | null;
  smtpPassword: string | null;
  fromEmail: string;
  fromName: string;
  encryptionConfigured: boolean;
  smsEnabled: boolean;
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
};

const EmailSettingsPage = () => {
  const apiClient = useApiClient();
  const [settings, setSettings] = useState<EmailSettings | null>(null);
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [smtpPasswordValue, setSmtpPasswordValue] = useState("");
  const [smtpPasswordDirty, setSmtpPasswordDirty] = useState(false);
  const [twilioAccountSidValue, setTwilioAccountSidValue] = useState("");
  const [twilioAccountSidDirty, setTwilioAccountSidDirty] = useState(false);
  const [twilioAuthTokenValue, setTwilioAuthTokenValue] = useState("");
  const [twilioAuthTokenDirty, setTwilioAuthTokenDirty] = useState(false);
  const [twilioPhoneNumberValue, setTwilioPhoneNumberValue] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get("/api/email-settings");
      if (response.status >= 400) {
        throw new Error(response.data?.error || "Failed to load email settings");
      }
      const data = response.data as EmailSettings;
      setSettings(data);
      setApiKeyValue(data.apiKey || "");
      setApiKeyDirty(false);
      setSmtpPasswordValue(data.smtpPassword || "");
      setSmtpPasswordDirty(false);
      setTwilioAccountSidValue(data.twilioAccountSid || "");
      setTwilioAccountSidDirty(false);
      setTwilioAuthTokenValue(data.twilioAuthToken || "");
      setTwilioAuthTokenDirty(false);
      setTwilioPhoneNumberValue(data.twilioPhoneNumber || "");
    } catch (err) {
      console.error("Error loading email settings:", err);
      setError(err instanceof Error ? err.message : "Failed to load email settings");
    } finally {
      setIsLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateField = useCallback(<K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }, []);

  const handleSave = useCallback(async () => {
    if (!settings) return;

    setIsSaving(true);
    setError(null);

    const payload: Record<string, any> = {
      provider: settings.provider,
      enabled: settings.provider === "disabled" ? false : settings.enabled,
      fromEmail: settings.fromEmail,
      fromName: settings.fromName,
      smtpHost: settings.smtpHost,
      smtpPort: settings.smtpPort,
      smtpUser: settings.smtpUser,
      smsEnabled: settings.smsEnabled,
      twilioPhoneNumber: twilioPhoneNumberValue || null,
    };

    if (apiKeyDirty) {
      payload.apiKey = apiKeyValue;
    }

    if (smtpPasswordDirty) {
      payload.smtpPassword = smtpPasswordValue;
    }

    if (twilioAccountSidDirty) {
      payload.twilioAccountSid = twilioAccountSidValue;
    }

    if (twilioAuthTokenDirty) {
      payload.twilioAuthToken = twilioAuthTokenValue;
    }

    try {
      const response = await apiClient.put("/api/email-settings", payload);
      if (response.status >= 400) {
        const errorMessage =
          Array.isArray(response.data?.error)
            ? response.data.error.map((item: any) => item.message).join(", ")
            : response.data?.error;
        throw new Error(errorMessage || "Failed to save email settings");
      }
      const data = response.data as EmailSettings;
      setSettings(data);
      setApiKeyValue(data.apiKey || "");
      setApiKeyDirty(false);
      setSmtpPasswordValue(data.smtpPassword || "");
      setSmtpPasswordDirty(false);
      setTwilioAccountSidValue(data.twilioAccountSid || "");
      setTwilioAccountSidDirty(false);
      setTwilioAuthTokenValue(data.twilioAuthToken || "");
      setTwilioAuthTokenDirty(false);
      setTwilioPhoneNumberValue(data.twilioPhoneNumber || "");
      toast.success("Email & SMS settings saved");
    } catch (err) {
      console.error("Error saving email settings:", err);
      setError(err instanceof Error ? err.message : "Failed to save email settings");
      toast.error("Failed to save email settings");
    } finally {
      setIsSaving(false);
    }
  }, [
    apiClient,
    apiKeyDirty,
    apiKeyValue,
    settings,
    smtpPasswordDirty,
    smtpPasswordValue,
    twilioAccountSidDirty,
    twilioAccountSidValue,
    twilioAuthTokenDirty,
    twilioAuthTokenValue,
    twilioPhoneNumberValue,
  ]);

  const handleSendTest = useCallback(async () => {
    if (!testEmail.trim()) {
      setError("Enter a test email address.");
      toast.error("Enter a test email address");
      return;
    }

    setIsTesting(true);
    setError(null);

    try {
      const response = await apiClient.post("/api/email-settings/test", { email: testEmail.trim() });
      if (response.status >= 400) {
        const errorMessage =
          Array.isArray(response.data?.error)
            ? response.data.error.map((item: any) => item.message).join(", ")
            : response.data?.error;
        throw new Error(errorMessage || "Failed to send test email");
      }
      toast.success("Test email sent");
    } catch (err) {
      console.error("Error sending test email:", err);
      setError(err instanceof Error ? err.message : "Failed to send test email");
      toast.error("Failed to send test email");
    } finally {
      setIsTesting(false);
    }
  }, [apiClient, testEmail]);

  if (isLoading && !settings) {
    return (
      <div className="p-6">
        <PageBreadcrumb pageTitle="Email & SMS Settings" />
        <div className="text-sm text-gray-500">Loading email & SMS settings...</div>
      </div>
    );
  }

  const providerOptions = [
    { value: "sendgrid", label: "SendGrid" },
    { value: "smtp", label: "SMTP" },
    { value: "disabled", label: "Disabled" },
  ];

  const isDisabled = settings?.provider === "disabled";

  return (
    <div className="p-6 space-y-6">
      <PageBreadcrumb pageTitle="Email & SMS Settings" />

      <div>
        <h1 className="text-2xl font-semibold text-black dark:text-white">Email & SMS Settings</h1>
        <p className="text-sm text-gray-500">Configure email provider, sender details, and SMS delivery.</p>
      </div>

      {error && <FormError error={error} />}

      {settings && !settings.encryptionConfigured && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          CONFIG_ENCRYPTION_KEY is missing. API keys cannot be saved until it is configured.
        </div>
      )}

      {settings && (
        <>
          <ComponentCard title="Provider Settings">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="Provider"
                options={providerOptions}
                value={settings.provider}
                onChange={(value) => {
                  const provider = value as EmailProvider;
                  updateField("provider", provider);
                  if (provider === "disabled") {
                    updateField("enabled", false);
                  }
                }}
              />
              <div className="flex items-end">
                <Switch
                  checked={settings.enabled}
                  onChange={(next) => updateField("enabled", next)}
                  label={settings.enabled ? "Enabled" : "Disabled"}
                  ariaLabel="Toggle email sending"
                  disabled={isDisabled}
                />
              </div>
            </div>
          </ComponentCard>

          {settings.provider === "sendgrid" && (
            <ComponentCard title="SendGrid Settings">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="API Key"
                  type="password"
                  value={apiKeyDirty ? apiKeyValue : apiKeyValue || ""}
                  onChange={(event) => {
                    setApiKeyDirty(true);
                    setApiKeyValue(event.target.value);
                  }}
                  placeholder="Enter SendGrid API key"
                  disabled={isDisabled}
                />
                <InputField
                  label="From Email"
                  value={settings.fromEmail || ""}
                  onChange={(event) => updateField("fromEmail", event.target.value)}
                  placeholder="orders@hellobloom.ca"
                  disabled={isDisabled}
                />
                <InputField
                  label="From Name"
                  value={settings.fromName || ""}
                  onChange={(event) => updateField("fromName", event.target.value)}
                  placeholder="Bloom Flowers"
                  disabled={isDisabled}
                />
              </div>
            </ComponentCard>
          )}

          {settings.provider === "smtp" && (
            <ComponentCard title="SMTP Settings">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InputField
                  label="SMTP Host"
                  value={settings.smtpHost || ""}
                  onChange={(event) => updateField("smtpHost", event.target.value)}
                  placeholder="smtp.gmail.com"
                  disabled={isDisabled}
                />
                <InputField
                  label="SMTP Port"
                  type="number"
                  value={settings.smtpPort ?? ""}
                  onChange={(event) => {
                    const rawValue = event.target.value;
                    updateField("smtpPort", rawValue === "" ? null : Number(rawValue));
                  }}
                  placeholder="587"
                  disabled={isDisabled}
                />
                <InputField
                  label="SMTP Username"
                  value={settings.smtpUser || ""}
                  onChange={(event) => updateField("smtpUser", event.target.value)}
                  placeholder="user@domain.com"
                  disabled={isDisabled}
                />
                <InputField
                  label="SMTP Password"
                  type="password"
                  value={smtpPasswordDirty ? smtpPasswordValue : smtpPasswordValue || ""}
                  onChange={(event) => {
                    setSmtpPasswordDirty(true);
                    setSmtpPasswordValue(event.target.value);
                  }}
                  placeholder="Enter SMTP password"
                  disabled={isDisabled}
                />
                <InputField
                  label="From Email"
                  value={settings.fromEmail || ""}
                  onChange={(event) => updateField("fromEmail", event.target.value)}
                  placeholder="orders@hellobloom.ca"
                  disabled={isDisabled}
                />
                <InputField
                  label="From Name"
                  value={settings.fromName || ""}
                  onChange={(event) => updateField("fromName", event.target.value)}
                  placeholder="Bloom Flowers"
                  disabled={isDisabled}
                />
              </div>
            </ComponentCard>
          )}

          <ComponentCard title="SMS Settings (Twilio)">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={settings.smsEnabled}
                  onChange={(checked) => updateField("smsEnabled", checked)}
                  ariaLabel="Toggle SMS sending"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-white">
                    Enable SMS
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Send SMS notifications via Twilio
                  </p>
                </div>
              </div>

              {settings.smsEnabled && (
                <>
                  <InputField
                    label="Twilio Account SID"
                    value={twilioAccountSidValue || ""}
                    onChange={(event) => {
                      setTwilioAccountSidValue(event.target.value);
                      setTwilioAccountSidDirty(true);
                    }}
                    placeholder="AC..."
                  />
                  <InputField
                    label="Twilio Auth Token"
                    type="password"
                    value={twilioAuthTokenValue || ""}
                    onChange={(event) => {
                      setTwilioAuthTokenValue(event.target.value);
                      setTwilioAuthTokenDirty(true);
                    }}
                    placeholder={settings.twilioAuthToken ? "********" : "Enter auth token"}
                  />
                  <PhoneInput
                    label="Twilio Phone Number"
                    value={twilioPhoneNumberValue || ""}
                    onChange={(value) => setTwilioPhoneNumberValue(value)}
                    placeholder="+1234567890"
                  />
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
                    <p className="text-sm text-blue-700 dark:text-blue-200">
                      <strong>Twilio Setup:</strong> Get your credentials at{" "}
                      <a
                        href="https://console.twilio.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        console.twilio.com
                      </a>
                    </p>
                  </div>
                </>
              )}
            </div>
          </ComponentCard>

          <ComponentCard title="Send Test Email">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InputField
                label="Test Email Address"
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                placeholder="name@domain.com"
              />
              <div className="flex items-end">
                <LoadingButton
                  onClick={handleSendTest}
                  loading={isTesting}
                  loadingText="Sending..."
                  variant="secondary"
                  disabled={isDisabled}
                >
                  Send Test Email
                </LoadingButton>
              </div>
            </div>
          </ComponentCard>

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
        </>
      )}
    </div>
  );
};

export default EmailSettingsPage;
