'use client';
import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type SSEEventHandler = (eventName: string, data: unknown) => void;

export type SSEConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const SSE_RECONNECT_DELAY_MS = 5000;

export function useSSE(authToken: string | null, onEvent: SSEEventHandler) {
  const handlerRef = useRef<SSEEventHandler>(onEvent);
  const [connectionStatus, setConnectionStatus] = useState<SSEConnectionStatus>('disconnected');

  handlerRef.current = onEvent;

  useEffect(() => {
    if (!authToken) return;

    let isConnectionActive = true;
    let abortController = new AbortController();

    async function openSSEConnection() {
      setConnectionStatus('connecting');
      try {
        const response = await fetch(`${API_BASE_URL}/api/sse/stream`, {
          headers: { Authorization: `Bearer ${authToken}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          setConnectionStatus('disconnected');
          return;
        }

        setConnectionStatus('connected');
        const streamReader = response.body.getReader();
        const textDecoder = new TextDecoder();
        let rawBuffer = '';
        let currentEventName = 'message';

        while (isConnectionActive) {
          const { done, value } = await streamReader.read();
          if (done) break;
          rawBuffer += textDecoder.decode(value, { stream: true });

          const rawLines = rawBuffer.split('\n');
          rawBuffer = rawLines.pop() || '';

          for (const line of rawLines) {
            if (line.startsWith('event:')) {
              currentEventName = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              try {
                const parsedData = JSON.parse(line.slice(5).trim());
                handlerRef.current(currentEventName, parsedData);
              } catch {}
              currentEventName = 'message';
            }
          }
        }
      } catch {
        if (isConnectionActive) {
          setConnectionStatus('reconnecting');
          setTimeout(openSSEConnection, SSE_RECONNECT_DELAY_MS);
        }
      }
    }

    openSSEConnection();

    return () => {
      isConnectionActive = false;
      abortController.abort();
      setConnectionStatus('disconnected');
    };
  }, [authToken]);

  return { status: connectionStatus };
}
