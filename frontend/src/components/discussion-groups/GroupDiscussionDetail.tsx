'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { DiscussionGroup, DiscussionGroupMessage } from '@/types';
import MemberAvatarList from './MemberAvatarList';
import { buildSystemEventLabel, formatTypingText, getSystemPillClassName } from './utils';
import type { ChatItem, SystemEventItem } from './types';

const TYPING_STOP_DELAY_MS = 2000;

interface GroupDiscussionDetailProps {
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
}

export default function GroupDiscussionDetail({
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
}: GroupDiscussionDetailProps) {
  const { token } = useAuth();
  const [chatItems, setChatItems] = useState<ChatItem[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const messagesBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  const isConnectedToGroup = group.connectedMemberIds.includes(currentUserId);
  const isGroupMember = group.memberIds.includes(currentUserId) || isDirecteur;

  useEffect(() => {
    apiFetch<DiscussionGroupMessage[]>(`/api/messages/discussion-groups/${group.id}/messages`, token)
      .then(fetchedMessages => setChatItems(fetchedMessages.map(fetchedMessage => ({ kind: 'message' as const, message: fetchedMessage }))))
      .catch(() => {});
  }, [group.id, token]);

  useEffect(() => {
    if (!latestIncomingMessage || latestIncomingMessage.groupId !== group.id) return;
    setChatItems(previous =>
      previous.some(chatItem => chatItem.kind === 'message' && chatItem.message.id === latestIncomingMessage.id)
        ? previous
        : [...previous, { kind: 'message', message: latestIncomingMessage }]
    );
  }, [latestIncomingMessage, group.id]);

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
    }, TYPING_STOP_DELAY_MS);
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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 8px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {chatItems.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Aucun message dans ce groupe
          </div>
        )}

        {chatItems.map((chatItem, chatItemIndex) => {
          if (chatItem.kind === 'system') {
            const { systemEvent } = chatItem;
            return (
              <div
                key={`system-${systemEvent.id}-${chatItemIndex}`}
                className={getSystemPillClassName(systemEvent.eventType)}
              >
                {buildSystemEventLabel(systemEvent.eventType, systemEvent.actorUserName, systemEvent.actorUserId, currentUserId)}
              </div>
            );
          }

          const { message } = chatItem;
          const isSentByCurrentUser = message.fromId === currentUserId;
          return (
            <div
              key={message.id || chatItemIndex}
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
