'use client';

import { Contact, Role } from '@/types';
import { Tab } from './constants';
import { NAV_ICONS } from './nav-icons';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isStaff: boolean;
  user: { name: string; role: Role };
  contacts: Contact[];
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
}

interface TabDef {
  key: Tab;
  label: string;
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

export default function Sidebar({
  activeTab,
  onTabChange,
  isStaff,
  user,
  contacts,
  selectedContact,
  onSelectContact,
}: SidebarProps) {
  const tabs: TabDef[] = [
    { key:'news', label:'Actualités' },
    { key:'messages', label:'Messages' },
    ...(isStaff ? [{ key:'group' as Tab, label:'Canal Interne' }] : []),
    ...(isStaff ? [{ key:'discussions' as Tab, label:'Groupes' }] : []),
  ];

  const staffContacts = contacts.filter(contact => contact.role !== 'client');
  const clientContacts = contacts.filter(contact => contact.role === 'client');

  return (
    <aside className="dashboard-sidebar" style={{ width:220, flexShrink:0, background:'linear-gradient(180deg,var(--slate-900) 0%,var(--slate-800) 100%)', borderRight:'1px solid rgba(181,129,62,.18)', display:'flex', flexDirection:'column', boxShadow:'2px 0 14px rgba(0,0,0,.18)' }}>
      <nav className="sidebar-nav" style={{ padding:'10px 0', borderBottom:'1px solid rgba(181,129,62,.12)' }}>
        {tabs.map(tab => {
          const isActiveTab = activeTab === tab.key;
          return (
            <button key={tab.key} data-active={isActiveTab} onClick={() => onTabChange(tab.key)} style={{ width:'100%', textAlign:'left', padding:'10px 16px', display:'flex', alignItems:'center', gap:10, background:isActiveTab?'rgba(181,129,62,.13)':'transparent', color:isActiveTab?'var(--bronze)':'rgba(246,247,249,.55)', cursor:'pointer', fontSize:'.87rem', fontFamily:'var(--font-body)', fontWeight:isActiveTab?700:400, transition:'all .18s', border:'none', borderLeft:`3px solid ${isActiveTab?'var(--bronze)':'transparent'}` }}>
              <span style={{ opacity:isActiveTab?1:.65, flexShrink:0 }}>{NAV_ICONS[tab.key]}</span>
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
              {staffContacts.map(contact => <ContactItem key={contact.id} contact={contact} selected={selectedContact?.id===contact.id} onClick={() => onSelectContact(contact)}/>)}
              {clientContacts.length > 0 && <p style={{ padding:'10px 16px 4px', fontSize:'.63rem', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(181,129,62,.45)' }}>Clients</p>}
            </>
          )}
          {clientContacts.map(contact => <ContactItem key={contact.id} contact={contact} selected={selectedContact?.id===contact.id} onClick={() => onSelectContact(contact)}/>)}
          {!isStaff && contacts.map(contact => <ContactItem key={contact.id} contact={contact} selected={selectedContact?.id===contact.id} onClick={() => onSelectContact(contact)}/>)}
        </div>
      )}

      <div className="sidebar-user-badge" style={{ padding:'14px 14px', borderTop:'1px solid rgba(181,129,62,.12)', background:'rgba(0,0,0,.18)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-dark) 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', fontWeight:800, color:'var(--slate-900)', flexShrink:0 }}>{user.name[0]}</div>
        <div style={{ minWidth:0 }}>
          <p style={{ fontSize:'.82rem', fontWeight:700, color:'var(--slate-50)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{user.name}</p>
          <p style={{ fontSize:'.67rem', color:'var(--bronze)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em' }}>{user.role==='directeur'?'Directeur':user.role==='conseiller'?'Conseiller':'Client'}</p>
        </div>
      </div>
    </aside>
  );
}
