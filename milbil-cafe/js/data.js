// ---------- Every number in the café ----------
//
// The menu is Blooket Café's menu: the same nine foods in the same order, with
// the same unlock and upgrade costs and the same price per serving at each of
// the five levels. Café levels are Blooket's too: four upgrades from ×1 to ×3.

// costs[0] unlocks the food at level 1; costs[n] buys level n+1.
// prices[n] is what one serving sells for at level n+1, before the café bonus.
export const FOODS = [
  { id:'toast',    name:'Toast',
    costs:[0, 300, 5250, 42500, 130000],
    prices:[2, 53, 525, 1750, 3500] },
  { id:'cereal',   name:'Cereal',
    costs:[5, 1500, 26250, 212500, 650000],
    prices:[18, 263, 2625, 8750, 17500] },
  { id:'yogurt',   name:'Yogurt',
    costs:[10, 4500, 78750, 637500, 1950000],
    prices:[53, 788, 7875, 26250, 52500] },
  { id:'combo',    name:'Breakfast Combo',
    costs:[50, 9000, 157500, 1275000, 3900000],
    prices:[105, 1575, 15750, 52500, 105000] },
  { id:'oj',       name:'Orange Juice',
    costs:[200, 15000, 262500, 2125000, 6500000],
    prices:[175, 2625, 26250, 87500, 175000] },
  { id:'milk',     name:'Milk',
    costs:[500, 22500, 393750, 3187500, 9750000],
    prices:[263, 3938, 39375, 131250, 262500] },
  { id:'waffle',   name:'Waffle',
    costs:[2000, 31500, 551250, 4462500, 13650000],
    prices:[368, 5513, 55125, 183750, 367500] },
  { id:'pancakes', name:'Pancakes',
    costs:[5000, 42000, 735000, 5950000, 18200000],
    prices:[490, 7350, 73500, 245000, 490000] },
  { id:'ftoast',   name:'French Toast',
    costs:[7500, 54000, 945000, 7650000, 23400000],
    prices:[630, 9450, 94500, 315000, 630000] },
];
export const FOOD_BY_ID = Object.fromEntries(FOODS.map(f => [f.id, f]));
export const MAX_LEVEL = 5;

// A food's plate changes colour as it levels up: white, light blue, emerald,
// violet, then gold at the top level.
export const PLATES = [
  { name:'White',      color:'#ffffff', rim:'#c9cbd6' },
  { name:'Light Blue', color:'#bfe6ff', rim:'#5fb4ec' },
  { name:'Emerald',    color:'#9ff0c5', rim:'#22b573' },
  { name:'Violet',     color:'#dcc4ff', rim:'#9b5de5' },
  { name:'Gold',       color:'#ffe58a', rim:'#e0a800' },
];

// Café levels multiply the price of everything you sell, and redecorate.
export const CAFE_LEVELS = [
  { cost:0,        mult:1,   look:'Cosy Corner' },
  { cost:2500,     mult:1.5, look:'Seaside Blue' },
  { cost:250000,   mult:2,   look:'Garden Green' },
  { cost:2500000,  mult:2.5, look:'Starlight' },
  { cost:25000000, mult:3,   look:'Solid Gold' },
];

// One right answer puts this many servings of every food on your menu.
export const RESTOCK = 5;
// A newly unlocked food comes with one restock's worth, ready to serve.
export const UNLOCK_STOCK = RESTOCK;
export const START_STOCK = { toast: 5 };

// Customers
export const SPOTS = 3;
export const SPOT_X = [18, 50, 82];            // % across the floor
export const DOOR_X = 118;                     // just off the right edge
export const WALK_MS_PER_100 = 1700;           // walking the whole width
export const ARRIVE_GAP_MS = [500, 1800];      // wait before the next one comes in
export const ORDER_KINDS = [0.5, 0.35, 0.15];  // chance of ordering 1, 2 or 3 foods
export const ORDER_QTY = [0.55, 0.3, 0.15];    // chance of wanting 1, 2 or 3 of each

