// ---------- Milbil GO — static game data ----------
//
// The shop catalogue is the 3x3 Garden one (3x3-garden-3d/js/data.js), copied
// rather than imported so this folder runs on its own. What changed on the way:
//
//   * No level locks. Anything you have the coins for, you can buy.
//   * Nothing is ever out of stock. In 3x3 Garden the Magic Tree and the Animal
//     Pen were the shelves you almost never saw full; here they always are, and
//     on the map they are nearly as common as seed shops.
//
// growSec   seconds from planting to ripe at 1x speed (watering doubles it)
// regrowSec perennials only: seconds to grow each crop of fruit after the first
// sell      what one harvested crop fetches at a Market

export const CROPS = {
  // ---- seed shop: annuals ----
  onion:      { name:'Onion',           emoji:'🧅', cost:3,     sell:9,     growSec:14  },
  carrot:     { name:'Carrot',          emoji:'🥕', cost:7,     sell:20,    growSec:22  },
  garlic:     { name:'Garlic',          emoji:'🧄', cost:12,    sell:34,    growSec:26  },
  lettuce:    { name:'Lettuce',         emoji:'🥬', cost:17,    sell:48,    growSec:32  },
  beans:      { name:'Green Beans',     emoji:'🫘', cost:26,    sell:74,    growSec:29  },
  peas:       { name:'Sugar Snap Peas', emoji:'🫛', cost:34,    sell:95,    growSec:30  },
  strawberry: { name:'Strawberry',      emoji:'🍓', cost:42,    sell:118,   growSec:45  },
  blueberry:  { name:'Blueberry',       emoji:'🫐', cost:65,    sell:185,   growSec:54  },
  potato:     { name:'Potato',          emoji:'🥔', cost:68,    sell:190,   growSec:50  },
  ginger:     { name:'Ginger',          emoji:'🫚', cost:88,    sell:245,   growSec:48  },
  tomato:     { name:'Tomato',          emoji:'🍅', cost:100,   sell:280,   growSec:62  },
  wheat:      { name:'Wheat',           emoji:'🌾', cost:130,   sell:365,   growSec:58  },
  mushroom:   { name:'Button Mushroom', emoji:'🍄‍🟫', cost:175, sell:490,   growSec:52  },
  corn:       { name:'Corn',            emoji:'🌽', cost:240,   sell:670,   growSec:75  },
  broccoli:   { name:'Broccoli',        emoji:'🥦', cost:380,   sell:1060,  growSec:86  },
  bellpepper: { name:'Bell Pepper',     emoji:'🫑', cost:390,   sell:1090,  growSec:80  },
  sweetpotato:{ name:'Sweet Potato',    emoji:'🍠', cost:480,   sell:1340,  growSec:78  },
  sunflower:  { name:'Sunflower',       emoji:'🌻', cost:580,   sell:1600,  growSec:95  },
  kiwi:       { name:'Kiwi Vine',       emoji:'🥝', cost:900,   sell:2500,  growSec:100 },
  pumpkin:    { name:'Pumpkin',         emoji:'🎃', cost:1400,  sell:3900,  growSec:120 },
  bamboo:     { name:'Bamboo',          emoji:'🎋', cost:2100,  sell:5900,  growSec:128 },
  cucumber:   { name:'Cucumber',        emoji:'🥒', cost:2200,  sell:6100,  growSec:136 },
  aubergine:  { name:'Aubergine',       emoji:'🍆', cost:3400,  sell:9400,  growSec:150 },
  pineapple:  { name:'Pineapple',       emoji:'🍍', cost:8200,  sell:22500, growSec:180 },
  honeydew:   { name:'Honeydew',        emoji:'🍈', cost:12500, sell:34000, growSec:200 },
  watermelon: { name:'Watermelon',      emoji:'🍉', cost:20000, sell:55000, growSec:250 },

  // ---- seed shop: perennials. The plant stays; you pick its fruit again and again ----
  grapevine:  { name:'Grape Vine',       emoji:'🍇', cost:900,     sell:620,     growSec:200, regrowSec:70,  perennial:true },
  appletree:  { name:'Apple Tree',       emoji:'🍎', cost:12000,   sell:8200,    growSec:300, regrowSec:110, perennial:true },
  peachtree:  { name:'Peach Tree',       emoji:'🍑', cost:22000,   sell:15000,   growSec:310, regrowSec:115, perennial:true },
  cherrytree: { name:'Cherry Tree',      emoji:'🍒', cost:34000,   sell:24000,   growSec:320, regrowSec:120, perennial:true },
  chestnut:   { name:'Chestnut Tree',    emoji:'🌰', cost:48000,   sell:34000,   growSec:330, regrowSec:125, perennial:true },
  orangetree: { name:'Orange Tree',      emoji:'🍊', cost:60000,   sell:42000,   growSec:340, regrowSec:130, perennial:true },
  olivetree:  { name:'Olive Tree',       emoji:'🫒', cost:75000,   sell:52000,   growSec:345, regrowSec:132, perennial:true },
  lemontree:  { name:'Lemon Tree',       emoji:'🍋', cost:95000,   sell:67000,   growSec:350, regrowSec:135, perennial:true },
  coconut:    { name:'Coconut Palm',     emoji:'🥥', cost:150000,  sell:105000,  growSec:380, regrowSec:145, perennial:true },
  bananapalm: { name:'Banana Palm',      emoji:'🍌', cost:210000,  sell:148000,  growSec:385, regrowSec:148, perennial:true },
  mangotree:  { name:'Mango Tree',       emoji:'🥭', cost:400000,  sell:280000,  growSec:400, regrowSec:150, perennial:true },
  avocadotree:{ name:'Avocado Tree',     emoji:'🥑', cost:600000,  sell:420000,  growSec:410, regrowSec:155, perennial:true },
  peartree:   { name:'Pear Tree',        emoji:'🍐', cost:900000,  sell:640000,  growSec:420, regrowSec:160, perennial:true },
  greenapple: { name:'Green Apple Tree', emoji:'🍏', cost:1600000, sell:1120000, growSec:430, regrowSec:165, perennial:true },

  // ---- magic tree seeds: never in the seed shop ----
  cactus:      { name:'Star Cactus',   emoji:'🌵', cost:2000,     sell:5200,     growSec:150, rare:true },
  moonbloom:   { name:'Moonbloom',     emoji:'🌸', cost:5600,     sell:14600,    growSec:185, rare:true },
  glowcap:     { name:'Glow Cap',      emoji:'🍄', cost:15600,    sell:40000,    growSec:200, rare:true },
  chard:       { name:'Rainbow Chard', emoji:'🌈', cost:43000,    sell:112000,   growSec:240, rare:true },
  starfruit:   { name:'Star Fruit',    emoji:'⭐', cost:120000,   sell:310000,   growSec:260, rare:true },
  emberpepper: { name:'Ember Pepper',  emoji:'🌶️', cost:330000,   sell:860000,   growSec:290, rare:true },
  crystalbloom:{ name:'Crystal Bloom', emoji:'💎', cost:920000,   sell:2400000,  growSec:330, rare:true },
  voidgrape:   { name:'Void Grape',    emoji:'🍇', cost:2600000,  sell:6800000,  growSec:380, rare:true },
  lotus:       { name:'Sun Lotus',     emoji:'🪷', cost:7200000,  sell:18700000, growSec:400, rare:true },
  frostlily:   { name:'Frost Lily',    emoji:'❄️', cost:20000000, sell:52000000, growSec:430, rare:true },
  worldtree:   { name:'World Tree',    emoji:'🌳', cost:56000000, sell:40000000, growSec:420, regrowSec:160, perennial:true, rare:true },
};
for (const [id, c] of Object.entries(CROPS)) c.id = id;

