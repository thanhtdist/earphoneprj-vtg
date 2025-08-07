import { useEffect } from 'react';

/**
 * Handles WebSocket connect/disconnect based on tab visibility or activity.
 *
 * @param {Object} params
 * @param {Object} params.tour - Tour data object (must contain tourId).
 * @param {function} params.connectWebSocket - Function to establish WS connection.
 * @param {object} params.wsRef - Ref to the WebSocket instance.
 */
const useWebSocketVisibilityHandler = ({ tour, connectWebSocket, wsRef }) => {
  useEffect(() => {
    console.log('WebSocket Tour connected:', tour);
    if (!tour) return;
    connectWebSocket();
  }, [connectWebSocket, tour, wsRef]);
};

export default useWebSocketVisibilityHandler;
