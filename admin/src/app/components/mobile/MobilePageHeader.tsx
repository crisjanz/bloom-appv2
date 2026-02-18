import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, UserIcon } from '@shared/assets/icons';
import { useAuth } from '@app/contexts/AuthContext';

type MobileMenuAction = {
  label: string;
  path: string;
};

const MOBILE_MENU_ACTIONS: MobileMenuAction[] = [
  { label: 'Home', path: '/mobile' },
  { label: 'Scan Orders', path: '/mobile/scan' },
  { label: 'Fulfill Orders', path: '/mobile/fulfillment' },
  { label: 'Manage Inventory', path: '/mobile/inventory' },
  { label: 'Delivery Routes', path: '/mobile/delivery' },
  { label: 'Full Admin', path: '/dashboard' }
];

interface MobilePageHeaderProps {
  title: string;
  showBackButton?: boolean;
  backTo?: string;
}

export default function MobilePageHeader({
  title,
  showBackButton = false,
  backTo = '/mobile'
}: MobilePageHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { employee, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate('/mobile');
  };

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    navigate('/signin');
  };

  return (
    <header className="space-y-4">
      <div className="relative flex h-[72px] items-center justify-between">
        {showBackButton ? (
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_1px_1px_rgba(15,23,42,0.06)] hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            aria-label="Go back"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
        ) : (
          <div className="h-[52px] w-[52px]" aria-hidden="true" />
        )}

        <div className="absolute left-1/2 -translate-x-1/2">
          <img
            src="/images/store-logo.png"
            alt="Store logo"
            className="h-[61px] w-auto max-w-[227px] object-contain"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                setIsUserMenuOpen((previous) => !previous);
                setIsMenuOpen(false);
              }}
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_1px_1px_rgba(15,23,42,0.06)] hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-label="Open user menu"
            >
              <UserIcon className="h-6 w-6" />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                <div className="border-b border-gray-200 px-3 pb-3 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {employee?.name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {employee?.email || employee?.type || 'Signed in'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    navigate('/profile');
                  }}
                  className="mt-2 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Profile
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Log Out
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setIsMenuOpen((previous) => !previous);
                setIsUserMenuOpen(false);
              }}
              className="inline-flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-gray-700 shadow-[0_1px_1px_rgba(15,23,42,0.06)] hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              aria-label="Open actions menu"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M4 7h16" />
                <path strokeLinecap="round" d="M4 12h16" />
                <path strokeLinecap="round" d="M4 17h16" />
              </svg>
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {MOBILE_MENU_ACTIONS.map((action) => {
                  const isActive = location.pathname === action.path;
                  return (
                    <button
                      key={action.path}
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        navigate(action.path);
                      }}
                      className={`mt-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium ${
                        isActive
                          ? 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-white'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <h1 className="text-4xl font-semibold uppercase text-gray-900 dark:text-white">{title}</h1>
    </header>
  );
}
