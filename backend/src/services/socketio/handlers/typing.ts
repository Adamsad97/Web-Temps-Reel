import { Server, Socket } from 'socket.io';
import { findUserById } from '../../db';

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
    socket.to('canal:interne').emit(messageType, {
      fromId: currentUserId,
      fromName: sender.name,
      channel: 'group',
    });
  } else if (payload.toId) {
    io.to(`user:${payload.toId}`).emit(messageType, {
      fromId: currentUserId,
      fromName: sender.name,
    });
  }
}
