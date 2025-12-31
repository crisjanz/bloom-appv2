// src/components/orders/RecipientUpdateModal.tsx
import { useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  originalRecipient: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    city: string;
  };
  currentData: {
    firstName: string;
    lastName: string;
    phone: string;
    address1: string;
    city: string;
  };
  onChoice: (choice: 'update' | 'new' | 'duplicate') => void;
};

const RecipientUpdateModal: React.FC<Props> = ({
  open,
  onClose,
  originalRecipient,
  currentData,
  onChoice
}) => {
  const [selectedChoice, setSelectedChoice] = useState<'update' | 'new' | 'duplicate' | null>(null);

  if (!open) return null;

  const handleConfirm = () => {
    if (selectedChoice) {
      onChoice(selectedChoice);
      onClose();
    }
  };

  const getChanges = () => {
    const changes = [];
    if (originalRecipient.firstName !== currentData.firstName) {
      changes.push(`Name: "${originalRecipient.firstName} ${originalRecipient.lastName}" → "${currentData.firstName} ${currentData.lastName}"`);
    }
    if (originalRecipient.phone !== currentData.phone) {
      changes.push(`Phone: "${originalRecipient.phone}" → "${currentData.phone}"`);
    }
    if (originalRecipient.address1 !== currentData.address1 || originalRecipient.city !== currentData.city) {
      changes.push(`Address: "${originalRecipient.address1}, ${originalRecipient.city}" → "${currentData.address1}, ${currentData.city}"`);
    }
    return changes;
  };

  const changes = getChanges();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100000] p-4">
      <div className="bg-white dark:bg-boxdark rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="border-b border-stroke dark:border-strokedark p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-black dark:text-white">
              Recipient Information Changed
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              You've selected an existing recipient but made changes to their information. What would you like to do?
            </p>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">Changes detected:</h4>
              <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
                {changes.map((change, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {/* Option 1: Update existing */}
            <div 
              onClick={() => setSelectedChoice('update')}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${
                selectedChoice === 'update' 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-stroke dark:border-strokedark hover:border-brand-500/50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedChoice === 'update' 
                    ? 'border-brand-500 bg-brand-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedChoice === 'update' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <h3 className="font-medium text-black dark:text-white">
                  Update existing recipient
                </h3>
              </div>
            </div>

            {/* Option 2: Create new */}
            <div 
              onClick={() => setSelectedChoice('new')}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${
                selectedChoice === 'new' 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-stroke dark:border-strokedark hover:border-brand-500/50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedChoice === 'new' 
                    ? 'border-brand-500 bg-brand-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedChoice === 'new' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <h3 className="font-medium text-black dark:text-white">
                  Create new recipient
                </h3>
              </div>
            </div>

            {/* Option 3: Duplicate */}
            <div 
              onClick={() => setSelectedChoice('duplicate')}
              className={`border rounded-xl p-3 cursor-pointer transition-all ${
                selectedChoice === 'duplicate' 
                  ? 'border-brand-500 bg-brand-500/5' 
                  : 'border-stroke dark:border-strokedark hover:border-brand-500/50'
              }`}
            >
              <div className="flex items-center">
                <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedChoice === 'duplicate' 
                    ? 'border-brand-500 bg-brand-500' 
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedChoice === 'duplicate' && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <h3 className="font-medium text-black dark:text-white">
                  Duplicate with new name
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stroke dark:border-strokedark p-6">
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-stroke dark:border-strokedark text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirm}
              disabled={!selectedChoice}
              className="flex-1 py-3 px-4 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipientUpdateModal;