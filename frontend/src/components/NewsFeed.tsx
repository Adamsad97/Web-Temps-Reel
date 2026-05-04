'use client';
import { useState } from 'react';
import { NewsItem } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';

interface Props { news: NewsItem[]; }

export default function NewsFeed({ news }: Props) {
  const { user, token } = useAuth();
  const isStaff = user?.role === 'conseiller' || user?.role === 'directeur';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true); setError('');
    try {
      await apiFetch<NewsItem>('/api/sse/news', token, { method: 'POST', body: JSON.stringify({ title, content }) });
      setTitle(''); setContent(''); setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '28px 32px', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--slate-900)', letterSpacing: '-0.01em' }}>
              Actualités
            </h2>
            <div className="gold-line" style={{ width: 48, marginTop: 8 }} />
          </div>
          {isStaff && (
            <button className={showForm ? 'btn-ghost' : 'btn-primary'} onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Annuler' : '+ Publier'}
            </button>
          )}
        </div>

        {/* Publish form */}
        {isStaff && showForm && (
          <div className="card-avenir fade-in" style={{ padding: 24, marginBottom: 24 }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--bronze-dark)', marginBottom: 16 }}>
              Nouvelle actualité
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input className="input-avenir" placeholder="Titre de l'actualité" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea className="input-avenir" placeholder="Contenu…" value={content} onChange={e => setContent(e.target.value)}
                style={{ minHeight: 110, resize: 'vertical', display: 'block' }} />
              {error && <p style={{ fontSize: '0.83rem', color: '#b91c1c' }}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={handlePublish} disabled={loading}>
                  {loading ? 'Publication…' : 'Publier l\'actualité'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {news.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--text-muted)' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }}>
              <path d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v8a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M14 4v4h4M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: '0.9rem' }}>Aucune actualité pour le moment</p>
          </div>
        )}

        {/* Articles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {news.map((item, i) => (
            <article key={item.id || i} className="card-avenir fade-in" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--slate-900)', lineHeight: 1.35, flex: 1, paddingRight: 16 }}>
                  {item.title}
                </h3>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 600, color: 'var(--bronze-dark)',
                  background: 'var(--bronze-subtle)', borderRadius: 99, padding: '3px 10px', flexShrink: 0,
                  border: '1px solid rgba(201,168,76,0.2)',
                }}>
                  {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <div className="gold-line" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'rgba(13,30,60,0.82)' }}>
                {item.content}
              </p>
              <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--bronze-subtle), var(--border))',
                  border: '1px solid rgba(201,168,76,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.72rem', fontWeight: 700, color: 'var(--bronze-dark)',
                }}>
                  {item.authorName[0]}
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--bronze-dark)', fontWeight: 500 }}>
                  {item.authorName}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
