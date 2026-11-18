// ---------- The comic books ----------
//
// Forty comics, ten to a stage, sitting in front of every other lesson — so
// each one sets up the two lessons that follow it.
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

// Three more pictures, for the comics added when the stages grew to twenty
// lessons each.

Object.assign(ART, {

  angles: () => box(`
  <g stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round">
    <path d="M40 86 H96 M40 86 V30"/>
    <path d="M150 86 H260"/>
    <path d="M205 86 L252 46" />
  </g>
  <path d="M40 72 h14 v14" fill="none" stroke="${INK}" stroke-width="2.4"/>
  <path d="M225 86 A20 20 0 0 0 218 71" fill="none" stroke="var(--accent)" stroke-width="2.6"/>
  <path d="M170 86 A20 20 0 0 1 190 66" fill="none" stroke="var(--accent)" stroke-width="2.6"/>
  ${label(68, 108, 'a right angle · 90°', 12, INK)}
  ${label(205, 108, 'these two add to 180°', 12, INK)}`, 320, 118),

  hops: () => box(`
  <line x1="24" y1="78" x2="296" y2="78" stroke="${INK}" stroke-width="2.5"/>
  ${[0,1,2,3,4,5].map(i => `<line x1="${30 + i * 52}" y1="70" x2="${30 + i * 52}" y2="86" stroke="${INK}" stroke-width="2.5"/>
     ${label(30 + i * 52, 102, String(i * 3), 12, INK)}`).join('')}
  ${[0,1,2,3,4].map(i => `<path d="M${30 + i * 52} 74 Q${56 + i * 52} 38 ${82 + i * 52} 74" fill="none" stroke="var(--accent)" stroke-width="2.6"/>
     ${label(56 + i * 52, 34, '+3', 11)}`).join('')}
  <text x="160" y="118" font-size="12" fill="${MUTE}" text-anchor="middle">counting by 3s is the same hop, over and over</text>`, 320, 126),

  balance: () => box(`
  <path d="M160 96 V40 M120 40 H200" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  <path d="M140 96 H180" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
  ${[120, 200].map(x => `<path d="M${x} 40 L${x - 26} 66 H${x + 26} Z" fill="var(--tint)" stroke="${INK}" stroke-width="2.2"/>`).join('')}
  <text x="120" y="60" font-size="15" fill="${INK}" text-anchor="middle" font-weight="900">x + 7</text>
  <text x="200" y="60" font-size="15" fill="${INK}" text-anchor="middle" font-weight="900">12</text>
  <text x="160" y="116" font-size="12" fill="${MUTE}" text-anchor="middle">take 7 off BOTH sides and it still balances</text>`, 320, 124),
});

// ================================================================== comics ===
//
// Ten to a stage, in front of lessons 1, 3, 5, 7, 9, 11, 13, 15, 17 and 19.

export const BOOKS = [

// ---------------------------------------------------------------- stage 1 ---
{ id:'s1b1', stage:1, before:1, icon:'📗', name:'How Many Sheep?',
  teaches:'Counting on and back', where:'Snooze’s bedroom, half past nine',
  pages:[
    { scene:'Snooze cannot sleep. Sprouty has been dragged in to help.', panels:[
      { who:'snooze', say:'Fifty-seven sheep. Fifty-eight. Fifty-nine. …Then what?' },
      { who:'sprouty', say:'Sixty. The ones column was full, so it rolls over and the tens tick up.' },
      { who:'snooze', say:'And after ninety-nine?' },
      { who:'sprouty', say:'Both columns are full, so BOTH roll over and a hundreds column opens. A hundred.' },
    ]},
    { scene:'Sprouty turns the light off. Snooze turns it back on.', panels:[
      { who:'snooze', say:'What if I count backwards instead?' },
      { who:'sprouty', say:'Same thing in reverse. Before 40 is 39 — the tens drop one and the ones fill back up to 9.' },
      { who:'snooze', say:'Three hundred… two hundred and ninety-nine… two hundred and ninety-eight…' },
      { cap:'Snooze was asleep by two hundred and ninety-one.' },
    ]},
  ]},

{ id:'s1b2', stage:1, before:3, icon:'📙', name:'The Biscuit Jar',
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
      { who:'chomp', say:'Exactly. Move a digit one column left and it is worth ten times more.' },
    ]},
    { scene:'Sprouty writes 309 in the steam. Chomp eats a biscuit.', panels:[
      { who:'sprouty', say:'Then what is the nought in 309 for? It is worth nothing!' },
      { who:'chomp', say:'It is holding the tens column open. Take it out and you get 39.' },
      { who:'sprouty', say:'Thirty-nine biscuits is a completely different afternoon.' },
      { cap:'Zero is the bouncer. It is worth nothing and it is doing the most important job on the door.' },
    ]},
  ]},

