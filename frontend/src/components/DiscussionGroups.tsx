'use client';
import { useState, useEffect, useRef } from 'react';
import { DiscussionGroup, DiscussionGroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface DiscussionGroupsProps {
  groups: DiscussionGroup[];
  onGroupsChange: (updater: DiscussionGroup[] | ((previous: DiscussionGroup[]) => DiscussionGroup[])) => void;
  onSend: (eventType: string, payload: Record<string, unknown>) => void;
  latestRealtimeEvent?: { type: string; payload: Record<string, unknown> };
}

interface SystemEventItem {
  id: string;
  eventType: 'joined' | 'left' | 'connected' | 'disconnected';
  actorUserId: string;
  actorUserName: string;
  createdAt: string;
}

type ChatItem =
  | { kind: 'message'; message: DiscussionGroupMessage }
  | { kind: 'system'; systemEvent: SystemEventItem };

/** Returns the CSS class for the system event pill based on event type. */
function getSystemPillClassName(eventType: string): string {
  if (eventType === 'joined' || eventType === 'connected') return 'sys-pill join';
  if (eventType === 'left') return 'sys-pill leave';
  return 'sys-pill';
}

/**
 * Returns a human-readable label for a system event.
 * Personalises the message when the current user is the actor:
 *   - Actor sees: "Vous avez rejoint la discussion"
 *   - Others see: "Adama a rejoint la discussion"
 */
function buildSystemEventLabel(
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

function MemberAvatarList({
  members,
  connectedMemberIds,
}: {
  members: { id: string; name: string }[];
  connectedMemberIds: string[];
}) {
  return (
    <div style={{ display: 'flex' }}>
      {members.slice(0, 5).map(member => (
        <div
          key={member.id}
          title={member.name}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bronze-subtle)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: 'var(--slate-800)', position: 'relative', marginLeft: '-6px' }}
        >
          {member.name[0]}
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', border: '1.5px solid white', background: connectedMemberIds.includes(member.id) ? 'var(--success)' : 'var(--slate-200)' }} />
        </div>
      ))}
    </div>
  );
}

