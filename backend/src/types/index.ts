export type Role = 'client' | 'conseiller' | 'directeur';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  createdAt: string;
  type: 'private';
}

export interface GroupMessage {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: Role;
  content: string;
  createdAt: string;
  type: 'group';
}

export interface News {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'news';
  content: string;
  read: boolean;
  createdAt: string;
  refId?: string;
}

export interface AuthPayload {
  userId: string;
  role: Role;
}

export interface WSMessage {
  type:
    |'private_message'
    | 'group_message'
    | 'typing'
    | 'stop_typing'
    | 'auth'
    | 'auth_ok'
    | 'error'
    | 'discussion_group_created'
    | 'discussion_group_updated'
    | 'discussion_group_member_joined'
    | 'discussion_group_member_left'
    | 'discussion_group_member_connected'
    | 'discussion_group_member_disconnected'
    | 'discussion_group_message';
  payload: unknown;
}

export interface DiscussionGroup {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  memberIds: string[]; // conseillers invités
  connectedMemberIds: string[]; // conseillers actuellement connectés au groupe
}

export interface DiscussionGroupMessage {
  id: string;
  groupId: string;
  fromId: string;
  fromName: string;
  fromRole: Role;
  content: string;
  createdAt: string;
  type: 'discussion_group';
}
