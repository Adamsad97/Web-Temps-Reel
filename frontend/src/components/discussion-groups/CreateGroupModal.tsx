'use client';

import { useState } from 'react';

interface CreateGroupModalProps {
  availableConseillers: { id: string; name: string }[];
  onClose: () => void;
  onCreate: (groupName: string, invitedMemberIds: string[]) => void;
}

export default function CreateGroupModal({
  availableConseillers,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const [groupName, setGroupName] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const toggleMemberSelection = (memberId: string) =>
    setSelectedMemberIds(previousIds =>
      previousIds.includes(memberId)
        ? previousIds.filter(existingMemberId => existingMemberId !== memberId)
        : [...previousIds, memberId]
    );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)' }}>
      <div className="fade-in" style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)' }}>
        <div style={{ padding: '16px 22px', background: 'var(--slate-900)', borderBottom: '2px solid var(--bronze)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: 'var(--bronze)', fontSize: '.95rem' }}>Créer un groupe de discussion</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(246,247,249,.5)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
        </div>
        <div style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: 6 }}>
              Nom du groupe
            </label>
            <input
              className="input-avenir"
              placeholder="Ex. Réunion Crédit Immobilier"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)', marginBottom: 8 }}>
              Conseillers invités
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
              {availableConseillers.map(conseiller => (
                <label
                  key={conseiller.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--r)', cursor: 'pointer', background: selectedMemberIds.includes(conseiller.id) ? 'var(--bronze-subtle)' : 'var(--surface-alt)', border: `1px solid ${selectedMemberIds.includes(conseiller.id) ? 'var(--bronze-border)' : 'var(--border)'}` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(conseiller.id)}
                    onChange={() => toggleMemberSelection(conseiller.id)}
                    style={{ accentColor: 'var(--bronze)' }}
                  />
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bronze-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.78rem', fontWeight: 700, color: 'var(--bronze-dark)' }}>
                    {conseiller.name[0]}
                  </div>
                  <span style={{ fontSize: '.88rem', color: 'var(--text)' }}>{conseiller.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="btn-ghost" onClick={onClose}>Annuler</button>
          <button
            className="btn-dark"
            disabled={!groupName.trim() || selectedMemberIds.length === 0}
            onClick={() => onCreate(groupName.trim(), selectedMemberIds)}
          >
            Créer le groupe
          </button>
        </div>
      </div>
    </div>
  );
}
