import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, STAFF_ROLES, PUSH_NOTIFICATION_BODY_MAX_LENGTH } from './socketio/constants';
import { AuthPayload } from '../types';
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
  handleEditDiscussionGroupMessage,
  handleDeleteDiscussionGroupMessage,
} from './socketio/handlers/index';

// Extension du type Socket pour y attacher userId et role après auth
export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
}

export function setupSocketIO(io: Server): void {

  // ──────────────────────────────────────────────
  // MIDDLEWARE D'AUTHENTIFICATION
  // cours : io.use((socket, next) => { ... next() })
  // Le token JWT est transmis via socket.handshake.auth.token
  // ──────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      return next(new Error('401 - Unauthorized'));
    }
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as AuthPayload;
      (socket as AuthenticatedSocket).userId   = decoded.userId;
      (socket as AuthenticatedSocket).userRole = decoded.role;
      next();
    } catch {
      next(new Error('401 - Unauthorized'));
    }
  });

  // ──────────────────────────────────────────────
  // CONNEXION
  // cours : io.on('connection', (socket) => { ... })
  // ──────────────────────────────────────────────
  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const { userId, userRole } = authSocket;

    // Rejoindre automatiquement une room personnelle (pour les messages ciblés)
    // cours : socket.join(room)
    socket.join(`user:${userId}`);

    // Le staff rejoint aussi la room du canal interne (group)
    if (STAFF_ROLES.includes(userRole as typeof STAFF_ROLES[number])) {
      socket.join('canal:interne');
    }

    // Informer le client que la connexion est établie
    // cours : socket.emit(ev, data)
    socket.emit('auth_ok', { userId, role: userRole });

    // ── MESSAGES PRIVÉS ──────────────────────────
    socket.on('private_message', (payload: { toId: string; content: string }) => {
      handlePrivateMessage(io, socket, payload, userId);
    });

    // ── CANAL INTERNE (conseillers + directeurs) ─
    socket.on('group_message', (payload: { content: string }) => {
      handleGroupMessage(io, payload, userId);
    });

    // ── INDICATEUR "EN TRAIN D'ÉCRIRE" ───────────
    socket.on('typing',      (payload: { toId?: string; channel?: string }) => {
      handleTypingIndicator(io, socket, 'typing', payload, userId);
    });
    socket.on('stop_typing', (payload: { toId?: string; channel?: string }) => {
      handleTypingIndicator(io, socket, 'stop_typing', payload, userId);
    });

    // ── GROUPES DE DISCUSSION ────────────────────
    socket.on('create_discussion_group', (payload: { name: string; memberIds: string[] }) => {
      handleCreateDiscussionGroup(io, socket, payload, userId);
    });
    socket.on('join_discussion_group', (payload: { groupId: string }) => {
      handleJoinDiscussionGroup(io, socket, payload, userId);
    });
    socket.on('connect_discussion_group', (payload: { groupId: string }) => {
      handleConnectDiscussionGroup(io, socket, payload, userId);
    });
    socket.on('disconnect_discussion_group', (payload: { groupId: string }) => {
      handleDisconnectDiscussionGroup(io, socket, payload, userId);
    });
    socket.on('leave_discussion_group', (payload: { groupId: string }) => {
      handleLeaveDiscussionGroup(io, socket, payload, userId);
    });
    socket.on('discussion_group_typing', (payload: { groupId: string }) => {
      handleDiscussionGroupTyping(io, socket, 'discussion_group_typing', payload, userId);
    });
    socket.on('discussion_group_stop_typing', (payload: { groupId: string }) => {
      handleDiscussionGroupTyping(io, socket, 'discussion_group_stop_typing', payload, userId);
    });
    socket.on('discussion_group_message', (payload: { groupId: string; content: string }) => {
      handleDiscussionGroupMessage(io, socket, payload, userId);
    });
    socket.on('edit_discussion_group_message', (payload: { messageId: string; content: string; groupId: string }) => {
      handleEditDiscussionGroupMessage(io, socket, payload, userId);
    });
    socket.on('delete_discussion_group_message', (payload: { messageId: string; groupId: string }) => {
      handleDeleteDiscussionGroupMessage(io, socket, payload, userId);
    });

    // ── DÉCONNEXION ──────────────────────────────
    socket.on('disconnect', () => {
      // socket.io gère automatiquement le leave des rooms
    });
  });
}
