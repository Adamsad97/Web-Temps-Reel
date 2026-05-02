'use client';
import { useState } from 'react';
import { NewsItem } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { apiFetch } from '@/lib/api';
import { NewsIcon } from '@/components/Icons';

interface Props {
  news: NewsItem[];
  onNewsCreated?: (item: NewsItem) => void;
}

export default function NewsFeed({ news, onNewsCreated }: Props) {
  const { user, token } = useAuth();
  const isStaff = user?.role === 'conseiller' || user?.role === 'directeur';
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handlePublish = async () => {
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const item = await apiFetch<NewsItem>('/api/sse/news', token, {
        method: 'POST',
        body: JSON.stringify({ title, content }),
      });
      onNewsCreated?.(item);
      setTitle('');
      setContent('');
      setShowForm(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-display" style={{ color: 'var(--navy)' }}>Actualités</h2>
            <div className="gold-line mt-2 w-24" />
          </div>
          {isStaff && (
            <button className="btn-gold text-xs tracking-widest uppercase" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Annuler' : '+ Publier'}
            </button>
          )}
        </div>

        {isStaff && showForm && (
          <div className="card-avenir p-5 mb-6 fade-in">
            <p className="text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--gold)' }}>Nouvelle actualité</p>
            <div className="space-y-3">
              <input className="input-avenir" placeholder="Titre de l'actualité" value={title} onChange={e => setTitle(e.target.value)} />
              <textarea className="input-avenir min-h-[100px] resize-none" placeholder="Contenu…" value={content}
                onChange={e => setContent(e.target.value)} style={{ display: 'block' }} />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex justify-end">
                <button className="btn-gold text-xs tracking-widest uppercase" onClick={handlePublish} disabled={loading}>
                  {loading ? 'Publication…' : 'Publier'}
                </button>
              </div>
            </div>
          </div>
        )}

        {news.length === 0 && (
          <div className="py-10 flex items-center justify-center" aria-hidden="true">
            <NewsIcon size={32} style={{ color: 'rgba(14,31,64,0.25)' }} />
          </div>
        )}
        <div className="space-y-4">
          {news.map((newsItem, itemIndex) => (
            <article key={newsItem.id || itemIndex} className="card-avenir p-5 fade-in hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-display font-semibold" style={{ color: 'var(--navy)' }}>{newsItem.title}</h3>
                <span className="text-xs ml-4 flex-shrink-0" style={{ color: 'var(--gold)' }}>
                  {new Date(newsItem.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="gold-line mb-3" />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--navy)', opacity: 0.85 }}>{newsItem.content}</p>
              <p className="text-xs mt-3" style={{ color: 'var(--gold)' }}>
                Publié par {newsItem.authorName}
              </p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
