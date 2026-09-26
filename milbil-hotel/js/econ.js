// ---------- The rules of the hotel ----------
//
// No DOM and no three.js in here: every function takes the saved state and
// changes it, so the live tick and catching up after a nap are the same code.
// Times are milliseconds since the epoch (`now`); durations are seconds.

import {
  SLOTS, MAX_FLOORS, ITEMS, ROOMS, ROOM_ORDER, EXTRA, WISHES, CHARACTERS,
  MILBIL_NAMES, MILBIL_COLORS, LOBBY_START, LOBBY_MAX, MAX_KEEPERS, KEEPER_COST, KEEPER_LEVEL,
  PATIENCE, floorCost, roomCost, lobbyCost, keeperDelay, arrivalGap, levelForXp, xpForLevel,
} from './data.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --------------------------------------------------------------- slots -----

export const key = (f, s) => `${f}:${s}`;
export const unkey = (k) => k.split(':').map(Number);

/** The ground floor's first two slots are the lobby; everything else is buildable. */
export function isSlot(f, s){ return f > 0 || s === 2; }

export function allSlots(state){
  const out = [];
  for (let f = 0; f < state.floors; f++)
    for (let s = 0; s < SLOTS; s++) if (isSlot(f, s)) out.push(key(f, s));
  return out;
}

export function emptySlots(state){ return allSlots(state).filter(k => !state.rooms[k]); }

export function countOf(state, type){
  return Object.values(state.rooms).filter(r => r.type === type).length;
}

/** Does the hotel have this area or outside extra? Wishes ask exactly this. */
export function has(state, id){
  return !!state.extras[id] || Object.values(state.rooms).some(r => r.type === id);
}

export const lobbySize = (state) => Math.min(LOBBY_MAX, LOBBY_START + state.lobbyUps);

// ------------------------------------------------------------- building ----

function spend(state, cost){
  if (state.coins < cost) return false;
  state.coins -= cost;
  return true;
}

export function costOf(state, type){ return roomCost(ITEMS[type], countOf(state, type)); }

export function buildCheck(state, type){
  const it = ITEMS[type];
  if (!it) return { ok:false, why:'Unknown room' };
  if (state.level < it.level) return { ok:false, why:`Opens at level ${it.level}` };
  if (it.kind === 'area' && countOf(state, type)) return { ok:false, why:'You already have one' };
  const cost = costOf(state, type);
  if (state.coins < cost) return { ok:false, why:'Not enough coins', cost };
  if (!emptySlots(state).length) return { ok:false, why:'No empty space — add a floor', cost, full:true };
  return { ok:true, cost };
}

export function build(state, type, k){
  const chk = buildCheck(state, type);
  if (!chk.ok) return chk;
  if (state.rooms[k] || !emptySlots(state).includes(k)) return { ok:false, why:'That space is taken' };
  spend(state, chk.cost);
  state.rooms[k] = { type, st:'free' };
  const levels = gainXp(state, Math.max(2, Math.round(chk.cost / 40)));
  return { ok:true, cost:chk.cost, levels };
}

/** Knock a room back out for half what it cost. Only an empty, tidy one. */
export function demolish(state, k){
  const r = state.rooms[k];
  if (!r) return { ok:false, why:'Nothing there' };
  if (r.st !== 'free') return { ok:false, why:'Wait until it is empty and tidy' };
  delete state.rooms[k];
  const back = Math.floor(roomCost(ITEMS[r.type], countOf(state, r.type)) / 2);
  state.coins += back;
  return { ok:true, back };
}

export function floorCheck(state){
  if (state.floors >= MAX_FLOORS) return { ok:false, why:'The hotel is as tall as it goes' };
  const cost = floorCost(state.floors);
  if (state.coins < cost) return { ok:false, why:'Not enough coins', cost };
  return { ok:true, cost };
}

