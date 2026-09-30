// Game state and the market simulation. No DOM in here.
import {
  START, MAX_PLOTS, DAY_LENGTH, CROPS, CROP, RIVALS, RIVAL,
  plotBase, COUNCIL_MARKUP, BUILDINGS, BUILDING,
} from './data.js';

const SAVE_KEY = 'milbil-garden-v1';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function poisson(lambda) {
  // Knuth. Lambdas here are tiny (a fraction of a shopper per tick).
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// ---------------------------------------------------------------- state

export let S = null;
const listeners = new Set();
export const onEvent = fn => listeners.add(fn);
function emit(type, data) { for (const fn of listeners) fn(type, data); }

function freshState() {
  const s = {
    v: 1,
    coins: START.coins,
    day: 1,
    dayT: 0,
    plots: Array.from({ length: START.plots }, () => ({ crop: null })),
    built: Object.fromEntries(BUILDINGS.map(b => [b.id, 0])),
    shed: {},                 // cropId -> qty waiting to be sold
    stall: {},                // cropId -> { qty, price }
    fair: Object.fromEntries(CROPS.map(c => [c.id, c.fair])),
    trend: Object.fromEntries(CROPS.map(c => [c.id, 0])),
    rivals: {},               // rivalId -> cropId -> { qty, price }
    rivalPlots: Object.fromEntries(RIVALS.map(r => [r.id, 8 + Math.floor(Math.random() * 6)])),
    offers: [],
    today: freshDayStats(),
    yesterday: null,
    total: { earned: 0, sold: 0, spent: 0 },
    log: [],
    news: 'Welcome to Milbil Garden! Plant some lettuce to get started.',
    seed: 'lettuce',
  };
  return s;
}

function freshDayStats() {
  return { sold: 0, earned: 0, byCrop: {}, shoppers: {}, missed: {}, rivalSold: {} };
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s && s.v === 1) {
        // Fill anything added since the save was made.
        const base = freshState();
        S = { ...base, ...s, built: { ...base.built, ...s.built } };
        for (const c of CROPS) {
          if (S.fair[c.id] == null) S.fair[c.id] = c.fair;
          if (S.trend[c.id] == null) S.trend[c.id] = 0;
        }
        return false;
      }
    }
  } catch (e) { /* private mode or bad data: start over */ }
  S = freshState();
  stockRivals();
  makeOffers();
  return true;
}

export function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}

export function reset() {
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  S = freshState();
  stockRivals();
  makeOffers();
  emit('reset');
}

function log(text, kind = '') {
  S.log.unshift({ text, kind, day: S.day });
  if (S.log.length > 40) S.log.length = 40;
  emit('log', { text, kind });
}

// ---------------------------------------------------------------- derived

export const storageCap = () => START.storage + 15 * S.built.shed + 60 * S.built.barn;
export const stallCap = () => START.stall + 12 * S.built.stall;
export const sum = obj => Object.values(obj).reduce((a, b) => a + (typeof b === 'number' ? b : b.qty), 0);
export const shedCount = () => sum(S.shed);
export const stallCount = () => sum(S.stall);
export const growSpeed = () => (S.built.sprinkler ? 1.3 : 1);
export const signBonus = () => (S.built.sign ? 1.06 : 1);
export const demandMult = () => Math.min(3, 1 + (S.day - 1) * 0.04);

export function cropUnlocked(c) {
  if (c.tier === 0) return true;
  if (c.tier === 1) return !!S.built.greenhouse;
  return !!S.built.dome;
}

export function plotProgress(p, now = Date.now()) {
  if (!p.crop) return 0;
  return clamp((now - p.planted) / (p.dur * 1000), 0, 1);
}

// ---------------------------------------------------------------- farming

export function plant(i, cropId = S.seed) {
  const p = S.plots[i], c = CROP[cropId];
  if (!p || p.crop || !c) return false;
  if (!cropUnlocked(c)) { emit('warn', `${c.name} needs a ${c.tier === 1 ? 'Greenhouse' : 'Tropical Dome'}.`); return false; }
  if (S.coins < c.seed) { emit('warn', `Not enough coins for ${c.name} seeds (${c.seed}🪙).`); return false; }
  S.coins -= c.seed;
  S.total.spent += c.seed;
  p.crop = c.id;
  p.planted = Date.now();
  p.dur = c.grow / growSpeed();
  emit('change');
  return true;
}

