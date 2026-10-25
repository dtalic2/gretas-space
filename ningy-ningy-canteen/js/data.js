// ---------- Every number in Ningy-Ningy Canteen ----------
//
// Money is kept in cents, and every price in the game is a multiple of 50c so
// the sums stay easy: the supermarket, its deals, your menu, the milbils'
// lunch money and what they put aside for tomorrow.

export const STEP = 50;               // everything moves in 50c steps
export const START_MONEY = 2000;      // $20 to buy your first lot of food
export const PRICE_MAX = 1000;        // nobody's charging more than $10
export const FAIR = 2;                // milbils expect double the shop's normal price
export const LIGHTS = 1.15;           // ...and a bit more for a truck with fairy lights

// --------------------------------------------------------------- the clock ---
//
// Lunch runs from 11:00 until 2:00. Parked, a minute of game time is a second
// of real time. Driving, the clock spins five times faster so a trip across
// town takes a few seconds rather than half a minute.

export const DAY_START = 11 * 60;
export const DAY_LEN = 180;
export const CLOCK_RATE = 1;          // game minutes per real second, parked
export const DRIVE_RATE = 5;          // game minutes per real second, driving
export const ROAD_SPEED = 16;         // map units per game minute
export const TURBO = 1.8;             // how much faster the turbo engine is
export const PATIENCE = 55;           // minutes a milbil will stand in the queue
export const UMBRELLA = 1.5;          // ...in the shade of an umbrella
export const ARRIVE_SPREAD = 26;      // minutes for a spot's crowd to wander over
export const JINGLE = 0.5;            // ...when they can hear the jingle

// ----------------------------------------------------------------- the food ---
//
// What the supermarket sells. `price` is the normal price of a whole pack, and
// `size` is how many things you can sell out of one: a packet of ice blocks
// has 4 in it. Spring rolls are bought and sold as the whole 6-pack. Milbils
// buy one thing at a time, and expect to pay about double what that one thing
// cost you on a normal (not a deal) day — so Billy's shows the price of one,
// and the pack it comes in underneath.

export const PRODUCTS = [
  { id:'iceblock', name:'Ice Block', plural:'Ice Blocks', a:'an Ice Block', kind:'treat',
    pack:'Ice Block Packet', per:'packet', size:4, price:200, inPack:'Comes in a packet of 4',
    blurb:'Like an ice cream on a stick.' },
  { id:'springrolls', name:'Spring Rolls', plural:'6-packs of Spring Rolls', a:'a 6-pack of Spring Rolls', kind:'main',
    pack:'6-Pack of Spring Rolls', size:1, price:200, unit:'6-pack',
    blurb:'Six crispy spring rolls. You sell the whole pack.' },
  { id:'kofta', name:'Lamb Kofta', plural:'Lamb Koftas', a:'a Lamb Kofta', kind:'main',
    pack:'Lamb Kofta', size:1, price:100, blurb:'On a stick, straight off the grill.' },
  { id:'beefbowl', name:'Beef Bowl', plural:'Beef Bowls', a:'a Beef Bowl', kind:'main',
    pack:'Beef Bowl', size:1, price:150, blurb:'Beef on rice. Filling.' },
  { id:'veggiebowl', name:'Veggie Bowl', plural:'Veggie Bowls', a:'a Veggie Bowl', kind:'main',
    pack:'Veggie Bowl', size:1, price:150, blurb:'Rice, broccoli, carrot and corn.' },
  { id:'sushi', name:'Avocado Sushi', plural:'Avocado Sushis', a:'an Avocado Sushi', kind:'main',
    pack:'Avocado Sushi', size:1, price:100, blurb:'Two rolls with avocado in the middle.' },
  { id:'juice', name:'Juice', plural:'Juices', a:'a Juice', kind:'drink',
    pack:'Juice Pack', per:'pack', size:4, price:200, inPack:'Comes in a pack of 4',
    blurb:'Orange juice with a bendy straw.' },
  { id:'popcake', name:'Pop Cake', plural:'Pop Cakes', a:'a Pop Cake', kind:'treat',
    pack:'Pop Cake', size:1, price:50, unlock:10, blurb:'A little round cake on a stick, with sprinkles.' },
  { id:'waffle', name:'Portable Waffle', plural:'Portable Waffles', a:'a Portable Waffle', kind:'treat',
    pack:'Portable Waffle', size:1, price:200, unlock:30, blurb:'A warm waffle folded into a paper sleeve, so you can walk and eat.' },
];
export const PRODUCT = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

