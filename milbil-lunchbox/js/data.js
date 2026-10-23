// ---------- Every number in the lunchbox ----------
//
// One lunchbox a day, packed for one milbil. Their family hands you the lunch
// money in the morning; you spend it at the three shops and keep whatever is
// left, so buying cheap is how you get rich. Then the milbil pays you a tip
// for a lunch packed the way they like it.

// ----------------------------------------------------------- food groups ---

export const GROUPS = [
  { id:'main',  name:'Main',  icon:'🥪' },
  { id:'fruit', name:'Fruit', icon:'🍎' },
  { id:'veg',   name:'Veg',   icon:'🥕' },
  { id:'snack', name:'Snack', icon:'🧀' },
  { id:'drink', name:'Drink', icon:'🧃' },
  { id:'treat', name:'Treat', icon:'🍪' },
];
export const GROUP = Object.fromEntries(GROUPS.map(g => [g.id, g]));

// The words milbils use when they ask for something. A food can have any
// number of these.
export const TAGS = {
  crunchy:   'crunchy',
  soft:      'soft',
  sweet:     'sweet',
  salty:     'salty',
  juicy:     'juicy',
  cold:      'cold',
  warm:      'warm',
  green:     'green',
  cheesy:    'cheesy',
  chocolatey:'chocolatey',
  nuts:      'nuts',
};

// ------------------------------------------------------------------ food ---
//
// `price` is what Billy's charges, the middle shop. Bill's and Lebelibs work
// their prices out from it. `health` is out of 5 and decides the healthy-
// lunchbox bonus: water and veg are 5, a brownie is 0.
// `kit` means you can't pack it without that bit of kit: nothing stays cold
// without an ice pack, or warm without a thermos.

export const FOODS = [
  // --- mains ---
  { id:'cheesesandwich', name:'Cheese Sandwich', group:'main', price:22, health:3, tags:['soft','cheesy'] },
  { id:'jamsandwich',    name:'Jam Sandwich',    group:'main', price:20, health:2, tags:['soft','sweet'] },
  { id:'wrap',           name:'Chicken Wrap',    group:'main', price:30, health:4, tags:['soft'] },
  { id:'pastasalad',     name:'Pasta Salad',     group:'main', price:34, health:4, tags:['cold'], kit:'icepack' },
  { id:'sushi',          name:'Sushi Rolls',     group:'main', price:55, health:5, tags:['cold','green'], kit:'icepack' },
  { id:'soup',           name:'Tomato Soup',     group:'main', price:45, health:4, tags:['warm'], kit:'thermos' },
  { id:'pizza',          name:'Pizza Slice',     group:'main', price:48, health:2, tags:['warm','cheesy'], kit:'thermos' },

  // --- fruit ---
  { id:'apple',        name:'Apple',           group:'fruit', price:12, health:5, tags:['crunchy','sweet'] },
  { id:'banana',       name:'Banana',          group:'fruit', price:11, health:5, tags:['soft','sweet'] },
  { id:'grapes',       name:'Grapes',          group:'fruit', price:18, health:5, tags:['sweet','green','juicy'] },
  { id:'tangerine',    name:'Tangerine',       group:'fruit', price:16, health:5, tags:['sweet','juicy'] },
  { id:'strawberries', name:'Strawberries',    group:'fruit', price:26, health:5, tags:['sweet','juicy'] },
  { id:'blueberries',  name:'Blueberries',     group:'fruit', price:38, health:5, tags:['sweet'] },

  // --- veg ---
  { id:'carrotsticks', name:'Carrot Sticks',   group:'veg', price:10, health:5, tags:['crunchy'] },
  { id:'cucumber',     name:'Cucumber Slices', group:'veg', price:10, health:5, tags:['crunchy','green','juicy'] },
  { id:'tomatoes',     name:'Cherry Tomatoes', group:'veg', price:15, health:5, tags:['juicy'] },
  { id:'snappeas',     name:'Snap Peas',       group:'veg', price:24, health:5, tags:['crunchy','green'] },
  { id:'sweetcorn',    name:'Sweetcorn Cup',   group:'veg', price:28, health:4, tags:['sweet'] },

  // --- snacks ---
  { id:'crackers',    name:'Crackers',     group:'snack', price:9,  health:2, tags:['crunchy','salty'] },
  { id:'cheesecubes', name:'Cheese Cubes', group:'snack', price:16, health:3, tags:['cheesy'] },
  { id:'boiledegg',   name:'Boiled Egg',   group:'snack', price:15, health:5, tags:['soft'] },
  { id:'popcorn',     name:'Popcorn',      group:'snack', price:18, health:3, tags:['crunchy','salty'] },
  { id:'pretzels',    name:'Pretzels',     group:'snack', price:19, health:2, tags:['crunchy','salty'] },
  { id:'trailmix',    name:'Trail Mix',    group:'snack', price:28, health:4, tags:['crunchy','sweet','nuts'] },

  // --- drinks ---
  { id:'water',    name:'Water Bottle',  group:'drink', price:8,  health:5, tags:[] },
  { id:'juice',    name:'Juice Box',     group:'drink', price:14, health:2, tags:['sweet','juicy'] },
  { id:'milk',     name:'Milk Carton',   group:'drink', price:16, health:4, tags:['cold'], kit:'icepack' },
  { id:'smoothie', name:'Berry Smoothie',group:'drink', price:36, health:4, tags:['sweet','cold'], kit:'icepack' },
  { id:'hotchoc',  name:'Hot Chocolate', group:'drink', price:30, health:1, tags:['warm','sweet','chocolatey'], kit:'thermos' },

  // --- treats ---
  { id:'cookie',  name:'Cookie',        group:'treat', price:17, health:1, tags:['sweet','crunchy'] },
  { id:'yogurt',  name:'Yogurt Pot',    group:'treat', price:20, health:4, tags:['soft','sweet','cold'], kit:'icepack' },
  { id:'chocbar', name:'Chocolate Bar', group:'treat', price:24, health:0, tags:['sweet','chocolatey'] },
  { id:'cupcake', name:'Cupcake',       group:'treat', price:32, health:0, tags:['sweet','soft'] },
  { id:'brownie', name:'Brownie',       group:'treat', price:40, health:0, tags:['sweet','soft','chocolatey'] },
];
export const FOOD = Object.fromEntries(FOODS.map(f => [f.id, f]));
export const MAX_HEALTH = 5;

