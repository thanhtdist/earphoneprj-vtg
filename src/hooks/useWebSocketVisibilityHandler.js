import { useEffect } from 'react';

/**
 * Handles WebSocket connect/disconnect based on tab visibility or activity.
 *
 * @param {Object} params
 * @param {Object} params.tour - Tour data object (must contain tourId).
 * @param {boolean} params.isActive - Whether the tab is active/visible.
 * @param {function} params.connectWebSocket - Function to establish WS connection.
 * @param {object} params.wsRef - Ref to the WebSocket instance.
 */
const useWebSocketVisibilityHandler = ({ tour, isActive, connectWebSocket, wsRef }) => {
  useEffect(() => {
    console.log('WebSocket Tour connected:', tour);
    if (!tour) return;

    if (isActive) {
      connectWebSocket();
    } else {
      if (wsRef.current) {
        console.log('🛑 Tab hidden, closing WebSocket connection.');
        wsRef.current.close();
      }
    }
  }, [connectWebSocket, tour, isActive, wsRef]);
};

export default useWebSocketVisibilityHandler;
