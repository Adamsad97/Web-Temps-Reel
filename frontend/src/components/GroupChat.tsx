'use client';
import { useState, useEffect, useRef } from 'react';
import { GroupMessage } from '@/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { BuildingIcon } from '@/components/Icons';

interface Props {
  onSend: (content: string) => void;
  newMessage?: GroupMessage;
  typingNames?: string[];
}

const ROLE_BADGE_STYLES: Record<string, { label: string; backgroundColor: string; textColor: string }> = {
  directeur: { label: 'Directeur', backgroundColor: '#0e1f40', textColor: '#d4a017' },
  conseiller: { label: 'Conseiller', backgroundColor: '#152d5c', textColor: '#f8f5ef' },
};

export default function GroupChat({ onSend, newMessage, typingNames = [] }: Props) {
  const { token, user } = useAuth();
  const [channelMessages, setChannelMessages] = useState<GroupMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const messagesBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiFetch<GroupMessage[]>('/api/messages/group', token).then(setChannelMessages).catch(() => {});
  }, [token]);

  useEffect(() => {
    if (!newMessage) return;
    setChannelMessages(previousMessages => {
      const alreadyExists = previousMessages.some(m => m.id === newMessage.id);
      return alreadyExists ? previousMessages : [...previousMessages, newMessage];
    });
  }, [newMessage]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  const handleSend = () => {
    const trimmedInput = messageInput.trim();
    if (!trimmedInput) return;
    onSend(trimmedInput);
    setMessageInput('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--gold)' }}>
          <BuildingIcon size={18} style={{ color: 'var(--navy)' }} />
        </div>
        <div>
          <p className="font-semibold" style={{ color: 'var(--navy)' }}>Canal Interne</p>
          <p className="text-xs" style={{ color: 'var(--gold)' }}>Conseillers & Directeurs</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--cream)' }}>
        {channelMessages.length === 0 && typingNames.length === 0 && (
          <div className="py-10 flex flex-col items-center justify-center text-center" style={{ color: 'rgba(14,31,64,0.4)' }}>
            <BuildingIcon size={32} style={{ color: 'rgba(14,31,64,0.35)' }} />
          </div>
        )}
        {channelMessages.map((groupMessage, messageIndex) => {
          const isSentByCurrentUser = groupMessage.fromId === user?.id;
          const roleBadge = ROLE_BADGE_STYLES[groupMessage.fromRole] || ROLE_BADGE_STYLES.conseiller;
          return (
            <div key={groupMessage.id || messageIndex} className={`flex ${isSentByCurrentUser ? 'justify-end slide-in-right' : 'justify-start slide-in-left'}`}>
              <div className="max-w-sm">
                {!isSentByCurrentUser && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    <span className="text-xs font-semibold" style={{ color: 'var(--navy)' }}>{groupMessage.fromName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-sm" style={{ background: roleBadge.backgroundColor, color: roleBadge.textColor }}>
                      {roleBadge.label}
                    </span>
                  </div>
                )}
                <div className="px-4 py-2 text-sm"
                  style={{
                    background: isSentByCurrentUser ? 'var(--navy)' : 'white',
                    color: isSentByCurrentUser ? 'var(--cream)' : 'var(--navy)',
                    border: isSentByCurrentUser ? 'none' : '1px solid var(--cream-dark)',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                  }}>
                  {groupMessage.content}
                </div>
                <p className={`text-xs mt-1 ${isSentByCurrentUser ? 'text-right' : ''}`} style={{ color: 'rgba(14,31,64,0.4)' }}>
                  {new Date(groupMessage.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="flex justify-start">
            <div className="px-4 py-2 text-xs italic" style={{ color: 'var(--gold)', background: 'white', border: '1px solid var(--cream-dark)' }}>
              {typingNames.join(', ')} {typingNames.length > 1 ? 'écrivent' : 'écrit'}…
            </div>
          </div>
        )}
        <div ref={messagesBottomRef} />
      </div>

      <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--cream-dark)', background: 'white' }}>
        <input
          className="input-avenir flex-1 text-sm"
          placeholder="Message au canal interne…"
          value={messageInput}
          onChange={e => setMessageInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-navy px-5 text-sm" onClick={handleSend}>Envoyer</button>
      </div>
    </div>
  );
}