const byCost = (a, b) => CROPS[a].cost - CROPS[b].cost;
export const SEED_SHOP   = Object.keys(CROPS).filter(id => !CROPS[id].rare).sort(byCost);
export const MAGIC_SEEDS = Object.keys(CROPS).filter(id => CROPS[id].rare).sort(byCost);

// ---- charms: permanent, one of each, all from the Magic Tree ----
//   boost      growth speed              value      extra on every sale
//   luck       double-harvest chance     water      seeds plant already watered
//   seedSave   chance a planting keeps its seed
//   dealOff    discount at every shop    plotOff    discount on soil plots
//   digBack    extra shovel refund       regrow     perennials re-fruit faster
//   thirstEase speed a thirsty crop keeps (instead of crawling at 35%)
//   treeSpeed  your own tree restocks faster
//   treeBatch  extra seeds per restock
export const CHARMS = {
  dew:         { name:'Morning Dew',      emoji:'🌫️', cost:1200,      thirstEase:0.70, desc:'Thirsty crops keep 70% speed' },
  pouch:       { name:'Seed Pouch',       emoji:'👝', cost:2000,      seedSave:0.10,   desc:'1 in 10 plantings keeps its seed' },
  wateringcan: { name:'Golden Can',       emoji:'🪣', cost:3000,      water:true,      desc:'Seeds plant themselves already watered' },
  sickle:      { name:'Keen Sickle',      emoji:'🌾', cost:5000,      value:0.10,      desc:'+10% on every sale' },
  mulch:       { name:'Mulch Blanket',    emoji:'🍂', cost:7000,      thirstEase:0.85, desc:'Thirsty crops keep 85% speed' },
  haggler:     { name:"Haggler's Badge",  emoji:'🤝', cost:9000,      dealOff:0.10,    desc:'10% off in every shop' },
  soil:        { name:'Enchanted Soil',   emoji:'🌱', cost:12000,     boost:0.30,      desc:'+30% growth speed' },
  spade:       { name:'Sturdy Spade',     emoji:'⛏️', cost:15000,     digBack:0.25,    desc:'Digging refunds 75% instead of 50%' },
  birdscarer:  { name:'Bird Scarer',      emoji:'🐦', cost:22000,     value:0.15,      desc:'+15% on every sale' },
  wheelbarrow: { name:'Wheelbarrow',      emoji:'🛒', cost:26000,     seedSave:0.15,   desc:'+15% chance a planting keeps its seed' },
  compost:     { name:'Compost Heap',     emoji:'🪵', cost:30000,     boost:0.20,      desc:'+20% growth speed' },
  luck:        { name:'Lucky Charm',      emoji:'🍀', cost:45000,     luck:0.25,       desc:'1 in 4 harvests pays double' },
  raincloud:   { name:'Rain Cloud',       emoji:'🌧️', cost:60000,     regrow:0.25,     desc:'Trees and vines re-fruit 25% faster' },
  beacon:      { name:'Night Beacon',     emoji:'🕯️', cost:90000,     luck:0.08,       desc:'+8% chance of a double harvest' },
  deed:        { name:'Land Deed',        emoji:'📜', cost:150000,    plotOff:0.20,    desc:'Soil plots cost 20% less' },
  suncrystal:  { name:'Sun Crystal',      emoji:'☀️', cost:160000,    boost:0.50,      desc:'+50% growth speed' },
  basket:      { name:'Woven Basket',     emoji:'🧺', cost:220000,    value:0.25,      desc:'+25% on every sale' },
  orchardbell: { name:'Orchard Bell',     emoji:'🔔', cost:320000,    regrow:0.30,     desc:'Trees and vines re-fruit 30% faster' },
  sandtimer:   { name:'Sand Timer',       emoji:'⏱️', cost:400000,    treeSpeed:0.25,  desc:'Your own tree restocks 25% faster' },
  backhoe:     { name:'Golden Backhoe',   emoji:'⚒️', cost:520000,    digBack:0.30,    desc:'Digging refunds a further 30%' },
  prism:       { name:'Rainbow Prism',    emoji:'🔮', cost:600000,    boost:0.75,      desc:'+75% growth speed' },
  cornucopia:  { name:'Cornucopia',       emoji:'🍯', cost:900000,    treeBatch:2,     desc:'Your own tree gives 2 extra seeds a time' },
  greenthumb:  { name:'Green Thumb',      emoji:'🫱', cost:1500000,   seedSave:0.20,   desc:'1 in 5 plantings keeps its seed' },
  gildedglass: { name:'Gilded Hourglass', emoji:'⌛', cost:2500000,   treeSpeed:0.40,  desc:'Your own tree restocks a further 40% faster' },
  mooncalendar:{ name:'Moon Calendar',    emoji:'🌙', cost:3000000,   regrow:0.40,     desc:'Trees and vines re-fruit 40% faster' },
  timewarp:    { name:'Time Warp',        emoji:'⏳', cost:4000000,   boost:1.50,      desc:'+150% growth speed' },
  goldscales:  { name:'Golden Scales',    emoji:'⚖️', cost:6000000,   value:0.40,      desc:'+40% on every sale' },
  harvesthorn: { name:'Harvest Horn',     emoji:'📯', cost:8000000,   treeBatch:3,     desc:'Your own tree gives 3 more seeds a time' },
  clover:      { name:'Four-Leaf Clover', emoji:'☘️', cost:12000000,  luck:0.12,       desc:'+12% chance of a double harvest' },
  deepspring:  { name:'Deep Spring',      emoji:'💧', cost:25000000,  thirstEase:1.0,  desc:'Thirst never slows a crop again' },
  estatemap:   { name:'Estate Map',       emoji:'🗺️', cost:35000000,  plotOff:0.25,    desc:'Soil plots cost a further 25% less' },
  ledger:      { name:"Merchant's Ledger",emoji:'📒', cost:60000000,  dealOff:0.15,    desc:'A further 15% off in every shop' },
  granddeed:   { name:'Grand Deed',       emoji:'🏛️', cost:150000000, plotOff:0.30,    desc:'Soil plots cost 30% less' },
  starlantern: { name:'Star Lantern',     emoji:'🏮', cost:200000000, boost:1.0, luck:0.10, desc:'+100% growth, +10% double harvest' },
};

