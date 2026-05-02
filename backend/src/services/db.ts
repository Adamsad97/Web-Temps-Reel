import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { User, Message, GroupMessage, News, Notification } from '../types';

export const users: User[] = [];
export const messages: Message[] = [];
export const groupMessages: GroupMessage[] = [];
export const news: News[] = [];
export const notifications: Notification[] = [];

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

  const seedNews: News[] = [
    {
      id: uuidv4(),
      authorId: 'user-directeur-01',
      authorName: 'Claire Fontaine',
      title: 'Nouveau taux d\'épargne AVENIR+',
      content: 'Nous avons le plaisir de vous annoncer que notre livret AVENIR+ offre désormais un taux de 4,5% net. Profitez-en dès maintenant via votre espace client.',
      createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    },
    {
      id: uuidv4(),
      authorId: 'user-conseiller-01',
      authorName: 'Bruno Dupont',
      title: 'Maintenance planifiée — dimanche 3h-5h',
      content: 'Une maintenance technique est prévue ce dimanche de 3h à 5h du matin. Les virements resteront disponibles sans interruption.',
      createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    },
  ];

  news.push(...seedNews);

  const seedPrivateMessages: Message[] = [
    {
      id: uuidv4(),
      fromId: 'user-client-01',
      toId: 'user-conseiller-01',
      content: 'Bonjour Bruno, j\'aimerais en savoir plus sur vos offres d\'investissement.',
      createdAt: new Date(Date.now() - 1_800_000).toISOString(),
      type: 'private',
    },
    {
      id: uuidv4(),
      fromId: 'user-conseiller-01',
      toId: 'user-client-01',
      content: 'Bonjour Alice ! Avec plaisir. Je peux vous proposer notre portefeuille AVENIR Équilibre, avec un rendement moyen de 6% sur 3 ans. Souhaitez-vous un rendez-vous ?',
      createdAt: new Date(Date.now() - 900_000).toISOString(),
      type: 'private',
    },
  ];

  messages.push(...seedPrivateMessages);

  const seedGroupMessages: GroupMessage[] = [
    {
      id: uuidv4(),
      fromId: 'user-directeur-01',
      fromName: 'Claire Fontaine',
      fromRole: 'directeur',
      content: 'Bonjour à tous, réunion d\'équipe demain à 9h pour la revue trimestrielle.',
      createdAt: new Date(Date.now() - 5_400_000).toISOString(),
      type: 'group',
    },
    {
      id: uuidv4(),
      fromId: 'user-conseiller-01',
      fromName: 'Bruno Dupont',
      fromRole: 'conseiller',
      content: 'Reçu ! Je prépare les dossiers clients en cours.',
      createdAt: new Date(Date.now() - 5_000_000).toISOString(),
      type: 'group',
    },
    {
      id: uuidv4(),
      fromId: 'user-conseiller-02',
      fromName: 'David Moreau',
      fromRole: 'conseiller',
      content: 'J\'ai 3 nouvelles demandes de prêt à valider, je les transmets ce soir.',
      createdAt: new Date(Date.now() - 4_800_000).toISOString(),
      type: 'group',
    },
  ];

  groupMessages.push(...seedGroupMessages);
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
