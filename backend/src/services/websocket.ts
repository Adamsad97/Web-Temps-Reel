import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import {
  messages,
  groupMessages,
  findUserById,
  users,
  addNotification,
  discussionGroupMessages,
  findDiscussionGroupById,
  createDiscussionGroup,
} from './db';
import { sendSSEToUser } from './sse';
import { sendWebPushToUser } from './webpush';
import { AuthPayload, Message, GroupMessage, DiscussionGroupMessage } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'avenir_bank_super_secret_jwt_2024';
const STAFF_ROLES = ['conseiller', 'directeur'] as const;

interface ConnectedStaffClient {
  ws: WebSocket;
  userId: string;
  role: string;
}

const connectedClients = new Map<string, ConnectedStaffClient>();


function sendToConnectedClient(targetUserId: string, payload: object): void {
  const client = connectedClients.get(targetUserId);
  if (client && client.ws.readyState === WebSocket.OPEN) {
    client.ws.send(JSON.stringify(payload));
  }
}


function broadcastToConnectedUsers(userIds: Iterable<string>, payload: object): void {
  for (const userId of userIds) sendToConnectedClient(userId, payload);
}


function deliverPushNotificationToUser(
  recipientUserId: string,
  notificationTitle: string,
  notificationBody: string,
  notificationTag?: string
): void {
  const savedNotification = addNotification(recipientUserId, 'message', notificationBody);
  sendSSEToUser(recipientUserId, 'notification', savedNotification);
  sendWebPushToUser(recipientUserId, notificationTitle, notificationBody, notificationTag).catch(() => {});
}


function broadcastGroupSystemEvent(
  groupId: string,
  memberIds: string[],
  groupCreatorId: string,
  eventType: string,
  actorUserName: string,
  actorUserId: string,
  updatedGroup: object
): void {
  const systemEventPayload = {
    type: 'discussion_group_system',
    payload: {
      groupId,
      eventType,
      actorUserId,
      actorUserName,
      group: updatedGroup,
      createdAt: new Date().toISOString(),
    },
  };
  const recipientIds = new Set([groupCreatorId, ...memberIds]);
  broadcastToConnectedUsers(recipientIds, systemEventPayload);
}

