import React from 'react';
import { SaveIcon } from '../../../../icons';
import Label from '../../../form/Label';

interface CustomerEditModalProps {
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  onChange: (customer: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  customer,
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
            value={customer.firstName}
            onChange={(e) => onChange({ ...customer, firstName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <Label>Last Name</Label>
          <input
            type="text"
            value={customer.lastName}
            onChange={(e) => onChange({ ...customer, lastName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>
      
      <div>
        <Label>Email</Label>
        <input
          type="email"
          value={customer.email}
          onChange={(e) => onChange({ ...customer, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>
      
      <div>
        <Label>Phone</Label>
        <input
          type="tel"
          value={customer.phone}
          onChange={(e) => onChange({ ...customer, phone: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#597485] focus:border-transparent dark:bg-gray-700 dark:text-white"
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

export default CustomerEditModal;