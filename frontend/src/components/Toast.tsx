'use client';
import { useEffect } from 'react';

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  icon: string;
  kind: 'news' | 'msg' | 'group' | 'sys';
  removing?: boolean;
}

interface Props { toasts: ToastItem[]; onRemove: (id: string) => void; }

export default function Toast({ toasts, onRemove }: Props) {
  useEffect(() => {
    toasts.filter(t => !t.removing).forEach(t => {
      const timer = setTimeout(() => onRemove(t.id), 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts, onRemove]);

  if (toasts.length === 0) return null;
  return (
    <div id="toast-root">
      {toasts.map(t => (
        <div key={t.id} className={`toast-card toast-${t.kind}${t.removing ? ' toast-out' : ''}`} onClick={() => onRemove(t.id)}>
          <span className="toast-icon">{t.icon}</span>
          <div>
            <div className="toast-title">{t.title}</div>
            <div className="toast-body">{t.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
