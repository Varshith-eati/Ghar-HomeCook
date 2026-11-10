'use client';
import { useEffect, useState } from 'react';
import { LayoutGrid, CalendarDays, Truck, Heart, ClipboardList, Moon, Sun, Bell, Menu, X, ArrowUpRight, CircleHelp, Leaf, Check } from 'lucide-react';
import { kitchenCard, useKitchens } from '../lib/kitchens';
import RestaurantMenus from './RestaurantMenus';
import { useDemoStore } from '../lib/store';
import { todayIST, scheduledMeals, niceDate } from '../lib/domain.mjs';
import { Logo, Modal, Notice } from './UI';
import { Explore, ProviderDetails, Checkout, Subscriptions, Deliveries } from './Customer';
import { CookDashboard } from './Operations';
import ViewSwitcher from './ViewSwitcher';
import ProfilePage from './ProfilePage';
import { profilePaths, roleSessionKey } from '../lib/account';
import { CircleUserRound } from 'lucide-react';

const navs = {
  customer: [{ id:'explore', name:'Explore kitchens', icon:LayoutGrid }, { id:'subscriptions', name:'My subscriptions', icon:CalendarDays }, { id:'deliveries', name:'My deliveries', icon:Truck }, { id:'saved', name:'Saved kitchens', icon:Heart }],
  cook: [{ id:'cook', name:'Kitchen overview', icon:LayoutGrid }, { id:'menu', name:'Restaurant menus', icon:ClipboardList }]
};
export default function Platform({account, initialRole, initialProfile}) {
  const { state: local, update, storageWarning } = useDemoStore(account.user.id);
  const {catalog,error:menuError,publish,remove,retry} = useKitchens();
  const sharedKitchens = (catalog?.kitchens || []).map(kitchenCard);
  const state = local && {...local,providers:[...sharedKitchens,...local.providers]};
  const ownedIds = catalog?.ownedIds || [];
  const ownMenus = (catalog?.kitchens || []).filter(k=>ownedIds.includes(k.id));
  const [profiles, setProfiles] = useState(account.profiles);
  const [role, setRole] = useState(initialRole);
  const [page, setPage] = useState(initialProfile ? 'profile' : navs[initialRole][0].id);
  const [theme, setTheme] = useState('light');
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState('');
  const [locality, setLocality] = useState('All areas');
  const [today, setToday] = useState('');
  useEffect(() => { setTheme(document.documentElement.dataset.theme || 'light'); setToday(todayIST()); const timer=setInterval(() => setToday(todayIST()),60000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (!mobile) return; const close=e=>{if(e.key==='Escape')setMobile(false)}; window.addEventListener('keydown',close); return()=>window.removeEventListener('keydown',close); }, [mobile]);
  const navigation = [...navs[role], { id:'profile', name:role === 'cook' ? 'Kitchen profile' : 'My profile', icon:CircleUserRound }];
  const displayName = profiles[role]?.name || account.user.name || account.user.email;
  const initials = displayName.trim().split(/\s+/).slice(0,2).map(word => word[0]).join('').toUpperCase();
  useEffect(() => {
    try { sessionStorage.setItem(roleSessionKey(account.user.id), role); } catch {}
  }, [role, account.user.id]);
  useEffect(() => {
    function back(event) {
      const previous = event.state;
      const profileRole = Object.keys(profilePaths).find(key => profilePaths[key] === window.location.pathname);
      const nextRole = profileRole || previous?.gharRole || initialRole;
      const nextPage = profileRole ? 'profile' : previous?.gharPage;
      setRole(nextRole);
      setPage(navs[nextRole].some(item => item.id === nextPage) ? nextPage : profileRole ? 'profile' : navs[nextRole][0].id);
      setMobile(false); setModal(null);
    }
    window.addEventListener('popstate', back);
    return () => window.removeEventListener('popstate', back);
  }, [initialRole]);
  function navigate(next, nextRole = role) {
    const path = next === 'profile' ? profilePaths[nextRole] : '/';
    if (window.location.pathname !== path || next !== page || nextRole !== role) {
      window.history.pushState({gharRole:nextRole, gharPage:next}, '', path);
    }
    setRole(nextRole); setPage(next); setMobile(false); window.scrollTo({ top: 0, behavior:'smooth' });
  }
  function switchRole(next) { navigate(page === 'profile' ? 'profile' : navs[next][0].id, next); }
  function toggleTheme() { const next = theme === 'light' ? 'dark' : 'light'; setTheme(next); document.documentElement.dataset.theme = next; try { localStorage.setItem('ghar-theme',next); } catch {} }
  const notify = text => setToast(text);
  const shared = { state, update, notify, today, navigate, open: setModal };
  const activeProvider = modal?.providerId && state?.providers.find(p=>p.id===modal.providerId);
  const nextMeal = state?.subscriptions.filter(s=>s.owner).flatMap(s=>scheduledMeals(s)).filter(m=>m.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0];

  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>{mobile && <button className="mobile-shade" aria-label="Close navigation" onClick={()=>setMobile(false)}/>}
    <aside className={`sidebar ${mobile?'open':''}`}><div className="sidebar-top"><button className="brand-button" onClick={()=>navigate('explore','customer')} aria-label="Ghar home"><Logo/></button><button className="icon-btn mobile-close" aria-label="Close navigation" onClick={()=>setMobile(false)}><X size={20}/></button></div><div className="brand-caption">Good food. A little closer.</div><span className="nav-label">{role==='customer'?'YOUR EVERYDAY':'MASTER CHEFS'}</span><nav aria-label="Main navigation">{navigation.map(({id,name,icon:Icon})=><button key={id} className={`nav-item ${page===id?'active':''}`} aria-current={page===id?'page':undefined} onClick={()=>navigate(id)}><Icon size={20}/><span>{name}</span>{id==='subscriptions'&&state&&<small>{state.subscriptions.filter(s=>s.owner).length}</small>}{id==='saved'&&!!state?.saved.length&&<small>{state.saved.length}</small>}</button>)}</nav>
    <div className="sidebar-bottom"><div className="side-note"><div className="side-note-icon"><Leaf size={22}/></div><h3>Home is a flavour.</h3><p>Find your everyday comfort,<br/>one tiffin at a time.</p><button onClick={()=>{navigate('explore','customer');setModal({type:'how'});}}>How Ghar works <ArrowUpRight size={16}/></button></div><button className="nav-item" onClick={()=>setModal({type:'help'})}><CircleHelp size={19}/><span>Help & support</span></button><div className="sidebar-foot"><span className="live-dot"/>Made for everyday living</div></div></aside>
    <div className="app-main"><header className="topbar"><div className="topbar-left"><button className="icon-btn hamburger" aria-label="Open navigation" aria-expanded={mobile} onClick={()=>setMobile(true)}><Menu size={22}/></button><div className="breadcrumb">Your daily dose of <span>home.</span></div></div><div className="topbar-actions"><ViewSwitcher role={role} onChange={switchRole}/><span className="topbar-separator"/><button className="icon-btn theme-btn" aria-label={theme==='light'?'Switch to dark mode':'Switch to light mode'} title={theme==='light'?'Switch to dark mode':'Switch to light mode'} onClick={toggleTheme}>{theme==='light'?<Moon size={20}/>:<Sun size={20}/>}</button><button className="icon-btn notification-btn" aria-label="Notifications" onClick={()=>setModal({type:'notifications'})}><Bell size={20}/><i/></button><button className="profile-avatar" aria-label={role === 'cook' ? 'Open Master Chefs profile' : 'Open customer profile'} onClick={()=>navigate('profile')}>{initials}</button></div></header>
      <main id="main-content" className="main-content">{menuError&&<Notice tone="warning">{menuError} <button className="text-btn" onClick={retry}>Try again</button></Notice>}{storageWarning&&<Notice tone="warning">Browser storage is unavailable or was reset. Your changes may only last for this visit.</Notice>}{!state||!today?<div className="loading"><Logo/><p>Setting the table…</p></div>:<>
      {(page==='explore'||page==='saved')&&<Explore {...shared} savedOnly={page==='saved'} locality={locality} setLocality={setLocality}/>}
      {page==='subscriptions'&&<Subscriptions {...shared}/>}
      {page==='deliveries'&&<Deliveries {...shared}/>}
      {page==='cook'&&<CookDashboard {...shared} chefProfile={profiles.cook} kitchenIds={ownedIds}/>}
      {page==='menu'&&(catalog ? <RestaurantMenus menus={ownMenus} remove={remove} legacy={local.providers.find(p=>p.id==='p1')} profile={profiles.cook} today={today} publish={publish} notify={notify}/> : <p role="status">{menuError || 'Loading your menu…'}</p>)}
      {page==='profile'&&<ProfilePage key={role} role={role} user={account.user} saved={profiles[role]} preview={account.preview} onContinue={()=>navigate(navs[role][0].id)} onSave={profile=>setProfiles(current=>({...current,[role]:profile}))}/>}
      <footer className="main-footer"><span>Made with care. Served with love.</span><span>Demo experience · Fictional kitchens · No payments</span><button onClick={()=>setModal({type:'about'})}>About this demo <ArrowUpRight size={12}/></button></footer></>}</main></div>
    {toast&&<div className="toast" role="status"><span><Check size={17}/></span>{toast}</div>}
    {modal?.type==='provider'&&activeProvider&&<Modal title={activeProvider.name} onClose={()=>setModal(null)} wide><ProviderDetails provider={activeProvider} onSubscribe={()=>setModal({type:'checkout',providerId:activeProvider.id})}/></Modal>}
    {modal?.type==='checkout'&&activeProvider&&<Modal title="Your daily comfort, sorted." onClose={()=>setModal(null)}><Checkout {...shared} provider={activeProvider} preferences={profiles.customer} onDone={()=>{setModal(null);navigate('subscriptions');}}/></Modal>}
    {modal?.type==='how'&&<Modal title="A little routine. A lot of comfort." onClose={()=>setModal(null)}><div className="how-steps">{[['01','Find your master chef','Explore menus, dietary preferences and kitchens that deliver to your locality.'],['02','Make it your everyday','Choose a daily, weekly or monthly plan. Pick lunch, dinner or both, and your delivery slot.'],['03','Life happens. Your plan adapts.','Skip before the 2-hour cutoff or pause from tomorrow. Your meals stay yours, and your plan resumes automatically.']].map(([num,title,text])=><div key={num}><span>{num}</span><section><h3>{title}</h3><p>{text}</p></section></div>)}</div><button className="btn primary full" onClick={()=>{setModal(null);navigate('explore');}}>Find my kitchen <ArrowUpRight size={18}/></button></Modal>}
    {modal?.type==='help'&&<Modal title="We’ve saved you a seat." onClose={()=>setModal(null)}><div className="faq"><details open><summary>How do skips and credits work?</summary><p>Skip at least 2 hours before your selected delivery slot. That meal moves to the end of your plan, and the saved meal appears in your credit history. Credits are meal entitlements, not cash refunds.</p></details><details><summary>Can I pause my subscription?</summary><p>Yes. Choose an inclusive date range beginning tomorrow or later. Deliveries resume the day after your pause ends, with your remaining meals preserved.</p></details><details><summary>Are these real kitchens and orders?</summary><p>This first version uses fictional kitchens and local demo data. Subscribing does not take payment or order real food. The view menu lets you switch between Customer and Master Chefs.</p></details><details><summary>Where is my data saved?</summary><p>Your customer and kitchen profiles are saved to your signed-in account. Published menus and meal photos are shared with customers on Ghar. Demo meal plans are saved in this browser.</p></details></div></Modal>}
    {modal?.type==='notifications'&&<Modal title="A little update for you." onClose={()=>setModal(null)}><div className="notification-item"><CalendarDays size={24}/><div><h3>{nextMeal?'Your next meal is on the calendar':'Your next routine starts here'}</h3><p>{nextMeal?`${niceDate(nextMeal.date)} · ${nextMeal.meal} · ${nextMeal.slot}`:'Explore a kitchen and choose a plan that fits your day.'}</p></div></div><Notice>Demo notifications reflect your saved plans. Live delivery alerts will be added with the backend.</Notice><button className="btn primary full" onClick={()=>{setModal(null);navigate(role==='customer'?'deliveries':navs[role][0].id);}}>View dashboard <ArrowUpRight size={17}/></button></Modal>}
    {modal?.type==='about'&&<Modal title="The first serving." onClose={()=>setModal(null)}><p className="body-copy">Ghar is a working first version of your home-cooked meal subscription platform. Kitchens, cooks, reviews, customers and orders are fictional examples. Food photos are illustrative.</p><p className="body-copy">Built with Next.js, React and Tailwind. Published kitchen menus and photos are available to signed-in customers. Demo plans, saved kitchens and delivery updates persist in this browser. Sign in with ChatGPT to save customer and Master Chefs profiles to your account. Meal orders and payments are simulated.</p><p className="muted">Meal imagery: <a href="https://unsplash.com" target="_blank" rel="noreferrer">Unsplash</a>. Demo service area: Bengaluru. All delivery times are IST.</p></Modal>}
  </div>;
}
