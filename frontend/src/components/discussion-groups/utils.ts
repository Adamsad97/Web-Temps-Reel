import type { SystemEventItem } from './types';

export function getSystemPillClassName(eventType: string): string {
  if (eventType === 'joined' || eventType === 'connected') return 'sys-pill join';
  if (eventType === 'left') return 'sys-pill leave';
  return 'sys-pill';
}

export function buildSystemEventLabel(
  eventType: string,
  actorUserName: string,
  actorUserId: string,
  currentUserId: string
): string {
  const isCurrentUserTheActor = actorUserId === currentUserId;

  if (isCurrentUserTheActor) {
    switch (eventType) {
      case 'joined':      return '✦ Vous avez rejoint la discussion';
      case 'left':        return '✦ Vous avez quitté la discussion';
      case 'connected':   return '● Vous vous êtes connecté au groupe';
      case 'disconnected':return '○ Vous vous êtes déconnecté du groupe';
      default:            return '● Action effectuée';
    }
  } else {
    switch (eventType) {
      case 'joined':      return `✦ ${actorUserName} vient de rejoindre la discussion`;
      case 'left':        return `✦ ${actorUserName} a quitté la discussion`;
      case 'connected':   return `● ${actorUserName} s'est connecté au groupe`;
      case 'disconnected':return `○ ${actorUserName} s'est déconnecté du groupe`;
      default:            return `● ${actorUserName}`;
    }
  }
}

export function formatTypingText(names: string[]): string {
  return names.length === 1
    ? `${names[0]} est en train d'écrire un message…`
    : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]} écrivent un message…`;
}

export function toSystemEventItem(event: {
  groupId: string;
  eventType: string;
  actorUserId: string;
  actorUserName: string;
  createdAt: string;
}): SystemEventItem {
  return {
    id: `${Date.now()}-${Math.random()}`,
    eventType: event.eventType as SystemEventItem['eventType'],
    actorUserId: event.actorUserId,
    actorUserName: event.actorUserName,
    createdAt: event.createdAt,
  };
}
