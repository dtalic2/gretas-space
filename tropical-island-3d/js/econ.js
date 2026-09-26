// ---------- Coconut Cove: every number that shapes how the game feels ----------
//
// Imports nothing, so it reads as the design document.

// One day, dawn to dawn, in real seconds. The first DAY_SPLIT is daylight.
export const DAY_SECONDS = 300;
export const DAY_SPLIT = 0.76;

export const SPEED = { walk: 5, run: 8, swim: 3.2, snorkel: 4.4, dive: 3.4, turtle: 7.5, jump: 7 };
export const BREATH = 12;                // seconds underwater with a snorkel

// Things that fit in your bag.
export const ITEMS = {
  mango:   { name: 'Mango',   icon: '🥭', price: 2 },
  banana:  { name: 'Banana',  icon: '🍌', price: 2 },
  coconut: { name: 'Coconut', icon: '🥥', price: 4 },
  seaweed: { name: 'Seaweed', icon: '🌿', price: 1 },
  shell:   { name: 'Seashell', icon: '🐚', price: 3 },
  star:    { name: 'Starfish', icon: '⭐', price: 6 },
  pearl:   { name: 'Pearl',   icon: '⚪', price: 25 },
};

/*
 * Fish. `where` is 'shallow' (the lagoon), 'deep' (outside it) or 'any'.
 * `weight` is how common it is; `speed` is how fast the needle moves when you
 * reel it in, and `zone` how wide the green catch zone is (0–1).
 */
export const FISH = [
  { key: 'sardine', name: 'Sardine',     icon: '🐟', where: 'any',     weight: 30, price: 3,  size: [10, 20],   color: 0x9fb7c4, speed: 1.0, zone: 0.34 },
  { key: 'clown',   name: 'Clownfish',   icon: '🐠', where: 'shallow', weight: 20, price: 6,  size: [8, 12],    color: 0xff7a1a, speed: 1.2, zone: 0.3 },
  { key: 'tang',    name: 'Blue Tang',   icon: '🐠', where: 'shallow', weight: 18, price: 7,  size: [15, 30],   color: 0x2f6ae0, speed: 1.3, zone: 0.28 },
  { key: 'puffer',  name: 'Pufferfish',  icon: '🐡', where: 'any',     weight: 12, price: 10, size: [15, 40],   color: 0xd8c070, speed: 1.1, zone: 0.26 },
  { key: 'parrot',  name: 'Parrotfish',  icon: '🐠', where: 'shallow', weight: 12, price: 9,  size: [30, 60],   color: 0x3ad0a0, speed: 1.4, zone: 0.25 },
  { key: 'snapper', name: 'Red Snapper', icon: '🐟', where: 'deep',    weight: 18, price: 12, size: [30, 70],   color: 0xd83a3a, speed: 1.5, zone: 0.24 },
  { key: 'mahi',    name: 'Mahi-mahi',   icon: '🐟', where: 'deep',    weight: 10, price: 18, size: [60, 120],  color: 0x5ac040, speed: 1.8, zone: 0.2 },
  { key: 'squid',   name: 'Glow Squid',  icon: '🦑', where: 'any',     weight: 12, price: 20, size: [20, 50],   color: 0x7af0ff, speed: 1.6, zone: 0.22, night: true },
  { key: 'boot',    name: 'Old Boot',    icon: '👢', where: 'any',     weight: 7,  price: 0,  size: [26, 30],   color: 0x5a4030, speed: 0.6, zone: 0.4 },
  { key: 'sword',   name: 'Swordfish',   icon: '🗡️', where: 'deep',    weight: 3,  price: 45, size: [150, 300], color: 0x4a6fa0, speed: 2.3, zone: 0.16 },
  { key: 'golden',  name: 'Golden Fish', icon: '✨', where: 'any',     weight: 1,  price: 100, size: [40, 60],  color: 0xffd23a, speed: 2.6, zone: 0.14, legend: true },
];

export const FISHING = {
  castTime: 0.6,
  wait: [2, 6],             // seconds before a bite
  bite: 1.1,                // seconds to notice the bite and press
  reach: 5.5,               // how far out the bobber lands
};

// Kai's Tiki Shack.
export const SHOP = {
  snorkel: { name: 'Snorkel & Fins', icon: '🤿', price: 30, text: 'Dive under the water (hold Dive) and swim faster.' },
  rod:     { name: 'Pro Fishing Rod', icon: '🎣', price: 50, text: 'A wider catch zone, and rare fish bite more often.' },
  ukulele: { name: 'Ukulele',        icon: '🎸', price: 25, text: 'Play a tune. Your animal friends love to dance.' },
  hat:     { name: 'Sun Hat',        icon: '👒', price: 12, text: 'Keeps the sun off. Very stylish.' },
  lei:     { name: 'Flower Lei',     icon: '🌺', price: 8,  text: 'A garland of hibiscus flowers.' },
  glasses: { name: 'Sunglasses',     icon: '🕶️', price: 15, text: 'Cool.' },
};

// Your animal friends. Each wants a favourite food; petting helps once a day.
export const ANIMALS = {
  dog:     { name: 'Coco',   kind: 'dog',     icon: '🐶', food: null,      hearts: 3 },
  parrot:  { name: 'Pip',    kind: 'parrot',  icon: '🦜', food: 'mango',   hearts: 3 },
  monkey:  { name: 'Momo',   kind: 'monkey',  icon: '🐒', food: 'banana',  hearts: 3 },
  turtle:  { name: 'Shelly', kind: 'turtle',  icon: '🐢', food: 'seaweed', hearts: 3 },
  crab:    { name: 'Pinch',  kind: 'crab',    icon: '🦀', food: 'fish',    hearts: 3 },
  dolphin: { name: 'Splash', kind: 'dolphin', icon: '🐬', food: 'fish',    hearts: 3 },
};

// Fruit and shells come back after this many seconds.
export const REGROW = { mango: 60, banana: 60, coconut: 90, shell: 45, seaweed: 40, pearl: 120, star: 70 };
