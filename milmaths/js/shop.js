// ---------- What XP is for ----------
//
// Three shelves. **Milbils** are who sits beside you while you work — every one
// of them has turned up in another game on this account, which is the whole
// point of them. **Parts** are for building a milbil of your own in the Milbil
// Workshop. **Features** change how the game plays: a hint button, somewhere to
// scribble, a times table poster on the wall.
//
// Buying takes XP out of your pocket, but your *total* XP never goes down, so
// spending can never cost you a rank. Prices climb steeply on purpose: a clean
// run of MilMATHS pays about 6,900 XP, and there is a great deal more than that
// on the shelves.

export const MILBILS = [
  { id:'common',  name:'Common Milbil', cost:0,    look:{ line:'#8b7bff' },
    from:'Every milbil game there has ever been',
    blurb:'The one everybody starts with. A box, a face, a tummy, four sticks.' },
  { id:'sprouty', name:'Sprouty',       cost:120,  look:{ line:'#4cbb4a', hat:'sprout' },
    from:'Milbil Lunchbox · Milbil Café · Milbil.io',
    blurb:'Grows cress on the windowsill and counts the shoots every morning.' },
  { id:'giggle',  name:'Giggle',        cost:200,  look:{ line:'#ff6fae', eyes:'happy', mouth:'open' },
    from:'Milbil Lunchbox · Milbil Café · Milbil Go',
    blurb:'Laughs at absolutely everything, including long division.' },
  { id:'toothy',  name:'Toothy',        cost:320,  look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' },
    from:'Milbil Lunchbox · Milbil Café · Ningy-Ningy Canteen',
    blurb:'Has a wobbly tooth and is extremely serious about times tables.' },
  { id:'snooze',  name:'Snooze',        cost:450,  look:{ line:'#7aa7ff', eyes:'sleepy' },
    from:'Milbil Lunchbox · Milbil.io · Milbil Go',
    blurb:'Fell asleep during the explanation. Gets the right answer anyway.' },
  { id:'freckles',name:'Freckles',      cost:600,  look:{ line:'#ff8a5b', extra:'freckles' },
    from:'Milbil Lunchbox · Milbil Café · Milbil Garden',
    blurb:'Counts the freckles when bored. Has never got the same number twice.' },
  { id:'brainy',  name:'Brainy',        cost:800,  look:{ line:'#2bb5a0', extra:'glasses' },
    from:'Milbil Café · Milbil Go · Milbil.io',
    blurb:'Read a book about prime numbers and has not stopped talking about it.' },
  { id:'chomp',   name:'Chomp',         cost:1000, art:'art/chomp.png',
    from:'Milbil Café · Milbil Town 3D · Milbil Lunchbox',
    blurb:"One of Greta's own drawings. Hungry. Always." },
  { id:'hattie',  name:'Hattie',        cost:1150, art:'art/hattie.png',
    from:'Milbil Café · Milbil Town 3D · Milbil Lunchbox',
    blurb:"Another of Greta's drawings. Never seen without the hat." },
  { id:'sporty',  name:'Sporty',        cost:1200, look:{ line:'#e05252', hat:'cap' },
    from:'Milbil Café · Milbil Lunchbox · Milbil Go',
    blurb:'Works out everything in terms of goals scored.' },
  { id:'petal',   name:'Petal',         cost:1500, art:'art/petal.png',
    from:'Milbil Café · Milbil Town 3D · Milbil Lunchbox',
    blurb:"Greta drew this one too. Does maths very slowly and very neatly." },
  { id:'scoop',   name:'Scoop',         cost:1650, art:'art/scoop.png',
    from:'Milbil Café · Milbil Town 3D · Milbil Go',
    blurb:"Greta drew this one as well. Measures everything, twice." },
  { id:'cosy',    name:'Cosy',          cost:1800, look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' },
    from:'Milbil Lunchbox · Milbil Café · Milbil.io',
    blurb:'Wears the scarf indoors. Will not start until everyone is comfortable.' },
  { id:'wizzle',  name:'Wizzle',        cost:2200, look:{ line:'#6a5cff', hat:'wizard' },
    from:'Milbil Café · Ningy-Ningy Canteen',
    blurb:'Claims the answers are magic. They are not. They are arithmetic.' },
  { id:'sunny',   name:'Sunny',         cost:2600, art:'art/sunny.png',
    from:'Milbil Café · Milbil Town 3D · Milbil Lunchbox',
    blurb:"The third of Greta's drawings, and the cheerful one." },
  { id:'starry',  name:'Starry',        cost:3200, look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' },
    from:'Milbil Café · Milbil Go · Milbil.io',
    blurb:'Only turns up for people who have finished a whole stage.' },
  { id:'royal',   name:'Royal',         cost:4000, look:{ line:'#e0b000', hat:'crown', extra:'cape' },
    from:'Milbil Café · Milbil Go · Ningy-Ningy Canteen',
    blurb:'The most expensive milbil in the shop, and knows it.' },
  { id:'rainbow', name:'Rainbow Milbil',cost:5000, look:{ line:'rainbow', eyes:'sparkle', hat:'party' },
    from:'Nowhere yet. MilMATHS is the first.',
    blurb:'Every colour at once. If you own this, you have done the lot.' },
];

