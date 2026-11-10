export const mealTypes = timing => timing === 'both' ? ['lunch', 'dinner'] : [timing];
export const todayIST = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const addDays = (date, amount) => new Date(Date.parse(date + 'T12:00:00Z') + amount * 86400000).toISOString().slice(0, 10);
export const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
export const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const niceDate = date => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(date + 'T12:00:00Z'));
export const discount = (days, settings = {}) => days === 30 ? settings.monthly ?? 10 : days === 7 ? settings.weekly ?? 5 : 0;
export const quote = (rate, days, timing, settings) => Math.round(rate * days * mealTypes(timing).length * (100 - discount(days, settings)) / 100);
export const weekdayIndex = date => (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
export function serves(schedule, date) {
  return schedule?.mode !== 'dates' || schedule.recurring.includes(weekdayIndex(date)) || Object.hasOwn(schedule.dates,date);
}
export function menuFor(provider, date) {
  const i = weekdayIndex(date);
  if (!serves(provider, date)) return null;
  return (provider.mode === 'dates' && provider.dates[date]) || provider.week?.[i] || {dish:provider.menu[i],photo:''};
}
export function nextSupplyDate(provider, start, end) {
  for (let date=start; date<=end; date=addDays(date,1)) if (serves(provider,date)) return date;
  return '';
}
export function enoughDates(provider, start, count) {
  return provider.mode !== 'dates' || provider.recurring.length > 0 || Object.keys(provider.dates).filter(d=>d>=start).length >= count;
}
function preserveMeals(plan) {
  if (plan.schedule?.mode === 'dates' && scheduledMeals(plan).length < plan.days * mealTypes(plan.timing).length)
    throw new Error('There are no spare supply dates to move all of these meals to. Choose a shorter pause or keep the current delivery.');
  return plan;
}
export const isPaused = (plan, date) => plan.pauses.some(p => date >= p.start && date <= p.end);
export const mealKey = (plan, date, meal) => `${plan.id}:${date}:${meal}`;
export const mealTime = (plan, date, meal) => new Date(`${date}T${plan[meal + 'Slot'] || (meal === 'lunch' ? '12:00' : '19:00')}:00+05:30`);

// A skip or pause postpones an entitlement; it never spends it twice.
export function scheduledMeals(plan) {
  const meals = [];
  const types = mealTypes(plan.timing);
  const total = plan.days * types.length;
  const counts = Object.fromEntries(types.map(type => [type, 0]));
  if (!validDate(plan.start) || ![1, 7, 30].includes(plan.days) || !['lunch', 'dinner', 'both'].includes(plan.timing)) return meals;
  for (let day = 0; meals.length < total && day < 3660; day++) {
    const date = addDays(plan.start, day);
    if (plan.schedule && !plan.schedule.recurring.length && date > plan.schedule.lastDate) break;
    if (!serves(plan.schedule,date) || isPaused(plan, date)) continue;
    for (const meal of types) {
      if (counts[meal] >= plan.days) continue;
      if (!plan.skips.includes(`${date}:${meal}`)) {
        meals.push({ id: mealKey(plan, date, meal), date, meal, subscriptionId: plan.id, providerId: plan.providerId, customer: plan.customer, slot: plan[meal + 'Slot'], address: plan.address, locality: plan.locality });
        counts[meal]++;
      }
    }
  }
  return meals;
}

export function skipMeal(plan, date, meal, now = new Date(), status = 'Preparing') {
  if (plan.skips.includes(`${date}:${meal}`)) throw new Error('This meal is already skipped. Your credit is saved.');
  if (status !== 'Preparing') throw new Error('This meal has already been dispatched or delivered and cannot be skipped.');
  if (!scheduledMeals(plan).some(m => m.date === date && m.meal === meal)) throw new Error('There is no scheduled meal on this date.');
  if (now.getTime() >= mealTime(plan, date, meal).getTime() - 2 * 3600000) throw new Error('The skip cutoff has passed. Please skip at least 2 hours before your delivery slot.');
  return preserveMeals({ ...plan, skips: [...plan.skips, `${date}:${meal}`], credits: plan.credits + 1 });
}

export function kitchenOrders(plans, statuses, providerId, today) {
  return plans.filter(p => p.providerId === providerId).flatMap(scheduledMeals).filter(m => m.date === today || (m.date < today && statuses[m.id] && statuses[m.id] !== 'Delivered')).sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot));
}

