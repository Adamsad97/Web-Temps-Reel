'use client';
import { useState, useEffect, useRef } from 'react';
import { Message, Contact } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

const TYPING_STOP_DELAY_MS = 2000;

interface PrivateChatProps {
  contact: Contact;
  onSend: (toId: string, content: string) => void;
  onTyping: (toId: string) => void;
  onStopTyping: (toId: string) => void;
  newMessage?: Message & { fromName?: string; fromRole?: string };
  typingFrom?: string;
}

export default function PrivateChat({ contact, onSend, onTyping, onStopTyping, newMessage, typingFrom }: PrivateChatProps) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState<(Message & { fromName?: string; fromRole?: string })[]>([]);
  const [input, setInput] = useState('');
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<(Message & { fromName?: string; fromRole?: string })[]>(`/api/messages/private/${contact.id}`, token)
      .then(setMessages).catch(() => {});
  }, [contact.id, token]);

  useEffect(() => {
    if (!newMessage) return;
    const isRelevant =
      (newMessage.fromId === contact.id && newMessage.toId === user?.id) ||
      (newMessage.fromId === user?.id && newMessage.toId === contact.id);
    if (!isRelevant) return;
    setMessages(prev => prev.some(existingMessage => existingMessage.id === newMessage.id) ? prev : [...prev, newMessage]);
  }, [newMessage, contact.id, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTypingRef.current) { isTypingRef.current = true; onTyping(contact.id); }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { isTypingRef.current = false; onStopTyping(contact.id); }, TYPING_STOP_DELAY_MS);
  };

  const handleSend = () => {
    const trimmedInput = input.trim();
    if (!trimmedInput) return;
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    onStopTyping(contact.id);
    onSend(contact.id, trimmedInput);
    setInput('');
  };

  const roleLabel = (role?: string) => role === 'directeur' ? 'Directeur' : role === 'conseiller' ? 'Conseiller' : 'Client';
  const roleColor = (role?: string) => role === 'directeur' ? 'var(--bronze-dark)' : role === 'conseiller' ? 'var(--navy-mid)' : 'var(--text-muted)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <div style={{
        padding: '14px 20px', background: 'var(--white)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--slate-900) 0%, var(--navy-mid) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem', fontWeight: 700, color: 'var(--bronze)', flexShrink: 0,
        }}>
          {contact.name[0]}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--slate-900)', lineHeight: 1.2 }}>{contact.name}</p>
          <p style={{ fontSize: '0.72rem', color: roleColor(contact.role), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {roleLabel(contact.role)}
          </p>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 60, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Commencez la conversation
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((msg, messageIndex) => {
            const isMine = msg.fromId === user?.id;
            return (
              <div key={msg.id || messageIndex} className={isMine ? 'slide-in-right' : 'slide-in-left'}
                style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                {!isMine && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3, paddingLeft: 4 }}>
                    {msg.fromName || contact.name}
                  </span>
                )}
                <div className={isMine ? 'bubble-me' : 'bubble-other'}>{msg.content}</div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          })}
        </div>
        {typingFrom === contact.id && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingLeft: 4 }}>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {contact.name} est en train d'écrire…
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 20px', background: 'var(--white)', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
        <input className="input-avenir" placeholder={`Message à ${contact.name}…`}
          value={input} onChange={handleInputChange} onKeyDown={e => e.key === 'Enter' && handleSend()} />
        <button className="btn-dark" onClick={handleSend} style={{ flexShrink: 0, padding: '0.55rem 1.1rem' }}>
          Envoyer
        </button>
      </div>
    </div>
  );
}
