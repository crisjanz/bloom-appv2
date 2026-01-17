import { Modal } from '@shared/ui/components/ui/modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onWireout: () => void;
  onDirectDelivery: () => void;
  addressSummary: string;
};

const WireoutDetectionModal = ({ open, onClose, onWireout, onDirectDelivery, addressSummary }: Props) => {
  return (
    <Modal isOpen={open} onClose={onClose} className="max-w-md">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Out of Delivery Zone
        </h2>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          This address is outside your delivery zone:
        </p>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-6">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {addressSummary}
          </p>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Is this a wire order?
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              onWireout();
              onClose();
            }}
            className="px-4 py-3 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg transition-colors"
          >
            Wire Order
          </button>

          <button
            onClick={() => {
              onDirectDelivery();
              onClose();
            }}
            className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors"
          >
            Direct Delivery
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          Wire orders use a relay service and have different tax rules
        </p>
      </div>
    </Modal>
  );
};

export default WireoutDetectionModal;