function CreateGroupModal({
  availableConseillers,
  onClose,
  onCreate,
}: {
  availableConseillers: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (groupName: string, invitedMemberIds: string[]) => void;
}) {
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const toggleMemberSelection = (memberId: string) =>
    setSelectedMemberIds(previous =>
      previous.includes(memberId)
        ? previous.filter(id => id !== memberId)
        : [...previous, memberId]
    );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 22px', background: 'var(--slate-900)', borderBottom: '2px solid var(--bronze)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: 'var(--bronze)', fontSize: '.95rem' }}>Créer un groupe de discussion</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(246,247,249,.5)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: 6 }}>
              Nom du groupe
            </label>
            <input
              className="input-avenir"
              placeholder="Ex. Réunion Crédit Immobilier"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: 8 }}>
              Conseillers invités
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {availableConseillers.map(conseiller => (
                <label
                  key={conseiller.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--r)', cursor: 'pointer', background: selectedMemberIds.includes(conseiller.id) ? 'var(--bronze-subtle)' : 'var(--surface-alt)', border: `1px solid ${selectedMemberIds.includes(conseiller.id) ? 'var(--bronze-border)' : 'var(--border)'}` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(conseiller.id)}
                    onChange={() => toggleMemberSelection(conseiller.id)}
                    style={{ accentColor: 'var(--bronze)' }}
                  />
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bronze-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 700, color: 'var(--bronze-dark)' }}>
                    {conseiller.name[0]}
                  </div>
                  <span style={{ fontSize: '.88rem', color: 'var(--text)' }}>{conseiller.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn-dark"
            disabled={!groupName.trim() || selectedMemberIds.length === 0}
            onClick={() => onCreate(groupName.trim(), selectedMemberIds)}
          >
            Créer le groupe
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupDiscussionDetail({
  group,
  currentUserId,
  isDirecteur,
  onConnect,
  onDisconnect,
  onLeave,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  latestIncomingMessage,
  currentlyTypingNames,
  latestSystemEvent,
}: {
  group: DiscussionGroup;
  currentUserId: string;
  isDirecteur: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  latestIncomingMessage?: DiscussionGroupMessage;
  currentlyTypingNames: string[];
  latestSystemEvent?: SystemEventItem;
}) {
  const { token } = useAuth();
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const messagesBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  const isConnectedToGroup = group.connectedMemberIds.includes(currentUserId);
  const isGroupMember = group.memberIds.includes(currentUserId) || isDirecteur;

  // Load message history
  useEffect(() => {
    apiFetch<DiscussionGroupMessage[]>(`/api/messages/discussion-groups/${group.id}/messages`, token)
      .then(messages => setChatItems(messages.map(m => ({ kind: 'message' as const, message: m }))))
      .catch(() => {});
  }, [group.id, token]);

  // Append new real-time messages
  useEffect(() => {
    if (!latestIncomingMessage || latestIncomingMessage.groupId !== group.id) return;
    setChatItems(previous =>
      previous.some(item => item.kind === 'message' && item.message.id === latestIncomingMessage.id)
        ? previous
        : [...previous, { kind: 'message', message: latestIncomingMessage }]
    );
  }, [latestIncomingMessage, group.id]);

  // Append system event messages (join/leave/connect/disconnect)
  useEffect(() => {
    if (!latestSystemEvent) return;
    setChatItems(previous => [...previous, { kind: 'system', systemEvent: latestSystemEvent }]);
  }, [latestSystemEvent]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatItems, currentlyTypingNames]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDraftMessage(event.target.value);
    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onStartTyping();
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onStopTyping();
    }, 2000);
  };

  const handleSendMessage = () => {
    const trimmedContent = draftMessage.trim();
    if (!trimmedContent) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isCurrentlyTypingRef.current = false;
    onStopTyping();
    onSendMessage(trimmedContent);
    setDraftMessage('');
  };

  const allGroupMembers = group.members || [];
  const connectedMemberCount = group.connectedMemberIds.length;

  const formatTypingText = (names: string[]) =>
    names.length === 1
      ? `${names[0]} est en train d'écrire un message…`
      : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]} écrivent un message…`;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Group header */}
      <div className="group-detail-header" style={{ padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-xs)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,var(--slate-800) 0%,var(--slate-700) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="var(--bronze)" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '.95rem', color: 'var(--text)' }}>{group.name}</p>
            {currentlyTypingNames.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                  <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                  <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                </div>
                <p style={{ fontSize: '.72rem', color: 'var(--bronze)', fontWeight: 600, fontStyle: 'italic' }}>
                  {formatTypingText(currentlyTypingNames)}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '.72rem', color: connectedMemberCount > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                {connectedMemberCount} connecté{connectedMemberCount > 1 ? 's' : ''} · {allGroupMembers.length} membre{allGroupMembers.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MemberAvatarList members={allGroupMembers} connectedMemberIds={group.connectedMemberIds} />
          {!isDirecteur && isGroupMember && (
            <div style={{ display: 'flex', gap: 8, marginLeft: 8 }}>
              {isConnectedToGroup ? (
                <button onClick={onDisconnect} style={{ fontSize: '.75rem', padding: '5px 12px', borderRadius: 'var(--r)', background: 'rgba(155,53,53,.08)', color: 'var(--danger)', border: '1px solid rgba(155,53,53,.25)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Se déconnecter
                </button>
              ) : (
                <button onClick={onConnect} style={{ fontSize: '.75rem', padding: '5px 12px', borderRadius: 'var(--r)', background: 'rgba(58,125,90,.08)', color: 'var(--success)', border: '1px solid rgba(58,125,90,.25)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Se connecter
                </button>
              )}
              <button onClick={onLeave} style={{ fontSize: '.75rem', padding: '5px 12px', borderRadius: 'var(--r)', background: 'var(--surface-alt)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Quitter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chatItems.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Aucun message dans ce groupe
          </div>
        )}

        {chatItems.map((item, index) => {
          if (item.kind === 'system') {
            const { systemEvent } = item;
            return (
              <div
                key={`system-${systemEvent.id}-${index}`}
                className={getSystemPillClassName(systemEvent.eventType)}
              >
                {buildSystemEventLabel(
                  systemEvent.eventType,
                  systemEvent.actorUserName,
                  systemEvent.actorUserId,
                  currentUserId
                )}
              </div>
            );
          }

          const { message } = item;
          const isSentByCurrentUser = message.fromId === currentUserId;
          return (
            <div
              key={message.id || index}
              className={isSentByCurrentUser ? 'slide-in-right' : 'slide-in-left'}
              style={{ display: 'flex', flexDirection: 'column', alignItems: isSentByCurrentUser ? 'flex-end' : 'flex-start' }}
            >
              {!isSentByCurrentUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, paddingLeft: 2 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--slate-800)', color: 'var(--bronze)', fontSize: '.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {message.fromName[0]}
                  </div>
                  <span style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--text)' }}>{message.fromName}</span>
                  <span style={{ fontSize: '.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: message.fromRole === 'directeur' ? 'rgba(181,129,62,.15)' : 'var(--surface-alt)', color: message.fromRole === 'directeur' ? 'var(--bronze-dark)' : 'var(--text-2)' }}>
                    {message.fromRole === 'directeur' ? 'Directeur' : 'Conseiller'}
                  </span>
                </div>
              )}
              <div className={isSentByCurrentUser ? 'bubble-me' : 'bubble-other'}>{message.content}</div>
              <span style={{ fontSize: '.68rem', color: 'var(--text-muted)', marginTop: 2, padding: '0 3px' }}>
                {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}

        {/* Live typing indicator in message area */}
        {currentlyTypingNames.length > 0 && (
          <div className="sys-pill typing" style={{ marginTop: 4 }}>
            <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </span>
            <span>
              {currentlyTypingNames.length === 1
                ? <><strong>{currentlyTypingNames[0]}</strong> est en train d&apos;écrire un message…</>
                : <><strong>{currentlyTypingNames.slice(0, -1).join(', ')}</strong> et <strong>{currentlyTypingNames[currentlyTypingNames.length - 1]}</strong> écrivent un message…</>
              }
            </span>
          </div>
        )}
        <div ref={messagesBottomRef} />
      </div>

      {/* Message input */}
      {(isConnectedToGroup || isDirecteur) ? (
        <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
          <input
            className="input-avenir"
            placeholder="Message dans ce groupe…"
            value={draftMessage}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="btn-dark" onClick={handleSendMessage} style={{ flexShrink: 0 }}>Envoyer</button>
        </div>
      ) : (
        <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', textAlign: 'center', fontSize: '.85rem', color: 'var(--text-muted)' }}>
          {isGroupMember ? 'Connectez-vous pour envoyer des messages' : 'Rejoignez le groupe pour participer'}
        </div>
      )}
    </div>
  );
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

  // Load group list on mount
  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/messages/discussion-groups', token)
      .then(groupList => onGroupsChange(groupList))
      .catch(() => {});
  }, [token]);

  // Load available conseillers for group creation (directeur only)
  useEffect(() => {
    if (!isDirecteur) return;
    apiFetch<{ id: string; name: string }[]>('/api/messages/discussion-groups/conseillers', token)
      .then(setAvailableConseillers)
      .catch(() => {});
  }, [token, isDirecteur]);

  // Handle all real-time events
  useEffect(() => {
    if (!latestRealtimeEvent) return;
    const { type: eventType, payload: eventPayload } = latestRealtimeEvent;

    if (eventType === 'discussion_group_created') {
      const newGroup = eventPayload as unknown as DiscussionGroup;
      onGroupsChange(previous =>
        previous.some(g => g.id === newGroup.id) ? previous : [...previous, newGroup]
      );
      setSelectedGroupId(newGroup.id);
      return;
    }

    if (['discussion_group_member_joined', 'discussion_group_member_left', 'discussion_group_member_connected', 'discussion_group_member_disconnected'].includes(eventType)) {
      const updatedGroup = (eventPayload as { group: DiscussionGroup }).group;
      onGroupsChange(previous =>
        previous.map(g => g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g)
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
        group: DiscussionGroup;
        createdAt: string;
      };
      const systemEvent: SystemEventItem = {
        id: `${Date.now()}-${Math.random()}`,
        eventType: systemEventType as SystemEventItem['eventType'],
        actorUserId,
        actorUserName,
        createdAt,
      };
      setLatestSystemEventByGroupId(previous => ({ ...previous, [groupId]: systemEvent }));
      return;
    }

    if (eventType === 'discussion_group_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      setTypingNamesByGroupId(previous => {
        const currentNames = previous[groupId] || [];
        return currentNames.includes(fromName) ? previous : { ...previous, [groupId]: [...currentNames, fromName] };
      });
      const timerKey = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[timerKey]) clearTimeout(typingTimeoutsByKey.current[timerKey]);
      typingTimeoutsByKey.current[timerKey] = setTimeout(() => {
        setTypingNamesByGroupId(previous => ({
          ...previous,
          [groupId]: (previous[groupId] || []).filter(name => name !== fromName),
        }));
      }, 3000);
      return;
    }

    if (eventType === 'discussion_group_stop_typing') {
      const { groupId, fromName } = eventPayload as { groupId: string; fromName: string };
      const timerKey = `${groupId}:${fromName}`;
      if (typingTimeoutsByKey.current[timerKey]) clearTimeout(typingTimeoutsByKey.current[timerKey]);
      setTypingNamesByGroupId(previous => ({
        ...previous,
        [groupId]: (previous[groupId] || []).filter(name => name !== fromName),
      }));
      return;
    }
  }, [latestRealtimeEvent]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  return (
    <div className="discussion-layout" style={{ display: 'flex', height: '100%' }}>
      {/* Group list sidebar */}
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

      {/* Group detail panel */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedGroup ? (
          <GroupDiscussionDetail
            group={selectedGroup}
            currentUserId={currentUserId}
            isDirecteur={isDirecteur}
            onConnect={() => onSend('connect_discussion_group', { groupId: selectedGroup.id })}
            onDisconnect={() => onSend('disconnect_discussion_group', { groupId: selectedGroup.id })}
            onLeave={() => { onSend('leave_discussion_group', { groupId: selectedGroup.id }); setSelectedGroupId(null); }}
            onSendMessage={content => onSend('discussion_group_message', { groupId: selectedGroup.id, content })}
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
