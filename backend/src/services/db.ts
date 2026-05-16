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
      email: 'pascal@avenir.fr',
      password: hashPassword('Pascal1234!'),
      name: 'Florent PASCAL',
      role: 'client',
      createdAt: currentTimestamp,
    },
    {
      id: 'user-conseiller-01',
      email: 'dupont@avenir.fr',
      password: hashPassword('Dupont1234!'),
      name: 'Izaac DUPONT',
      role: 'conseiller',
      createdAt: currentTimestamp,
    },
    {
      id: 'user-directeur-01',
      email: 'diawara@avenir.fr',
      password: hashPassword('Diawara1234!'),
      name: 'Adama DIAWARA',
      role: 'directeur',
      createdAt: currentTimestamp,
    },
  ];

 

  users.push(...primaryTestAccounts);
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
    // Inclure le créateur (directeur) dans memberIds pour cohérence du compteur
    memberIds: memberIds.includes(createdBy) ? memberIds : [createdBy, ...memberIds],
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

export function editDiscussionGroupMessage(
  messageId: string,
  newContent: string,
  requesterId: string
): DiscussionGroupMessage | null {
  const msg = discussionGroupMessages.find(m => m.id === messageId);
  if (!msg) return null;
  if (msg.fromId !== requesterId) return null; // seul l'auteur peut modifier
  if (msg.deletedAt) return null;              // impossible de modifier un message supprimé
  msg.content  = newContent;
  msg.editedAt = new Date().toISOString();
  return msg;
}

export function deleteDiscussionGroupMessage(
  messageId: string,
  requesterId: string
): DiscussionGroupMessage | null {
  const msg = discussionGroupMessages.find(m => m.id === messageId);
  if (!msg) return null;
  if (msg.fromId !== requesterId) return null; // seul l'auteur peut supprimer
  msg.deletedAt = new Date().toISOString();
  msg.content   = ''; // vider le contenu
  return msg;
}