export function buyFloor(state){
  const chk = floorCheck(state);
  if (!chk.ok) return chk;
  spend(state, chk.cost);
  state.floors++;
  return { ...chk, levels: gainXp(state, Math.round(chk.cost / 30)) };
}

export function extraCheck(state, id){
  const e = EXTRA[id];
  if (state.extras[id]) return { ok:false, why:'Already built' };
  if (state.level < e.level) return { ok:false, why:`Opens at level ${e.level}` };
  if (state.coins < e.cost) return { ok:false, why:'Not enough coins', cost:e.cost };
  return { ok:true, cost:e.cost };
}

export function buyExtra(state, id){
  const chk = extraCheck(state, id);
  if (!chk.ok) return chk;
  spend(state, chk.cost);
  state.extras[id] = true;
  return { ...chk, levels: gainXp(state, Math.round(chk.cost / 30)) };
}

export function lobbyCheck(state){
  if (lobbySize(state) >= LOBBY_MAX) return { ok:false, why:'The lobby is as big as it goes' };
  const cost = lobbyCost(state.lobbyUps);
  if (state.coins < cost) return { ok:false, why:'Not enough coins', cost };
  return { ok:true, cost };
}

export function growLobby(state){
  const chk = lobbyCheck(state);
  if (!chk.ok) return chk;
  spend(state, chk.cost);
  state.lobbyUps++;
  return chk;
}

export function keeperCheck(state){
  if (state.level < KEEPER_LEVEL) return { ok:false, why:`Opens at level ${KEEPER_LEVEL}` };
  if (state.keepers >= MAX_KEEPERS) return { ok:false, why:'The staff room is full' };
  const cost = KEEPER_COST[state.keepers];
  if (state.coins < cost) return { ok:false, why:'Not enough coins', cost };
  return { ok:true, cost };
}

export function hireKeeper(state, now = Date.now()){
  const chk = keeperCheck(state);
  if (!chk.ok) return chk;
  spend(state, chk.cost);
  state.keepers++;
  // Anything already messy gets seen to on the new, quicker rota.
  for (const r of Object.values(state.rooms))
    if (r.st === 'messy') r.tidyAt = now + keeperDelay(state.keepers) * 1000;
  return chk;
}

// --------------------------------------------------------------- guests ----

/** Which kinds of room guests can ask for: the ones you own, mostly. */
function wantable(state){
  const owned = ROOM_ORDER.filter(id => countOf(state, id));
  const open = ROOMS.filter(r => r.level <= state.level).map(r => r.id);
  const missing = open.filter(id => !owned.includes(id));
  // Now and then somebody asks for something you have not built yet — a nudge.
  if (missing.length && owned.length && Math.random() < 0.14) return [pick(missing)];
  if (!owned.length) return ['cosy'];
  // Fancier rooms come up a bit more often once you have them.
  const out = [];
  owned.forEach((id, i) => { for (let n = 0; n <= i; n++) out.push(id); });
  return out;
}

export function rollGuest(state, now = Date.now()){
  const vipOdds = state.extras.helipad ? 0.45 : 0.25;
  const vip = state.stats.checkins >= 2 && Math.random() < vipOdds;
  const wishes = WISHES.filter(w => w.level <= state.level);
  const g = {
    uid: state.uid++,
    wants: pick(wantable(state)),
    wish: wishes.length && Math.random() < 0.75 ? pick(wishes).id : null,
    arrived: now,
    patience: PATIENCE * (state.extras.garden ? 1.5 : 1),
    via: 'street',
  };
  if (vip){
    const c = pick(CHARACTERS);
    g.who = c.id;
    g.name = c.name;
    // VIPs have favourites, and ask for them when they can.
    if (WISHES.some(w => w.id === c.likes && w.level <= state.level) && Math.random() < 0.6) g.wish = c.likes;
    if (ITEMS[c.likes]?.kind === 'room' && countOf(state, c.likes)) g.wants = c.likes;
    g.via = state.extras.helipad ? 'heli' : state.extras.bus ? 'bus' : 'street';
  } else {
    g.name = pick(MILBIL_NAMES);
    g.color = pick(MILBIL_COLORS);
    g.via = state.extras.bus && Math.random() < 0.6 ? 'bus' : 'street';
  }
  return g;
}

