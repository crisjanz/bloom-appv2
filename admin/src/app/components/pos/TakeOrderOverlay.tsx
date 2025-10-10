// components/pos/TakeOrderOverlay.tsx - Simple wrapper
import React from 'react';
import TakeOrderPage from '../../pages/orders/TakeOrderPage';

type Props = {
  onComplete: (orderData: any) => void;
  onCancel: () => void;
  selectedCustomer?: any;
};

const TakeOrderOverlay: React.FC<Props> = ({ onComplete, onCancel, selectedCustomer }) => {
  return (
    <div className="h-full bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 flex-shrink-0 border-b border-gray-200 dark:border-gray-800">
        <button onClick={onCancel} className="text-gray-600 dark:text-gray-400 hover:text-[#597485]">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-black dark:text-white">Add Order</h2>
      </div>

      {/* TakeOrderPage in overlay mode */}
<div className="flex-1 overflow-y-auto p-4 pos-scrollbar">
        <TakeOrderPage 
          isOverlay={true}
          onComplete={onComplete}
          onCancel={onCancel}
          initialCustomer={selectedCustomer}
        />
      </div>
    </div>
  );
};

export default TakeOrderOverlay;