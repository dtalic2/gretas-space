// ---------- Game content: dogs, outfits, power-ups, missions, rivals ----------
// Everything tunable lives here so balancing never means digging through the engine.

export const LANE_X = [-2.4, 0, 2.4];

export const RUN = {
  startSpeed: 13,        // m/s
  maxSpeed: 32,
  accel: 0.16,           // m/s gained per second of running
  gravity: 38,
  jumpVel: 13.5,
  slideTime: 0.75,
  laneSwitchTime: 0.14,
  questionEvery: [150, 210], // metres between answer gates (min, max) at start
  questionEveryLate: [120, 170],
  gateLead: 70,          // metres before a gate that its question appears
  scorePerMetre: 1,
  scorePerCorrect: 50,
  fastBonus: 25,         // extra points for answering in under FAST_ANSWER_SEC
};

export const FAST_ANSWER_SEC = 2.5;

// ---------- Levels ----------
export function xpForLevel(level){ return Math.round(250 * Math.pow(level, 1.35)); }

// ---------- Dogs ----------
// Each dog is built from primitives by dog.js from these parameters.
export const DOGS = [
  { id:'milo', name:'Milo', breed:'Beagle', unlock:1,
    blurb:'The clever hero. Nose for numbers.',
    body:0xc8843f, belly:0xf6ead7, ears:0x6b3d1d, nose:0x222222, patch:0xffffff,
    size:1.0, legLen:1.0, snout:1.0, earType:'floppy', tail:'straight', tailTip:0xffffff },
  { id:'pug', name:'Pip', breed:'Pug', unlock:3,
    blurb:'Small, round and surprisingly quick.',
    body:0xe3c38f, belly:0xe9d0a4, ears:0x3a2a22, nose:0x1a1a1a, mask:0x3a2a22,
    size:0.9, legLen:0.75, snout:0.45, earType:'fold', tail:'curl', chubby:1.18 },
  { id:'corgi', name:'Biscuit', breed:'Corgi', unlock:5,
    blurb:'Tiny legs, enormous enthusiasm.',
    body:0xe08a3c, belly:0xffffff, ears:0xe08a3c, nose:0x1a1a1a, patch:0xffffff,
    size:1.0, legLen:0.6, snout:0.9, earType:'pointy', earScale:1.35, tail:'stub', long:1.2 },
  { id:'dalmatian', name:'Dotty', breed:'Dalmatian', unlock:8,
    blurb:'Spotted 101 times tables. Probably.',
    body:0xfafafa, belly:0xffffff, ears:0x222222, nose:0x111111, spots:0x1d1d1d,
    size:1.05, legLen:1.2, snout:1.1, earType:'floppy', tail:'straight' },
  { id:'shiba', name:'Kiko', breed:'Shiba Inu', unlock:11,
    blurb:'Much speed. Very multiply. Wow.',
    body:0xd9822b, belly:0xfff4e0, ears:0xd9822b, nose:0x1a1a1a, patch:0xfff4e0,
    size:1.0, legLen:1.0, snout:0.85, earType:'pointy', tail:'curl' },
  { id:'malamute', name:'Blizzard', breed:'Alaskan Malamute', unlock:15,
    blurb:'Built for snow, happy on tarmac.',
    body:0x5f6670, belly:0xf3f3f3, ears:0x4a5058, nose:0x111111, mask:0xf3f3f3, maskLight:true,
    size:1.2, legLen:1.1, snout:1.0, earType:'pointy', tail:'curl', fluffy:true },
  { id:'golden', name:'Sunny', breed:'Golden Retriever', unlock:20,
    blurb:'Fetches answers before you finish asking.',
    body:0xe0a950, belly:0xf2cf8a, ears:0xc98f3a, nose:0x2a1a12,
    size:1.12, legLen:1.1, snout:1.05, earType:'floppy', tail:'plume', fluffy:true },
];