{ id:'s1b3', stage:1, before:5, icon:'📘', name:'Who Has More?',
  teaches:'Comparing numbers', where:'The Milbil Café counter, both tills open',
  pages:[
    { scene:'Chomp and Giggle have counted their coins and disagree.', panels:[
      { who:'giggle', say:'I have 508. You have 580. Mine looks longer!' },
      { who:'chomp', say:'They are the same length. Start at the LEFT and compare.' },
      { who:'chomp', say:'Five hundreds each — a draw. Next column: you have 0 tens, I have 8.' },
      { who:'giggle', say:'Oh. You win on the tens, so you win. Bother.' },
    ]},
    { scene:'Hattie arrives with 805 and ends the argument.', panels:[
      { who:'hattie', say:'Eight hundreds. I do not even need to look at the rest.' },
      { who:'chomp', say:'That is the trick — the leftmost column that differs decides it.' },
      { who:'giggle', say:'And if the hundreds tie, you move to the tens. Then the ones.' },
      { cap:'Left to right, column by column, stop at the first difference.' },
    ]},
  ]},

{ id:'s1b4', stage:1, before:7, icon:'📕', name:'Too Many in the Box',
  teaches:'Adding, and carrying', where:'Milbil Lunchbox, 7:40 in the morning',
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
  ]},

{ id:'s1b5', stage:1, before:9, icon:'📗', name:'The Disappearing Lollies',
  teaches:'Subtracting', where:'The school playground, first break',
  pages:[
    { scene:'Freckles started with a full bag. Toothy has been helping.', panels:[
      { who:'freckles', say:'I had fifteen. Now I have eight. How many did you eat?' },
      { who:'toothy', say:'Work it out. Fifteen take away eight.' },
      { who:'freckles', say:'Fifteen take five is ten, then two more is eight. So… seven.' },
      { who:'toothy', say:'Correct. Hopping to the nearest ten first makes it much easier.' },
    ]},
    { scene:'Freckles checks the answer rather than trusting it.', panels:[
      { who:'freckles', say:'Seven plus eight should come back to fifteen. It does.' },
      { who:'toothy', say:'Subtracting is only adding backwards. Every take-away can be checked that way.' },
      { who:'freckles', say:'And fifteen take away fifteen would be nothing at all.' },
      { cap:'Take a number away from itself and nothing is left. Including lollies.' },
    ]},
  ]},

{ id:'s1b6', stage:1, before:11, icon:'📙', name:'Next Door Will Lend You One',
  teaches:'Borrowing', where:'Milbil Town, the corner shop',
  pages:[
    { scene:'Scoop is working out the change and has hit a wall.', panels:[
      { who:'scoop', say:'Seventy-one take forty-six. But one take six is… not allowed.' },
      { who:'hattie', say:'Not allowed in that column, no. So go next door and borrow.' },
      { who:'hattie', say:'Break one of the seven tens into ten ones. Now the ones column holds eleven.' },
      { who:'scoop', say:'Eleven take six is five. And the tens are down to six, take four, is two.' },
    ]},
    { scene:'Scoop writes 25 on the receipt and stares at it suspiciously.', panels:[
      { who:'scoop', say:'Twenty-five. Are you sure?' },
      { who:'hattie', say:'Add it back. Twenty-five and forty-six.' },
      { who:'scoop', say:'…Seventy-one. All right, I believe you.' },
      { cap:'Borrowing is just place value being helpful. A ten is always ten ones if you need it to be.' },
    ]},
  ]},

{ id:'s1b7', stage:1, before:13, icon:'📘', name:'Hopping Along',
  teaches:'Number patterns', where:'The hopscotch grid behind the school',
  pages:[
    { scene:'Sporty is hopping. Sprouty is keeping score.', panels:[
      { who:'sporty', say:'Twelve! Fifteen! Eighteen! …What comes next?' },
      { art:'hops', cap:'Every hop is the same size, so the pattern does the work.' },
      { who:'sprouty', say:'Twenty-one. You are adding three every time.' },
      { who:'sporty', say:'I did not even have to think about it.' },
    ]},
    { scene:'Sprouty draws a second grid, going the other way.', panels:[
      { who:'sprouty', say:'Now hop BACK by fours. Forty, thirty-six, thirty-two…' },
      { who:'sporty', say:'Twenty-eight. Backwards is the same hop, in reverse.' },
      { who:'sprouty', say:'Counting by 25s is my favourite. Twenty-five, fifty, seventy-five…' },
      { who:'sporty', say:'A hundred! That is four 25c coins. A whole dollar of hopping.' },
    ]},
  ]},

