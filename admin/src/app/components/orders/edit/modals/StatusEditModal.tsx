import React from 'react';
import { SaveIcon } from '@shared/assets/icons';
import Label from '@shared/ui/forms/Label';
import Select from '@shared/ui/forms/Select';
import { statusOptions } from '../../types';

interface StatusEditModalProps {
  status: string;
  onChange: (status: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const StatusEditModal: React.FC<StatusEditModalProps> = ({
  status,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label>Order Status</Label>
        <Select
          options={statusOptions}
          value={status}
          onChange={onChange}
          placeholder="Select Status"
          className="dark:bg-gray-700"
        />
      </div>
      
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <SaveIcon className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StatusEditModal;