// ---------- Your canteen, saved ----------
//
// Everything that lasts lives in S, in cents: your money, what's in the truck,
// your menu prices, and every milbil's money. Today lives in S.today, so
// closing the game in the middle of lunch picks up where you left off (minus
// the queue, who all wandered off while you were gone).

import {
  PRODUCTS, PRODUCT, MILBILS, SPOT, PLACES, UPGRADE, START_MONEY, CARRY_MAX,
  LIGHTS, JOBS, STEP, PRICE_MAX, MONEY, round50, fairPrice,
} from './data.js';

const KEY = 'ningy-ningy-canteen-v1';
const VERSION = 2;    // 2: spring rolls are sold as a whole 6-pack, not serves of 3

const fresh = () => ({
  v: VERSION,
  started: false,
  name: '',
  color: '#ff9a3c',
  hat: 'chef',
  truck: '#ff7a59',
  money: START_MONEY,
  day: 1,
  stock: {},              // product id -> how many you can sell
  flavours: {},           // ...and for Sour Suckers, how many of each flavour
  prices: Object.fromEntries(PRODUCTS.map(p => [p.id, fairPrice(p)])),
  unlocked: [],           // locked products you've been told about
  upgrades: [],
  served: 0,              // milbils served, ever — this is what unlocks things
  town: {},               // milbil id -> { carry } money left over from yesterday
  today: null,
  summary: null,          // the end-of-day report, until you start the next day
  totals: { sales: 0, spent: 0, served: 0, left: 0, days: 0 },
  salt: Math.floor(Math.random() * 100000),
  sound: true,
  hinted: {},             // one-off tips already shown
});

export const S = fresh();

export function load(){
  let was = VERSION;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw){
      const saved = JSON.parse(raw);
      was = saved.v | 0;
      Object.assign(S, fresh(), saved);
    }
  } catch {}
  S.v = VERSION;
  // Spring rolls used to be sold in serves of 3, two to a 6-pack.
  if (was < 2 && S.stock && S.prices){
    S.stock.springrolls = Math.ceil((Number(S.stock.springrolls) || 0) / 2);
    S.prices.springrolls = Math.min(PRICE_MAX, (Number(S.prices.springrolls) || 0) * 2);
  }
  const cents = (n) => Math.max(0, Math.round(Number(n) || 0));
  S.money = cents(S.money);
  S.day = Math.max(1, S.day | 0);
  S.served = cents(S.served);
  const stock = {};
  for (const p of PRODUCTS) stock[p.id] = cents(S.stock?.[p.id]);
  S.stock = stock;
  // Flavours always add up to the stock. If they don't (an old save), share
  // the stock out between the flavours as evenly as it goes.
  const flavours = {};
  for (const p of PRODUCTS.filter(p => p.flavours)){
    const had = S.flavours?.[p.id] || {};
    const f = Object.fromEntries(p.flavours.map(k => [k, cents(had[k])]));
    if (Object.values(f).reduce((a, b) => a + b, 0) !== stock[p.id])
      p.flavours.forEach((k, i) => { f[k] = Math.floor(stock[p.id] / p.flavours.length) + (i < stock[p.id] % p.flavours.length ? 1 : 0); });
    flavours[p.id] = f;
  }
  S.flavours = flavours;
  const prices = fresh().prices;
  for (const p of PRODUCTS){
    const v = round50(Number(S.prices?.[p.id]) || 0);
    if (v >= STEP) prices[p.id] = v;
  }
  S.prices = prices;
  S.unlocked = (Array.isArray(S.unlocked) ? S.unlocked : []).filter(id => PRODUCT[id]);
  S.upgrades = (Array.isArray(S.upgrades) ? S.upgrades : []).filter(id => UPGRADE[id]);
  S.town = (S.town && typeof S.town === 'object') ? S.town : {};
  S.totals = { ...fresh().totals, ...(S.totals || {}) };
  S.hinted = (S.hinted && typeof S.hinted === 'object') ? S.hinted : {};
  if (S.today && (S.today.day !== S.day || !S.today.who)) S.today = null;
  if (S.today && !SPOT[S.today.at]) S.today.at = 'super';
  // Milbils who moved to town after today started: they're at their usual
  // place with today's money.
  if (S.today?.who) for (const m of MILBILS) if (!S.today.who[m.id])
    S.today.who[m.id] = { spot: m.spot, cash: lunchMoney(S.day, m.id), save: 0, done: null, spent: 0, got: {}, waffle: false };
  // Deals used to go on packs too.
  if (S.today?.deals) for (const id of Object.keys(S.today.deals)) if (PRODUCT[id]?.size !== 1) delete S.today.deals[id];
}

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export function wipe(){
  const keep = { name: S.name, color: S.color, hat: S.hat, truck: S.truck, sound: S.sound };
  Object.assign(S, fresh(), keep, { started: true });
  save();
}

