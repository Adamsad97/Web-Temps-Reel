'use client';
import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWebSocket } from '@/lib/use-websocket';
import { useSSE } from '@/lib/use-sse';
import { usePushNotifications } from '@/lib/use-push-notifications';
import { apiFetch } from '@/lib/api';
import Header from '@/components/Header';
import Toast, { ToastItem } from '@/components/Toast';
import NewsFeed from '@/components/NewsFeed';
import PrivateChat from '@/components/PrivateChat';
import GroupChat from '@/components/GroupChat';
import DiscussionGroups from '@/components/DiscussionGroups';
import { Contact, Message, GroupMessage, NewsItem, Notification, DiscussionGroup } from '@/types';

type Tab = 'news' | 'messages' | 'group' | 'discussions';

function playSound(type: 'msg' | 'news') {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = type === 'msg' ? [880, 1100] : [660, 550, 440];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = type === 'msg' ? 'sine' : 'triangle';
      o.frequency.setValueAtTime(f, ctx.currentTime + i * .17);
      g.gain.setValueAtTime(.22, ctx.currentTime + i * .17);
      g.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + i * .17 + .2);
      o.start(ctx.currentTime + i * .17); o.stop(ctx.currentTime + i * .17 + .2);
    });
  } catch {}
}

const NAV_ICONS: Record<Tab, ReactNode> = {
  news: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M14 4v4h4M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  messages: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  group: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  discussions: <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h8M8 12h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

function addToast(setFn: React.Dispatch<React.SetStateAction<ToastItem[]>>, item: Omit<ToastItem,'id'|'removing'>) {
  const id = `${Date.now()}-${Math.random()}`;
  setFn(prev => [{ ...item, id }, ...prev.slice(0, 4)]);
  setTimeout(() => setFn(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t)), 4700);
  setTimeout(() => setFn(prev => prev.filter(t => t.id !== id)), 5000);
}