export function harvest(i) {
  const p = S.plots[i];
  if (!p || !p.crop || plotProgress(p) < 1) return 0;
  const c = CROP[p.crop];
  let n = 1;
  if (S.built.scarecrow && Math.random() < 0.15) n = 2;
  const room = storageCap() - shedCount();
  if (room <= 0) { emit('warn', 'Your storage is full! Send crops to market or build a shed.'); return 0; }
  n = Math.min(n, room);
  S.shed[c.id] = (S.shed[c.id] || 0) + n;
  p.crop = null;
  emit('harvest', { i, crop: c, n });
  emit('change');
  return n;
}

export function harvestAll() {
  let got = 0;
  S.plots.forEach((p, i) => { if (p.crop && plotProgress(p) >= 1 && shedCount() < storageCap()) got += harvest(i); });
  return got;
}

export function plantAll() {
  let n = 0;
  S.plots.forEach((p, i) => { if (!p.crop && S.coins >= CROP[S.seed].seed && plant(i)) n++; });
  if (n === 0 && S.plots.some(p => !p.crop)) plant(S.plots.findIndex(p => !p.crop)); // surfaces the reason
  return n;
}

// ---------------------------------------------------------------- stall

export function sendToMarket(cropId, qty) {
  const have = S.shed[cropId] || 0;
  qty = Math.min(qty, have, stallCap() - stallCount());
  if (qty <= 0) {
    if (have > 0) emit('warn', 'Your stall is full! Wait for sales or buy a Bigger Stall.');
    return 0;
  }
  S.shed[cropId] = have - qty;
  if (!S.shed[cropId]) delete S.shed[cropId];
  const lst = S.stall[cropId] || (S.stall[cropId] = { qty: 0, price: suggestedPrice(cropId) });
  lst.qty += qty;
  emit('change');
  return qty;
}

export function takeBack(cropId) {
  const lst = S.stall[cropId];
  if (!lst || !lst.qty) return 0;
  const room = storageCap() - shedCount();
  const n = Math.min(lst.qty, room);
  if (n <= 0) { emit('warn', 'No room in storage to take them back.'); return 0; }
  lst.qty -= n;
  S.shed[cropId] = (S.shed[cropId] || 0) + n;
  emit('change');
  return n;
}

export function setPrice(cropId, price) {
  const lst = S.stall[cropId] || (S.stall[cropId] = { qty: 0, price: suggestedPrice(cropId) });
  lst.price = clamp(Math.round(price), 1, 99999);
  emit('change');
}

export function priceOf(cropId) {
  return S.stall[cropId] ? S.stall[cropId].price : suggestedPrice(cropId);
}

export function suggestedPrice(cropId) {
  return Math.max(1, Math.round(S.fair[cropId]));
}

// Everyone else selling this crop right now, cheapest first.
export function competitors(cropId) {
  const out = [];
  for (const r of RIVALS) {
    const l = S.rivals[r.id] && S.rivals[r.id][cropId];
    if (l && l.qty > 0) out.push({ rival: r, price: l.price, qty: l.qty });
  }
  return out.sort((a, b) => a.price - b.price);
}

export function lowestRival(cropId) {
  const c = competitors(cropId);
  return c.length ? c[0].price : null;
}

// Rough forecast of how many a day you would sell at `price`, by replaying a
// fixed sample of shoppers against today's stalls. The sample is seeded so the
// number doesn't flicker between redraws.
export function forecast(cropId, price) {
  const c = CROP[cropId];
  const rivals = competitors(cropId);
  const fair = S.fair[cropId];
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const N = 300;
  let mine = 0;
  for (let k = 0; k < N; k++) {
    const wtp = fair * (0.75 + rnd() * 0.6);
    const myPerceived = price / signBonus() * (0.96 + rnd() * 0.08);
    if (price > wtp * signBonus()) { rnd(); continue; }
    let beaten = false;
    for (const r of rivals) {
      if (r.price <= wtp && r.price * (0.96 + rnd() * 0.08) < myPerceived) { beaten = true; break; }
    }
    if (!beaten) mine++;
  }
  const share = mine / N;
  const perDay = share * c.demand * demandMult();
  // If rivals sell out you pick up their shoppers too, so this is a floor.
  return { share, perDay };
}

// ---------------------------------------------------------------- land

export function councilPrice() {
  return Math.round(plotBase(S.plots.length) * COUNCIL_MARKUP);
}

export function offerPrice(o) {
  let t = 0;
  for (let k = 0; k < o.plots; k++) t += plotBase(S.plots.length + k);
  return Math.round(t * o.factor);
}

