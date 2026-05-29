import { useEffect, useRef, useCallback } from 'react';
import type { ServerEvent } from '../types';

type EventHandler = (event: ServerEvent) => void;

const RECONNECT_DELAY = 3000;
const PONG_TIMEOUT = 10_000;

export function useWebSocket(onEvent: EventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<EventHandler>(onEvent);
  const pongTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  handlerRef.current = onEvent;

  const clearTimers = useCallback(() => {
    if (pongTimerRef.current) {
      clearTimeout(pongTimerRef.current);
      pongTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    clearTimers();

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${location.hostname}:3001/ws`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    let intentionalClose = false;

    ws.onopen = () => {
      console.log('[ws] connected');
    };

    // 浏览器自动回复 ping 为 pong，此处检测服务端 ping 间隔
    ws.onclose = (event) => {
      if (!intentionalClose) {
        console.log(`[ws] disconnected (code=${event.code}), reconnecting in ${RECONNECT_DELAY}ms...`);
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (msg) => {
      try {
        const event: ServerEvent = JSON.parse(msg.data);
        handlerRef.current(event);
      } catch {
        console.warn('[ws] failed to parse message');
      }
    };

    // 返回关闭函数
    return () => {
      intentionalClose = true;
      ws.close();
    };
  }, [clearTimers]);

  useEffect(() => {
    const disconnect = connect();
    return () => {
      clearTimers();
      disconnect();
    };
  }, [connect, clearTimers]);
}
