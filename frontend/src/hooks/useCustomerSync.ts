/**
 * WebSocket hook for real-time customer data synchronization
 * Handles connection, reconnection with exponential backoff, and message handling
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export type SyncStatus = 'connected' | 'connecting' | 'disconnected';

interface UseCustomerSyncOptions {
  onDataUpdate?: (data: any) => void;
  enabled?: boolean;
}

export function useCustomerSync(
  customerId: string | null,
  options: UseCustomerSyncOptions = {}
) {
  const { onDataUpdate, enabled = true } = options;
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get WebSocket URL based on current location
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/customers/${customerId}`;
  }, [customerId]);

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
    return delay;
  }, []);

  // Send ping to keep connection alive
  const sendPing = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ping',
        timestamp: new Date().toISOString()
      }));
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!customerId || !enabled) return;

    // Don't create multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    setSyncStatus('connecting');
    const wsUrl = getWebSocketUrl();

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to customer ${customerId}`);
        setSyncStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start ping interval to keep connection alive (every 30 seconds)
        pingIntervalRef.current = setInterval(sendPing, 30000);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'discovery_update') {
            console.log(`[WebSocket] Received discovery update for customer ${customerId}`);
            if (onDataUpdate) {
              onDataUpdate(message.data);
            }
          } else if (message.type === 'pong') {
            // Heartbeat response, connection is healthy
            console.debug('[WebSocket] Pong received');
          }
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from customer ${customerId}`, event.code, event.reason);
        setSyncStatus('disconnected');

        // Clear ping interval
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }

        // Attempt to reconnect with exponential backoff
        if (enabled) {
          const delay = getReconnectDelay();
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      setSyncStatus('disconnected');
    }
  }, [customerId, enabled, getWebSocketUrl, getReconnectDelay, onDataUpdate, sendPing]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }

    // Close WebSocket connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setSyncStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (customerId && enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [customerId, enabled, connect, disconnect]);

  return {
    syncStatus,
    isConnected: syncStatus === 'connected',
    reconnect: connect,
    disconnect,
  };
}
