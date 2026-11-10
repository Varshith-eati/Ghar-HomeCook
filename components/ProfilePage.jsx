'use client';

import { useState } from 'react';
import { ChefHat, Check, LogOut, UtensilsCrossed } from 'lucide-react';
import { areas } from '../lib/data.mjs';
import { roleSessionKey } from '../lib/account';

export default function ProfilePage({ role, user, saved, onSave, onContinue, preview }) {
  const chef = role === 'cook';
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [expired, setExpired] = useState(false);
  const Icon = chef ? ChefHat : UtensilsCrossed;
  function signOut() {
    try { sessionStorage.removeItem(roleSessionKey(user.id)); } catch {}
  }
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError(''); setStatus('');
    const values = Object.fromEntries(form.entries());
    if (chef) {
      values.areas = form.getAll('areas');
      if (!values.areas.length) { setError('Choose at least one service area.'); return; }
    }
    setBusy(true);
    try {
      const response = await fetch('/api/profile/' + role, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, revision: saved?.revision || 0 })
      });
      if (response.status === 401) setExpired(true);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not save this profile.');
      onSave(body.profile);
      setStatus('Your profile is saved.');
    } catch (err) { setError(err.message || 'Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  return <section className="profile-page">
    <div className="profile-title"><span className="welcome-symbol"><Icon size={25}/></span>
      <div><h1>{chef ? 'Master Chefs profile' : 'Customer profile'}</h1><p>{chef ? 'Tell us about your kitchen and where you deliver.' : 'Choose how and where you like to receive your meals.'}</p></div>
    </div>
    <div className="profile-columns"><form className="panel profile-form" onSubmit={submit} onChange={()=>setStatus('')}>
      <h2>{chef ? 'Kitchen details' : 'Meal preferences'}</h2>
      <label className="form-label">Your name<input name="name" autoComplete="name" maxLength={70} defaultValue={saved?.name || user.name || ''} required/></label>
      {chef ? <>
        <label className="form-label">Kitchen name<input name="kitchen" maxLength={80} defaultValue={saved?.kitchen || ''} required/></label>
        <label className="form-label">Signature cuisine<input name="cuisine" maxLength={70} placeholder="e.g. Gujarati thalis" defaultValue={saved?.cuisine || ''} required/></label>
        <fieldset><legend>Service areas</legend><div className="area-checks">{areas.map(area=><label key={area}><input name="areas" type="checkbox" value={area} defaultChecked={saved?.areas?.includes(area) || false}/>{area}</label>)}</div></fieldset>
        <label className="form-label">About your kitchen (optional)<textarea name="bio" maxLength={300} rows={3} defaultValue={saved?.bio || ''}/></label>
      </> : <>
        <label className="form-label">Delivery locality<select name="locality" defaultValue={saved?.locality || ''} required><option disabled value="">Choose your area</option>{areas.map(area=><option key={area}>{area}</option>)}</select></label>
        <label className="form-label">Dietary preference<select name="diet" defaultValue={saved?.diet || 'No preference'}>{['No preference','Vegetarian','Vegan','Jain','High protein','Non-vegetarian'].map(diet=><option key={diet}>{diet}</option>)}</select></label>
        <label className="form-label">Preferred meals<select name="timing" defaultValue={saved?.timing || 'lunch'}><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="both">Lunch and dinner</option></select></label>
      </>}
      {error && <p className="form-error" role="alert">{error} {expired && <a href="/login/">Sign in again</a>}</p>}
      <div className="profile-actions"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}<Check size={16}/></button><span role="status">{status}</span></div>
    </form><aside className="panel account-details"><h2>Account</h2><p>{user.email}</p><button className="btn secondary full" onClick={onContinue}>{chef ? 'Open kitchen overview' : 'Explore kitchens'}</button>
    <a className="text-btn" target="_top" href={preview ? '/__preview/signout' : '/signout-with-chatgpt?return_to=%2Flogin%2F'} onClick={signOut}><LogOut size={15}/>Sign out</a></aside></div>
  </section>;
}