export function setupWebSocketServer(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
    let isAuthenticated = false;
    let currentUserId = '';
    let currentUserRole = '';

    ws.on('message', (rawBuffer: Buffer) => {
      let incomingMessage: { type: string; payload: Record<string, unknown> };
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
          ws.send(JSON.stringify({
            type: 'auth_ok',
            payload: { userId: currentUserId, role: currentUserRole },
          }));
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
        const { toId: recipientId, content: messageContent } = incomingMessage.payload as {
          toId: string;
          content: string;
        };
        const sender = findUserById(currentUserId);
        const recipient = findUserById(recipientId);
        if (!sender || !recipient) return;

        const privateMessage: Message = {
          id: uuidv4(),
          fromId: currentUserId,
          toId: recipientId,
          content: messageContent,
          createdAt: new Date().toISOString(),
          type: 'private',
        };
        messages.push(privateMessage);

        const enrichedPayload = {
          type: 'private_message',
          payload: { ...privateMessage, fromName: sender.name, fromRole: sender.role },
        };
        sendToConnectedClient(recipientId, enrichedPayload);
        ws.send(JSON.stringify(enrichedPayload));

        deliverPushNotificationToUser(
          recipientId,
          `Message de ${sender.name}`,
          messageContent.slice(0, 100),
          `private-msg-from-${currentUserId}`
        );
        return;
      }

      
      if (incomingMessage.type === 'group_message') {
        const { content: messageContent } = incomingMessage.payload as { content: string };
        const sender = findUserById(currentUserId);
        if (!sender || sender.role === 'client') return;

        const groupMessage: GroupMessage = {
          id: uuidv4(),
          fromId: currentUserId,
          fromName: sender.name,
          fromRole: sender.role,
          content: messageContent,
          createdAt: new Date().toISOString(),
          type: 'group',
        };
        groupMessages.push(groupMessage);

        const allStaffIds = users
          .filter(u => STAFF_ROLES.includes(u.role as typeof STAFF_ROLES[number]))
          .map(u => u.id);

        broadcastToConnectedUsers(allStaffIds, { type: 'group_message', payload: groupMessage });

        
        const offlineStaffIds = allStaffIds.filter(
          id => id !== currentUserId && !connectedClients.has(id)
        );
        for (const staffId of offlineStaffIds) {
          deliverPushNotificationToUser(
            staffId,
            `Canal Interne — ${sender.name}`,
            messageContent.slice(0, 100),
            'canal-interne'
          );
        }
        return;
      }

      
      if (incomingMessage.type === 'typing' || incomingMessage.type === 'stop_typing') {
        const { toId: recipientId, channel: messageChannel } = incomingMessage.payload as {
          toId?: string;
          channel?: string;
        };
        const sender = findUserById(currentUserId);
        if (!sender) return;

        if (messageChannel === 'group') {
          const otherStaffIds = users
            .filter(u => STAFF_ROLES.includes(u.role as typeof STAFF_ROLES[number]) && u.id !== currentUserId)
            .map(u => u.id);
          broadcastToConnectedUsers(otherStaffIds, {
            type: incomingMessage.type,
            payload: { fromId: currentUserId, fromName: sender.name, channel: 'group' },
          });
        } else if (recipientId) {
          sendToConnectedClient(recipientId, {
            type: incomingMessage.type,
            payload: { fromId: currentUserId, fromName: sender.name },
          });
        }
        return;
      }

      
      if (incomingMessage.type === 'create_discussion_group') {
        const creator = findUserById(currentUserId);
        if (!creator || creator.role !== 'directeur') {
          ws.send(JSON.stringify({ type: 'error', payload: { message: 'Seul le directeur peut créer des groupes' } }));
          return;
        }
        const { name: groupName, memberIds: invitedMemberIds } = incomingMessage.payload as {
          name: string;
          memberIds: string[];
        };
        if (!groupName || !invitedMemberIds) return;

        const newGroup = createDiscussionGroup(groupName, currentUserId, creator.name, invitedMemberIds);
        const allGroupMemberIds = new Set([currentUserId, ...invitedMemberIds]);
        broadcastToConnectedUsers(allGroupMemberIds, { type: 'discussion_group_created', payload: newGroup });

        for (const invitedUserId of invitedMemberIds) {
          deliverPushNotificationToUser(
            invitedUserId,
            'AVENIR — Nouveau groupe de discussion',
            `Vous avez été invité au groupe "${groupName}" par ${creator.name}`,
            `group-${newGroup.id}`
          );
        }
        return;
      }

      
      if (incomingMessage.type === 'join_discussion_group') {
        const { groupId } = incomingMessage.payload as { groupId: string };
        const group = findDiscussionGroupById(groupId);
        const actor = findUserById(currentUserId);
        if (!group || !actor) return;
        // Allow any authenticated user to join (no guard blocking non-members)

        if (!group.memberIds.includes(currentUserId)) group.memberIds.push(currentUserId);
        if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

        const allGroupIds = new Set([group.createdBy, ...group.memberIds]);
        broadcastToConnectedUsers(allGroupIds, {
          type: 'discussion_group_member_joined',
          payload: { groupId, userId: currentUserId, userName: actor.name, group },
        });
        broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'joined', actor.name, currentUserId, group);
        return;
      }

      
      if (incomingMessage.type === 'connect_discussion_group') {
        const { groupId } = incomingMessage.payload as { groupId: string };
        const group = findDiscussionGroupById(groupId);
        const actor = findUserById(currentUserId);
        if (!group || !actor) return;
        if (!group.memberIds.includes(currentUserId) && group.createdBy !== currentUserId) return;

        if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

        const allGroupIds = new Set([group.createdBy, ...group.memberIds]);
        broadcastToConnectedUsers(allGroupIds, {
          type: 'discussion_group_member_connected',
          payload: { groupId, userId: currentUserId, userName: actor.name, group },
        });
        broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'connected', actor.name, currentUserId, group);
        return;
      }

      
      if (incomingMessage.type === 'disconnect_discussion_group') {
        const { groupId } = incomingMessage.payload as { groupId: string };
        const group = findDiscussionGroupById(groupId);
        const actor = findUserById(currentUserId);
        if (!group || !actor) return;

        group.connectedMemberIds = group.connectedMemberIds.filter(id => id !== currentUserId);

        const allGroupIds = new Set([group.createdBy, ...group.memberIds]);
        broadcastToConnectedUsers(allGroupIds, {
          type: 'discussion_group_member_disconnected',
          payload: { groupId, userId: currentUserId, userName: actor.name, group },
        });
        broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'disconnected', actor.name, currentUserId, group);
        return;
      }

      
      if (incomingMessage.type === 'leave_discussion_group') {
        const { groupId } = incomingMessage.payload as { groupId: string };
        const group = findDiscussionGroupById(groupId);
        const actor = findUserById(currentUserId);
        if (!group || !actor) return;

        const memberIdsBeforeLeave = [...group.memberIds];
        group.memberIds = group.memberIds.filter(id => id !== currentUserId);
        group.connectedMemberIds = group.connectedMemberIds.filter(id => id !== currentUserId);

        const allPreviousGroupIds = new Set([group.createdBy, ...memberIdsBeforeLeave]);
        broadcastToConnectedUsers(allPreviousGroupIds, {
          type: 'discussion_group_member_left',
          payload: { groupId, userId: currentUserId, userName: actor.name, group },
        });
        broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'left', actor.name, currentUserId, group);
        return;
      }

      
      if (
        incomingMessage.type === 'discussion_group_typing' ||
        incomingMessage.type === 'discussion_group_stop_typing'
      ) {
        const { groupId } = incomingMessage.payload as { groupId: string };
        const group = findDiscussionGroupById(groupId);
        const actor = findUserById(currentUserId);
        if (!group || !actor) return;

        const otherConnectedMemberIds = new Set([group.createdBy, ...group.connectedMemberIds]);
        otherConnectedMemberIds.delete(currentUserId);
        broadcastToConnectedUsers(otherConnectedMemberIds, {
          type: incomingMessage.type,
          payload: { groupId, fromId: currentUserId, fromName: actor.name },
        });
        return;
      }

      
      if (incomingMessage.type === 'discussion_group_message') {
        const { groupId, content: messageContent } = incomingMessage.payload as {
          groupId: string;
          content: string;
        };
        const group = findDiscussionGroupById(groupId);
        const sender = findUserById(currentUserId);
        if (!group || !sender || !messageContent) return;
        if (!group.connectedMemberIds.includes(currentUserId) && group.createdBy !== currentUserId) return;

        const groupMessage: DiscussionGroupMessage = {
          id: uuidv4(),
          groupId,
          fromId: currentUserId,
          fromName: sender.name,
          fromRole: sender.role,
          content: messageContent,
          createdAt: new Date().toISOString(),
          type: 'discussion_group',
        };
        discussionGroupMessages.push(groupMessage);

        const currentlyConnectedIds = new Set([group.createdBy, ...group.connectedMemberIds]);
        broadcastToConnectedUsers(currentlyConnectedIds, {
          type: 'discussion_group_message',
          payload: groupMessage,
        });

        
        const allGroupMemberIds = new Set([group.createdBy, ...group.memberIds]);
        allGroupMemberIds.delete(currentUserId);
        for (const memberId of allGroupMemberIds) {
          deliverPushNotificationToUser(
            memberId,
            `${sender.name} — ${group.name}`,
            messageContent.slice(0, 100),
            `group-${groupId}`
          );
        }
        return;
      }
    });

    ws.on('close', () => {
      if (currentUserId) connectedClients.delete(currentUserId);
    });
  });
}
