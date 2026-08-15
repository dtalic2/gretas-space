// ---------- Static game data ----------

// growSec = seconds from planting to harvestable at 1x speed.
// Watering applies WATER_BOOST for the remainder; un-watered crops crawl.
// scale  = visual size of the mature plant (1 = default).
// rare   = magic-tree only, cannot be bought; `weight` sets how often it drops.
// Prices climb steeply: each seed-shop tier costs roughly 2.4x the one before it,
// and each magic-tree tier about 2.6x. Sell prices track cost at a steady ~2.8x
// (~2.6x for rares), so the margin stays healthy while the numbers escalate fast.
export const CROPS = {
  // ---- buyable, in unlock order ----
  onion:      { name:'Onion',       emoji:'🧅', cost:3,     sell:9,     growSec:14,  scale:1.00, color:0xc9a0dc, leaf:0x62a52c, shape:'bulb', bush:false     },
  carrot:     { name:'Carrot',      emoji:'🥕', cost:7,     sell:20,    growSec:22,  scale:0.90, color:0xef7d2e, leaf:0x4c9a2a, shape:'root'     },
  garlic:     { name:'Garlic',      emoji:'🧄', cost:12,    sell:34,    growSec:26,  scale:0.95, color:0xf3ece0, leaf:0x8fbf5a, shape:'bulb', bush:false     },
  lettuce:    { name:'Lettuce',     emoji:'🥬', cost:17,    sell:48,    growSec:32,  scale:1.00, color:0x8fd14f, leaf:0x5da032, shape:'leafy', bush:false    },
  beans:      { name:'Green Beans', emoji:'🫘', cost:26,    sell:74,    growSec:29,  scale:1.00, color:0x6fbf3f, leaf:0x4c9a2a, shape:'cluster'  },
  peas:       { name:'Sugar Snap Peas', emoji:'🫛', cost:34, sell:95,  growSec:30,  scale:0.95, color:0x8fd14f, leaf:0x4c9a2a, shape:'cluster'  },
  strawberry: { name:'Strawberry',  emoji:'🍓', cost:42,    sell:118,   growSec:45,  scale:0.95, color:0xe0353c, leaf:0x3f8f22, shape:'berry'    },
  blueberry:  { name:'Blueberry',   emoji:'🫐', cost:65,    sell:185,   growSec:54,  scale:0.95, color:0x4a6fd6, leaf:0x3f8f22, shape:'cluster'  },
  potato:     { name:'Potato',      emoji:'🥔', cost:68,    sell:190,   growSec:50,  scale:1.00, color:0xc98f52, leaf:0x5da032, shape:'bulb', bush:false },
  ginger:     { name:'Ginger',      emoji:'🫚', cost:88,    sell:245,   growSec:48,  scale:0.95, color:0xd8b06a, leaf:0x6fbf3f, shape:'tuber', bush:false },
  tomato:     { name:'Tomato',      emoji:'🍅', cost:100,   sell:280,   growSec:62,  scale:1.05, color:0xe23b2e, leaf:0x4c9a2a, shape:'vine'     },
  wheat:      { name:'Wheat',       emoji:'🌾', cost:130,   sell:365,   growSec:58,  scale:1.10, color:0xe0c46a, leaf:0xb8a44a, shape:'stalk'    },
  mushroom:   { name:'Button Mushroom', emoji:'🍄‍🟫', cost:175, sell:490, growSec:52, scale:0.95, color:0xd8c4a8, leaf:0x8a6a4a, shape:'mushroom', bush:false },
  corn:       { name:'Corn',        emoji:'🌽', cost:240,   sell:670,   growSec:75,  scale:1.10, color:0xf3c53d, leaf:0x62a52c, shape:'stalk'    },
  broccoli:   { name:'Broccoli',    emoji:'🥦', cost:380,   sell:1060,  growSec:86,  scale:1.05, color:0x3f9440, leaf:0x357a1e, shape:'broccoli', bush:false },
  bellpepper: { name:'Bell Pepper', emoji:'🫑', cost:390,   sell:1090,  growSec:80,  scale:1.05, color:0xe8b22a, leaf:0x3f8f22, shape:'pepper'   },
  sweetpotato:{ name:'Sweet Potato',emoji:'🍠', cost:480,   sell:1340,  growSec:78,  scale:1.00, color:0xd4763c, leaf:0x5da032, shape:'tuber', bush:false },
  sunflower:  { name:'Sunflower',   emoji:'🌻', cost:580,   sell:1600,  growSec:95,  scale:1.25, color:0xffc93c, leaf:0x4c9a2a, shape:'flower', bush:false   },
  kiwi:       { name:'Kiwi Vine',   emoji:'🥝', cost:900,   sell:2500,  growSec:100, scale:1.05, color:0x8a6a3a, leaf:0x5da032, shape:'vine'     },
  pumpkin:    { name:'Pumpkin',     emoji:'🎃', cost:1400,  sell:3900,  growSec:120, scale:1.15, color:0xe8801d, leaf:0x4c9a2a, shape:'gourd'    },
  bamboo:     { name:'Bamboo',      emoji:'🎋', cost:2100,  sell:5900,  growSec:128, scale:1.25, color:0x8fc94f, leaf:0x4c9a2a, shape:'stalk'    },
  cucumber:   { name:'Cucumber',    emoji:'🥒', cost:2200,  sell:6100,  growSec:136, scale:1.05, color:0x4f9e2f, leaf:0x3f8f22, shape:'cucumber' },
  aubergine:  { name:'Aubergine',   emoji:'🍆', cost:3400,  sell:9400,  growSec:150, scale:1.10, color:0x7b3fa0, leaf:0x3f8f22, shape:'teardrop' },
  pineapple:  { name:'Pineapple',   emoji:'🍍', cost:8200,  sell:22500, growSec:180, scale:1.15, color:0xe3b13c, leaf:0x2f7d1e, shape:'tropic'   },
  honeydew:   { name:'Honeydew',    emoji:'🍈', cost:12500, sell:34000, growSec:200, scale:1.25, color:0xc9dd7a, leaf:0x62a52c, shape:'melon'    },
  watermelon: { name:'Watermelon',  emoji:'🍉', cost:20000, sell:55000, growSec:250, scale:1.30, color:0x3f8f22, leaf:0x62a52c, shape:'melon'    },

  // ---- perennials: the plant itself is never harvested, only its fruit ----
  // growSec = time to reach maturity and bear the first crop.
  // regrowSec = time to grow each crop after that. They hold their plot forever.
  grapevine:  { name:'Grape Vine',   emoji:'🍇', cost:900,    sell:620,    growSec:200, regrowSec:70,  perennial:true, scale:1.15, color:0x8a4fd6, leaf:0x4c9a2a, shape:'grapevine', bush:false },
  appletree:  { name:'Apple Tree',   emoji:'🍎', cost:12000,  sell:8200,   growSec:300, regrowSec:110, perennial:true, scale:1.10, color:0xe33b34, leaf:0x3f8f22, shape:'fruittree', bush:false },
  peachtree:  { name:'Peach Tree',   emoji:'🍑', cost:22000,  sell:15000,  growSec:310, regrowSec:115, perennial:true, scale:1.10, color:0xf7a072, leaf:0x4c9a2a, shape:'fruittree', bush:false },
  cherrytree: { name:'Cherry Tree',  emoji:'🍒', cost:34000,  sell:24000,  growSec:320, regrowSec:120, perennial:true, scale:1.10, color:0xd42a4c, leaf:0x4c9a2a, shape:'fruittree', bush:false },
  chestnut:   { name:'Chestnut Tree',emoji:'🌰', cost:48000,  sell:34000,  growSec:330, regrowSec:125, perennial:true, scale:1.15, color:0x8a5a2a, leaf:0x3f8f22, shape:'fruittree', bush:false },
  orangetree: { name:'Orange Tree',  emoji:'🍊', cost:60000,  sell:42000,  growSec:340, regrowSec:130, perennial:true, scale:1.15, color:0xf59120, leaf:0x357a1e, shape:'fruittree', bush:false },
  olivetree:  { name:'Olive Tree',   emoji:'🫒', cost:75000,  sell:52000,  growSec:345, regrowSec:132, perennial:true, scale:1.15, color:0x7a8f3a, leaf:0x5a7a4a, shape:'fruittree', bush:false },
  lemontree:  { name:'Lemon Tree',   emoji:'🍋', cost:95000,  sell:67000,  growSec:350, regrowSec:135, perennial:true, scale:1.15, color:0xf5e04a, leaf:0x4c9a2a, shape:'fruittree', bush:false },
  coconut:    { name:'Coconut Palm', emoji:'🥥', cost:150000, sell:105000, growSec:380, regrowSec:145, perennial:true, scale:1.20, color:0x8a5a34, leaf:0x4c9a2a, shape:'palm',      bush:false },
  bananapalm: { name:'Banana Palm',  emoji:'🍌', cost:210000, sell:148000, growSec:385, regrowSec:148, perennial:true, scale:1.20, color:0xf5d14a, leaf:0x4c9a2a, shape:'palm',      bush:false },
  mangotree:  { name:'Mango Tree',   emoji:'🥭', cost:400000, sell:280000, growSec:400, regrowSec:150, perennial:true, scale:1.20, color:0xf07a1e, leaf:0x357a1e, shape:'fruittree', bush:false },
  avocadotree:{ name:'Avocado Tree', emoji:'🥑', cost:600000, sell:420000, growSec:410, regrowSec:155, perennial:true, scale:1.20, color:0x4a6b2a, leaf:0x3f8f22, shape:'fruittree', bush:false },
  peartree:   { name:'Pear Tree',    emoji:'🍐', cost:900000, sell:640000, growSec:420, regrowSec:160, perennial:true, scale:1.20, color:0xc3d84a, leaf:0x4c9a2a, shape:'fruittree', bush:false },
  greenapple: { name:'Green Apple Tree', emoji:'🍏', cost:1600000, sell:1120000, growSec:430, regrowSec:165, perennial:true, scale:1.20, color:0x8fd14f, leaf:0x3f8f22, shape:'fruittree', bush:false },

  // ---- magic tree stock: never in the seed shop, bought with coins at the tree ----
  // Magic stock is deliberately dear — roughly 2.8x a step, and far beyond what
  // the seed shop asks at the same level. These are investments, not impulse buys.
  cactus:      { name:'Star Cactus',   emoji:'🌵', cost:2000,     sell:5200,     growSec:150, scale:1.05, color:0x36a35a, leaf:0x2a8047, shape:'cactus',     rare:true, bush:false },
  moonbloom:   { name:'Moonbloom',     emoji:'🌸', cost:5600,     sell:14600,    growSec:185, scale:1.10, color:0x9ecbff, leaf:0x4a7fb5, shape:'moonflower', rare:true, bush:false },
  glowcap:     { name:'Glow Cap',      emoji:'🍄', cost:15600,    sell:40000,    growSec:200, scale:1.10, color:0xb46bff, leaf:0x8a3ddb, shape:'shroom',     rare:true, bush:false },
  chard:       { name:'Rainbow Chard', emoji:'🌈', cost:43000,    sell:112000,   growSec:240, scale:1.15, color:0xff6b8a, leaf:0x3f8f22, shape:'chard',      rare:true, bush:false },
  starfruit:   { name:'Star Fruit',    emoji:'⭐', cost:120000,   sell:310000,   growSec:260, scale:1.10, color:0xffd93d, leaf:0x5da032, shape:'star',       rare:true, bush:false },
  emberpepper: { name:'Ember Pepper',  emoji:'🌶️', cost:330000,   sell:860000,   growSec:290, scale:1.05, color:0xff4520, leaf:0x3f8f22, shape:'pepper',     rare:true },
  crystalbloom:{ name:'Crystal Bloom', emoji:'💎', cost:920000,   sell:2400000,  growSec:330, scale:1.15, color:0x7fe8ff, leaf:0x4a9fb5, shape:'crystal',    rare:true, bush:false },
  voidgrape:   { name:'Void Grape',    emoji:'🍇', cost:2600000,  sell:6800000,  growSec:380, scale:1.15, color:0x8a3ddb, leaf:0x3f6b22, shape:'grapes',     rare:true, bush:false },
  lotus:       { name:'Sun Lotus',     emoji:'🪷', cost:7200000,  sell:18700000, growSec:400, scale:1.15, color:0xff9ec4, leaf:0x2f8f5a, shape:'lotus',      rare:true, bush:false },
  frostlily:   { name:'Frost Lily',    emoji:'❄️', cost:20000000, sell:52000000, growSec:430, scale:1.10, color:0xbfeaff, leaf:0x6aa6c9, shape:'frostlily',  rare:true, bush:false },
  worldtree:   { name:'World Tree',    emoji:'🌳', cost:56000000, sell:40000000, growSec:420, regrowSec:160, perennial:true,
                 scale:1.25, color:0xffd166, leaf:0x2fa36b, shape:'worldtree', rare:true, bush:false },
};