{ id:'s1b8', stage:1, before:15, icon:'📕', name:'Which Signpost is Nearer?',
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
      { who:'sporty', say:'So 85 goes to 90 and 250 goes to 300.' },
    ]},
    { scene:'Sporty jogs ahead. Snooze does not.', panels:[
      { who:'snooze', say:'Shortcut: for the nearest ten, look at the ones digit. 0 to 4 down, 5 to 9 up.' },
      { who:'sporty', say:'And for the nearest hundred?' },
      { who:'snooze', say:'Look at the tens digit instead. 238 has a 3, so down to 200.' },
      { who:'snooze', say:'371 has a 7, so up to 400. Now please stop walking.' },
    ]},
  ]},

{ id:'s1b9', stage:1, before:17, icon:'📗', name:'The Queue at Billy’s',
  teaches:'Australian money', where:"Billy's, lunchtime, a long queue",
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
      { who:'scoop', say:'And change from a five for a $3.50 book? Count up. 50c to four, one more to five.' },
      { who:'giggle', say:'$1.50!' },
    ]},
  ]},

{ id:'s1b10', stage:1, before:19, icon:'📙', name:'Fair Shares',
  teaches:'Odd, even, doubles and halves', where:'The park, one bag of grapes',
  pages:[
    { scene:'Giggle and Toothy are splitting a bag down the middle.', panels:[
      { who:'giggle', say:'Thirty-six grapes, two of us. Does that work?' },
      { who:'toothy', say:'It ends in a six, so it is even. Even numbers always split in two.' },
      { who:'giggle', say:'Eighteen each. And if there had been thirty-seven?' },
      { who:'toothy', say:'Odd. One left over, and an argument.' },
    ]},
    { scene:'Toothy explains the only digit that matters.', panels:[
      { who:'toothy', say:'You only ever look at the LAST digit. 0, 2, 4, 6, 8 is even. Everything else is odd.' },
      { who:'giggle', say:'So 471 is odd, even though it is enormous?' },
      { who:'toothy', say:'Enormous and odd. Doubling is the opposite job — 45 and 45 makes 90.' },
      { cap:'Doubling puts two together. Halving cuts one in two. They undo each other.' },
    ]},
  ]},

// ---------------------------------------------------------------- stage 2 ---
{ id:'s2b1', stage:2, before:1, icon:'📘', name:'Rows of Carrots',
  teaches:'Why times tables exist', where:'Milbil Garden, planting day',
  pages:[
    { scene:'Sprouty is planting. Chomp is watching, eating a carrot.', panels:[
      { who:'sprouty', say:'Six rows. Four carrots in each row. How many carrots did I plant?' },
      { who:'chomp', say:'Four plus four plus four plus four plus four plus four…' },
      { who:'sprouty', say:'Or you could know that six fours are twenty-four and go and sit down.' },
      { art:'array', cap:'That is all a times table is: adding somebody has already done for you.' },
    ]},
    { scene:'Chomp turns the drawing sideways.', panels:[
      { who:'chomp', say:'Hang on. Turn it round and it is four rows of six. Same carrots.' },
      { who:'sprouty', say:'Which means 6 × 4 and 4 × 6 are the same answer.' },
      { who:'chomp', say:'So learning one of them gets you the other free. Half the work.' },
      { who:'sprouty', say:'Suddenly I like times tables slightly more.' },
    ]},
  ]},

{ id:'s2b2', stage:2, before:3, icon:'📗', name:'The Free Ones',
  teaches:'The 5 and 10 times tables', where:'Milbil Café, counting the till',
  pages:[
    { scene:'Royal is stacking coins. Giggle is meant to be helping.', panels:[
      { who:'royal', say:'Seven piles of ten. How much is that?' },
      { who:'giggle', say:'Seventy. You just stick a zero on.' },
      { who:'royal', say:'Correct, and that is the whole ten times table. It never gets harder.' },
      { who:'giggle', say:'What about the fives? Those are harder.' },
    ]},
    { scene:'Royal splits each pile of ten in half.', panels:[
      { who:'royal', say:'A five is half a ten. So do the ten first, then halve it.' },
      { who:'royal', say:'Nine fives? Nine tens is ninety. Half of ninety is forty-five.' },
      { who:'giggle', say:'Twelve fives — a hundred and twenty, halved — sixty!' },
      { cap:'Two tables learned, and only one of them needed learning.' },
    ]},
  ]},

{ id:'s2b3', stage:2, before:5, icon:'📙', name:'Double, Double',
  teaches:'The 4 times table', where:'Milbil Cooking, a very large batch',
  pages:[
    { scene:'Chef Bil is quadrupling a recipe. Freckles is lost.', panels:[
      { who:'freckles', say:'Four times six. I do not know my fours.' },
      { who:'chef', say:'Then do not use them. Double six.' },
      { who:'freckles', say:'Twelve.' },
      { who:'chef', say:'Double it again.' },
    ]},
    { scene:'Freckles looks at the answer with some suspicion.', panels:[
      { who:'freckles', say:'Twenty-four. …That is four sixes?' },
      { who:'chef', say:'Doubling twice IS multiplying by four. Two twos make a four.' },
      { who:'freckles', say:'Then eights would be doubling three times. 7 → 14 → 28 → 56.' },
      { cap:'×2 is double. ×4 is double twice. ×8 is double three times. No tables required.' },
    ]},
  ]},