/** The best free room for a guest: what they asked for, or else something nicer. */
export function roomFor(state, guest){
  const want = ROOM_ORDER.indexOf(guest.wants);
  let best = null, bestRank = 99;
  for (const k of allSlots(state)){
    const r = state.rooms[k];
    if (!r || r.st !== 'free' || ITEMS[r.type].kind !== 'room') continue;
    const rank = ROOM_ORDER.indexOf(r.type);
    if (rank >= want && rank < bestRank){ best = k; bestRank = rank; }
  }
  return best;
}

/** What a guest pays and learns you, before they have even unpacked. */
export function quote(state, guest, roomType){
  const asked = ITEMS[guest.wants];
  let pay = asked.pay;
  let xp = asked.xp;
  const upgraded = roomType !== guest.wants;
  const wished = !!(guest.wish && has(state, guest.wish));
  if (upgraded) pay *= 1.2;
  if (wished){ pay *= 1.5; xp *= 1.5; }
  if (guest.who) pay *= state.extras.helipad ? 2 : 1.5;
  if (state.extras.sign) pay *= 1.1;
  return { pay: Math.round(pay), xp: Math.round(xp), upgraded, wished };
}

export function checkIn(state, guestUid, now = Date.now(), k = null){
  const i = state.lobby.findIndex(g => g.uid === guestUid);
  if (i < 0) return { ok:false, why:'They have gone' };
  const guest = state.lobby[i];
  k = k || roomFor(state, guest);
  if (!k){
    const it = ITEMS[guest.wants];
    const any = countOf(state, guest.wants);
    return { ok:false, why: any ? `Every ${it.name} is taken — wait, or build another`
                                : `You have no ${it.name} yet — build one!`, want:guest.wants };
  }
  const r = state.rooms[k];
  const q = quote(state, guest, r.type);
  state.lobby.splice(i, 1);
  Object.assign(r, { st:'busy', guest, endsAt: now + ITEMS[r.type].secs * 1000, pay:q.pay, xp:q.xp, happy:q.wished });
  state.stats.checkins++;
  if (guest.who) state.stats.vip[guest.who] = (state.stats.vip[guest.who] || 0) + 1;
  else state.stats.milbils++;
  return { ok:true, key:k, guest, ...q };
}

/** Coins waiting on the pillow: take them and the room needs a tidy. */
export function collect(state, k, now = Date.now()){
  const r = state.rooms[k];
  if (!r || r.st !== 'pay') return { ok:false };
  const got = { ok:true, coins:r.pay, xp:r.xp, happy:r.happy, guest:r.guest };
  state.coins += r.pay;
  state.stats.earned += r.pay;
  state.stats.collected++;
  const levels = gainXp(state, r.xp);
  r.st = 'messy';
  r.tidyAt = state.keepers ? now + keeperDelay(state.keepers) * 1000 : 0;
  delete r.guest; delete r.pay; delete r.xp; delete r.endsAt; delete r.happy;
  got.levels = levels;
  return got;
}

export function tidy(state, k){
  const r = state.rooms[k];
  if (!r || r.st !== 'messy') return { ok:false };
  r.st = 'free';
  delete r.tidyAt;
  state.stats.tidied++;
  const levels = gainXp(state, 1);
  return { ok:true, levels };
}

// ---------------------------------------------------------------- time -----

/**
 * Move the hotel on to `now`. Returns what happened, in order, so the scene
 * and the HUD can react: arrivals, walk-outs, check-outs, tidied rooms.
 */
