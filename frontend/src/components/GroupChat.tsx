'use client';
import { useState, useEffect, useRef } from 'react';
import { GroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useTyping } from '@/lib/use-typing';
import TypingIndicator from './TypingIndicator';

interface GroupChatProps {
  onSendMessage: (content: string) => void;
  onStartTyping: () => void;
  onStopTyping: () => void;
  latestIncomingMessage?: GroupMessage;
  currentlyTypingNames?: string[];
}

export default function GroupChat({ onSendMessage, onStartTyping, onStopTyping, latestIncomingMessage, currentlyTypingNames = [] }: GroupChatProps) {
  const { token, user } = useAuth();
  const [messageHistory, setMessageHistory] = useState<GroupMessage[]>([]);
  const [draftMessage, setDraftMessage]     = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { handleTypingInput, cancelTyping } = useTyping({ onStartTyping, onStopTyping });

  useEffect(() => {
    apiFetch<GroupMessage[]>('/api/messages/group', token).then(setMessageHistory).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!latestIncomingMessage) return;
    setMessageHistory(prev =>
      prev.some(m => m.id === latestIncomingMessage.id) ? prev : [...prev, latestIncomingMessage]
    );
  }, [latestIncomingMessage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messageHistory, currentlyTypingNames]);

  const handleSend = () => {
    const content = draftMessage.trim();
    if (!content) return;
    cancelTyping();
    onSendMessage(content);
    setDraftMessage('');
  };

  const getRoleStyle = (role: string) =>
    role === 'directeur'
      ? { label: 'Directeur', backgroundColor: 'rgba(181,129,62,.15)', color: 'var(--bronze-dark)' }
      : { label: 'Conseiller', backgroundColor: 'var(--surface-alt)', color: 'var(--text-2)' };

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
                {currentlyTypingNames.length === 1
                  ? `${currentlyTypingNames[0]} est en train d'écrire…`
                  : 'Plusieurs personnes écrivent…'}
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
            const isMe = message.fromId === user?.id;
            const roleStyle = getRoleStyle(message.fromRole);
            return (
              <div key={message.id || index} className={isMe ? 'slide-in-right' : 'slide-in-left'} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                {!isMe && (
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
                <div className={isMe ? 'bubble-me' : 'bubble-other'}>{message.content}</div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3, paddingLeft: 2, paddingRight: 2 }}>
                  {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
        <TypingIndicator names={currentlyTypingNames} />
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 20px', background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <input
          className="input-avenir"
          placeholder="Message au canal interne…"
          value={draftMessage}
          onChange={e => { setDraftMessage(e.target.value); handleTypingInput(); }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-dark" onClick={handleSend} style={{ flexShrink: 0 }}>Envoyer</button>
      </div>
    </div>
  );
}