// Ceilings so stacked bonuses can never reach a degenerate 100%.
export const CAP_DEAL_OFF  = 0.75;
export const CAP_PLOT_OFF  = 0.60;
export const CAP_SEED_SAVE = 0.75;
export const CAP_DIG_BACK  = 0.90;
export const CAP_LUCK      = 0.90;

// ---- the Animal Shop. Every animal, always in stock, no level needed ----
//   boost — growth speed   value — sale price   luck — double-harvest chance
export const ANIMALS = {
  rabbit:  { name:'Rabbit',   emoji:'🐇', cost:150,       max:4, boost:0.06, desc:'+6% growth speed' },
  hedgehog:{ name:'Hedgehog', emoji:'🦔', cost:250,       max:4, boost:0.08, desc:'+8% growth speed' },
  chicken: { name:'Chicken',  emoji:'🐔', cost:400,       max:4, boost:0.12, desc:'+12% growth speed' },
  duck:    { name:'Duck',     emoji:'🦆', cost:700,       max:4, value:0.05, desc:'+5% on every sale' },
  beehive: { name:'Bee Hive', emoji:'🐝', cost:1200,      max:4, value:0.08, desc:'+8% on every sale' },
  pig:     { name:'Pig',      emoji:'🐷', cost:1600,      max:3, value:0.10, desc:'+10% on every sale' },
  goat:    { name:'Goat',     emoji:'🐐', cost:2200,      max:3, boost:0.18, desc:'+18% growth speed' },
  donkey:  { name:'Donkey',   emoji:'🫏', cost:2500,      max:2, boost:0.25, desc:'+25% growth speed' },
  cat:     { name:'Cat',      emoji:'🐈', cost:4500,      max:2, luck:0.03,  desc:'+3% chance of a double harvest' },
  squirrel:{ name:'Squirrel', emoji:'🐿️', cost:6000,      max:2, luck:0.04,  desc:'+4% chance of a double harvest' },
  sheepdog:{ name:'Sheepdog', emoji:'🐕', cost:9000,      max:3, luck:0.05,  desc:'+5% chance of a double harvest' },
  sheep:   { name:'Sheep',    emoji:'🐑', cost:11000,     max:3, boost:0.30, desc:'+30% growth speed' },
  cow:     { name:'Cow',      emoji:'🐄', cost:14000,     max:2, boost:0.45, desc:'+45% growth speed' },
  horse:   { name:'Horse',    emoji:'🐎', cost:22000,     max:2, boost:0.55, desc:'+55% growth speed' },
  llama:   { name:'Llama',    emoji:'🦙', cost:38000,     max:2, value:0.20, desc:'+20% on every sale' },
  owl:     { name:'Owl',      emoji:'🦉', cost:85000,     max:2, luck:0.06, value:0.12, desc:'+12% on sales, +6% double harvest' },
  fox:     { name:'Fox',      emoji:'🦊', cost:120000,    max:2, boost:0.20, luck:0.07, desc:'+20% growth, +7% double harvest' },
  peacock: { name:'Peacock',  emoji:'🦚', cost:260000,    max:2, value:0.35, luck:0.04, desc:'+35% on sales, +4% double harvest' },
  phoenix: { name:'Phoenix',  emoji:'🐦‍🔥', cost:1400000, max:1, boost:0.45, value:0.45, luck:0.06, desc:'+45% growth, +45% on sales, +6% double harvest' },
  unicorn: { name:'Unicorn',  emoji:'🦄', cost:9000000,   max:1, boost:0.6, value:0.6, luck:0.08, desc:'+60% growth, +60% on sales, +8% double harvest' },
  dragon:  { name:'Dragon',   emoji:'🐉', cost:900000000, max:1, boost:1.0, value:0.5, luck:0.1, desc:'+100% growth, +50% on sales, +10% double harvest' },
};

