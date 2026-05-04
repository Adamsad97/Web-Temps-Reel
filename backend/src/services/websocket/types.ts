import { WebSocket } from 'ws';

export interface AuthenticatedClient {
  ws: WebSocket;
  userId: string;
  role: string;
}

export interface IncomingWsMessage {
  type: string;
  payload: Record<string, unknown>;
}
