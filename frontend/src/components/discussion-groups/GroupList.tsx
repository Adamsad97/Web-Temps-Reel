'use client';
import { DiscussionGroup } from '@/types';

interface GroupListProps {
  groups: DiscussionGroup[];
  selectedGroupId: string | null;
  currentUserId: string;
  isDirecteur: boolean;
  typingNamesByGroupId: Record<string, string[]>;
  onSelect: (groupId: string) => void;
  onJoin: (groupId: string) => void;
  onCreateClick: () => void;
}

export default function GroupList({
  groups, selectedGroupId, currentUserId, isDirecteur,
  typingNamesByGroupId, onSelect, onJoin, onCreateClick,
}: GroupListProps) {
  return (
    <aside style={{ width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          Groupes de discussion
        </span>
        {isDirecteur && (
          <button
            onClick={onCreateClick}
            style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bronze)', color: 'var(--slate-900)', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >+</button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '.83rem' }}>
            {isDirecteur ? 'Créez votre premier groupe' : 'Aucun groupe disponible'}
          </div>
        )}
        {groups.map(group => {
          const isActive    = group.id === selectedGroupId;
          const isMember    = group.memberIds.includes(currentUserId) || isDirecteur;
          const isConnected = group.connectedMemberIds.includes(currentUserId);
          const typingNames = typingNamesByGroupId[group.id] || [];

          return (
            <div key={group.id} style={{ borderBottom: '1px solid var(--surface-alt)', background: isActive ? 'var(--bronze-subtle)' : 'transparent' }}>
              <button
                onClick={() => onSelect(group.id)}
                style={{ width: '100%', textAlign: 'left', padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderLeft: `3px solid ${isActive ? 'var(--bronze)' : 'transparent'}`, cursor: 'pointer' }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: isActive ? 'var(--bronze)' : 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke={isActive ? 'var(--slate-900)' : 'var(--text-muted)'} strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="9" cy="7" r="4" stroke={isActive ? 'var(--slate-900)' : 'var(--text-muted)'} strokeWidth="2"/>
                  </svg>
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: '.85rem', fontWeight: isActive ? 700 : 500, color: isActive ? 'var(--bronze-dark)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {group.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                    {typingNames.length > 0 ? (
                      <>
                        <div style={{ display: 'flex', gap: 3 }}>
                          <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                          <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                          <span className="typing-dot" style={{ width: 5, height: 5 }}/>
                        </div>
                        <span style={{ fontSize: '.7rem', color: 'var(--bronze)', fontStyle: 'italic' }}>
                          {typingNames.length === 1 ? `${typingNames[0]} écrit…` : 'Plusieurs personnes écrivent…'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: isConnected ? 'var(--success)' : isMember ? 'var(--bronze)' : 'var(--border)', flexShrink: 0 }}/>
                        <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>
                          {group.connectedMemberIds.length} connecté{group.connectedMemberIds.length > 1 ? 's' : ''}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
              {!isDirecteur && !isMember && (
                <div style={{ padding: '0 14px 10px' }}>
                  <button
                    onClick={() => onJoin(group.id)}
                    style={{ width: '100%', fontSize: '.76rem', padding: '6px', borderRadius: 'var(--r)', background: 'var(--bronze-subtle)', color: 'var(--bronze-dark)', border: '1px solid var(--bronze-border)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}
                  >
                    Rejoindre
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
