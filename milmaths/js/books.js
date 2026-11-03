// ---------- The comic books ----------
//
// Sixteen comics, four to a stage, sitting in front of lessons 1, 4, 7 and 10.
// Every one is a scene from somewhere else on this account — the Milbil Café,
// the Lunchbox, the Garden, Ningy-Ningy's truck — with milbils you have met
// before working the idea out loud before you are asked to use it.
//
// A page is a list of panels, and a panel is one of three things:
//
//   { who:'sprouty', say:'…' }   somebody talking
//   { art:'fraction', cap:'…' }  a picture, with a line underneath
//   { cap:'…' }                  a caption box between the panels
//
// The pictures are inline SVG drawn against the theme's colour variables, so
// they turn into chalk on the Blackboard theme and glow in Night Mode without
// a second copy of anything.

import { drawLook, artHTML } from './milbil.js';
import { esc, mini } from './ui.js';

// Who turns up in the comics. Kept here rather than read out of the shop, so
// that a book reads the same whether or not you have bought anybody.
export const CAST = {
  sprouty:  { name:'Sprouty',  look:{ line:'#4cbb4a', hat:'sprout' } },
  giggle:   { name:'Giggle',   look:{ line:'#ff6fae', eyes:'happy', mouth:'open' } },
  toothy:   { name:'Toothy',   look:{ line:'#7d8cff', mouth:'teeth', eyes:'cross' } },
  snooze:   { name:'Snooze',   look:{ line:'#7aa7ff', eyes:'sleepy' } },
  freckles: { name:'Freckles', look:{ line:'#ff8a5b', extra:'freckles' } },
  brainy:   { name:'Brainy',   look:{ line:'#2bb5a0', extra:'glasses' } },
  sporty:   { name:'Sporty',   look:{ line:'#e05252', hat:'cap' } },
  cosy:     { name:'Cosy',     look:{ line:'#3f7fe0', hat:'beanie', extra:'scarf' } },
  wizzle:   { name:'Wizzle',   look:{ line:'#6a5cff', hat:'wizard' } },
  starry:   { name:'Starry',   look:{ line:'#ffc93c', eyes:'sparkle', badge:'star' } },
  royal:    { name:'Royal',    look:{ line:'#e0b000', hat:'crown', extra:'cape' } },
  chef:     { name:'Chef Bil', look:{ line:'#c86fd8', hat:'chef', extra:'apron' } },
  chomp:    { name:'Chomp',    art:'art/chomp.png' },
  petal:    { name:'Petal',    art:'art/petal.png' },
  sunny:    { name:'Sunny',    art:'art/sunny.png' },
  hattie:   { name:'Hattie',   art:'art/hattie.png' },
  scoop:    { name:'Scoop',    art:'art/scoop.png' },
};

export const castHTML = (id, cls = '') => {
  const c = CAST[id];
  if (!c) return '';
  return c.art ? artHTML(c.art, c.name, cls) : drawLook(c.look, { cls, title: c.name });
};

const INK = 'var(--ink)';
const MUTE = 'var(--muted)';

const box = (inner, w = 320, h = 120) =>
  `<svg class="art" viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">${inner}</svg>`;

const label = (x, y, text, size = 11, fill = MUTE) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="middle" font-weight="700">${text}</text>`;

export const ART = {

  // Three columns with 4, 7 and 2 in them, and what each one is worth.
  placevalue: () => box(`
    ${[0, 1, 2].map(i => `<rect x="${60 + i * 70}" y="26" width="60" height="52" rx="8"
        fill="var(--tint)" stroke="${INK}" stroke-width="2"/>`).join('')}
    ${['4', '7', '2'].map((d, i) => `<text x="${90 + i * 70}" y="62" font-size="27" fill="${INK}"
        text-anchor="middle" font-weight="900">${d}</text>`).join('')}
    ${['hundreds', 'tens', 'ones'].map((t, i) => label(90 + i * 70, 20, t)).join('')}
    ${['400', '70', '2'].map((v, i) => label(90 + i * 70, 96, v, 13, INK)).join('')}
    <text x="160" y="114" font-size="12" fill="${MUTE}" text-anchor="middle">400 + 70 + 2 = 472</text>`),

  // 40 to 50, with 47 sitting much nearer the 50 end.
  numberline: () => box(`
    <line x1="30" y1="60" x2="290" y2="60" stroke="${INK}" stroke-width="2.5"/>
    ${[0, 1].map(i => `<line x1="${30 + i * 260}" y1="44" x2="${30 + i * 260}" y2="76" stroke="${INK}" stroke-width="3"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${56 + i * 26}" y1="53" x2="${56 + i * 26}" y2="67" stroke="${MUTE}" stroke-width="1.5"/>`).join('')}
    ${label(30, 94, '40', 14, INK)}${label(290, 94, '50', 14, INK)}
    <circle cx="212" cy="60" r="8" fill="var(--gold)" stroke="${INK}" stroke-width="2"/>
    ${label(212, 34, '47', 14, INK)}
    <text x="120" y="112" font-size="11" fill="${MUTE}" text-anchor="middle">7 steps</text>
    <text x="251" y="112" font-size="11" fill="${MUTE}" text-anchor="middle">3 steps</text>`),

  // Six rows of four dots: the same rectangle whichever way you read it.
  array: () => box(`
    ${Array.from({ length: 6 }, (_, r) => Array.from({ length: 4 }, (_, c) =>
      `<circle cx="${112 + c * 24}" cy="${22 + r * 16}" r="6" fill="var(--accent)"/>`).join('')).join('')}
    <text x="96" y="62" font-size="13" fill="${INK}" text-anchor="end" font-weight="800">6 rows</text>
    <text x="216" y="14" font-size="13" fill="${INK}" text-anchor="start" font-weight="800">4 each</text>
    <text x="160" y="116" font-size="13" fill="${INK}" text-anchor="middle" font-weight="800">6 × 4 = 24</text>`, 320, 124),

  // A bar in four parts with three of them filled.
  fraction: () => box(`
    ${[0, 1, 2, 3].map(i => `<rect x="${44 + i * 58}" y="34" width="58" height="46"
        fill="${i < 3 ? 'var(--accent)' : 'var(--tint)'}" stroke="${INK}" stroke-width="2"/>`).join('')}
    <text x="160" y="22" font-size="12" fill="${MUTE}" text-anchor="middle">one whole, cut into 4 equal parts</text>
    <text x="160" y="104" font-size="15" fill="${INK}" text-anchor="middle" font-weight="900">3 of the 4 are shaded — that is 3/4</text>`),

  // Columns marching past the dot, each one ten times smaller.
  decimal: () => box(`
    ${['3', '.', '4', '7'].map((d, i) => {
      const x = 92 + i * 46;
      return d === '.' ? `<circle cx="${x}" cy="72" r="5" fill="var(--red)"/>`
        : `<rect x="${x - 22}" y="34" width="44" height="46" rx="7" fill="var(--tint)" stroke="${INK}" stroke-width="2"/>
           <text x="${x}" y="67" font-size="24" fill="${INK}" text-anchor="middle" font-weight="900">${d}</text>`;
    }).join('')}
    ${label(92, 26, 'ones')}${label(184, 26, 'tenths')}${label(230, 26, 'hundredths')}
    ${label(92, 100, '3', 13, INK)}${label(184, 100, '4/10', 13, INK)}${label(230, 100, '7/100', 13, INK)}`),

  // A hundred square with half of it coloured in.
  percent: () => box(`
    ${Array.from({ length: 100 }, (_, i) => {
      const r = Math.floor(i / 10), c = i % 10;
      return `<rect x="${105 + c * 11}" y="${12 + r * 11}" width="10" height="10"
        fill="${i < 50 ? 'var(--accent)' : 'var(--tint)'}" stroke="${INK}" stroke-width="0.6"/>`;
    }).join('')}
    <text x="160" y="137" font-size="13" fill="${INK}" text-anchor="middle" font-weight="800">50 squares out of 100 — that is 50%</text>`, 320, 144),

  // One rectangle, labelled twice: edge and inside.
  rect: () => box(`
    <rect x="86" y="24" width="148" height="62" fill="var(--tint)" stroke="${INK}" stroke-width="3"/>
    ${Array.from({ length: 6 }, (_, c) => Array.from({ length: 4 }, (_, r) =>
      `<rect x="${86 + c * 24.7}" y="${24 + r * 15.5}" width="24.7" height="15.5" fill="none" stroke="${MUTE}" stroke-width="0.7"/>`).join('')).join('')}
    ${label(160, 18, '6 cm', 13, INK)}${label(160, 100, '6 cm', 13, INK)}
    <text x="78" y="59" font-size="13" fill="${INK}" text-anchor="end" font-weight="700">4 cm</text>
    <text x="242" y="59" font-size="13" fill="${INK}" text-anchor="start" font-weight="700">4 cm</text>
    <text x="160" y="116" font-size="12" fill="${MUTE}" text-anchor="middle">round the edge 20 cm · inside 24 cm²</text>`),

  // The order, as a staircase.
  bidmas: () => box(`
    ${[['B', 'brackets'], ['I', 'indices'], ['DM', 'divide & multiply'], ['AS', 'add & subtract']].map(([k, t], i) => `
      <rect x="22" y="${10 + i * 27}" width="38" height="22" rx="6" fill="var(--accent)"/>
      <text x="41" y="${26 + i * 27}" font-size="13" fill="#fff" text-anchor="middle" font-weight="900">${k}</text>
      <text x="70" y="${26 + i * 27}" font-size="13" fill="${INK}" font-weight="700">${t}</text>`).join('')}
    <path d="M276 16 L276 104" stroke="${MUTE}" stroke-width="2" stroke-dasharray="4 4"/>
    <path d="M276 104 l-5 -8 h10 Z" fill="${MUTE}"/>
    <text x="288" y="62" font-size="11" fill="${MUTE}" text-anchor="middle" transform="rotate(90 288 62)">do these first</text>`, 320, 112),

  // Why 5² is called a square.
  square: () => box(`
    ${Array.from({ length: 25 }, (_, i) => {
      const r = Math.floor(i / 5), c = i % 5;
      return `<rect x="${114 + c * 18}" y="${16 + r * 18}" width="18" height="18" fill="var(--accent)" stroke="${INK}" stroke-width="1"/>`;
    }).join('')}
    ${label(159, 122, '5 across', 12)}
    <text x="106" y="60" font-size="12" fill="${MUTE}" text-anchor="end" font-weight="700">5 down</text>
    <text x="159" y="139" font-size="14" fill="${INK}" text-anchor="middle" font-weight="900">5 × 5 = 5² = 25</text>`, 320, 146),

  // $20 cut into four parts, one and three.
  ratio: () => box(`
    ${[0, 1, 2, 3].map(i => `<rect x="${50 + i * 56}" y="30" width="52" height="40" rx="6"
        fill="${i === 0 ? 'var(--gold)' : 'var(--accent)'}" stroke="${INK}" stroke-width="2"/>
      <text x="${76 + i * 56}" y="56" font-size="13" fill="${i === 0 ? INK : '#fff'}" text-anchor="middle" font-weight="900">$5</text>`).join('')}
    <text x="76" y="22" font-size="12" fill="${INK}" text-anchor="middle" font-weight="800">1 part</text>
    <text x="216" y="22" font-size="12" fill="${INK}" text-anchor="middle" font-weight="800">3 parts</text>
    <text x="160" y="92" font-size="13" fill="${INK}" text-anchor="middle" font-weight="800">$20 shared 1:3 is $5 and $15</text>`),
};

export const artFor = (name) => (name && ART[name]) ? ART[name]() : '';

// ================================================================== comics ===

export const BOOKS = [

// ---------------------------------------------------------------- stage 1 ---
{ id:'s1b1', stage:1, before:1, icon:'📗', name:'The Biscuit Jar',
  teaches:'Place value', where:'Milbil Café, a Tuesday morning',
  pages:[
    { scene:'Chomp has been staring at the jar on the counter for some time.', panels:[
      { who:'chomp', say:'Four hundred and seventy-two biscuits. I counted.' },
      { who:'sprouty', say:'Four hundred and seventy-two? There is only ONE four in that number.' },
      { who:'chomp', say:'And it is the biggest thing in it. That four is worth four HUNDRED.' },
      { who:'sprouty', say:'How can a four be worth four hundred?' },
    ]},
    { scene:'Chomp draws three boxes on the steamy window.', panels:[
      { art:'placevalue', cap:'A digit is worth whatever column it is standing in.' },
      { who:'chomp', say:'The 4 is standing in the hundreds. The 7 is in the tens. The 2 is in the ones.' },
      { who:'sprouty', say:'So it is 400 and 70 and 2, all pushed together.' },
      { who:'chomp', say:'Exactly. Move a digit one column to the left and it is worth ten times more.' },
    ]},
    { scene:'Sprouty writes 309 in the steam. Chomp eats a biscuit.', panels:[
      { who:'sprouty', say:'Then what is the nought in 309 for? It is worth nothing!' },
      { who:'chomp', say:'It is holding the tens column open. Take it out and you get 39.' },
      { who:'sprouty', say:'Thirty-nine biscuits is a completely different afternoon.' },
      { cap:'Zero is the bouncer. It is worth nothing and it is doing the most important job on the door.' },
    ]},
  ]},

{ id:'s1b2', stage:1, before:4, icon:'📙', name:'Too Many in the Box',
  teaches:'Carrying and borrowing', where:'Milbil Lunchbox, 7:40 in the morning',
  pages:[
    { scene:'Toothy is counting crackers into a lunchbox and has run out of room.', panels:[
      { who:'toothy', say:'Forty-seven in this bag, thirty-eight in that one. Seven and eight is fifteen.' },
      { who:'hattie', say:'You cannot write fifteen in the ones column. A column only holds 0 to 9.' },
      { who:'toothy', say:'So where do the other ones go?' },
      { who:'hattie', say:'You trade. Fifteen ones is one ten and five ones. Write the 5, carry the ten next door.' },
    ]},
    { scene:'Hattie writes it out on the back of the note from home.', panels:[
      { cap:'47 + 38.  Ones: 7 + 8 = 15, so write 5 and carry 1.' },
      { cap:'Tens: 4 + 3 + the carried 1 = 8.  Answer: 85.' },
      { who:'toothy', say:'Eighty-five crackers. That is a lot of crackers.' },
      { who:'hattie', say:'It is the same trick every time. A full column trades upwards.' },
    ]},
    { scene:'Later. Toothy has eaten some and is trying to work out how many are left.', panels:[
      { who:'toothy', say:'Seventy-one take forty-six. But one take six is... not allowed.' },
      { who:'hattie', say:'Then you borrow. Break one of the seven tens into ten ones.' },
      { who:'toothy', say:'Eleven take six is five. Six tens take four tens is two. Twenty-five!' },
      { who:'hattie', say:'Check it backwards: 25 and 46 should come back to 71. It does.' },
      { cap:'Checking takes five seconds and catches nearly every mistake.' },
    ]},
  ]},

{ id:'s1b3', stage:1, before:7, icon:'📘', name:'Which Signpost is Nearer?',
  teaches:'Rounding', where:'The road into Milbil Town',
  pages:[
    { scene:'Sporty and Snooze are walking. There is a signpost each way.', panels:[
      { who:'sporty', say:'We have gone 47 steps. How far is that, roughly?' },
      { who:'snooze', say:'Roughly? About fifty. Can we stop?' },
      { who:'sporty', say:'Why fifty and not forty?' },
      { art:'numberline', cap:'47 is seven steps past 40, and only three short of 50.' },
    ]},
    { scene:'Snooze sits down on the 50 signpost.', panels:[
      { who:'snooze', say:'Fifty is nearer. That is the whole rule. Pick the nearer signpost.' },
      { who:'sporty', say:'What if we were on exactly 45? Dead in the middle?' },
      { who:'snooze', say:'Then maths picks for you. A half always rounds up. 45 goes to 50.' },
      { who:'sporty', say:'So 85 goes to 90 and 650 goes to 700.' },
    ]},
    { scene:'Sporty jogs ahead. Snooze does not.', panels:[
      { who:'snooze', say:'Shortcut: for the nearest ten, look at the ones digit. 0 to 4 down, 5 to 9 up.' },
      { who:'sporty', say:'And for the nearest hundred?' },
      { who:'snooze', say:'Look at the tens digit instead. 238 has a 3, so down to 200.' },
      { who:'snooze', say:'371 has a 7, so up to 400. Now please stop walking.' },
    ]},
  ]},

{ id:'s1b4', stage:1, before:10, icon:'📕', name:'The Queue at Billy\'s',
  teaches:'Australian money, and everything in Stage 1', where:"Billy's, lunchtime, a long queue",
  pages:[
    { scene:'Giggle is at the front with a handful of coins.', panels:[
      { who:'giggle', say:'I have four fifty-cent coins. Is that enough for a two dollar roll?' },
      { who:'scoop', say:'Two fifties make a dollar. Four make two dollars. Exactly enough.' },
      { who:'giggle', say:'And if I had twenty-cent coins instead?' },
      { who:'scoop', say:'Five twenties to the dollar, so ten of them. A hundred cents is a dollar, always.' },
    ]},
    { scene:'Scoop writes the prices up on the board.', panels:[
      { cap:'Coins: 5c · 10c · 20c · 50c · $1 · $2.  Notes: $5 · $10 · $20 · $50 · $100.' },
      { who:'scoop', say:'$3.50 means three dollars and fifty cents. The dot is the fence between them.' },
      { who:'giggle', say:'So $3.50 and $1.20 is $4.70. Dollars with dollars, cents with cents.' },
      { who:'scoop', say:'And change from a ten for a $6.40 book? Count up. 60c to seven, three more to ten.' },
      { who:'giggle', say:'$3.60!' },
    ]},
    { scene:'The queue has not moved. Scoop uses the time.', panels:[
      { cap:'Everything in Stage 1, while you wait:' },
      { who:'scoop', say:'A digit is worth its column. Add and subtract by columns, trading when one overflows.' },
      { who:'scoop', say:'Round by looking one place to the right. Doubling is adding to itself; halving cuts in two.' },
      { who:'scoop', say:'Even numbers end in 0, 2, 4, 6 or 8. Everything else is odd. Next, please.' },
    ]},
  ]},

// ---------------------------------------------------------------- stage 2 ---
{ id:'s2b1', stage:2, before:1, icon:'📘', name:'Rows of Carrots',
  teaches:'Why times tables exist', where:'Milbil Garden, planting day',
  pages:[
    { scene:'Sprouty is planting. Chomp is watching, eating a carrot.', panels:[
      { who:'sprouty', say:'Six rows. Four carrots in each row. How many carrots did I plant?' },
      { who:'chomp', say:'Four plus four plus four plus four plus four plus four...' },
      { who:'sprouty', say:'Or you could know that six fours are twenty-four and go and sit down.' },
      { art:'array', cap:'That is all a times table is: adding somebody has already done for you.' },
    ]},
    { scene:'Chomp turns the drawing sideways.', panels:[
      { who:'chomp', say:'Hang on. Turn it round and it is four rows of six. Same carrots.' },
      { who:'sprouty', say:'Which means 6 × 4 and 4 × 6 are the same answer.' },
      { who:'chomp', say:'So learning one of them gets you the other free. Half the work.' },
      { who:'sprouty', say:'Suddenly I like times tables slightly more.' },
    ]},
    { scene:'Sprouty lists the easy ones on a seed packet.', panels:[
      { cap:'×10 — stick a zero on.  ×5 — half of the ×10.  ×2 — just doubling.' },
      { cap:'×4 — double, then double again.  ×9 — a ×10 with one lot taken off.' },
      { who:'sprouty', say:'7 × 9? Seventy, take one seven away. Sixty-three.' },
      { who:'chomp', say:'That leaves hardly any to actually learn by heart.' },
    ]},
  ]},

{ id:'s2b2', stage:2, before:4, icon:'📗', name:'Thirteen Spring Rolls',
  teaches:'Dividing, and remainders', where:'The Ningy-Ningy Canteen truck',
  pages:[
    { scene:'Four milbils and one paper bag.', panels:[
      { who:'chef', say:'Twenty-four spring rolls, four of you. Work it out.' },
      { who:'freckles', say:'Twenty-four shared between four... six each.' },
      { who:'chef', say:'How did you know that so fast?' },
      { who:'freckles', say:'Because 6 × 4 is 24. Dividing is the times table running backwards.' },
    ]},
    { scene:'Chef Bil holds up a smaller bag.', panels:[
      { who:'chef', say:'Right. This bag has thirteen. Still four of you.' },
      { who:'freckles', say:'Three each... and one left over in the bag.' },
      { who:'chef', say:'That leftover has a name. It is the remainder.' },
      { cap:'13 ÷ 4 = 3 remainder 1.' },
    ]},
    { scene:'Toothy eyes the last one.', panels:[
      { who:'toothy', say:'Could the remainder ever be four?' },
      { who:'freckles', say:'No — if there were four left you could hand out one more each.' },
      { who:'freckles', say:'The remainder is always smaller than the number you divided by.' },
      { who:'chef', say:'Correct. And the last one is mine.' },
    ]},
  ]},

{ id:'s2b3', stage:2, before:7, icon:'📙', name:'Cutting Up the Pizza',
  teaches:'What a fraction is', where:'Milbil Café, Friday night',
  pages:[
    { scene:'One pizza. Several opinions.', panels:[
      { who:'petal', say:'Cut it into four equal pieces. Each one is a quarter — one fourth.' },
      { who:'giggle', say:'Why does the bottom number say four when I only want one piece?' },
      { who:'petal', say:'The bottom says how many pieces the whole thing was cut into.' },
      { art:'fraction', cap:'The top says how many of them you have got.' },
    ]},
    { scene:'Giggle tries to take the biggest slice.', panels:[
      { who:'giggle', say:'I will have an eighth. Eight is bigger than four, so it must be a bigger slice.' },
      { who:'petal', say:'Other way round. Cut it into eight and every slice is tiny.' },
      { who:'giggle', say:'The more milbils sharing, the less each one gets. Oh no.' },
      { cap:'A bigger bottom number means a smaller piece. This catches everybody out once.' },
    ]},
    { scene:'Petal counts out twenty olives instead.', panels:[
      { who:'petal', say:'One quarter of 20 olives: share them into four piles. Five each.' },
      { who:'petal', say:'Three quarters? Find one quarter, then take three of those piles. Fifteen.' },
      { cap:'Divide by the bottom, multiply by the top. That is the whole rule.' },
      { who:'giggle', say:'And the pizza has gone cold.' },
    ]},
  ]},

{ id:'s2b4', stage:2, before:10, icon:'📕', name:'Same Thing, Different Name',
  teaches:'Equivalent fractions, and everything in Stage 2', where:'The library, revising',
  pages:[
    { scene:'Brainy has written four fractions on the board and is pleased about it.', panels:[
      { who:'brainy', say:'One half. Two quarters. Five tenths. Fifty hundredths.' },
      { who:'snooze', say:'Those are four different fractions.' },
      { who:'brainy', say:'They are four different NAMES for the same amount. All of them are half.' },
      { who:'snooze', say:'Prove it.' },
    ]},
    { scene:'Brainy doubles everything.', panels:[
      { who:'brainy', say:'Multiply the top and the bottom by the same number and nothing changes.' },
      { who:'brainy', say:'1/2, double both, 2/4. Double again, 4/8. Same slice of pizza every time.' },
      { who:'brainy', say:'Go the other way and you are simplifying. 6/9 both divide by 3, so it is 2/3.' },
      { who:'snooze', say:'Fine. It is the same amount. I am still not impressed.' },
    ]},
    { scene:'Brainy lists Stage 2 before the test.', panels:[
      { cap:'Multiplying is lots-of, and it works both ways round.' },
      { cap:'Dividing is sharing, and it undoes multiplying.' },
      { cap:'A remainder is always smaller than the number you divided by.' },
      { cap:'A factor divides in exactly. A multiple is in the times table.' },
      { who:'brainy', say:'And a fraction: divide by the bottom, multiply by the top.' },
    ]},
  ]},

// ---------------------------------------------------------------- stage 3 ---
{ id:'s3b1', stage:3, before:1, icon:'📗', name:'The Dot',
  teaches:'Decimals', where:'Milbil Town, measuring up for a shelf',
  pages:[
    { scene:'Scoop has a tape measure. Sunny has a plank.', panels:[
      { who:'scoop', say:'Three point four seven metres.' },
      { who:'sunny', say:'What are the numbers after the dot even for?' },
      { who:'scoop', say:'The columns keep going. They just get ten times smaller each time.' },
      { art:'decimal', cap:'Ones, then tenths, then hundredths.' },
    ]},
    { scene:'Sunny writes two numbers down and gets them the wrong way round.', panels:[
      { who:'sunny', say:'0.45 is longer than 0.5, so it is bigger.' },
      { who:'scoop', say:'Longer is not bigger. Line the dots up and read left to right.' },
      { cap:'0.50 against 0.45 — five tenths beats four tenths, so 0.5 wins.' },
      { who:'scoop', say:'Writing a nought on the end to match the lengths makes it obvious.' },
    ]},
    { scene:'Scoop cuts the plank.', panels:[
      { who:'scoop', say:'A decimal is only a fraction with the line taken out.' },
      { cap:'0.1 = 1/10 · 0.25 = 1/4 · 0.5 = 1/2 · 0.75 = 3/4' },
      { who:'sunny', say:'So three hundredths is 0.03, with a nought holding the tenths open.' },
      { who:'scoop', say:'Now hold the other end.' },
    ]},
  ]},

{ id:'s3b2', stage:3, before:4, icon:'📘', name:'Everything Half Price',
  teaches:'Percentages', where:'Milbil Café, the end-of-day sale',
  pages:[
    { scene:'A big handwritten sign in the window: 50% OFF.', panels:[
      { who:'royal', say:'Fifty per cent. Per cent means "out of a hundred".' },
      { who:'giggle', say:'Like a century. Or a hundred cents in a dollar.' },
      { who:'royal', say:'Exactly. So 50% is fifty out of a hundred, which is half.' },
      { art:'percent', cap:'Fifty of the hundred squares, coloured in.' },
    ]},
    { scene:'Giggle starts pricing things up.', panels:[
      { who:'royal', say:'Four to know by heart. 50% halve it. 25% halve it twice.' },
      { who:'royal', say:'10% divide by ten. 1% divide by a hundred.' },
      { who:'giggle', say:'Then 30% is three lots of 10%, and 75% is 50% plus 25%.' },
      { who:'royal', say:'And 5% is half of 10%. You can build nearly anything from those four.' },
    ]},
    { scene:'Royal writes the conversion table on the sign.', panels:[
      { cap:'1/2 is 0.5 is 50%  ·  1/4 is 0.25 is 25%  ·  3/4 is 0.75 is 75%' },
      { cap:'1/10 is 0.1 is 10%  ·  1/5 is 0.2 is 20%' },
      { who:'royal', say:'Decimal to percentage, multiply by a hundred. Back again, divide by a hundred.' },
      { who:'giggle', say:'Three outfits, same milbil underneath.' },
    ]},
  ]},

{ id:'s3b3', stage:3, before:7, icon:'📙', name:'Fence It or Turf It',
  teaches:'Perimeter and area', where:'Milbil Garden, a new vegetable patch',
  pages:[
    { scene:'Sprouty has a roll of fencing and a roll of turf and one rectangle of dirt.', panels:[
      { who:'sprouty', say:'Six metres one way, four the other. How much fence do I need?' },
      { who:'scoop', say:'Walk right round the edge and add up every side. 6 + 4 + 6 + 4.' },
      { who:'sprouty', say:'Twenty metres of fence.' },
      { art:'rect', cap:'Perimeter is the fence. Area is the carpet.' },
    ]},
    { scene:'Scoop unrolls the turf.', panels:[
      { who:'scoop', say:'Turf is different. That is the space inside — long times short.' },
      { who:'scoop', say:'6 × 4 = 24 square metres. That little 2 means squares, not a line.' },
      { who:'sprouty', say:'Twenty metres of fence and twenty-four square metres of turf. Different numbers.' },
      { who:'scoop', say:'Different KINDS of number. One is a line, one is a surface.' },
    ]},
    { scene:'Sprouty checks the labels on the rolls.', panels:[
      { cap:'10 mm = 1 cm · 100 cm = 1 m · 1000 m = 1 km' },
      { cap:'1000 g = 1 kg · 1000 mL = 1 L' },
      { who:'scoop', say:'Milli is a thousandth. Centi is a hundredth. Kilo is a thousand.' },
      { who:'sprouty', say:'Spot those three and you never have to memorise a conversion again.' },
    ]},
  ]},

{ id:'s3b4', stage:3, before:10, icon:'📕', name:'The 15:45 Train',
  teaches:'Time, and everything in Stage 3', where:'Milbil Town station',
  pages:[
    { scene:'Cosy is reading the departures board. It is all 24-hour time.', panels:[
      { who:'cosy', say:'Fifteen forty-five. There is no such time as quarter to sixteen.' },
      { who:'brainy', say:'It just keeps counting past twelve. 1 pm is 13:00, so 3:45 pm is 15:45.' },
      { who:'cosy', say:'And the morning?' },
      { who:'brainy', say:'The morning stays the same, with a nought in front. 9:20 am is 09:20.' },
    ]},
    { scene:'They work out how long the wait is.', panels:[
      { who:'cosy', say:'It is 10:40 now. How long until 11:25?' },
      { who:'brainy', say:'Hop to the next whole hour first. 10:40 to 11:00 is twenty minutes.' },
      { who:'brainy', say:'Then 11:00 to 11:25 is twenty-five more. Forty-five minutes.' },
      { who:'cosy', say:'Forty-five minutes on a cold platform. Marvellous.' },
    ]},
    { scene:'Brainy revises Stage 3 out loud. Cosy pulls the scarf up.', panels:[
      { cap:'Decimals: line up the dots, then add column by column.' },
      { cap:'×10 moves every digit one column left; ÷10 moves it one right.' },
      { cap:'Per cent means out of 100. Perimeter = all the way round; area = long × short.' },
      { who:'brainy', say:'A right angle is 90°, a straight line 180°, all the way round 360°.' },
    ]},
  ]},

// ---------------------------------------------------------------- stage 4 ---
{ id:'s4b1', stage:4, before:1, icon:'📘', name:'Two Milbils, Two Answers',
  teaches:'Order of operations', where:'Milbil Café, at the till',
  pages:[
    { scene:'Chomp and Wizzle are adding up the same bill and have fallen out.', panels:[
      { who:'chomp', say:'Three coffees and four cakes at two dollars. 3 + 4 × 2. Fourteen dollars.' },
      { who:'wizzle', say:'Eleven dollars.' },
      { who:'chomp', say:'It cannot be both!' },
      { who:'wizzle', say:'No. Which is why everybody agreed on an order a very long time ago.' },
    ]},
    { scene:'Wizzle writes BIDMAS up the side of the menu.', panels:[
      { art:'bidmas', cap:'Brackets, Indices, Divide and Multiply, Add and Subtract.' },
      { who:'wizzle', say:'Multiplying happens before adding. 4 × 2 = 8, then 3 + 8 = 11.' },
      { who:'chomp', say:'So I went left to right and that was the mistake.' },
      { who:'wizzle', say:'Divide and multiply are equal partners — do whichever comes first. Same for add and subtract.' },
    ]},
    { scene:'Chomp writes it again, with brackets this time.', panels:[
      { who:'chomp', say:'(3 + 4) × 2. Now it IS fourteen.' },
      { who:'wizzle', say:'Because brackets mean "do this bit first, no arguments".' },
      { cap:'If you are not sure somebody will read your sum the way you meant it, put brackets in.' },
      { who:'chomp', say:'Eleven dollars, then. I am paying in coins.' },
    ]},
  ]},

{ id:'s4b2', stage:4, before:4, icon:'📗', name:'A Perfectly Square Patio',
  teaches:'Powers and square roots', where:'Milbil Town 3D, a building site',
  pages:[
    { scene:'Sunny is laying tiles. Starry is supervising from a deckchair.', panels:[
      { who:'sunny', say:'Five tiles across and five tiles down. How many tiles is that?' },
      { who:'starry', say:'Five squared. Twenty-five.' },
      { who:'sunny', say:'Squared?' },
      { art:'square', cap:'Five across, five down — it makes a perfect square.' },
    ]},
    { scene:'Starry does not get up.', panels:[
      { who:'starry', say:'5² means 5 × 5. The little 2 counts how many fives you multiply together.' },
      { who:'starry', say:'2³ means 2 × 2 × 2, which is eight. Two cubed, because it makes a cube.' },
      { who:'sunny', say:'So 5² is twenty-five, not ten. The little number is a count, not a thing you times by.' },
      { cap:'Square numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144.' },
    ]},
    { scene:'Sunny has forty-nine tiles left over.', panels:[
      { who:'sunny', say:'Forty-nine tiles. Can I make another square out of exactly those?' },
      { who:'starry', say:'What times itself gives 49?' },
      { who:'sunny', say:'Seven. Seven by seven.' },
      { who:'starry', say:'Then the square root of 49 is 7. Same facts, read the other way round.' },
    ]},
  ]},

{ id:'s4b3', stage:4, before:7, icon:'📙', name:'One Part Cordial',
  teaches:'Ratio and rate', where:'The Ningy-Ningy Canteen truck, a hot day',
  pages:[
    { scene:'Chef Bil is making a very large jug of cordial.', panels:[
      { who:'chef', say:'One part cordial to four parts water. One to four.' },
      { who:'toothy', say:'So one cup of cordial and four cups of water. Five cups in all.' },
      { who:'chef', say:'Right. Now do two cups of cordial.' },
      { who:'toothy', say:'Eight cups of water. Four times as much water, always.' },
    ]},
    { scene:'Royal turns up with twenty dollars and a problem.', panels:[
      { who:'royal', say:'Share this twenty dollars between the two of you, one to three.' },
      { who:'toothy', say:'One dollar and three dollars?' },
      { who:'royal', say:'No. Add the numbers first: 1 + 3 is FOUR parts. Each part is $20 ÷ 4 = $5.' },
      { art:'ratio', cap:'One gets one part. The other gets three. $5 and $15.' },
    ]},
    { scene:'Chef Bil drives off.', panels:[
      { who:'chef', say:'A ratio simplifies like a fraction. 4:8 both divide by four — that is 1:2.' },
      { who:'chef', say:'10:15 both divide by five. 2:3. Same mix, smaller numbers.' },
      { who:'toothy', say:'And the truck did 120 km in two hours, so that is 60 km every hour.' },
      { cap:'A rate is just a ratio where the two sides measure different things. The slash means "per".' },
    ]},
  ]},

{ id:'s4b4', stage:4, before:10, icon:'📕', name:'The Last Book',
  teaches:'Chance and averages, and everything in Stage 4', where:'Milbil Café, one dice and five scores',
  pages:[
    { scene:'Starry rolls a dice. Brainy writes everything down.', panels:[
      { who:'brainy', say:'Chance runs from 0 to 1. Nought is impossible, one is certain.' },
      { who:'starry', say:'And a three on this dice?' },
      { who:'brainy', say:'One face you want, six faces there are. One sixth.' },
      { cap:'Probability = the ones you want ÷ all the ones there are.' },
    ]},
    { scene:'Five scores on the board: 3, 7, 7, 9, 14.', panels:[
      { who:'brainy', say:'Mean: add them all, divide by how many. Forty over five is eight.' },
      { who:'brainy', say:'Median: in order, take the middle one. Seven.' },
      { who:'brainy', say:'Mode: the one that turns up most. Also seven.' },
      { who:'brainy', say:'Range: biggest take smallest. Fourteen take three is eleven.' },
    ]},
    { scene:'Last page of the last book.', panels:[
      { cap:'BIDMAS: brackets, indices, divide and multiply, add and subtract.' },
      { cap:'Negative numbers carry on below zero. −9 is smaller than −1.' },
      { cap:'In algebra 4a means 4 × a, and only matching letters add up: 3n + 2n = 5n.' },
      { cap:'To solve an equation, undo what was done to x, doing the same to both sides.' },
      { who:'starry', say:'That is the lot. Go and sit the test.' },
    ]},
  ]},

];

export const BOOK = Object.fromEntries(BOOKS.map(b => [b.id, b]));
export const ALL_BOOKS = BOOKS;
export const getBook = (id) => BOOK[id] || null;
export const bookBefore = (stage, n) => BOOKS.find(b => b.stage === stage && b.before === n) || null;
export const booksOf = (stage) => BOOKS.filter(b => b.stage === stage);

// --------------------------------------------------------------- drawing ---

/** One panel of a comic. */
export function panelHTML(p, i){
  if (p.art) return `<figure class="panel art-panel">${artFor(p.art)}${p.cap ? `<figcaption>${esc(p.cap)}</figcaption>` : ''}</figure>`;
  if (!p.who) return `<div class="panel cap-panel">${esc(p.cap ?? '')}</div>`;
  const c = CAST[p.who];
  return `<div class="panel say-panel${i % 2 ? ' flip' : ''}">
    <div class="panel-who">${castHTML(p.who)}<small>${esc(c?.name ?? '')}</small></div>
    <p class="panel-say">${esc(p.say ?? '')}</p>
  </div>`;
}

/** One page of a comic: the scene-setting line, then the panels. */
export function pageHTML(page){
  return `${page.scene ? `<p class="scene">${esc(page.scene)}</p>` : ''}
    <div class="panels">${page.panels.map(panelHTML).join('')}</div>`;
}