// ---- the Carpenter ----
export const DECOR = {
  scare:     { name:'Scarecrow',       emoji:'🧑‍🌾', cost:800 },
  toadstool: { name:'Toadstool Ring',  emoji:'🍄', cost:1400 },
  bench:     { name:'Garden Bench',    emoji:'🪑', cost:1800 },
  lantern:   { name:'Lanterns',        emoji:'🏮', cost:2600 },
  birdbath:  { name:'Bird Bath',       emoji:'🐦', cost:3800 },
  pond:      { name:'Pond',            emoji:'⛲', cost:4500 },
  sundial:   { name:'Sundial',         emoji:'🕰️', cost:9000 },
  parasol:   { name:'Parasol & Table', emoji:'⛱️', cost:14000 },
  tractor:   { name:'Tractor',         emoji:'🚜', cost:20000 },
  statue:    { name:'Stone Statue',    emoji:'🗿', cost:65000 },
  firepit:   { name:'Fire Pit',        emoji:'🔥', cost:90000 },
  marquee:   { name:'Marquee',         emoji:'🎪', cost:240000 },
  greenhouse:{ name:'Greenhouse',      emoji:'🏡', cost:350000 },
  fountain:  { name:'Grand Fountain',  emoji:'⛲', cost:1200000 },
  windmill:  { name:'Windmill',        emoji:'🌀', cost:3000000 },
};