// ---------------------------------------------------------------------------
// Mythic tiers: the Super Magic Tree (100 plants) and the Enchanted Realm (20).
//
// Hand-authoring 120 crops would be 120 near-duplicate blocks, so they're
// generated instead. Each one is deterministic from its index: the hue walks the
// colour wheel by the golden angle so no two neighbours look alike, and shape /
// emoji / name parts advance on co-prime strides so the combinations don't fall
// into a visible pattern. Every one of them glows.
// ---------------------------------------------------------------------------
const MYTH_SHAPES = ['cactus','shroom','moonflower','chard','star','pepper','crystal','grapes',
                     'lotus','frostlily','berry','cluster','gourd','tropic','melon','bulb',
                     'leafy','flower','vine','teardrop'];
const MYTH_PREFIX = ['Astral','Ember','Frost','Void','Solar','Lunar','Storm','Dusk','Dawn','Prism',
                     'Shadow','Radiant','Thorn','Mist','Coral','Ivory','Obsidian','Verdant','Crimson','Azure'];
const MYTH_SUFFIX = ['bloom','thorn','berry','lotus','fern','shade','vine','root','petal','husk'];
const MYTH_EMOJI  = ['🌺','🪻','🌼','🍀','🌿','🪴','🍁','🌾','🪸','🫧',
                     '💠','🔆','🌟','✴️','🩷','💜','🧿','🔮','⚗️','🌈'];
