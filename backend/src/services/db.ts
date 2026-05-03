import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, Message, GroupMessage, News, Notification, DiscussionGroup, DiscussionGroupMessage } from '../types';

export const users: User[] = [];
export const messages: Message[] = [];
export const groupMessages: GroupMessage[] = [];
export const news: News[] = [];
export const notifications: Notification[] = [];
export const discussionGroups: DiscussionGroup[] = [];
export const discussionGroupMessages: DiscussionGroupMessage[] = [];

const BCRYPT_SALT_ROUNDS = 10;

export async function seedDatabase(): Promise<void> {
  const hashPassword = (plainPassword: string) => bcrypt.hashSync(plainPassword, BCRYPT_SALT_ROUNDS);
  const currentTimestamp = new Date().toISOString();

  const primaryTestAccounts: User[] = [
    {
      id: 'user-client-01',
      email: 'client@avenir.fr',
      password: hashPassword('Client1234!'),
      name: 'Alice Martin',
      role: 'client',
      createdAt: currentTimestamp,
    },
    {
      id: 'user-conseiller-01',
      email: 'conseiller@avenir.fr',
      password: hashPassword('Conseiller1234!'),
      name: 'Bruno Dupont',
      role: 'conseiller',
      createdAt: currentTimestamp,
    },
    {
      id: 'user-directeur-01',
      email: 'directeur@avenir.fr',
      password: hashPassword('Directeur1234!'),
      name: 'Claire Fontaine',
      role: 'directeur',
      createdAt: currentTimestamp,
    },
  ];

  const additionalClients: User[] = [
    { id: uuidv4(), email: 'marc@avenir.fr', password: hashPassword('pass'), name: 'Marc Leblanc', role: 'client', createdAt: currentTimestamp },
    { id: uuidv4(), email: 'sophie@avenir.fr', password: hashPassword('pass'), name: 'Sophie Bernard', role: 'client', createdAt: currentTimestamp },
  ];

  const secondConseiller: User = {
    id: 'user-conseiller-02',
    email: 'conseiller2@avenir.fr',
    password: hashPassword('pass'),
    name: 'David Moreau',
    role: 'conseiller',
    createdAt: currentTimestamp,
  };

  users.push(...primaryTestAccounts, ...additionalClients, secondConseiller);
}

export const findUserById = (userId: string): User | undefined => users.find(u => u.id === userId);
export const findUserByEmail = (email: string): User | undefined => users.find(u => u.email === email);

export function addNotification(userId: string, type: 'message' | 'news', content: string, refId?: string): Notification {
  const newNotification: Notification = {
    id: uuidv4(),
    userId,
    type,
    content,
    read: false,
    createdAt: new Date().toISOString(),
    refId,
  };
  notifications.push(newNotification);
  return newNotification;
}

export function createDiscussionGroup(name: string, createdBy: string, createdByName: string, memberIds: string[]): DiscussionGroup {
  const group: DiscussionGroup = {
    id: uuidv4(),
    name,
    createdBy,
    createdByName,
    createdAt: new Date().toISOString(),
    memberIds,
    connectedMemberIds: [],
  };
  discussionGroups.push(group);
  return group;
}

export function findDiscussionGroupById(groupId: string): DiscussionGroup | undefined {
  return discussionGroups.find(g => g.id === groupId);
}

export function getDiscussionGroupMessages(groupId: string): DiscussionGroupMessage[] {
  return discussionGroupMessages.filter(m => m.groupId === groupId);
}