export const MILBIL = Object.fromEntries(MILBILS.map(m => [m.id, m]));


// ------------------------------------------------------------------ parts ---
//
// The Milbil Workshop. Buy a part once and it is yours to use in any
// combination for ever. Everything here feeds straight into drawLook(), so a
// built milbil is drawn by exactly the same code as the ones in the shop.

export const PARTS = [
  // colours — the outline, which is most of what a milbil looks like
  { id:'c-violet',  group:'colour', name:'Violet',    cost:0,    set:{ line:'#8b7bff' } },
  { id:'c-green',   group:'colour', name:'Green',     cost:0,    set:{ line:'#4cbb4a' } },
  { id:'c-blue',    group:'colour', name:'Blue',      cost:0,    set:{ line:'#3f7fe0' } },
  { id:'c-pink',    group:'colour', name:'Pink',      cost:40,   set:{ line:'#ff6fae' } },
  { id:'c-orange',  group:'colour', name:'Orange',    cost:40,   set:{ line:'#ff8a5b' } },
  { id:'c-teal',    group:'colour', name:'Teal',      cost:60,   set:{ line:'#2bb5a0' } },
  { id:'c-red',     group:'colour', name:'Red',       cost:60,   set:{ line:'#e05252' } },
  { id:'c-gold',    group:'colour', name:'Gold',      cost:150,  set:{ line:'#e0b000' } },
  { id:'c-ink',     group:'colour', name:'Midnight',  cost:200,  set:{ line:'#4b3f6b' } },
  { id:'c-rainbow', group:'colour', name:'Rainbow',   cost:900,  set:{ line:'rainbow' } },

  // hats
  { id:'h-none',    group:'hat', name:'No hat',       cost:0,    set:{ hat:'' } },
  { id:'h-sprout',  group:'hat', name:'Sprout',       cost:60,   set:{ hat:'sprout' } },
  { id:'h-cap',     group:'hat', name:'Cap',          cost:80,   set:{ hat:'cap' } },
  { id:'h-beanie',  group:'hat', name:'Beanie',       cost:80,   set:{ hat:'beanie' } },
  { id:'h-straw',   group:'hat', name:'Straw hat',    cost:120,  set:{ hat:'straw' } },
  { id:'h-flowers', group:'hat', name:'Flower crown', cost:160,  set:{ hat:'flowers' } },
  { id:'h-party',   group:'hat', name:'Party hat',    cost:160,  set:{ hat:'party' } },
  { id:'h-chef',    group:'hat', name:"Chef's hat",   cost:220,  set:{ hat:'chef' } },
  { id:'h-wizard',  group:'hat', name:'Wizard hat',   cost:300,  set:{ hat:'wizard' } },
  { id:'h-crown',   group:'hat', name:'Crown',        cost:500,  set:{ hat:'crown' } },

  // eyes
  { id:'e-dots',    group:'eyes', name:'Dots',        cost:0,    set:{ eyes:'' } },
  { id:'e-happy',   group:'eyes', name:'Happy',       cost:0,    set:{ eyes:'happy' } },
  { id:'e-sleepy',  group:'eyes', name:'Sleepy',      cost:50,   set:{ eyes:'sleepy' } },
  { id:'e-wink',    group:'eyes', name:'Wink',        cost:70,   set:{ eyes:'wink' } },
  { id:'e-big',     group:'eyes', name:'Big eyes',    cost:110,  set:{ eyes:'big' } },
  { id:'e-cross',   group:'eyes', name:'Cross',       cost:110,  set:{ eyes:'cross' } },
  { id:'e-sparkle', group:'eyes', name:'Sparkly',     cost:260,  set:{ eyes:'sparkle' } },

  // mouths
  { id:'m-smile',   group:'mouth', name:'Smile',      cost:0,    set:{ mouth:'' } },
  { id:'m-open',    group:'mouth', name:'Open wide',  cost:50,   set:{ mouth:'open' } },
  { id:'m-teeth',   group:'mouth', name:'Teeth',      cost:90,   set:{ mouth:'teeth' } },

  // one extra thing
  { id:'x-none',    group:'extra', name:'Nothing',    cost:0,    set:{ extra:'' } },
  { id:'x-freckles',group:'extra', name:'Freckles',   cost:60,   set:{ extra:'freckles' } },
  { id:'x-glasses', group:'extra', name:'Glasses',    cost:90,   set:{ extra:'glasses' } },
  { id:'x-bow',     group:'extra', name:'Bow',        cost:90,   set:{ extra:'bow' } },
  { id:'x-scarf',   group:'extra', name:'Scarf',      cost:130,  set:{ extra:'scarf' } },
  { id:'x-apron',   group:'extra', name:'Apron',      cost:130,  set:{ extra:'apron' } },
  { id:'x-cape',    group:'extra', name:'Cape',       cost:400,  set:{ extra:'cape' } },

  // a badge on the tummy
  { id:'b-none',    group:'badge', name:'No badge',   cost:0,    set:{ badge:'' } },
  { id:'b-star',    group:'badge', name:'Gold star',  cost:350,  set:{ badge:'star' } },
];

