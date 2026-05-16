'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/lib/use-websocket';
import { useSSE } from '@/lib/use-sse';
import { usePushNotifications } from '@/lib/use-push-notifications';
import { apiFetch } from '@/lib/api';
import Header from '@/components/Header';
import Toast, { ToastItem } from '@/components/Toast';
import { Contact, Message, GroupMessage, NewsItem, Notification, DiscussionGroup } from '@/types';
import Sidebar from './sidebar';
import MainContent from './main-content';
import { useDashboardEvents } from './use-dashboard-events';
import { Tab } from './constants';
import { playSound, addToast } from './utils';

export default function DashboardPage() {
  const { user, token, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>('news');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [latestPrivateMessage, setLatestPrivateMessage] = useState<(Message & { fromName?: string; fromRole?: string }) | undefined>();
  const [latestGroupMessage, setLatestGroupMessage] = useState<GroupMessage | undefined>();
  const [typingUserId, setTypingUserId] = useState<string | undefined>();
  const [groupTypingUsers, setGroupTypingUsers] = useState<string[]>([]);
  const [discussionGroups, setDiscussionGroups] = useState<DiscussionGroup[]>([]);
  const [latestDiscussionEvent, setLatestDiscussionEvent] = useState<{ type: string; payload: Record<string, unknown> } | undefined>();

  const selectedContactRef = useRef(selectedContact);
  const activeTabRef = useRef(activeTab);
  useEffect(() => { selectedContactRef.current = selectedContact; }, [selectedContact]);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  useEffect(() => { if (!loading && !user) router.push('/'); }, [user, loading, router]);

  useEffect(() => {
    if (!token) return;
    apiFetch<NewsItem[]>('/api/sse/news', token).then(setNewsItems).catch(() => {});
    apiFetch<Notification[]>('/api/sse/notifications', token).then(setNotifications).catch(() => {});
    apiFetch<Contact[]>('/api/messages/conversations', token).then(fetchedContacts => {
      setContacts(fetchedContacts);
      if (fetchedContacts.length > 0) setSelectedContact(fetchedContacts[0]);
    }).catch(() => {});
  }, [token]);

  const handleWebSocketMessage = useDashboardEvents({
    currentUserId: user?.id ?? '',
    onPrivateMessage: setLatestPrivateMessage,
    onGroupMessage: setLatestGroupMessage,
    onTypingUser: (userId) => setTypingUserId(userId),
    onStopTypingUser: () => setTypingUserId(undefined),
    onGroupTyping: (name) => setGroupTypingUsers(currentTypingUsers => currentTypingUsers.includes(name) ? currentTypingUsers : [...currentTypingUsers, name]),
    onStopGroupTyping: (name) => setGroupTypingUsers(currentTypingUsers => currentTypingUsers.filter(typingUserName => typingUserName !== name)),
    onDiscussionEvent: (type, payload) => setLatestDiscussionEvent({ type, payload }),
    setToasts,
    activeTabRef,
    selectedContactRef,
  });

  const { send, status: wsStatus } = useWebSocket(token, handleWebSocketMessage);

  usePushNotifications(token);

  const { status: sseStatus } = useSSE(token, (eventName, eventData) => {
    if (eventName === 'news') {
      const incomingNewsItem = eventData as NewsItem;
      setNewsItems(previousNewsItems => previousNewsItems.some(existingItem => existingItem.id === incomingNewsItem.id) ? previousNewsItems : [incomingNewsItem, ...previousNewsItems]);
      playSound('news');
      addToast(setToasts, { title: 'Nouvelle actualité', body: incomingNewsItem.title, icon: '📰', kind: 'news' });
      return;
    }
    if (eventName === 'notification') {
      const incomingNotification = eventData as Notification;
      setNotifications(previousNotifications => previousNotifications.some(existingNotification => existingNotification.id === incomingNotification.id) ? previousNotifications : [incomingNotification, ...previousNotifications]);
      playSound('msg');
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('AVENIR Banque', { body: incomingNotification.content, icon: '/favicon.ico' });
      }
    }
  });

  const realtimeStatus: 'online' | 'reconnecting' | 'partial' =
    wsStatus === 'connected' && sseStatus === 'connected' ? 'online'
    : ['reconnecting', 'connecting'].includes(wsStatus) || ['reconnecting', 'connecting'].includes(sseStatus) ? 'reconnecting'
    : 'partial';

  const handleMarkNotificationRead = async (notificationId: string) => {
    await apiFetch(`/api/sse/notifications/${notificationId}/read`, token, { method: 'PATCH' }).catch(() => {});
    setNotifications(previousNotifications => previousNotifications.map(existingNotification => existingNotification.id === notificationId ? { ...existingNotification, read: true } : existingNotification));
  };

  const isStaff = user?.role === 'conseiller' || user?.role === 'directeur';

  if (loading || !user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--slate-900)' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(181,129,62,.3)', borderTop:'3px solid var(--bronze)', borderRadius:'50%', animation:'spin .9s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <Header notifications={notifications} onBellClick={() => setShowNotifDropdown(isCurrentlyVisible => !isCurrentlyVisible)} showNotifications={showNotifDropdown} onMarkRead={handleMarkNotificationRead} realtimeStatus={realtimeStatus}/>
      {showNotifDropdown && <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setShowNotifDropdown(false)}/>}
      <Toast toasts={toasts} onRemove={toastId => setToasts(previousToasts => previousToasts.filter(existingToast => existingToast.id !== toastId))}/>

      <div className="dashboard-layout" style={{ display:'flex', flex:1, overflow:'hidden', height:'calc(100vh - 62px)' }}>
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isStaff={isStaff}
          user={user}
          contacts={contacts}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
        />
        <MainContent
          activeTab={activeTab}
          isStaff={isStaff}
          newsItems={newsItems}
          selectedContact={selectedContact}
          latestPrivateMessage={latestPrivateMessage}
          typingFrom={typingUserId}
          latestGroupMessage={latestGroupMessage}
          groupTypingNames={groupTypingUsers}
          discussionGroups={discussionGroups}
          latestDiscussionEvent={latestDiscussionEvent}
          onSendPrivateMessage={(contactId, messageContent) => send('private_message', { toId: contactId, content: messageContent })}
          onTypingPrivate={contactId => send('typing', { toId: contactId })}
          onStopTypingPrivate={contactId => send('stop_typing', { toId: contactId })}
          onSendGroupMessage={messageContent => send('group_message', { content: messageContent })}
          onGroupTyping={() => send('typing', { channel: 'group' })}
          onGroupStopTyping={() => send('stop_typing', { channel: 'group' })}
          onSendEvent={(messageType, payload) => send(messageType, payload)}
          onGroupsChange={groupsUpdater => { if (typeof groupsUpdater === 'function') setDiscussionGroups(previousGroups => (groupsUpdater as (previousGroups: DiscussionGroup[]) => DiscussionGroup[])(previousGroups)); else setDiscussionGroups(groupsUpdater as DiscussionGroup[]); }}
        />
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <style>{`
        @media (min-width: 769px) { .mobile-status-bar { display: none !important; } }
        @media (max-width: 768px) {
          .mobile-status-bar {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            padding: 8px 16px;
            background: linear-gradient(180deg,var(--slate-900) 0%,var(--slate-800) 100%);
            border-top: 1px solid rgba(181,129,62,.18);
            flex-shrink: 0;
          }
        }
      `}</style>
      <div className="mobile-status-bar" style={{ display: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-dark) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 800, color: 'var(--slate-900)', flexShrink: 0 }}>{user.name[0]}</div>
          <div>
            <p style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--slate-50)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{user.name}</p>
            <p style={{ fontSize: '.62rem', color: 'var(--bronze)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em' }}>{user.role === 'directeur' ? 'Directeur' : user.role === 'conseiller' ? 'Conseiller' : 'Client'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: realtimeStatus === 'online' ? 'var(--success)' : realtimeStatus === 'reconnecting' ? 'var(--bronze)' : 'var(--danger)', display: 'inline-block' }} />
          <span style={{ fontSize: '.68rem', color: 'rgba(246,247,249,.5)', fontWeight: 600 }}>{realtimeStatus === 'online' ? 'En ligne' : realtimeStatus === 'reconnecting' ? 'Reconnexion…' : 'Partiel'}</span>
        </div>
      </div>
    </div>
  );
}
