import React from 'react';
import DatePicker from '@shared/ui/forms/date-picker';
import Select from '@shared/ui/forms/Select';

type Frequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'CUSTOM';

interface ScheduleData {
  frequency: Frequency;
  preferredDayOfWeek: number | null;
  startDate: string;
  customDates: string[];
}

interface Props {
  data: ScheduleData;
  onChange: (data: ScheduleData) => void;
}

const FREQUENCIES: { value: Frequency; label: string; desc: string }[] = [
  { value: 'WEEKLY', label: 'Weekly', desc: 'Every week' },
  { value: 'BIWEEKLY', label: 'Biweekly', desc: 'Every 2 weeks' },
  { value: 'MONTHLY', label: 'Monthly', desc: 'Once a month' },
  { value: 'CUSTOM', label: 'Custom', desc: 'Pick specific dates' },
];

const DAYS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export default function ScheduleStep({ data, onChange }: Props) {
  const update = (field: keyof ScheduleData, value: any) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Step 3: Schedule</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">How often should flowers be delivered?</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FREQUENCIES.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => update('frequency', f.value)}
            className={`p-4 rounded-lg border-2 text-center transition-colors ${
              data.frequency === f.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900 dark:text-white">{f.label}</div>
            <div className="text-xs text-gray-500 mt-1">{f.desc}</div>
          </button>
        ))}
      </div>

      {(data.frequency === 'WEEKLY' || data.frequency === 'BIWEEKLY') && (
        <Select
          label="Preferred Day of Week"
          value={data.preferredDayOfWeek !== null ? String(data.preferredDayOfWeek) : '1'}
          options={DAYS}
          onChange={(val) => update('preferredDayOfWeek', parseInt(val))}
        />
      )}

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
        <DatePicker
          id="subscription-start-date"
          defaultDate={data.startDate || undefined}
          onChange={(dates) => {
            if (dates.length > 0) {
              update('startDate', dates[0].toISOString().split('T')[0]);
            }
          }}
        />
      </div>
    </div>
  );
}
