import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { isMobileDevice } from '@shared/utils/isMobile';

interface MobileRedirectProps {
  children: React.ReactNode;
}

/**
 * Redirects mobile users to /mobile
 * Desktop users see normal content
 */
export default function MobileRedirect({ children }: MobileRedirectProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Always redirect mobile users to /mobile (unless already on a mobile route)
    if (isMobileDevice() && !location.pathname.startsWith('/mobile')) {
      navigate('/mobile', { replace: true });
    }
  }, [navigate, location.pathname]);

  return <>{children}</>;
}