// `bulk` tools each add a step to the ⚡ Tend-all button.
export const TOOLS = {
  shovel:    { name:'Shovel',         emoji:'🪏', cost:2500,   desc:'Dig up a plant you no longer want' },
  sprinkler: { name:'Sprinkler',      emoji:'🚿', cost:40000,  bulk:'water',   desc:'Water every thirsty plot at once' },
  basket:    { name:'Harvest Basket', emoji:'🧺', cost:180000, bulk:'harvest', desc:'Harvest every ripe plot at once' },
  drill:     { name:'Seed Drill',     emoji:'🌾', cost:750000, bulk:'plant',   desc:'Sow the selected seed in every empty plot' },
};
export const DIG_REFUND = 0.5;

// ---- soil plots ----
// The garden starts as a 3x3 and grows to 5x5 — 16 more plots from the Carpenter,
// each about 1.75x the one before.
export const GRID = 5;
export const PLOT_MAX = GRID * GRID;
export const PLOT_START = 9;
export function plotCost(owned){
  const raw = 2000 * Math.pow(1.75, owned - PLOT_START);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)) - 1);
  return Math.round(raw / mag) * mag;
}
/**
 * Plot indices in unlock order: the middle 3x3 first, then the outer ring,
 * swept clockwise from the top so the bed grows evenly round its edge.
 */
