import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import {
  findUserById,
  messages,
  groupMessages,
  createDiscussionGroup,
  findDiscussionGroupById,
  discussionGroupMessages,
  users,
} from '../db';
import { deliverPushNotificationToUser, broadcastGroupSystemEvent } from './notifications';
import { STAFF_ROLES, PUSH_NOTIFICATION_BODY_MAX_LENGTH } from './constants';
import type { Message, GroupMessage, DiscussionGroupMessage } from '../../types';
import type { AuthenticatedSocket } from '../socketio';

// ─────────────────────────────────────────────────────────
// MESSAGE PRIVÉ
// cours : io.to(room).emit(ev, data)  — room personnelle "user:<id>"
// ─────────────────────────────────────────────────────────
export function handlePrivateMessage(
  io: Server,
  socket: Socket,
  payload: { toId: string; content: string },
  currentUserId: string
): void {
  const { toId: recipientId, content: messageContent } = payload;
  const sender    = findUserById(currentUserId);
  const recipient = findUserById(recipientId);
  if (!sender || !recipient || !messageContent?.trim()) return;

  const privateMessage: Message = {
    id: uuidv4(),
    fromId: currentUserId,
    toId: recipientId,
    content: messageContent,
    createdAt: new Date().toISOString(),
    type: 'private',
  };
  messages.push(privateMessage);

  const outgoing = { ...privateMessage, fromName: sender.name, fromRole: sender.role };

  // Envoyer au destinataire via sa room personnelle
  // cours : socket.to(clientId).emit(ev, data)
  io.to(`user:${recipientId}`).emit('private_message', outgoing);

  // Renvoyer à l'expéditeur pour confirmation (tous ses onglets)
  socket.emit('private_message', outgoing);

  deliverPushNotificationToUser(
    recipientId,
    `Message de ${sender.name}`,
    messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
    `private-msg-from-${currentUserId}`
  );
}

// ─────────────────────────────────────────────────────────
// CANAL INTERNE (conseillers + directeurs)
// cours : socket.to(room).emit(ev, data)  — room 'canal:interne'
// ─────────────────────────────────────────────────────────
export function handleGroupMessage(
  io: Server,
  payload: { content: string },
  currentUserId: string
): void {
  const { content: messageContent } = payload;
  const sender = findUserById(currentUserId);
  if (!sender || sender.role === 'client' || !messageContent?.trim()) return;

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

  // Broadcast à tous les membres du canal interne (room)
  // cours : socket.broadcast.emit(ev, data) — ici via room pour cibler le staff
  io.to('canal:interne').emit('group_message', groupMessage);

  // Push pour les membres offline (hors socket.io — on ne peut pas vérifier simplement)
  const allStaffIds = users
    .filter(u => STAFF_ROLES.includes(u.role as typeof STAFF_ROLES[number]))
    .map(u => u.id)
    .filter(id => id !== currentUserId);

  for (const staffId of allStaffIds) {
    deliverPushNotificationToUser(
      staffId,
      `Canal Interne — ${sender.name}`,
      messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
      'canal-interne'
    );
  }
}

// ─────────────────────────────────────────────────────────
// INDICATEUR "EN TRAIN D'ÉCRIRE"
// cours : socket.to(room).emit(ev, data)
// ─────────────────────────────────────────────────────────
export function handleTypingIndicator(
  io: Server,
  socket: Socket,
  messageType: string,
  payload: { toId?: string; channel?: string },
  currentUserId: string
): void {
  const sender = findUserById(currentUserId);
  if (!sender) return;

  if (payload.channel === 'group') {
    // Broadcast à la room canal interne, sauf l'émetteur
    // cours : socket.to(room).emit(ev, data)
    socket.to('canal:interne').emit(messageType, {
      fromId: currentUserId,
      fromName: sender.name,
      channel: 'group',
    });
  } else if (payload.toId) {
    // Envoyer à la room personnelle du destinataire
    io.to(`user:${payload.toId}`).emit(messageType, {
      fromId: currentUserId,
      fromName: sender.name,
    });
  }
}

