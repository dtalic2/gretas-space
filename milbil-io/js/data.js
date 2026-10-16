// ---------- Every number in the game, and who's in it ----------

// The board is a round island cut out of a square grid of cells. Land, trails
// and catching all happen cell by cell; milbils walk smoothly between them.
export const GRID = 160;            // cells across the square the island sits in
export const RADIUS = 78;           // the island's radius, in cells
export const SPEED = 6.5;           // cells a second, the same for everyone
export const TURN = 4.4;            // radians a second, so the tightest turn is about 1.5 cells round
export const START_R = 2.6;         // radius of the patch of land you start with
export const SELF_GRACE = 6;        // your trail's last few cells can't catch you (they're under your feet)
export const STEP = 1 / 60;         // seconds per tick of the game
export const VIEW = 20;             // cells across the screen's shorter side
export const LIFT = 0.28;           // how far land stands up off the ground, in cells
export const BOTS = 10;             // other milbils on the island
export const RESPAWN = [2.5, 5];    // seconds before a caught bot comes back
export const MILESTONES = [1, 5, 10, 25, 50, 75, 100];   // % of the island worth a cheer

// How the other milbils play.
//   chase    how near (in cells) a trail has to be for them to go after it
//   you      how many of them will go after yours (each one decides when it
//            comes onto the island)
//   spare    whether they walk round your trail rather than across it (unless
//            they're chasing you)
//   loop     how far out they go, in cells, before they turn for home
//   care     how much head start they need before they hurry home: below 1
//            they cut it fine, and you can catch them out
//   think    seconds between plans (slower is clumsier)
export const LEVELS = {
  friendly: { e:'😊', name:'Friendly', blurb:'Leave you alone',     chase: 6,  you: 0,   spare: true,  loop: [4, 9],  care: 0.55, think: 0.25 },
  normal:   { e:'🙂', name:'Normal',   blurb:'Sometimes chase you', chase: 7,  you: .35, spare: true,  loop: [5, 12], care: 0.9,  think: 0.18 },
  sneaky:   { e:'😈', name:'Sneaky',   blurb:'Hunt you down',       chase: 18, you: 1,   spare: false, loop: [6, 16], care: 1.25, think: 0.12 },
};
export const LEVEL_IDS = Object.keys(LEVELS);

// Everyone you can play as, and everyone you play against. Five are Greta's own
// drawings; the rest are drawn milbils, the same kinds as in Milbil Café and
// Milbil GO. `color` is the colour of their land, and `short` is a name that
// fits on the leaderboard.
export const ROSTER = [
  { id:'chomp',   name:'Chomp',   art:'art/chomp.png',  color:'#4f5bd5' },
  { id:'hattie',  name:'Hattie',  art:'art/hattie.png', color:'#d65cd6' },
  { id:'scoop',   name:'Scoop',   art:'art/scoop.png',  color:'#37b24d' },
  { id:'petal',   name:'Petal',   art:'art/petal.png',  color:'#ff6f61' },
  { id:'sunny',   name:'Sunny',   art:'art/sunny.png',  color:'#f4b400' },
  { id:'common',  name:'Common Milbil', short:'Milbil', look:{ line:'#8b7bff' }, color:'#8b7bff' },
  { id:'sprouty', name:'Sprouty',  look:{ line:'#4cbb4a', hat:'sprout' } },
  { id:'freckles',name:'Freckles', look:{ line:'#ff8a5b', extra:'freckles' } },
  { id:'snooze',  name:'Snooze',   look:{ line:'#7aa7ff', eyes:'sleepy' } },
  { id:'giggle',  name:'Giggle',   look:{ line:'#ff6fae', eyes:'happy', mouth:'open' } },
  { id:'farmer',  name:'Farmer',   look:{ line:'#e0a02c', hat:'straw' } },
  { id:'sporty',  name:'Sporty',   look:{ line:'#e05252', hat:'cap' } },
  { id:'cosy',    name:'Cosy',     look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' } },
  { id:'bow',     name:'Bowtie',   look:{ line:'#ff5fa2', extra:'bow' } },
  { id:'brainy',  name:'Brainy',   look:{ line:'#2bb5a0', extra:'glasses' } },
  { id:'toothy',  name:'Toothy',   look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' } },
  { id:'party',   name:'Party',    look:{ line:'#ff9f1c', hat:'party', mouth:'open' } },
  { id:'blossom', name:'Blossom',  look:{ line:'#ff7eb6', hat:'flowers' } },
  { id:'scoopy',  name:'Scoopy',   look:{ line:'#ff8fc8', hold:'icecream', eyes:'happy' } },
  { id:'floaty',  name:'Floaty',   look:{ line:'#ff4d6d', hold:'balloon' } },
  { id:'starry',  name:'Starry',   look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' } },
  { id:'wizard',  name:'Wizzle',   look:{ line:'#6a5cff', hat:'wizard' } },
  { id:'royal',   name:'Royal',    look:{ line:'#e0b000', hat:'crown', extra:'cape' } },
  { id:'golden',  name:'Golden',   look:{ line:'#d99a00', fill:'#ffe27a', eyes:'sparkle' } },
  { id:'rainbow', name:'Rainbow',  look:{ line:'rainbow' }, color:'rainbow' },
  { id:'ghost',   name:'Boo',      look:{ line:'#9fb4ff', fill:'#eef2ff', ghost:true, eyes:'big' } },
];
for (const r of ROSTER) r.color ||= r.look.line;
export const ROSTER_BY_ID = Object.fromEntries(ROSTER.map(r => [r.id, r]));
export const GRETAS = ROSTER.filter(r => r.art).map(r => r.id);

// When two milbils on the island would have land of nearly the same colour, the
// second one gets the most different of these instead.
export const SPARE_COLORS = [
  '#ef476f', '#06d6a0', '#118ab2', '#ffd166', '#8338ec', '#fb5607', '#3a86ff', '#ff006e',
  '#2ec4b6', '#9ef01a', '#c77dff', '#f15bb5', '#00bbf9', '#8ac926', '#ff924c', '#e85d75',
];

// The island's own colours: black, so glowing milbils stand out.
export const SEA = '#020104';       // round the edge of the island
export const GROUND = '#0d0b14';    // land nobody owns yet
export const GROUND_2 = '#12101a';  // its checks, just enough to see you're moving
export const SIDE = '#1e1533';      // the island's edge, seen from the side
export const RIM = '#8a47e6';       // the glowing line round the island
export const GROUND_RGB = [13, 11, 20];
