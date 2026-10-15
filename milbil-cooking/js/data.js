// ---------- Every number in the game ----------
//
// Ingredients, the ways you can cook them, the dishes on the menu, the five
// restaurants you can grow into, and what tables and ordering machines cost.

// Card colours, one per kind of food. Every ingredient card is a soft block of
// one of these with the food drawn flat in the middle.
export const KINDS = {
  veg:    '#dcf2cf',
  fruit:  '#ffe0e6',
  dairy:  '#dceaff',
  bakery: '#fbe6c8',
  meat:   '#ffdccc',
  sauce:  '#fff0bf',
  sweet:  '#eee0ff',
  pantry: '#efe8dd',
};

// ------------------------------------------------------------- actions ---
// How you do each kind of step. `at` is where it happens: on the dish itself,
// or at a station (chopping board, pan…) before it slides onto the dish.
// Each phase is a gesture you do `n` times, or a wait of `s` seconds.
//
//   auto    it just happens (pouring, dropping in)
//   down    swipe down              up      swipe up
//   updown  swipe up and down       side    swipe side to side
//   circle  swipe round in circles  wait    hang on a moment

export const ACTS = {
  pour:    { verb: 'Pour',    at: 'dish', phases: [{ g: 'auto', s: 0.8 }] },
  add:     { verb: 'Add',     at: 'dish', phases: [{ g: 'auto', s: 0.6 }] },
  chop:    { verb: 'Chop',    at: 'board',   tool: 'knife',   phases: [{ g: 'down', n: 5, hint: 'Swipe down to chop!' }] },
  mash:    { verb: 'Mash',    at: 'mixbowl', tool: 'masher',  phases: [{ g: 'updown', n: 6, hint: 'Swipe up and down to mash!' }] },
  roll:    { verb: 'Roll',    at: 'board',   tool: 'pin',     phases: [{ g: 'updown', n: 4, hint: 'Swipe up and down to roll it flat!' }] },
  grate:   { verb: 'Grate',   at: 'dish',    tool: 'grater',  phases: [{ g: 'updown', n: 5, hint: 'Swipe up and down to grate!' }] },
  spread:  { verb: 'Spread',  at: 'dish',    tool: 'spreader', phases: [{ g: 'side', n: 4, hint: 'Swipe side to side to spread!' }] },
  shake:   { verb: 'Shake',   at: 'dish',    tool: 'self',    phases: [{ g: 'side', n: 4, hint: 'Shake it side to side!' }] },
  squeeze: { verb: 'Squeeze', at: 'dish',    tool: 'self',    phases: [{ g: 'down', n: 3, hint: 'Swipe down to squeeze!' }] },
  stir:    { verb: 'Stir',    at: 'dish',    tool: 'spoon',   phases: [{ g: 'circle', n: 2, hint: 'Swipe round and round to stir!' }] },
  blend:   { verb: 'Blend',   at: 'blender', phases: [{ g: 'circle', n: 3, hint: 'Swipe round and round to blend!' }] },
  fry:     { verb: 'Fry',     at: 'pan',     tool: 'spoon',   phases: [{ g: 'circle', n: 2, hint: 'Swipe round and round to fry it!' }] },
  boil:    { verb: 'Boil',    at: 'pot',     tool: 'spoon',   phases: [{ g: 'circle', n: 2, hint: 'Swipe round and round to stir the pot!' }] },
  cook:    { verb: 'Cook',    at: 'pan',     tool: 'spatula', phases: [
    { g: 'wait', s: 2, hint: 'Sizzle sizzle… wait for it!' },
    { g: 'up', n: 1, hint: 'Swipe up to flip it!' },
    { g: 'wait', s: 1.2, hint: 'Nearly done…' },
  ] },
  toast:   { verb: 'Toast',   at: 'toaster', phases: [
    { g: 'down', n: 1, hint: 'Swipe down to push the lever!' },
    { g: 'wait', s: 1.8, hint: 'Toasting…' },
  ] },
};

