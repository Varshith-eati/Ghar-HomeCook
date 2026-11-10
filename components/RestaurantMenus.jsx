'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Store } from 'lucide-react';
import { PageHeading, Modal, Empty } from './UI';
import { money } from '../lib/domain.mjs';
import MenuEditor from './MenuEditor';

export default function RestaurantMenus({menus,remove,notify,...editorProps}) {
  const [editor,setEditor] = useState(null);
  const [pending,setPending] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  function confirmDelete(menu) { setPending(menu); setError(''); }
  async function deleteMenu() {
    if (busy || !pending) return;
    setBusy(true);
    try {
      await remove(pending);
      notify('Menu deleted from ' + pending.name + '.');
      setPending(null);
    } catch (e) {setError(e.message || 'Could not delete this menu.');}
    finally {setBusy(false);}
  }
  if (editor) return <MenuEditor {...editorProps} initial={editor.menu} restaurant={editor.restaurant} notify={notify} onBack={()=>setEditor(null)}/>;
  const groups = new Map();
  for (const menu of [...menus].sort((a,b)=>a.name.localeCompare(b.name)||a.menuName.localeCompare(b.menuName))) {
    const key = menu.name.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(menu);
  }
  return <><PageHeading eyebrow="MASTER CHEFS" title="Restaurant menus" subtitle="Manage each restaurant’s menus, supply days and plan prices."
    action={<button className="btn primary" onClick={()=>setEditor({})}><Plus size={17}/>Create menu</button>}/>
    {!menus.length && <Empty icon={Store} title="Your first restaurant menu" text="Choose Create menu to add a restaurant, its dishes and subscription prices."/>}
    <div className="restaurant-list">{Array.from(groups,([key,items])=><section className="panel" key={key}>
      <div className="panel-heading"><h2>{items[0].name}</h2><button className="small-btn" onClick={()=>setEditor({restaurant:items[0].name})}><Plus size={15}/>Add menu</button></div>
      {items.map(menu=><div className="restaurant-menu-row" key={menu.id}><div><h3>{menu.menuName}</h3><small>{menu.mode==='weekly'?'Weekly menu':'Selected supply days'} · {money(menu.price)} / meal</small></div>
        <div className="restaurant-actions"><button className="small-btn" aria-label={'Edit '+menu.menuName+' at '+menu.name} onClick={()=>setEditor({menu})}><Pencil size={15}/>Edit</button>
          <button className="small-btn delete-menu" aria-label={'Delete '+menu.menuName+' at '+menu.name} onClick={()=>confirmDelete(menu)}><Trash2 size={15}/>Delete</button></div></div>)}
    </section>)}</div>
    {pending && <Modal title="Delete menu?" onClose={()=>{if(!busy)setPending(null);}}>
      <p><strong>{pending.menuName}</strong> at <strong>{pending.name}</strong> will be removed from customer browsing. Existing subscriptions keep their saved meals and prices.</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="restaurant-actions"><button className="btn secondary" disabled={busy} onClick={()=>setPending(null)}>Cancel</button>
        <button className="btn danger-menu" disabled={busy} onClick={deleteMenu}>{busy?'Deleting…':'Delete menu'}</button></div>
    </Modal>}</>;
}