{ id:'s2b4', stage:2, before:7, icon:'📕', name:'The Hard One',
  teaches:'The 7 times table', where:'The library, revision club',
  pages:[
    { scene:'Brainy has written the seven times table on the board. Toothy is appalled.', panels:[
      { who:'toothy', say:'The sevens have no tricks at all. None.' },
      { who:'brainy', say:'They have fewer than most. But you already know most of them.' },
      { who:'brainy', say:'7 × 2, 7 × 5, 7 × 10 came free with the easy tables. 7 × 3 and 7 × 4 you have done.' },
      { who:'toothy', say:'So what is actually left?' },
    ]},
    { scene:'Brainy rubs out everything already known.', panels:[
      { who:'brainy', say:'7 × 6, 7 × 7, 7 × 8, 7 × 9. Four facts. That is the whole problem.' },
      { who:'toothy', say:'Four! I was expecting twelve.' },
      { who:'brainy', say:'And 7 × 8 is 56 — five, six, seven, eight. The answer comes in order.' },
      { cap:'Most of any times table is already learned by the time you get to it.' },
    ]},
  ]},

{ id:'s2b5', stage:2, before:9, icon:'📗', name:'The Nine Trick',
  teaches:'The 9 times table', where:'Milbil Go, outside the animal shop',
  pages:[
    { scene:'Starry is buying nine of something and refuses to use a calculator.', panels:[
      { who:'starry', say:'Nine lots of seven. Watch this.' },
      { who:'sunny', say:'You do not know it, do you.' },
      { who:'starry', say:'I do not need to. TEN lots of seven is seventy. Easy.' },
      { who:'starry', say:'Then take one seven back off. Sixty-three.' },
    ]},
    { scene:'Sunny tries it and is annoyed at how well it works.', panels:[
      { who:'sunny', say:'Nine nines. Ninety take nine… eighty-one.' },
      { who:'starry', say:'Nine twelves. A hundred and twenty take twelve.' },
      { who:'sunny', say:'A hundred and eight. This is cheating.' },
      { cap:'A nine is always a ten with one lot handed back. Every single time.' },
    ]},
  ]},

