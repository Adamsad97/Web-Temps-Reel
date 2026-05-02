'use client';
import { useEffect, useRef, useCallback, useState } from 'react';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000';

type IncomingMessageHandler = (msg: { type: string; payload: unknown }) => void;

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const RECONNECT_DELAY_MS = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function useWebSocket(authToken: string | null, onMessage: IncomingMessageHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef<IncomingMessageHandler>(onMessage);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>('disconnected');

  handlerRef.current = onMessage;

  const connect = useCallback(() => {
    if (!authToken) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(`${WEBSOCKET_URL}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'auth', payload: { token: authToken } }));
      reconnectAttemptsRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(event.data);
        if (parsedMessage.type === 'auth_ok') {
          setConnectionStatus('connected');
        }
        handlerRef.current(parsedMessage);
      } catch {}
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      wsRef.current = null;
      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        setConnectionStatus('reconnecting');
        reconnectAttemptsRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };
  }, [authToken]);

  useEffect(() => {
    if (!authToken) return;
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [authToken, connect]);

  const send = useCallback((messageType: string, payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: messageType, payload }));
    }
  }, []);

  return { send, status: connectionStatus };
}
