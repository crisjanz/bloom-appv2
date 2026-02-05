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
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">

          {/* Scan Order Button */}
          <button
            onClick={() => navigate('/mobile/scan')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-20 h-20 bg-brand-500 rounded-full flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Scan Order
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Wire orders & web orders
              </p>
            </div>
          </button>

          {/* Delivery Route Button */}
          <button
            onClick={() => navigate('/mobile/inventory')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
              <BoxCubeIcon className="w-12 h-12 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Inventory
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Scan and adjust stock
              </p>
            </div>
          </button>

          {/* Delivery Route Button */}
          <button
            onClick={() => navigate('/mobile/delivery')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center">
              <TruckIcon className="w-12 h-12 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Delivery Route
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                View today's deliveries
              </p>
            </div>
          </button>

          {/* Fulfillment Button */}
          <button
            onClick={() => navigate('/mobile/fulfillment')}
            className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 flex flex-col items-center gap-4 active:scale-95 transition-transform"
          >
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center">
              <PackageIcon className="w-12 h-12 text-white" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Fulfillment
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Fulfill today's orders
              </p>
            </div>
          </button>

          {/* Admin Dashboard Link */}
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gray-100 dark:bg-gray-700 rounded-xl p-4 text-center active:scale-95 transition-transform"
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
