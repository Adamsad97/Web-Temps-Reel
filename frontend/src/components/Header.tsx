'use client';
import { useAuth } from '@/lib/auth-context';
import { Notification } from '@/types';
import { useRouter } from 'next/navigation';

interface Props {
  notifications: Notification[];
  onBellClick: () => void;
  showNotifications: boolean;
  onMarkRead: (id: string) => void;
  realtimeStatus: 'online' | 'reconnecting' | 'partial';
}

const ROLES: Record<string, string> = { client:'Client', conseiller:'Conseiller', directeur:'Directeur' };

export default function Header({ notifications, onBellClick, showNotifications, onMarkRead, realtimeStatus }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const unread = notifications.filter(n => !n.read).length;
  const statusDot = realtimeStatus === 'online' ? '#5aa87a' : realtimeStatus === 'reconnecting' ? '#d4924a' : '#b85050';
  const statusLabel = realtimeStatus === 'online' ? 'En ligne' : realtimeStatus === 'reconnecting' ? 'Reconnexion…' : 'Hors ligne';

  return (
    <header style={{ background:'linear-gradient(135deg,var(--slate-900) 0%,var(--slate-800) 100%)', borderBottom:'1px solid var(--bronze-border)', height:62, display:'flex', alignItems:'center', padding:'0 1.5rem', justifyContent:'space-between', zIndex:50, boxShadow:'0 2px 14px rgba(0,0,0,.22)', position:'relative' }}>
      <div onClick={() => router.push('/dashboard')} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
        <div style={{ width:38, height:38, borderRadius:9, background:'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-light) 100%)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 10px rgba(181,129,62,.4)' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke="var(--slate-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'1.05rem', color:'var(--bronze)', letterSpacing:'.1em' }}>AVENIR</div>
          <div style={{ fontSize:'.62rem', color:'rgba(246,247,249,.4)', letterSpacing:'.12em', textTransform:'uppercase', lineHeight:1 }}>Banque Privée</div>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 12px', borderRadius:99, background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)' }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background:statusDot, boxShadow:`0 0 7px ${statusDot}`, display:'inline-block' }}/>
          <span style={{ fontSize:'.74rem', color:'rgba(246,247,249,.75)' }}>{statusLabel}</span>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:'.9rem', fontWeight:700, color:'var(--slate-50)', lineHeight:1.2 }}>{user?.name}</div>
          <div style={{ fontSize:'.7rem', color:'var(--bronze)', letterSpacing:'.05em' }}>{ROLES[user?.role||'']}</div>
        </div>

        {/* Bell */}
        <div style={{ position:'relative' }}>
          <button onClick={onBellClick} style={{ width:38, height:38, borderRadius:9, background:'rgba(181,129,62,.14)', border:'1px solid var(--bronze-border)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="var(--bronze)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {unread > 0 && <span className="pulse-dot" style={{ position:'absolute', top:-4, right:-4, width:18, height:18, borderRadius:'50%', background:'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-light) 100%)', color:'var(--slate-900)', fontSize:'.64rem', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid var(--slate-900)' }}>{unread>9?'9+':unread}</span>}
          </button>
          {showNotifications && (
            <div className="fade-in" style={{ position:'absolute', right:0, top:46, width:320, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', boxShadow:'var(--shadow-lg)', maxHeight:400, overflowY:'auto', zIndex:100 }}>
              <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:'.72rem', fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bronze-dark)' }}>Notifications</span>
                {unread>0&&<span style={{ fontSize:'.68rem', fontWeight:700, background:'var(--bronze-subtle)', color:'var(--bronze-dark)', borderRadius:99, padding:'2px 8px' }}>{unread} non lue{unread>1?'s':''}</span>}
              </div>
              {notifications.length===0&&<div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:'.85rem' }}>Aucune notification</div>}
              {notifications.map(n=>(
                <div key={n.id} onClick={()=>onMarkRead(n.id)} style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', cursor:'pointer', background:n.read?'transparent':'rgba(181,129,62,.05)', display:'flex', gap:10, alignItems:'flex-start' }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', flexShrink:0, marginTop:5, background:n.read?'var(--border)':'var(--bronze)', boxShadow:n.read?'none':`0 0 5px var(--bronze)` }}/>
                  <div>
                    <p style={{ fontSize:'.85rem', color:'var(--text)', lineHeight:1.45 }}>{n.content}</p>
                    <p style={{ fontSize:'.72rem', color:'var(--text-muted)', marginTop:3 }}>{new Date(n.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={logout} style={{ background:'transparent', border:'1px solid var(--bronze-border)', color:'rgba(246,247,249,.8)', fontSize:'.75rem', letterSpacing:'.05em', padding:'6px 14px', borderRadius:'var(--r)', cursor:'pointer', fontFamily:'var(--font-body)' }}>Déconnexion</button>
      </div>
    </header>
  );
}
