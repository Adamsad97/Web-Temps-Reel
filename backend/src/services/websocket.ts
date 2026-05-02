import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { messages, groupMessages, findUserById, users, addNotification } from './db';
import { sendSSEToUser } from './sse';
import { AuthPayload, Message, GroupMessage } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'avenir_bank_super_secret_jwt_2024';

const STAFF_ROLES = ['conseiller', 'directeur'] as const;

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  role: string;
}

const connectedClients = new Map<string, ConnectedClient>();

function sendToClient(targetUserId: string, payload: object): void {
  const targetClient = connectedClients.get(targetUserId);
  if (targetClient && targetClient.ws.readyState === WebSocket.OPEN) {
    targetClient.ws.send(JSON.stringify(payload));
  }
}

export function setupWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    let isAuthenticated = false;
    let connectedUserId = '';
    let connectedUserRole = '';

    ws.on('message', (rawBuffer: Buffer) => {
      let incomingMessage: { type: string; payload: Record<string, unknown> };
      try {
        incomingMessage = JSON.parse(rawBuffer.toString());
      } catch {
        return;
      }

      if (incomingMessage.type === 'auth') {
        try {
          const decodedToken = jwt.verify(incomingMessage.payload.token as string, JWT_SECRET) as AuthPayload;
          connectedUserId = decodedToken.userId;
          connectedUserRole = decodedToken.role;
          isAuthenticated = true;
          connectedClients.set(connectedUserId, { ws, userId: connectedUserId, role: connectedUserRole });
          ws.send(JSON.stringify({ type: 'auth_ok', payload: { userId: connectedUserId, role: connectedUserRole } }));
        } catch {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid token' } }));
          ws.close();
        }
        return;
      }

      if (!isAuthenticated) {
        ws.send(JSON.stringify({ type: 'error', payload: { message: 'Not authenticated' } }));
        return;
      }

      if (incomingMessage.type === 'private_message') {
        const { toId: recipientId, content: messageContent } = incomingMessage.payload as { toId: string; content: string };
        const sender = findUserById(connectedUserId);
        const recipient = findUserById(recipientId);
        if (!sender || !recipient) return;

        const privateMessage: Message = {
          id: uuidv4(),
          fromId: connectedUserId,
          toId: recipientId,
          content: messageContent,
          createdAt: new Date().toISOString(),
          type: 'private',
        };
        messages.push(privateMessage);

        const outgoingPayload = { type: 'private_message', payload: { ...privateMessage, fromName: sender.name, fromRole: sender.role } };
        sendToClient(recipientId, outgoingPayload);
        ws.send(JSON.stringify(outgoingPayload));

        const newNotification = addNotification(recipientId, 'message', `Nouveau message de ${sender.name}`, privateMessage.id);
        sendSSEToUser(recipientId, 'notification', newNotification);
        return;
      }

      if (incomingMessage.type === 'group_message') {
        const { content: groupMessageContent } = incomingMessage.payload as { content: string };
        const sender = findUserById(connectedUserId);
        if (!sender) return;

        if (sender.role === 'client') {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Clients cannot use the group channel' } }));
          return;
        }

        const groupMessage: GroupMessage = {
          id: uuidv4(),
          fromId: connectedUserId,
          fromName: sender.name,
          fromRole: sender.role,
          content: groupMessageContent,
          createdAt: new Date().toISOString(),
          type: 'group',
        };
        groupMessages.push(groupMessage);

        const staffUserIds = users
          .filter(u => STAFF_ROLES.includes(u.role as typeof STAFF_ROLES[number]))
          .map(u => u.id);

        for (const staffUserId of staffUserIds) {
          sendToClient(staffUserId, { type: 'group_message', payload: groupMessage });
        }
        return;
      }

      if (incomingMessage.type === 'typing' || incomingMessage.type === 'stop_typing') {
        const { toId: typingTargetId, channel: typingChannel } = incomingMessage.payload as { toId?: string; channel?: string };
        const sender = findUserById(connectedUserId);
        if (!sender) return;

        if (typingChannel === 'group') {
          const otherStaffIds = users
            .filter(u => STAFF_ROLES.includes(u.role as typeof STAFF_ROLES[number]) && u.id !== connectedUserId)
            .map(u => u.id);
          for (const staffId of otherStaffIds) {
            sendToClient(staffId, { type: incomingMessage.type, payload: { fromId: connectedUserId, fromName: sender.name, channel: 'group' } });
          }
        } else if (typingTargetId) {
          sendToClient(typingTargetId, { type: incomingMessage.type, payload: { fromId: connectedUserId, fromName: sender.name } });
        }
        return;
      }
    });

    ws.on('close', () => {
      if (connectedUserId) connectedClients.delete(connectedUserId);
    });
  });
}
