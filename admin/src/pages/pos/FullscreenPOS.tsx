// src/pages/pos/FullscreenPOS.tsx - Simplified without button
import { useEffect, useState } from 'react';
import POSPage from './POSPage';

export default function FullscreenPOS() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as PWA
    const isInPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true;
    setIsPWA(isInPWA);

    // Auto-enter fullscreen when component mounts (only in regular browser)
    if (!isInPWA) {
      enterFullscreen();
    }

    // Cleanup: Exit fullscreen when component unmounts
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(console.error);
      }
    };
  }, []);

  const enterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.log('Fullscreen not supported or blocked:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <POSPage />
    </div>
  );
}