function ContactItem({ contact, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width:'100%', textAlign:'left', padding:'9px 16px', display:'flex', alignItems:'center', gap:10, background:selected?'rgba(181,129,62,.1)':'transparent', cursor:'pointer', border:'none', borderLeft:`3px solid ${selected?'var(--bronze)':'transparent'}`, transition:'all .15s' }}>
      <div style={{ width:30, height:30, borderRadius:'50%', flexShrink:0, background:selected?'rgba(181,129,62,.2)':'rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.78rem', fontWeight:700, color:selected?'var(--bronze)':'rgba(246,247,249,.7)' }}>
        {contact.name[0]}
      </div>
      <div style={{ minWidth:0 }}>
        <p style={{ fontSize:'.83rem', fontWeight:selected?700:500, color:selected?'var(--bronze)':'rgba(246,247,249,.85)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{contact.name}</p>
        {contact.role!=='client'&&<p style={{ fontSize:'.65rem', color:contact.role==='directeur'?'var(--bronze)':'rgba(181,129,62,.7)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.04em' }}>{contact.role==='directeur'?'Directeur':'Conseiller'}</p>}
      </div>
    </button>
  );
}

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
    apiFetch<Contact[]>('/api/messages/conversations', token).then(data => {
      setContacts(data);
      if (data.length > 0) setSelectedContact(data[0]);
    }).catch(() => {});
  }, [token]);

  const handleWebSocketMessage = useCallback((msg: { type: string; payload: unknown }) => {
    const payload = msg.payload as Record<string, unknown>;

    if (msg.type === 'private_message') {
      const pm = msg.payload as Message & { fromName?: string; fromRole?: string };
      setLatestPrivateMessage(pm);
      
      if (activeTabRef.current !== 'messages' || selectedContactRef.current?.id !== pm.fromId) {
        addToast(setToasts, { title: pm.fromName || 'Message', body: (pm.content || '').slice(0, 80), icon: '💬', kind: 'msg' });
      }
      return;
    }
    if (msg.type === 'group_message') {
      const gm = msg.payload as GroupMessage;
      setLatestGroupMessage(gm);
      if (activeTabRef.current !== 'group') {
        addToast(setToasts, { title: `Canal Interne — ${gm.fromName}`, body: (gm.content || '').slice(0, 80), icon: '🏛', kind: 'group' });
      }
      return;
    }
    if (['discussion_group_created','discussion_group_member_joined','discussion_group_member_left','discussion_group_member_connected','discussion_group_member_disconnected','discussion_group_message','discussion_group_typing','discussion_group_stop_typing','discussion_group_system'].includes(msg.type)) {
      setLatestDiscussionEvent({ type: msg.type, payload });
     
      if (msg.type === 'discussion_group_system') {
        const { eventType, userName } = payload as { eventType: string; userName: string };
        if (eventType === 'joined' || eventType === 'left') {
          addToast(setToasts, { title: 'Groupe de discussion', body: eventType === 'joined' ? `${userName} vient de rejoindre la discussion` : `${userName} a quitté la discussion`, icon: eventType === 'joined' ? '✦' : '✦', kind: 'sys' });
        }
      }
      
      if (msg.type === 'discussion_group_message' && activeTabRef.current !== 'discussions') {
        const dm = payload as DiscussionGroupMessage;
        addToast(setToasts, { title: `Groupe — ${dm.fromName}`, body: (dm.content || '').slice(0, 80), icon: '💬', kind: 'group' });
      }
      return;
    }
    if (msg.type === 'typing') {
      if (payload.channel === 'group') {
        const name = payload.fromName as string;
        setGroupTypingUsers(p => p.includes(name) ? p : [...p, name]);
        setTimeout(() => setGroupTypingUsers(p => p.filter(n => n !== name)), 3000);
      } else { setTypingUserId(payload.fromId as string); setTimeout(() => setTypingUserId(undefined), 3000); }
      return;
    }
    if (msg.type === 'stop_typing') {
      if (payload.channel === 'group') setGroupTypingUsers(p => p.filter(n => n !== payload.fromName));
      else setTypingUserId(undefined);
    }
  }, []);

  const { send, status: wsStatus } = useWebSocket(token, handleWebSocketMessage);

  usePushNotifications(token);

  const { status: sseStatus } = useSSE(token, (eventName, eventData) => {
    if (eventName === 'news') {
      const item = eventData as NewsItem;
      setNewsItems(prev => prev.some(n => n.id === item.id) ? prev : [item, ...prev]);
      playSound('news');
      addToast(setToasts, { title: 'Nouvelle actualité', body: item.title, icon: '📰', kind: 'news' });
      return;
    }
    if (eventName === 'notification') {
      const notif = eventData as Notification;
      setNotifications(prev => prev.some(n => n.id === notif.id) ? prev : [notif, ...prev]);
      playSound('msg');
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        new window.Notification('AVENIR Banque', { body: notif.content, icon: '/favicon.ico' });
      }
    }
  });

  const realtimeStatus: 'online' | 'reconnecting' | 'partial' =
    wsStatus === 'connected' && sseStatus === 'connected' ? 'online'
    : ['reconnecting', 'connecting'].includes(wsStatus) || ['reconnecting', 'connecting'].includes(sseStatus) ? 'reconnecting'
    : 'partial';

  const handleMarkNotificationRead = async (id: string) => {
    await apiFetch(`/api/sse/notifications/${id}/read`, token, { method: 'PATCH' }).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const isStaff = user?.role === 'conseiller' || user?.role === 'directeur';

  if (loading || !user) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--slate-900)' }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(181,129,62,.3)', borderTop:'3px solid var(--bronze)', borderRadius:'50%', animation:'spin .9s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tabs: { key: Tab; label: string }[] = [
    { key:'news', label:'Actualités' },
    { key:'messages', label:'Messages' },
    ...(isStaff ? [{ key:'group' as Tab, label:'Canal Interne' }] : []),
    ...(isStaff ? [{ key:'discussions' as Tab, label:'Groupes' }] : []),
  ];

  const staffContacts = contacts.filter(c => c.role !== 'client');
  const clientContacts = contacts.filter(c => c.role === 'client');

  const LABEL: Record<string, string> = { conseiller:'Équipe', directeur:'Équipe' };

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)' }}>
      <Header notifications={notifications} onBellClick={() => setShowNotifDropdown(v => !v)} showNotifications={showNotifDropdown} onMarkRead={handleMarkNotificationRead} realtimeStatus={realtimeStatus}/>
      {showNotifDropdown && <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setShowNotifDropdown(false)}/>}
      <Toast toasts={toasts} onRemove={id => setToasts(prev => prev.filter(t => t.id !== id))}/>

      <div className="dashboard-layout" style={{ display:'flex', flex:1, overflow:'hidden', height:'calc(100vh - 62px)' }}>
        {/* Sidebar */}
        <aside className="dashboard-sidebar" style={{ width:220, flexShrink:0, background:'linear-gradient(180deg,var(--slate-900) 0%,var(--slate-800) 100%)', borderRight:'1px solid rgba(181,129,62,.18)', display:'flex', flexDirection:'column', boxShadow:'2px 0 14px rgba(0,0,0,.18)' }}>
          <nav className="sidebar-nav" style={{ padding:'10px 0', borderBottom:'1px solid rgba(181,129,62,.12)' }}>
            {tabs.map(tab => {
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} data-active={active} onClick={() => setActiveTab(tab.key)} style={{ width:'100%', textAlign:'left', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, background:active?'rgba(181,129,62,.13)':'transparent', color:active?'var(--bronze)':'rgba(246,247,249,.55)', cursor:'pointer', fontSize:'.87rem', fontFamily:'var(--font-body)', fontWeight:active?700:400, transition:'all .18s', border:'none', borderLeft:`3px solid ${active?'var(--bronze)':'transparent'}` }}>
                  <span style={{ opacity:active?1:.65, flexShrink:0 }}>{NAV_ICONS[tab.key]}</span>
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {activeTab === 'messages' && (
            <div className="sidebar-contacts" style={{ flex:1, overflowY:'auto', paddingTop:6 }}>
              {isStaff && staffContacts.length > 0 && (
                <>
                  <p style={{ padding:'8px 16px 4px', fontSize:'.63rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(181,129,62,.45)' }}>Équipe</p>
                  {staffContacts.map(c => <ContactItem key={c.id} contact={c} selected={selectedContact?.id===c.id} onClick={() => setSelectedContact(c)}/>)}
                  {clientContacts.length > 0 && <p style={{ padding:'10px 16px 4px', fontSize:'.63rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(181,129,62,.45)' }}>Clients</p>}
                </>
              )}
              {clientContacts.map(c => <ContactItem key={c.id} contact={c} selected={selectedContact?.id===c.id} onClick={() => setSelectedContact(c)}/>)}
              {!isStaff && contacts.map(c => <ContactItem key={c.id} contact={c} selected={selectedContact?.id===c.id} onClick={() => setSelectedContact(c)}/>)}
            </div>
          )}

          {/* User badge */}
          <div className="sidebar-user-badge" style={{ padding:'14px 14px', borderTop:'1px solid rgba(181,129,62,.12)', background:'rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-dark) 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', fontWeight:800, color:'var(--slate-900)', flexShrink:0 }}>{user.name[0]}</div>
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:'.82rem', fontWeight:700, color:'var(--slate-50)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.name}</p>
              <p style={{ fontSize:'.67rem', color:'var(--bronze)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{user.role==='directeur'?'Directeur':user.role==='conseiller'?'Conseiller':'Client'}</p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="dashboard-main" style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
          {activeTab==='news' && <NewsFeed news={newsItems}/>}
          {activeTab==='messages' && (
            selectedContact
              ? <PrivateChat key={selectedContact.id} contact={selectedContact}
                  onSend={(id, c) => send('private_message', { toId: id, content: c })}
                  onTyping={id => send('typing', { toId: id })}
                  onStopTyping={id => send('stop_typing', { toId: id })}
                  newMessage={latestPrivateMessage} typingFrom={typingUserId}/>
              : <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' }}>Sélectionnez un contact</div>
          )}
          {activeTab==='group' && isStaff && <GroupChat onSendMessage={c => send('group_message', { content: c })} onStartTyping={() => send('typing', { channel: 'group' })} onStopTyping={() => send('stop_typing', { channel: 'group' })} latestIncomingMessage={latestGroupMessage} currentlyTypingNames={groupTypingUsers}/>}
          {activeTab==='discussions' && isStaff && (
            <DiscussionGroups
              groups={discussionGroups}
              onGroupsChange={u => { if (typeof u==='function') setDiscussionGroups(p => (u as (p:DiscussionGroup[])=>DiscussionGroup[])(p)); else setDiscussionGroups(u as DiscussionGroup[]); }}
              onSend={(type, payload) => send(type, payload)}
              latestRealtimeEvent={latestDiscussionEvent}
            />
          )}
        </main>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Mobile-only bottom status bar */}
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
