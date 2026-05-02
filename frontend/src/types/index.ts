export type Role = 'client' | 'conseiller' | 'directeur';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Message {
  id: string;
  fromId: string;
  fromName?: string;
  fromRole?: Role;
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

export interface NewsItem {
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

export interface Contact {
  id: string;
  name: string;
  role: Role;
  lastMsg?: Message;
}
