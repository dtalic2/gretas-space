// ---------- Milbil Town: everything the game is made of ----------
//
// All the numbers live here so balancing is one file. Times are seconds,
// prices are coins, and `level` is the town level that unlocks the thing.

export const TILE = 2;            // world units per grid square
export const GRID = 19;           // the grid is GRID x GRID; the island is a blob inside it
export const ISLAND_R = 7.9;      // island radius, in tiles

export const START_COINS = 160;
export const BARN_START = 60;
export const BARN_STEP = 25;      // capacity added per upgrade
export const OFFLINE_CAP = 8 * 3600;   // seconds of catch-up when you come back

// ---------------------------------------------------------------- crops ----
// Grown in fields. `tall` and `color` are for the little 3D plant on the plot.

export const CROPS = [
  { id:'wheat',     name:'Wheat',     emoji:'🌾', secs:20,   sell:3,   xp:2,  level:1,  yield:3, color:0xe8c55c, tall:1.0 },
  { id:'carrot',    name:'Carrot',    emoji:'🥕', secs:60,   sell:8,   xp:4,  level:1,  yield:2, color:0xef8b3c, tall:0.6 },
  { id:'berry',     name:'Sunberry',  emoji:'🫐', secs:180,  sell:20,  xp:9,  level:3,  yield:2, color:0x9b6ede, tall:0.7 },
  { id:'corn',      name:'Corn',      emoji:'🌽', secs:420,  sell:42,  xp:16, level:5,  yield:2, color:0xf6d84b, tall:1.3 },
  { id:'moonleaf',  name:'Moonleaf',  emoji:'🍃', secs:900,  sell:85,  xp:28, level:7,  yield:1, color:0x64d6ab, tall:0.9 },
  { id:'starfruit', name:'Starfruit', emoji:'⭐', secs:1800, sell:165, xp:50, level:10, yield:1, color:0xffd86b, tall:1.1 },
];

// ---------------------------------------------------------------- goods ----
// Made in factories out of crops (and sometimes other goods).

export const GOODS = [
  { id:'bread',   name:'Bread',       emoji:'🍞', at:'bakery',  secs:45,   sell:20,   xp:5,  level:2,  in:{ wheat:2 } },
  { id:'cookie',  name:'Cookies',     emoji:'🍪', at:'bakery',  secs:150,  sell:55,   xp:9,  level:4,  in:{ wheat:2, carrot:1 } },
  { id:'cake',    name:'Berry Cake',  emoji:'🍰', at:'bakery',  secs:330,  sell:140,  xp:20, level:6,  in:{ wheat:3, berry:2 } },

  { id:'juice',   name:'Carrot Juice',emoji:'🧃', at:'press',   secs:90,   sell:48,   xp:8,  level:4,  in:{ carrot:3 } },
  { id:'fizz',    name:'Berry Fizz',  emoji:'🥤', at:'press',   secs:240,  sell:110,  xp:16, level:5,  in:{ berry:2, carrot:1 } },
  { id:'tonic',   name:'Moon Tonic',  emoji:'🍶', at:'press',   secs:480,  sell:275,  xp:34, level:8,  in:{ moonleaf:2 } },

  { id:'fluff',   name:'Fluff',       emoji:'☁️', at:'pen',     secs:240,  sell:80,   xp:12, level:6,  in:{ wheat:3, carrot:1 } },

  { id:'scarf',   name:'Scarf',       emoji:'🧣', at:'loom',    secs:360,  sell:300,  xp:30, level:8,  in:{ fluff:2 } },
  { id:'plush',   name:'Milbil Plush',emoji:'🧸', at:'loom',    secs:600,  sell:520,  xp:48, level:10, in:{ fluff:3, berry:1 } },

  { id:'stew',    name:'Corn Stew',   emoji:'🍲', at:'kitchen', secs:420,  sell:360,  xp:38, level:9,  in:{ corn:2, carrot:2 } },
  { id:'jelly',   name:'Star Jelly',  emoji:'🍮', at:'kitchen', secs:900,  sell:980,  xp:80, level:12, in:{ starfruit:2, moonleaf:1 } },
];

// Every storable thing, by id — crops and goods share the barn.
export const ITEMS = {};
for (const c of CROPS) ITEMS[c.id] = { ...c, kind:'crop' };
for (const g of GOODS) ITEMS[g.id] = { ...g, kind:'good' };

// ------------------------------------------------------------ buildings ----
// `w`/`d` are the footprint in tiles. `gives` is population a house houses,
// `needs` is population a workplace employs. `cost` is coins.