// Abilities, with Blooket's names and prices. In Blooket the last few are
// aimed at other players; here they hit the other milbil cafés in town.
// Each one can be used once, until you Run It Back.
export const ABILITIES = [
  { id:'paycheck', name:'Paycheck Bonus',   cost:500,    icon:'💵',
    text:'25% gets added to your cash.' },
  { id:'crate',    name:'Supply Crate',     cost:1000,   icon:'📦',
    text:'20 more servings of every food on your menu.' },
  { id:'happy',    name:'Happy Customers',  cost:2500,   icon:'😊',
    text:'Every milbil pays double for 30 seconds.' },
  { id:'trash',    name:'Trash the Food',   cost:5000,   icon:'🗑️', target:true,
    text:'Pick a café. Its food goes in the bin, so it earns nothing for 20 seconds.' },
  { id:'taxes',    name:'TAXES!!!',         cost:7500,   icon:'🧾',
    text:'Every other café pays you 25% of its cash.' },
  { id:'inspect',  name:'Health Inspection', cost:10000, icon:'🔍', target:true,
    text:'Pick a café. It is shut for an inspection for 30 seconds.' },
  { id:'runback',  name:'Run It Back',      cost:150000, icon:'🔁',
    text:'Every ability you have used can be bought again.' },
];
export const ABILITY_BY_ID = Object.fromEntries(ABILITIES.map(a => [a.id, a]));
export const HAPPY_MS = 30000;
export const TRASH_MS = 20000;
export const INSPECT_MS = 30000;
export const CRATE_STOCK = 20;

// The other cafés in town, run by Greta's own milbils. `pace` is how hard
// they keep up with you.
export const RIVALS = [
  { id:'chomp',  name:"Chomp's Café",  art:'art/chomp.png',  pace:0.55 },
  { id:'hattie', name:"Hattie's Café", art:'art/hattie.png', pace:0.45 },
  { id:'scoop',  name:"Scoop's Café",  art:'art/scoop.png',  pace:0.35 },
];

// The milbils who come in for breakfast. Drawn ones are a Common Milbil plus
// a feature or two; the rest are Greta's own drawings and turn up now and then.
export const CUSTOMERS = [
  { id:'common',  name:'Common Milbil',  look:{ line:'#8b7bff' } },
  { id:'sprouty', name:'Sprouty',        look:{ line:'#4cbb4a', hat:'sprout' } },
  { id:'freckles',name:'Freckles',       look:{ line:'#ff8a5b', extra:'freckles' } },
  { id:'snooze',  name:'Snooze',         look:{ line:'#7aa7ff', eyes:'sleepy' } },
  { id:'giggle',  name:'Giggle',         look:{ line:'#ff6fae', eyes:'happy', mouth:'open' } },
  { id:'farmer',  name:'Farmer Milbil',  look:{ line:'#e0a02c', hat:'straw' } },
  { id:'sporty',  name:'Sporty',         look:{ line:'#e05252', hat:'cap' } },
  { id:'cosy',    name:'Cosy',           look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' } },
  { id:'bow',     name:'Bowtie',         look:{ line:'#ff5fa2', extra:'bow' } },
  { id:'brainy',  name:'Brainy',         look:{ line:'#2bb5a0', extra:'glasses' } },
  { id:'toothy',  name:'Toothy',         look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' } },
  { id:'party',   name:'Party',          look:{ line:'#ff9f1c', hat:'party', mouth:'open' } },
  { id:'blossom', name:'Blossom',        look:{ line:'#ff7eb6', hat:'flowers' } },
  { id:'scoopy',  name:'Scoopy',         look:{ line:'#ff8fc8', hold:'icecream', eyes:'happy' } },
  { id:'floaty',  name:'Floaty',         look:{ line:'#ff4d6d', hold:'balloon' } },
  { id:'starry',  name:'Starry',         look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' } },
  { id:'wizard',  name:'Wizzle',         look:{ line:'#6a5cff', hat:'wizard' } },
  { id:'royal',   name:'Royal Milbil',   look:{ line:'#e0b000', hat:'crown', extra:'cape' }, weight:0.6 },
  { id:'golden',  name:'Golden Milbil',  look:{ line:'#d99a00', fill:'#ffe27a', eyes:'sparkle' }, weight:0.6 },
  { id:'rainbow', name:'Rainbow Milbil', look:{ line:'rainbow' }, weight:0.6 },
  { id:'ghost',   name:'Boo',            look:{ line:'#9fb4ff', fill:'#eef2ff', ghost:true, eyes:'big' }, weight:0.6 },
  { id:'petal',   name:'Petal',          art:'art/petal.png', weight:0.4 },
  { id:'sunny',   name:'Sunny',          art:'art/sunny.png', weight:0.4 },
];

// You, behind the counter.
export const CHEF_LOOK = { line:'#8b7bff', hat:'chef', extra:'apron', eyes:'happy' };
