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

const TOAST_AUTO_REMOVE_DELAY_MS = 5000;

interface ToastProps { toasts: ToastItem[]; onRemove: (id: string) => void; }

export default function Toast({ toasts, onRemove }: ToastProps) {
  useEffect(() => {
    toasts.filter(toast => !toast.removing).forEach(toast => {
      const timer = setTimeout(() => onRemove(toast.id), TOAST_AUTO_REMOVE_DELAY_MS);
      return () => clearTimeout(timer);
    });
  }, [toasts, onRemove]);

  if (toasts.length === 0) return null;
  return (
    <div id="toast-root">
      {toasts.map(toast => (
        <div key={toast.id} className={`toast-card toast-${toast.kind}${toast.removing ? ' toast-out' : ''}`} onClick={() => onRemove(toast.id)}>
          <span className="toast-icon">{toast.icon}</span>
          <div>
            <div className="toast-title">{toast.title}</div>
            <div className="toast-body">{toast.body}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