const REALM_NAMES = ['Aetherbloom','Chronoleaf','Dreamthistle','Eclipse Rose','Fatevine','Godsbane',
                     'Halofruit','Infinity Fig','Judgement Ivy','Karmaflower','Leyline Lily','Mirrorbud',
                     'Nebula Nut','Oracle Orchid','Paradox Pod','Quantum Quince','Riftberry','Starforge Seed',
                     'Timeless Thorn','Wyrmroot'];
const REALM_EMOJI = ['🌌','⏳','🪷','🌑','🍇','☠️','😇','🫒','🌿','🪻',
                     '🔷','🪞','🥜','🌸','🧬','🍐','🌋','⭐','🥀','🐉'];

/** hex colour from HSL — keeps the generated palette even and predictable. */
function hslHex(h, s, l){
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
}

const roundNice = (n) => {
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 2);
  return Math.round(n / mag) * mag;
};

function generateTier({ prefix, count, baseCost, costMult, margin, growFrom, growTo, name, emoji, tier }){
  const out = {};
  for (let i = 0; i < count; i++){
    const hue = (i * 137.508) % 360;                     // golden angle
    const cost = roundNice(baseCost * Math.pow(costMult, i));
    out[`${prefix}${i + 1}`] = {
      name: name(i),
      emoji: emoji(i),
      cost,
      sell: roundNice(cost * margin),
      growSec: Math.round(growFrom + (growTo - growFrom) * (i / Math.max(1, count - 1))),
      scale: 1.05 + (i % 5) * 0.06,
      color: hslHex(hue, 0.72, 0.60),
      leaf:  hslHex((hue + 150) % 360, 0.45, 0.38),
      shape: MYTH_SHAPES[(i * 7) % MYTH_SHAPES.length],  // stride 7 is co-prime with 20
      rare: true, glow: true, tier,
      bush: false,
    };
  }
  return out;
}

