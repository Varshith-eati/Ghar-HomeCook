'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, Check, ChefHat, Leaf, Moon, Sun, UtensilsCrossed } from 'lucide-react';
import { Logo } from './UI';
import Platform from './Platform';
import { importPreviousDemo, canImportPreviousDemo } from '../lib/store';
import { profilePaths, roleSessionKey } from '../lib/account';

function WelcomeLayout({ children }) {
  const [theme, setTheme] = useState('light');
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'light'); }, []);
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem('ghar-theme', next); } catch {}
  }
  return <main className="welcome-shell">
    <header className="welcome-header"><Logo/><button className="icon-btn" onClick={toggleTheme} aria-label={'Switch to ' + (theme === 'light' ? 'dark' : 'light') + ' mode'}>{theme === 'light' ? <Moon size={19}/> : <Sun size={19}/>}</button></header>
    <div className="welcome-layout"><section className="welcome-panel">{children}</section><div className="welcome-photo"><img src="/thali.jpg" alt="Home-style thali with roti and dal"/></div></div>
  </main>;
}

function Login({ preview }) {
  return <WelcomeLayout>
    <span className="welcome-symbol"><Leaf aria-hidden="true"/></span>
    <h1>Sign in to Ghar</h1>
    <p>Find your daily meals or manage your kitchen with one account.</p>
    {preview
      ? <form action="/__preview/signin" method="post"><button className="btn primary full">Continue with local preview account <ArrowRight size={17}/></button></form>
      : <a className="btn primary full" target="_top" href="/signin-with-chatgpt?return_to=%2Fchoose-role%2F">Continue with ChatGPT <ArrowRight size={17}/></a>}
  </WelcomeLayout>;
}

function RoleQuestion({ account }) {
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [importDemo, setImportDemo] = useState(false);
  const [hasPrevious] = useState(() => canImportPreviousDemo(account.user.id));
  function proceed(event) {
    event.preventDefault();
    if (!role) return;
    try {
      if (importDemo) importPreviousDemo(account.user.id);
      sessionStorage.setItem(roleSessionKey(account.user.id), role);
      window.location.assign(profilePaths[role]);
    } catch { setError('Allow browser storage so Ghar can remember your choice for this visit.'); }
  }
  return <WelcomeLayout><h1>How would you like to use Ghar?</h1>
    <p>Choose a view to open your profile. You can switch views later.</p>
    <form onSubmit={proceed}>
      <fieldset className="role-choices"><legend className="sr-only">Choose your role</legend>
        {[
          { id: 'customer', label: 'Customer', text: 'Find a kitchen and plan my meals', Icon: UtensilsCrossed },
          { id: 'cook', label: 'Master Chefs', text: 'Run my kitchen and prepare orders', Icon: ChefHat }
        ].map(({id, label, text, Icon}) => <label key={id} className={'role-choice ' + (role === id ? 'chosen' : '')}>
          <input type="radio" name="workspace" value={id} checked={role === id} onChange={() => setRole(id)}/>
          <span className="role-symbol"><Icon size={22}/></span><span><strong>{label}</strong><small>{text}</small></span>
          <span className="choice-check" aria-hidden="true">{role === id && <Check size={13}/>}</span>
        </label>)}
      </fieldset>
      {hasPrevious && <label className="import-choice"><input type="checkbox" checked={importDemo} onChange={event=>setImportDemo(event.target.checked)}/>Import my previous Ghar demo data from this browser</label>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="btn primary full" disabled={!role}>Continue to my profile <ArrowRight size={17}/></button>
    </form>
  </WelcomeLayout>;
}

export default function AccountEntry({ route = 'home' }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    // Only the loopback preview needs to discover its alternate sign-in button.
    if (route === 'login' && !['127.0.0.1', 'localhost', '[::1]'].includes(window.location.hostname)) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
      setError(true);
    }, 12000);
    async function load() {
      setError(false);
      try {
        const response = await fetch('/api/account', { cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (!response.ok && response.status !== 401) throw new Error();
        setResult(response.ok ? payload : { user: null, preview: payload.preview });
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { window.clearTimeout(timeout); }
    }
    load();
    const onRestore = event => { if (event.persisted) window.location.reload(); };
    window.addEventListener('pageshow', onRestore);
    return () => { window.clearTimeout(timeout); controller.abort(); window.removeEventListener('pageshow', onRestore); };
  }, [attempt, route]);
  if (route === 'login') return <Login preview={result?.preview}/>;
  if (error) return <WelcomeLayout><h1>Couldn’t open your account</h1><p>Check your connection and try again.</p><button className="btn primary" onClick={() => setAttempt(n => n + 1)}>Try again</button></WelcomeLayout>;
  if (!result) return <div className="loading" role="status"><Logo/><p>Opening Ghar…</p></div>;
  if (!result.user) return <Login preview={result.preview}/>;
  let chosen;
  try { chosen = sessionStorage.getItem(roleSessionKey(result.user.id)); } catch {}
  if (route === 'choose') return <RoleQuestion account={result}/>;
  if (!['customer','cook'].includes(chosen)) return route === 'home' ? <Login preview={result.preview}/> : <RoleQuestion account={result}/>;
  const profile = route === 'customer' || route === 'cook';
  return <Platform account={result} initialRole={profile ? route : chosen} initialProfile={profile}/>;
}