/** Round to the nearest 50c. */
export const round50 = (c) => Math.round(c / STEP) * STEP;
/** What one thing out of the pack costs you on a normal day. */
export const unitCost = (p) => p.price / p.size;
/** What milbils think one thing ought to cost at a canteen. */
export const fairPrice = (p) => Math.max(STEP, round50(unitCost(p) * FAIR));

// ------------------------------------------------------- what milbils think ---
//
// How a price looks to the average milbil, as a fraction of the fair price.
// Each milbil has their own limit (`fussy` below): over it they won't buy that
// thing at all, and anything over fair means they skip the extras.

export const FACES = [
  { upTo: 0.75,     face:'🤩', text:'A bargain!' },
  { upTo: 1.0,      face:'😀', text:'Fair' },
  { upTo: 1.2,      face:'😐', text:'A bit pricey' },
  { upTo: 1.45,     face:'😬', text:'Pricey' },
  { upTo: Infinity, face:'😡', text:'Way too much!' },
];
export const faceFor = (ratio) => FACES.find(f => ratio <= f.upTo + 1e-9);

// ------------------------------------------------------------- Milbil Town ---
//
// Places on the map, and the junctions between them. Coordinates are in the
// map's own 360 × 470 box. `likes` nudges what milbils there feel like: it's
// hot at the beach, and the sports field is hungry.

export const SPOTS = [
  { id:'super',   name:"Billy's Supermarket", short:"Billy's", icon:'🛒', at:[180, 235], shop:true,
    sky:['#bfe6ff', '#e4f5ff'], ground:'#c9c3d1', props:['🛒', '🏪'] },
  { id:'school',  name:'Milbil School', short:'School', icon:'🏫', at:[62, 78],
    likes:{ iceblock:1, popcake:1, springrolls:0.5 },
    sky:['#a9dcff', '#e3f4ff'], ground:'#8fd16a', props:['🏫', '🛝', '🎒'] },
  { id:'library', name:'The Library', short:'Library', icon:'📚', at:[298, 78],
    likes:{ sushi:1, juice:0.5 },
    sky:['#c5d6ff', '#eef2ff'], ground:'#b9d98a', props:['🏛️', '📚', '🪑'] },
  { id:'park',    name:'Bilberry Park', short:'Park', icon:'🌳', at:[62, 235],
    likes:{ iceblock:0.5, waffle:0.5, juice:0.5 },
    sky:['#a6e3ff', '#e6f9ff'], ground:'#7fcf5a', props:['🌳', '🌷', '🦆', '🌳'] },
  { id:'square',  name:'Town Square', short:'Square', icon:'⛲', at:[298, 235],
    likes:{ sushi:0.5, veggiebowl:0.5, waffle:0.5 },
    sky:['#b4dcff', '#f0f7ff'], ground:'#d6c7b0', props:['⛲', '🏢', '🕰️'] },
  { id:'field',   name:'Sports Field', short:'Field', icon:'⚽', at:[62, 392],
    likes:{ beefbowl:1, kofta:1, juice:1 },
    sky:['#9fd8ff', '#e0f3ff'], ground:'#6cc24a', props:['🥅', '⚽', '🏃'] },
  { id:'beach',   name:'Ningy Beach', short:'Beach', icon:'🏖️', at:[298, 392],
    likes:{ iceblock:1.5, juice:1 },
    sky:['#8fd3ff', '#fff3c4'], ground:'#f5dc95', props:['🌊', '⛱️', '🐚', '🦀'] },
];
export const SPOT = Object.fromEntries(SPOTS.map(s => [s.id, s]));
export const PLACES = SPOTS.filter(s => !s.shop);

export const JUNCTIONS = [
  { id:'top',    at:[180, 78] },
  { id:'bottom', at:[180, 392] },
];
export const ROADS = [
  ['school', 'top'], ['top', 'library'],
  ['park', 'super'], ['super', 'square'],
  ['field', 'bottom'], ['bottom', 'beach'],
  ['school', 'park'], ['park', 'field'],
  ['top', 'super'], ['super', 'bottom'],
  ['library', 'square'], ['square', 'beach'],
];

// ----------------------------------------------------------------- milbils ---
//
//   spot    where they usually have lunch (three days in four)
//   money   lunch money they get every day, before what they saved yesterday
//   likes   what they'd pick first
//   fussy   the most they'll pay, as a fraction of the fair price
//   saver   how often they put some money aside for tomorrow
//
// Their lunch money averages out at about $4.50.

