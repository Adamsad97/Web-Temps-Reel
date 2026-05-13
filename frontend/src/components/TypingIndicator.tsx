'use client';

interface TypingIndicatorProps {
  names: string[];
}

export default function TypingIndicator({ names }: TypingIndicatorProps) {
  if (names.length === 0) return null;
  return (
    <div className="sys-pill typing" style={{ marginTop: 10 }}>
      <span style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/>
      </span>
      <span>
        {names.length === 1
          ? <><strong>{names[0]}</strong> est en train d&apos;écrire un message…</>
          : <><strong>{names.slice(0, -1).join(', ')}</strong> et <strong>{names[names.length - 1]}</strong> écrivent…</>
        }
      </span>
    </div>
  );
}
