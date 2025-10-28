import PropTypes from "prop-types";
import { Modal } from "@shared/ui/components/ui/modal";
import { Address } from "@shared/types/customer";

interface Recipient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  addresses?: Address[];
}

interface ViewRecipientModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient?: Recipient | null;
}

const formatAddress = (address: Address) => {
  return [
    [address.address1, address.address2].filter(Boolean).join(", "),
    [address.city, address.province].filter(Boolean).join(", "),
    [address.postalCode, address.country].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join("\n");
};

export default function ViewRecipientModal({ isOpen, onClose, recipient }: ViewRecipientModalProps) {
  if (!recipient) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-xl w-full">
      <div className="space-y-6 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {recipient.firstName} {recipient.lastName}
          </h2>
          {(recipient.email || recipient.phone) && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {[recipient.email, recipient.phone].filter(Boolean).join(" • ")}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(recipient.addresses || []).length > 0 ? (
            recipient.addresses!.map((address) => (
              <div
                key={address.id}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-200"
              >
                <div className="font-semibold text-gray-900 dark:text-white">
                  {[address.firstName, address.lastName].filter(Boolean).join(" ") || "Recipient"}
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                  {formatAddress(address)}
                </pre>
                {address.phone && (
                  <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Phone: {address.phone}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              No address details available for this recipient.
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

ViewRecipientModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  recipient: PropTypes.object,
};
