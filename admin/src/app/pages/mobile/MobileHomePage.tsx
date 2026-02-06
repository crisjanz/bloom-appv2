import { useNavigate } from 'react-router-dom';
import { TruckIcon, PackageIcon, BoxCubeIcon } from '@shared/assets/icons';

export default function MobileHomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
          Bloom Mobile
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mt-1">
          Field Tools
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4">
        <div className="w-full max-w-md mx-auto space-y-3">

          {/* Scan Order Button */}
          <button
            onClick={() => navigate('/mobile/scan')}
            className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Scan Order
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wire orders & web orders
              </p>
            </div>
          </button>

          {/* Inventory Button */}
          <button
            onClick={() => navigate('/mobile/inventory')}
            className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <BoxCubeIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Inventory
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan and adjust stock
              </p>
            </div>
          </button>

          {/* Delivery Route Button */}
          <button
            onClick={() => navigate('/mobile/delivery')}
            className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
              <TruckIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Delivery Route
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View today's deliveries
              </p>
            </div>
          </button>

          {/* Fulfillment Button */}
          <button
            onClick={() => navigate('/mobile/fulfillment')}
            className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <PackageIcon className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Fulfillment
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Fulfill today's orders
              </p>
            </div>
          </button>

          {/* Admin Dashboard Link */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-3 text-center active:scale-[0.98] transition-transform"
          >
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Go to Full Admin →
            </span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
        In Your Vase Flowers
      </div>
    </div>
  );
}