// ---------- Outfits ----------
// slot: hat | eyes | neck | back. Shape keys are handled in dog.js.
export const OUTFITS = [
  { id:'cap',       slot:'hat',  name:'Red Cap',       price:120, color:0xe63946 },
  { id:'beanie',    slot:'hat',  name:'Bobble Beanie', price:180, color:0x4cc9f0, color2:0xffffff },
  { id:'party',     slot:'hat',  name:'Party Hat',     price:220, color:0xff4fa3, color2:0xffe066 },
  { id:'cowboy',    slot:'hat',  name:'Cowboy Hat',    price:350, color:0x8b5a2b },
  { id:'tophat',    slot:'hat',  name:'Top Hat',       price:500, color:0x1f1f24, color2:0xd62828 },
  { id:'crown',     slot:'hat',  name:'Gold Crown',    price:1200, color:0xffc933, level:10 },
  { id:'shades',    slot:'eyes', name:'Cool Shades',   price:150, color:0x111111 },
  { id:'nerd',      slot:'eyes', name:'Maths Specs',   price:200, color:0x2b2d42 },
  { id:'star',      slot:'eyes', name:'Star Glasses',  price:400, color:0xffd166 },
  { id:'bandana',   slot:'neck', name:'Bandana',       price:100, color:0xd62828 },
  { id:'bowtie',    slot:'neck', name:'Bow Tie',       price:160, color:0x7209b7 },
  { id:'scarf',     slot:'neck', name:'Stripy Scarf',  price:240, color:0x06d6a0, color2:0xffffff },
  { id:'medal',     slot:'neck', name:'Times Medal',   price:800, color:0xffc933, level:7 },
  { id:'cape',      slot:'back', name:'Hero Cape',     price:450, color:0xe63946 },
  { id:'backpack',  slot:'back', name:'School Bag',    price:300, color:0x3a86ff },
  { id:'jetpack',   slot:'back', name:'Toy Jetpack',   price:900, color:0xadb5bd, color2:0xff7b00, level:12 },
];

// ---------- Power-ups ----------
// Durations scale with upgrade level (0..5). Shield is a hit-absorber, not timed.
export const POWERUPS = {
  magnet: { name:'Coin Magnet', icon:'🧲', color:0xff3b5c, base:8,  perLevel:2,
            desc:'Pulls in every coin nearby.' },
  double: { name:'Double Coins', icon:'✖️2', color:0xffc933, base:10, perLevel:2.5,
            desc:'Every coin counts twice.' },
  shield: { name:'Shield', icon:'🛡️', color:0x4cc9f0, base:12, perLevel:3,
            desc:'Survive one crash or wrong answer.' },
  rocket: { name:'Rocket', icon:'🚀', color:0xff7b00, base:5,  perLevel:1,
            desc:'Fly above the traffic, grabbing sky coins.' },
};
export const UPGRADE_COST = [150, 400, 900, 1800, 3500];   // cost to reach level 1..5

// Consumables bought before a run.
export const BOOSTS = [
  { id:'headstart', name:'Head Start', icon:'⏩', price:250,
    desc:'Rocket off the line for 400 m.' },
  { id:'startshield', name:'Starting Shield', icon:'🛡️', price:150,
    desc:'Begin your run already shielded.' },
  { id:'revive', name:'Second Chance', icon:'💖', price:300,
    desc:'Carry a spare life — crash once for free.' },
];

// ---------- Missions ----------
// Missions are one-off goals; three are active at a time, next in line replaces a completed one.
// type:  run (metres in one run) | coins (in one run) | correct (in one run) | streak |
//        jumps (in one run) | slides | powerups | totalCorrect | table:N | runs | fast
export const MISSION_POOL = [
  { type:'run', goal:500,    reward:100, text:'Run 500 m in one go' },
  { type:'coins', goal:50,   reward:100, text:'Collect 50 coins in one run' },
  { type:'correct', goal:5,  reward:120, text:'Answer 5 questions in one run' },
  { type:'jumps', goal:10,   reward:80,  text:'Jump 10 times in one run' },
  { type:'streak', goal:5,   reward:120, text:'Get a streak of 5 answers' },
  { type:'slides', goal:8,   reward:80,  text:'Slide 8 times in one run' },
  { type:'powerups', goal:3, reward:120, text:'Grab 3 power-ups in one run' },
  { type:'run', goal:1000,   reward:180, text:'Run 1,000 m in one go' },
  { type:'fast', goal:5,     reward:150, text:'Answer 5 questions super fast' },
  { type:'coins', goal:150,  reward:200, text:'Collect 150 coins in one run' },
  { type:'correct', goal:10, reward:220, text:'Answer 10 questions in one run' },
  { type:'table', table:7, goal:5, reward:200, text:'Get 5 × 7 questions right' },
  { type:'streak', goal:10,  reward:250, text:'Get a streak of 10 answers' },
  { type:'run', goal:2000,   reward:300, text:'Run 2,000 m in one go' },
  { type:'table', table:8, goal:5, reward:220, text:'Get 5 × 8 questions right' },
  { type:'totalCorrect', goal:100, reward:400, text:'Answer 100 questions in total' },
  { type:'coins', goal:300,  reward:350, text:'Collect 300 coins in one run' },
  { type:'correct', goal:20, reward:400, text:'Answer 20 questions in one run' },
  { type:'table', table:12, goal:5, reward:300, text:'Get 5 × 12 questions right' },
  { type:'streak', goal:20,  reward:500, text:'Get a streak of 20 answers' },
  { type:'run', goal:4000,   reward:600, text:'Run 4,000 m in one go' },
  { type:'totalCorrect', goal:500, reward:1000, text:'Answer 500 questions in total' },
];

