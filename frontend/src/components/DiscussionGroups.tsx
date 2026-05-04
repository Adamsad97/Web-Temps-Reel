'use client';
import { useState, useEffect, useRef } from 'react';
import { DiscussionGroup, DiscussionGroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import CreateGroupModal from './discussion-groups/CreateGroupModal';
import GroupDiscussionDetail from './discussion-groups/GroupDiscussionDetail';
import type { SystemEventItem } from './discussion-groups/types';
import { toSystemEventItem } from './discussion-groups/utils';

const TYPING_STOP_DELAY_MS = 2000;
const TYPING_INDICATOR_TIMEOUT_MS = 3000;

interface DiscussionGroupsProps {
  groups: DiscussionGroup[];
  onGroupsChange: (updater: DiscussionGroup[] | ((previous: DiscussionGroup[]) => DiscussionGroup[])) => void;
  onSend: (eventType: string, payload: Record<string, unknown>) => void;
  latestRealtimeEvent?: { type: string; payload: Record<string, unknown> };
}



export default function DiscussionGroups({
  groups,
  onGroupsChange,
  onSend,
  latestRealtimeEvent,
}: DiscussionGroupsProps) {
  const { token, user } = useAuth();
  const isDirecteur = user?.role === 'directeur';
  const currentUserId = user?.id ?? '';

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableConseillers, setAvailableConseillers] = useState<{ id: string; name: string }[]>([]);
  const [latestIncomingGroupMessage, setLatestIncomingGroupMessage] = useState<DiscussionGroupMessage | undefined>();
  const [typingNamesByGroupId, setTypingNamesByGroupId] = useState<Record<string, string[]>>({});
  const [latestSystemEventByGroupId, setLatestSystemEventByGroupId] = useState<Record<string, SystemEventItem | undefined>>({});
  const typingTimeoutsByKey = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/messages/discussion-groups', token)
      .then(fetchedGroups => onGroupsChange(fetchedGroups))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!isDirecteur) return;
    apiFetch<{ id: string; name: string }[]>('/api/messages/discussion-groups/conseillers', token)
      .then(setAvailableConseillers)
      .catch(() => {});
  }, [token, isDirecteur]);

  useEffect(() => {
    if (!latestRealtimeEvent) return;
    const { type: eventType, payload: eventPayload } = latestRealtimeEvent;

    if (eventType === 'discussion_group_created') {
      const newGroup = eventPayload as unknown as DiscussionGroup;
      onGroupsChange(previousGroups =>
        previousGroups.some(existingGroup => existingGroup.id === newGroup.id) ? previousGroups : [...previousGroups, newGroup]
      );
      setSelectedGroupId(newGroup.id);
      return;
    }

    if (['discussion_group_member_joined', 'discussion_group_member_left', 'discussion_group_member_connected', 'discussion_group_member_disconnected'].includes(eventType)) {
      const updatedGroup = (eventPayload as { group: DiscussionGroup }).group;
      onGroupsChange(previousGroups =>
        previousGroups.map(existingGroup => existingGroup.id === updatedGroup.id ? { ...existingGroup, ...updatedGroup } : existingGroup)
      );
      return;
    }

    if (eventType === 'discussion_group_message') {
      setLatestIncomingGroupMessage(eventPayload as unknown as DiscussionGroupMessage);
      return;
    }

    if (eventType === 'discussion_group_system') {
      const { groupId, eventType: systemEventType, actorUserId, actorUserName, createdAt } = eventPayload as {
        groupId: string;
        eventType: string;
        actorUserId: string;
        actorUserName: string;
        createdAt: string;
      };
      const systemEvent = toSystemEventItem({
        groupId,
        eventType: systemEventType,
        actorUserId,
        actorUserName,
        createdAt,
      });
      setLatestSystemEventByGroupId(previousEvents => ({ ...previousEvents, [groupId]: systemEvent }));
      return;
    }

    if (eventType === 'discussion_group_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      setTypingNamesByGroupId(previousTypingNames => {
        const currentNames = previousTypingNames[groupId] || [];
        return currentNames.includes(fromName) ? previousTypingNames : { ...previousTypingNames, [groupId]: [...currentNames, fromName] };
      });
      const timerKey = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[timerKey]) clearTimeout(typingTimeoutsByKey.current[timerKey]);
      typingTimeoutsByKey.current[timerKey] = setTimeout(() => {
        setTypingNamesByGroupId(previousTypingNames => ({
          ...previousTypingNames,
          [groupId]: (previousTypingNames[groupId] || []).filter(typingUserName => typingUserName !== fromName),
        }));
      }, TYPING_INDICATOR_TIMEOUT_MS);
      return;
    }

    if (eventType === 'discussion_group_stop_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      const timerKey = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[timerKey]) clearTimeout(typingTimeoutsByKey.current[timerKey]);
      setTypingNamesByGroupId(previousTypingNames => ({
        ...previousTypingNames,
        [groupId]: (previousTypingNames[groupId] || []).filter(typingUserName => typingUserName !== fromName),
      }));
      return;
    }
  }, [latestRealtimeEvent]);

  const selectedGroup = groups.find(group => group.id === selectedGroupId) ?? null;

  return (
    <div className="discussion-layout" style={{ display: 'flex', height: '100%' }}>
      <aside className="discussion-sidebar" style={{ width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Groupes de discussion</span>
          {isDirecteur && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bronze)', color: 'var(--slate-900)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >+</button>
          )}
        </div>

        <div className="discussion-group-list" style={{ flex: 1, overflowY: 'auto' }}>
          {groups.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.83rem' }}>
              {isDirecteur ? 'Créez votre premier groupe' : 'Aucun groupe disponible'}
            </div>
          )}
          {groups.map(group => {
            const isActiveGroup = group.id === selectedGroupId;
            const isGroupMember = group.memberIds.includes(currentUserId) || isDirecteur;
            const isConnected = group.connectedMemberIds.includes(currentUserId);
            const groupTypingNames = typingNamesByGroupId[group.id] || [];

            return (
              <div key={group.id} style={{ borderBottom: '1px solid var(--surface-alt)', background: isActiveGroup ? 'var(--bronze-subtle)' : 'transparent' }}>
                <button
                  onClick={() => setSelectedGroupId(group.id)}
                  style={{ width: '100%', textAlign: 'left', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderLeft: `3px solid ${isActiveGroup ? 'var(--bronze)' : 'transparent'}`, cursor: 'pointer', transition: 'all .15s' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: isActiveGroup ? 'var(--bronze)' : 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={isActiveGroup ? 'var(--slate-900)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="9" cy="7" r="4" stroke={isActiveGroup ? 'var(--slate-900)' : 'var(--text-muted)'} strokeWidth="2"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '.85rem', fontWeight: isActiveGroup ? 700 : 500, color: isActiveGroup ? 'var(--bronze-dark)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {group.name}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      {groupTypingNames.length > 0 ? (
                        <>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                            <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                            <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                          </div>
                          <span style={{ fontSize: '.7rem', color: 'var(--bronze)', fontStyle: 'italic' }}>
                            {groupTypingNames.length === 1 ? `${groupTypingNames[0]} écrit…` : 'Plusieurs personnes écrivent…'}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? 'var(--success)' : isGroupMember ? 'var(--bronze)' : 'var(--border)', flexShrink: 0 }}/>
                          <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                            {group.connectedMemberIds.length} connecté{group.connectedMemberIds.length > 1 ? 's' : ''}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
                {!isDirecteur && !isGroupMember && (
                  <div style={{ padding: '0 14px 10px' }}>
                    <button
                      onClick={() => onSend('join_discussion_group', { groupId: group.id })}
                      style={{ width: '100%', fontSize: '.76rem', padding: '6px', borderRadius: 'var(--r)', background: 'var(--bronze-subtle)', color: 'var(--bronze-dark)', border: '1px solid var(--bronze-border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                    >
                      Rejoindre
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedGroup ? (
          <GroupDiscussionDetail
            group={selectedGroup}
            currentUserId={currentUserId}
            isDirecteur={isDirecteur}
            onConnect={() => onSend('connect_discussion_group', { groupId: selectedGroup.id })}
            onDisconnect={() => onSend('disconnect_discussion_group', { groupId: selectedGroup.id })}
            onLeave={() => { onSend('leave_discussion_group', { groupId: selectedGroup.id }); setSelectedGroupId(null); }}
            onSendMessage={messageContent => onSend('discussion_group_message', { groupId: selectedGroup.id, content: messageContent })}
            onStartTyping={() => onSend('discussion_group_typing', { groupId: selectedGroup.id })}
            onStopTyping={() => onSend('discussion_group_stop_typing', { groupId: selectedGroup.id })}
            latestIncomingMessage={latestIncomingGroupMessage}
            currentlyTypingNames={typingNamesByGroupId[selectedGroup.id] || []}
            latestSystemEvent={latestSystemEventByGroupId[selectedGroup.id]}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12, opacity: .3 }}>
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: '.88rem' }}>
              {isDirecteur ? 'Sélectionnez ou créez un groupe' : 'Sélectionnez un groupe pour participer'}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          availableConseillers={availableConseillers}
          onClose={() => setShowCreateModal(false)}
          onCreate={(groupName, invitedMemberIds) => {
            onSend('create_discussion_group', { name: groupName, memberIds: invitedMemberIds });
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}
