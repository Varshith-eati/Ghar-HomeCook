import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleAccount } from '../worker/account.mjs';

const origin = 'https://test.example';
const customer = {name:'Sample Customer', locality:'Koramangala', diet:'Vegetarian', timing:'dinner', revision:0};
const chef = {name:'Sample Chef', kitchen:'Thali House', cuisine:'Gujarati', areas:['HSR Layout'], bio:'Seasonal meals', revision:0};

function fixture(seedLegacy) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../drizzle/0000_ghar_profiles.sql', import.meta.url),'utf8'));
  db.exec(readFileSync(new URL('../drizzle/0001_ghar_kitchens.sql',import.meta.url),'utf8'));
  if (seedLegacy) seedLegacy(db);
  db.exec(readFileSync(new URL('../drizzle/0002_restaurant_menus.sql',import.meta.url),'utf8'));
  const photos = new Map();
  const env = {BUCKET:{put(key,data){photos.set(key,{body:data});}, get(key){return photos.get(key);}},DB:{prepare(sql) { return {bind(...args) {
    const statement = db.prepare(sql);
    return {all:()=>({results:statement.all(...args)}),run:()=>({meta:statement.run(...args)})};
  }}; }}};
  return (userId, path, data, overrides = {}, method = data ? 'PUT' : 'GET') => {
    const headers = {'Content-Type':'application/json', origin, ...overrides};
    if (userId) { headers['oai-authenticated-user-id'] = userId; headers['oai-authenticated-user-email'] = userId + '@example.test'; }
    const request = new Request(origin + path, {method,headers,body:data?JSON.stringify(data):undefined});
    return handleAccount(request,env);
  };
}
test('sign-in is required for reading and writing profiles', async () => {
  const request = fixture();
  assert.equal((await request(null,'/api/account')).status,401);
  assert.equal((await request(null,'/api/profile/customer',customer)).status,401);
});
test('customer and chef have distinct saved profiles owned by the signed-in user', async () => {
  const request = fixture();
  assert.equal((await request('first','/api/profile/customer',customer)).status,200);
  assert.equal((await request('first','/api/profile/cook',chef)).status,200);
  const data = await (await request('first','/api/account')).json();
  assert.equal(data.profiles.customer.locality,customer.locality);
  assert.equal(data.profiles.cook.kitchen,chef.kitchen);
  assert.deepEqual((await (await request('second','/api/account')).json()).profiles,{});
  await request('second','/api/profile/customer',{...customer,user_id:'first',name:'Second'});
  assert.equal((await (await request('first','/api/account')).json()).profiles.customer.name, customer.name);
});
test('stale and repeated saves cannot replace newer profile details', async () => {
  const request = fixture();
  await request('first','/api/profile/customer',customer);
  assert.equal((await request('first','/api/profile/customer',customer)).status,409);
  assert.equal((await request('first','/api/profile/customer',{...customer,revision:1,name:'Updated'})).status,200);
  assert.equal((await request('first','/api/profile/customer',{...customer,revision:1})).status,409);
  assert.equal((await (await request('first','/api/account')).json()).profiles.customer.name,'Updated');
});
test('invalid or cross-origin profile writes are rejected', async () => {
  const request = fixture();
  assert.equal((await request('first','/api/profile/customer',customer,{origin:'https://other.example'})).status,403);
  assert.equal((await request('first','/api/profile/cook',{...chef,areas:[]})).status,400);
  assert.equal((await request('first','/api/profile/admin',customer)).status,404);
});
test('published meals, prices and day-specific photos are shared while writes remain owner-scoped', async () => {
  const request = fixture();
  const menu = {name:'Lunch Club', mode:'dates',price:100,weekly:12,monthly:20,areas:['HSR Layout'],
    week:Array.from({length:7},()=>({dish:'Dal and roti',photo:''})),recurring:[0],revision:0,
    dates:{'2026-12-02':{dish:'Paneer thali',photo:'data:image/jpeg;base64,/9j/2Q=='}}};
  const saved = await request('chef','/api/kitchens',menu);
  assert.equal(saved.status,200);
  const {kitchen} = await saved.json();
  const customer = await (await request('customer','/api/kitchens')).json();
  assert.notEqual(customer.mine,kitchen.id);
  assert.deepEqual(customer.kitchens[0],kitchen);
  const photo = await request('customer',kitchen.dates['2026-12-02'].photo);
  assert.equal(photo.headers.get('content-type'),'image/jpeg');
  assert.equal((await photo.arrayBuffer()).byteLength,4);
  assert.equal((await request(null,kitchen.dates['2026-12-02'].photo)).status,401);
  assert.equal((await request('chef','/api/kitchens',menu)).status,409);
  assert.equal((await request('customer','/api/kitchens',{...kitchen})).status,404);
  assert.equal((await request('chef','/api/kitchens',{...kitchen,weekly:101})).status,400);
  assert.equal((await request('chef','/api/kitchens',{...kitchen,dates:{},recurring:[]})).status,400);
  assert.equal((await request('chef','/api/kitchens',{...kitchen,monthly:0})).status,200);
});
test('a chef can manage independent restaurant menus and remove just one', async () => {
  const menu = {name:'Garden Cafe',menuName:'Lunch',revision:0,mode:'weekly',price:90,weekly:5,monthly:10,areas:['HSR Layout'],
    week:Array.from({length:7},()=>({dish:'Dal and rice',photo:''})),recurring:[],dates:{}};
  const legacyId='a'.repeat(64);
  const request=fixture(db=>db.prepare('INSERT INTO ghar_kitchens VALUES(?,?,?,?)').run('chef',legacyId,JSON.stringify({...menu,menuName:undefined}),3));
  const path='/api/kitchens';
  const listing=async(user='chef')=>(await request(user,path)).json();
  const legacy=(await listing()).kitchens[0];
  assert.equal(legacy.menuName,'House menu');
  assert.equal(legacy.id,legacyId);
  const menus=[];
  for (const [name,menuName] of [['Garden Cafe','Brunch'],['Garden Cafe','Dinner'],['River Bistro','Lunch']]) {
    const input={...menu,name,menuName,createKey:crypto.randomUUID()};
    const created=await request('chef',path,input);
    assert.equal(created.status,200);
    menus.push((await created.json()).kitchen);
    assert.equal((await request('chef',path,input)).status,409);
  }
  assert.equal((await listing()).ownedIds.length,4);
  const [brunch,dinner,river]=menus;
  const remove=(u,k,headers={})=>request(u,path,{id:k.id,revision:k.revision},headers,'DELETE');
  assert.equal((await remove('stranger',brunch)).status,404);
  assert.equal((await remove('chef',brunch,{origin:'https://other.example'})).status,403);
  assert.equal((await request('chef',path,{...brunch,price:120})).status,200);
  assert.equal((await remove('chef',brunch)).status,409);
  assert.equal((await remove('chef',{...brunch,revision:2})).status,200);
  assert.equal((await request('chef',path,{...brunch,revision:2})).status,404);
  const remaining=await listing('customer');
  assert.deepEqual(remaining.ownedIds,[]);
  assert.deepEqual(remaining.kitchens.map(k=>k.id).sort(),[legacyId,dinner.id,river.id].sort());
  assert.equal(remaining.kitchens.find(k=>k.id===dinner.id).price,90);
  assert.equal((await remove('chef',legacy)).status,200);
});