// ---------------------------------------------------------------- brands ---
//
// Three shops chase the same lunchbox. Bill's is cheap and a bit beige,
// Billy's is the ordinary supermarket, and Lebelibs is the posh one: dearer,
// fresher, and milbils can taste the difference.
//
//   mult    what they do to Billy's price
//   health  what their version does to a food's health score
//   tip     extra on the milbil's tip for every item from this shop
//   skips   food they don't stock

export const BRANDS = [
  { id:'bills', name:"Bill's", icon:'🏷️', color:'#f2a33c', slogan:'Pile it high, sell it cheap!',
    mult:0.6, health:-1, tip:-0.02,
    skips:['sushi','blueberries','snappeas','smoothie','boiledegg','soup'],
    blurb:'Big bags, small prices. Nothing fancy and nothing fresh, but you can feed a milbil all week on what Lebelibs charges for a punnet of berries.' },
  { id:'billys', name:"Billy's", icon:'🛒', color:'#4aa3e8', slogan:'Everything you need, every day.',
    mult:1, health:0, tip:0,
    skips:[],
    blurb:'The ordinary shop on the corner. It stocks everything, the prices are fair, and nobody has ever complained.' },
  { id:'lebelibs', name:'Lebelibs', icon:'🌿', color:'#3fae4a', slogan:'Grown slowly. Packed proudly.',
    mult:1.7, health:1, tip:0.05,
    skips:['chocbar','pretzels','pizza','hotchoc','crackers'],
    blurb:'Leaves still wet from the garden, bread still warm. It costs nearly double, but milbils notice, and so does the health inspector.' },
];
export const BRAND = Object.fromEntries(BRANDS.map(b => [b.id, b]));

/** What `brand` charges for `food` today, with the day's wobble and any deal. */
export function priceOf(food, brand, swing = 1, deal = false){
  const p = food.price * brand.mult * swing * (deal ? DEAL_OFF : 1);
  return Math.max(1, Math.round(p));
}
export const stocks = (brand, food) => !brand.skips.includes(food.id);

// Every morning each shop rolls a new price wobble and puts one food on
// special, trying to pinch the sale off the other two.
export const SWING = [0.85, 1.15];
export const DEAL_OFF = 0.5;
export const DEAL_LINES = [
  'Half price %f today only!',
  '%f — buy it before it goes!',
  'Nobody beats our %f. Nobody!',
  "We've too much %f. Help us out!",
  'Today: %f at half the price.',
];