// ------------------------------------------------------------------ bits ---

export const has = (id) => S.upgrades.includes(id);
export const you = () => ({ line: S.color, hat: S.hat, eyes: 'happy' });

/** "$4.50", "50c", "$3". */
export function money(c, { short = false } = {}){
  const neg = c < 0;
  c = Math.abs(Math.round(c));
  let s;
  if (c < 100 && short) s = `${c}c`;
  else s = `$${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
  return neg ? `−${s}` : s;
}

/** Products you can buy and sell: everything that isn't locked. */
export const isOpen = (id) => { const p = PRODUCT[id]; return !!p && (!p.unlock || S.served >= p.unlock); };
export const openProducts = () => PRODUCTS.filter(p => isOpen(p.id));
export const totalStock = () => PRODUCTS.reduce((n, p) => n + (S.stock[p.id] || 0), 0);

/** The fair price, nudged up by fairy lights. Milbils compare your price to this. */
export const expected = (p) => fairPrice(p) * (has('lights') ? LIGHTS : 1);
export const ratio = (p) => S.prices[p.id] / expected(p);

// ------------------------------------------------------------- randomness ---
//
// Seeded from the day, so the deals and the milbils' plans hold still if you
// close the game and come back.

export function rng(seed){
  let t = (seed * 2654435761) >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const pickR = (r, a) => a[Math.floor(r() * a.length)];

const MILBIL_NO = Object.fromEntries(MILBILS.map((m, i) => [m.id, i + 1]));

/**
 * The new money a milbil gets for a day: $1 to $10, mostly on the low side.
 * Most get a little; some get anything from $5 to $10. A small amount that
 * comes out under $1 or over $10 is drawn again.
 */
export function lunchMoney(day, id){
  const r = rng(day * 7907 + MILBIL_NO[id] * 131 + S.salt * 11);
  if (r() < MONEY.rich) return round50(MONEY.richFrom + r() * (MONEY.max - MONEY.richFrom));
  for (let tries = 0; tries < 20; tries++){
    const z = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const c = round50(MONEY.median * Math.exp(MONEY.spread * z));
    if (c >= MONEY.min && c <= MONEY.max) return c;
  }
  return MONEY.median;
}

// ---------------------------------------------------------------- the day ---

/**
 * A new morning. Every milbil gets today's lunch money on top of whatever they
 * saved, picks where to have lunch, and some decide to put a bit aside.
 * Billy's picks its deals.
 */
export function newDay(){
  const r = rng(S.day * 104729 + S.salt * 7 + 5);

  // Every day, two to four things at the supermarket are cheaper. Never
  // everything, and only things sold one at a time, so the saving is the same
  // on each one.
  const deals = {};
  const can = openProducts().filter(p => p.size === 1 && p.price >= 100);
  const n = Math.min(can.length - 1, 2 + Math.floor(r() * 3));
  for (let i = 0; i < n; i++){
    const p = can.splice(Math.floor(r() * can.length), 1)[0];
    deals[p.id] = p.price >= 200 && r() < 0.3 ? 100 : 50;
  }

  const who = {};
  for (const m of MILBILS){
    const spot = r() < 0.75 ? m.spot : pickR(r, PLACES.filter(s => s.id !== m.spot)).id;
    const carry = S.town[m.id]?.carry || 0;
    const cash = Math.min(MONEY.max, carry + lunchMoney(S.day, m.id));
    let save = 0;
    // Waffle lovers save up for one when they can't quite afford it.
    const wantsWaffle = m.likes.includes('waffle') && isOpen('waffle') && cash < S.prices.waffle;
    if (r() < m.saver || (wantsWaffle && r() < 0.5)){
      save = round50(cash * (0.2 + r() * 0.3));
      save = Math.min(Math.max(STEP, save), cash - STEP * 2);
      if (save < STEP) save = 0;
    }
    who[m.id] = { spot, cash, save, done: null, spent: 0, got: {}, waffle: wantsWaffle && save > 0 };
  }

  // No money and nothing to sell? Granny Ningy helps out.
  let gift = 0;
  if (S.money < 200 && totalStock() === 0){ gift = 1000; S.money += gift; }

  S.today = {
    day: S.day, phase: 'morning', clock: 0, at: 'super',
    deals, who, gift,
    sales: 0, spent: 0, served: 0, sold: {}, bought: {},
    left: { pricey: 0, broke: 0, soldout: 0, slow: 0 },
  };
  S.summary = null;
  save();
  return S.today;
}

export const today = () => (S.today && S.today.day === S.day ? S.today : newDay());

// ---------------------------------------------------------- the supermarket ---

export const dealOn = (id) => today().deals[id] || 0;
export const shopPrice = (p) => p.price - dealOn(p.id);

export function buyPack(id){
  const p = PRODUCT[id];
  const cost = shopPrice(p);
  if (!isOpen(id) || S.money < cost) return false;
  const t = today();
  S.money -= cost;
  S.stock[id] = (S.stock[id] || 0) + p.size;
  if (p.flavours) for (const f of p.flavours) S.flavours[id][f]++;    // one of each
  t.spent += cost;
  t.bought[id] = [...(t.bought[id] || []), cost];
  S.totals.spent += cost;
  save();
  return true;
}

/** Take back a pack bought today, as long as it's all still in the truck. */
export function returnPack(id){
  const p = PRODUCT[id];
  const t = today();
  const list = t.bought[id] || [];
  if (!list.length || (S.stock[id] || 0) < p.size) return false;
  if (p.flavours && p.flavours.some(f => !S.flavours[id][f])) return false;    // need one of each back
  const cost = list.pop();
  S.money += cost;
  S.stock[id] -= p.size;
  if (p.flavours) for (const f of p.flavours) S.flavours[id][f]--;
  t.spent -= cost;
  S.totals.spent -= cost;
  save();
  return true;
}

// ----------------------------------------------------------- end of the day ---

/**
 * Lunch is over. Milbils keep what they saved for tomorrow (the rest of their
 * lunch money goes on lunch, with you or somewhere else), and overnight they
 * all get more lunch money. A few earn extra.
 */
export function closeDay(){
  const t = today();
  const r = rng(S.day * 7027 + S.salt * 3 + 1);
  const bonus = [];
  const extra = MILBILS.slice().sort(() => r() - 0.5).slice(0, 2 + Math.floor(r() * 2));
  for (const m of MILBILS){
    const w = t.who[m.id];
    let carry = w.save;
    if (extra.includes(m)){
      const amt = 100 * (1 + Math.floor(r() * 3));
      carry += amt;
      bonus.push({ id: m.id, amt, job: pickR(r, JOBS) });
    }
    S.town[m.id] = { carry: Math.min(CARRY_MAX, Math.max(0, carry)) };
  }
  const earned = MILBILS.reduce((n, m) => n + lunchMoney(S.day + 1, m.id), 0);
  S.summary = {
    day: S.day, sales: t.sales, spent: t.spent, served: t.served, gasped: t.gasped || 0,
    left: { ...t.left }, sold: { ...t.sold }, money: S.money, bonus, earned,
  };
  t.phase = 'closed';
  S.totals.days++;
  save();
  return S.summary;
}

export function nextDay(){
  S.day++;
  S.today = null;
  return newDay();
}
