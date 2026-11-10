'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChefHat, ChevronDown, UtensilsCrossed } from 'lucide-react';

const views = [
  { id: 'customer', label: 'Customer', description: 'Find your everyday favourites', icon: UtensilsCrossed },
  { id: 'cook', label: 'Master Chefs', description: 'Your kitchen, thoughtfully managed', icon: ChefHat }
];

export default function ViewSwitcher({ role, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const trigger = useRef(null);
  const options = useRef([]);
  const current = views.find(view => view.id === role) || views[0];
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    options.current[views.findIndex(view => view.id === current.id)]?.focus();
    const dismiss = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open, current.id]);

  function closeAndFocus() { setOpen(false); trigger.current?.focus(); }
  function onKeyDown(event) {
    if (event.key === 'Escape' && open) { event.preventDefault(); closeAndFocus(); }
    if (!open || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = options.current.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? views.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + views.length) % views.length;
    options.current[next]?.focus();
  }

  return <div className="view-switcher" ref={root} onKeyDown={onKeyDown} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <button ref={trigger} type="button" className={`view-trigger ${open ? 'is-open' : ''}`} aria-label={`Switch view: ${current.label}`} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? 'view-menu' : undefined} onClick={() => setOpen(value => !value)} onKeyDown={event => { if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      <span className="view-icon"><Icon size={17} aria-hidden="true" /></span>
      <span>{current.label}</span>
      <ChevronDown className="view-chevron" size={16} strokeWidth={2} aria-hidden="true" />
    </button>
    {open && <div id="view-menu" className="view-menu" role="menu" aria-label="Choose your view">
      <span className="view-menu-heading" role="presentation">MAKE YOURSELF AT HOME</span>
      {views.map((view, index) => { const OptionIcon = view.icon; const selected = role === view.id; return <button key={view.id} ref={node => { options.current[index] = node; }} type="button" role="menuitemradio" aria-checked={selected} tabIndex={-1} className={`view-option ${selected ? 'is-selected' : ''}`} onClick={() => { onChange(view.id); closeAndFocus(); }}>
        <span className="view-option-icon"><OptionIcon size={19} aria-hidden="true" /></span>
        <span className="view-option-copy"><strong>{view.label}</strong><small>{view.description}</small></span>
        {selected && <Check size={16} className="view-check" aria-hidden="true" />}
      </button>; })}
    </div>}
  </div>;
}
