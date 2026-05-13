import { addNotification, findDiscussionGroupById } from '../db';
import { sendSSEToUser } from '../sse';
import { sendWebPushToUser } from '../webpush';
import { PUSH_NOTIFICATION_BODY_MAX_LENGTH } from './constants';
import { Server } from 'socket.io';

export function deliverPushNotificationToUser(
  recipientUserId: string,
  notificationTitle: string,
  notificationBody: string,
  notificationTag?: string
): void {
  const savedNotification = addNotification(recipientUserId, 'message', notificationBody);
  sendSSEToUser(recipientUserId, 'notification', savedNotification);
  sendWebPushToUser(recipientUserId, notificationTitle, notificationBody, notificationTag).catch(() => {});
}

export function broadcastGroupSystemEvent(
  io: Server,
  groupId: string,
  memberIds: string[],
  groupCreatorId: string,
  eventType: string,
  actorUserName: string,
  actorUserId: string,
  updatedGroup: object
): void {
  const payload = {
    groupId,
    eventType,
    actorUserId,
    actorUserName,
    group: updatedGroup,
    createdAt: new Date().toISOString(),
  };

  // Envoyer à chaque membre via sa room personnelle
  // cours : socket.to(room).emit(ev, data)
  const recipients = new Set([groupCreatorId, ...memberIds]);
  for (const uid of recipients) {
    io.to(`user:${uid}`).emit('discussion_group_system', payload);
  }
}