{ id:'s2b6', stage:2, before:11, icon:'📘', name:'Thirteen Spring Rolls',
  teaches:'Dividing, and remainders', where:'The Ningy-Ningy Canteen truck',
  pages:[
    { scene:'Four milbils and one paper bag.', panels:[
      { who:'chef', say:'Twenty-four spring rolls, four of you. Work it out.' },
      { who:'freckles', say:'Twenty-four shared between four… six each.' },
      { who:'chef', say:'How did you know that so fast?' },
      { who:'freckles', say:'Because 6 × 4 is 24. Dividing is the times table running backwards.' },
    ]},
    { scene:'Chef Bil holds up a smaller bag.', panels:[
      { who:'chef', say:'Right. This bag has thirteen. Still four of you.' },
      { who:'freckles', say:'Three each… and one left over in the bag.' },
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

{ id:'s2b7', stage:2, before:13, icon:'📕', name:'Rows That Work',
  teaches:'Factors', where:'Milbil Café, laying out the chairs',
  pages:[
    { scene:'Twelve chairs and a floor plan.', panels:[
      { who:'cosy', say:'Twelve chairs. I want them in equal rows. What are my options?' },
      { who:'brainy', say:'Any arrangement that comes out exactly. Two rows of six. Three rows of four.' },
      { who:'cosy', say:'Four rows of three. Six rows of two. One long row of twelve.' },
      { who:'brainy', say:'Those numbers are the FACTORS of 12: 1, 2, 3, 4, 6 and 12.' },
    ]},
    { scene:'Cosy tries five rows and it does not work.', panels:[
      { who:'cosy', say:'Five rows leaves two chairs over.' },
      { who:'brainy', say:'Then 5 is not a factor of 12. A factor has to divide in exactly, with nothing left.' },
      { who:'cosy', say:'So 24 would have 1, 2, 3, 4, 6, 8, 12 and 24. Eight of them.' },
      { cap:'Factors always come in pairs — one short row and one long one.' },
    ]},
  ]},

{ id:'s2b8', stage:2, before:15, icon:'📗', name:'Where the Tables Meet',
  teaches:'Multiples', where:'Milbil Town, two bus stops',
  pages:[
    { scene:'Two buses. One comes every three minutes, one every four.', panels:[
      { who:'scoop', say:'The green bus is at 3, 6, 9, 12, 15 minutes…' },
      { who:'hattie', say:'And the red one at 4, 8, 12, 16…' },
      { who:'scoop', say:'They both turn up at twelve minutes. Together.' },
      { who:'hattie', say:'Because 12 is in both times tables. It is a multiple of 3 AND of 4.' },
    ]},
    { scene:'They wait. The buses arrive together, as predicted.', panels:[
      { who:'scoop', say:'So a multiple is anything IN a times table.' },
      { who:'hattie', say:'And a factor is a number that divides into it. Same facts, opposite way round.' },
      { who:'scoop', say:'42 is a multiple of 7, and 7 is a factor of 42.' },
      { cap:'Twelve is the first place the 3s and the 4s ever meet.' },
    ]},
  ]},

{ id:'s2b9', stage:2, before:17, icon:'📙', name:'Cutting Up the Pizza',
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

{ id:'s2b10', stage:2, before:19, icon:'📕', name:'Same Thing, Different Name',
  teaches:'Equivalent fractions', where:'The library, revising',
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
    { scene:'Scoop cuts the plank.', panels:[
      { who:'scoop', say:'A decimal is only a fraction with the line taken out.' },
      { cap:'0.1 = 1/10 · 0.25 = 1/4 · 0.5 = 1/2 · 0.75 = 3/4' },
      { who:'sunny', say:'So three hundredths is 0.03, with a nought holding the tenths open.' },
      { who:'scoop', say:'Now hold the other end.' },
    ]},
  ]},

{ id:'s3b2', stage:3, before:3, icon:'📘', name:'Longer Is Not Bigger',
  teaches:'Comparing decimals', where:'Milbil Go, the long jump pit',
  pages:[
    { scene:'Two jumps have been measured and there is a dispute.', panels:[
      { who:'sporty', say:'I jumped 0.45 metres. You jumped 0.5. Mine has more numbers, so I win.' },
      { who:'starry', say:'That is not how it works. Line the dots up.' },
      { who:'starry', say:'Write mine as 0.50. Now compare the first column after the dot.' },
      { who:'sporty', say:'…Five tenths against four tenths. You win.' },
    ]},
    { scene:'Starry writes both on the board with matching lengths.', panels:[
      { cap:'0.50   ← five tenths' },
      { cap:'0.45   ← four tenths' },
      { who:'starry', say:'Adding noughts on the end changes nothing, and makes it obvious.' },
      { who:'sporty', say:'So 0.09 is the smallest of all, because it has no tenths whatsoever.' },
    ]},
  ]},

{ id:'s3b3', stage:3, before:5, icon:'📙', name:'Line Up the Dots',
  teaches:'Adding and subtracting decimals', where:'The Ningy-Ningy till, end of the day',
  pages:[
    { scene:'Chef Bil is adding up takings and has written the numbers crookedly.', panels:[
      { who:'chef', say:'Three twenty-five and one fifty. I keep getting different answers.' },
      { who:'scoop', say:'Because your dots are not lined up. Everything hangs off the dot.' },
      { who:'scoop', say:'Write 1.5 as 1.50 so both have two columns after it.' },
      { who:'chef', say:'3.25 and 1.50… four seventy-five.' },
    ]},
    { scene:'Scoop rules a vertical line straight through both dots.', panels:[
      { who:'scoop', say:'Hundredths under hundredths, tenths under tenths, ones under ones.' },
      { who:'chef', say:'And taking away? Ten take two thirty-five.' },
      { who:'scoop', say:'Same rule. 7.65. Check it by adding back — 7.65 and 2.35 makes ten.' },
      { cap:'Line up the dots and a decimal sum is an ordinary sum.' },
    ]},
  ]},

{ id:'s3b4', stage:3, before:7, icon:'📕', name:'Everything Slides Over',
  teaches:'Multiplying and dividing by 10, 100 and 1000', where:'Milbil Garden, the seed scales',
  pages:[
    { scene:'Sprouty is weighing out seed and needs a hundred times as much.', panels:[
      { who:'sprouty', say:'Point six of a kilo, times a hundred. Do I add two noughts?' },
      { who:'brainy', say:'Careful. The DIGITS move, not the dot. Everything slides two columns left.' },
      { who:'brainy', say:'0.6 → 6 → 60.' },
      { who:'sprouty', say:'Sixty kilos. That is a great deal of seed.' },
    ]},
    { scene:'Brainy takes the bag back off Sprouty.', panels:[
      { who:'brainy', say:'Dividing slides them the other way. 72 ÷ 10 is 7.2.' },
      { who:'sprouty', say:'And 9 ÷ 1000? Three columns right — 0.9, 0.09, 0.009.' },
      { who:'brainy', say:'Exactly. The noughts are just holding the empty columns open.' },
      { cap:'Never "add a nought". Slide the digits and let the columns do the work.' },
    ]},
  ]},

{ id:'s3b5', stage:3, before:9, icon:'📗', name:'Everything Half Price',
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

{ id:'s3b6', stage:3, before:11, icon:'📘', name:'How Long Is a Milbil?',
  teaches:'Metric units', where:'The school hall, measuring everybody',
  pages:[
    { scene:'Scoop has a tape and a clipboard. Chomp is standing very straight.', panels:[
      { who:'scoop', say:'Eighty-five centimetres. Which is nought point eight five metres.' },
      { who:'chomp', say:'How do you keep swapping between them so easily?' },
      { who:'scoop', say:'Because the names tell you. CENTI means a hundredth. A hundred cm to a metre.' },
      { who:'scoop', say:'MILLI means a thousandth. KILO means a thousand.' },
    ]},
    { scene:'Chomp checks it against the bag of flour in the kitchen.', panels:[
      { who:'chomp', say:'So a KILOgram is a thousand grams. And a MILLIlitre is a thousandth of a litre.' },
      { who:'scoop', say:'Which makes 1.5 litres 1500 mL, and 2.4 km 2400 m.' },
      { who:'chomp', say:'Three prefixes and I never have to memorise a conversion again.' },
      { cap:'milli = a thousandth · centi = a hundredth · kilo = a thousand' },
    ]},
  ]},

{ id:'s3b7', stage:3, before:13, icon:'📕', name:'Fence It or Turf It',
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
  ]},

{ id:'s3b8', stage:3, before:15, icon:'📗', name:'The Corner of the Page',
  teaches:'Angles', where:'The art room, one very wonky shelf',
  pages:[
    { scene:'Cosy is holding a shelf up. Hattie is holding a piece of paper against it.', panels:[
      { who:'hattie', say:'Use the corner of this page. That corner is exactly ninety degrees.' },
      { who:'cosy', say:'And if it matches, the shelf is straight?' },
      { who:'hattie', say:'Then it is a right angle. Four of them make a full turn — three hundred and sixty.' },
      { art:'angles', cap:'A right angle is 90°. A straight line is two of them: 180°.' },
    ]},
    { scene:'Hattie names the other kinds while Cosy holds the shelf.', panels:[
      { who:'hattie', say:'Under ninety is ACUTE — a sharp little angle.' },
      { who:'hattie', say:'Between ninety and a hundred and eighty is OBTUSE — wide open.' },
      { who:'cosy', say:'And this shelf is about a hundred and ten, which is obtuse and also wrong.' },
      { cap:'Right 90° · straight line 180° · all the way round 360°.' },
    ]},
  ]},

{ id:'s3b9', stage:3, before:17, icon:'📙', name:'Half Past What?',
  teaches:'Telling the time', where:'The kitchen, waiting for a cake',
  pages:[
    { scene:'Chef Bil has put a cake in. Giggle is already asking.', panels:[
      { who:'giggle', say:'It went in at ten to eleven. It takes forty-five minutes. When is it out?' },
      { who:'chef', say:'Hop to the next whole hour first. Ten-forty to eleven is twenty minutes.' },
      { who:'giggle', say:'So twenty-five minutes left over. Eleven twenty-five.' },
      { who:'chef', say:'Hopping to the hour makes every one of these easy.' },
    ]},
    { scene:'Giggle sits down in front of the oven to wait.', panels:[
      { who:'giggle', say:'Forty-five minutes is a very long time.' },
      { who:'chef', say:'Sixty minutes to an hour, sixty seconds to a minute, twenty-four hours to a day.' },
      { who:'giggle', say:'So five minutes is three hundred seconds. I shall count them.' },
      { cap:'Giggle got to forty-one.' },
    ]},
  ]},

{ id:'s3b10', stage:3, before:19, icon:'📕', name:'The 15:45 Train',
  teaches:'24-hour time', where:'Milbil Town station',
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
    { scene:'Brainy revises the measuring half of the stage. Cosy pulls the scarf up.', panels:[
      { cap:'Perimeter = all the way round. Area = long × short, in square units.' },
      { cap:'A right angle is 90°, a straight line 180°, a full turn 360°.' },
      { cap:'milli = a thousandth · centi = a hundredth · kilo = a thousand' },
      { who:'brainy', say:'And the train is late, which is a measurement nobody enjoys.' },
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
      { who:'wizzle', say:'Divide and multiply are equal partners — do whichever comes first.' },
    ]},
    { scene:'Chomp writes it again, with brackets this time.', panels:[
      { who:'chomp', say:'(3 + 4) × 2. Now it IS fourteen.' },
      { who:'wizzle', say:'Because brackets mean "do this bit first, no arguments".' },
      { cap:'If you are not sure somebody will read your sum the way you meant it, put brackets in.' },
      { who:'chomp', say:'Eleven dollars, then. I am paying in coins.' },
    ]},
  ]},

{ id:'s4b2', stage:4, before:3, icon:'📗', name:'Below Zero',
  teaches:'Negative numbers', where:'The freezer room behind the café',
  pages:[
    { scene:'Cosy is reading the thermometer and is not happy about it.', panels:[
      { who:'cosy', say:'Minus twelve. That is below nothing. How can there be less than nothing?' },
      { who:'snooze', say:'The number line does not stop at zero. It carries straight on underneath.' },
      { art:'numberline', cap:'Keep walking left past the nought and the numbers go negative.' },
      { who:'snooze', say:'Minus twelve is twelve steps below zero. Minus five is only five.' },
    ]},
    { scene:'Cosy works out which is colder and gets it backwards first.', panels:[
      { who:'cosy', say:'So minus twelve is BIGGER than minus five, because twelve is bigger.' },
      { who:'snooze', say:'Other way. The further below zero, the smaller — and the colder.' },
      { who:'cosy', say:'So minus one is nearly warm, and minus nine is miserable.' },
      { who:'snooze', say:'And if it rises five degrees from minus three, you land on two. Up through the nought.' },
    ]},
  ]},

{ id:'s4b3', stage:4, before:5, icon:'📙', name:'A Perfectly Square Patio',
  teaches:'Squares, cubes and roots', where:'Milbil Town 3D, a building site',
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
      { who:'sunny', say:'So 5² is twenty-five, not ten. The little number is a count, not a times.' },
      { cap:'Square numbers: 1, 4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144.' },
    ]},
    { scene:'Sunny has forty-nine tiles left over.', panels:[
      { who:'sunny', say:'Forty-nine tiles. Can I make another square out of exactly those?' },
      { who:'starry', say:'What times itself gives 49?' },
      { who:'sunny', say:'Seven. Seven by seven.' },
      { who:'starry', say:'Then the square root of 49 is 7. Same facts, read the other way round.' },
    ]},
  ]},

