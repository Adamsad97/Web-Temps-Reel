'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return;
    setLoading(true); setError('');
    try { await login(email, password); router.push('/dashboard'); }
    catch { setError('Identifiants incorrects. Veuillez réessayer.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight:'100vh',
      background:'linear-gradient(145deg,var(--slate-900) 0%,var(--slate-800) 55%,var(--slate-700) 100%)',
      display:'flex',alignItems:'center',justifyContent:'center',position:'relative',overflow:'hidden',
    }}>
      {/* Decorative rings */}
      {[500,340,200].map((s,i)=>(
        <div key={i} style={{position:'absolute',top:-s*.24,right:-s*.24,width:s,height:s,borderRadius:'50%',border:`1px solid rgba(181,129,62,${.07-i*.02})`,pointerEvents:'none'}}/>
      ))}
      <div className="fade-in" style={{
        width:'100%',maxWidth:420,background:'rgba(246,247,249,.98)',
        borderRadius:16,overflow:'hidden',
        boxShadow:'0 24px 64px rgba(0,0,0,.45)',border:'1px solid rgba(181,129,62,.18)',
      }}>
        {/* Header band */}
        <div style={{background:'linear-gradient(135deg,var(--slate-900) 0%,var(--slate-800) 100%)',padding:'30px 36px 26px',borderBottom:'2px solid var(--bronze)',textAlign:'center'}}>
          <div style={{width:52,height:52,background:'linear-gradient(135deg,var(--bronze) 0%,var(--bronze-light) 100%)',borderRadius:12,margin:'0 auto 14px',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(181,129,62,.4)'}}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" stroke="var(--slate-900)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{fontFamily:'var(--font-display)',fontSize:'1.5rem',fontWeight:700,color:'var(--bronze)',letterSpacing:'.14em'}}>AVENIR</div>
          <div style={{fontSize:'.68rem',color:'rgba(246,247,249,.45)',letterSpacing:'.16em',textTransform:'uppercase',marginTop:2}}>Banque Privée</div>
        </div>
        {/* Form */}
        <div style={{padding:'30px 36px 34px'}}>
          <h2 style={{fontSize:'1.1rem',fontWeight:700,color:'var(--slate-900)',marginBottom:4}}>Connexion à votre espace</h2>
          <p style={{fontSize:'.82rem',color:'var(--text-muted)',marginBottom:22}}>Veuillez saisir vos identifiants pour accéder à votre tableau de bord.</p>
          {['email','password'].map(field=>(
            <div key={field} style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:'.76rem',fontWeight:700,color:'var(--slate-900)',marginBottom:5,textTransform:'uppercase',letterSpacing:'.06em'}}>
                {field==='email'?'Adresse e-mail':'Mot de passe'}
              </label>
              <input className="input-avenir" type={field} placeholder={field==='email'?'votre@email.fr':'••••••••'}
                value={field==='email'?email:password}
                onChange={e=>field==='email'?setEmail(e.target.value):setPassword(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleLogin()}
                autoFocus={field==='email'}/>
            </div>
          ))}
          {error&&<div style={{background:'rgba(155,53,53,.07)',border:'1px solid rgba(155,53,53,.22)',borderRadius:'var(--r)',padding:'10px 14px',marginTop:12,fontSize:'.83rem',color:'var(--danger)'}}>{error}</div>}
          <button className="btn-primary" style={{width:'100%',justifyContent:'center',marginTop:22,padding:'.75rem'}} onClick={handleLogin} disabled={loading}>
            {loading?'Connexion en cours…':'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  );
}