// ------------------------------------------------------------------- kit ---
//
// Your packing kit. Two of these open up food you couldn't pack before; the
// rest are little touches milbils pay extra for.

export const KIT = [
  { id:'napkin',  name:'Paper Napkin',  icon:'🧻', cost:150,  tip:0.06,
    text:'A folded napkin tucked under the lid. Tidy. Milbils tip 6% more.' },
  { id:'icepack', name:'Ice Pack',      icon:'🧊', cost:400,  tip:0.08,
    text:'Keeps the cold things cold, so you can pack milk, yogurt, smoothies, pasta salad and sushi. Tips go up 8%.' },
  { id:'cutlery', name:'Fork and Spoon',icon:'🥄', cost:800,  tip:0.08,
    text:'No more eating pasta salad with your fingers. Tips go up 8%.' },
  { id:'note',    name:'Little Note',   icon:'💌', cost:1400, tip:0.12,
    text:'A tiny "have a lovely day!" drawn on the back of a receipt. Tips go up 12%.' },
  { id:'thermos', name:'Thermos Flask', icon:'🫙', cost:2200, tip:0.10,
    text:'Keeps soup, pizza and hot chocolate warm until lunchtime. Tips go up 10%.' },
  { id:'coolbag', name:'Padded Cool Bag',icon:'🎒',cost:5000, tip:0.20,
    text:'The whole lunchbox rides to school in a padded bag. Tips go up 20%.' },
];
export const KIT_BY_ID = Object.fromEntries(KIT.map(k => [k.id, k]));

// Stickers go on whichever lunchbox you're packing. Milbils like a decorated
// box, so each one you own adds a little to every tip.
export const STICKER_TIP = 0.03;
export const STICKERS = [
  { id:'star',    name:'Gold Star',   emoji:'⭐', cost:200 },
  { id:'heart',   name:'Heart',       emoji:'💖', cost:200 },
  { id:'rainbow', name:'Rainbow',     emoji:'🌈', cost:450 },
  { id:'dino',    name:'Dinosaur',    emoji:'🦕', cost:450 },
  { id:'rocket',  name:'Rocket',      emoji:'🚀', cost:900 },
  { id:'cat',     name:'Cat',         emoji:'🐱', cost:900 },
  { id:'unicorn', name:'Unicorn',     emoji:'🦄', cost:1800 },
  { id:'crown',   name:'Crown',       emoji:'👑', cost:3000 },
];
export const STICKER_BY_ID = Object.fromEntries(STICKERS.map(s => [s.id, s]));
export const STICKER_SLOTS = 3;

// --------------------------------------------------------------- milbils ---
//
// Everyone you can pack for. A milbil never changes: the same lunchbox, the
// same likes, the same dislikes, every single day. The only thing that changes
// is which one thing they ask for that morning.
//
//   box      their own lunchbox: how many spaces it has and what it looks like
//   money    the lunch money their family hands you each morning
//   tip      what they pay on top for a perfect lunchbox
//   loves    'f:apple' a food, 'g:fruit' a group, 't:crunchy' a word, 'b:bills' a shop
//   hates    the same, but they'd rather you didn't
//   allergy  a word they must never, ever find in there
//   asks     the one extra thing they might ask for; one is picked each morning
//   points   points you need in the bank before they'll let you pack for them

