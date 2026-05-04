'use client';
import { useEffect, useRef, useState } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type SSEEventHandler = (eventName: string, data: unknown) => void;

export type SSEConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

const SSE_RECONNECT_DELAY_MS = 5000;
const SSE_EVENT_LINE_PREFIX = 'event:';
const SSE_DATA_LINE_PREFIX = 'data:';
const SSE_DEFAULT_EVENT_NAME = 'message';

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
        let currentEventName = SSE_DEFAULT_EVENT_NAME;

        while (isConnectionActive) {
          const { done, value } = await streamReader.read();
          if (done) break;
          rawBuffer += textDecoder.decode(value, { stream: true });

          const rawLines = rawBuffer.split('\n');
          rawBuffer = rawLines.pop() || '';

          for (const line of rawLines) {
            if (line.startsWith(SSE_EVENT_LINE_PREFIX)) {
              currentEventName = line.slice(SSE_EVENT_LINE_PREFIX.length).trim();
            } else if (line.startsWith(SSE_DATA_LINE_PREFIX)) {
              try {
                const parsedData = JSON.parse(line.slice(SSE_DATA_LINE_PREFIX.length).trim());
                handlerRef.current(currentEventName, parsedData);
              } catch {}
              currentEventName = SSE_DEFAULT_EVENT_NAME;
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
