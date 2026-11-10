'use client';
import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { weekdays } from '../lib/data.mjs';
import { addDays, menuFor, niceDate, serves, todayIST, weekdayIndex } from '../lib/domain.mjs';

export default function MenuPreview({provider}) {
  const today = todayIST(), selected = provider.mode==='dates';
  const options = selected ? Array.from({length:366},(_,i)=>addDays(today,i)).filter(d=>serves(provider,d)) : [];
  const [choice,setChoice] = useState('');
  const [day,setDay] = useState(weekdayIndex(today));
  const date = selected ? (options.includes(choice)?choice:options[0]) : addDays(today,(day-weekdayIndex(today)+7)%7);
  const entry = date && menuFor(provider,date);
  return <section><div className="section-label"><h3>{selected?'Supply dates & meals':'Weekly menu'}</h3></div>
    {selected ? <>{!!provider.recurring.length && <p className="small">Every {provider.recurring.map(i=>weekdays[i]).join(', ')}</p>}
      {options.length>0 && <label className="form-label">View a supply date<select value={date} onChange={e=>setChoice(e.target.value)}>{options.map(d=><option key={d} value={d}>{weekdays[weekdayIndex(d)]}, {niceDate(d)} {d.slice(0,4)}</option>)}</select></label>}</>
      : <div className="day-tabs">{weekdays.map((d,i)=><button type="button" key={d} aria-pressed={day===i} className={day===i?'active':''} onClick={()=>setDay(i)}>{d.slice(0,3)}</button>)}</div>}
    {entry ? <div className="menu-preview">{entry.photo ? <img className="customer-dish-photo" src={entry.photo} alt={entry.dish}/> : <div><UtensilsCrossed size={26}/></div>}<section><span className="eyebrow">{weekdays[weekdayIndex(date)]}</span><h3>{entry.dish}</h3></section></div> : <p>No upcoming supply dates have been posted.</p>}
  </section>;
}