export function tick(state, now = Date.now()){
  const events = [];

  for (const k of allSlots(state)){
    const r = state.rooms[k];
    if (!r) continue;
    if (r.st === 'busy' && now >= r.endsAt){
      r.st = 'pay';
      events.push({ type:'checkout', key:k, guest:r.guest });
    }
    if (r.st === 'messy' && state.keepers && r.tidyAt && now >= r.tidyAt){
      r.st = 'free';
      delete r.tidyAt;
      events.push({ type:'tidied', key:k });
    }
  }

  // Arrivals, one at a time, never more than the lobby holds. After a long
  // nap this back-fills from when the lobby last had room.
  const gap = arrivalGap(state.level, state.extras.bus) * 1000;
  if (!state.nextArrival) state.nextArrival = now + 3000;
  let guard = 0;
  while (state.nextArrival <= now && guard++ < 50){
    const at = state.nextArrival;
    state.nextArrival = at + gap * (0.7 + Math.random() * 0.6);
    if (state.lobby.length >= lobbySize(state)) { state.nextArrival = Math.max(state.nextArrival, now + gap * 0.5); break; }
    const g = rollGuest(state, at);
    state.lobby.push(g);
    events.push({ type:'arrive', guest:g });
  }

  for (let i = state.lobby.length - 1; i >= 0; i--){
    const g = state.lobby[i];
    if (now - g.arrived > g.patience * 1000){
      state.lobby.splice(i, 1);
      state.stats.walked++;
      events.push({ type:'leave', guest:g });
    }
  }
  return events;
}

// -------------------------------------------------------------- levels -----

export function gainXp(state, n){
  const before = state.level;
  state.xp += n;
  state.level = levelForXp(state.xp);
  const ups = [];
  for (let l = before + 1; l <= state.level; l++){
    const bonus = 40 * l;
    state.coins += bonus;
    ups.push({ level:l, bonus });
  }
  return ups;
}

export function levelProgress(state){
  const lo = xpForLevel(state.level), hi = xpForLevel(state.level + 1);
  return Math.min(1, (state.xp - lo) / Math.max(1, hi - lo));
}

// ------------------------------------------------------------ guidance -----

/** The one next thing worth doing, for the banner at the top of the screen. */
export function objective(state){
  const s = state.stats;
  if (!s.checkins) return state.lobby.length
    ? 'Tap a guest in the lobby to check them in 🛎️'
    : 'The first guest is on the way — watch the pavement';
  if (!s.collected) return 'When a guest checks out, tap the 🪙 over their room';
  if (!s.tidied && !state.keepers) return 'Tap the 🧹 to tidy the room for the next guest';
  const rooms = Object.values(state.rooms).filter(r => ITEMS[r.type].kind === 'room').length;
  if (rooms < 3) return 'Build another room — tap an empty ＋ space, or 🛠 Build';
  if (state.floors < 3) return 'Add a new floor — tap ＋ Floor on the roof';
  if (state.level >= 2 && !has(state, 'cafe')) return 'Build a ☕ Café — guests who wish for breakfast pay 50% more';
  if (state.level >= 2 && !state.extras.garden) return 'Plant a 🌷 Front Garden so guests wait longer';
  if (state.level >= KEEPER_LEVEL && !state.keepers) return 'Hire a 🧹 housekeeper to tidy rooms for you';
  return null;
}

/** For the welcome-back card: what changed while nobody was looking. */
export function awayReport(events){
  const out = { checkouts:0, arrived:0, left:0, tidied:0 };
  for (const e of events){
    if (e.type === 'checkout') out.checkouts++;
    if (e.type === 'arrive') out.arrived++;
    if (e.type === 'leave') out.left++;
    if (e.type === 'tidied') out.tidied++;
  }
  return out;
}

export function waitingCoins(state){
  return Object.values(state.rooms).reduce((n, r) => n + (r.st === 'pay' ? r.pay : 0), 0);
}

