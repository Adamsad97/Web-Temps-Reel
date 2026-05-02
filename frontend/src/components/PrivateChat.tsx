'use client';
import { useState, useEffect, useRef } from 'react';
import { Message, Contact } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { MessageIcon } from '@/components/Icons';

interface Props {
  contact: Contact;
  onSend: (toId: string, content: string) => void;
  onTyping: (toId: string) => void;
  onStopTyping: (toId: string) => void;
  newMessage?: Message & { fromName?: string; fromRole?: string };
  typingFrom?: string;
}

const ROLE_TEXT_COLORS: Record<string, string> = {
  directeur: '#0e1f40',
  conseiller: '#152d5c',
  client: '#b8860b',
};

const TYPING_TIMEOUT_MS = 1500;

export default function PrivateChat({ contact, onSend, onTyping, onStopTyping, newMessage, typingFrom }: Props) {
  const { token, user } = useAuth();
  const [conversationMessages, setConversationMessages] = useState<(Message & { fromName?: string; fromRole?: string })[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    apiFetch<(Message & { fromName?: string; fromRole?: string })[]>(
      `/api/messages/private/${contact.id}`, token
    ).then(setConversationMessages).catch(() => {});
  }, [contact.id, token]);

  useEffect(() => {
    if (!newMessage) return;
    const isPartOfThisConversation = newMessage.fromId === contact.id || newMessage.toId === contact.id;
    if (!isPartOfThisConversation) return;

    setConversationMessages(previousMessages => {
      const alreadyExists = previousMessages.some(m => m.id === newMessage.id);
      return alreadyExists ? previousMessages : [...previousMessages, newMessage];
    });
  }, [newMessage, contact.id]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages]);

  const handleInputChange = (newValue: string) => {
    setMessageInput(newValue);
    onTyping(contact.id);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onStopTyping(contact.id), TYPING_TIMEOUT_MS);
  };

  const handleSend = () => {
    const trimmedInput = messageInput.trim();
    if (!trimmedInput) return;
    onSend(contact.id, trimmedInput);
    setMessageInput('');
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    onStopTyping(contact.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ background: 'var(--navy)', color: 'var(--gold)' }}>
          {contact.name[0]}
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--navy)' }}>{contact.name}</p>
          <p className="text-xs capitalize" style={{ color: 'var(--gold)' }}>{contact.role}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--cream)' }}>
        {conversationMessages.length === 0 && !typingFrom && (
          <div className="py-10 flex flex-col items-center justify-center text-center" style={{ color: 'rgba(14,31,64,0.4)' }}>
            <MessageIcon size={32} style={{ marginBottom: 12 }} />
          </div>
        )}
        {conversationMessages.map((message, messageIndex) => {
          const isSentByCurrentUser = message.fromId === user?.id;
          const senderColor = ROLE_TEXT_COLORS[message.fromRole || 'client'] || 'var(--gold)';
          return (
            <div key={message.id || messageIndex} className={`flex ${isSentByCurrentUser ? 'justify-end slide-in-right' : 'justify-start slide-in-left'}`}>
              <div className="max-w-xs lg:max-w-sm">
                {!isSentByCurrentUser && (
                  <p className="text-xs mb-1 ml-1" style={{ color: senderColor }}>
                    {message.fromName}
                  </p>
                )}
                <div className="px-4 py-2 text-sm"
                  style={{
                    background: isSentByCurrentUser ? 'var(--navy)' : 'white',
                    color: isSentByCurrentUser ? 'var(--cream)' : 'var(--navy)',
                    border: isSentByCurrentUser ? 'none' : '1px solid var(--cream-dark)',
                    borderRadius: '2px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                  {message.content}
                </div>
                <p className={`text-xs mt-1 ${isSentByCurrentUser ? 'text-right' : ''}`} style={{ color: 'rgba(14,31,64,0.4)' }}>
                  {new Date(message.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {typingFrom === contact.id && (
          <div className="flex justify-start">
            <div className="px-4 py-2 text-xs italic" style={{ color: 'var(--gold)', background: 'white', border: '1px solid var(--cream-dark)' }}>
              {contact.name} est en train d&apos;écrire…
            </div>
          </div>
        )}
        <div ref={messagesBottomRef} />
      </div>

      <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <input
          className="input-avenir flex-1 text-sm"
          placeholder="Votre message…"
          value={messageInput}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-navy px-5 text-sm" onClick={handleSend}>Envoyer</button>
      </div>
    </div>
  );
}
