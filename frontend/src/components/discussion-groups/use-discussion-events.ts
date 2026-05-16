import { useEffect, useRef, useState } from 'react';
import { DiscussionGroup, DiscussionGroupMessage } from '@/types';
import { toSystemEventItem } from './utils';
import type { SystemEventItem } from './types';

const TYPING_INDICATOR_TIMEOUT_MS = 3000;

interface UseDiscussionEventsProps {
  latestRealtimeEvent?: { type: string; payload: Record<string, unknown> };
  onGroupsChange: (updater: DiscussionGroup[] | ((prev: DiscussionGroup[]) => DiscussionGroup[])) => void;
  onNewGroupSelected: (groupId: string) => void;
}

export function useDiscussionEvents({
  latestRealtimeEvent,
  onGroupsChange,
  onNewGroupSelected,
}: UseDiscussionEventsProps) {
  const [latestIncomingGroupMessage, setLatestIncomingGroupMessage]     = useState<DiscussionGroupMessage | undefined>();
  const [latestEditedGroupMessage, setLatestEditedGroupMessage]         = useState<DiscussionGroupMessage | undefined>();
  const [latestDeletedGroupMessageId, setLatestDeletedGroupMessageId]   = useState<string | undefined>();
  const [typingNamesByGroupId, setTypingNamesByGroupId]             = useState<Record<string, string[]>>({});
  const [latestSystemEventByGroupId, setLatestSystemEventByGroupId] = useState<Record<string, SystemEventItem | undefined>>({});
  const typingTimeoutsByKey = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!latestRealtimeEvent) return;
    const { type: eventType, payload: eventPayload } = latestRealtimeEvent;

    if (eventType === 'discussion_group_created') {
      const newGroup = eventPayload as unknown as DiscussionGroup;
      onGroupsChange(prev =>
        prev.some(g => g.id === newGroup.id) ? prev : [...prev, newGroup]
      );
      onNewGroupSelected(newGroup.id);
      return;
    }

    if (['discussion_group_member_joined', 'discussion_group_member_left',
         'discussion_group_member_connected', 'discussion_group_member_disconnected'].includes(eventType)) {
      const updatedGroup = (eventPayload as { group: DiscussionGroup }).group;
      onGroupsChange(prev =>
        prev.map(g => {
          if (g.id !== updatedGroup.id) return g;
          return {
            ...g,
            ...updatedGroup,
            // Préserver members (enrichi par REST) si le WS ne l'envoie pas
            members: updatedGroup.members ?? g.members,
          };
        })
      );
      return;
    }

    if (eventType === 'discussion_group_message') {
      setLatestIncomingGroupMessage(eventPayload as unknown as DiscussionGroupMessage);
      return;
    }

    if (eventType === 'discussion_group_message_edited') {
      setLatestEditedGroupMessage(eventPayload as unknown as DiscussionGroupMessage);
      return;
    }

    if (eventType === 'discussion_group_message_deleted') {
      const { messageId } = eventPayload as { messageId: string; groupId: string };
      setLatestDeletedGroupMessageId(messageId);
      return;
    }

    if (eventType === 'discussion_group_system') {
      const { groupId, eventType: sysType, actorUserId, actorUserName, createdAt } = eventPayload as {
        groupId: string; eventType: string; actorUserId: string; actorUserName: string; createdAt: string;
      };
      const systemEvent = toSystemEventItem({ groupId, eventType: sysType, actorUserId, actorUserName, createdAt });
      setLatestSystemEventByGroupId(prev => ({ ...prev, [groupId]: systemEvent }));
      return;
    }

    if (eventType === 'discussion_group_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      setTypingNamesByGroupId(prev => {
        const current = prev[groupId] || [];
        return current.includes(fromName) ? prev : { ...prev, [groupId]: [...current, fromName] };
      });
      const key = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[key]) clearTimeout(typingTimeoutsByKey.current[key]);
      typingTimeoutsByKey.current[key] = setTimeout(() => {
        setTypingNamesByGroupId(prev => ({
          ...prev,
          [groupId]: (prev[groupId] || []).filter(n => n !== fromName),
        }));
      }, TYPING_INDICATOR_TIMEOUT_MS);
      return;
    }

    if (eventType === 'discussion_group_stop_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      const key = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[key]) clearTimeout(typingTimeoutsByKey.current[key]);
      setTypingNamesByGroupId(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(n => n !== fromName),
      }));
    }
  }, [latestRealtimeEvent]);

  return { latestIncomingGroupMessage, latestEditedGroupMessage, latestDeletedGroupMessageId, typingNamesByGroupId, latestSystemEventByGroupId };
}
