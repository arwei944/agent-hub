import { useEffect, useRef, useCallback } from 'react';
import type { ServerEvent } from '../types';

type EventHandler = (event: ServerEvent) => void;

const RECONNECT_DELAY = 3000;

export function useWebSocket(onEvent: EventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<EventHandler>(onEvent);
  handlerRef.current = onEvent;

  const connect = useCallback(() => {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.hostname}:3001/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => console.log('[ws] connected');
    ws.onclose = () => {
      console.log(`[ws] disconnected, reconnecting in ${RECONNECT_DELAY}ms...`);
      setTimeout(connect, RECONNECT_DELAY);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (msg) => {
      try {
        const event: ServerEvent = JSON.parse(msg.data);
        handlerRef.current(event);
      } catch {
        console.warn('[ws] failed to parse message');
      }
    };
  }, []);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);
}
