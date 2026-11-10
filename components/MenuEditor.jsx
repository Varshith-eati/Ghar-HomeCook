'use client';
import { useRef, useState } from 'react';
import { CalendarDays, Check, ImagePlus, Plus, Repeat2, Trash2 } from 'lucide-react';
import { areas, weekdays } from '../lib/data.mjs';
import { addDays, money, niceDate, quote } from '../lib/domain.mjs';
import { PageHeading } from './UI';
import './menu.css';

async function mealPhoto(file) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15*1024*1024)
    throw new Error('Choose a JPG, PNG or WebP photo under 15 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 960/Math.max(bitmap.width,bitmap.height));
    canvas.width = Math.max(1,Math.round(bitmap.width*scale));
    canvas.height = Math.max(1,Math.round(bitmap.height*scale));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for (const quality of [.82,.65,.42,.25]) {
      const photo = canvas.toDataURL('image/jpeg',quality);
      if (photo.length < 340000) return photo;
    }
    throw new Error('Try a smaller photo.');
  } finally { bitmap.close(); }
}

export default function MenuEditor({initial,legacy,profile,today,publish,notify,restaurant,onBack}) {
  const [draft,setDraft] = useState(()=>initial || {
    name:restaurant ?? profile?.kitchen ?? '', menuName:'', createKey:crypto.randomUUID(), revision:0, price:legacy.price, weekly:5, monthly:10,
    areas:profile?.areas || legacy.areas, mode:'weekly', recurring:[], dates:{},
    week:legacy.menu.map(dish=>({dish,photo:''}))
  });
  const [target,setTarget] = useState(()=>initial?.mode==='dates' ? initial.recurring[0] ?? Object.keys(initial.dates).sort()[0] : 0);
  const [date,setDate] = useState(addDays(today,1));
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const lock = useRef(false);
  const item = typeof target === 'number' ? draft.week[target] : draft.dates[target];
  const title = typeof target === 'number' ? weekdays[target] : target ? niceDate(target) : '';
  const dated = draft.mode === 'dates';
  const dates = Object.keys(draft.dates).sort();
  function patch(fields) { setDraft(d=>({...d,...fields})); setError(''); }
  function changeMeal(fields) {
    setDraft(d=>typeof target === 'number' ? {...d,week:d.week.map((meal,i)=>i===target?{...meal,...fields}:meal)} :
      {...d,dates:{...d.dates,[target]:{...d.dates[target],...fields}}});
  }
  function mode(value) {
    patch({mode:value});
    setTarget(value==='weekly'?0:draft.recurring[0] ?? dates[0]);
  }
  function toggleDay(i) {
    const selected = draft.recurring.includes(i);
    const next = selected ? draft.recurring.filter(d=>d!==i) : [...draft.recurring,i].sort();
    patch({recurring:next});
    setTarget(selected && target===i ? next[0] ?? dates[0] : selected ? target : i);
  }
  function addDate() {
    if (!date || date<today || date>addDays(today,365)) {setError('Choose a date within the next year.');return;}
    if (!draft.dates[date]) patch({dates:{...draft.dates,[date]:{dish:'',photo:''}}});
    setTarget(date);
  }
  function removeDate() {
    const next={...draft.dates}; delete next[target];
    patch({dates:next}); setTarget(Object.keys(next).sort()[0] ?? draft.recurring[0]);
  }
  async function attach(e) {
    const file=e.target.files?.[0]; e.target.value='';
    if (!file || lock.current) return;
    lock.current=true; setBusy('photo'); setError('');
    try { changeMeal({photo:await mealPhoto(file)}); }
    catch (err) {setError(err.message || 'Could not read this photo.');}
    finally {lock.current=false;setBusy('');}
  }
  async function save(e) {
    e.preventDefault(); if (lock.current) return;
    if (dated && !draft.recurring.length && !dates.some(d=>d>=today)) {setError('Select a recurring weekday or add an upcoming supply date.');return;}
    const requiredDays=dated?draft.recurring:weekdays.map((_,i)=>i);
    const missing=[...requiredDays,...(dated?dates:[])].find(t=>!(typeof t==='number'?draft.week[t]:draft.dates[t]).dish.trim());
    if (missing!==undefined) {setTarget(missing);setError('Add the dish for this day before publishing.');return;}
    lock.current=true;setBusy('save');setError('');
    try {const result=await publish(draft);setDraft(result);notify('Your menu and plan prices are published.');onBack();}
    catch (err) {setError(err.message || 'Could not publish. Your edits are still here.');}
    finally {lock.current=false;setBusy('');}
  }
  return <><PageHeading eyebrow="MASTER CHEFS" title={initial ? 'Edit menu' : 'Create menu'} action={<button className="btn secondary" disabled={!!busy} onClick={onBack}>Back to restaurant menus</button>}/>
    <form onSubmit={save}><fieldset className="menu-fields" disabled={!!busy}><div className="editor-grid">
      <section className="panel menu-panel"><h2>Menu details</h2><label className="form-label">Restaurant name<input value={draft.name} required maxLength={80} onChange={e=>patch({name:e.target.value})}/></label><label className="form-label">Menu name<input value={draft.menuName} placeholder="e.g. Weekday lunch" required maxLength={80} onChange={e=>patch({menuName:e.target.value})}/></label><h3>Supply schedule</h3>
        <div className="schedule-options">{[['weekly','Weekly menu','Repeat a full seven-day menu.',Repeat2],['dates','Selected days','Choose weekdays and individual dates.',CalendarDays]].map(([value,label,copy,Icon])=><button type="button" key={value} onClick={()=>mode(value)} aria-pressed={draft.mode===value}><Icon size={20}/><strong>{label}</strong><small>{copy}</small></button>)}</div>
        {dated && <><h3>Recurring weekdays</h3><div className="day-tabs">{weekdays.map((d,i)=><button type="button" key={d} aria-pressed={draft.recurring.includes(i)} className={draft.recurring.includes(i)?'active':''} onClick={()=>toggleDay(i)}>{d.slice(0,3)}</button>)}</div>
          <label className="form-label">Individual supply date<input type="date" value={date} min={today} max={addDays(today,365)} onChange={e=>setDate(e.target.value)}/></label>
          <button className="small-btn" type="button" onClick={addDate}><Plus size={15}/> Add date</button><p className="muted small">A dated meal takes priority over the recurring menu for that day.</p></>}
        <h3>Daily meals</h3>
        <div className="day-tabs menu-days">{(dated?draft.recurring:weekdays.map((_,i)=>i)).map(i=><button type="button" key={i} className={target===i?'active':''} aria-pressed={target===i} onClick={()=>setTarget(i)}>{weekdays[i].slice(0,3)}</button>)}{dated && dates.map(d=><button type="button" key={d} className={target===d?'active':''} aria-pressed={target===d} onClick={()=>setTarget(d)}>{niceDate(d)}</button>)}</div>
        {item ? <div className="dish-editor"><label className="form-label">{title} meal<textarea value={item.dish} rows={3} maxLength={220} onChange={e=>changeMeal({dish:e.target.value})}/></label>
          {item.photo && <img className="dish-photo" src={item.photo} alt={'Meal for '+title}/>}
          <div className="photo-actions"><label className="small-btn photo-picker"><ImagePlus size={16}/>{item.photo?'Replace photo':'Add meal photo'}<input type="file" aria-label={'Upload meal photo for '+title} accept="image/jpeg,image/png,image/webp" onChange={attach}/></label>
          {item.photo && <button type="button" className="text-btn" onClick={()=>changeMeal({photo:''})}>Remove photo</button>}
          {typeof target==='string' && <button type="button" className="text-btn" onClick={removeDate}><Trash2 size={15}/>Remove date</button>}</div>
          <small className="muted">JPG, PNG or WebP · Up to 15 MB</small></div> : <p>Pick a weekday or add a date to enter its meal and photo.</p>}
      </section>
      <div className="editor-side"><section className="panel"><h2>Plan prices</h2>
        <label className="form-label">Base price per meal (₹)<input type="number" min="30" max="2000" required value={draft.price} onChange={e=>patch({price:e.target.value===''?'':Number(e.target.value)})}/></label>
        {[['weekly','Weekly',7],['monthly','Monthly',30]].map(([key,label,count])=><label key={key} className="form-label">{label} discount (%)<input type="number" min="0" max="100" step="1" required value={draft[key]} onChange={e=>patch({[key]:e.target.value===''?'':Number(e.target.value)})}/><small className="muted">{money(quote(draft.price,count,'lunch',draft))} for {count} meals</small></label>)}</section>
        <section className="panel"><h2>Delivery areas</h2>
        <div className="coverage-options">{areas.map(a=><label key={a}><input type="checkbox" checked={draft.areas.includes(a)} onChange={e=>patch({areas:e.target.checked?[...draft.areas,a]:draft.areas.filter(x=>x!==a)})}/>{a}</label>)}</div></section>
        {error&&<p className="form-error" role="alert">{error}</p>}<button className="btn primary full">{busy==='save'?'Publishing…':busy==='photo'?'Preparing photo…':'Publish menu & prices'}<Check size={17}/></button></div>
    </div></fieldset></form></>;
}