export const PLOT_ORDER = (() => {
  const mid = (GRID - 1) / 2;
  const ring = i => Math.max(Math.abs(Math.floor(i / GRID) - mid), Math.abs(i % GRID - mid));
  const angle = i => (Math.atan2(i % GRID - mid, mid - Math.floor(i / GRID)) + 2 * Math.PI) % (2 * Math.PI);
  return Array.from({ length: PLOT_MAX }, (_, i) => i).sort((a, b) => ring(a) - ring(b) || angle(a) - angle(b));
})();

export const WATER_BOOST = 2.0;    // growth multiplier once a crop is watered
export const THIRST_AT   = 0.40;   // a crop gets thirsty at 40% grown
export const THIRST_SPEED = 0.35;  // ...and crawls at 35% until it's watered
export const OFFLINE_CAP_MS = 8 * 3600 * 1000;

// ---- your own magic tree ----
export const OWN_TREE = {
  name:'Magic Sapling', emoji:'🌳', cost:1000000,
  desc:'Your own magic tree for the garden — free seeds every 2 minutes',
};
export const OWN_TREE_RESTOCK_SEC = 120;
export const OWN_TREE_MIN_BATCH   = 2;
export const OWN_TREE_MAX_BATCH   = 4;
export const OWN_TREE_MAX_ITEMS   = 14;

// ---------------------------------------------------------------------------
// The map
// ---------------------------------------------------------------------------

// Places you walk to. Every kind is equally common: the map is laid out in
// blocks that each hold one of every shop (see shopsNear in geo.js), so the
// Magic Tree and the Animal Shop are always as close as the Seed Shop.
export const SHOP_TYPES = {
  seed:      { name:'Seed Shop',   emoji:'🌱', color:'#3fae4a', dark:'#2a7f33', blurb:'Seeds for your garden' },
  market:    { name:'Market',      emoji:'🧺', color:'#f2a93b', dark:'#c27a12', blurb:'Sell your harvest here' },
  magic:     { name:'Magic Tree',  emoji:'✨', color:'#9b5de5', dark:'#6a35b8', blurb:'Rare seeds, charms and the Magic Sapling' },
  animal:    { name:'Animal Shop', emoji:'🐾', color:'#f06c4f', dark:'#c0442a', blurb:'Animals that help your garden grow' },
  carpenter: { name:'Carpenter',   emoji:'🔨', color:'#a8743f', dark:'#7a5025', blurb:'Soil plots, tools and decorations' },
};

// Shopkeepers, for the sign over the door. Greta's milbils run the shops.
export const KEEPERS = ['Petal', 'Chomp', 'Hattie', 'Sunny', 'Scoop', 'Pib', 'Nuzz', 'Moby', 'Plum',
  'Bobbin', 'Wix', 'Doodle', 'Crumb', 'Pocket', 'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep',
  'Sprig', 'Noodle', 'Tumble', 'Winkle', 'Puddle', 'Gus', 'Bean', 'Marzi'];

// The world is small on purpose: it should be playable in a park, a playground
// or a big back garden. Every kind of shop is within about 50 m of anywhere,
// and a few milbils are always just a short stroll away.
export const REACH_M        = 30;    // how close you must be to catch or shop
export const SHOP_CELL_M    = 34;    // one shop lot per cell this size; 3x2 cells make a block
export const SPAWN_CELL_M   = 25;    // one milbil at most per cell this size...
export const SPAWN_PERIOD_S = 300;   // ...per five-minute window
export const SPAWN_CHANCE   = 0.35;
export const SHOW_SHOPS_M   = 260;
export const SHOW_MILBILS_M = 200;

// ---------------------------------------------------------------------------
// Milbils
// ---------------------------------------------------------------------------