export const MILBILS = [
  { id:'sprouty', name:'Sprouty', points:0, look:{ line:'#4cbb4a', hat:'sprout' },
    box:{ spaces:3, body:'#6cc24a', lid:'#4e9a33', inner:'#eaf7dd' },
    money:90, tip:55,
    blurb:'Grows cress on the windowsill. Will tell you about it.',
    loves:['t:green', 'g:veg'], hates:['f:chocbar'],
    asks:[{ what:'g:veg', n:2 }, { what:'t:green', n:1 }, { what:'t:crunchy', n:1 }] },

  { id:'chomp', name:'Chomp', points:0, art:'art/chomp.png',
    box:{ spaces:4, body:'#e5484d', lid:'#b8303a', inner:'#ffe7e0' },
    money:140, tip:70,
    blurb:'Hungry. Always. Bill\'s big bags are exactly their sort of thing.',
    loves:['g:main', 't:cheesy', 'b:bills'], hates:['t:green'],
    asks:[{ kind:'full' }, { what:'g:main', n:1 }, { what:'t:cheesy', n:1 }] },

  { id:'giggle', name:'Giggle', points:0, look:{ line:'#ff6fae', eyes:'happy', mouth:'open' },
    box:{ spaces:3, body:'#ff8fc0', lid:'#e0609c', inner:'#ffe9f3' },
    money:105, tip:60,
    blurb:'Laughs at absolutely everything, including the cucumber.',
    loves:['g:treat', 't:sweet'], hates:['g:veg'],
    asks:[{ what:'g:treat', n:1 }, { what:'t:sweet', n:2 }, { kind:'full' }] },

  { id:'toothy', name:'Toothy', points:40, look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' },
    box:{ spaces:4, body:'#7d8cff', lid:'#5a68d8', inner:'#e8ebff' },
    money:165, tip:85,
    blurb:'Has a wobbly tooth and is determined to lose it at lunchtime.',
    loves:['t:crunchy'], hates:['t:soft'],
    asks:[{ what:'t:crunchy', n:3 }, { what:'t:crunchy', n:2 }, { kind:'variety', n:3 }] },

  { id:'snooze', name:'Snooze', points:100, look:{ line:'#7aa7ff', eyes:'sleepy' },
    box:{ spaces:4, body:'#8fb8ff', lid:'#6a93e0', inner:'#e9f1ff' },
    money:190, tip:95,
    blurb:'Fell asleep in assembly. Crunching wakes them up and they hate it.',
    loves:['t:soft', 't:warm'], hates:['t:crunchy'],
    asks:[{ what:'t:soft', n:2 }, { what:'t:warm', n:1 }, { what:'g:drink', n:1 }] },

  { id:'freckles', name:'Freckles', points:180, look:{ line:'#ff8a5b', extra:'freckles' },
    box:{ spaces:4, body:'#ffa877', lid:'#e07f49', inner:'#fff0e5' },
    money:215, tip:110, allergy:'nuts',
    blurb:'Allergic to nuts. One nut and the whole lunchbox comes home shut.',
    loves:['g:fruit', 't:juicy'], hates:[],
    asks:[{ what:'g:fruit', n:2 }, { what:'t:juicy', n:2 }, { kind:'variety', n:4 }] },

  { id:'brainy', name:'Brainy', points:280, look:{ line:'#2bb5a0', extra:'glasses' },
    box:{ spaces:5, body:'#2bb5a0', lid:'#1d8d7c', inner:'#e3f8f4' },
    money:260, tip:135,
    blurb:'Read a book about food groups and has not stopped talking about it.',
    loves:['g:veg', 'g:fruit', 'b:lebelibs'], hates:['g:treat'],
    asks:[{ kind:'variety', n:4 }, { kind:'variety', n:5 }, { what:'g:veg', n:2 }] },

  { id:'sporty', name:'Sporty', points:400, look:{ line:'#e05252', hat:'cap' },
    box:{ spaces:5, body:'#e05252', lid:'#b83c3c', inner:'#ffe9e9' },
    money:300, tip:155,
    blurb:'Football at break, football at lunch, football after school.',
    loves:['g:drink', 'f:boiledegg'], hates:['t:chocolatey'],
    asks:[{ what:'g:drink', n:1 }, { what:'g:main', n:1 }, { kind:'full' }] },

  { id:'petal', name:'Petal', points:540, art:'art/petal.png',
    box:{ spaces:5, body:'#ff9ec4', lid:'#e0729f', inner:'#fff0f7' },
    money:350, tip:180,
    blurb:'Picks the prettiest thing out first and eats it very slowly.',
    loves:['g:fruit', 't:sweet'], hates:['t:salty'],
    asks:[{ what:'g:fruit', n:3 }, { what:'t:sweet', n:2 }, { kind:'variety', n:4 }] },

  { id:'cosy', name:'Cosy', points:700, look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' },
    box:{ spaces:5, body:'#3f7fe0', lid:'#2c5fb0', inner:'#e6eeff' },
    money:400, tip:210,
    blurb:'Wears the scarf indoors. Cold lunch is simply not on.',
    loves:['t:warm', 't:soft'], hates:['t:cold'],
    asks:[{ what:'t:warm', n:1 }, { what:'t:soft', n:3 }, { what:'g:main', n:1 }] },

  { id:'sunny', name:'Sunny', points:880, art:'art/sunny.png',
    box:{ spaces:5, body:'#ffd24a', lid:'#e0a800', inner:'#fff9e0' },
    money:455, tip:240,
    blurb:'Drinks the juice first, every time, and regrets it by second break.',
    loves:['t:juicy', 'g:drink'], hates:['t:cheesy'],
    asks:[{ what:'t:juicy', n:3 }, { what:'g:drink', n:1 }, { kind:'full' }] },

  { id:'wizzle', name:'Wizzle', points:1080, look:{ line:'#6a5cff', hat:'wizard' },
    box:{ spaces:6, body:'#6a5cff', lid:'#4b3fd0', inner:'#ece9ff' },
    money:520, tip:275,
    blurb:'Calls the soup a potion and the thermos a cauldron. Fair enough.',
    loves:['f:soup', 't:warm'], hates:['f:crackers'],
    asks:[{ what:'t:warm', n:2 }, { kind:'variety', n:5 }, { what:'g:main', n:2 }] },

  { id:'hattie', name:'Hattie', points:1300, art:'art/hattie.png',
    box:{ spaces:6, body:'#b05cf0', lid:'#8a3fc9', inner:'#f4e9ff' },
    money:590, tip:315,
    blurb:'Swaps half the lunchbox at the table, so pack things worth swapping.',
    loves:['t:cheesy', 'g:snack'], hates:['f:water'],
    asks:[{ what:'g:snack', n:2 }, { kind:'variety', n:5 }, { kind:'full' }] },

  { id:'scoop', name:'Scoop', points:1540, art:'art/scoop.png',
    box:{ spaces:6, body:'#38b6ff', lid:'#1f8fd0', inner:'#e4f5ff' },
    money:660, tip:355,
    blurb:'Only truly happy when something in the box is still cold at noon.',
    loves:['t:cold', 't:sweet'], hates:['t:warm'],
    asks:[{ what:'t:cold', n:3 }, { what:'g:treat', n:1 }, { kind:'variety', n:5 }] },

  { id:'royal', name:'Royal Milbil', points:1800, look:{ line:'#e0b000', hat:'crown', extra:'cape' },
    box:{ spaces:6, body:'#f5c542', lid:'#c9961a', inner:'#fff6d9' },
    money:800, tip:460,
    blurb:'Will not be seen eating anything out of a big orange bag.',
    loves:['f:sushi', 'f:strawberries', 'b:lebelibs'], hates:['b:bills', 'f:crackers'],
    asks:[{ kind:'full' }, { kind:'variety', n:5 }, { what:'g:fruit', n:2 }] },

  { id:'golden', name:'Golden Milbil', points:2080, look:{ line:'#d99a00', fill:'#ffe27a', eyes:'sparkle' },
    box:{ spaces:6, body:'#ffe27a', lid:'#d99a00', inner:'#fffbe8' },
    money:1100, tip:700,
    blurb:'Nobody knows where they come from. The lunch money is always gold.',
    loves:['g:fruit', 'g:veg', 't:sweet'], hates:[],
    asks:[{ kind:'variety', n:6 }, { kind:'full' }, { what:'g:fruit', n:3 }] },
];
export const MILBIL = Object.fromEntries(MILBILS.map(m => [m.id, m]));
export const FIRST_MILBILS = MILBILS.filter(m => m.points === 0).map(m => m.id);

