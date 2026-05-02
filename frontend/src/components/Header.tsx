'use client';
import { useAuth } from '@/lib/auth-context';
import { Notification } from '@/types';
import { useRouter } from 'next/navigation';
import { BellIcon } from '@/components/Icons';

const ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  conseiller: 'Conseiller',
  directeur: 'Directeur',
};

interface Props {
  notifications: Notification[];
  onBellClick: () => void;
  showNotifications: boolean;
  onMarkRead: (id: string) => void;
  realtimeStatus: 'online' | 'reconnecting' | 'partial';
}

export default function Header({ notifications, onBellClick, showNotifications, onMarkRead, realtimeStatus }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const unreadNotificationCount = notifications.filter((notification) => !notification.read).length;

  const statusLabel = realtimeStatus === 'online'
    ? 'Temps réel actif'
    : realtimeStatus === 'reconnecting'
      ? 'Reconnexion…'
      : 'Connexion partielle';

  const statusColors = realtimeStatus === 'online'
    ? { bg: 'rgba(34, 197, 94, 0.12)', dot: '#22c55e', text: '#d1fae5' }
    : realtimeStatus === 'reconnecting'
      ? { bg: 'rgba(245, 158, 11, 0.15)', dot: '#f59e0b', text: '#fde68a' }
      : { bg: 'rgba(239, 68, 68, 0.15)', dot: '#ef4444', text: '#fecaca' };

  return (
    <header className="h-16 flex items-center px-6 justify-between relative z-50"
      style={{ background: 'var(--navy)', borderBottom: '1px solid var(--gold)' }}>
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push('/dashboard')}>
        <span className="text-xl tracking-[0.15em]" style={{ color: 'var(--gold)', fontFamily: 'Georgia, serif' }}>
          AVENIR
        </span>
        <span className="text-xs tracking-widest uppercase hidden sm:block" style={{ color: 'rgba(248,245,239,0.5)' }}>
          Banque Privée
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs tracking-wide"
          style={{ background: statusColors.bg, color: statusColors.text }}
          title={statusLabel}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: statusColors.dot }} />
          <span>{statusLabel}</span>
        </div>

        <div className="text-right hidden sm:block">
          <p className="text-sm" style={{ color: 'var(--cream)' }}>{user?.name}</p>
          <p className="text-xs" style={{ color: 'var(--gold)' }}>{ROLE_LABELS[user?.role || '']}</p>
        </div>

        <div className="relative">
          <button onClick={onBellClick} className="relative w-9 h-9 flex items-center justify-center rounded-full transition-colors"
            style={{ background: 'rgba(184,134,11,0.15)' }}>
            <BellIcon size={18} style={{ color: 'var(--gold)' }} />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-xs flex items-center justify-center pulse-dot"
                style={{ background: 'var(--gold)', color: 'var(--navy)', fontWeight: 700 }}>
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 card-avenir z-50 max-h-96 overflow-y-auto fade-in">
              <div className="p-3 border-b" style={{ borderColor: 'var(--cream-dark)' }}>
                <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>Notifications</p>
              </div>
              {notifications.length === 0 && (
                <div className="p-4 flex justify-center">
                  <span className="h-3 w-3 rounded-full" style={{ background: 'rgba(14,31,64,0.2)' }} aria-hidden="true" />
                </div>
              )}
              {notifications.map(n => (
                <div key={n.id} onClick={() => onMarkRead(n.id)}
                  className="p-3 border-b cursor-pointer hover:bg-amber-50 transition-colors"
                  style={{ borderColor: 'var(--cream-dark)', background: n.read ? 'white' : 'rgba(184,134,11,0.06)' }}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full mt-1 flex-shrink-0 pulse-dot" style={{ background: 'var(--gold)' }} />}
                    <div>
                      <p className="text-sm" style={{ color: 'var(--navy)' }}>{n.content}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--gold)' }}>
                        {new Date(n.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={logout}
          className="text-xs tracking-widest uppercase px-3 py-1 border transition-colors"
          style={{ borderColor: 'var(--gold)', color: 'var(--gold)', fontFamily: 'Georgia, serif' }}>
          Déconnexion
        </button>
      </div>
    </header>
  );
}