export function buyOffer(id) {
  const o = S.offers.find(x => x.id === id);
  if (!o) return false;
  if (S.plots.length + o.plots > MAX_PLOTS) { emit('warn', `Your farm can only hold ${MAX_PLOTS} plots.`); return false; }
  const cost = offerPrice(o);
  if (S.coins < cost) { emit('warn', `You need ${cost}🪙 for that land.`); return false; }
  S.coins -= cost;
  S.total.spent += cost;
  for (let k = 0; k < o.plots; k++) S.plots.push({ crop: null });
  S.rivalPlots[o.rival] = Math.max(1, S.rivalPlots[o.rival] - o.plots);
  S.offers = S.offers.filter(x => x !== o);
  const r = RIVAL[o.rival];
  log(`You bought ${o.plots} plot${o.plots > 1 ? 's' : ''} from ${r.name} for ${cost}🪙.`, 'good');
  emit('land');
  emit('change');
  return true;
}

export function buyCouncilPlot() {
  if (S.plots.length >= MAX_PLOTS) { emit('warn', 'Your farm is as big as it can get!'); return false; }
  const cost = councilPrice();
  if (S.coins < cost) { emit('warn', `You need ${cost}🪙 for a council plot.`); return false; }
  S.coins -= cost;
  S.total.spent += cost;
  S.plots.push({ crop: null });
  log(`You bought a council plot for ${cost}🪙.`, 'good');
  emit('land');
  emit('change');
  return true;
}

function makeOffers() {
  const n = 1 + Math.floor(Math.random() * 3);
  const sellers = [...RIVALS].sort(() => Math.random() - 0.5).slice(0, n);
  S.offers = sellers.map(r => {
    const plots = Math.random() < 0.6 ? 1 : Math.random() < 0.7 ? 2 : 3;
    // Wild Hank swings hardest; Posy never sells cheap; Bramble likes a deal.
    const factor = {
      undercut: rand(0.75, 1.05), steady: rand(0.9, 1.1),
      premium: rand(1.05, 1.3), wild: rand(0.65, 1.35),
    }[r.style];
    return { id: `${S.day}-${r.id}`, rival: r.id, plots, factor };
  });
}

// ---------------------------------------------------------------- buildings

export function buildingCost(b) {
  return Math.round(b.cost * Math.pow(b.grow, S.built[b.id]));
}

export function build(id) {
  const b = BUILDING[id];
  if (!b || S.built[id] >= b.max) return false;
  if (b.needs && !S.built[b.needs]) { emit('warn', `Build the ${BUILDING[b.needs].name} first.`); return false; }
  const cost = buildingCost(b);
  if (S.coins < cost) { emit('warn', `You need ${cost}🪙 for the ${b.name}.`); return false; }
  S.coins -= cost;
  S.total.spent += cost;
  S.built[id]++;
  log(`You built ${b.emoji} ${b.name}.`, 'good');
  emit('build', b);
  emit('change');
  return true;
}

// ---------------------------------------------------------------- market sim

function stockRivals() {
  for (const r of RIVALS) {
    const book = S.rivals[r.id] = {};
    for (const id of r.grows) {
      const c = CROP[id];
      const qty = Math.round(c.demand * demandMult() * r.supply * rand(0.6, 1.4));
      if (qty <= 0) continue;
      book[id] = { qty, price: rivalPrice(r, id) };
    }
  }
}

function rivalPrice(r, cropId) {
  const f = S.fair[cropId];
  const p = {
    steady: f,
    premium: f * rand(1.12, 1.3),
    wild: f * rand(0.8, 1.3),
    undercut: f * 0.95,
  }[r.style];
  return Math.max(1, Math.round(p));
}

// Bramble reprices through the day to sit just under whoever is cheapest —
// including you. He stops at ~72% of the guide price.
function brambleReacts() {
  const r = RIVAL.bramble;
  const book = S.rivals.bramble || {};
  for (const id of Object.keys(book)) {
    const mine = book[id];
    if (!mine.qty) continue;
    const others = [];
    for (const x of RIVALS) if (x.id !== 'bramble') {
      const l = S.rivals[x.id] && S.rivals[x.id][id];
      if (l && l.qty) others.push(l.price);
    }
    if (S.stall[id] && S.stall[id].qty) others.push(S.stall[id].price);
    const floor = Math.max(1, Math.ceil(S.fair[id] * 0.72));
    const target = others.length ? Math.min(...others) - 1 : Math.round(S.fair[id] * 1.05);
    const next = Math.max(floor, Math.min(target, Math.round(S.fair[id] * 1.2)));
    if (next !== mine.price) {
      if (next < mine.price && S.stall[id] && S.stall[id].qty && S.stall[id].price - 1 === next) {
        log(`${r.emoji} Bramble cut his ${CROP[id].emoji} to ${next}🪙 to beat you!`, 'warn');
      }
      mine.price = next;
    }
  }
}