export const CATALOGUE = [
  { id:'field',   kind:'field',   name:'Field',         emoji:'🟩', w:1, d:1, cost:60,   level:1,  scale:1.45,
    blurb:'A patch of dirt. Plant a crop, wait, tap to harvest.' },

  { id:'cottage', kind:'house',   name:'Cottage',       emoji:'🏡', w:2, d:2, cost:90,   level:1,  gives:2,  scale:1.30,
    blurb:'Two more milbils move in. Milbils are what run everything else.' },
  { id:'burrow',  kind:'house',   name:'Mushroom Burrow',emoji:'🍄', w:2, d:2, cost:420,  level:3,  gives:4,  scale:1.30,
    blurb:'Dug out under a big red cap. Sleeps four.' },
  { id:'tower',   kind:'house',   name:'Sky Tower',     emoji:'🗼', w:2, d:2, cost:1400, level:6,  gives:7,  scale:1.28,
    blurb:'Seven milbils, stacked. The top one has the best view on the island.' },
  { id:'manor',   kind:'house',   name:'Cloud Manor',   emoji:'🏰', w:3, d:3, cost:4200, level:9,  gives:12, scale:1.25,
    blurb:'Twelve milbils and a very serious front door.' },

  { id:'bakery',  kind:'factory', name:'Crumb Bakery',  emoji:'🥐', w:2, d:2, cost:150,  level:2,  needs:2,  scale:1.25,
    blurb:'Turns wheat into bread, cookies and cake.' },
  { id:'press',   kind:'factory', name:'Dew Press',     emoji:'🧃', w:2, d:2, cost:520,  level:4,  needs:4,  scale:1.25,
    blurb:'Squeezes carrots, berries and moonleaf into drinks.' },
  { id:'pen',     kind:'factory', name:'Fluff Pen',     emoji:'🐑', w:3, d:2, cost:1100, level:6,  needs:5,  scale:1.15,
    blurb:'Feed the puffs, comb the puffs, collect the fluff.' },
  { id:'loom',    kind:'factory', name:'Cosy Loom',     emoji:'🧣', w:2, d:2, cost:2200, level:8,  needs:7,  scale:1.25,
    blurb:'Fluff in, scarves and plushies out.' },
  { id:'kitchen', kind:'factory', name:'Sun Kitchen',   emoji:'🍲', w:3, d:2, cost:3400, level:9,  needs:9,  scale:1.15,
    blurb:'The big pots. Stew, and eventually star jelly.' },

  { id:'tree',    kind:'decor',   name:'Puff Tree',     emoji:'🌳', w:1, d:1, cost:40,   level:1,  scale:1.35,
    blurb:'Milbils sit under it. Worth a little XP.' },
  { id:'flowers', kind:'decor',   name:'Flower Bed',    emoji:'🌷', w:1, d:1, cost:30,   level:1,  scale:1.6,
    blurb:'Cheerful. Costs almost nothing.' },
  { id:'lamp',    kind:'decor',   name:'Lantern',       emoji:'🏮', w:1, d:1, cost:90,   level:2,  scale:1.5,
    blurb:'Glows at night, which is most of the point.' },
  { id:'bench',   kind:'decor',   name:'Bench',         emoji:'🪑', w:1, d:1, cost:120,  level:3,  scale:1.5,
    blurb:'Somewhere to put a tired milbil.' },
  { id:'fountain',kind:'decor',   name:'Fountain',      emoji:'⛲', w:2, d:2, cost:800,  level:5,  scale:1.3,
    blurb:'The centre of any town worth walking across.' },
  { id:'statue',  kind:'decor',   name:'Milbil Statue', emoji:'🗿', w:1, d:1, cost:1600, level:8,  scale:1.4,
    blurb:'Nobody remembers which milbil. Everyone is proud of it.' },
  { id:'balloon', kind:'decor',   name:'Post Balloon',  emoji:'🎈', w:2, d:2, cost:900,  level:5,  scale:1.2,
    blurb:'Moored, striped, and going nowhere. The helipad took its job.' },
];

export const BUILD = {};
for (const b of CATALOGUE) BUILD[b.id] = b;

// Fixed pieces the town starts with — placed, never bought, never moved.
export const FIXED = {
  barn:    { id:'barn',    name:'Barn',    emoji:'📦', w:2, d:2 },
  helipad: { id:'helipad', name:'Helipad', emoji:'🚁', w:3, d:3 },
};

// Fields get pricier the more you own, so a big farm is a real decision.
export function fieldCost(owned){
  return Math.round(60 * Math.pow(1.42, Math.max(0, owned - 2)) / 5) * 5;
}
export function barnUpgradeCost(ups){
  return Math.round(140 * Math.pow(1.55, ups) / 10) * 10;
}

// --------------------------------------------------------------- levels ----
// Cumulative XP needed to reach each level. Past the table it keeps climbing.

const LEVEL_TABLE = [0, 30, 95, 210, 420, 760, 1250, 1950, 2950, 4400, 6400,
                     9200, 13000, 18200, 25000, 34000, 46000, 62000, 83000, 110000];

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

/** Everything that becomes available exactly at `level` — used by the level-up card. */
export function unlocksAt(level){
  const out = [];
  for (const b of CATALOGUE) if (b.level === level) out.push({ emoji:b.emoji, name:b.name });
  for (const c of CROPS)     if (c.level === level) out.push({ emoji:c.emoji, name:c.name });
  for (const g of GOODS)     if (g.level === level) out.push({ emoji:g.emoji, name:g.name });
  return out;
}

// --------------------------------------------------------------- orders ----

export const ORDER_SLOTS = 3;
export const ORDER_GAP = 40;        // seconds before an empty slot refills
export const ORDER_SKIP_COOLDOWN = 60;

// ------------------------------------------------------------ characters ---
// The milbils from other islands who land on the helipad wanting things.
// Each one is a drawing; `art` is the cut-out PNG in art/. Rename freely —
// nothing but this list knows what they are called.

export const CHARACTERS = [
  { id:'petal',  name:'Petal',  art:'art/petal.png',  tint:0xff8fb1 },
  { id:'chomp',  name:'Chomp',  art:'art/chomp.png',  tint:0x8f9dff },
  { id:'hattie', name:'Hattie', art:'art/hattie.png', tint:0xff9dd6 },
  { id:'sunny',  name:'Sunny',  art:'art/sunny.png',  tint:0xffe08a },
  { id:'scoop',  name:'Scoop',  art:'art/scoop.png',  tint:0x8fe0a8 },
];

export const CHARACTER = {};
for (const c of CHARACTERS) CHARACTER[c.id] = c;

// --------------------------------------------------------------- milbils ---

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

export const MAX_WANDERERS = 18;    // more than this on screen is just noise
