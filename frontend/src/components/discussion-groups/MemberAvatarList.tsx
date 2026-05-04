interface MemberAvatarListProps {
  members: { id: string; name: string }[];
  connectedMemberIds: string[];
}

export default function MemberAvatarList({ members, connectedMemberIds }: MemberAvatarListProps) {
  return (
    <div style={{ display: 'flex' }}>
      {members.slice(0, 5).map(member => (
        <div
          key={member.id}
          title={member.name}
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bronze-subtle)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.72rem', fontWeight: 700, color: 'var(--slate-800)', position: 'relative', marginLeft: '-6px' }}
        >
          {member.name[0]}
          <span style={{ position: 'absolute', bottom: -2, right: -2, width: 9, height: 9, borderRadius: '50%', border: '1.5px solid white', background: connectedMemberIds.includes(member.id) ? 'var(--success)' : 'var(--slate-200)' }} />
        </div>
      ))}
    </div>
  );
}