{ id:'s4b4', stage:4, before:7, icon:'📕', name:'A Letter in a Hat',
  teaches:'Letters for numbers', where:'Milbil Café, a very mysterious order',
  pages:[
    { scene:'Wizzle has ordered something but will not say how many.', panels:[
      { who:'wizzle', say:'I want some cakes. They are four dollars each. How much will it be?' },
      { who:'royal', say:'How many cakes?' },
      { who:'wizzle', say:'I shall not say. Call it n.' },
      { who:'royal', say:'Then it costs 4n dollars. Four times n, whatever n turns out to be.' },
    ]},
    { scene:'Wizzle is slightly disappointed to have been outmanoeuvred.', panels:[
      { who:'royal', say:'A letter is just a number wearing a hat. You can do arithmetic with it anyway.' },
      { who:'wizzle', say:'And if I tell you n is five?' },
      { who:'royal', say:'Then swap the letter out: 4 × 5 = 20. Twenty dollars.' },
      { cap:'4n always means 4 × n. The times sign is left out to keep it tidy.' },
    ]},
  ]},

{ id:'s4b5', stage:4, before:9, icon:'📗', name:'Swapping the Letter Out',
  teaches:'Substituting and simplifying', where:'The library, homework club',
  pages:[
    { scene:'Brainy has written 2x − 4 on the board and will not explain it.', panels:[
      { who:'toothy', say:'What is 2x − 4? I cannot do it, there is a letter in it.' },
      { who:'brainy', say:'You can once you know what x is. Say x is ten.' },
      { who:'toothy', say:'Then 2x is twenty. Twenty take four is sixteen.' },
      { who:'brainy', say:'That is substituting. The letter leaves, the number arrives, and it is ordinary maths.' },
    ]},
    { scene:'Brainy writes 3n + 2n underneath.', panels:[
      { who:'toothy', say:'Three ns and two ns. Can I add those without knowing n?' },
      { who:'brainy', say:'Yes — you are counting ns, not multiplying them. Five ns. 5n.' },
      { who:'toothy', say:'But 3n + 2a I could not touch.' },
      { cap:'Only matching letters add up. Three apples and two apples is five apples; three apples and two pears is not.' },
    ]},
  ]},

