import { useEffect, useRef, useState } from 'react';

export const RECONNECT_DELAY = 5000;
export const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(
  url: string,
  onMessage: (event: MessageEvent) => void,
) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectCountRef.current = 0;
        if (!isMounted) return;
        setConnected(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (!isMounted) return;
        onMessage(event);
      };

      ws.onerror = () => {
        if (!isMounted) return;
        setConnected(false);
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);

        if (reconnectCountRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectCountRef.current += 1;
          reconnectTimeoutRef.current = window.setTimeout(connect, RECONNECT_DELAY);
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [url, onMessage]);

  return connected;
}
