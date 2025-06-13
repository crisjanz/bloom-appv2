import { Link, useLocation, useNavigate } from "react-router";
import { useMemo } from "react";

interface BreadcrumbProps {
  customBreadcrumbs?: Array<{ label: string; path: string }>;
}

// Move the function outside the component to avoid hoisting issues
const formatSegmentLabel = (segment: string): string => {
  // Map URL segments to readable labels
  const labelMap: Record<string, string> = {
    'orders': 'Orders',
    'new': 'New Order',
    'edit': 'Edit Order',
    'products': 'Products',
    'customers': 'Customers',
    'settings': 'Settings',
    'categories': 'Categories',
    'profile': 'User Profile',
    'calendar': 'Calendar',
    'form-elements': 'Form Elements',
    'basic-tables': 'Basic Tables',
    'blank': 'Blank Page',
    'error-404': '404 Error',
    'line-chart': 'Line Chart',
    'bar-chart': 'Bar Chart',
    'alerts': 'Alerts',
    'avatars': 'Avatars',
    'badge': 'Badge',
    'buttons': 'Buttons',
    'images': 'Images',
    'videos': 'Videos',
    'signin': 'Sign In',
    'signup': 'Sign Up',
  };

  return labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
};

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ customBreadcrumbs }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbItems = useMemo(() => {
    // If custom breadcrumbs are provided, use them
    if (customBreadcrumbs) {
      return customBreadcrumbs;
    }

    // Auto-generate breadcrumbs from current path
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items = [{ label: 'Home', path: '/' }];

    // Convert path segments to readable breadcrumbs
    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = formatSegmentLabel(segment);
      items.push({ label, path });
    });

    return items;
  }, [location.pathname, customBreadcrumbs]);

  const handleGoBack = () => {
    // Go back one level in the URL hierarchy
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length <= 1) {
      // If we're at root level or one level deep, go to home
      navigate('/');
    } else {
      // Remove the last segment and navigate to parent
      const parentPath = '/' + pathSegments.slice(0, -1).join('/');
      navigate(parentPath);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      {/* Back Button */}
      <button
        onClick={handleGoBack}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      {/* Breadcrumb Navigation */}
      <nav>
        <ol className="flex items-center gap-1.5">
          {breadcrumbItems.map((item, index) => {
            const isLast = index === breadcrumbItems.length - 1;
            
            return (
              <li key={item.path} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="stroke-current text-gray-400 mr-1.5"
                    width="17"
                    height="16"
                    viewBox="0 0 17 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                      stroke=""
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
                {isLast ? (
                  <span className="text-sm text-gray-800 dark:text-white/90">
                    {item.label}
                  </span>
                ) : (
                  <Link
                    className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                    to={item.path}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;