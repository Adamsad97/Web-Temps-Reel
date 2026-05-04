import { addNotification, findDiscussionGroupById } from '../db';
import { sendSSEToUser } from '../sse';
import { sendWebPushToUser } from '../webpush';
import { broadcastToConnectedUsers } from './utils';
import { PUSH_NOTIFICATION_BODY_MAX_LENGTH } from './constants';

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
