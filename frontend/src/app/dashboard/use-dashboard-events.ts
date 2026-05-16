import { useCallback } from 'react';
import { Message, GroupMessage, DiscussionGroupMessage, Notification } from '@/types';
import { MESSAGE_PREVIEW_MAX_LENGTH, TYPING_INDICATOR_TIMEOUT_MS } from './constants';
import { addToast } from './utils';
import type { ToastItem } from '@/components/Toast';

interface UseDashboardEventsProps {
  currentUserId: string;  // ← utilisé pour ne pas notifier l'expéditeur de son propre message
  onPrivateMessage: (msg: Message & { fromName?: string; fromRole?: string }) => void;
  onGroupMessage: (msg: GroupMessage) => void;
  onTypingUser: (userId: string) => void;
  onStopTypingUser: () => void;
  onGroupTyping: (name: string) => void;
  onStopGroupTyping: (name: string) => void;
  onDiscussionEvent: (type: string, payload: Record<string, unknown>) => void;
  setToasts: React.Dispatch<React.SetStateAction<ToastItem[]>>;
  activeTabRef: React.MutableRefObject<'news' | 'messages' | 'group' | 'discussions'>;
  selectedContactRef: React.MutableRefObject<{ id: string; name: string; role: 'client' | 'conseiller' | 'directeur'; lastMsg?: Message } | null>;
}

export function useDashboardEvents({
  currentUserId,
  onPrivateMessage,
  onGroupMessage,
  onTypingUser,
  onStopTypingUser,
  onGroupTyping,
  onStopGroupTyping,
  onDiscussionEvent,
  setToasts,
  activeTabRef,
  selectedContactRef,
}: UseDashboardEventsProps) {
  return useCallback((msg: { type: string; payload: unknown }) => {
    const payload = msg.payload as Record<string, unknown>;

    // ── Message privé ───────────────────────────────────────────
    if (msg.type === 'private_message') {
      const privateMessage = msg.payload as Message & { fromName?: string; fromRole?: string };
      onPrivateMessage(privateMessage);

      // Toast uniquement chez le destinataire (pas chez l'expéditeur)
      const isSentByMe = privateMessage.fromId === currentUserId;
      const isViewingThisConversation =
        activeTabRef.current === 'messages' &&
        selectedContactRef.current?.id === privateMessage.fromId;

      if (!isSentByMe && !isViewingThisConversation) {
        addToast(setToasts, {
          title: privateMessage.fromName || 'Message',
          body: (privateMessage.content || '').slice(0, MESSAGE_PREVIEW_MAX_LENGTH),
          icon: '💬',
          kind: 'msg',
        });
      }
      return;
    }

    // ── Message canal interne ───────────────────────────────────
    if (msg.type === 'group_message') {
      const groupMessage = msg.payload as GroupMessage;
      onGroupMessage(groupMessage);

      // Toast uniquement chez les autres membres (pas chez l'expéditeur)
      const isSentByMe = groupMessage.fromId === currentUserId;
      if (!isSentByMe && activeTabRef.current !== 'group') {
        addToast(setToasts, {
          title: `Canal Interne — ${groupMessage.fromName}`,
          body: (groupMessage.content || '').slice(0, MESSAGE_PREVIEW_MAX_LENGTH),
          icon: '🏛',
          kind: 'group',
        });
      }
      return;
    }

    // ── Événements groupes de discussion ───────────────────────
    if ([
      'discussion_group_created',
      'discussion_group_member_joined',
      'discussion_group_member_left',
      'discussion_group_member_connected',
      'discussion_group_member_disconnected',
      'discussion_group_message',
      'discussion_group_typing',
      'discussion_group_stop_typing',
      'discussion_group_system',
      'discussion_group_message_edited',
      'discussion_group_message_deleted',
    ].includes(msg.type)) {
      onDiscussionEvent(msg.type, payload);

      // Toast pour les événements système join/leave (jamais pour soi-même)
      if (msg.type === 'discussion_group_system') {
        const { eventType, actorUserId, actorUserName } = payload as {
          eventType: string;
          actorUserId: string;
          actorUserName: string;
        };
        const isMe = actorUserId === currentUserId;
        if (!isMe && (eventType === 'joined' || eventType === 'left')) {
          addToast(setToasts, {
            title: 'Groupe de discussion',
            body: eventType === 'joined'
              ? `${actorUserName} vient de rejoindre la discussion`
              : `${actorUserName} a quitté la discussion`,
            icon: '✦',
            kind: 'sys',
          });
        }
      }

      // Toast pour les messages de groupe (pas chez l'expéditeur, pas si déjà dans l'onglet)
      if (msg.type === 'discussion_group_message') {
        const discussionMessage = payload as unknown as DiscussionGroupMessage;
        const isSentByMe = discussionMessage.fromId === currentUserId;
        if (!isSentByMe && activeTabRef.current !== 'discussions') {
          addToast(setToasts, {
            title: `Groupe — ${discussionMessage.fromName}`,
            body: (discussionMessage.content || '').slice(0, MESSAGE_PREVIEW_MAX_LENGTH),
            icon: '💬',
            kind: 'group',
          });
        }
      }
      return;
    }

    // ── Indicateurs de frappe ───────────────────────────────────
    if (msg.type === 'typing') {
      if (payload.channel === 'group') {
        const senderName = payload.fromName as string;
        onGroupTyping(senderName);
        setTimeout(() => onStopGroupTyping(senderName), TYPING_INDICATOR_TIMEOUT_MS);
      } else {
        onTypingUser(payload.fromId as string);
        setTimeout(() => onStopTypingUser(), TYPING_INDICATOR_TIMEOUT_MS);
      }
      return;
    }

    if (msg.type === 'stop_typing') {
      if (payload.channel === 'group') onStopGroupTyping(payload.fromName as string);
      else onStopTypingUser();
    }
  }, [
    currentUserId,
    onPrivateMessage, onGroupMessage,
    onTypingUser, onStopTypingUser,
    onGroupTyping, onStopGroupTyping,
    onDiscussionEvent,
    setToasts, activeTabRef, selectedContactRef,
  ]);
}
