import { v4 as uuidv4 } from 'uuid';
import { Server, Socket } from 'socket.io';
import { findUserById, messages } from '../../db';
import { deliverPushNotificationToUser } from '../notifications';
import { PUSH_NOTIFICATION_BODY_MAX_LENGTH } from '../constants';
import type { Message } from '../../../types';

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

  io.to(`user:${recipientId}`).emit('private_message', outgoing);
  socket.emit('private_message', outgoing);

  deliverPushNotificationToUser(
    recipientId,
    `Message de ${sender.name}`,
    messageContent.slice(0, PUSH_NOTIFICATION_BODY_MAX_LENGTH),
    `private-msg-from-${currentUserId}`
  );
}