// catch = base chance a good throw holds them; flee = chance they run off
// after breaking free.
export const RARITY = {
  common:    { name:'Common',    color:'#8d99ae', weight:46, coins:5,   xp:100,  catch:0.85, flee:0.04 },
  uncommon:  { name:'Uncommon',  color:'#3fae4a', weight:30, coins:15,  xp:200,  catch:0.65, flee:0.08 },
  rare:      { name:'Rare',      color:'#2f80ed', weight:16, coins:40,  xp:400,  catch:0.48, flee:0.12 },
  epic:      { name:'Epic',      color:'#9b5de5', weight:6,  coins:120, xp:800,  catch:0.32, flee:0.16 },
  legendary: { name:'Legendary', color:'#f2a900', weight:2,  coins:500, xp:2000, catch:0.20, flee:0.20 },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

// A species is a common milbil plus features. `look` is what milbil.js draws;
// legendaries are Greta's own drawings instead. `perk` applies while you play
// as that milbil:
//   grow  growth speed      sell  sale price        luck   double harvest
//   reach metres of reach   catch catch chance      coins  coins from catches
//   off   shop discount     seedSave                thirst thirsty-crop speed
//   xp    extra XP
export const SPECIES = [
  { id:'common',  name:'Common Milbil', rarity:'common',
    look:{ line:'#8b7bff' },
    blurb:'Just a milbil, with every extra feature taken off.', perk:{}, perkText:'No perk — yet!' },
  { id:'sprouty', name:'Sprouty', rarity:'common',
    look:{ line:'#4cbb4a', hat:'sprout' },
    blurb:'Grew a little leaf and never looked back.', perk:{ grow:0.10 }, perkText:'+10% crop growth' },
  { id:'freckles', name:'Freckles', rarity:'common',
    look:{ line:'#ff8a5b', extra:'freckles' },
    blurb:'Counts its freckles every morning. Gets a different number every time.', perk:{ catch:0.08 }, perkText:'+8% catch chance' },
  { id:'snooze', name:'Snooze', rarity:'common',
    look:{ line:'#7aa7ff', eyes:'sleepy' },
    blurb:'Would rather be napping. Is probably napping.', perk:{ thirst:0.55 }, perkText:'Thirsty crops keep 55% speed' },
  { id:'giggle', name:'Giggle', rarity:'common',
    look:{ line:'#ff6fae', eyes:'happy', mouth:'open' },
    blurb:'Laughs at everything, especially clouds.', perk:{ coins:0.5 }, perkText:'+50% coins from catches' },

  { id:'farmer', name:'Farmer Milbil', rarity:'uncommon',
    look:{ line:'#e0a02c', hat:'straw' },
    blurb:'Knows exactly when a carrot is ready.', perk:{ sell:0.10 }, perkText:'+10% on every sale' },
  { id:'sporty', name:'Sporty', rarity:'uncommon',
    look:{ line:'#e05252', hat:'cap' },
    blurb:'Fastest legs on the field.', perk:{ reach:8 }, perkText:'Reach 8 m further' },
  { id:'cosy', name:'Cosy', rarity:'uncommon',
    look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' },
    blurb:'Wears a scarf in summer, just in case.', perk:{ seedSave:0.10 }, perkText:'1 in 10 plantings keeps its seed' },
  { id:'bow', name:'Bowtie', rarity:'uncommon',
    look:{ line:'#ff5fa2', extra:'bow' },
    blurb:'Very neat. Very proud of it.', perk:{ luck:0.05 }, perkText:'+5% double harvest' },
  { id:'brainy', name:'Brainy', rarity:'uncommon',
    look:{ line:'#2bb5a0', extra:'glasses' },
    blurb:'Read every book in the library. Twice.', perk:{ catch:0.12 }, perkText:'+12% catch chance' },
  { id:'toothy', name:'Toothy', rarity:'uncommon',
    look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' },
    blurb:'All bark, no bite. Mostly.', perk:{ coins:1.0 }, perkText:'Double coins from catches' },
  { id:'party', name:'Party', rarity:'uncommon',
    look:{ line:'#ff9f1c', hat:'party', mouth:'open' },
    blurb:'Every day is somebody\'s birthday.', perk:{ xp:0.25 }, perkText:'+25% XP' },

  { id:'blossom', name:'Blossom', rarity:'rare',
    look:{ line:'#ff7eb6', hat:'flowers' },
    blurb:'Smells faintly of strawberries.', perk:{ grow:0.15 }, perkText:'+15% crop growth' },
  { id:'scoopy', name:'Scoopy', rarity:'rare',
    look:{ line:'#ff8fc8', hold:'icecream', eyes:'happy' },
    blurb:'Has never once dropped an ice cream.', perk:{ sell:0.15 }, perkText:'+15% on every sale' },
  { id:'floaty', name:'Floaty', rarity:'rare',
    look:{ line:'#ff4d6d', hold:'balloon' },
    blurb:'Hold on tight on windy days.', perk:{ reach:12 }, perkText:'Reach 12 m further' },
  { id:'starry', name:'Starry', rarity:'rare',
    look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' },
    blurb:'Twinkles a bit when nobody is looking.', perk:{ luck:0.10 }, perkText:'+10% double harvest' },
  { id:'wizard', name:'Wizzle', rarity:'rare',
    look:{ line:'#6a5cff', hat:'wizard' },
    blurb:'Knows one spell. It turns pebbles into slightly different pebbles.', perk:{ off:0.05 }, perkText:'5% off in every shop' },

  { id:'royal', name:'Royal Milbil', rarity:'epic',
    look:{ line:'#e0b000', hat:'crown', extra:'cape' },
    blurb:'Rules a kingdom of exactly one flower bed.', perk:{ off:0.10 }, perkText:'10% off in every shop' },
  { id:'golden', name:'Golden Milbil', rarity:'epic',
    look:{ line:'#d99a00', fill:'#ffe27a', eyes:'sparkle' },
    blurb:'Shiny all the way through.', perk:{ coins:2.0, sell:0.10 }, perkText:'Triple coins from catches, +10% sales' },
  { id:'rainbow', name:'Rainbow Milbil', rarity:'epic',
    look:{ line:'rainbow' },
    blurb:'Appears after rain. Or before. Or whenever it likes.', perk:{ grow:0.25, luck:0.10 }, perkText:'+25% growth, +10% double harvest' },
  { id:'ghost', name:'Boo', rarity:'epic', night:true,
    look:{ line:'#9fb4ff', fill:'#eef2ff', ghost:true, eyes:'big' },
    blurb:'Mostly comes out at night. Easier to find after dark.', perk:{ catch:0.20, reach:5 }, perkText:'+20% catch chance, reach 5 m further' },

  // Greta's own drawings.
  { id:'petal',  name:'Petal',  rarity:'legendary', art:'art/petal.png',
    blurb:'Carries a flower everywhere and gives it to whoever looks saddest.',
    perk:{ grow:0.20, sell:0.20 }, perkText:'+20% growth, +20% on sales' },
  { id:'chomp',  name:'Chomp',  rarity:'legendary', art:'art/chomp.png',
    blurb:'Those teeth are for smiling with. Honestly.',
    perk:{ coins:3.0, catch:0.15 }, perkText:'4x coins from catches, +15% catch chance' },
  { id:'hattie', name:'Hattie', rarity:'legendary', art:'art/hattie.png',
    blurb:'Has never been seen without the hat. Possibly sleeps in it.',
    perk:{ reach:15, sell:0.15 }, perkText:'Reach 15 m further, +15% on sales' },
  { id:'sunny',  name:'Sunny',  rarity:'legendary', art:'art/sunny.png',
    blurb:'Big eyes, bigger heart, and the warmest milbil on the map.',
    perk:{ grow:0.35, thirst:0.80 }, perkText:'+35% growth, thirsty crops keep 80% speed' },
  { id:'scoop',  name:'Scoop',  rarity:'legendary', art:'art/scoop.png',
    blurb:'Runs the best ice-cream stand in any field it finds.',
    perk:{ off:0.15, luck:0.10 }, perkText:'15% off in every shop, +10% double harvest' },
];
export const SPECIES_BY_ID = Object.fromEntries(SPECIES.map(s => [s.id, s]));

// Player levels: XP needed to reach level n+1. Purely a badge — nothing is locked.
export const LEVEL_XP = (() => {
  const out = [0];
  for (let n = 1; n < 50; n++) out.push(Math.round(600 * Math.pow(n, 1.6) / 50) * 50);
  return out;
})();
export const XP_NEW_SPECIES = 500;
export const XP_HARVEST = 10;