export const PART = Object.fromEntries(PARTS.map(p => [p.id, p]));

export const PART_GROUPS = [
  { id:'colour', name:'Colour', key:'line' },
  { id:'hat',    name:'Hat',    key:'hat' },
  { id:'eyes',   name:'Eyes',   key:'eyes' },
  { id:'mouth',  name:'Mouth',  key:'mouth' },
  { id:'extra',  name:'Extra',  key:'extra' },
  { id:'badge',  name:'Badge',  key:'badge' },
];

/** The parts everybody has from the start. */
export const FREE_PARTS = PARTS.filter(p => p.cost === 0).map(p => p.id);

/** Turn a set of chosen part ids into a look drawLook() understands. */
export function lookFromParts(chosen = {}){
  const look = { line:'#8b7bff' };
  for (const g of PART_GROUPS){
    const p = PART[chosen[g.id]];
    if (p) Object.assign(look, p.set);
  }
  return look;
}

// ---------------------------------------------------------------- features ---
//
// `kind` says how the game treats it:
//   tool   — a button that appears while you are answering
//   boost  — changes how XP or marking works
//   look   — changes how the game looks or sounds

export const FEATURES = [
  { id:'hints', name:'Hint Button', cost:250, icon:'💡', kind:'tool',
    blurb:'A nudge in the right direction on the questions that have one. It never gives the answer away.' },
  { id:'scratch', name:'Scratch Pad', cost:350, icon:'✏️', kind:'tool',
    blurb:'Somewhere to work it out. Opens over the question and wipes itself clean each time.' },
  { id:'numberline', name:'Number Line', cost:400, icon:'📏', kind:'tool',
    blurb:'A number line from −10 to 20 you can pull up whenever you want one.' },
  { id:'poster', name:'Times Table Poster', cost:500, icon:'🧾', kind:'tool',
    blurb:'The whole 12 × 12 grid, on the wall, for ever. Looking is allowed.' },
  { id:'secondgo', name:'Second Go', cost:650, icon:'↩️', kind:'boost',
    blurb:'One wrong answer per lesson stops counting against your stars. Everybody has an off question.' },
  { id:'snooze', name:'Five More Minutes', cost:450, icon:'⏱️', kind:'boost',
    blurb:'A button that adds five minutes to the timer when it runs out. Use it honestly.' },
  { id:'streak', name:'Streak Bonus', cost:900, icon:'🔥', kind:'boost',
    blurb:'Three right in a row and every question after it is worth 2 XP more, until you slip.' },
  { id:'double', name:'Double XP', cost:2000, icon:'✨', kind:'boost',
    blurb:'Every new lesson is worth twice the XP from now on. Expensive, and worth it if you buy it early.' },
  { id:'confetti', name:'Confetti', cost:150, icon:'🎊', kind:'look',
    blurb:'Finishing a lesson sets off a shower of paper. Purely a waste of XP. Highly recommended.' },
  { id:'sounds', name:'Sound Effects', cost:200, icon:'🔊', kind:'look',
    blurb:'Little beeps and bloops for right, wrong and finished.' },
  { id:'night', name:'Night Mode', cost:300, icon:'🌙', kind:'look',
    blurb:'Dark everything, for doing maths under the covers when you should be asleep.' },
  { id:'board', name:'Blackboard Theme', cost:700, icon:'🟩', kind:'look',
    blurb:'Chalk on green. Makes the whole thing look like a real classroom.' },
];

export const FEATURE = Object.fromEntries(FEATURES.map(f => [f.id, f]));

export const FEATURE_GROUPS = [
  { kind:'tool',  name:'Things to use',   note:'Buttons that turn up while you are answering.' },
  { kind:'boost', name:'Things that help', note:'They change the marking or the XP.' },
  { kind:'look',  name:'Things to look at', note:'Pure decoration. No help at all.' },
];

/** Ranks, by total XP ever earned. Spending never takes one away. */
export const RANKS = [
  { at:0,    name:'Counter',      icon:'🐣' },
  { at:200,  name:'Adder',        icon:'➕' },
  { at:500,  name:'Timeser',      icon:'✖️' },
  { at:1000, name:'Fractioneer',  icon:'🍕' },
  { at:1800, name:'Decimalist',   icon:'🔸' },
  { at:2700, name:'Measurer',     icon:'📐' },
  { at:3600, name:'Algebraist',   icon:'🧮' },
  { at:4600, name:'Milbil Maths Champion', icon:'👑' },
];

export const rankFor = (totalXp) => [...RANKS].reverse().find(r => totalXp >= r.at) || RANKS[0];
export const nextRank = (totalXp) => RANKS.find(r => totalXp < r.at) || null;