// 100 plants, 150M -> ~1.9T, each ~1.10x the last — starting above the World Tree.
export const SUPER_CROPS = generateTier({
  prefix:'myth', count:100, baseCost:150_000_000, costMult:1.10, margin:2.6,
  growFrom:240, growTo:420, tier:'super',
  name: (i) => { const t = MYTH_SUFFIX[Math.floor(i / 20) % 10];
                 return `${MYTH_PREFIX[i % 20]} ${t[0].toUpperCase()}${t.slice(1)}`; },
  emoji:(i) => MYTH_EMOJI[(i * 3) % MYTH_EMOJI.length],
});

// 20 plants beyond even those, 5T -> ~740T, each ~1.30x the last.
export const REALM_CROPS = generateTier({
  prefix:'realm', count:20, baseCost:5_000_000_000_000, costMult:1.30, margin:2.7,
  growFrom:420, growTo:600, tier:'realm',
  name: (i) => REALM_NAMES[i],
  emoji:(i) => REALM_EMOJI[i],
});

Object.assign(CROPS, SUPER_CROPS, REALM_CROPS);

const DRAGON_NAMES = ['Cinderseed','Wyrmscale Fig','Hoardberry','Emberhide Gourd','Drakebloom',
                      'Scaleroot','Kindlethorn','Molten Plum','Ashcrown','Firevine',
                      'Gildscale Pear','Basilisk Bud','Sunwyrm Lotus','Charfruit','Glimmerhoard',
                      'Nightwing Nut','Magmapod','Wyrmheart','Dragonfire Bloom','Everflame',
                      'Tyrant Bloom','Skyserpent Fig','Worldflame','Elderwyrm Seed','Ouroboros Fruit'];
const DRAGON_EMOJI = ['🔥','🐲','💰','🎃','🌺','🫚','🌵','🍑','👑','🍇',
                      '🍐','🌱','🪷','🖤','✨','🌰','🌋','❤️‍🔥','🏵️','🕯️',
                      '👹','🐍','🌏','🥚','♾️'];

// 25 hoard-grade plants, 4Q -> ~19D, each 6x the last. This is the tier the
// bigger suffixes exist for.
export const DRAGON_CROPS = generateTier({
  prefix:'drake', count:25, baseCost:4e15, costMult:6, margin:2.8,
  growFrom:600, growTo:900, tier:'dragon',
  name: (i) => DRAGON_NAMES[i],
  emoji:(i) => DRAGON_EMOJI[i],
});
Object.assign(CROPS, DRAGON_CROPS);

export const DRAGON_UNLOCK = 17;  // level needed to reach the Dragon Cave

const MANSION_ROOMS = ['Parlour','Library','Ballroom','Conservatory','Cellar','Attic',
                       'Gallery','Solarium','Chapel','Vault','Study','Nursery'];
const MANSION_PLANTS = ['Fern','Rose','Ivy','Orchid','Palm','Lily'];
const MANSION_EMOJI  = ['🪴','🌹','🌿','🪻','🎍','🏵️','🕯️','🖼️','🗝️','🪞','📚','🛋️'];

// 60 house plants — the widest catalogue in the game. 5e34 up to ~5.6Spd,
// each ~2.2x the last.
export const MANSION_CROPS = generateTier({
  prefix:'manor', count:60, baseCost:5e34, costMult:2.2, margin:2.7,
  growFrom:900, growTo:1500, tier:'mansion',
  name: (i) => `${MANSION_ROOMS[i % 12]} ${MANSION_PLANTS[Math.floor(i / 12) % 6]}`,
  emoji:(i) => MANSION_EMOJI[(i * 5) % MANSION_EMOJI.length],
});
Object.assign(CROPS, MANSION_CROPS);

const VOID_NAMES = ['Null Seed','Event Horizon','Singularity Fig','Zero Point Lotus',
                    'Entropy Vine','Last Light','Void Anemone','Omega Fruit',
                    'Absolute Root','Endless Bloom','Origin Seed','Infinity Flower'];
const VOID_EMOJI = ['⚫','🕳️','🌑','🪷','🍇','💫','🪸','🔆','🫧','🌀','🥚','♾️'];

// 12 impossibilities. 2e55 up to ~980Nd, each 5x the last. Nothing costs more.
export const VOID_CROPS = generateTier({
  prefix:'void', count:12, baseCost:2e55, costMult:5, margin:3.0,
  growFrom:1500, growTo:2400, tier:'void',
  name: (i) => VOID_NAMES[i],
  emoji:(i) => VOID_EMOJI[i],
});
Object.assign(CROPS, VOID_CROPS);

