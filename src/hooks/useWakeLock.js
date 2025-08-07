import { useRef, useCallback, useEffect } from 'react';

export default function useWakeLock(meetingSession) {
  const wakeLockRef = useRef(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        console.log('[WakeLock] requesting...');
        wakeLockRef.current = await navigator.wakeLock.request('screen');

        wakeLockRef.current.addEventListener('release', () => {
          console.warn('[WakeLock] was released');
          wakeLockRef.current = null;

          // Re-request if still visible and session exists
          if (document.visibilityState === 'visible' && meetingSession) {
            requestWakeLock();
          }
        });
      } else {
        console.warn('[WakeLock] Not requested: Page is not visible');
      }
    } catch (error) {
      console.error('[WakeLock] Failed to request:', error);
    }
  }, [meetingSession]);

  useEffect(() => {
    if (!meetingSession) return;

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [meetingSession, requestWakeLock]);
}
