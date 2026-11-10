import { addDays } from './domain.mjs';
export const areas = ['Koramangala', 'HSR Layout', 'Indiranagar', 'BTM Layout'];
export const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const menus = [
  ['Dal tadka, aloo gobi, 3 rotis, rice & salad', 'Rajma masala, jeera rice, 3 rotis & raita', 'Palak paneer, dal fry, 3 rotis & rice', 'Chole, bhindi fry, 3 rotis & rice', 'Kadhi pakora, pulao, 3 rotis & salad', 'Paneer butter masala, dal, roti & rice', 'Vegetable biryani, raita & sweet'],
  ['Sambar, rasam, rice, poriyal & curd', 'Lemon rice, kootu, beans & papad', 'Avial, rice, rasam & buttermilk', 'Bisi bele bath, kosambari & curd', 'Tomato rice, sambar & potato roast', 'Vegetable kurma, chapati & rice', 'Coconut rice, dal, poriyal & payasam'],
  ['Paneer bowl, brown rice & greens', 'Chickpea quinoa salad & curd', 'Grilled paneer, millets & vegetables', 'Rajma bowl, brown rice & salad', 'Tofu stir-fry, rice & sprouts', 'Moong dal khichdi & cucumber raita', 'Mixed bean bowl & wholewheat roti']
];
export const initialProviders = [
  { id: 'p1', name: 'Annapurna Kitchen', cook: 'Meera Sharma', initials: 'MS', cuisine: 'North Indian', tags: ['Vegetarian', 'Homestyle'], price: 99, rating: 4.9, reviews: 128, areas: areas.slice(0, 2), verified: true, image: '/thali.jpg', imagePosition: 'center', accent: '#e9ebe0', bio: 'Everyday comfort food, made just like it is at home. Meera brings her family recipes and a little extra care to every tiffin.', menu: [...menus[0]], badge: 'COMMUNITY FAVOURITE' },
  { id: 'p2', name: 'Amma’s Everyday', cook: 'Lakshmi Iyer', initials: 'LI', cuisine: 'South Indian', tags: ['Vegetarian', 'Homestyle'], price: 89, rating: 4.8, reviews: 96, areas: ['Koramangala', 'BTM Layout'], verified: true, image: '/south.jpg', imagePosition: 'center', accent: '#f3e9d9', bio: 'Freshly ground spices, seasonal vegetables and the familiar comfort of a South Indian home. A new menu every day.', menu: [...menus[1]], badge: 'A TASTE OF HOME' },
  { id: 'p3', name: 'The Green Bowl', cook: 'Riya Kapoor', initials: 'RK', cuisine: 'Healthy bowls', tags: ['High protein', 'Vegetarian'], price: 129, rating: 4.9, reviews: 84, areas: ['Koramangala', 'Indiranagar', 'HSR Layout'], verified: true, image: '/bowl.jpg', imagePosition: 'center', accent: '#e9ecdf', bio: 'Balanced bowls for busy days. Wholesome grains, protein-rich ingredients and colourful vegetables, cooked fresh each morning.', menu: [...menus[2]], badge: 'FEEL-GOOD FAVOURITES' },
  { id: 'p4', name: 'The Gujarati Table', cook: 'Hetal Shah', initials: 'HS', cuisine: 'Gujarati', tags: ['Jain', 'Vegetarian'], price: 109, rating: 4.7, reviews: 65, areas: ['HSR Layout', 'Indiranagar'], verified: true, image: '/thali.jpg', accent: '#eee5da', bio: 'A little sweet, a little spice, and plenty of warmth. Simple Gujarati thalis with a Jain-friendly weekly menu.', menu: ['Gujarati dal, cabbage shaak, phulka & rice', 'Moong dal, bhindi, thepla & rice', 'Kadhi, vegetable khichdi & papad', 'Chana shaak, dal, phulka & rice', 'Sev tameta, dal, rotli & rice', 'Undhiyu, puri, kadhi & rice', 'Dal dhokli, khichdi & chaas'], badge: 'REGIONAL COMFORT' },
  { id: 'p5', name: 'Sunday at Home', cook: 'Arjun Nair', initials: 'AN', cuisine: 'South Indian', tags: ['Non-vegetarian', 'High protein'], price: 149, rating: 4.8, reviews: 72, areas: ['Koramangala', 'HSR Layout', 'BTM Layout'], verified: true, image: '/south.jpg', accent: '#eee7db', bio: 'Kerala-inspired meals with comforting rice, slow-cooked curries and fresh sides. Sunday feelings, all week long.', menu: ['Chicken curry, rice, thoran & curd', 'Egg curry, chapati, rice & salad', 'Chicken stew, rice & vegetables', 'Fish curry, rice, beans & rasam', 'Chicken roast, rice & avial', 'Egg biryani & raita', 'Chicken biryani, raita & pickle'], badge: 'FAMILY RECIPES' },
  { id: 'p6', name: 'Fresh Start Tiffins', cook: 'Kavya Rao', initials: 'KR', cuisine: 'North Indian', tags: ['Vegan', 'Homestyle'], price: 95, rating: 4.6, reviews: 0, areas: ['Indiranagar'], verified: false, image: '/bowl.jpg', accent: '#e4ecdf', bio: 'Plant-based home cooking with a weekly rotating menu.', menu: [...menus[2]], badge: 'NEW KITCHEN' }
];
export function seedState(today) {
  const base = { days: 30, timing: 'lunch', lunchSlot: '12:00', dinnerSlot: '19:00', skips: [], pauses: [], credits: 0, locality: 'Koramangala' };
  return {
    version: 1, providers: initialProviders, saved: [], ratings: {}, orderStatuses: {},
    subscriptions: [
      { ...base, id: 'demo-you', providerId: 'p1', customer: 'You', owner: true, start: addDays(today, -3), price: 2673, address: 'Demo address · 12, 5th Block' },
      { ...base, id: 'demo-aarav', providerId: 'p1', customer: 'Aarav M.', start: addDays(today, -5), price: 5346, timing: 'both', address: 'Demo address · Maple Residency' },
      { ...base, id: 'demo-sneha', providerId: 'p1', customer: 'Sneha R.', start: addDays(today, -2), price: 2673, address: 'Demo address · Park Avenue' },
      { ...base, id: 'demo-dev', providerId: 'p2', customer: 'Dev P.', start: addDays(today, -7), price: 2403, address: 'Demo address · 6th Block' }
    ]
  };
}