export const MANSION_UNLOCK = 21;
export const VOID_UNLOCK    = 24;

export const SUPER_UNLOCK = 12;   // level needed to reach the Super Magic Tree
export const REALM_UNLOCK = 15;   // level needed to enter the Enchanted Realm
export const SUPER_PAGE   = 20;   // items per tab in the Super Magic Tree

// ---------------------------------------------------------------------------
// Charms: permanent, one of each. Every field below is a real hook, not
// flavour text — see the aggregation helpers at the top of main.js.
//
//   boost      growth speed              value      multiplier on every sale
//   luck       double-harvest chance     water      seeds plant pre-watered
//   seedSave   chance a planting keeps its seed
//   dealOff    extra discount at the three markets
//   plotOff    discount on soil plots    digBack    extra shovel refund
//   regrow     perennials re-fruit faster
//   thirstEase speed an un-watered crop keeps (replaces the 35% crawl)
//   treeSpeed  your own tree restocks faster
//   treeBatch  extra seeds per restock
// ---------------------------------------------------------------------------
export const CHARMS = {
  dew:         { name:'Morning Dew',    emoji:'🌫️', cost:1200,   unlock:2,  thirstEase:0.70,
                 desc:'Thirsty crops keep 70% speed' },
  pouch:       { name:'Seed Pouch',     emoji:'👝', cost:2000,   unlock:3,  seedSave:0.10,
                 desc:'1 in 10 plantings keeps its seed' },
  wateringcan: { name:'Golden Can',     emoji:'🪣', cost:3000,   unlock:4,  water:true,
                 desc:'Seeds plant themselves already watered' },
  sickle:      { name:'Keen Sickle',    emoji:'🌾', cost:5000,   unlock:4,  value:0.10,
                 desc:'+10% on every sale' },
  mulch:       { name:'Mulch Blanket',  emoji:'🍂', cost:7000,   unlock:5,  thirstEase:0.85,
                 desc:'Thirsty crops keep 85% speed' },
  haggler:     { name:"Haggler's Badge",emoji:'🤝', cost:9000,   unlock:5,  dealOff:0.10,
                 desc:'+10% off at every market' },
  soil:        { name:'Enchanted Soil', emoji:'🌱', cost:12000,  unlock:6,  boost:0.30,
                 desc:'+30% growth speed' },
  spade:       { name:'Sturdy Spade',   emoji:'⛏️', cost:15000,  unlock:5,  digBack:0.25,
                 desc:'Digging refunds 75% instead of 50%' },
  birdscarer:  { name:'Bird Scarer',    emoji:'🐦', cost:22000,  unlock:6,  value:0.15,
                 desc:'+15% on every sale' },
  wheelbarrow: { name:'Wheelbarrow',    emoji:'🛒', cost:26000,  unlock:6,  seedSave:0.15,
                 desc:'+15% chance a planting keeps its seed' },
  compost:     { name:'Compost Heap',   emoji:'🪵', cost:30000,  unlock:6,  boost:0.20,
                 desc:'+20% growth speed' },
  luck:        { name:'Lucky Charm',    emoji:'🍀', cost:45000,  unlock:7,  luck:0.25,
                 desc:'1 in 4 harvests pays double' },
  raincloud:   { name:'Rain Cloud',     emoji:'🌧️', cost:60000,  unlock:7,  regrow:0.25,
                 desc:'Trees and vines re-fruit 25% faster' },
  beacon:      { name:'Night Beacon',   emoji:'🕯️', cost:90000,  unlock:7,  luck:0.08,
                 desc:'+8% chance of a double harvest' },
  deed:        { name:'Land Deed',      emoji:'📜', cost:150000, unlock:8,  plotOff:0.20,
                 desc:'Soil plots cost 20% less' },
  suncrystal:  { name:'Sun Crystal',    emoji:'☀️', cost:160000, unlock:9,  boost:0.50,
                 desc:'+50% growth speed' },
  basket:      { name:'Woven Basket',   emoji:'🧺', cost:220000, unlock:8,  value:0.25,
                 desc:'+25% on every sale' },
  orchardbell: { name:'Orchard Bell',   emoji:'🔔', cost:320000, unlock:9,  regrow:0.30,
                 desc:'Trees and vines re-fruit 30% faster' },
  sandtimer:   { name:'Sand Timer',     emoji:'⏱️', cost:400000, unlock:9,  treeSpeed:0.25,
                 desc:'Your tree restocks 25% faster' },
  backhoe:     { name:'Golden Backhoe', emoji:'⚒️', cost:520000, unlock:10, digBack:0.30,
                 desc:'Digging refunds a further 30%' },
  prism:       { name:'Rainbow Prism',  emoji:'🔮', cost:600000, unlock:13, boost:0.75,
                 desc:'+75% growth speed' },
  cornucopia:  { name:'Cornucopia',     emoji:'🍯', cost:900000,  unlock:10, treeBatch:2,
                 desc:'Your tree gives 2 extra seeds a time' },
  greenthumb:  { name:'Green Thumb',    emoji:'🫱', cost:1500000, unlock:10, seedSave:0.20,
                 desc:'1 in 5 plantings keeps its seed' },
  gildedglass: { name:'Gilded Hourglass',emoji:'⌛', cost:2500000, unlock:11, treeSpeed:0.40,
                 desc:'Your tree restocks a further 40% faster' },
  mooncalendar:{ name:'Moon Calendar',  emoji:'🌙', cost:3000000, unlock:11, regrow:0.40,
                 desc:'Trees and vines re-fruit 40% faster' },
  harvesthorn: { name:'Harvest Horn',   emoji:'📯', cost:8000000, unlock:12, treeBatch:3,
                 desc:'Your tree gives 3 more seeds a time' },
  timewarp:    { name:'Time Warp',      emoji:'⏳', cost:4000000, unlock:15, boost:1.50,
                 desc:'+150% growth speed' },
  goldscales:  { name:'Golden Scales',  emoji:'⚖️', cost:6000000, unlock:11, value:0.40,
                 desc:'+40% on every sale' },
  clover:      { name:'Four-Leaf Clover',emoji:'☘️',cost:12000000, unlock:12, luck:0.12,
                 desc:'+12% chance of a double harvest' },
  deepspring:  { name:'Deep Spring',    emoji:'💧', cost:25000000, unlock:12, thirstEase:1.0,
                 desc:'Thirst never slows a crop again' },
  estatemap:   { name:'Estate Map',     emoji:'🗺️', cost:35000000, unlock:13, plotOff:0.25,
                 desc:'Soil plots cost a further 25% less' },
  ledger:      { name:"Merchant's Ledger",emoji:'📒',cost:60000000, unlock:13, dealOff:0.15,
                 desc:'+15% off at every market' },
  starlantern: { name:'Star Lantern',   emoji:'🏮', cost:200000000, unlock:14, boost:1.0, luck:0.10,
                 desc:'+100% growth, +10% double harvest' },
  granddeed:   { name:'Grand Deed',     emoji:'🏛️', cost:150000000, unlock:13, plotOff:0.30,
                 desc:'Soil plots cost 30% less' },

  // ---- flagship charms, each sold at its namesake ----
  supercharm:  { name:'Super Sapling Charm', emoji:'🌟', cost:3e9,  unlock:12, at:'super',
                 boost:1.0, value:0.5,
                 desc:'+100% growth, +50% on sales' },
  realmsigil:  { name:'Realm Sigil',    emoji:'🌌', cost:2e11, unlock:15, at:'realm',
                 boost:1.5, value:1.0, luck:0.10,
                 desc:'+150% growth, +100% sales, +10% double harvest' },
  mansionkey:  { name:'Mansion Key',    emoji:'🗝️', cost:8e35, unlock:21, at:'mansion',
                 boost:5.0, value:4.0, luck:0.20, treeBatch:3,
                 desc:'+500% growth, +400% sales, +20% luck, +3 tree gifts' },
  voidshard:   { name:'Void Shard',     emoji:'♾️', cost:4e56, unlock:24, at:'void',
                 boost:10.0, value:9.0, luck:0.25, seedSave:0.35, regrow:1.0,
                 desc:'+1000% growth, +900% sales, +25% luck, keeps 1 seed in 3' },
  dragonheart: { name:'Dragon Heart',   emoji:'🐲', cost:5e16, unlock:17, at:'dragon',
                 boost:3.0, value:2.0, luck:0.15, seedSave:0.25,
                 desc:'+300% growth, +200% sales, +15% luck, keeps 1 seed in 4' },
};