{ id:'s4b6', stage:4, before:11, icon:'📘', name:'Keep Both Sides Equal',
  teaches:'Solving equations', where:'The science room, one pair of scales',
  pages:[
    { scene:'Scoop has balanced a mystery parcel and seven weights against twelve weights.', panels:[
      { who:'scoop', say:'The parcel plus seven balances twelve. How heavy is the parcel?' },
      { who:'starry', say:'Take seven off. But take it off BOTH sides, or it tips.' },
      { art:'balance', cap:'Whatever you do to one side, do to the other.' },
      { who:'scoop', say:'Twelve take seven is five. The parcel is five.' },
    ]},
    { scene:'Starry sets up a harder one.', panels:[
      { who:'starry', say:'Now: 2x + 1 = 11. Two parcels and a weight against eleven.' },
      { who:'scoop', say:'Take the one off both sides — 2x = 10.' },
      { who:'scoop', say:'Then halve both sides. x = 5.' },
      { who:'starry', say:'Undo the adding first, the multiplying second. Backwards through the sum.' },
    ]},
  ]},

{ id:'s4b7', stage:4, before:13, icon:'📙', name:'One Part Cordial',
  teaches:'Ratio', where:'The Ningy-Ningy Canteen truck, a hot day',
  pages:[
    { scene:'Chef Bil is making a very large jug of cordial.', panels:[
      { who:'chef', say:'One part cordial to four parts water. One to four.' },
      { who:'toothy', say:'So one cup of cordial and four cups of water. Five cups in all.' },
      { who:'chef', say:'Right. Now do two cups of cordial.' },
      { who:'toothy', say:'Eight cups of water. Four times as much water, always.' },
    ]},
    { scene:'Chef Bil tidies the recipe card.', panels:[
      { who:'chef', say:'A ratio simplifies like a fraction. 4:8 both divide by four — that is 1:2.' },
      { who:'chef', say:'10:15 both divide by five. 2:3. Same mix, smaller numbers.' },
      { who:'toothy', say:'So the numbers can change as long as the mix does not.' },
      { cap:'A ratio is about the relationship, not the amount.' },
    ]},
  ]},

