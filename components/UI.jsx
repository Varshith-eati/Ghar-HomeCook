'use client';
import { useEffect, useRef } from 'react';
import { X, ArrowUpRight, Leaf, Heart, Star, BadgeCheck, MapPin, ArrowRight } from 'lucide-react';
import { money } from '../lib/domain.mjs';

export function Logo() { return <div className="brand"><span className="brand-mark"><Leaf size={23} strokeWidth={2} /></span><span>ghar<span className="brand-dot">.</span></span></div>; }
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const node = ref.current; node.showModal(); return () => node.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }} aria-labelledby="modal-title"><div className="modal-head"><div><span className="eyebrow">A LITTLE CLOSER TO HOME</span><h2 id="modal-title">{title}</h2></div><button className="icon-btn" aria-label="Close dialog" onClick={onClose}><X size={21} /></button></div><div className="modal-body">{children}</div></dialog>;
}
export function Empty({ icon: Icon = Leaf, title, text, action, label = 'Explore kitchens' }) { return <div className="empty"><span className="empty-icon"><Icon size={30} /></span><h3>{title}</h3><p>{text}</p>{action && <button className="btn primary" onClick={action}>{label}<ArrowRight size={17}/></button>}</div>; }
export function PageHeading({ eyebrow, title, subtitle, action }) { return <div className="page-heading"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</div>; }
export function Metric({ label, value, caption, icon: Icon }) { return <div className="metric"><div className="metric-top"><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{caption}</small></div>; }
export function ProviderCard({ provider: p, saved, onSave, onOpen }) {
  return <article className="provider-card"><div className="card-photo"><img src={p.image} alt={`${p.cuisine} meal inspiration`} loading="lazy" /><span className="photo-badge"><span className="veg-mark" />{p.published ? 'Chef’s menu' : p.tags.includes('Non-vegetarian') ? 'Home cooked' : 'Fresh & vegetarian'}</span><button className={`save-btn ${saved ? 'saved' : ''}`} aria-label={`${saved ? 'Unsave' : 'Save'} ${p.name}`} aria-pressed={saved} onClick={onSave}><Heart size={19} fill={saved ? 'currentColor' : 'none'} /></button></div><div className="card-content"><div className="kitchen-title"><h3><button onClick={onOpen}>{p.name}</button></h3>{!p.published && <span className="rating"><Star size={12} fill="currentColor" />{p.rating.toFixed(1)}</span>}</div><div className="cook-line"><span className="avatar tiny" style={{background:p.accent}}>{p.initials}</span>By {p.cook}<BadgeCheck size={15} className="green" /></div><div className="tag-row"><span>{p.cuisine}</span>{p.tags.slice(0,1).map(t => <span key={t}>{t}</span>)}</div><p className="area-line"><MapPin size={13}/>{p.areas.join(' · ')}</p><div className="card-bottom"><div><strong>{money(p.price)}</strong><span> / meal</span><small>{p.mode==='dates'?'Selected supply days':'Weekly menu'}</small></div><button className="small-btn" onClick={onOpen}>View menu <ArrowUpRight size={17}/></button></div></div></article>;
}
export function Notice({ children, tone = '' }) { return <p className={`notice ${tone}`}>{children}</p>; }
