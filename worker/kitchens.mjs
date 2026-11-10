const menuAreas = ['Koramangala', 'HSR Layout', 'Indiranagar', 'BTM Layout'];
const json = (body, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'private, no-store'}});
const hex = bytes => Array.from(new Uint8Array(bytes), n => n.toString(16).padStart(2,'0')).join('');
async function digest(bytes) { return hex(await crypto.subtle.digest('SHA-256', bytes)); }
function whole(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('Check ' + label + '.');
  return value;
}
function shortText(value, max, label, required = true) {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new Error('Check ' + label + '.');
  return value.trim();
}
function mealEntry(entry, required, kitchenId, uploads) {
  const dish = shortText(entry?.dish, 220, 'the meal description', required);
  let photo = entry.photo || '';
  const prefix = '/api/menu-photos/' + kitchenId + '/';
  if (photo && typeof photo !== 'string') throw new Error('Choose a valid photo.');
  if (photo.startsWith('data:image/jpeg;base64,')) {
    const encoded = photo.slice(23);
    if (encoded.length > 340000) throw new Error('Choose a smaller photo.');
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) throw new Error('Choose a JPEG photo.');
    const result = {dish, photo:''};
    uploads.push({bytes, result, prefix});
    return result;
  }
  if (photo && !(photo.startsWith(prefix) && /^[a-f0-9]{64}$/.test(photo.slice(prefix.length)))) throw new Error('Choose a photo from your kitchen.');
  return {dish, photo};
}
function settings(input, kitchenId, uploads) {
  if (!['weekly','dates'].includes(input.mode)) throw new Error('Choose a menu schedule.');
  if (!Array.isArray(input.week) || input.week.length !== 7) throw new Error('Check the weekly menu.');
  if (!Array.isArray(input.recurring) || input.recurring.some(i=>!Number.isInteger(i) || i<0 || i>6)) throw new Error('Check the recurring weekdays.');
  const recurring = [...new Set(input.recurring)].sort();
  const week = input.week.map((e,i) => mealEntry(e, input.mode === 'weekly' || recurring.includes(i), kitchenId, uploads));
  const dates = {};
  const entries = Object.entries(input.dates || {});
  if (entries.length > 180 || (input.mode === 'dates' && !entries.length && !recurring.length)) throw new Error('Choose a weekday or a supply date (up to 180 dates).');
  for (const [date, entry] of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw new Error('Choose a valid supply date.');
    dates[date] = mealEntry(entry, input.mode === 'dates', kitchenId, uploads);
  }
  if (!Array.isArray(input.areas) || !input.areas.length || input.areas.some(a=>!menuAreas.includes(a))) throw new Error('Choose at least one delivery locality.');
  return {name:shortText(input.name,80,'the restaurant name'), menuName:shortText(input.menuName ?? 'House menu',80,'the menu name'), mode:input.mode, recurring, week, dates,
    price:whole(input.price,30,2000,'the base price'), weekly:whole(input.weekly,0,100,'the weekly discount'),
    monthly:whole(input.monthly,0,100,'the monthly discount'), areas:[...new Set(input.areas)]};
}

