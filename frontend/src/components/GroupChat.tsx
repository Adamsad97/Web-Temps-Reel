'use client';
import { useState, useEffect, useRef } from 'react';
import { GroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const TYPING_STOP_DELAY_MS = 2000;

interface GroupChatProps {
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  latestIncomingMessage?: GroupMessage;
  currentlyTypingNames?: string[];
}

export default function GroupChat({
  onSendMessage,
  onStartTyping,
  onStopTyping,
  latestIncomingMessage,
  currentlyTypingNames = [],
}: GroupChatProps) {
  const { token, user } = useAuth();
  const [messageHistory, setMessageHistory] = useState<GroupMessage[]>([]);
  const [draftMessage, setDraftMessage] = useState('');
  const messagesBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  useEffect(() => {
    apiFetch<GroupMessage[]>('/api/messages/group', token)
      .then(setMessageHistory)
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!latestIncomingMessage) return;
    setMessageHistory(previous =>
      previous.some(existingMessage => existingMessage.id === latestIncomingMessage.id)
        ? previous
        : [...previous, latestIncomingMessage]
    );
  }, [latestIncomingMessage]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageHistory, currentlyTypingNames]);

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

  const getRoleDisplayStyle = (role: string) =>
    role === 'directeur'
      ? { label: 'Directeur', backgroundColor: 'rgba(181,129,62,.15)', color: 'var(--bronze-dark)' }
      : { label: 'Conseiller', backgroundColor: 'var(--surface-alt)', color: 'var(--text-2)' };

  const formatTypingIndicatorText = (names: string[]): string => {
    if (names.length === 1) return `${names[0]} est en train d'écrire un message…`;
    const allButLast = names.slice(0, -1).join(', ');
    const last = names[names.length - 1];
    return `${allButLast} et ${last} écrivent un message…`;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

      <div style={{ padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--slate-900) 0%, var(--slate-700) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="9" cy="7" r="4" stroke="var(--bronze)" strokeWidth="2"/>
            <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Canal Interne</p>
          {currentlyTypingNames.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                <span className="typing-dot" style={{ width: 5, height: 5 }}/>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--bronze)', fontWeight: 600, fontStyle: 'italic' }}>
                {formatTypingIndicatorText(currentlyTypingNames)}
              </p>
            </div>
          ) : (
            <p style={{ fontSize: '0.72rem', color: 'var(--bronze-dark)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Conseillers & Directeur
            </p>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
        {messageHistory.length === 0 && currentlyTypingNames.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Aucun message dans le canal interne
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messageHistory.map((message, index) => {
            const isSentByCurrentUser = message.fromId === user?.id;
            const roleStyle = getRoleDisplayStyle(message.fromRole);
            return (
              <div
                key={message.id || index}
                className={isSentByCurrentUser ? 'slide-in-right' : 'slide-in-left'}
                style={{ display: 'flex', flexDirection: 'column', alignItems: isSentByCurrentUser ? 'flex-end' : 'flex-start' }}
              >
                {!isSentByCurrentUser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 2 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--slate-900)', color: 'var(--bronze)', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {message.fromName[0]}
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>{message.fromName}</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, backgroundColor: roleStyle.backgroundColor, color: roleStyle.color }}>
                      {roleStyle.label}
                    </span>
                  </div>
                )}
                <div className={isSentByCurrentUser ? 'bubble-me' : 'bubble-other'}>{message.content}</div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                  {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>

        {currentlyTypingNames.length > 0 && (
          <div className="sys-pill typing" style={{ marginTop: 10 }}>
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

      <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <input
          className="input-avenir"
          placeholder="Message au canal interne…"
          value={draftMessage}
          onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
        />
        <button className="btn-dark" onClick={handleSendMessage} style={{ flexShrink: 0 }}>Envoyer</button>
      </div>
    </div>
  );
}
