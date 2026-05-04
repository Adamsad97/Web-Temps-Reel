import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { findUserById, messages, groupMessages, createDiscussionGroup, findDiscussionGroupById, discussionGroupMessages, users } from '../db';
import { connectedClients, sendWsMessage, sendWsError, sendToConnectedClient, broadcastToConnectedUsers } from './utils';
import { deliverPushNotificationToUser, broadcastGroupSystemEvent } from './notifications';
import { STAFF_ROLES, PUSH_NOTIFICATION_BODY_MAX_LENGTH } from './constants';
import type { Message, GroupMessage, DiscussionGroupMessage } from '../../types';

export function handlePrivateMessage(
  ws: WebSocket,
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { toId: recipientId, content: messageContent } = payload as { toId: string; content: string };
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

  const outgoingPrivateMessagePayload = {
    type: 'private_message',
    payload: { ...privateMessage, fromName: sender.name, fromRole: sender.role },
  };
  sendToConnectedClient(recipientId, outgoingPrivateMessagePayload);
  ws.send(JSON.stringify(outgoingPrivateMessagePayload));

  deliverPushNotificationToUser(
    recipientId,
    `Message de ${sender.name}`,
    messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
    `private-msg-from-${currentUserId}`
  );
}

export function handleGroupMessage(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { content: messageContent } = payload as { content: string };
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
    .filter(staffMember => STAFF_ROLES.includes(staffMember.role as typeof STAFF_ROLES[number]))
    .map(staffMember => staffMember.id);

  broadcastToConnectedUsers(allStaffIds, { type: 'group_message', payload: groupMessage });

  const offlineStaffIds = allStaffIds.filter(
    staffMemberId => staffMemberId !== currentUserId && !connectedClients.has(staffMemberId)
  );
  for (const staffId of offlineStaffIds) {
    deliverPushNotificationToUser(
      staffId,
      `Canal Interne — ${sender.name}`,
      messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
      'canal-interne'
    );
  }
}

export function handleTypingIndicator(
  messageType: string,
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { toId: recipientId, channel: messageChannel } = payload as {
    toId?: string;
    channel?: string;
  };
  const sender = findUserById(currentUserId);
  if (!sender) return;

  if (messageChannel === 'group') {
    const otherStaffIds = users
      .filter(staffMember =>
        STAFF_ROLES.includes(staffMember.role as typeof STAFF_ROLES[number]) &&
        staffMember.id !== currentUserId
      )
      .map(staffMember => staffMember.id);

    broadcastToConnectedUsers(otherStaffIds, {
      type: messageType,
      payload: { fromId: currentUserId, fromName: sender.name, channel: 'group' },
    });
  } else if (recipientId) {
    sendToConnectedClient(recipientId, {
      type: messageType,
      payload: { fromId: currentUserId, fromName: sender.name },
    });
  }
}

export function handleCreateDiscussionGroup(
  ws: WebSocket,
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const creator = findUserById(currentUserId);
  if (!creator || creator.role !== 'directeur') {
    sendWsError(ws, 'Seul le directeur peut créer des groupes');
    return;
  }

  const { name: groupName, memberIds: invitedMemberIds } = payload as {
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
}

export function handleJoinDiscussionGroup(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId } = payload as { groupId: string };
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  if (!group.memberIds.includes(currentUserId)) group.memberIds.push(currentUserId);
  if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

  const allGroupParticipantIds = new Set([group.createdBy, ...group.memberIds]);
  broadcastToConnectedUsers(allGroupParticipantIds, {
    type: 'discussion_group_member_joined',
    payload: { groupId, userId: currentUserId, userName: actor.name, group },
  });
  broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'joined', actor.name, currentUserId, group);
}

export function handleConnectDiscussionGroup(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId } = payload as { groupId: string };
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;
  if (!group.memberIds.includes(currentUserId) && group.createdBy !== currentUserId) return;

  if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

  const allGroupParticipantIds = new Set([group.createdBy, ...group.memberIds]);
  broadcastToConnectedUsers(allGroupParticipantIds, {
    type: 'discussion_group_member_connected',
    payload: { groupId, userId: currentUserId, userName: actor.name, group },
  });
  broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'connected', actor.name, currentUserId, group);
}

export function handleDisconnectDiscussionGroup(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId } = payload as { groupId: string };
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  group.connectedMemberIds = group.connectedMemberIds.filter(memberId => memberId !== currentUserId);

  const allGroupParticipantIds = new Set([group.createdBy, ...group.memberIds]);
  broadcastToConnectedUsers(allGroupParticipantIds, {
    type: 'discussion_group_member_disconnected',
    payload: { groupId, userId: currentUserId, userName: actor.name, group },
  });
  broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'disconnected', actor.name, currentUserId, group);
}

export function handleLeaveDiscussionGroup(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId } = payload as { groupId: string };
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  const memberIdsBeforeLeave = [...group.memberIds];
  group.memberIds = group.memberIds.filter(memberId => memberId !== currentUserId);
  group.connectedMemberIds = group.connectedMemberIds.filter(memberId => memberId !== currentUserId);

  const allPreviousGroupParticipantIds = new Set([group.createdBy, ...memberIdsBeforeLeave]);
  broadcastToConnectedUsers(allPreviousGroupParticipantIds, {
    type: 'discussion_group_member_left',
    payload: { groupId, userId: currentUserId, userName: actor.name, group },
  });
  broadcastGroupSystemEvent(groupId, group.memberIds, group.createdBy, 'left', actor.name, currentUserId, group);
}

export function handleDiscussionGroupTyping(
  messageType: string,
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId } = payload as { groupId: string };
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  const otherConnectedMemberIds = new Set([group.createdBy, ...group.connectedMemberIds]);
  otherConnectedMemberIds.delete(currentUserId);
  broadcastToConnectedUsers(otherConnectedMemberIds, {
    type: messageType,
    payload: { groupId, fromId: currentUserId, fromName: actor.name },
  });
}

export function handleDiscussionGroupMessage(
  payload: Record<string, unknown>,
  currentUserId: string
): void {
  const { groupId, content: messageContent } = payload as { groupId: string; content: string };
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

  const currentlyConnectedGroupMemberIds = new Set([group.createdBy, ...group.connectedMemberIds]);
  broadcastToConnectedUsers(currentlyConnectedGroupMemberIds, {
    type: 'discussion_group_message',
    payload: groupMessage,
  });

  const allGroupMemberIds = new Set([group.createdBy, ...group.memberIds]);
  allGroupMemberIds.delete(currentUserId);
  for (const memberId of allGroupMemberIds) {
    deliverPushNotificationToUser(
      memberId,
      `${sender.name} — ${group.name}`,
      messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
      `group-${groupId}`
    );
  }
}