export async function handleKitchen(request, env, user) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/api/menu-photos/')) {
    const key = url.pathname.slice('/api/menu-photos/'.length);
    if (request.method !== 'GET' || !/^[a-f0-9]{64}\/[a-f0-9]{64}$/.test(key)) return json({error:'Unknown photo.'},404);
    const object = await env.BUCKET.get(key);
    return object ? new Response(object.body,{headers:{'Content-Type':'image/jpeg','Cache-Control':'private, max-age=86400','X-Content-Type-Options':'nosniff'}}) : json({error:'Photo unavailable.'},404);
  }
  if (url.pathname !== '/api/kitchens') return json({error:'Unknown kitchen.'},404);
  const legacyId = await digest(new TextEncoder().encode('ghar-kitchen:' + user.id));
  if (request.method === 'GET') {
    const {results} = await env.DB.prepare(
      'SELECT kitchen_id, settings, revision, deleted, COALESCE(chef_id,owner_id) = ? AS owned FROM ghar_kitchens WHERE deleted=0 OR COALESCE(chef_id,owner_id)=? ORDER BY kitchen_id'
    ).bind(user.id,user.id).all();
    return json({mine:legacyId, ownedIds:results.filter(row=>row.owned).map(row=>row.kitchen_id),
      kitchens:results.filter(row=>!row.deleted).map(row=>({menuName:'House menu',...JSON.parse(row.settings),id:row.kitchen_id,revision:row.revision}))});
  }
  if (!['PUT','DELETE'].includes(request.method)) return json({error:'Unsupported menu operation.'},405);
  if (request.headers.get('origin') !== url.origin) return json({error:'Publish from this site.'},403);
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({error:'Expected a menu.'},415);
  const limit = 8 * 1024 * 1024;
  if (Number(request.headers.get('content-length')) > limit) return json({error:'Save fewer new photos at a time.'},413);
  const raw = await request.text();
  if (raw.length > limit) return json({error:'Save fewer new photos at a time.'},413);
  const uploads = [];
  let draft, revision, kitchenId, storageKey;
  const conflict = () => json({error:'This menu changed or was deleted. Reopen Restaurant menus to see the latest version.'},409);
  try {
    const input = JSON.parse(raw);
    revision = whole(input.revision,0,Number.MAX_SAFE_INTEGER,'the menu version');
    if (input.createKey !== undefined && !/^[0-9a-f-]{36}$/.test(input.createKey)) throw new Error('Invalid new menu key.');
    if (input.id !== undefined && !/^[a-f0-9]{64}$/.test(input.id)) throw new Error('Invalid menu.');
    const creating = !revision && request.method === 'PUT';
    if (creating && input.id) throw new Error('Create a new menu to publish again.');
    if (!creating && input.createKey) throw new Error('Select a published menu.');
    kitchenId = input.id || (input.createKey ? await digest(new TextEncoder().encode(legacyId + ':' + input.createKey)) : legacyId);
    storageKey = input.createKey ? 'menu:' + kitchenId : user.id;
    if (!creating) {
      const {results} = await env.DB.prepare('SELECT revision FROM ghar_kitchens WHERE kitchen_id=? AND COALESCE(chef_id,owner_id)=? AND deleted=0').bind(kitchenId,user.id).all();
      if (!results.length) return json({error:'Menu unavailable.'},404);
      if (results[0].revision !== revision) return conflict();
    }
    if (request.method === 'DELETE') {
      const result = await env.DB.prepare("UPDATE ghar_kitchens SET settings='{}', deleted=1, revision=revision+1 WHERE kitchen_id=? AND COALESCE(chef_id,owner_id)=? AND revision=? AND deleted=0").bind(kitchenId,user.id,revision).run();
      return result.meta.changes === 1 ? json({id:kitchenId}) : conflict();
    }
    draft = settings(input,kitchenId,uploads);
  } catch (error) { return json({error:error.message},400); }
  for (const upload of uploads) {
    const hash = await digest(upload.bytes);
    await env.BUCKET.put(kitchenId + '/' + hash,upload.bytes,{httpMetadata:{contentType:'image/jpeg'}});
    upload.result.photo = upload.prefix + hash;
  }
  const encoded = JSON.stringify(draft);
  const statement = revision === 0
    ? env.DB.prepare('INSERT INTO ghar_kitchens (owner_id,kitchen_id,settings,revision,chef_id) VALUES (?,?,?,1,?) ON CONFLICT DO NOTHING').bind(storageKey,kitchenId,encoded,user.id)
    : env.DB.prepare('UPDATE ghar_kitchens SET settings=?, revision=revision+1 WHERE kitchen_id=? AND COALESCE(chef_id,owner_id)=? AND revision=? AND deleted=0').bind(encoded,kitchenId,user.id,revision);
  if ((await statement.run()).meta.changes !== 1) return conflict();
  return json({kitchen:{...draft,id:kitchenId,revision:revision+1}});
}
