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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#597485]"
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
                  className="w-4 h-4 text-[#597485] border-gray-300 rounded focus:ring-[#597485]"
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
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#597485]"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Save Call Note'}
        </button>
      </div>
    </div>
  );
}
