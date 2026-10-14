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
// Steps are [ingredient, action, what the recipe card says].

const D = (id, tier, name, dish, price, steps, serve = 'Serve it!') =>
  ({ id, tier, name, dish, price, serve, steps: steps.map(([ing, act, text]) => ({ ing, act, text })) });

export const DISHES = [
  // Little Café
  D('nachos', 1, 'Nachos with Guacamole', 'bowl', 14, [
    ['nachos', 'pour', 'Pour the nachos into the bowl'],
    ['avocado', 'mash', 'Mash the avocado'],
    ['onion', 'chop', 'Chop the onion'],
  ], 'Serve together!'),
  D('jamtoast', 1, 'Jam Toast', 'plate', 10, [
    ['bread', 'toast', 'Toast the bread'],
    ['butter', 'spread', 'Spread the butter'],
    ['jam', 'spread', 'Spread the jam'],
  ], 'Serve it warm!'),
  D('fruitsalad', 1, 'Fruit Salad', 'bowl', 12, [
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['banana', 'chop', 'Chop the banana'],
    ['blueberries', 'add', 'Add the blueberries'],
  ]),
  D('smoothie', 1, 'Berry Smoothie', 'glass', 11, [
    ['milk', 'pour', 'Pour the milk into the glass'],
    ['banana', 'blend', 'Blend the banana'],
    ['strawberry', 'blend', 'Blend the strawberries'],
  ], 'Serve it cold!'),

  // Corner Bistro
  D('pancakes', 2, 'Pancakes', 'plate', 20, [
    ['batter', 'cook', 'Cook the pancakes'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['syrup', 'pour', 'Pour on the syrup'],
  ]),
  D('hotchoc', 2, 'Hot Chocolate', 'mug', 18, [
    ['milk', 'pour', 'Pour the milk into the mug'],
    ['cocoa', 'stir', 'Stir in the cocoa'],
    ['marshmallow', 'add', 'Add the marshmallows'],
  ], 'Serve it hot!'),
  D('salad', 2, 'Garden Salad', 'bowl', 22, [
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['tomato', 'chop', 'Chop the tomato'],
    ['cucumber', 'chop', 'Slice the cucumber'],
    ['dressing', 'shake', 'Shake on the dressing'],
  ]),
  D('hotdog', 2, 'Hot Dog', 'plate', 24, [
    ['hotdogbun', 'add', 'Put the bun on the plate'],
    ['sausage', 'cook', 'Cook the sausage'],
    ['ketchup', 'squeeze', 'Squeeze on the ketchup'],
    ['mustard', 'squeeze', 'Squeeze on the mustard'],
  ]),

  // Family Restaurant
  D('burger', 3, 'Cheeseburger', 'plate', 34, [
    ['bun', 'add', 'Put the bun on the plate'],
    ['patty', 'cook', 'Cook the burger'],
    ['cheese', 'add', 'Add a slice of cheese'],
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['ketchup', 'squeeze', 'Squeeze on the ketchup'],
  ]),
  D('spaghetti', 3, 'Spaghetti', 'bowl', 32, [
    ['spaghetti', 'boil', 'Boil the spaghetti'],
    ['tomsauce', 'pour', 'Pour on the tomato sauce'],
    ['cheese', 'grate', 'Grate the cheese'],
    ['herbs', 'add', 'Add the basil'],
  ]),
  D('tacos', 3, 'Tacos', 'plate', 30, [
    ['tacoshell', 'add', 'Put the taco shell on the plate'],
    ['mince', 'fry', 'Fry the mince'],
    ['lettuce', 'chop', 'Chop the lettuce'],
    ['cheese', 'grate', 'Grate the cheese'],
  ]),
  D('sundae', 3, 'Ice Cream Sundae', 'coupe', 28, [
    ['icecream', 'add', 'Scoop in the ice cream'],
    ['banana', 'chop', 'Slice the banana'],
    ['chocsauce', 'pour', 'Pour on the chocolate sauce'],
    ['sprinkles', 'shake', 'Shake on the sprinkles'],
    ['cherry', 'add', 'Pop a cherry on top'],
  ]),

  // Grand Diner
  D('pizza', 4, 'Pepperoni Pizza', 'plate', 50, [
    ['dough', 'roll', 'Roll out the dough'],
    ['tomsauce', 'spread', 'Spread the tomato sauce'],
    ['cheese', 'grate', 'Grate the cheese'],
    ['pepperoni', 'add', 'Add the pepperoni'],
  ]),
  D('friedrice', 4, 'Fried Rice', 'bowl', 46, [
    ['rice', 'fry', 'Fry the rice'],
    ['egg', 'cook', 'Cook the egg'],
    ['peas', 'add', 'Add the peas'],
    ['carrot', 'chop', 'Chop the carrot'],
    ['soysauce', 'squeeze', 'Squeeze on the soy sauce'],
  ]),
  D('milkshake', 4, 'Strawberry Milkshake', 'glass', 44, [
    ['milk', 'pour', 'Pour the milk into the glass'],
    ['strawberry', 'blend', 'Blend the strawberries'],
    ['icecream', 'add', 'Add a scoop of ice cream'],
    ['cream', 'squeeze', 'Squirt on the cream'],
    ['cherry', 'add', 'Pop a cherry on top'],
  ], 'Serve it with a smile!'),
  D('waffles', 4, 'Waffles', 'plate', 48, [
    ['waffle', 'toast', 'Toast the waffle'],
    ['icecream', 'add', 'Add a scoop of ice cream'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['chocsauce', 'pour', 'Pour on the chocolate sauce'],
  ]),

  // Milbil Palace
  D('cake', 5, 'Birthday Cake', 'plate', 90, [
    ['cake', 'add', 'Put the cake on the plate'],
    ['icing', 'spread', 'Spread the icing'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['sprinkles', 'shake', 'Shake on the sprinkles'],
    ['candle', 'add', 'Add a candle'],
  ], 'Serve it and sing!'),
  D('ramen', 5, 'Ramen', 'bowl', 80, [
    ['broth', 'pour', 'Pour the broth into the bowl'],
    ['noodles', 'boil', 'Boil the noodles'],
    ['egg', 'cook', 'Cook the egg'],
    ['springonion', 'chop', 'Chop the spring onion'],
    ['seaweed', 'add', 'Add the seaweed'],
  ]),
  D('curry', 5, 'Chicken Curry', 'bowl', 85, [
    ['rice', 'add', 'Scoop the rice into the bowl'],
    ['chicken', 'fry', 'Fry the chicken'],
    ['carrot', 'chop', 'Chop the carrot'],
    ['currysauce', 'pour', 'Pour on the curry sauce'],
    ['herbs', 'add', 'Add the herbs'],
  ]),
  D('tart', 5, 'Fruit Tart', 'plate', 75, [
    ['dough', 'roll', 'Roll out the pastry'],
    ['cream', 'spread', 'Spread the cream'],
    ['strawberry', 'chop', 'Chop the strawberries'],
    ['blueberries', 'add', 'Add the blueberries'],
    ['honey', 'pour', 'Drizzle on the honey'],
  ]),
];
export const DISH = Object.fromEntries(DISHES.map(d => [d.id, d]));

// ---------------------------------------------------------- restaurants ---
// Moving up keeps your tables and machines. `cols` is how the tables are laid
// out on the floor.

export const TIERS = [
  { n: 1, name: 'Little Café',       cost: 0,    maxTables: 3,  cols: 2, windows: 1,
    wall: '#ffe7d1', wall2: '#ffd9b8', floor: '#f2dcbf', floor2: '#ead0ae', accent: '#ff8a5c', cloth: '#ffffff' },
  { n: 2, name: 'Corner Bistro',     cost: 200,  maxTables: 5,  cols: 2, windows: 2,
    wall: '#dff1e4', wall2: '#c9e7d2', floor: '#e9dcc8', floor2: '#ddcdb4', accent: '#3fae6a', cloth: '#fff6e8' },
  { n: 3, name: 'Family Restaurant', cost: 700,  maxTables: 7,  cols: 3, windows: 2,
    wall: '#e1ecff', wall2: '#cddcfa', floor: '#f0e2cc', floor2: '#e4d3b8', accent: '#4c7df0', cloth: '#ffffff' },
  { n: 4, name: 'Grand Diner',       cost: 1800, maxTables: 9,  cols: 3, windows: 3,
    wall: '#ffe3ec', wall2: '#ffcfdd', floor: '#f7f4fb', floor2: '#ddd5ea', accent: '#ef476f', cloth: '#ffffff' },
  { n: 5, name: 'Milbil Palace',     cost: 4500, maxTables: 12, cols: 3, windows: 3,
    wall: '#efe4ff', wall2: '#e0cffd', floor: '#f6ead2', floor2: '#ecd9b5', accent: '#8b5cf6', cloth: '#fff8e1' },
];

export const START_TABLES = 2;
// What the 3rd, 4th … 12th table costs.
export const TABLE_COSTS = [40, 70, 110, 160, 220, 290, 370, 460, 560, 670];
export const tableCost = (owned) => TABLE_COSTS[owned - START_TABLES] ?? Infinity;

// Ordering machines: customers order on these as they walk in, and every
// order shows up in the 🧾 Orders list.
export const MACHINE_COSTS = [100, 400, 1200];

// ------------------------------------------------------------ customers ---

export const START_COINS = 20;
export const EAT_SECONDS = 8;
/** Seconds between customers walking in, while there's a free table. */
export const spawnGap = (tables, machines) => Math.max(5, 20 - 1.2 * tables - 2.5 * machines);
/** A tip for being quick, as a share of the price. */
export const tipShare = (waitedSec) => waitedSec < 45 ? 0.25 : waitedSec < 90 ? 0.1 : 0;
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
