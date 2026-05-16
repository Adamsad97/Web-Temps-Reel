'use client';
import { useState, useEffect } from 'react';
import { DiscussionGroup } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import GroupList from './discussion-groups/GroupList';
import CreateGroupModal from './discussion-groups/CreateGroupModal';
import GroupDiscussionDetail from './discussion-groups/GroupDiscussionDetail';
import EmptyGroupPlaceholder from './discussion-groups/EmptyGroupPlaceholder';
import { useDiscussionEvents } from './discussion-groups/use-discussion-events';

interface DiscussionGroupsProps {
  groups: DiscussionGroup[];
  onGroupsChange: (updater: DiscussionGroup[] | ((prev: DiscussionGroup[]) => DiscussionGroup[])) => void;
  onSend: (eventType: string, payload: Record<string, unknown>) => void;
  latestRealtimeEvent?: { type: string; payload: Record<string, unknown> };
}

export default function DiscussionGroups({ groups, onGroupsChange, onSend, latestRealtimeEvent }: DiscussionGroupsProps) {
  const { token, user } = useAuth();
  const isDirecteur  = user?.role === 'directeur';
  const currentUserId = user?.id ?? '';

  const [selectedGroupId, setSelectedGroupId]           = useState<string | null>(null);

  // Le directeur rejoint automatiquement la room Socket.IO quand il sélectionne un groupe
  // afin de recevoir les messages et les indicateurs de frappe en temps réel
  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (isDirecteur) {
      onSend('connect_discussion_group', { groupId });
    }
  };
  const [showCreateModal, setShowCreateModal]           = useState(false);
  const [availableConseillers, setAvailableConseillers] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/messages/discussion-groups', token)
      .then(fetched => onGroupsChange(fetched))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!isDirecteur) return;
    apiFetch<{ id: string; name: string }[]>('/api/messages/discussion-groups/conseillers', token)
      .then(setAvailableConseillers)
      .catch(() => {});
  }, [token, isDirecteur]);

  const { latestIncomingGroupMessage, latestEditedGroupMessage, latestDeletedGroupMessageId, typingNamesByGroupId, latestSystemEventByGroupId } = useDiscussionEvents({
    latestRealtimeEvent,
    onGroupsChange,
    onNewGroupSelected: (groupId: string) => handleSelectGroup(groupId),
  });

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <GroupList
        groups={groups}
        selectedGroupId={selectedGroupId}
        currentUserId={currentUserId}
        isDirecteur={isDirecteur}
        typingNamesByGroupId={typingNamesByGroupId}
        onSelect={(groupId: string) => handleSelectGroup(groupId)}
        onJoin={groupId => onSend('join_discussion_group', { groupId })}
        onCreateClick={() => setShowCreateModal(true)}
      />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedGroup ? (
          <GroupDiscussionDetail
            group={selectedGroup}
            currentUserId={currentUserId}
            isDirecteur={isDirecteur}
            onConnect={() => onSend('connect_discussion_group', { groupId: selectedGroup.id })}
            onDisconnect={() => onSend('disconnect_discussion_group', { groupId: selectedGroup.id })}
            onLeave={() => { onSend('leave_discussion_group', { groupId: selectedGroup.id }); setSelectedGroupId(null); }}
            onSendMessage={msgContent => onSend('discussion_group_message', { groupId: selectedGroup.id, content: msgContent })}
            onEditMessage={(messageId, msgContent) => onSend('edit_discussion_group_message', { messageId, content: msgContent, groupId: selectedGroup.id })}
            onDeleteMessage={messageId => onSend('delete_discussion_group_message', { messageId, groupId: selectedGroup.id })}
            onStartTyping={() => onSend('discussion_group_typing', { groupId: selectedGroup.id })}
            onStopTyping={() => onSend('discussion_group_stop_typing', { groupId: selectedGroup.id })}
            latestIncomingMessage={latestIncomingGroupMessage}
            latestEditedMessage={latestEditedGroupMessage}
            latestDeletedMessageId={latestDeletedGroupMessageId}
            currentlyTypingNames={typingNamesByGroupId[selectedGroup.id] || []}
            latestSystemEvent={latestSystemEventByGroupId[selectedGroup.id]}
          />
        ) : (
          <EmptyGroupPlaceholder isDirecteur={isDirecteur} />
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          availableConseillers={availableConseillers}
          onClose={() => setShowCreateModal(false)}
          onCreate={(name, memberIds) => {
            onSend('create_discussion_group', { name, memberIds });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
