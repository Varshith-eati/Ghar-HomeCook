import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../lib/domain.mjs';
const { addDays, todayIST, quote, skipMeal, pausePlan, scheduledMeals, setOrderStatus, kitchenOrders } = domain;

const plan = { id: 's1', providerId: 'p1', start: '2026-11-04', days: 7, timing: 'both', lunchSlot: '12:00', dinnerSlot: '19:00', skips: [], pauses: [], credits: 0, price: 1260 };
test('IST date handles UTC day boundary', () => assert.equal(todayIST(new Date('2026-11-03T20:00:00Z')), '2026-11-04'));
test('date arithmetic crosses month and year boundaries', () => assert.equal(addDays('2026-12-31', 1), '2027-01-01'));
test('both-meal monthly plan applies 10 percent discount', () => assert.equal(quote(100, 30, 'both'), 5400));
test('skip preserves entitlement with one meal credit', () => {
  const result = skipMeal(plan, '2026-11-04', 'lunch', new Date('2026-11-04T04:29:00Z'));
  assert.equal(result.credits, 1);
  assert.equal(result.skips.length, 1);
});
test('duplicate skip does not grant another credit', () => {
  const once = skipMeal(plan, '2026-11-04', 'lunch', new Date('2026-11-04T04:00:00Z'));
  assert.throws(() => skipMeal(once, '2026-11-04', 'lunch', new Date('2026-11-04T04:01:00Z')), /already skipped/i);
});
test('skip rejects at exact two hour cutoff', () => assert.throws(() => skipMeal(plan, '2026-11-04', 'lunch', new Date('2026-11-04T04:30:00Z')), /cutoff/i));
test('pause excludes inclusive dates and automatically resumes with original meal count', () => {
  const paused = pausePlan(plan, '2026-11-05', '2026-11-07', '2026-11-04');
  const meals = scheduledMeals(paused);
  assert.equal(meals.length, 14);
  assert.equal(meals.some(m => m.date === '2026-11-07'), false);
  assert.equal(meals.some(m => m.date === '2026-11-08'), true);
  assert.equal(meals.at(-1).date, '2026-11-13');
});
test('pause rejects past, invalid, overlapping and reversed date ranges', () => {
  assert.throws(() => pausePlan(plan, '2026-11-07', '2026-11-05', '2026-11-04'), /end/i);
  assert.throws(() => pausePlan(plan, '2026-11-03', '2026-11-05', '2026-11-04'), /future/i);
  assert.throws(() => pausePlan(plan, '2026-02-30', '2026-11-05', '2026-11-04'), /valid/i);
  const paused = pausePlan(plan, '2026-11-05', '2026-11-07', '2026-11-04');
  assert.throws(() => pausePlan(paused, '2026-11-07', '2026-11-09', '2026-11-04'), /overlap/i);
});
test('skip removes only selected meal and extends schedule', () => {
  const skipped = skipMeal(plan, '2026-11-04', 'lunch', new Date('2026-11-04T04:00:00Z'));
  const meals = scheduledMeals(skipped);
  assert.equal(meals.length, 14);
  assert.equal(meals.filter(m => m.date === '2026-11-04').length, 1);
  assert.equal(meals.at(-1).date, '2026-11-11');
});
test('out of plan and wrong timing cannot be skipped', () => {
  assert.throws(() => skipMeal(plan, '2026-12-01', 'lunch', new Date('2026-11-04T04:00:00Z')), /scheduled/i);
  assert.throws(() => skipMeal({...plan,timing:'lunch'}, '2026-11-04', 'dinner', new Date('2026-11-04T04:00:00Z')), /scheduled/i);
});
test('order status follows preparing to delivery and cannot move backwards', () => {
  assert.equal(setOrderStatus('Preparing', 'Out for delivery'), 'Out for delivery');
  assert.equal(setOrderStatus('Out for delivery', 'Delivered'), 'Delivered');
  assert.throws(() => setOrderStatus('Delivered', 'Preparing'), /forward/i);
  assert.throws(() => setOrderStatus('Preparing', 'Unknown'), /status/i);
});
test('skipped dinner remains a dinner entitlement', () => {
  const skipped=skipMeal({...plan,days:1},'2026-11-04','dinner',new Date('2026-11-04T04:00:00Z'));
  assert.deepEqual(scheduledMeals(skipped).map(m=>`${m.date}:${m.meal}`),['2026-11-04:lunch','2026-11-05:dinner']);
});
test('dispatched and delivered meals cannot be skipped before cutoff', () => {
  for(const status of ['Out for delivery','Delivered']) assert.throws(()=>skipMeal(plan,'2026-11-04','lunch',new Date('2026-11-04T04:00:00Z'),status),/already.*(dispatched|delivered)/i);
});
test('past outstanding orders remain available to kitchen until delivered', () => {
  const statuses={'s1:2026-11-04:dinner':'Out for delivery'};
  assert.equal(kitchenOrders([plan],statuses,'p1','2026-11-05').some(m=>m.id==='s1:2026-11-04:dinner'),true);
  assert.equal(kitchenOrders([plan],{...statuses,'s1:2026-11-04:dinner':'Delivered'},'p1','2026-11-05').some(m=>m.id==='s1:2026-11-04:dinner'),false);
});
test('date overrides include the matching dish and photo, and plans follow supply dates', () => {
  const p={id:'test',published:true,verified:true,price:100,weekly:20,monthly:0,areas:['A'],
    mode:'dates',recurring:[0],week:Array(7).fill({dish:'Dal',photo:'weekly'}),
    dates:{'2026-11-16':{dish:'Thali',photo:'special'},'2026-11-18':{dish:'Rice',photo:''}}};
  const order={days:7,timing:'both',address:'Test street',locality:'A',start:'2026-11-16',lunchSlot:'12:00',dinnerSlot:'19:00'};
  assert.equal(domain.menuFor(p,'2026-11-16').photo,'special');
  assert.equal(domain.menuFor(p,'2026-11-23').photo,'weekly');
  assert.equal(domain.menuFor(p,'2026-11-17'),null);
  const sub=domain.createSubscription(p,order,'2026-11-10');
  assert.equal(sub.price,1120);
  assert.equal(quote(100,30,'both',p),6000);
  const meals=scheduledMeals(sub);
  assert.equal(meals.length,14);
  assert.deepEqual(meals.slice(0,5).map(m=>m.date),['2026-11-16','2026-11-16','2026-11-18','2026-11-18','2026-11-23']);
  assert.throws(()=>domain.createSubscription({...p,recurring:[]},order,'2026-11-10'),/too few/);
  assert.throws(()=>domain.createSubscription(p,{...order,start:'2026-11-17'},'2026-11-10'),/start date/);
  const single=domain.createSubscription({...p,recurring:[]},{...order,days:1,start:'2026-11-18'},'2026-11-10');
  assert.throws(()=>pausePlan(single,'2026-11-18','2026-11-18','2026-11-10'),/spare supply dates/);
});
