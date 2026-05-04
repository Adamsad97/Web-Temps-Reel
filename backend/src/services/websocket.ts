import { WebSocket, WebSocketServer, RawData } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './websocket/constants';
import { connectedClients, sendWsMessage, sendWsError } from './websocket/utils';
import {
  handlePrivateMessage,
  handleGroupMessage,
  handleTypingIndicator,
  handleCreateDiscussionGroup,
  handleJoinDiscussionGroup,
  handleConnectDiscussionGroup,
  handleDisconnectDiscussionGroup,
  handleLeaveDiscussionGroup,
  handleDiscussionGroupTyping,
  handleDiscussionGroupMessage,
} from './websocket/handlers';
import type { IncomingWsMessage } from './websocket/types';
import { AuthPayload } from '../types';

export function setupWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    let isAuthenticated = false;
    let currentUserId = '';
    let currentUserRole = '';

    ws.on('message', (rawBuffer: RawData) => {
      let incomingMessage: IncomingWsMessage;
      try {
        incomingMessage = JSON.parse(rawBuffer.toString());
      } catch {
        return;
      }

      if (incomingMessage.type === 'auth') {
        try {
          const decodedToken = jwt.verify(
            incomingMessage.payload.token as string,
            JWT_SECRET
          ) as AuthPayload;
          currentUserId = decodedToken.userId;
          currentUserRole = decodedToken.role;
          isAuthenticated = true;
          connectedClients.set(currentUserId, { ws, userId: currentUserId, role: currentUserRole });
          sendWsMessage(ws, 'auth_ok', { userId: currentUserId, role: currentUserRole });
        } catch {
          sendWsError(ws, 'Invalid token');
          ws.close();
        }
        return;
      }

      if (!isAuthenticated) {
        sendWsError(ws, 'Not authenticated');
        return;
      }

      const { type: messageType, payload } = incomingMessage;

      if (messageType === 'private_message')
        return handlePrivateMessage(ws, payload, currentUserId);

      if (messageType === 'group_message')
        return handleGroupMessage(payload, currentUserId);

      if (messageType === 'typing' || messageType === 'stop_typing')
        return handleTypingIndicator(messageType, payload, currentUserId);

      if (messageType === 'create_discussion_group')
        return handleCreateDiscussionGroup(ws, payload, currentUserId);

      if (messageType === 'join_discussion_group')
        return handleJoinDiscussionGroup(payload, currentUserId);

      if (messageType === 'connect_discussion_group')
        return handleConnectDiscussionGroup(payload, currentUserId);

      if (messageType === 'disconnect_discussion_group')
        return handleDisconnectDiscussionGroup(payload, currentUserId);

      if (messageType === 'leave_discussion_group')
        return handleLeaveDiscussionGroup(payload, currentUserId);

      if (messageType === 'discussion_group_typing' || messageType === 'discussion_group_stop_typing')
        return handleDiscussionGroupTyping(messageType, payload, currentUserId);

      if (messageType === 'discussion_group_message')
        return handleDiscussionGroupMessage(payload, currentUserId);
    });

    ws.on('close', () => {
      if (currentUserId) connectedClients.delete(currentUserId);
    });
  });
}
