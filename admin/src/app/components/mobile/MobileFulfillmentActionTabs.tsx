import { Link } from 'react-router-dom';

type MobileFulfillmentActionKey = 'reference' | 'photos' | 'status';

interface MobileFulfillmentActionTabsProps {
  orderId: string;
  active: MobileFulfillmentActionKey;
}

const ACTIONS: Array<{ key: MobileFulfillmentActionKey; label: string; to: (orderId: string) => string }> = [
  { key: 'reference', label: 'Reference', to: (orderId) => `/mobile/fulfillment/${orderId}/reference` },
  { key: 'photos', label: 'Photos', to: (orderId) => `/mobile/fulfillment/${orderId}/photos` },
  { key: 'status', label: 'Status', to: (orderId) => `/mobile/fulfillment/${orderId}/status` }
];

export default function MobileFulfillmentActionTabs({ orderId, active }: MobileFulfillmentActionTabsProps) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-3xl bg-white p-2 shadow-sm dark:bg-gray-800">
      {ACTIONS.map((action) => {
        const isActive = action.key === active;
        return (
          <Link
            key={action.key}
            to={action.to(orderId)}
            className={`h-10 rounded-2xl text-center text-sm font-semibold leading-10 transition-colors ${
              isActive
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}