export function pausePlan(plan, start, end, today = todayIST()) {
  if (!validDate(start) || !validDate(end)) throw new Error('Please choose valid dates.');
  if (end < start) throw new Error('The end date must be on or after the start date.');
  if (start <= today) throw new Error('Pauses must begin on a future date. Use skip for a meal today.');
  if (end > addDays(start, 89)) throw new Error('Pause for up to 90 days at a time.');
  if (plan.pauses.some(p => start <= p.end && end >= p.start)) throw new Error('This range overlaps an existing pause.');
  const dates = scheduledMeals(plan);
  if (!dates.some(m => m.date >= start && m.date <= end)) throw new Error('Choose a range that includes a scheduled meal.');
  return preserveMeals({ ...plan, pauses: [...plan.pauses, { start, end }] });
}

export function setOrderStatus(current, next) {
  const states = ['Preparing', 'Out for delivery', 'Delivered'];
  if (!states.includes(current) || !states.includes(next)) throw new Error('Unknown order status.');
  if (states.indexOf(next) !== states.indexOf(current) + 1) throw new Error('Orders can only move forward one step.');
  return next;
}

export function createSubscription(provider, values, now = todayIST()) {
  if (!provider.verified) throw new Error('This kitchen is still awaiting verification.');
  if (![1, 7, 30].includes(values.days) || !['lunch', 'dinner', 'both'].includes(values.timing)) throw new Error('Choose a valid plan.');
  if (!validDate(values.start) || values.start <= now || values.start > addDays(now, 90)) throw new Error('Start your plan from tomorrow, within the next 90 days.');
  if (!provider.areas.includes(values.locality)) throw new Error('This kitchen does not deliver to that locality.');
  if (!values.address?.trim() || values.address.trim().length < 8) throw new Error('Enter your building and street address (at least 8 characters).');
  if (!['12:00', '13:00'].includes(values.lunchSlot) || !['19:00', '20:00'].includes(values.dinnerSlot)) throw new Error('Choose a valid delivery slot.');
  if (!serves(provider, values.start)) throw new Error('Choose a start date when this kitchen serves meals.');
  if (!enoughDates(provider,values.start,values.days)) throw new Error('This kitchen has too few supply dates for this plan. Choose a shorter plan.');
  const listedDates = Object.keys(provider.dates || {}).sort();
  const schedule = provider.mode === 'dates' ? {mode:'dates', recurring:[...provider.recurring], dates:Object.fromEntries(listedDates.map(d=>[d,true])),lastDate:listedDates.at(-1)} : undefined;
  return { ...values, schedule, providerSnapshot:provider.published ? provider : undefined, address: values.address.trim(), id: globalThis.crypto.randomUUID(), providerId: provider.id, customer: 'You', owner: true, price: quote(provider.price, values.days, values.timing,provider), skips: [], pauses: [], credits: 0 };
}

export function filterProviders(providers, { query = '', cuisine = 'All cuisines', diet = 'All meals', locality = 'All areas', saved = null, sort = 'Recommended' } = {}) {
  return providers.filter(p => p.verified && (!saved || saved.includes(p.id)) && (locality === 'All areas' || p.areas.includes(locality)) && (cuisine === 'All cuisines' || p.cuisine === cuisine) && (diet === 'All meals' || p.tags.includes(diet)) && `${p.name} ${p.cook} ${p.cuisine} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase().trim())).sort((a, b) => sort === 'Price: low to high' ? a.price - b.price : Number(!!b.published) - Number(!!a.published) || b.rating - a.rating);
}