// Ceilings so stacked charms can never reach a degenerate 100%.
export const CAP_DEAL_OFF  = 0.75;
export const CAP_PLOT_OFF  = 0.60;
export const CAP_SEED_SAVE = 0.75;
export const CAP_DIG_BACK  = 0.90;
export const CAP_LUCK      = 0.90;

// Scaled alongside the crops, or they'd be pocket change by the second harvest.
// Animals have distinct qualities, not just speed:
//   boost — growth rate      value — sale price      luck — double-harvest chance
export const ANIMALS = {
  rabbit:  { name:'Rabbit',    emoji:'🐇', cost:150,      max:4, boost:0.06, desc:'+6% growth speed' },
  hedgehog:{ name:'Hedgehog',  emoji:'🦔', cost:250,      max:4, boost:0.08, desc:'+8% growth speed' },
  chicken: { name:'Chicken',   emoji:'🐔', cost:400,      max:4, boost:0.12, desc:'+12% growth speed' },
  duck:    { name:'Duck',      emoji:'🦆', cost:700,      max:4, value:0.05, desc:'+5% on every sale' },
  beehive: { name:'Bee Hive',  emoji:'🐝', cost:1200,     max:4, value:0.08, desc:'+8% on every sale' },
  pig:     { name:'Pig',       emoji:'🐷', cost:1600,     max:3, value:0.10, desc:'+10% on every sale' },
  goat:    { name:'Goat',      emoji:'🐐', cost:2200,     max:3, boost:0.18, desc:'+18% growth speed' },
  cat:     { name:'Cat',       emoji:'🐈', cost:4500,     max:2, luck:0.03,  desc:'+3% chance of a double harvest' },
  donkey:  { name:'Donkey',    emoji:'🫏', cost:2500,     max:2, boost:0.25, desc:'+25% growth speed' },
  squirrel:{ name:'Squirrel',  emoji:'🐿️', cost:6000,     max:2, luck:0.04,  desc:'+4% chance of a double harvest' },
  sheepdog:{ name:'Sheepdog',  emoji:'🐕', cost:9000,     max:3, luck:0.05,  desc:'+5% chance of a double harvest' },
  sheep:   { name:'Sheep',     emoji:'🐑', cost:11000,    max:3, boost:0.30, desc:'+30% growth speed' },
  cow:     { name:'Cow',       emoji:'🐄', cost:14000,    max:2, boost:0.45, desc:'+45% growth speed' },
  horse:   { name:'Horse',     emoji:'🐎', cost:22000,    max:2, boost:0.55, desc:'+55% growth speed' },
  owl:     { name:'Owl',       emoji:'🦉', cost:85000,    max:2, luck:0.06, value:0.12,
             desc:'+12% on sales, +6% double harvest' },
  llama:   { name:'Llama',     emoji:'🦙', cost:38000,    max:2, value:0.20, desc:'+20% on every sale' },
  fox:     { name:'Fox',       emoji:'🦊', cost:120000,   max:2, boost:0.20, luck:0.07,
             desc:'+20% growth, +7% double harvest' },
  peacock: { name:'Peacock',   emoji:'🦚', cost:260000,   max:2, value:0.35, luck:0.04,
             desc:'+35% on sales, +4% double harvest' },
  phoenix: { name:'Phoenix',   emoji:'🐦‍🔥', cost:1400000, max:1, unlock:12, boost:0.45, value:0.45, luck:0.06,
             desc:'+45% growth, +45% on sales, +6% double harvest' },
  unicorn: { name:'Unicorn',   emoji:'🦄', cost:9000000, max:1, unlock:13, boost:0.6, value:0.6, luck:0.08,
             desc:'+60% growth, +60% on sales, +8% double harvest' },
  dragon:  { name:'Dragon',    emoji:'🐉', cost:900000000, max:1, unlock:17, boost:1.0, value:0.5, luck:0.1,
             desc:'+100% growth, +50% on sales, +10% double harvest' },
};

