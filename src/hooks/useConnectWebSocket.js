import { useCallback } from 'react';
import Config from '../utils/config';

const useConnectWebSocket = ({
  wsRef,
  tourId,
  languageCode,
  userType,
  onConnectionUpdate,
  additionalInit, // optional function to send more messages after connect
}) => {
  const connectWebSocket = useCallback(() => {
    if (wsRef.current) {
      console.log('🔁 WebSocket already connected.');
      return;
    }

    const ws = new WebSocket(Config.webSocketURL);
    let connectTimestamp = null;
    let pingInterval = null;

    ws.onopen = () => {
      connectTimestamp = Date.now();
      console.log('✅ WebSocket Connected at:', new Date(connectTimestamp).toLocaleTimeString());

      // Gửi message chính
      const connectStatePayload = {
        action: 'connectState',
        tourId,
        languageCode,
        userType,
      };
      ws.send(JSON.stringify(connectStatePayload));
      console.log('📤 WebSocket Sent connectState:', connectStatePayload);

      // Gửi thêm custom message nếu cần
      if (additionalInit) {
        additionalInit(ws);
      }

      // Ping every 4 minutes
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          console.log('📡 WebSocket Sending ping...');
          ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 4 * 60 * 1000);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'connectionUpdate') {
          console.log('🔁 WebSocket Received connectionUpdate:', message);
          if (onConnectionUpdate) {
            onConnectionUpdate(message.connectionCount);
          }
        } else {
          console.log('📨 WebSocket Received:', message);
        }
      } catch (err) {
        console.error('❌ Error parsing WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      const disconnectTimestamp = Date.now();
      const duration = connectTimestamp
        ? ((disconnectTimestamp - connectTimestamp) / 1000).toFixed(1)
        : 'unknown';
      console.log('❌ WebSocket Disconnected at:', new Date(disconnectTimestamp).toLocaleTimeString());
      console.log(`🔌 Connection lasted: ${duration} seconds`);

      if (pingInterval) clearInterval(pingInterval);
      wsRef.current = null;
    };

    ws.onerror = (error) => {
      console.error('⚠️ WebSocket error:', error);
      if (pingInterval) clearInterval(pingInterval);
      wsRef.current = null;
    };

    wsRef.current = ws;
  }, [wsRef, tourId, languageCode, userType, onConnectionUpdate, additionalInit]);

  return connectWebSocket;
};

export default useConnectWebSocket;
