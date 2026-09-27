// ---------- Milbil Hotel: everything the game is made of ----------
//
// All the numbers live here so balancing is one file. Times are seconds,
// prices are coins, and `level` is the hotel level that unlocks the thing.

export const SLOT_W = 4;          // world units across one room
export const FLOOR_H = 3;         // world units from one floor to the next
export const SLOTS = 3;           // rooms across each floor
export const MAX_FLOORS = 12;     // ground floor included
export const LIFT_X = -6;         // the lift shaft, to the left of the rooms

export const START_COINS = 150;
export const LOBBY_START = 3;     // guests who can wait in the lobby at once
export const LOBBY_MAX = 6;
export const MAX_KEEPERS = 3;

/** Centre of room `s` on any floor, in world x. */
export const slotX = (s) => -3 + s * SLOT_W;

// ---------------------------------------------------------------- rooms ----
// Somewhere to sleep. Guests ask for one kind and pay when they check out.

export const ROOMS = [
  { id:'cosy',  name:'Cosy Room',       emoji:'🛏️', secs:30,   pay:36,   xp:3,  level:1,  cost:40,
    blurb:'A bed, a lamp and a window. Every milbil has to start somewhere.' },
  { id:'bunk',  name:'Bunk Room',       emoji:'🪜', secs:75,   pay:90,   xp:6,  level:2,  cost:130,
    blurb:'Bunk beds, so the whole family fits. Top bunk is always argued over.' },
  { id:'flower',name:'Flower Room',     emoji:'🌸', secs:150,  pay:190,  xp:11, level:3,  cost:325,
    blurb:'Pots on every shelf and petals on the pillow.' },
  { id:'moon',  name:'Moon Suite',      emoji:'🌙', secs:300,  pay:420,  xp:20, level:5,  cost:800,
    blurb:'Deep blue walls and a moon lamp that glows all night.' },
  { id:'star',  name:'Star Suite',      emoji:'⭐', secs:600,  pay:920,  xp:36, level:7,  cost:1900,
    blurb:'A bed shaped like a star. Guests leave extremely rested.' },
  { id:'cloud', name:'Cloud Penthouse', emoji:'☁️', secs:1200, pay:2000, xp:70, level:10, cost:4500,
    blurb:'Gold taps, a bed like a cloud, and the best view in Milbil Town.' },
];

// ---------------------------------------------------------------- areas ----
// Rooms nobody sleeps in. Each one is somewhere guests wish they could go:
// grant the wish and they pay half as much again. One of each.

export const AREAS = [
  { id:'cafe',     name:'Café',        emoji:'☕', level:2, cost:175,  wish:'a hot breakfast',
    blurb:'Toast, cocoa and a very small milbil behind the counter.' },
  { id:'games',    name:'Games Room',  emoji:'🎲', level:3, cost:350,  wish:'a game of marbles',
    blurb:'Marbles, a wobbly table and a machine that goes ding.' },
  { id:'spa',      name:'Bubble Spa',  emoji:'🛁', level:4, cost:700, wish:'a bubble bath',
    blurb:'The bubbles go up to the ceiling. That is the whole idea.' },
  { id:'library',  name:'Library',     emoji:'📚', level:5, cost:1000, wish:'a good book',
    blurb:'Shelves to the ceiling and one enormous armchair.' },
  { id:'music',    name:'Music Room',  emoji:'🎹', level:6, cost:1400, wish:'a sing-song',
    blurb:'A piano with three working keys. Nobody minds.' },
  { id:'ballroom', name:'Ballroom',    emoji:'🪩', level:8, cost:2600, wish:'a dance',
    blurb:'A spinning glitter ball and a floor that lights up.' },
];

// Everything that goes into a room slot, by id.
export const ITEMS = {};
for (const r of ROOMS) ITEMS[r.id] = { ...r, kind:'room' };
for (const a of AREAS) ITEMS[a.id] = { ...a, kind:'area' };
export const ROOM_ORDER = ROOMS.map(r => r.id);

// --------------------------------------------------------------- outside ---
// Bought once. They live around the hotel rather than in it.

export const EXTRAS = [
  { id:'garden',  name:'Front Garden', emoji:'🌷', level:2, cost:125,
    blurb:'Flower beds and a bench. Guests happily wait half as long again.' },
  { id:'bus',     name:'Bus Stop',     emoji:'🚌', level:3, cost:250,
    blurb:'The Milbil Town bus stops outside. Guests turn up faster.' },
  { id:'sign',    name:'Neon Sign',    emoji:'✨', level:4, cost:450,
    blurb:'The name in lights on the roof. Every stay pays 10% more.' },
  { id:'pool',    name:'Rooftop Pool', emoji:'🏊', level:5, cost:1100, wish:'a swim',
    blurb:'A pool on the roof. Guests who wish for a swim pay half again.' },
  { id:'helipad', name:'Helipad',      emoji:'🚁', level:6, cost:1600,
    blurb:'The helicopter from Milbil Town lands here with VIPs, who pay double.' },
];
export const EXTRA = {};
for (const e of EXTRAS) EXTRA[e.id] = e;

