'use client';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { AdvisorIcon, BuildingIcon, ClientIcon } from '@/components/Icons';

export default function LoginPage() {
  const { login, register } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(name, email, password);
      router.push('/dashboard');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--cream)' }}>
      <div className="w-full h-1" style={{ background: 'linear-gradient(90deg, var(--navy), var(--gold), var(--navy))' }} />

      <div className="w-full max-w-md px-8 py-12 fade-in" style={{ marginTop: '-4px' }}>
        <div className="text-center mb-10">
          <div className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: 'var(--gold)' }}>
            Alliance de Valeurs Économiques et Nationales Investies Responsablement
          </div>
          <h1 className="text-4xl font-display" style={{ color: 'var(--navy)', letterSpacing: '0.08em' }}>
            AVENIR
          </h1>
          <div className="gold-line mt-3 mx-auto w-32" />
          <p className="text-sm mt-3 tracking-wider uppercase" style={{ color: 'var(--gold)' }}>Banque Privée</p>
        </div>

        <div className="flex mb-8 border" style={{ borderColor: 'var(--gold)' }}>
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className="flex-1 py-2 text-sm tracking-widest uppercase transition-colors"
              style={{
                background: mode === m ? 'var(--navy)' : 'white',
                color: mode === m ? 'var(--cream)' : 'var(--navy)',
                fontFamily: 'Georgia, serif',
              }}
            >
              {m === 'login' ? 'Connexion' : 'Inscription'}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>Nom complet</label>
              <input className="input-avenir" value={name} onChange={e => setName(e.target.value)} placeholder="Alice Martin" />
            </div>
          )}
          <div>
            <label className="block text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>Email</label>
            <input className="input-avenir" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@avenir.fr" />
          </div>
          <div>
            <label className="block text-xs tracking-widest uppercase mb-1" style={{ color: 'var(--gold)' }}>Mot de passe</label>
            <input className="input-avenir" type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center py-2 border border-red-200 bg-red-50">{error}</p>
          )}

          <button
            className="btn-gold w-full mt-6 text-sm tracking-widest uppercase"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </div>
      </div>
    </div>
  );
}