// --------------------------------------------------------- ingredients ---
// `act` is what happens if you use it where it doesn't belong. `look` is how
// it sits on a dish once it's been cooked; `looks` swaps that for some
// actions (grated cheese vs a slice of cheese). `juice` is its colour blended.

const I = (id, name, kind, act, look, extra = {}) => ({ id, name, kind, act, look, ...extra });

export const INGREDIENTS = [
  I('bread',       'Bread',         'bakery', 'toast',   { form: 'toast',   c: ['#e2ac62', '#b9783a'] }),
  I('butter',      'Butter',        'dairy',  'spread',  { form: 'spread',  c: ['#fbe38c'] }),
  I('jam',         'Jam',           'fruit',  'spread',  { form: 'spread',  c: ['#e0405a'] }),
  I('nachos',      'Nachos',        'pantry', 'pour',    { form: 'chips',   c: ['#f7c443', '#e9a92a'] }),
  I('avocado',     'Avocado',       'veg',    'mash',    { form: 'blob',    c: ['#9ccc5a', '#7fb345'] }, { juice: '#b8d88a' }),
  I('onion',       'Onion',         'veg',    'chop',    { form: 'pieces',  c: ['#d39ad0', '#f6e6f3'] }),
  I('strawberry',  'Strawberries',  'fruit',  'chop',    { form: 'halves',  c: ['#ef4b5f', '#ffd2d8'] }, { juice: '#ff9fb4' }),
  I('banana',      'Banana',        'fruit',  'chop',    { form: 'slices',  c: ['#fbeaa8', '#f0d06a'] }, { juice: '#fbe596' }),
  I('blueberries', 'Blueberries',   'fruit',  'add',     { form: 'dots',    c: ['#4a5fc1', '#2f3f8f'] }, { juice: '#9a86de' }),
  I('milk',        'Milk',          'dairy',  'pour',    { form: 'liquid',  c: ['#fbfbff'] }),
  I('batter',      'Pancake mix',   'bakery', 'cook',    { form: 'pancakes', c: ['#eab468', '#c98a3f'] }),
  I('syrup',       'Syrup',         'sauce',  'pour',    { form: 'drizzle', c: ['#b5651d'] }),
  I('cocoa',       'Cocoa',         'sweet',  'stir',    { form: 'tint',    c: ['#8a5634'] }),
  I('marshmallow', 'Marshmallows',  'sweet',  'add',     { form: 'pieces',  c: ['#ffffff', '#ffc6dd'] }),
  I('lettuce',     'Lettuce',       'veg',    'chop',    { form: 'leaves',  c: ['#7cc35a', '#5ea444'] }),
  I('tomato',      'Tomato',        'veg',    'chop',    { form: 'pieces',  c: ['#e8443a', '#ff8a7a'] }, { juice: '#f0604f' }),
  I('cucumber',    'Cucumber',      'veg',    'chop',    { form: 'slices',  c: ['#d8efb0', '#4e9a3b'] }),
  I('dressing',    'Dressing',      'sauce',  'shake',   { form: 'drizzle', c: ['#f3ecc8'] }),
  I('hotdogbun',   'Hot dog bun',   'bakery', 'add',     { form: 'hotbun',  c: ['#e9b66c', '#c98a3f'] }),
  I('sausage',     'Sausage',       'meat',   'cook',    { form: 'sausage', c: ['#c4583b', '#9c3f2a'] }),
  I('ketchup',     'Ketchup',       'sauce',  'squeeze', { form: 'drizzle', c: ['#d7312e'] }),
  I('mustard',     'Mustard',       'sauce',  'squeeze', { form: 'drizzle', c: ['#f2c21b'] }),
  I('bun',         'Burger bun',    'bakery', 'add',     { form: 'bun',     c: ['#e9b66c', '#c98a3f'] }),
  I('patty',       'Burger',        'meat',   'cook',    { form: 'patty',   c: ['#7a4a2e', '#5e3620'] }),
  I('cheese',      'Cheese',        'dairy',  'grate',   { form: 'shreds',  c: ['#f7cf3c', '#e7b520'] },
    { looks: { add: { form: 'slice', c: ['#f7cf3c', '#e7b520'] } } }),
  I('spaghetti',   'Spaghetti',     'pantry', 'boil',    { form: 'nest',    c: ['#f3d27a', '#ddb24f'] }),
  I('tomsauce',    'Tomato sauce',  'sauce',  'pour',    { form: 'blob',    c: ['#d7312e', '#b8241f'] },
    { looks: { spread: { form: 'spread', c: ['#d7312e'] } } }),
  I('herbs',       'Basil',         'veg',    'add',     { form: 'herbs',   c: ['#3f9a2a', '#6cc24a'] }),
  I('tacoshell',   'Taco shell',    'bakery', 'add',     { form: 'shell',   c: ['#f3c552', '#d9a53a'] }),
  I('mince',       'Mince',         'meat',   'fry',     { form: 'crumbs',  c: ['#8a5134', '#6e3c25'] }),
  I('icecream',    'Ice cream',     'sweet',  'add',     { form: 'scoop',   c: ['#fff3d6', '#f1dca8'] }),
  I('chocsauce',   'Choc sauce',    'sauce',  'pour',    { form: 'drizzle', c: ['#5a321c'] }),
  I('sprinkles',   'Sprinkles',     'sweet',  'shake',   { form: 'sprinkles', c: ['#ff5d8f', '#ffc93c', '#4cc9f0', '#7bd389', '#b388ff'] }),
  I('cherry',      'Cherry',        'fruit',  'add',     { form: 'cherry',  c: ['#d61f3c', '#a8142c'] }),
  I('dough',       'Dough',         'bakery', 'roll',    { form: 'base',    c: ['#f2d49a', '#d9b06c'] }),
  I('pepperoni',   'Pepperoni',     'meat',   'add',     { form: 'slices',  c: ['#c8382d', '#a52a22'] }),
  I('rice',        'Rice',          'pantry', 'add',     { form: 'grains',  c: ['#fbfaf4', '#e6e0cc'] },
    { looks: { fry: { form: 'grains', c: ['#f2d9a2', '#d9b46a'] } } }),
  I('egg',         'Egg',           'dairy',  'cook',    { form: 'egg',     c: ['#ffffff', '#f6b81c'] }),
  I('peas',        'Peas',          'veg',    'add',     { form: 'dots',    c: ['#7cc35a', '#5ea444'] }),
  I('carrot',      'Carrot',        'veg',    'chop',    { form: 'pieces',  c: ['#f58a2b', '#ffb366'] }, { juice: '#f9a04e' }),
  I('soysauce',    'Soy sauce',     'sauce',  'squeeze', { form: 'drizzle', c: ['#4a2a17'] }),
  I('cream',       'Cream',         'dairy',  'squeeze', { form: 'foam',    c: ['#ffffff', '#ece8e0'] },
    { looks: { spread: { form: 'spread', c: ['#fffaf0'] } } }),
  I('waffle',      'Waffle',        'bakery', 'toast',   { form: 'waffle',  c: ['#e3a957', '#c98a3f'] }),
  I('cake',        'Sponge cake',   'bakery', 'add',     { form: 'cake',    c: ['#f3cf86', '#ddb060'] }),
  I('icing',       'Icing',         'sweet',  'spread',  { form: 'spread',  c: ['#ffb3cf'] }),
  I('candle',      'Candle',        'sweet',  'add',     { form: 'candle',  c: ['#7fb7ff', '#ffffff'] }),
  I('broth',       'Broth',         'sauce',  'pour',    { form: 'liquid',  c: ['#f0c27a'] }),
  I('noodles',     'Noodles',       'pantry', 'boil',    { form: 'nest',    c: ['#f6dc8c', '#e3be5c'] }),
  I('springonion', 'Spring onion',  'veg',    'chop',    { form: 'rings',   c: ['#6cc24a', '#3f9a2a'] }),
  I('seaweed',     'Seaweed',       'veg',    'add',     { form: 'sheet',   c: ['#2f4a3a', '#1f3529'] }),
  I('chicken',     'Chicken',       'meat',   'fry',     { form: 'pieces',  c: ['#e8b36a', '#d39545'] }),
  I('currysauce',  'Curry sauce',   'sauce',  'pour',    { form: 'blob',    c: ['#e3a21a', '#c9860f'] }),
  I('honey',       'Honey',         'sauce',  'pour',    { form: 'drizzle', c: ['#f4b41a'] }),
  I('yogurt',      'Yogurt',        'dairy',  'pour',    { form: 'liquid',  c: ['#fffaf0'] }),
];
export const ING = Object.fromEntries(INGREDIENTS.map(i => [i.id, i]));

