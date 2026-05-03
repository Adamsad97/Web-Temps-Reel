'use client';
import { useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/lib/use-websocket';
import { useSSE } from '@/lib/use-sse';
import { apiFetch } from '@/lib/api';
import Header from '@/components/Header';
import NewsFeed from '@/components/NewsFeed';
import PrivateChat from '@/components/PrivateChat';
import GroupChat from '@/components/GroupChat';
import DiscussionGroups from '@/components/DiscussionGroups';
import { AdvisorIcon, BuildingIcon, ClientIcon, MessageIcon, NewsIcon } from '@/components/Icons';
import { Contact, Message, GroupMessage, NewsItem, Notification, DiscussionGroup } from '@/types';

type Tab = 'news' | 'messages' | 'group' | 'discussions';

function playNotificationSound(type: 'message' | 'news') {
  try {
    const audioContextConstructor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new audioContextConstructor();

    if (type === 'message') {
      [0, 0.15].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880 + index * 220, audioContext.currentTime + delay);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + delay + 0.18);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.18);
      });
    } else {
      [0, 0.18, 0.36].forEach((delay, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(660 - index * 110, audioContext.currentTime + delay);
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + delay + 0.3);
        oscillator.start(audioContext.currentTime + delay);
        oscillator.stop(audioContext.currentTime + delay + 0.3);
      });
    }
  } catch {}
}

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const [latestPrivateMessage, setLatestPrivateMessage] = useState<(Message & { fromName?: string; fromRole?: string }) | undefined>();
  const [latestGroupMessage, setLatestGroupMessage] = useState<GroupMessage | undefined>();
  const [typingUserId, setTypingUserId] = useState<string | undefined>();
  const [groupTypingUsers, setGroupTypingUsers] = useState<string[]>([]);
  const [discussionGroups, setDiscussionGroups] = useState<DiscussionGroup[]>([]);
  const [latestDiscussionEvent, setLatestDiscussionEvent] = useState<{ type: string; payload: Record<string, unknown> } | undefined>();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<NewsItem[]>('/api/sse/news', token).then(setNewsItems).catch(() => {});
    apiFetch<Notification[]>('/api/sse/notifications', token).then(setNotifications).catch(() => {});
    apiFetch<Contact[]>('/api/messages/conversations', token).then((contactsData) => {
      setContacts(contactsData);
      if (contactsData.length > 0) setSelectedContact(contactsData[0]);
    }).catch(() => {});
  }, [token]);

  const handleWebSocketMessage = useCallback((socketMessage: { type: string; payload: unknown }) => {
    const messagePayload = socketMessage.payload as Record<string, unknown>;

    if (socketMessage.type === 'private_message') {
      setLatestPrivateMessage(socketMessage.payload as unknown as Message & { fromName?: string; fromRole?: string });
      return;
    }

    if (socketMessage.type === 'group_message') {
      setLatestGroupMessage(socketMessage.payload as unknown as GroupMessage);
      return;
    }

    if (
      socketMessage.type === 'discussion_group_created' ||
      socketMessage.type === 'discussion_group_member_joined' ||
      socketMessage.type === 'discussion_group_member_left' ||
      socketMessage.type === 'discussion_group_member_connected' ||
      socketMessage.type === 'discussion_group_member_disconnected' ||
      socketMessage.type === 'discussion_group_message' ||
      socketMessage.type === 'discussion_group_typing' ||
      socketMessage.type === 'discussion_group_stop_typing'
    ) {
      setLatestDiscussionEvent({ type: socketMessage.type, payload: messagePayload });
      return;
    }

    if (socketMessage.type === 'typing') {
      if (messagePayload.channel === 'group') {
        const typingUserName = messagePayload.fromName as string;
        setGroupTypingUsers((previousUsers: string[]) => {
          return previousUsers.includes(typingUserName) ? previousUsers : [...previousUsers, typingUserName];
        });
        setTimeout(() => setGroupTypingUsers((previousUsers: string[]) => previousUsers.filter((name: string) => name !== messagePayload.fromName)), 3000);
      } else {
        const fromId = messagePayload.fromId as string;
        setTypingUserId(fromId);
        setTimeout(() => setTypingUserId(undefined), 3000);
      }
      return;
    }

    if (socketMessage.type === 'stop_typing') {
      if (messagePayload.channel === 'group') {
        setGroupTypingUsers((previousUsers: string[]) => previousUsers.filter((name: string) => name !== messagePayload.fromName));
      } else {
        setTypingUserId(undefined);
      }
    }
  }, []);

  const { send, status: webSocketStatus } = useWebSocket(token, handleWebSocketMessage);

  const { status: sseStatus } = useSSE(token, (eventName, eventData) => {
    if (eventName === 'news') {
      const newsItem = eventData as NewsItem;
      setNewsItems((previousNewsItems: NewsItem[]) => [newsItem, ...previousNewsItems]);
      playNotificationSound('news');
      return;
    }

    if (eventName === 'notification') {
      const incomingNotification = eventData as Notification;
      setNotifications((previousNotifications: Notification[]) => [incomingNotification, ...previousNotifications]);
      playNotificationSound(incomingNotification.type === 'message' ? 'message' : 'news');
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('AVENIR Banque', { body: incomingNotification.content, icon: '/favicon.ico' });
      }
    }
  });

  const realtimeStatus: 'online' | 'reconnecting' | 'partial' =
    webSocketStatus === 'connected' && sseStatus === 'connected'
      ? 'online'
      : webSocketStatus === 'reconnecting' || webSocketStatus === 'connecting' || sseStatus === 'reconnecting' || sseStatus === 'connecting'
        ? 'reconnecting'
        : 'partial';

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'default') {
      window.Notification.requestPermission();
    }
  }, []);

  const handleSendPrivateMessage = (targetUserId: string, content: string) => {
    send('private_message', { toId: targetUserId, content });
  };

  const handleSendGroupMessage = (content: string) => {
    send('group_message', { content });
  };

  const handleTypingStart = (targetUserId: string) => send('typing', { toId: targetUserId });
  const handleTypingStop = (targetUserId: string) => send('stop_typing', { toId: targetUserId });

  const handleMarkNotificationRead = async (notificationId: string) => {
    await apiFetch(`/api/sse/notifications/${notificationId}/read`, token, { method: 'PATCH' }).catch(() => {});
    setNotifications((previousNotifications: Notification[]) => previousNotifications.map((notification: Notification) => notification.id === notificationId ? { ...notification, read: true } : notification));
  };

  const isStaffMember = user?.role === 'conseiller' || user?.role === 'directeur';

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--cream)' }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--gold)] border-t-transparent" aria-hidden="true" />
    </div>
  );

  const tabs: { key: Tab; label: string; icon: ReactNode; staffOnly?: boolean }[] = [
    { key: 'news', label: 'Actualités', icon: <NewsIcon size={16} /> },
    { key: 'messages', label: 'Messages', icon: <MessageIcon size={16} /> },
    ...(isStaffMember ? [{ key: 'group' as Tab, label: 'Canal Interne', icon: <BuildingIcon size={16} />, staffOnly: true }] : []),
    ...(isStaffMember ? [{ key: 'discussions' as Tab, label: 'Groupes', icon: <BuildingIcon size={16} />, staffOnly: true }] : []),
  ];

  const roleBadgeText = user.role === 'directeur' ? 'Directeur' : user.role === 'conseiller' ? 'Conseiller' : 'Client';
  const roleBadgeIcon = user.role === 'directeur'
    ? <BuildingIcon size={14} style={{ color: 'var(--gold)' }} />
    : user.role === 'conseiller'
      ? <AdvisorIcon size={14} style={{ color: 'var(--gold)' }} />
      : <ClientIcon size={14} style={{ color: 'var(--gold)' }} />;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--cream)' }}>
      <Header
        notifications={notifications}
        onBellClick={() => setIsNotificationDropdownOpen((isOpen: boolean) => !isOpen)}
        showNotifications={isNotificationDropdownOpen}
        onMarkRead={handleMarkNotificationRead}
        realtimeStatus={realtimeStatus}
      />

      {isNotificationDropdownOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsNotificationDropdownOpen(false)} />
      )}

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-56 flex-shrink-0 border-r flex flex-col"
          style={{ background: 'var(--navy)', borderColor: 'rgba(184,134,11,0.3)' }}>
          <nav className="py-4">
            {tabs.map((tabConfig) => (
              <button key={tabConfig.key} onClick={() => setActiveTab(tabConfig.key)}
                className="w-full text-left px-5 py-3 text-sm tracking-wide transition-all flex items-center gap-3"
                style={{
                  background: activeTab === tabConfig.key ? 'rgba(184,134,11,0.15)' : 'transparent',
                  color: activeTab === tabConfig.key ? 'var(--gold)' : 'rgba(248,245,239,0.65)',
                  borderLeft: activeTab === tabConfig.key ? '3px solid var(--gold)' : '3px solid transparent',
                  fontFamily: 'Georgia, serif',
                }}>
                <span>{tabConfig.icon}</span>
                {tabConfig.label}
              </button>
            ))}
          </nav>

          {activeTab === 'messages' && (
            <div className="flex-1 overflow-y-auto border-t" style={{ borderColor: 'rgba(184,134,11,0.2)' }}>
              <p className="px-5 py-2 text-xs tracking-widest uppercase" style={{ color: 'rgba(184,134,11,0.6)' }}>
                {isStaffMember ? 'Clients' : 'Conseillers'}
              </p>
              {contacts.map((contact) => (
                <button key={contact.id} onClick={() => setSelectedContact(contact)}
                  className="w-full text-left px-5 py-3 flex items-center gap-3 transition-colors"
                  style={{
                    background: selectedContact?.id === contact.id ? 'rgba(184,134,11,0.12)' : 'transparent',
                  }}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ background: 'rgba(184,134,11,0.25)', color: 'var(--gold)' }}>
                    {contact.name[0]}
                  </div>
                  <span className="text-sm truncate" style={{ color: 'rgba(248,245,239,0.85)' }}>{contact.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="p-4 border-t" style={{ borderColor: 'rgba(184,134,11,0.2)' }}>
            <div className="text-xs text-center px-3 py-1 rounded flex items-center justify-center gap-2"
              style={{ background: 'rgba(184,134,11,0.15)', color: 'var(--gold)' }}>
              {roleBadgeIcon}
              <span>{roleBadgeText}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-hidden">
          {activeTab === 'news' && (
            <NewsFeed
              news={newsItems}
              onNewsCreated={(newsItem) => setNewsItems((previousNewsItems: NewsItem[]) => [newsItem, ...previousNewsItems])}
            />
          )}
          {activeTab === 'messages' && (
            selectedContact ? (
              <PrivateChat
                key={selectedContact.id}
                contact={selectedContact}
                onSend={handleSendPrivateMessage}
                onTyping={handleTypingStart}
                onStopTyping={handleTypingStop}
                newMessage={latestPrivateMessage}
                typingFrom={typingUserId}
              />
            ) : (
              <div className="h-full flex items-center justify-center" aria-hidden="true">
                <div className="h-8 w-8 rounded-full border border-[rgba(14,31,64,0.15)]" />
              </div>
            )
          )}
          {activeTab === 'group' && isStaffMember && (
            <GroupChat
              onSend={handleSendGroupMessage}
              newMessage={latestGroupMessage}
              typingNames={groupTypingUsers}
            />
          )}
          {activeTab === 'discussions' && isStaffMember && (
            <DiscussionGroups
              groups={discussionGroups}
              onGroupsChange={(updater) => {
                if (typeof updater === 'function') {
                  setDiscussionGroups(prev => (updater as (prev: DiscussionGroup[]) => DiscussionGroup[])(prev));
                } else {
                  setDiscussionGroups(updater as DiscussionGroup[]);
                }
              }}
              onSend={(type, payload) => send(type, payload)}
              latestEvent={latestDiscussionEvent}
            />
          )}
        </main>
      </div>
    </div>
  );
}
