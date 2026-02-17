import { useCallback, useEffect, useMemo, useState } from 'react';
import ComponentCard from '@shared/ui/common/ComponentCard';
import InputField from '@shared/ui/forms/input/InputField';
import Switch from '@shared/ui/forms/switch/Switch';
import Select from '@shared/ui/forms/Select';
import Button from '@shared/ui/components/ui/button/Button';
import { toast } from 'sonner';
import { useApiClient } from '@shared/hooks/useApiClient';

type ReminderTypeKey = 'birthday' | 'anniversary' | 'occasion';

interface ReminderSettings {
  id: string;
  birthdayEnabled: boolean;
  anniversaryEnabled: boolean;
  occasionEnabled: boolean;
  reminderDaysBefore: number[];
  birthdaySubject: string;
  anniversarySubject: string;
  occasionSubject: string;
}

interface UpcomingReminder {
  date: string;
  type: 'BIRTHDAY' | 'ANNIVERSARY' | 'OCCASION';
  customerId: string;
  customerName: string;
  email: string;
  recipientName?: string;
  occasion?: string;
  daysUntil: number;
}

const defaultSettings: ReminderSettings = {
  id: '',
  birthdayEnabled: false,
  anniversaryEnabled: false,
  occasionEnabled: false,
  reminderDaysBefore: [7, 1],
  birthdaySubject: 'A Special Day is Coming Up!',
  anniversarySubject: 'Your Anniversary is Coming Up!',
  occasionSubject: "Don't Forget - A Special Occasion is Coming!",
};

const testTypeOptions = [
  { value: 'birthday', label: 'Birthday Test' },
  { value: 'anniversary', label: 'Anniversary Test' },
  { value: 'occasion', label: 'Occasion Test' },
];

const typeLabelMap: Record<UpcomingReminder['type'], string> = {
  BIRTHDAY: 'Birthday',
  ANNIVERSARY: 'Anniversary',
  OCCASION: 'Occasion',
};