// Every wish a guest can make, and what grants it.
export const WISHES = [
  ...AREAS.map(a => ({ id:a.id, emoji:a.emoji, text:a.wish, level:a.level })),
  { id:'pool', emoji:'🏊', text:'a swim', level:5 },
];
export const WISH = {};
for (const w of WISHES) WISH[w.id] = w;

// ------------------------------------------------------------- pricing -----

/** What the next floor costs when the hotel is `floors` tall (ground included). */
export function floorCost(floors){
  return Math.round(110 * Math.pow(1.72, Math.max(0, floors - 2)) / 10) * 10;
}
/** Rooms of a kind get a little pricier the more of them you own. */
export function roomCost(item, owned){
  if (item.kind === 'area') return item.cost;
  return Math.round(item.cost * (1 + 0.3 * owned) / 5) * 5;
}
export function lobbyCost(ups){ return 150 * Math.pow(2, ups); }
export const KEEPER_COST = [200, 750, 2000];
export const KEEPER_LEVEL = 3;
/** Seconds a messy room waits before a housekeeper tidies it. */
export const keeperDelay = (n) => [0, 12, 7, 4][n];

// --------------------------------------------------------------- guests ----

export const PATIENCE = 150;          // seconds a guest will wait in the lobby
/** Seconds between arrivals. It speeds up as the hotel gets famous. */
export function arrivalGap(level, bus){
  return Math.max(6, 18 - level * 0.9) * (bus ? 0.7 : 1);
}

// The drawn characters: VIPs who arrive from Milbil Town now and then.
// Each one is Greta's drawing; `art` is the cut-out PNG in art/.
export const CHARACTERS = [
  { id:'petal',  name:'Petal',  art:'art/petal.png',  tint:'#ff8fb1', likes:'flower',
    line:'Petal always asks for the room with the most flowers in it.' },
  { id:'chomp',  name:'Chomp',  art:'art/chomp.png',  tint:'#8f9dff', likes:'cafe',
    line:'Chomp comes for the breakfasts. Chomp stays for the second breakfasts.' },
  { id:'hattie', name:'Hattie', art:'art/hattie.png', tint:'#ff9dd6', likes:'ballroom',
    line:'Hattie never takes the hat off, not even in the bath.' },
  { id:'sunny',  name:'Sunny',  art:'art/sunny.png',  tint:'#ffe08a', likes:'pool',
    line:'Sunny likes a room with a window facing the morning.' },
  { id:'scoop',  name:'Scoop',  art:'art/scoop.png',  tint:'#8fe0a8', likes:'games',
    line:'Scoop has never once lost at marbles, and will tell you so.' },
];
export const CHARACTER = {};
for (const c of CHARACTERS) CHARACTER[c.id] = c;

export const MILBIL_NAMES = [
  'Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Bobbin', 'Wix', 'Doodle', 'Crumb',
  'Pocket', 'Mo', 'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep', 'Rumble',
  'Sprig', 'Noodle', 'Tumble', 'Winkle', 'Puddle', 'Gus', 'Bean', 'Marzi',
  'Hopp', 'Nib', 'Squish', 'Lark', 'Mitt', 'Fig', 'Dolly', 'Pip', 'Cosy',
];
export const MILBIL_COLORS = [
  0xffb3c7, 0x9fd8ff, 0xffe08a, 0xb6e8a8, 0xd7b5ff, 0xffc79c,
  0x9fe8dd, 0xf7a8a8, 0xc9d8ff, 0xffd6f0,
];

// --------------------------------------------------------------- levels ----
// Cumulative XP needed to reach each level. Past the table it keeps climbing.

const LEVEL_TABLE = [0, 25, 80, 180, 360, 650, 1080, 1700, 2600, 3900, 5700,
                     8200, 11600, 16200, 22500, 31000, 42000, 57000, 77000, 103000];

export function xpForLevel(level){
  if (level <= 1) return 0;
  if (level - 1 < LEVEL_TABLE.length) return LEVEL_TABLE[level - 1];
  const last = LEVEL_TABLE[LEVEL_TABLE.length - 1];
  return Math.round(last * Math.pow(1.34, level - LEVEL_TABLE.length));
}

export function levelForXp(xp){
  let lvl = 1;
  while (xp >= xpForLevel(lvl + 1) && lvl < 60) lvl++;
  return lvl;
}

/** Everything that becomes available exactly at `level` — for the level-up card. */
export function unlocksAt(level){
  const out = [];
  for (const r of ROOMS)  if (r.level === level) out.push({ emoji:r.emoji, name:r.name });
  for (const a of AREAS)  if (a.level === level) out.push({ emoji:a.emoji, name:a.name });
  for (const e of EXTRAS) if (e.level === level) out.push({ emoji:e.emoji, name:e.name });
  if (level === KEEPER_LEVEL) out.push({ emoji:'🧹', name:'Housekeepers' });
  return out;
}
