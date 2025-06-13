import React from 'react';
import { SaveIcon } from '../../../../icons';
import Label from '../../../form/Label';

interface RecipientEditModalProps {
  recipient: {
    firstName: string;
    lastName: string;
    company: string;
    phone: string;
    address1: string;
    address2: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  onChange: (recipient: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const RecipientEditModal: React.FC<RecipientEditModalProps> = ({
  recipient,
  onChange,
  onSave,
  onCancel,
  saving
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <input
            type="text"
            value={recipient.firstName}
            onChange={(e) => onChange({ ...recipient, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>Last Name</Label>
          <input
            type="text"
            value={recipient.lastName}
            onChange={(e) => onChange({ ...recipient, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div>
        <Label>Company (Optional)</Label>
        <input
          type="text"
          value={recipient.company}
          onChange={(e) => onChange({ ...recipient, company: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Phone</Label>
        <input
          type="tel"
          value={recipient.phone}
          onChange={(e) => onChange({ ...recipient, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Address Line 1</Label>
        <input
          type="text"
          value={recipient.address1}
          onChange={(e) => onChange({ ...recipient, address1: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <Label>Address Line 2 (Optional)</Label>
        <input
          type="text"
          value={recipient.address2}
          onChange={(e) => onChange({ ...recipient, address2: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>City</Label>
          <input
            type="text"
            value={recipient.city}
            onChange={(e) => onChange({ ...recipient, city: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>Province</Label>
          <input
            type="text"
            value={recipient.province}
            onChange={(e) => onChange({ ...recipient, province: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>Postal Code</Label>
          <input
            type="text"
            value={recipient.postalCode}
            onChange={(e) => onChange({ ...recipient, postalCode: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Changes will update the address in the customer database for future orders.
        </p>
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
          className="px-4 py-2 bg-[#597485] text-white rounded-lg hover:bg-[#4e6575] transition-colors disabled:opacity-50 flex items-center gap-2"
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

export default RecipientEditModal;