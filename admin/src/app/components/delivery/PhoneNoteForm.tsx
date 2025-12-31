import { useState } from 'react';

interface PhoneNoteFormProps {
  onSubmit: (data: {
    status: string;
    quickActions: string[];
    notes: string;
  }) => Promise<void>;
}

export default function PhoneNoteForm({ onSubmit }: PhoneNoteFormProps) {
  const [status, setStatus] = useState('');
  const [quickActions, setQuickActions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleQuickActionToggle = (action: string) => {
    if (quickActions.includes(action)) {
      setQuickActions(quickActions.filter((a) => a !== action));
    } else {
      setQuickActions([...quickActions, action]);
    }
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      alert('Please enter notes about the call');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        status,
        quickActions,
        notes
      });

      // Reset form
      setStatus('');
      setQuickActions([]);
      setNotes('');
    } catch (error) {
      console.error('Failed to submit phone note:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Phone Call Notes</h3>

      <div className="space-y-4">
        {/* Status Dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full h-11 px-4 py-2.5 rounded-lg border appearance-none text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-500"
            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
          >
            <option value="">Select status...</option>
            <option value="ANSWERED">Answered ✓</option>
            <option value="VOICEMAIL">Left voicemail</option>
            <option value="NO_ANSWER">No answer</option>
            <option value="CALLBACK">Callback requested</option>
          </select>
        </div>

        {/* Quick Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quick Actions
          </label>
          <div className="space-y-2">
            {[
              'Confirmed delivery time',
              'Updated order details',
              'Customer has question',
              'Follow-up needed'
            ].map((action) => (
              <label key={action} className="flex items-center">
                <input
                  type="checkbox"
                  checked={quickActions.includes(action)}
                  onChange={() => handleQuickActionToggle(action)}
                  className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{action}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes <span className="text-red-500">*</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="What did you discuss with the customer?"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Call Note'}
        </button>
      </div>
    </div>
  );
}