// ─────────────────────────────────────────────────────────
// CRÉER UN GROUPE DE DISCUSSION
// cours : io.to(room).emit(ev, data) — rooms personnelles des membres
// ─────────────────────────────────────────────────────────
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

  // Notifier tous les membres via leurs rooms personnelles
  const allMemberIds = new Set([currentUserId, ...invitedMemberIds]);
  for (const uid of allMemberIds) {
    io.to(`user:${uid}`).emit('discussion_group_created', newGroup);
  }

  // Push pour les invités
  for (const invitedId of invitedMemberIds) {
    deliverPushNotificationToUser(
      invitedId,
      'AVENIR — Nouveau groupe de discussion',
      `Vous avez été invité au groupe "${groupName}" par ${creator.name}`,
      `group-${newGroup.id}`
    );
  }
}

// ─────────────────────────────────────────────────────────
// REJOINDRE UN GROUPE DE DISCUSSION
// cours : socket.join(room) + socket.to(room).emit(ev, data)
// ─────────────────────────────────────────────────────────
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

  // Rejoindre la room du groupe
  // cours : socket.join(room)
  socket.join(`group:${groupId}`);

  // Notifier tous les membres du groupe
  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_joined', {
      groupId,
      userId: currentUserId,
      userName: actor.name,
      group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'joined', actor.name, currentUserId, group);
}

// ─────────────────────────────────────────────────────────
// SE CONNECTER À UN GROUPE (activer la room)
// cours : socket.join(room)
// ─────────────────────────────────────────────────────────
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

  // Rejoindre la room du groupe pour les messages temps réel
  socket.join(`group:${groupId}`);

  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_connected', {
      groupId,
      userId: currentUserId,
      userName: actor.name,
      group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'connected', actor.name, currentUserId, group);
}

// ─────────────────────────────────────────────────────────
// SE DÉCONNECTER D'UN GROUPE (quitter la room)
// cours : socket.leave(room)
// ─────────────────────────────────────────────────────────
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

  // Quitter la room socket.io du groupe
  // cours : socket.leave(room)
  socket.leave(`group:${groupId}`);

  const allParticipants = new Set([group.createdBy, ...group.memberIds]);
  for (const uid of allParticipants) {
    io.to(`user:${uid}`).emit('discussion_group_member_disconnected', {
      groupId,
      userId: currentUserId,
      userName: actor.name,
      group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'disconnected', actor.name, currentUserId, group);
}

// ─────────────────────────────────────────────────────────
// QUITTER UN GROUPE DÉFINITIVEMENT
// cours : socket.leave(room)
// ─────────────────────────────────────────────────────────
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
      groupId,
      userId: currentUserId,
      userName: actor.name,
      group,
    });
  }

  broadcastGroupSystemEvent(io, groupId, group.memberIds, group.createdBy, 'left', actor.name, currentUserId, group);
}

// ─────────────────────────────────────────────────────────
// TYPING DANS UN GROUPE DE DISCUSSION
// cours : socket.to(room).emit(ev, data)
// ─────────────────────────────────────────────────────────
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

  // Envoyer à la room du groupe, sauf l'émetteur
  // cours : socket.to(room).emit(ev, data)
  socket.to(`group:${groupId}`).emit(messageType, {
    groupId,
    fromId: currentUserId,
    fromName: actor.name,
  });
}

// ─────────────────────────────────────────────────────────
// MESSAGE DANS UN GROUPE DE DISCUSSION
// cours : io.to(room).emit(ev, data)
// ─────────────────────────────────────────────────────────
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

  // Broadcast à tous les membres connectés à la room du groupe
  // cours : io.to(room).emit(ev, data)
  io.to(`group:${groupId}`).emit('discussion_group_message', groupMsg);

  // Push pour les membres absents de la room
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
