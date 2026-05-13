import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import {
  findUserById,
  createDiscussionGroup,
  findDiscussionGroupById,
  discussionGroupMessages,
} from '../../db';
import { deliverPushNotificationToUser, broadcastGroupSystemEvent } from '../notifications';
import { PUSH_NOTIFICATION_BODY_MAX_LENGTH } from '../constants';
import type { DiscussionGroupMessage } from '../../../types';

export function handleCreateDiscussionGroup(
  io: Server,
  socket: Socket,
  payload: { name: string; memberIds: string[] },
  currentUserId: string
): void {
  const creator = findUserById(currentUserId);
  if (!creator || creator.role !== 'directeur') {
    socket.emit('error', { message: 'Seul le directeur peut créer des groupes' });
    return;
  }

  const { name: groupName, memberIds: invitedMemberIds } = payload;
  if (!groupName || !invitedMemberIds?.length) return;

  const newGroup = createDiscussionGroup(groupName, currentUserId, creator.name, invitedMemberIds);

  const allMemberIds = new Set([currentUserId, ...invitedMemberIds]);
  for (const uid of allMemberIds) {
    io.to(`user:${uid}`).emit('discussion_group_created', newGroup);
  }

  for (const invitedId of invitedMemberIds) {
    deliverPushNotificationToUser(
      invitedId,
      'AVENIR — Nouveau groupe de discussion',
      `Vous avez été invité au groupe "${groupName}" par ${creator.name}`,
      `group-${newGroup.id}`
    );
  }
}

export function handleJoinDiscussionGroup(
  io: Server,
  socket: Socket,
  payload: { groupId: string },
  currentUserId: string
): void {
  const { groupId } = payload;
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  if (!group.memberIds.includes(currentUserId)) group.memberIds.push(currentUserId);
  if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

  socket.join(`group:${groupId}`);

  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_joined', {
      groupId, userId: currentUserId, userName: actor.name, group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'joined', actor.name, currentUserId, group);
}

export function handleConnectDiscussionGroup(
  io: Server,
  socket: Socket,
  payload: { groupId: string },
  currentUserId: string
): void {
  const { groupId } = payload;
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;
  if (!group.memberIds.includes(currentUserId) && group.createdBy !== currentUserId) return;

  if (!group.connectedMemberIds.includes(currentUserId)) group.connectedMemberIds.push(currentUserId);

  socket.join(`group:${groupId}`);

  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_connected', {
      groupId, userId: currentUserId, userName: actor.name, group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'connected', actor.name, currentUserId, group);
}

export function handleDisconnectDiscussionGroup(
  io: Server,
  socket: Socket,
  payload: { groupId: string },
  currentUserId: string
): void {
  const { groupId } = payload;
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  group.connectedMemberIds = group.connectedMemberIds.filter(id => id !== currentUserId);

  socket.leave(`group:${groupId}`);

  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_disconnected', {
      groupId, userId: currentUserId, userName: actor.name, group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'disconnected', actor.name, currentUserId, group);
}

export function handleLeaveDiscussionGroup(
  io: Server,
  socket: Socket,
  payload: { groupId: string },
  currentUserId: string
): void {
  const { groupId } = payload;
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  const membersBefore = [...group.memberIds];
  group.memberIds = group.memberIds.filter(id => id !== currentUserId);
  group.connectedMemberIds = group.connectedMemberIds.filter(id => id !== currentUserId);

  socket.leave(`group:${groupId}`);

  const allPrevious = new Set([group.createdBy, ...membersBefore]);
  for (const uid of allPrevious) {
    io.to(`user:${uid}`).emit('discussion_group_member_left', {
      groupId, userId: currentUserId, userName: actor.name, group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'left', actor.name, currentUserId, group);
}

export function handleDiscussionGroupTyping(
  io: Server,
  socket: Socket,
  messageType: string,
  payload: { groupId: string },
  currentUserId: string
): void {
  const { groupId } = payload;
  const group = findDiscussionGroupById(groupId);
  const actor = findUserById(currentUserId);
  if (!group || !actor) return;

  socket.to(`group:${groupId}`).emit(messageType, {
    groupId,
    fromId: currentUserId,
    fromName: actor.name,
  });
}

export function handleDiscussionGroupMessage(
  io: Server,
  socket: Socket,
  payload: { groupId: string; content: string },
  currentUserId: string
): void {
  const { groupId, content: messageContent } = payload;
  const group  = findDiscussionGroupById(groupId);
  const sender = findUserById(currentUserId);
  if (!group || !sender || !messageContent?.trim()) return;
  if (!group.connectedMemberIds.includes(currentUserId) && group.createdBy !== currentUserId) return;

  const groupMsg: DiscussionGroupMessage = {
    id: uuidv4(),
    groupId,
    fromId: currentUserId,
    fromName: sender.name,
    fromRole: sender.role,
    content: messageContent,
    createdAt: new Date().toISOString(),
    type: 'discussion_group',
  };
  discussionGroupMessages.push(groupMsg);

  io.to(`group:${groupId}`).emit('discussion_group_message', groupMsg);

  const allMembers = new Set([group.createdBy, ...group.memberIds]);
  allMembers.delete(currentUserId);
  for (const memberId of allMembers) {
    deliverPushNotificationToUser(
      memberId,
      `${sender.name} — ${group.name}`,
      messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
      `group-${groupId}`
    );
  }
}