/** How an ingredient looks on the plate after a particular action. */
export function lookFor(ingId, act){
  const ing = ING[ingId];
  if (ing.looks?.[act]) return ing.looks[act];
  if (act === 'blend') return { form: 'liquid', c: [ing.juice || ing.look.c[0]] };
  if (act === 'chop' && !['pieces', 'slices', 'halves', 'leaves', 'rings', 'crumbs'].includes(ing.look.form))
    return { form: 'pieces', c: [ing.look.c[0], ing.look.c[1] || ing.look.c[0]] };
  return ing.look;
}

// -------------------------------------------------------------- dishes ---
// You start with Toast and buy the rest. Each dish sells for more than the
// one before, in round steps (3, 5, 10, 20, 50, 100, 200, 500, 1,000 …), and
// costs the next step up to buy. Steps are [ingredient, action, what the
// recipe card says]. The list is in price order.

const D = (id, name, dish, price, cost, steps, serve = 'Serve it!') =>
  ({ id, name, dish, price, cost, serve, steps: steps.map(([ing, act, text]) => ({ ing, act, text })) });

export const DISHES = [
  D('toast', 'Toast', 'plate', 3, 0, [
    ['bread', 'toast', 'Toast the bread'],
    ['butter', 'spread', 'Spread the butter'],
  ], 'Serve it warm!'),
  D('fruitsalad', 'Fruit Salad', 'bowl', 5, 10, [
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['banana', 'chop', 'Chop the banana'],
    ['blueberries', 'add', 'Add the blueberries'],
  ]),
  D('nachos', 'Nachos with Guacamole', 'bowl', 10, 20, [
    ['nachos', 'pour', 'Pour the nachos into the bowl'],
    ['avocado', 'mash', 'Mash the avocado'],
    ['onion', 'chop', 'Chop the onion'],
  ], 'Serve together!'),
  D('jamtoast', 'Jam Toast', 'plate', 20, 50, [
    ['bread', 'toast', 'Toast the bread'],
    ['butter', 'spread', 'Spread the butter'],
    ['jam', 'spread', 'Spread the jam'],
  ], 'Serve it warm!'),
  D('yogurt', 'Yogurt', 'bowl', 50, 100, [
    ['yogurt', 'pour', 'Pour the yogurt into the bowl'],
    ['blueberries', 'add', 'Add the blueberries'],
    ['honey', 'pour', 'Drizzle on the honey'],
  ]),
  D('smoothie', 'Berry Smoothie', 'glass', 100, 200, [
    ['milk', 'pour', 'Pour the milk into the glass'],
    ['banana', 'blend', 'Blend the banana'],
    ['strawberry', 'blend', 'Blend the strawberries'],
  ], 'Serve it cold!'),
  D('hotchoc', 'Hot Chocolate', 'mug', 200, 500, [
    ['milk', 'pour', 'Pour the milk into the mug'],
    ['cocoa', 'stir', 'Stir in the cocoa'],
    ['marshmallow', 'add', 'Add the marshmallows'],
  ], 'Serve it hot!'),
  D('pancakes', 'Pancakes', 'plate', 500, 1000, [
    ['batter', 'cook', 'Cook the pancakes'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['syrup', 'pour', 'Pour on the syrup'],
  ]),
  D('salad', 'Garden Salad', 'bowl', 1000, 2000, [
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['tomato', 'chop', 'Chop the tomato'],
    ['cucumber', 'chop', 'Slice the cucumber'],
    ['dressing', 'shake', 'Shake on the dressing'],
  ]),
  D('hotdog', 'Hot Dog', 'plate', 2000, 5000, [
    ['hotdogbun', 'add', 'Put the bun on the plate'],
    ['sausage', 'cook', 'Cook the sausage'],
    ['ketchup', 'squeeze', 'Squeeze on the ketchup'],
    ['mustard', 'squeeze', 'Squeeze on the mustard'],
  ]),
  D('sundae', 'Ice Cream Sundae', 'coupe', 5000, 10000, [
    ['icecream', 'add', 'Scoop in the ice cream'],
    ['banana', 'chop', 'Slice the banana'],
    ['chocsauce', 'pour', 'Pour on the chocolate sauce'],
    ['sprinkles', 'shake', 'Shake on the sprinkles'],
    ['cherry', 'add', 'Pop a cherry on top'],
  ]),
  D('tacos', 'Tacos', 'plate', 10000, 20000, [
    ['tacoshell', 'add', 'Put the taco shell on the plate'],
    ['mince', 'fry', 'Fry the mince'],
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['cheese', 'grate', 'Grate the cheese'],
  ]),
  D('spaghetti', 'Spaghetti', 'bowl', 20000, 50000, [
    ['spaghetti', 'boil', 'Boil the spaghetti'],
    ['tomsauce', 'pour', 'Pour on the tomato sauce'],
    ['cheese', 'grate', 'Grate the cheese'],
    ['herbs', 'add', 'Add the basil'],
  ]),
  D('burger', 'Cheeseburger', 'plate', 50000, 100000, [
    ['bun', 'add', 'Put the bun on the plate'],
    ['patty', 'cook', 'Cook the burger'],
    ['cheese', 'add', 'Add a slice of cheese'],
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['ketchup', 'squeeze', 'Squeeze on the ketchup'],
  ]),
  D('waffles', 'Waffles', 'plate', 100000, 200000, [
    ['waffle', 'toast', 'Toast the waffle'],
    ['icecream', 'add', 'Add a scoop of ice cream'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['chocsauce', 'pour', 'Pour on the chocolate sauce'],
  ]),
  D('milkshake', 'Strawberry Milkshake', 'glass', 200000, 500000, [
    ['milk', 'pour', 'Pour the milk into the glass'],
    ['strawberry', 'blend', 'Blend the strawberries'],
    ['icecream', 'add', 'Add a scoop of ice cream'],
    ['cream', 'squeeze', 'Squirt on the cream'],
    ['cherry', 'add', 'Pop a cherry on top'],
  ], 'Serve it with a smile!'),
  D('friedrice', 'Fried Rice', 'bowl', 500000, 1000000, [
    ['rice', 'fry', 'Fry the rice'],
    ['egg', 'cook', 'Cook the egg'],
    ['peas', 'add', 'Add the peas'],
    ['carrot', 'chop', 'Chop the carrot'],
    ['soysauce', 'squeeze', 'Squeeze on the soy sauce'],
  ]),
  D('pizza', 'Pepperoni Pizza', 'plate', 1000000, 2000000, [
    ['dough', 'roll', 'Roll out the dough'],
    ['tomsauce', 'spread', 'Spread the tomato sauce'],
    ['cheese', 'grate', 'Grate the cheese'],
    ['pepperoni', 'add', 'Add the pepperoni'],
  ]),
  D('tart', 'Fruit Tart', 'plate', 2000000, 5000000, [
    ['dough', 'roll', 'Roll out the pastry'],
    ['cream', 'spread', 'Spread the cream'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['blueberries', 'add', 'Add the blueberries'],
    ['honey', 'pour', 'Drizzle on the honey'],
  ]),
  D('curry', 'Chicken Curry', 'bowl', 5000000, 10000000, [
    ['rice', 'add', 'Scoop the rice into the bowl'],
    ['chicken', 'fry', 'Fry the chicken'],
    ['carrot', 'chop', 'Chop the carrot'],
    ['currysauce', 'pour', 'Pour on the curry sauce'],
    ['herbs', 'add', 'Add the herbs'],
  ]),
  D('ramen', 'Ramen', 'bowl', 10000000, 20000000, [
    ['broth', 'pour', 'Pour the broth into the bowl'],
    ['noodles', 'boil', 'Boil the noodles'],
    ['egg', 'cook', 'Cook the egg'],
    ['springonion', 'chop', 'Chop the spring onion'],
    ['seaweed', 'add', 'Add the seaweed'],
  ]),
  D('cake', 'Birthday Cake', 'plate', 20000000, 50000000, [
    ['cake', 'add', 'Put the cake on the plate'],
    ['icing', 'spread', 'Spread the icing'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['sprinkles', 'shake', 'Shake on the sprinkles'],
    ['candle', 'add', 'Add a candle'],
  ], 'Serve it and sing!'),
];
export const DISH = Object.fromEntries(DISHES.map(d => [d.id, d]));
export const START_DISHES = ['toast'];

// ---------------------------------------------------------- restaurants ---
// Buy any one you have the coins for, in any order, and move between the
// ones you own. Tables and machines are yours wherever you go; a restaurant
// shows as many tables as it has room for. `stars` is how fancy it is, which
// also decides the decorations. `cols` is how the tables are laid out.
//
// The Drive-Through has no tables: milbils queue up in cars, order at the
// speaker as they pull in, and you hand their food out of the window.

export const PLACES = [
  { id: 'cafe',   name: 'Little Café',       cost: 0,       stars: 1, maxTables: 3,  cols: 2, windows: 1,
    wall: '#ffe7d1', wall2: '#ffd9b8', floor: '#f2dcbf', floor2: '#ead0ae', accent: '#ff8a5c', cloth: '#ffffff' },
  { id: 'bistro', name: 'Corner Bistro',     cost: 500,     stars: 2, maxTables: 5,  cols: 2, windows: 2,
    wall: '#dff1e4', wall2: '#c9e7d2', floor: '#e9dcc8', floor2: '#ddcdb4', accent: '#3fae6a', cloth: '#fff6e8' },
  { id: 'drive',  name: 'Drive-Through',     cost: 2000,    stars: 2, maxTables: 0,  cars: 6, drive: true, windows: 1,
    wall: '#fff3d6', wall2: '#ffe2a0', floor: '#bfe3a0', floor2: '#b3dc93', accent: '#e5484d', cloth: '#ffffff' },
  { id: 'family', name: 'Family Restaurant', cost: 10000,   stars: 3, maxTables: 7,  cols: 3, windows: 2,
    wall: '#e1ecff', wall2: '#cddcfa', floor: '#f0e2cc', floor2: '#e4d3b8', accent: '#4c7df0', cloth: '#ffffff' },
  { id: 'diner',  name: 'Grand Diner',       cost: 100000,  stars: 4, maxTables: 9,  cols: 3, windows: 3,
    wall: '#ffe3ec', wall2: '#ffcfdd', floor: '#f7f4fb', floor2: '#ddd5ea', accent: '#ef476f', cloth: '#ffffff' },
  { id: 'palace', name: 'Milbil Palace',     cost: 1000000, stars: 5, maxTables: 12, cols: 3, windows: 3,
    wall: '#efe4ff', wall2: '#e0cffd', floor: '#f6ead2', floor2: '#ecd9b5', accent: '#8b5cf6', cloth: '#fff8e1' },
];
export const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));
export const MAX_STARS = 5;

export const START_TABLES = 2;
// What the 3rd, 4th … 12th table costs.
export const TABLE_COSTS = [20, 100, 500, 2000, 5000, 20000, 50000, 200000, 500000, 1000000];
export const tableCost = (owned) => TABLE_COSTS[owned - START_TABLES] ?? Infinity;

// Ordering machines: customers order on these as they walk in, and every
// order shows up in the 🧾 Orders list.
export const MACHINE_COSTS = [100, 10000, 1000000];

// ------------------------------------------------------------ customers ---

export const START_COINS = 20;
export const EAT_SECONDS = 8;
/** Seconds between customers walking in, while there's a free table. */
export const spawnGap = (tables, machines) => Math.max(5, 20 - 1.2 * tables - 2.5 * machines);
/** A tip for being quick: a fifth of the price within 45 seconds, a tenth within 90. */
export const tipFor = (price, waitedSec) =>
  waitedSec < 45 ? Math.max(1, Math.round(price / 5)) : waitedSec < 90 ? Math.max(1, Math.round(price / 10)) : 0;
/**
 * Milbils like the fancy stuff: each dish on your menu is twice as likely to
 * be ordered as the next cheaper one, so the dearest is picked about half the
 * time and the cheap ones still come up now and then.
 */
export const ORDER_SKEW = 2;
export const VIP_CHANCE = 0.12;

// Greta's own drawings come in now and then, and pay double.
export const VIPS = [
  { id: 'petal',  name: 'Petal',  art: 'art/petal.png' },
  { id: 'chomp',  name: 'Chomp',  art: 'art/chomp.png' },
  { id: 'hattie', name: 'Hattie', art: 'art/hattie.png' },
  { id: 'sunny',  name: 'Sunny',  art: 'art/sunny.png' },
  { id: 'scoop',  name: 'Scoop',  art: 'art/scoop.png' },
];

export const NAMES = [
  'Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Bobbin', 'Wix', 'Doodle', 'Crumb',
  'Pocket', 'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep', 'Sprig', 'Noodle',
  'Tumble', 'Winkle', 'Puddle', 'Gus', 'Bean', 'Marzi', 'Pumpkin', 'Radish',
  'Fizz', 'Jelly', 'Mopsy', 'Toffee', 'Waffle', 'Zig', 'Button', 'Pudding',
];

// The outline colour is a milbil's colour, like Greta's glowing pens.
export const COLORS = [
  '#8b7bff', '#ff6fa5', '#ff9a3c', '#38b6ff', '#3fbf6a',
  '#e5484d', '#b05cf0', '#14b8a6', '#f2b707', '#5b6cff',
];
export const FILLS = ['#ffffff', '#fff6fa', '#f6fbff', '#fffbea', '#f4fff3', '#fbf6ff'];
export const CUSTOMER_HATS = ['', '', '', 'cap', 'beanie', 'party', 'sprout', 'straw', 'flowers', 'crown'];
export const CUSTOMER_EYES = ['', '', 'happy', 'sparkle', 'big', 'wink', 'sleepy'];
export const CUSTOMER_EXTRAS = ['', '', '', 'glasses', 'freckles', 'scarf', 'bow'];

// ----------------------------------------------------------------- sign ---
// Your restaurant's sign: a name, a font, a colour and a background. The
// fonts (apart from Rounded) are in fonts/, so they look the same on every
// device and work offline. `size` evens out how big each one looks.

export const SIGN_FONTS = [
  { id: 'rounded', name: 'Rounded', family: '',                 css: 'var(--font)',                     size: 1 },
  { id: 'blocky',  name: 'Blocky',  family: 'Bungee',           css: "'Bungee', var(--font)",            size: .82 },
  { id: 'swirly',  name: 'Swirly',  family: 'Pacifico',         css: "'Pacifico', cursive",              size: .9 },
  { id: 'diner',   name: 'Diner',   family: 'Lobster',          css: "'Lobster', cursive",               size: 1.05 },
  { id: 'cartoon', name: 'Cartoon', family: 'Chewy',            css: "'Chewy', var(--font)",             size: 1.05 },
  { id: 'marker',  name: 'Marker',  family: 'Permanent Marker', css: "'Permanent Marker', cursive",       size: .95 },
  { id: 'pixel',   name: 'Pixel',   family: 'Press Start 2P',   css: "'Press Start 2P', monospace",      size: .6 },
  { id: 'neon',    name: 'Neon',    family: 'Monoton',          css: "'Monoton', var(--font)",           size: .85 },
  { id: 'fancy',   name: 'Fancy',   family: 'Abril Fatface',    css: "'Abril Fatface', Georgia, serif",  size: 1 },
  { id: 'spooky',  name: 'Spooky',  family: 'Creepster',        css: "'Creepster', var(--font)",         size: 1.1 },
];

export const SIGN_COLORS = [
  { id: 'white',   css: '#ffffff' },
  { id: 'ink',     css: '#2f2640' },
  { id: 'red',     css: '#e5484d' },
  { id: 'orange',  css: '#ff8a3c' },
  { id: 'yellow',  css: '#ffd23f' },
  { id: 'green',   css: '#3fae4a' },
  { id: 'mint',    css: '#7be0b5' },
  { id: 'blue',    css: '#2f80ed' },
  { id: 'sky',     css: '#8fd3ff' },
  { id: 'purple',  css: '#9b5de5' },
  { id: 'pink',    css: '#ff6fa5' },
  { id: 'gold',    css: '#f5c542', grad: 'linear-gradient(#fff3b0, #f5c542 55%, #d99a16)' },
  { id: 'rainbow', css: '#ff6fa5', grad: 'linear-gradient(90deg, #ff4d6d, #ffb000, #3fae4a, #2f80ed, #9b5de5)' },
];

// `css` null means the restaurant's own colour, which changes as you move up.
export const SIGN_BGS = [
  { id: 'accent',  name: 'Restaurant colour', css: null },
  { id: 'white',   name: 'White',      css: '#ffffff' },
  { id: 'pink',    name: 'Pink',       css: '#ffb3cf' },
  { id: 'yellow',  name: 'Yellow',     css: '#ffe08a' },
  { id: 'mint',    name: 'Mint',       css: '#b6ecd0' },
  { id: 'sky',     name: 'Sky',        css: '#bfe3ff' },
  { id: 'lilac',   name: 'Lilac',      css: '#d9c6ff' },
  { id: 'red',     name: 'Red',        css: '#e5484d' },
  { id: 'navy',    name: 'Navy',       css: '#24304f' },
  { id: 'chalk',   name: 'Chalkboard', css: '#2f3d36' },
  { id: 'wood',    name: 'Wood',       css: 'repeating-linear-gradient(0deg, #b9824f 0 7px, #c9925d 7px 15px)' },
  { id: 'neon',    name: 'Neon',       css: '#1b1530' },
  { id: 'stripes', name: 'Stripes',    css: 'repeating-linear-gradient(45deg, #ff6f61 0 9px, #ffffff 9px 18px)' },
  { id: 'dots',    name: 'Dots',       css: 'radial-gradient(#ffffffaa 24%, transparent 26%) 0 0 / 12px 12px, #ff8fab' },
  { id: 'gold',    name: 'Gold',       css: 'linear-gradient(#ffe9a0, #f5c542 60%, #e0a52a)' },
  { id: 'rainbow', name: 'Rainbow',    css: 'linear-gradient(90deg, #ff8fa3, #ffd166, #8be08f, #8fd3ff, #c3a6ff)' },
];

export const SIGN_NAMES = [
  "{chef}'s Kitchen", "{chef}'s Diner", 'The Hungry Milbil', 'Milbil Munch', 'The Happy Plate',
  'Nom Nom Café', 'The Cosy Spoon', 'Tasty Town', 'The Golden Pancake', 'Snack Shack',
  'The Yummy Box', "Chef {chef}'s", 'The Wobbly Jelly', 'Crumbs & Co', 'The Sunny Side',
];