function shopper(c) {
  S.today.shoppers[c.id] = (S.today.shoppers[c.id] || 0) + 1;
  const wtp = S.fair[c.id] * rand(0.75, 1.35);
  let best = null, bestScore = Infinity;
  const mine = S.stall[c.id];
  if (mine && mine.qty > 0 && mine.price <= wtp * signBonus()) {
    best = 'you';
    bestScore = mine.price / signBonus() * rand(0.96, 1.04);
  }
  for (const r of RIVALS) {
    const l = S.rivals[r.id] && S.rivals[r.id][c.id];
    if (!l || l.qty <= 0 || l.price > wtp) continue;
    const score = l.price * rand(0.96, 1.04);
    if (score < bestScore) { best = r.id; bestScore = score; }
  }
  if (!best) { S.today.missed[c.id] = (S.today.missed[c.id] || 0) + 1; return; }
  if (best === 'you') {
    mine.qty--;
    S.coins += mine.price;
    S.total.earned += mine.price;
    S.total.sold++;
    S.today.sold++;
    S.today.earned += mine.price;
    const bc = S.today.byCrop[c.id] || (S.today.byCrop[c.id] = { n: 0, coins: 0 });
    bc.n++; bc.coins += mine.price;
    emit('sale', { crop: c, price: mine.price });
    if (mine.qty === 0) log(`Your ${c.emoji} ${c.name} sold out!`, 'good');
  } else {
    S.rivals[best][c.id].qty--;
    S.today.rivalSold[c.id] = (S.today.rivalSold[c.id] || 0) + 1;
  }
}

let reactClock = 0;
export function tick(dt) {
  S.dayT += dt;
  const mult = demandMult();
  for (const c of CROPS) {
    const n = poisson(c.demand * mult * dt / DAY_LENGTH);
    for (let k = 0; k < n; k++) shopper(c);
  }
  reactClock += dt;
  if (reactClock >= 8) { reactClock = 0; brambleReacts(); }
  if (S.dayT >= DAY_LENGTH) newDay();
}

function newDay() {
  const y = S.today;
  // Prices follow supply and demand: when shoppers go home empty-handed the
  // guide price climbs; when stalls are left full it sinks.
  const moves = [];
  for (const c of CROPS) {
    const shoppers = y.shoppers[c.id] || 0;
    const missed = y.missed[c.id] || 0;
    let unsold = (S.stall[c.id] ? S.stall[c.id].qty : 0);
    for (const r of RIVALS) {
      const l = S.rivals[r.id] && S.rivals[r.id][c.id];
      if (l) unsold += l.qty;
    }
    let f = S.fair[c.id] / c.fair;
    f *= Math.exp(rand(-0.07, 0.07));             // weather, gossip, luck
    if (shoppers >= 2 && missed / shoppers > 0.35) f *= 1.07;
    if (unsold > c.demand * demandMult() * 0.8) f *= 0.94;
    f += (1 - f) * 0.1;                            // drifts back toward normal
    f = clamp(f, 0.6, 1.6);
    const before = S.fair[c.id];
    S.fair[c.id] = Math.round(c.fair * f * 100) / 100;
    S.trend[c.id] = S.fair[c.id] > before * 1.005 ? 1 : S.fair[c.id] < before * 0.995 ? -1 : 0;
    moves.push({ c, pct: S.fair[c.id] / before - 1 });
  }
  moves.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const m = moves[0];
  const up = m.pct > 0;
  S.news = `Day ${S.day + 1}: ${m.c.emoji} ${m.c.name} prices ${up ? 'up' : 'down'} ${Math.abs(Math.round(m.pct * 100))}% — ` +
    (up ? 'shoppers couldn\'t find enough yesterday.' : 'too many were left on the stalls.');

  S.yesterday = { day: S.day, sold: y.sold, earned: y.earned, byCrop: y.byCrop };
  S.day++;
  S.dayT = 0;
  S.today = freshDayStats();
  stockRivals();
  brambleReacts();
  makeOffers();
  emit('day', S.yesterday);
  emit('change');
}
