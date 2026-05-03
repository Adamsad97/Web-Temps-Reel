'use client';
import { useState, useEffect, useRef } from 'react';
import { DiscussionGroup, DiscussionGroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { BuildingIcon } from '@/components/Icons';

interface Props {
  groups: DiscussionGroup[];
  onGroupsChange: (updater: DiscussionGroup[] | ((prev: DiscussionGroup[]) => DiscussionGroup[])) => void;
  onSend: (type: string, payload: Record<string, unknown>) => void;
  latestEvent?: { type: string; payload: Record<string, unknown> };
}

const statusColors: Record<string, string> = {
  connected: '#22c55e',
  disconnected: '#94a3b8',
};

function MembersAvatars({ members, connectedIds }: { members: { id: string; name: string }[]; connectedIds: string[] }) {
  return (
    <div className="flex -space-x-2">
      {members.slice(0, 5).map(m => (
        <div key={m.id} className="relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{ background: 'rgba(184,134,11,0.2)', color: 'var(--navy)', borderColor: 'var(--navy)' }}
          title={m.name}>
          {m.name[0]}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white"
            style={{ background: connectedIds.includes(m.id) ? statusColors.connected : statusColors.disconnected }} />
        </div>
      ))}
      {members.length > 5 && (
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
          style={{ background: 'rgba(14,31,64,0.1)', color: 'var(--navy)', borderColor: 'var(--navy)' }}>
          +{members.length - 5}
        </div>
      )}
    </div>
  );
}

function CreateGroupModal({
  conseillers,
  onClose,
  onCreate,
}: {
  conseillers: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => void;
}) {
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg shadow-2xl overflow-hidden"
        style={{ background: 'var(--cream)', border: '1px solid rgba(184,134,11,0.3)' }}>
        <div className="px-6 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'rgba(184,134,11,0.2)', background: 'var(--navy)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--gold)', fontFamily: 'Georgia, serif' }}>
            Créer un groupe de discussion
          </h2>
          <button onClick={onClose} className="text-sm" style={{ color: 'rgba(248,245,239,0.5)' }}>✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1 uppercase tracking-wider" style={{ color: 'var(--navy)' }}>
              Nom du groupe
            </label>
            <input
              className="input-avenir w-full text-sm"
              placeholder="Ex. Réunion Crédit Immobilier"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--navy)' }}>
              Conseillers invités
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {conseillers.map(c => (
                <label key={c.id} className="flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors"
                  style={{ background: selected.includes(c.id) ? 'rgba(184,134,11,0.12)' : 'rgba(14,31,64,0.04)' }}>
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    className="accent-[var(--gold)]"
                  />
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(184,134,11,0.2)', color: 'var(--navy)' }}>
                    {c.name[0]}
                  </div>
                  <span className="text-sm" style={{ color: 'var(--navy)' }}>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t flex justify-end gap-3"
          style={{ borderColor: 'rgba(184,134,11,0.2)' }}>
          <button className="px-4 py-2 text-sm rounded" onClick={onClose}
            style={{ color: 'var(--navy)', background: 'rgba(14,31,64,0.08)' }}>
            Annuler
          </button>
          <button className="btn-navy px-5 text-sm"
            disabled={!name.trim() || selected.length === 0}
            onClick={() => onCreate(name.trim(), selected)}>
            Créer le groupe
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupDetail({
  group,
  currentUserId,
  isDirecteur,
  onConnect,
  onDisconnect,
  onLeave,
  onSendMessage,
  onTyping,
  onStopTyping,
  newMessage,
  typingNames,
}: {
  group: DiscussionGroup;
  currentUserId: string;
  isDirecteur: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onLeave: () => void;
  onSendMessage: (content: string) => void;
  onTyping: () => void;
  onStopTyping: () => void;
  newMessage?: DiscussionGroupMessage;
  typingNames: string[];
}) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<DiscussionGroupMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const isConnected = group.connectedMemberIds.includes(currentUserId);
  const isMember = group.memberIds.includes(currentUserId) || isDirecteur;

  useEffect(() => {
    apiFetch<DiscussionGroupMessage[]>(`/api/messages/discussion-groups/${group.id}/messages`, token)
      .then(setMessages).catch(() => {});
  }, [group.id, token]);

  useEffect(() => {
    if (!newMessage || newMessage.groupId !== group.id) return;
    setMessages(prev => prev.some(m => m.id === newMessage.id) ? prev : [...prev, newMessage]);
  }, [newMessage, group.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      onTyping();
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      onStopTyping();
    }, 2000);
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content) return;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    isTypingRef.current = false;
    onStopTyping();
    onSendMessage(content);
    setInput('');
  };

  const connectedCount = group.connectedMemberIds.length;
  const allMembers = group.members || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gold)' }}>
            <BuildingIcon size={16} style={{ color: 'var(--navy)' }} />
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--navy)' }}>{group.name}</p>
            <p className="text-xs" style={{ color: connectedCount > 0 ? '#22c55e' : 'rgba(14,31,64,0.4)' }}>
              {connectedCount} connecté{connectedCount > 1 ? 's' : ''} · {allMembers.length} membre{allMembers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MembersAvatars members={allMembers} connectedIds={group.connectedMemberIds} />
          {!isDirecteur && isMember && (
            <div className="flex gap-2 ml-2">
              {isConnected ? (
                <button onClick={onDisconnect}
                  className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}>
                  Se déconnecter
                </button>
              ) : (
                <button onClick={onConnect}
                  className="text-xs px-3 py-1.5 rounded font-medium"
                  style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', border: '1px solid rgba(34,197,94,0.3)' }}>
                  Se connecter
                </button>
              )}
              <button onClick={onLeave}
                className="text-xs px-3 py-1.5 rounded font-medium"
                style={{ background: 'rgba(14,31,64,0.06)', color: 'var(--navy)', border: '1px solid rgba(14,31,64,0.15)' }}>
                Quitter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--cream)' }}>
        {messages.length === 0 && (
          <div className="py-10 text-center text-sm" style={{ color: 'rgba(14,31,64,0.35)' }}>
            Aucun message dans ce groupe
          </div>
        )}
        {messages.map((msg, i) => {
          const isMine = msg.fromId === currentUserId;
          return (
            <div key={msg.id || i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-sm">
                {!isMine && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>{msg.fromName}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-sm"
                      style={{ background: msg.fromRole === 'directeur' ? '#0e1f40' : '#152d5c', color: msg.fromRole === 'directeur' ? '#d4a017' : '#f8f5ef' }}>
                      {msg.fromRole === 'directeur' ? 'Directeur' : 'Conseiller'}
                    </span>
                  </div>
                )}
                <div className="px-4 py-2 text-sm"
                  style={{
                    background: isMine ? 'var(--navy)' : 'white',
                    color: isMine ? 'var(--cream)' : 'var(--navy)',
                    border: isMine ? 'none' : '1px solid var(--cream-dark)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                  {msg.content}
                </div>
                <p className={`text-xs mt-1 ${isMine ? 'text-right' : ''}`} style={{ color: 'rgba(14,31,64,0.4)' }}>
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-2 text-xs italic rounded"
              style={{ background: 'white', border: '1px solid var(--cream-dark)', color: 'var(--gold)' }}>
              <span className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--gold)', animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--gold)', animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: 'var(--gold)', animationDelay: '300ms' }} />
              </span>
              {typingNames.length === 1
                ? `${typingNames[0]} est en train d'écrire un message…`
                : `${typingNames.join(', ')} écrivent un message…`}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {(isConnected || isDirecteur) ? (
        <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
          <input
            className="input-avenir flex-1 text-sm"
            placeholder="Message dans ce groupe…"
            value={input}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="btn-navy px-5 text-sm" onClick={handleSend}>Envoyer</button>
        </div>
      ) : (
        <div className="p-4 border-t text-center text-sm" style={{ borderColor: 'var(--cream-dark)', background: 'white', color: 'rgba(14,31,64,0.4)' }}>
          {isMember ? 'Connectez-vous pour envoyer des messages' : 'Rejoignez le groupe pour participer'}
        </div>
      )}
    </div>
  );
}

export default function DiscussionGroups({ groups, onGroupsChange, onSend, latestEvent }: Props) {
  const { token, user } = useAuth();
  const isDirecteur = user?.role === 'directeur';
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [conseillers, setConseillers] = useState<{ id: string; name: string }[]>([]);
  const [latestDGMessage, setLatestDGMessage] = useState<DiscussionGroupMessage | undefined>();
  // typingNames: map of groupId -> list of names currently typing
  const [groupTypingNames, setGroupTypingNames] = useState<Record<string, string[]>>({});
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load groups
  useEffect(() => {
    apiFetch<DiscussionGroup[]>('/api/messages/discussion-groups', token)
      .then(data => onGroupsChange(data)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Load conseillers for directeur
  useEffect(() => {
    if (!isDirecteur) return;
    apiFetch<{ id: string; name: string }[]>('/api/messages/discussion-groups/conseillers', token)
      .then(setConseillers).catch(() => {});
  }, [token, isDirecteur]);

  // Handle real-time events
  useEffect(() => {
    if (!latestEvent) return;
    const { type, payload } = latestEvent as { type: string; payload: Record<string, unknown> };

    if (type === 'discussion_group_created') {
      const g = payload as unknown as DiscussionGroup;
      onGroupsChange(prev => prev.some(x => x.id === g.id) ? prev : [...prev, g]);
      setSelectedGroupId(g.id);
      return;
    }

    if (
      type === 'discussion_group_member_joined' ||
      type === 'discussion_group_member_left' ||
      type === 'discussion_group_member_connected' ||
      type === 'discussion_group_member_disconnected'
    ) {
      const updatedGroup = (payload as { group: DiscussionGroup }).group;
      onGroupsChange(prev => prev.map(g => g.id === updatedGroup.id ? { ...g, ...updatedGroup } : g));
      return;
    }

    if (type === 'discussion_group_message') {
      setLatestDGMessage(payload as unknown as DiscussionGroupMessage);
      return;
    }

    if (type === 'discussion_group_typing') {
      const { groupId, fromName } = payload as { groupId: string; fromName: string };
      setGroupTypingNames(prev => {
        const names = prev[groupId] || [];
        if (names.includes(fromName)) return prev;
        return { ...prev, [groupId]: [...names, fromName] };
      });
      // Auto-clear after 3s if no stop event
      if (typingTimers.current[`${groupId}:${fromName}`]) {
        clearTimeout(typingTimers.current[`${groupId}:${fromName}`]);
      }
      typingTimers.current[`${groupId}:${fromName}`] = setTimeout(() => {
        setGroupTypingNames(prev => ({
          ...prev,
          [groupId]: (prev[groupId] || []).filter(n => n !== fromName),
        }));
      }, 3000);
      return;
    }

    if (type === 'discussion_group_stop_typing') {
      const { groupId, fromName } = payload as { groupId: string; fromName: string };
      if (typingTimers.current[`${groupId}:${fromName}`]) {
        clearTimeout(typingTimers.current[`${groupId}:${fromName}`]);
      }
      setGroupTypingNames(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(n => n !== fromName),
      }));
      return;
    }
  }, [latestEvent]);

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;

  const handleCreate = (name: string, memberIds: string[]) => {
    onSend('create_discussion_group', { name, memberIds });
    setShowCreateModal(false);
  };

  const handleJoin = (groupId: string) => {
    onSend('join_discussion_group', { groupId });
  };

  const handleConnect = (groupId: string) => {
    onSend('connect_discussion_group', { groupId });
  };

  const handleDisconnect = (groupId: string) => {
    onSend('disconnect_discussion_group', { groupId });
  };

  const handleLeave = (groupId: string) => {
    onSend('leave_discussion_group', { groupId });
    if (selectedGroupId === groupId) setSelectedGroupId(null);
  };

  const handleSendMessage = (groupId: string, content: string) => {
    onSend('discussion_group_message', { groupId, content });
  };

  const currentUserId = user?.id ?? '';

  return (
    <div className="flex h-full">
      {/* Sidebar: group list */}
      <aside className="w-64 flex-shrink-0 border-r flex flex-col"
        style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <div className="px-4 py-4 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--cream-dark)' }}>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(14,31,64,0.5)' }}>
            Groupes de discussion
          </p>
          {isDirecteur && (
            <button onClick={() => setShowCreateModal(true)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-lg font-bold transition-colors"
              title="Créer un groupe"
              style={{ background: 'var(--gold)', color: 'var(--navy)' }}>
              +
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 && (
            <div className="px-4 py-6 text-center text-sm" style={{ color: 'rgba(14,31,64,0.35)' }}>
              {isDirecteur ? 'Créez votre premier groupe' : 'Aucun groupe disponible'}
            </div>
          )}
          {groups.map(g => {
            const isActive = g.id === selectedGroupId;
            const isMember = g.memberIds.includes(currentUserId) || isDirecteur;
            const isConnected = g.connectedMemberIds.includes(currentUserId);
            const connectedCount = g.connectedMemberIds.length;
            return (
              <div key={g.id}
                className="border-b transition-all"
                style={{ borderColor: 'rgba(14,31,64,0.06)', background: isActive ? 'rgba(184,134,11,0.07)' : 'transparent' }}>
                <button
                  className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setSelectedGroupId(g.id)}>
                  <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                    style={{ background: isActive ? 'var(--gold)' : 'rgba(14,31,64,0.08)' }}>
                    <BuildingIcon size={14} style={{ color: isActive ? 'var(--navy)' : 'rgba(14,31,64,0.5)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--navy)' }}>{g.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: isConnected ? '#22c55e' : (isMember ? '#f59e0b' : '#94a3b8') }} />
                      <span className="text-xs truncate" style={{ color: 'rgba(14,31,64,0.5)' }}>
                        {connectedCount} connecté{connectedCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </button>
                {!isDirecteur && !isMember && (
                  <div className="px-4 pb-2">
                    <button onClick={() => handleJoin(g.id)}
                      className="w-full text-xs py-1.5 rounded font-medium"
                      style={{ background: 'rgba(184,134,11,0.12)', color: 'var(--navy)', border: '1px solid rgba(184,134,11,0.3)' }}>
                      Rejoindre
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 overflow-hidden">
        {selectedGroup ? (
          <GroupDetail
            group={selectedGroup}
            currentUserId={currentUserId}
            isDirecteur={isDirecteur}
            onConnect={() => handleConnect(selectedGroup.id)}
            onDisconnect={() => handleDisconnect(selectedGroup.id)}
            onLeave={() => handleLeave(selectedGroup.id)}
            onSendMessage={(content) => handleSendMessage(selectedGroup.id, content)}
            onTyping={() => onSend('discussion_group_typing', { groupId: selectedGroup.id })}
            onStopTyping={() => onSend('discussion_group_stop_typing', { groupId: selectedGroup.id })}
            newMessage={latestDGMessage}
            typingNames={groupTypingNames[selectedGroup.id] || []}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8"
            style={{ color: 'rgba(14,31,64,0.35)' }}>
            <BuildingIcon size={40} style={{ color: 'rgba(184,134,11,0.3)', marginBottom: 12 }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(14,31,64,0.4)' }}>
              {isDirecteur ? 'Sélectionnez ou créez un groupe de discussion' : 'Sélectionnez un groupe pour participer'}
            </p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateGroupModal
          conseillers={conseillers}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}
