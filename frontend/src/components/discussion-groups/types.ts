import type { DiscussionGroupMessage } from '@/types';

export interface SystemEventItem {
  id: string;
  eventType: 'joined' | 'left' | 'connected' | 'disconnected';
  actorUserId: string;
  actorUserName: string;
  createdAt: string;
}

export type ChatItem =
  | { kind: 'message'; message: DiscussionGroupMessage }
  | { kind: 'system'; systemEvent: SystemEventItem };
