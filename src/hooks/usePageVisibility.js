import { useEffect } from 'react';

/**
 * Handles visibility change and updates isActive state accordingly.
 * 
 * @param {boolean} isActive - Current isActive state.
 * @param {Function} setIsActive - Function to update isActive.
 */
const usePageVisibility = (isActive, setIsActive) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      console.log('visibilityState', document.visibilityState);

      if (document.visibilityState === 'visible') {
        if (!isActive) {
          console.log('🟢 visibilityState: Tab is active');
          setIsActive(true);
        }
      } else {
        if (isActive) {
          console.log('🔴 visibilityState: Tab is inactive');
          setIsActive(false);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, setIsActive]);
};

export default usePageVisibility;
