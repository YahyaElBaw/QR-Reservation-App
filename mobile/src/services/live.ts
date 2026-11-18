import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from './api';

// Derived socket base URL by stripping /api/v1
export let SOCKET_BASE_URL =
  process.env.EXPO_PUBLIC_SOCKET_URL || API_BASE_URL.replace(/\/api\/v1\/?$/, '');

export function setSocketBaseUrl(url: string): void {
  SOCKET_BASE_URL = url;
}

export function createLiveSocket(options: { token?: string | null; qrToken?: string | null }): Socket {
  const auth: Record<string, string> = {};
  if (options.token) {
    auth.token = options.token;
  }
  if (options.qrToken) {
    auth.qrToken = options.qrToken;
  }

  const socket = io(`${SOCKET_BASE_URL}/live`, {
    auth,
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

/**
 * Hook for live updates. Subscribes to Socket.IO room and falls back to polling every 5s.
 */
export function useLiveUpdates(params: {
  token?: string | null;
  qrToken?: string | null;
  onEvent?: (event: string, payload: unknown) => void;
  enabled?: boolean;
}) {
  const { token, qrToken, onEvent, enabled = true } = params;
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    let socket: Socket | null = null;
    try {
      socket = createLiveSocket({ token, qrToken });

      const events = [
        'ticket.created',
        'ticket.updated',
        'ticket.closed',
        'table.updated',
        'product.updated',
      ];

      events.forEach((evt) => {
        socket?.on(evt, (payload: unknown) => {
          onEventRef.current?.(evt, payload);
        });
      });
    } catch {
      // Socket connection fallback
    }

    // Polling fallback every 5s per 00_SHARED_CONTEXT.md
    const interval = setInterval(() => {
      onEventRef.current?.('poll', null);
    }, 5000);

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, qrToken, enabled]);
}