export const DECOR = {
  scare:    { name:'Scarecrow',     emoji:'🧑‍🌾', cost:800,      max:1 },
  toadstool:{ name:'Toadstool Ring',emoji:'🍄', cost:1400,      max:1 },
  bench:    { name:'Garden Bench',  emoji:'🪑', cost:1800,      max:1 },
  lantern:  { name:'Lanterns',      emoji:'🏮', cost:2600,      max:1 },
  birdbath: { name:'Bird Bath',     emoji:'🐦', cost:3800,      max:1 },
  pond:     { name:'Pond',          emoji:'⛲', cost:4500,      max:1 },
  sundial:  { name:'Sundial',       emoji:'🕰️', cost:9000,      max:1 },
  parasol:  { name:'Parasol & Table',emoji:'⛱️', cost:14000,    max:1 },
  tractor:  { name:'Tractor',       emoji:'🚜', cost:20000,     max:1 },
  statue:   { name:'Stone Statue',  emoji:'🗿', cost:65000,     max:1 },
  firepit:  { name:'Fire Pit',      emoji:'🔥', cost:90000,     max:1 },
  marquee:  { name:'Marquee',       emoji:'🎪', cost:240000,    max:1 },
  greenhouse:{name:'Greenhouse',    emoji:'🏡', cost:350000,    max:1 },
  fountain: { name:'Grand Fountain',emoji:'⛲', cost:1200000,   max:1 },
  windmill: { name:'Windmill',      emoji:'🌀', cost:3000000,   max:1 },
};

// Which crops the seed shop stocks at each level.
export const SHOP_UNLOCKS = {
  onion:1, carrot:1, garlic:2, lettuce:2, beans:2, peas:2, potato:3, strawberry:3, ginger:3,
  blueberry:4, tomato:4, wheat:4, mushroom:4, corn:5, bellpepper:5, broccoli:6, sunflower:6,
  sweetpotato:6, pumpkin:7, bamboo:7, kiwi:7, cucumber:8, aubergine:8, pineapple:9, honeydew:9,
  watermelon:10,
  // perennials
  grapevine:6, appletree:9, peachtree:10, cherrytree:11, chestnut:11, orangetree:12,
  olivetree:12, lemontree:12, coconut:13, bananapalm:13, mangotree:14, avocadotree:15,
  peartree:15, greenapple:16,
};

// Cumulative lifetime earnings needed for each level. Each step is ~2.6x the
// last, so levels keep pace with how fast the prices climb. Levels 12-15 are
// the long game: the Orange Tree, World Tree and the two best charms live up there.
export const LEVEL_STEPS = [
  0, 40, 120, 340, 900, 2400, 6500, 17000, 45000, 120000,
  320000, 850000, 2200000, 5800000, 15000000,
  40000000, 105000000, 280000000, 750000000, 2000000000,
  5200000000, 13500000000, 35000000000, 91000000000, 240000000000, 620000000000,
];