{ id:'s4b8', stage:4, before:15, icon:'📕', name:'Add the Parts First',
  teaches:'Sharing in a ratio, and rate', where:'Outside the truck, with twenty dollars',
  pages:[
    { scene:'Royal has money to split and is enjoying the suspense.', panels:[
      { who:'royal', say:'Share this twenty dollars between the two of you, one to three.' },
      { who:'toothy', say:'One dollar and three dollars?' },
      { who:'royal', say:'No. Add the numbers FIRST: 1 + 3 is four parts. Each part is $20 ÷ 4 = $5.' },
      { art:'ratio', cap:'One gets one part. The other gets three. $5 and $15.' },
    ]},
    { scene:'The truck drives off and Royal changes the subject.', panels:[
      { who:'royal', say:'That truck did 120 km in two hours. How fast?' },
      { who:'toothy', say:'Sixty kilometres every hour.' },
      { who:'royal', say:'Which is a RATE — a ratio where the two sides measure different things.' },
      { cap:'The slash means "per". Per hour, per cake, per kilogram.' },
    ]},
  ]},

{ id:'s4b9', stage:4, before:17, icon:'📗', name:'What Are the Odds?',
  teaches:'Probability', where:'The school fete, the lucky dip',
  pages:[
    { scene:'A bucket, five tickets, and a queue.', panels:[
      { who:'sporty', say:'Two red tickets and three blue. What is my chance of a red?' },
      { who:'brainy', say:'The ones you want over all the ones there are. Two out of five. 2/5.' },
      { who:'sporty', say:'And a coin? Heads?' },
      { who:'brainy', say:'One face out of two. A half. Which is also fifty per cent.' },
    ]},
    { scene:'Sporty tries to find the limits.', panels:[
      { who:'sporty', say:'What is the chance of rolling a seven on a normal dice?' },
      { who:'brainy', say:'Nought. There is no seven, so it cannot happen.' },
      { who:'sporty', say:'And something certain?' },
      { who:'brainy', say:'One. Chance runs from 0 to 1 and never leaves that stretch.' },
    ]},
  ]},

{ id:'s4b10', stage:4, before:19, icon:'📙', name:'The Last Book',
  teaches:'Averages, and everything in Stage 4', where:'Milbil Café, one dice and five scores',
  pages:[
    { scene:'Starry rolls a dice. Brainy writes everything down.', panels:[
      { who:'brainy', say:'Five scores on the board: 3, 7, 7, 9 and 14.' },
      { who:'starry', say:'And four different ways to sum them up, apparently.' },
      { who:'brainy', say:'Mean: add them all, divide by how many. Forty over five is eight.' },
      { who:'brainy', say:'Median: put them in order, take the middle one. Seven.' },
    ]},
    { scene:'Brainy will not stop.', panels:[
      { who:'brainy', say:'Mode: the one that turns up most often. Also seven.' },
      { who:'brainy', say:'Range: biggest take smallest. Fourteen take three is eleven.' },
      { who:'starry', say:'Mean, median, mode, range. Four answers to one pile of numbers.' },
      { who:'brainy', say:'Because they answer four different questions about it.' },
    ]},
    { scene:'Last page of the last book.', panels:[
      { cap:'BIDMAS: brackets, indices, divide and multiply, add and subtract.' },
      { cap:'Negative numbers carry on below zero. −9 is smaller than −1.' },
      { cap:'In algebra 4n means 4 × n, and only matching letters add up.' },
      { cap:'To solve an equation, undo what was done to x — on both sides.' },
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
