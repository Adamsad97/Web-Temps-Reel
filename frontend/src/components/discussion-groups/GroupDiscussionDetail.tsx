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
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  latestIncomingMessage?: DiscussionGroupMessage;
  latestEditedMessage?: DiscussionGroupMessage;
  latestDeletedMessageId?: string;
  currentlyTypingNames: string[];
  latestSystemEvent?: SystemEventItem;
}

const ROLE_COLOR: Record<string, string> = {
  directeur: '#a07830',
  conseiller: '#4a6380',
};
const ROLE_LABEL: Record<string, string> = {
  directeur: 'Directeur',
  conseiller: 'Conseiller',
};

export default function GroupDiscussionDetail({
  group, currentUserId, isDirecteur,
  onConnect, onDisconnect, onLeave,
  onSendMessage, onEditMessage, onDeleteMessage,
  onStartTyping, onStopTyping,
  latestIncomingMessage, latestEditedMessage, latestDeletedMessageId,
  currentlyTypingNames, latestSystemEvent,
}: GroupDiscussionDetailProps) {
  const { token } = useAuth();
  const [chatItems, setChatItems]               = useState<ChatItem[]>([]);
  const [draftMessage, setDraftMessage]         = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent]     = useState('');
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const messagesBottomRef    = useRef<HTMLDivElement>(null);
  const typingTimeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);
  const editInputRef         = useRef<HTMLInputElement>(null);

  const isConnectedToGroup = group.connectedMemberIds.includes(currentUserId) || isDirecteur;
  const isGroupMember      = group.memberIds.includes(currentUserId) || isDirecteur;

  useEffect(() => {
    apiFetch<DiscussionGroupMessage[]>(`/api/messages/discussion-groups/${group.id}/messages`, token)
      .then(msgs => setChatItems(msgs.map(m => ({ kind: 'message' as const, message: m }))))
      .catch(() => {});
  }, [group.id, token]);

  useEffect(() => {
    if (!latestIncomingMessage || latestIncomingMessage.groupId !== group.id) return;
    setChatItems(prev =>
      prev.some(i => i.kind === 'message' && i.message.id === latestIncomingMessage.id)
        ? prev : [...prev, { kind: 'message', message: latestIncomingMessage }]
    );
  }, [latestIncomingMessage, group.id]);

  useEffect(() => {
    if (!latestEditedMessage || latestEditedMessage.groupId !== group.id) return;
    setChatItems(prev =>
      prev.map(item =>
        item.kind === 'message' && item.message.id === latestEditedMessage.id
          ? { kind: 'message' as const, message: latestEditedMessage } : item
      )
    );
  }, [latestEditedMessage, group.id]);

  useEffect(() => {
    if (!latestDeletedMessageId) return;
    setChatItems(prev =>
      prev.map(item =>
        item.kind === 'message' && item.message.id === latestDeletedMessageId
          ? { kind: 'message' as const, message: { ...item.message, deletedAt: new Date().toISOString(), content: '' } }
          : item
      )
    );
  }, [latestDeletedMessageId]);

  useEffect(() => {
    if (!latestSystemEvent) return;
    setChatItems(prev => [...prev, { kind: 'system', systemEvent: latestSystemEvent }]);
  }, [latestSystemEvent]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatItems, currentlyTypingNames]);

  useEffect(() => {
    if (editingMessageId) editInputRef.current?.focus();
  }, [editingMessageId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDraftMessage(e.target.value);
    if (!isCurrentlyTypingRef.current) { isCurrentlyTypingRef.current = true; onStartTyping(); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { isCurrentlyTypingRef.current = false; onStopTyping(); }, TYPING_STOP_DELAY_MS);
  };

  const handleSendMessage = () => {
    const t = draftMessage.trim(); if (!t) return;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isCurrentlyTypingRef.current = false; onStopTyping();
    onSendMessage(t); setDraftMessage('');
  };

  const startEditing = (msg: DiscussionGroupMessage) => {
    setEditingMessageId(msg.id); setEditingContent(msg.content); setHoveredMessageId(null);
  };
  const cancelEditing = () => { setEditingMessageId(null); setEditingContent(''); };
  const confirmEdit = () => {
    const t = editingContent.trim(); if (!t || !editingMessageId) return;
    onEditMessage(editingMessageId, t); setEditingMessageId(null); setEditingContent('');
  };

  // members = tableau enrichi (noms) depuis REST — peut être vide initialement
  // memberIds = source de vérité toujours à jour via WebSocket
  const allMembers   = group.members || [];
  const memberCount  = group.memberIds.length;
  const connectedCnt = group.connectedMemberIds.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>

      {/* ── En-tête ── */}
      <div style={{ padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: 'var(--shadow-xs)' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span className="typing-dot" style={{ width: 4, height: 4 }}/>
                <span className="typing-dot" style={{ width: 4, height: 4 }}/>
                <span className="typing-dot" style={{ width: 4, height: 4 }}/>
                <p style={{ fontSize: '.72rem', color: 'var(--bronze)', fontWeight: 600, fontStyle: 'italic', marginLeft: 2 }}>
                  {formatTypingText(currentlyTypingNames)}
                </p>
              </div>
            ) : (
              <p style={{ fontSize: '.72rem', color: connectedCnt > 0 ? 'var(--success)' : 'var(--text-muted)', fontWeight: 600 }}>
                {connectedCnt} connecté{connectedCnt > 1 ? 's' : ''} · {memberCount} membre{memberCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MemberAvatarList members={allMembers} connectedMemberIds={group.connectedMemberIds} />
          {isGroupMember && !isDirecteur && (
            <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
              {group.connectedMemberIds.includes(currentUserId) && (
                <button onClick={onDisconnect} style={{ fontSize: '.74rem', padding: '5px 11px', borderRadius: 'var(--r)', background: 'rgba(155,53,53,.08)', color: 'var(--danger)', border: '1px solid rgba(155,53,53,.25)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Se déconnecter
                </button>
              )}
              <button onClick={onLeave} style={{ fontSize: '.74rem', padding: '5px 11px', borderRadius: 'var(--r)', background: 'var(--surface-alt)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Quitter
              </button>
            </div>
          )}
          {isGroupMember && isDirecteur && (
            <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
              {group.connectedMemberIds.includes(currentUserId) ? (
                <button onClick={onDisconnect} style={{ fontSize: '.74rem', padding: '5px 11px', borderRadius: 'var(--r)', background: 'rgba(155,53,53,.08)', color: 'var(--danger)', border: '1px solid rgba(155,53,53,.25)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Se déconnecter
                </button>
              ) : (
                <button onClick={onConnect} style={{ fontSize: '.74rem', padding: '5px 11px', borderRadius: 'var(--r)', background: 'rgba(58,125,90,.08)', color: 'var(--success)', border: '1px solid rgba(58,125,90,.25)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                  Se connecter
                </button>
              )}
              <button onClick={onLeave} style={{ fontSize: '.74rem', padding: '5px 11px', borderRadius: 'var(--r)', background: 'var(--surface-alt)', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>
                Quitter
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 10px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {chatItems.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '.85rem' }}>
            Aucun message dans ce groupe
          </div>
        )}

        {chatItems.map((chatItem, idx) => {

          /* ── Pill système ── */
          if (chatItem.kind === 'system') {
            return (
              <div key={`sys-${chatItem.systemEvent.id}-${idx}`} className={getSystemPillClassName(chatItem.systemEvent.eventType)} style={{ margin: '10px auto' }}>
                {buildSystemEventLabel(chatItem.systemEvent.eventType, chatItem.systemEvent.actorUserName, chatItem.systemEvent.actorUserId, currentUserId)}
              </div>
            );
          }

          const { message } = chatItem;
          const isMine        = message.fromId === currentUserId;
          const isDeleted     = !!message.deletedAt;
          const isEditing     = editingMessageId === message.id;
          const isHovered     = hoveredMessageId === message.id;

          // Regrouper les messages consécutifs du même auteur
          const prevItem = idx > 0 ? chatItems[idx - 1] : null;
          const prevMsg  = prevItem?.kind === 'message' ? prevItem.message : null;
          const isFirstInGroup = !prevMsg || prevMsg.fromId !== message.fromId || !!prevMsg.deletedAt;

          return (
            <div
              key={message.id || idx}
              style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', marginTop: isFirstInGroup ? 10 : 2 }}
              onMouseEnter={() => isMine && !isDeleted && setHoveredMessageId(message.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
            >
              {/* Ligne avatar + nom — premier message du groupe seulement */}
              {!isMine && isFirstInGroup && !isDeleted && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4, paddingLeft: 4 }}>
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${ROLE_COLOR[message.fromRole] || '#555'} 0%, ${ROLE_COLOR[message.fromRole] || '#777'}cc 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.75rem', fontWeight: 800, color: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,.15)',
                  }}>
                    {message.fromName[0].toUpperCase()}
                  </div>
                  {/* Nom */}
                  <span style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '.01em' }}>
                    {message.fromName}
                  </span>
                  {/* Badge rôle */}
                  <span style={{
                    fontSize: '.67rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: message.fromRole === 'directeur' ? 'rgba(181,129,62,.14)' : 'rgba(74,99,128,.1)',
                    color: ROLE_COLOR[message.fromRole] || 'var(--text-2)',
                    letterSpacing: '.03em', textTransform: 'uppercase',
                  }}>
                    {ROLE_LABEL[message.fromRole] || message.fromRole}
                  </span>
                </div>
              )}

              {/* Contenu du message */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '70%', paddingLeft: !isMine ? 35 : 0 }}>

                {/* Message supprimé */}
                {isDeleted && (
                  <div style={{ padding: '7px 13px', borderRadius: 12, background: 'var(--surface-alt)', border: '1px dashed var(--border)', color: 'var(--text-muted)', fontSize: '.8rem', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
                    🗑 Message supprimé
                  </div>
                )}

                {/* Mode édition inline */}
                {!isDeleted && isEditing && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: 320 }}>
                    <input
                      ref={editInputRef}
                      className="input-avenir"
                      value={editingContent}
                      onChange={e => setEditingContent(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') cancelEditing(); }}
                      style={{ flex: 1, fontSize: '.88rem', padding: '6px 10px' }}
                    />
                    <button onClick={confirmEdit} style={{ padding: '6px 11px', background: 'rgba(58,125,90,.1)', color: 'var(--success)', border: '1px solid rgba(58,125,90,.3)', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '.8rem', fontFamily: 'var(--font-body)' }}>✓</button>
                    <button onClick={cancelEditing} style={{ padding: '6px 10px', background: 'var(--surface-alt)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: '.8rem', fontFamily: 'var(--font-body)' }}>✕</button>
                  </div>
                )}

                {/* Bulle + boutons d'action */}
                {!isDeleted && !isEditing && (
                  <div style={{ position: 'relative', display: 'inline-block' }}>

                    {/* Boutons modifier / supprimer — au-dessus au survol */}
                    {isMine && (
                      <div style={{
                        position: 'absolute', bottom: '100%', right: 0, marginBottom: 4,
                        display: 'flex', gap: 4,
                        opacity: isHovered ? 1 : 0,
                        transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
                        transition: 'opacity .18s ease, transform .18s ease',
                        pointerEvents: isHovered ? 'auto' : 'none',
                        whiteSpace: 'nowrap',
                      }}>
                        <button
                          onClick={() => startEditing(message)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--surface)', color: 'var(--bronze-dark)', border: '1px solid var(--bronze-border)', borderRadius: 6, cursor: 'pointer', fontSize: '.73rem', fontWeight: 600, fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-sm)' }}
                        >
                          ✎ Modifier
                        </button>
                        <button
                          onClick={() => onDeleteMessage(message.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: 'var(--surface)', color: 'var(--danger)', border: '1px solid rgba(155,53,53,.28)', borderRadius: 6, cursor: 'pointer', fontSize: '.73rem', fontWeight: 600, fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-sm)' }}
                        >
                          🗑 Supprimer
                        </button>
                      </div>
                    )}

                    {/* Bulle */}
                    <div style={{
                      padding: '8px 13px',
                      borderRadius: isMine
                        ? '16px 16px 4px 16px'
                        : '16px 16px 16px 4px',
                      background: isMine ? 'var(--slate-800)' : 'var(--surface)',
                      color: isMine ? 'var(--slate-50)' : 'var(--text)',
                      border: isMine ? 'none' : '1px solid var(--border)',
                      fontSize: '.9rem', lineHeight: 1.5,
                      boxShadow: '0 1px 3px rgba(0,0,0,.07)',
                      wordBreak: 'break-word',
                    }}>
                      {message.content}
                    </div>
                  </div>
                )}

                {/* Horodatage */}
                {!isDeleted && !isEditing && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                    <span style={{ fontSize: '.67rem', color: 'var(--text-muted)' }}>
                      {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.editedAt && (
                      <span style={{ fontSize: '.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>· modifié</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Indicateur "est en train d'écrire" */}
        {currentlyTypingNames.length > 0 && (
          <div className="sys-pill typing" style={{ marginTop: 8 }}>
            <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
            </span>
            <span>
              {currentlyTypingNames.length === 1
                ? <><strong>{currentlyTypingNames[0]}</strong> est en train d&apos;écrire un message…</>
                : <><strong>{currentlyTypingNames.slice(0, -1).join(', ')}</strong> et{' '}
                   <strong>{currentlyTypingNames[currentlyTypingNames.length - 1]}</strong> écrivent…</>
              }
            </span>
          </div>
        )}
        <div ref={messagesBottomRef} />
      </div>

      {/* ── Saisie ── */}
      {isConnectedToGroup ? (
        <div style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
          <input
            className="input-avenir"
            placeholder="Écrivez un message…"
            value={draftMessage}
            onChange={handleInputChange}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          />
          <button className="btn-dark" onClick={handleSendMessage} style={{ flexShrink: 0, padding: '0 18px' }}>
            Envoyer
          </button>
        </div>
      ) : (
        <div style={{ padding: '12px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          {isGroupMember ? (
            <button
              onClick={onConnect}
              style={{ fontSize: '.85rem', padding: '8px 20px', borderRadius: 'var(--r)', background: 'rgba(58,125,90,.1)', color: 'var(--success)', border: '1px solid rgba(58,125,90,.3)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
            >
              Se connecter pour écrire
            </button>
          ) : (
            <span style={{ fontSize: '.85rem', color: 'var(--text-muted)' }}>Rejoignez le groupe pour participer</span>
          )}
        </div>
      )}
    </div>
  );
}
