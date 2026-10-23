// ---------- Your packing job, saved ----------
//
// Everything that lasts lives in S. So does today's half-packed lunchbox, so
// closing the game in the middle of the shop doesn't lose your morning.

import {
  FOODS, FOOD, BRANDS, BRAND, MILBILS, MILBIL, FIRST_MILBILS, KIT_BY_ID, STICKER_BY_ID,
  STICKER_SLOTS, SWING, DEAL_LINES, priceOf, stocks, wishMatch,
} from './data.js';

const KEY = 'milbil-lunchbox-v1';

const fresh = () => ({
  started: false,
  name: '',
  color: '#8b7bff',
  hat: '',
  coins: 0,
  points: 0,
  day: 1,
  milbil: 'sprouty',     // who you're packing for today
  streak: 1,             // mornings in a row for the same milbil
  kit: [],
  stickers: [],          // stickers you own
  wearing: [],           // ...and the ones stuck on the box (up to STICKER_SLOTS)
  friends: {},           // milbil id -> { days, stars3, best }
  bestHealth: 0,
  salt: Math.floor(Math.random() * 100000),
  today: null,           // { day, milbil, ask, money, items, spent }
  choosing: false,       // true between closing the lid and picking tomorrow
  sound: true,
  totals: { packed:0, earned:0, perfect:0 },
});

export const S = fresh();

export function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, fresh(), JSON.parse(raw));
  } catch {}
  S.coins = Math.max(0, Math.round(Number(S.coins) || 0));
  S.points = Math.max(0, Math.round(Number(S.points) || 0));
  S.day = Math.max(1, S.day | 0);
  S.streak = Math.max(1, S.streak | 0);
  S.kit = (Array.isArray(S.kit) ? S.kit : []).filter(id => KIT_BY_ID[id]);
  S.stickers = (Array.isArray(S.stickers) ? S.stickers : []).filter(id => STICKER_BY_ID[id]);
  S.wearing = (Array.isArray(S.wearing) ? S.wearing : []).filter(id => S.stickers.includes(id)).slice(0, STICKER_SLOTS);
  if (!MILBIL[S.milbil] || !unlocked(S.milbil)) S.milbil = FIRST_MILBILS[0];
  S.friends = (S.friends && typeof S.friends === 'object') ? S.friends : {};
  S.totals = { ...fresh().totals, ...(S.totals || {}) };
  if (S.today && (S.today.day !== S.day || !MILBIL[S.today.milbil])) S.today = null;
}

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export function wipe(){
  const keep = { name: S.name, color: S.color, hat: S.hat, sound: S.sound };
  Object.assign(S, fresh(), keep, { started: true });
  save();
}

// -------------------------------------------------------------- you & co ---

export const you = () => ({ line: S.color, hat: S.hat, eyes:'happy', hold:'lunchbox' });
export const unlocked = (id) => (MILBIL[id]?.points ?? Infinity) <= S.points;
export const friend = (id) => S.friends[id] || { days:0, stars3:0, best:0 };
export const fmt = (n) => Math.round(n).toLocaleString('en-GB');

/** Food you're allowed to pack, given the kit you own. */
export const canPack = (f) => !f.kit || S.kit.includes(f.kit);
export const kitNeeded = (f) => (f.kit && !S.kit.includes(f.kit)) ? KIT_BY_ID[f.kit] : null;

// -------------------------------------------------------------- the shops ---
//
// Prices are worked out from the day number, so they hold still if you close
// the game and come back, and everybody gets a different run of bargains.

function rng(seed){
  let t = (seed * 2654435761) >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

let cached = { day: -1, salt: -1, market: null };

/** Today's shops: every price, plus each shop's special offer. */
export function market(){
  if (cached.day === S.day && cached.salt === S.salt) return cached.market;
  const rnd = rng(S.day * 7919 + S.salt * 31 + 13);
  const shops = BRANDS.map(b => {
    const swing = SWING[0] + rnd() * (SWING[1] - SWING[0]);
    const stocked = FOODS.filter(f => stocks(b, f));
    const deal = stocked[Math.floor(rnd() * stocked.length)];
    const prices = {};
    for (const f of stocked) prices[f.id] = priceOf(f, b, swing, f.id === deal.id);
    return {
      brand: b, swing, deal: deal.id, prices,
      line: DEAL_LINES[Math.floor(rnd() * DEAL_LINES.length)].replace('%f', deal.name),
    };
  });
  const m = { shops, byId: Object.fromEntries(shops.map(s => [s.brand.id, s])) };
  cached = { day: S.day, salt: S.salt, market: m };
  return m;
}

/** Every shop that sells this food today, cheapest first. */
export function offersFor(foodId){
  return market().shops
    .filter(s => s.prices[foodId] != null)
    .map(s => ({ brand: s.brand, price: s.prices[foodId], deal: s.deal === foodId }))
    .sort((a, b) => a.price - b.price);
}
export const priceAt = (foodId, brandId) => market().byId[brandId]?.prices[foodId] ?? null;

// ------------------------------------------------------------- the morning ---

/** Could today's milbil possibly be asked this, with the kit you own? */
function askPossible(ask, m){
  if (ask.kind === 'full') return true;
  if (ask.kind === 'variety') return ask.n <= m.box.spaces;
  if ((ask.n ?? 1) > m.box.spaces) return false;
  return FOODS.some(f => canPack(f) && wishMatch(ask.what, { food: f.id, brand: 'billys' }));
}

/** Start a new morning: who, what they want today, and their lunch money. */
export function startDay(){
  const m = MILBIL[S.milbil];
  const rnd = rng(S.day * 104729 + S.salt * 7 + 5);
  const can = m.asks.filter(a => askPossible(a, m));
  const ask = (can.length ? can : [{ kind:'full' }])[Math.floor(rnd() * Math.max(1, can.length))] || { kind:'full' };
  S.today = {
    day: S.day,
    milbil: S.milbil,
    ask,
    money: m.money,
    items: Array(m.box.spaces).fill(null),
    spent: 0,
  };
  save();
  return S.today;
}

export const today = () => (S.today && S.today.day === S.day ? S.today : startDay());

/** Lunch money left, and how far into your own coins you've dipped. */
export function purse(){
  const t = today();
  const left = t.money - t.spent;
  return { left: Math.max(0, left), over: Math.max(0, -left), can: S.coins + left };
}

export function putIn(slot, foodId, brandId){
  const t = today();
  const price = priceAt(foodId, brandId);
  if (price == null || t.items[slot]) return false;
  if (price > purse().can) return false;
  t.items[slot] = { food: foodId, brand: brandId, paid: price };
  t.spent += price;
  save();
  return true;
}

export function takeOut(slot){
  const t = today();
  const it = t.items[slot];
  if (!it) return false;
  t.spent -= it.paid;
  t.items[slot] = null;
  save();
  return true;
}

export const freeSlot = () => today().items.indexOf(null);
export const packedCount = () => today().items.filter(Boolean).length;