export const MILBILS = [
  // --- Milbil School ---
  { id:'sprouty', name:'Sprouty', spot:'school', money:350, likes:['veggiebowl', 'sushi'], fussy:1.25, saver:0.2,
    look:{ line:'#4cbb4a', hat:'sprout' }, blurb:'Eats anything green, and some things that aren\'t.' },
  { id:'giggle', name:'Giggle', spot:'school', money:300, likes:['iceblock', 'popcake'], fussy:1.35, saver:0.1,
    look:{ line:'#ff6fae', eyes:'happy', mouth:'open' }, blurb:'Laughs at everything, especially pudding.' },
  { id:'toothy', name:'Toothy', spot:'school', money:400, likes:['springrolls', 'kofta'], fussy:1.2, saver:0.2,
    look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' }, blurb:'Likes anything that goes crunch.' },
  { id:'freckles', name:'Freckles', spot:'school', money:350, likes:['juice', 'iceblock'], fussy:1.3, saver:0.3,
    look:{ line:'#ff8a5b', extra:'freckles' }, blurb:'Always thirsty after handball.' },
  { id:'chomp', name:'Chomp', spot:'school', money:550, likes:['beefbowl', 'kofta', 'springrolls'], fussy:1.4, saver:0.1,
    art:'art/chomp.png', blurb:'The hungriest milbil at school. Will eat two lunches if you let them.' },
  { id:'doodle', name:'Doodle', spot:'school', money:300, likes:['popcake', 'juice'], fussy:1.3, saver:0.4,
    look:{ line:'#14b8a6', hat:'party', eyes:'happy' }, blurb:'Draws on every napkin.' },

  // --- Bilberry Park ---
  { id:'petal', name:'Petal', spot:'park', money:450, likes:['veggiebowl', 'juice'], fussy:1.3, saver:0.3,
    art:'art/petal.png', blurb:'Has a picnic in the park every single day.' },
  { id:'snooze', name:'Snooze', spot:'park', money:400, likes:['waffle', 'springrolls'], fussy:1.25, saver:0.5,
    look:{ line:'#7aa7ff', eyes:'sleepy' }, blurb:'Naps under the big tree. Saves up for waffles.' },
  { id:'bobbin', name:'Bobbin', spot:'park', money:400, likes:['sushi', 'iceblock'], fussy:1.3, saver:0.2,
    look:{ line:'#b05cf0', hat:'flowers' }, blurb:'Picks flowers, then picks lunch.' },
  { id:'puddle', name:'Puddle', spot:'park', money:350, likes:['iceblock', 'popcake'], fussy:1.2, saver:0.3,
    look:{ line:'#38b6ff', hat:'straw', eyes:'big' }, blurb:'Feeds the ducks, then wants a treat.' },

  // --- Ningy Beach ---
  { id:'sunny', name:'Sunny', spot:'beach', money:500, likes:['iceblock', 'juice'], fussy:1.4, saver:0.1,
    art:'art/sunny.png', blurb:'Never leaves the beach if it can help it.' },
  { id:'scoop', name:'Scoop', spot:'beach', money:450, likes:['iceblock', 'waffle'], fussy:1.35, saver:0.2,
    art:'art/scoop.png', blurb:'Thinks everything is better frozen.' },
  { id:'fizz', name:'Fizz', spot:'beach', money:400, likes:['juice', 'springrolls'], fussy:1.25, saver:0.2,
    look:{ line:'#ff9a3c', hat:'cap', mouth:'open' }, blurb:'Builds sandcastles. Gets very thirsty.' },
  { id:'marzi', name:'Marzi', spot:'beach', money:450, likes:['iceblock', 'sushi'], fussy:1.3, saver:0.3,
    look:{ line:'#ff6fa5', extra:'bow', eyes:'sparkle' }, blurb:'Collects shells and spends pocket money carefully.' },

  // --- Sports Field ---
  { id:'sporty', name:'Sporty', spot:'field', money:550, likes:['beefbowl', 'juice'], fussy:1.3, saver:0.1,
    look:{ line:'#e05252', hat:'cap' }, blurb:'Runs ten laps, then eats a whole bowl.' },
  { id:'tumble', name:'Tumble', spot:'field', money:500, likes:['kofta', 'beefbowl'], fussy:1.25, saver:0.1,
    look:{ line:'#3fbf6a', hat:'beanie' }, blurb:'Falls over a lot. Gets up hungry.' },
  { id:'gus', name:'Gus', spot:'field', money:500, likes:['beefbowl', 'springrolls'], fussy:1.35, saver:0.2,
    look:{ line:'#5b6cff', mouth:'teeth' }, blurb:'The goalie. Big hands, big lunch.' },
  { id:'zig', name:'Zig', spot:'field', money:450, likes:['kofta', 'juice'], fussy:1.2, saver:0.2,
    look:{ line:'#e5484d', eyes:'wink' }, blurb:'Zigs when everyone else zags.' },

  // --- Town Square ---
  { id:'hattie', name:'Hattie', spot:'square', money:600, likes:['sushi', 'veggiebowl'], fussy:1.4, saver:0.2,
    art:'art/hattie.png', blurb:'Works in the big building by the fountain.' },
  { id:'royal', name:'Royal Milbil', spot:'square', money:750, likes:['waffle', 'sushi', 'beefbowl'], fussy:1.6, saver:0,
    look:{ line:'#e0b000', hat:'crown', extra:'cape' }, blurb:'Doesn\'t look at prices. Doesn\'t need to.' },
  { id:'cosy', name:'Cosy', spot:'square', money:500, likes:['veggiebowl', 'waffle'], fussy:1.3, saver:0.3,
    look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' }, blurb:'Wears a scarf even in summer.' },
  { id:'biscuit', name:'Biscuit', spot:'square', money:500, likes:['kofta', 'popcake'], fussy:1.25, saver:0.2,
    look:{ line:'#f2b707', hat:'chef' }, blurb:'A cook who\'s too busy to cook their own lunch.' },

  // --- The Library ---
  { id:'brainy', name:'Brainy', spot:'library', money:450, likes:['sushi', 'juice'], fussy:1.2, saver:0.4,
    look:{ line:'#2bb5a0', extra:'glasses' }, blurb:'Checks your prices against the supermarket\'s. Every time.' },
  { id:'wizzle', name:'Wizzle', spot:'library', money:500, likes:['veggiebowl', 'waffle'], fussy:1.3, saver:0.3,
    look:{ line:'#6a5cff', hat:'wizard' }, blurb:'Reads spell books over lunch.' },
];
export const MILBIL = Object.fromEntries(MILBILS.map(m => [m.id, m]));

// Milbils don't walk around with more than this left over from yesterday.
export const CARRY_MAX = 600;

// Overnight, a few milbils earn a bit extra.
export const JOBS = [
  'helped wash the car', 'walked the neighbour\'s dog', 'sold lemonade',
  'found a coin under the couch', 'tidied their whole room', 'did the dishes',
  'helped in the garden', 'got birthday money from Granny', 'fed the neighbour\'s cat',
  'swept the front path', 'sorted the recycling',
];

// ----------------------------------------------------------- truck upgrades ---

export const UPGRADES = [
  { id:'umbrella', name:'Shady Umbrella', icon:'⛱️', cost:1000,
    text:'Milbils wait half as long again in the queue before they give up.' },
  { id:'jingle', name:'Canteen Jingle', icon:'🎵', cost:1500,
    text:'Milbils hear you coming, so they walk over twice as fast.' },
  { id:'turbo', name:'Turbo Engine', icon:'🚀', cost:2500,
    text:'Drive around Milbil Town nearly twice as fast.' },
  { id:'lights', name:'Fairy Lights', icon:'💡', cost:4000,
    text:'Your truck looks so lovely that milbils will happily pay a little more before a price feels too high.' },
];
export const UPGRADE = Object.fromEntries(UPGRADES.map(u => [u.id, u]));

// -------------------------------------------------------------- you & truck ---

export const NAMES = [
  'Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Wix', 'Crumb', 'Pocket', 'Snug',
  'Fen', 'Tam', 'Ollo', 'Peep', 'Sprig', 'Noodle', 'Winkle', 'Bean', 'Pumpkin',
  'Radish', 'Jelly', 'Mopsy', 'Toffee', 'Button', 'Pudding', 'Ningy',
];
export const NAME_MAX = 14;
export const COLORS = [
  '#8b7bff', '#ff6fa5', '#ff9a3c', '#38b6ff', '#3fbf6a',
  '#e5484d', '#b05cf0', '#14b8a6', '#f2b707', '#5b6cff',
];
export const HATS = [
  { id:'chef',   name:'Chef\'s hat' },
  { id:'cap',    name:'Cap' },
  { id:'',       name:'No hat' },
  { id:'beanie', name:'Beanie' },
  { id:'straw',  name:'Straw hat' },
  { id:'party',  name:'Party hat' },
  { id:'flowers',name:'Flowers' },
];
export const TRUCKS = [
  '#ff7a59', '#38b6ff', '#ffc531', '#3fbf6a', '#ff6fa5', '#9b5de5', '#e5484d', '#14b8a6',
];