// ------------------------------------------------------------- the judges ---
//
// At lunchtime three milbils sit down with the box and mark it out of ten
// each, so you walk home with somewhere between 0 and 30 points.

export const JUDGES = [
  { id:'munch', name:'Munch', icon:'😋', asks:'Did they like it?',
    look:{ line:'#ff9a3c', eyes:'happy', mouth:'open' },
    blurb:'Sits at the head of the lunch table. Reads the note, looks in the box, and says whether you listened.' },
  { id:'pip', name:'Nurse Pip', icon:'🩺', asks:'Is it good for them?',
    look:{ line:'#2bb5a0', extra:'glasses' },
    blurb:'Runs the school sick room. Fruit, veg and water get full marks. Brownies do not.' },
  { id:'tidy', name:'Tidy', icon:'🎀', asks:'Is it a proper lunch?',
    look:{ line:'#ff6fae', extra:'bow', eyes:'sparkle' },
    blurb:'Wants every space used, a bit of everything, and no packing the same thing twice.' },
];
export const JUDGE_MAX = 10;
export const MAX_POINTS = JUDGES.length * JUDGE_MAX;

// How Munch shares out his ten marks: one helping for every line on the note,
// with the morning's request worth the most.
export const LIKING = { love:3, avoid:2, ask:4 };

