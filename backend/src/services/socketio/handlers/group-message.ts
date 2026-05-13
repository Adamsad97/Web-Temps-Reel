import { v4 as uuidv4 } from 'uuid';
import { Server } from 'socket.io';
import { findUserById, groupMessages, users } from '../../db';
import { deliverPushNotificationToUser } from '../notifications';
import { STAFF_ROLES, PUSH_NOTIFICATION_BODY_MAX_LENGTH } from '../constants';
import type { GroupMessage } from '../../../types';

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

  io.to('canal:interne').emit('group_message', groupMessage);

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
