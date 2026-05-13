'use client';

interface EmptyGroupPlaceholderProps {
  isDirecteur: boolean;
}

export default function EmptyGroupPlaceholder({ isDirecteur }: EmptyGroupPlaceholderProps) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12, opacity: .3 }}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <p style={{ fontSize: '.88rem' }}>
        {isDirecteur ? 'Sélectionnez ou créez un groupe' : 'Sélectionnez un groupe pour participer'}
      </p>
    </div>
  );
}
