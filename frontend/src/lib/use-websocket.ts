'use client';
import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

type IncomingMessageHandler = (msg: { type: string; payload: unknown }) => void;

export type WebSocketConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export function useWebSocket(authToken: string | null, onMessage: IncomingMessageHandler) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef<IncomingMessageHandler>(onMessage);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>('disconnected');

  handlerRef.current = onMessage;

  useEffect(() => {
    if (!authToken) return;

    setConnectionStatus('connecting');

    // cours : const socket = io(uri, { auth: { token: "..." } })
    // Le token est transmis dans socket.handshake.auth côté serveur
    const socket = io(SOCKET_URL, {
      auth: { token: authToken },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
    });

    socketRef.current = socket;

    // cours : socket.on('connect', () => { ... })
    socket.on('connect', () => {
      setConnectionStatus('connected');
    });

    // cours : socket.on('connect_error', () => { ... })
    socket.on('connect_error', () => {
      setConnectionStatus('reconnecting');
    });

    socket.on('disconnect', () => {
      setConnectionStatus('disconnected');
    });

    socket.on('reconnecting', () => {
      setConnectionStatus('reconnecting');
    });

    // Réception de tous les événements métier
    // cours : socket.on(ev, (data) => { ... })
    const EVENTS = [
      'auth_ok',
      'private_message',
      'group_message',
      'typing',
      'stop_typing',
      'discussion_group_created',
      'discussion_group_member_joined',
      'discussion_group_member_left',
      'discussion_group_member_connected',
      'discussion_group_member_disconnected',
      'discussion_group_message',
      'discussion_group_typing',
      'discussion_group_stop_typing',
      'discussion_group_system',
      'discussion_group_message_edited',
      'discussion_group_message_deleted',
      'error',
    ] as const;

    for (const event of EVENTS) {
      socket.on(event, (payload: unknown) => {
        handlerRef.current({ type: event, payload });
      });
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [authToken]);

  // cours : socket.emit(ev, data)
  const send = useCallback((messageType: string, payload: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(messageType, payload);
    }
  }, []);

  return { send, status: connectionStatus };
}
