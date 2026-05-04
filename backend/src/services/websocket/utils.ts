import { WebSocket } from 'ws';
import type { AuthenticatedClient } from './types';

export const connectedClients = new Map<string, AuthenticatedClient>();

export function sendWsMessage(ws: WebSocket, type: string, payload: object): void {
  ws.send(JSON.stringify({ type, payload }));
}

export function sendWsError(ws: WebSocket, errorMessage: string): void {
  sendWsMessage(ws, 'error', { message: errorMessage });
}

export function sendToConnectedClient(targetUserId: string, payload: object): void {
  const client = connectedClients.get(targetUserId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(payload));
  }
}

export function broadcastToConnectedUsers(userIds: Iterable<string>, payload: object): void {
  for (const userId of userIds) {
    sendToConnectedClient(userId, payload);
  }
}