// And Tidy's ten.
export const TIDY = { full:4, variety:4, nodupes:2 };
export const TIDY_GROUPS = 4;        // this many food groups earns the lot

// Points out of 30 that earn one, two and three stars on the report card.
// Below one star the family asks for their change back, so you can't get rich
// handing over an empty lunchbox.
export const STARS_AT = [8, 18, 27];

// Health is the average health of everything in the box, out of 5, shown as a
// score out of 100. It is all Nurse Pip looks at.
export const HEALTHY = 70;
export const SUPER_HEALTHY = 88;
export const BALANCED_GROUPS = 4;

// Coins. The milbil's tip is their full tip multiplied by the marks out of 30,
// and then these go on top of it.
export const BONUS = {
  healthy:  0.15,
  super:    0.35,
  balanced: 0.20,
  full:     0.10,
  record:   0.25,
};

// Pack for the same milbil day after day and they get fond of you: every day
// in a row adds this much to the tip, up to the cap.
export const STREAK_TIP = 0.08;
export const STREAK_MAX = 0.8;

export const NAMES = [
  'Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Bobbin', 'Wix', 'Doodle', 'Crumb',
  'Pocket', 'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep', 'Sprig', 'Noodle',
  'Tumble', 'Winkle', 'Puddle', 'Gus', 'Bean', 'Marzi', 'Pumpkin', 'Radish',
  'Fizz', 'Jelly', 'Mopsy', 'Toffee', 'Waffle', 'Zig', 'Button', 'Pudding',
];
export const COLORS = [
  '#8b7bff', '#ff6fa5', '#ff9a3c', '#38b6ff', '#3fbf6a',
  '#e5484d', '#b05cf0', '#14b8a6', '#f2b707', '#5b6cff',
];
export const HATS = [
  { id:'',       name:'No hat' },
  { id:'cap',    name:'Cap' },
  { id:'beanie', name:'Beanie' },
  { id:'straw',  name:'Straw hat' },
  { id:'sprout', name:'Sprout' },
  { id:'flowers',name:'Flowers' },
  { id:'party',  name:'Party hat' },
  { id:'crown',  name:'Crown' },
];
export const NAME_MAX = 14;

// ------------------------------------------------------------- wish words ---
//
// Turning 'g:fruit', 't:crunchy', 'f:apple' and 'b:bills' into something a
// milbil would actually say.

/** Does this item (a food plus the shop it came from) match a wish? */
export function wishMatch(wish, item){
  const [kind, id] = wish.split(':');
  if (kind === 'f') return item.food === id;
  if (kind === 'g') return FOOD[item.food]?.group === id;
  if (kind === 't') return !!FOOD[item.food]?.tags.includes(id);
  if (kind === 'b') return item.brand === id;
  return false;
}

/** "🍎 fruit", "crunchy things", "an Apple", "anything from Bill's". */
export function wishText(wish){
  const [kind, id] = wish.split(':');
  if (kind === 'f') return FOOD[id]?.name ?? id;
  if (kind === 'g') return `${GROUP[id]?.icon ?? ''} ${GROUP[id]?.name.toLowerCase() ?? id}`.trim();
  if (kind === 't') return `${TAGS[id] ?? id} things`;
  if (kind === 'b') return `food from ${BRAND[id]?.name ?? id}`;
  return wish;
}

/** The one-line version of the thing they asked for this morning. */
export function askText(ask){
  if (ask.kind === 'full') return 'Fill every single space!';
  if (ask.kind === 'variety') return `${ask.n} different food groups`;
  const n = ask.n ?? 1;
  const [kind, id] = ask.what.split(':');
  if (kind === 'f') return n === 1 ? `${FOOD[id].name}, please` : `${n} × ${FOOD[id].name}`;
  if (kind === 't') return n === 1 ? `Something ${TAGS[id]}` : `${n} ${TAGS[id]} things`;
  if (kind === 'g'){
    const g = `${GROUP[id].icon} ${GROUP[id].name.toLowerCase()}`;
    return n === 1 ? `Something from ${g}` : `${n} × ${g}`;
  }
  if (kind === 'b') return n === 1 ? `Something from ${BRAND[id].name}` : `${n} things from ${BRAND[id].name}`;
  return ask.what;
}