// Daily quests are drawn from this pool, seeded by the date so everyone's day is the same.
export const DAILY_POOL = [
  { type:'runs', goal:3,     reward:150, text:'Go for 3 runs' },
  { type:'correct', goal:15, reward:200, text:'Answer 15 questions today', cumulative:true },
  { type:'coins', goal:200,  reward:200, text:'Collect 200 coins today', cumulative:true },
  { type:'run', goal:1500,   reward:250, text:'Run 1,500 m in one go' },
  { type:'streak', goal:8,   reward:220, text:'Get a streak of 8' },
  { type:'fast', goal:10,    reward:220, text:'Answer 10 super fast today', cumulative:true },
  { type:'jumps', goal:40,   reward:150, text:'Jump 40 times today', cumulative:true },
  { type:'powerups', goal:6, reward:180, text:'Grab 6 power-ups today', cumulative:true },
  { type:'table', table:6, goal:8, reward:220, text:'Get 8 × 6 questions right today', cumulative:true },
  { type:'table', table:9, goal:8, reward:220, text:'Get 8 × 9 questions right today', cumulative:true },
  { type:'table', table:4, goal:8, reward:200, text:'Get 8 × 4 questions right today', cumulative:true },
];

// Login reward ladder (day 1..7, then repeats).
export const DAILY_REWARD = [50, 75, 100, 150, 200, 300, 500];

// ---------- Rivals ----------
// Funny dogs with scores to beat. They show up running beside you as you close in.
export const RIVALS = [
  { name:'Sausage the Dachshund', score:600,    dog:'corgi',     tint:0x7a3b12,
    taunt:'My legs are short but my lead is long!', lose:'I was just stretching…' },
  { name:'Bruno the Pug',        score:1500,   dog:'pug',       tint:null,
    taunt:'Snort! You\'ll never catch me!', lose:'Snort… rematch tomorrow!' },
  { name:'Fifi the Poodle',      score:3000,   dog:'dalmatian', tint:0xf7c6d9,
    taunt:'Darling, try to keep up.', lose:'My fur got messed up. That\'s why.' },
  { name:'Rex the Bulldog',      score:5000,   dog:'pug',       tint:0xbfa58a,
    taunt:'GRRR. Seven eights? Easy. FIFTY-SIX!', lose:'Grr… good run, pup.' },
  { name:'Duchess the Greyhound', score:8000,  dog:'dalmatian', tint:0x9aa3ad,
    taunt:'I was born to run. You were born to… try?', lose:'Impossible! Nobody outruns me!' },
  { name:'Captain Woof',         score:12000,  dog:'malamute',  tint:0x2d3142,
    taunt:'Ahoy! Only the best reach me.', lose:'Ye be the fastest pup on the seven streets!' },
  { name:'Professor Paws',       score:20000,  dog:'golden',    tint:0xeeeeee,
    taunt:'Twelve twelves are one hundred and forty-four. Can you keep up?', lose:'Remarkable! Top of the class!' },
];

// ---------- Obstacle kinds ----------
// action: what the player must do. 'jump' = low, 'slide' = high, 'dodge' = full block.
export const OBSTACLES = {
  barrierLow:  { action:'jump',  len:0.6 },
  barrierHigh: { action:'slide', len:0.6 },
  cone:        { action:'jump',  len:0.8 },
  car:         { action:'dodge', len:4.2 },
  taxi:        { action:'dodge', len:4.2 },
  bus:         { action:'dodge', len:10 },
  truck:       { action:'dodge', len:8 },
};

export const TABLE_CHOICES = [1,2,3,4,5,6,7,8,9,10,11,12];
