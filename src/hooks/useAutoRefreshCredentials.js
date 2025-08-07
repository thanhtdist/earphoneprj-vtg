// hooks/useAutoRefreshCredentials.js (hoặc .ts nếu dùng TypeScript)
import { useEffect, useRef } from 'react';

/**
 * Automatically refreshes AWS credentials before they expire.
 *
 * @param {number} credentialsExpiration - The timestamp (in ms) when credentials expire.
 * @param {Function} refreshFunction - Async function that refreshes credentials and restarts session.
 * @param {number} bufferMs - Optional buffer time in milliseconds (default: 5 minutes).
 */
const useAutoRefreshCredentials = (
    credentialsExpiration,
    refreshFunction,
    bufferMs = 5 * 60 * 1000 // default: 5 minutes
) => {
    const refreshIntervalRef = useRef(null);

    useEffect(() => {
        if (!credentialsExpiration) return;

        const checkInterval = 60 * 1000; // Check every 1 minute

        refreshIntervalRef.current = setInterval(async () => {
            console.log('Checking credentials expiration...');
            const now = Date.now();

            if (credentialsExpiration - now <= bufferMs) {
                console.log('Refreshing credentials before expiration...');
                try {
                    await refreshFunction();
                } catch (error) {
                    console.error('Failed to refresh credentials:', error);
                }
            }
        }, checkInterval);

        return () => {
            if (refreshIntervalRef.current) {
                clearInterval(refreshIntervalRef.current);
            }
        };
    }, [credentialsExpiration, refreshFunction, bufferMs]);
};

export default useAutoRefreshCredentials;