export default function ReminderSettingsCard() {
  const apiClient = useApiClient();

  const [settings, setSettings] = useState<ReminderSettings>(defaultSettings);
  const [daysBeforeInput, setDaysBeforeInput] = useState('7, 1');
  const [upcoming, setUpcoming] = useState<UpcomingReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [testEmail, setTestEmail] = useState('');
  const [testType, setTestType] = useState<ReminderTypeKey>('birthday');

  const hasEnabledType = useMemo(
    () => settings.birthdayEnabled || settings.anniversaryEnabled || settings.occasionEnabled,
    [settings],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [settingsRes, upcomingRes] = await Promise.all([
        apiClient.get('/api/reminders/settings'),
        apiClient.get('/api/reminders/upcoming?days=30'),
      ]);

      if (settingsRes.status >= 400) {
        throw new Error('Failed to load reminder settings');
      }

      const loadedSettings = settingsRes.data || defaultSettings;
      const loadedDays = Array.isArray(loadedSettings.reminderDaysBefore)
        ? loadedSettings.reminderDaysBefore
        : defaultSettings.reminderDaysBefore;

      setSettings({
        ...defaultSettings,
        ...loadedSettings,
        reminderDaysBefore: loadedDays,
      });
      setDaysBeforeInput(loadedDays.join(', '));

      if (upcomingRes.status < 400) {
        setUpcoming(Array.isArray(upcomingRes.data?.items) ? upcomingRes.data.items : []);
      }
    } catch (error) {
      console.error('Failed to load reminder settings:', error);
      toast.error('Failed to load reminder settings');
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const parseDays = (input: string) => {
    const parsed = input
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 365);

    const unique = Array.from(new Set(parsed)).sort((a, b) => b - a);
    return unique.length ? unique : [7, 1];
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const reminderDaysBefore = parseDays(daysBeforeInput);

      const payload = {
        birthdayEnabled: settings.birthdayEnabled,
        anniversaryEnabled: settings.anniversaryEnabled,
        occasionEnabled: settings.occasionEnabled,
        reminderDaysBefore,
        birthdaySubject: settings.birthdaySubject,
        anniversarySubject: settings.anniversarySubject,
        occasionSubject: settings.occasionSubject,
      };

      const response = await apiClient.patch('/api/reminders/settings', payload);
      if (response.status >= 400) {
        throw new Error('Failed to save reminder settings');
      }

      const updatedDays = Array.isArray(response.data?.reminderDaysBefore)
        ? response.data.reminderDaysBefore
        : reminderDaysBefore;

      setSettings((prev) => ({
        ...prev,
        ...response.data,
        reminderDaysBefore: updatedDays,
      }));
      setDaysBeforeInput(updatedDays.join(', '));

      toast.success('Reminder settings saved');
      const upcomingRes = await apiClient.get('/api/reminders/upcoming?days=30');
      if (upcomingRes.status < 400) {
        setUpcoming(Array.isArray(upcomingRes.data?.items) ? upcomingRes.data.items : []);
      }
    } catch (error) {
      console.error('Failed to save reminder settings:', error);
      toast.error('Failed to save reminder settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail.trim()) {
      toast.error('Enter an email address for test send');
      return;
    }

    try {
      setSendingTest(true);
      const response = await apiClient.post('/api/reminders/send-test', {
        email: testEmail.trim(),
        type: testType,
      });

      if (response.status >= 400 || response.data?.error) {
        throw new Error(response.data?.error || 'Failed to send test reminder');
      }

      toast.success('Test reminder email sent');
    } catch (error) {
      console.error('Failed to send test reminder:', error);
      toast.error('Failed to send test reminder');
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <ComponentCard title="Reminder Emails" desc="Configure birthday, anniversary, and occasion reminders.">
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading reminder settings...</p>
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Reminder Emails" desc="Enable reminders and schedule when emails should send.">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Birthday reminders</div>
            <Switch
              checked={settings.birthdayEnabled}
              onChange={(value) => setSettings((prev) => ({ ...prev, birthdayEnabled: value }))}
              ariaLabel="Toggle birthday reminders"
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Anniversary reminders</div>
            <Switch
              checked={settings.anniversaryEnabled}
              onChange={(value) => setSettings((prev) => ({ ...prev, anniversaryEnabled: value }))}
              ariaLabel="Toggle anniversary reminders"
            />
          </div>

          <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="mb-2 text-sm font-medium text-gray-800 dark:text-white/90">Occasion reminders</div>
            <Switch
              checked={settings.occasionEnabled}
              onChange={(value) => setSettings((prev) => ({ ...prev, occasionEnabled: value }))}
              ariaLabel="Toggle occasion reminders"
            />
          </div>
        </div>

        <InputField
          label="Send reminders days before"
          placeholder="7, 1"
          value={daysBeforeInput}
          onChange={(event) => setDaysBeforeInput(event.target.value)}
          hint="Comma-separated values, e.g. 14, 7, 1"
        />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <InputField
            label="Birthday subject"
            value={settings.birthdaySubject || ''}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                birthdaySubject: event.target.value,
              }))
            }
          />

          <InputField
            label="Anniversary subject"
            value={settings.anniversarySubject || ''}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                anniversarySubject: event.target.value,
              }))
            }
          />

          <InputField
            label="Occasion subject"
            value={settings.occasionSubject || ''}
            onChange={(event) =>
              setSettings((prev) => ({
                ...prev,
                occasionSubject: event.target.value,
              }))
            }
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save settings'}
          </Button>
          {!hasEnabledType && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              All reminder types are disabled.
            </span>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Send test reminder</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <InputField
              label="Test email"
              type="email"
              placeholder="owner@shop.com"
              value={testEmail}
              onChange={(event) => setTestEmail(event.target.value)}
            />
            <Select
              label="Reminder type"
              options={testTypeOptions}
              value={testType}
              onChange={(value) => setTestType((value as ReminderTypeKey) || 'birthday')}
            />
            <div className="flex items-end">
              <Button onClick={handleSendTest} disabled={sendingTest}>
                {sendingTest ? 'Sending...' : 'Send test'}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
          <div className="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">
            Upcoming reminders (next 30 days)
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No reminders found for this window.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                    <th className="py-2 pr-4 font-semibold text-gray-700 dark:text-gray-300">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.slice(0, 20).map((item) => (
                    <tr key={`${item.type}-${item.customerId}-${item.date}-${item.recipientName || ''}`} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{item.date}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{typeLabelMap[item.type]}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{item.customerName}</td>
                      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{item.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ComponentCard>
  );
}
