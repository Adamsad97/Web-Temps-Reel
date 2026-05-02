import { Response } from 'express';

const activeSSEConnections = new Map<string, Response>();

export function registerSSEClient(userId: string, res: Response): void {
  const existingConnection = activeSSEConnections.get(userId);
  if (existingConnection) {
    try { existingConnection.end(); } catch (_) {}
  }
  activeSSEConnections.set(userId, res);
}

export function unregisterSSEClient(userId: string): void {
  activeSSEConnections.delete(userId);
}

export function sendSSEToUser(userId: string, eventName: string, data: unknown): void {
  const connection = activeSSEConnections.get(userId);
  if (!connection) return;
  try {
    connection.write(`event: ${eventName}\n`);
    connection.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch (_) {
    activeSSEConnections.delete(userId);
  }
}

export function broadcastSSE(eventName: string, data: unknown): void {
  for (const [, connection] of activeSSEConnections) {
    try {
      connection.write(`event: ${eventName}\n`);
      connection.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (_) {}
  }
}

export function broadcastSSEToUsers(targetUserIds: string[], eventName: string, data: unknown): void {
  for (const userId of targetUserIds) {
    sendSSEToUser(userId, eventName, data);
  }
}
