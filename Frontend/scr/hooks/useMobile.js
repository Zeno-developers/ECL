// hooks/useMobile.js
import { useContext, useState, useEffect } from 'react';
import { MobileContext } from '../contexts/MobileContext';

export function useMobile() {
  const context = useContext(MobileContext);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Client-side detection
    const checkMobile = () => {
      return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 768;
    };

    setIsMobileDevice(checkMobile());
    setIsReady(true);

    const handleResize = () => {
      setIsMobileDevice(checkMobile());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }

  return {
    ...context,
    isMobileDevice,
    isDesktop: !isMobileDevice,
    isReady: context?.isReady ?? isReady
  };
}