// One-off tools from the carpenter. `bulk` tools each add a step to the ⚡ button,
// which is what makes a 49-plot garden manageable by hand.
export const TOOLS = {
  shovel:    { name:'Shovel',         emoji:'🪏', cost:2500,    unlock:4,
               desc:'Dig up a plant you no longer want' },
  sprinkler: { name:'Sprinkler',      emoji:'🚿', cost:40000,   unlock:6,  bulk:'water',
               desc:'Water every thirsty plot at once' },
  basket:    { name:'Harvest Basket', emoji:'🧺', cost:180000,  unlock:8,  bulk:'harvest',
               desc:'Harvest every ripe plot at once' },
  drill:     { name:'Seed Drill',     emoji:'🌾', cost:750000,  unlock:10, bulk:'plant',
               desc:'Sow the selected seed in every empty plot' },
};
export const SHOVEL = TOOLS.shovel;
export const DIG_REFUND = 0.5;   // fraction of the seed price handed back

// ---------------- stock ----------------
// Shops occasionally run out of things. Like the market deal, availability is
// derived from the clock rather than stored, so it rotates on its own, survives
// a reload, and keeps turning over while you're away.
export const STOCK_ROTATE_SEC = 150;
export const STOCK_OUT_RATE   = 0.25;   // roughly a quarter of a shelf at a time

/** murmur3 finalizer — mixes high bits down so `% n` isn't reading raw low bits. */
export function hash32(n){
  let h = n | 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** FNV-1a, so an item's id maps to a stable number. */
function hashId(s){
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export const stockBucket = (now = Date.now()) => Math.floor(now / (STOCK_ROTATE_SEC * 1000));
export const stockSecsLeft = (now = Date.now()) =>
  Math.ceil((STOCK_ROTATE_SEC * 1000 - (now % (STOCK_ROTATE_SEC * 1000))) / 1000);

/** Is this item off the shelf in the current window? Pure function of id + clock. */
export function isOutOfStock(id, bucket = stockBucket()){
  const h = hash32(hashId(id) ^ Math.imul(bucket + 1, 0x9e3779b1));
  return (h % 1000) < STOCK_OUT_RATE * 1000;
}

// ---- soil plots ----
// The bed is 7x7 — 49 plots. You start with the middle 3x3 and buy the other 40
// outward at the carpenter, each costing ~1.75x the one before.
export const GRID = 7;
export const PLOT_MAX = GRID * GRID;
export const PLOT_START = 9;
const PLOT_BASE_COST = 2000;
const PLOT_COST_MULT = 1.75;

/** Cost of unlocking the nth plot (n = how many you already own). */
export function plotCost(owned){
  const raw = PLOT_BASE_COST * Math.pow(PLOT_COST_MULT, owned - PLOT_START);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / mag) * mag;
}

/**
 * Plot indices in the order they unlock: the centre 3x3 first, then outward in
 * rings, so the garden grows evenly rather than filling one edge at a time.
 */
export const PLOT_ORDER = (() => {
  const mid = (GRID - 1) / 2;
  return Array.from({ length: PLOT_MAX }, (_, i) => i).sort((a, b) => {
    const ra = Math.max(Math.abs(Math.floor(a / GRID) - mid), Math.abs(a % GRID - mid));
    const rb = Math.max(Math.abs(Math.floor(b / GRID) - mid), Math.abs(b % GRID - mid));
    return ra - rb || a - b;
  });
})();

export const WATER_BOOST = 2.0;   // growth multiplier once a crop has been watered
export const THIRST_AT   = 0.40;  // crop becomes thirsty at 40% grown

// Market: one seed type is discounted at a time, rotating on the clock.
// The markets don't rotate a single deal any more — the whole shelf is half off,
// all the time. Charms stack on top, up to CAP_DEAL_OFF.
export const MARKET_DISCOUNT   = 0.50;

// ---- your own magic tree ----
// A one-off purchase from the Magic Tree. Once planted in your garden it stocks
// itself with free seeds on a timer, and you collect whatever has piled up.
export const OWN_TREE = {
  name:'Magic Sapling', emoji:'🌳', cost:1000000, unlock:10,
  desc:'Your own magic tree — free seeds every 2 minutes',
};
export const OWN_TREE_RESTOCK_SEC = 120;
export const OWN_TREE_MIN_BATCH   = 2;    // seeds per restock
export const OWN_TREE_MAX_BATCH   = 4;
export const OWN_TREE_MAX_ITEMS   = 14;   // stock stops piling up past this

// Magic tree stock unlocks with level, same as the seed shop.
export const MAGIC_UNLOCKS = {
  cactus:3, moonbloom:4, glowcap:5, chard:6,
  starfruit:7, emberpepper:8, crystalbloom:9, voidgrape:10,
  lotus:11, frostlily:12,
  worldtree:14,   // the long game
};

// ---- motion styles ----
// Picked in Settings. `ease` changes how growth interpolates, `bob` scales every
// idle wobble, `ambient` scales the world's background motion.
export const MOTION_STYLES = {
  smooth: { name:'Smooth', emoji:'🌊', desc:'Gentle, natural easing',      ease:'smooth', bob:1.0,  ambient:1.0  },
  bouncy: { name:'Bouncy', emoji:'🤸', desc:'Springy, cartoon overshoot',  ease:'back',   bob:2.0,  ambient:1.45 },
  calm:   { name:'Calm',   emoji:'🍃', desc:'Barely moves — easy on the eyes', ease:'linear', bob:0.0, ambient:0.25 },
};
export const DEFAULT_MOTION = 'smooth';
