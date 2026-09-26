// ---------- Middle Island: every balance decision ----------
//
// Imports nothing. If a number changes how the game feels, it lives here, so
// this file can be read as the design document.

// One full day, dawn to dawn, in real seconds. The first DAY_SPLIT of it is
// daylight (6:00 → 20:00); the rest is night (20:00 → 6:00).
export const DAY_SECONDS = 240;
export const DAY_SPLIT = 0.75;

export const RES = {
  wood:  { name: 'Wood',     icon: '🪵' },
  stone: { name: 'Stone',    icon: '🪨' },
  iron:  { name: 'Iron ore', icon: '🔩' },
  food:  { name: 'Food',     icon: '🍞' },
};
export const RES_KEYS = Object.keys(RES);

export const START = { wood: 0, stone: 0, iron: 0, food: 4 };

// What you can take off the land. `hp` is how many swings before it is spent;
// each swing gives `yield`. Spent nodes come back after `regrow` seconds.
export const NODES = {
  tree:  { res: 'wood',  hp: 4, yield: 1, swing: 1.0, regrow: 150, verb: 'Chop tree',  tool: 'axe' },
  rock:  { res: 'stone', hp: 5, yield: 1, swing: 1.15, regrow: 200, verb: 'Mine rock', tool: 'pick' },
  iron:  { res: 'iron',  hp: 3, yield: 1, swing: 1.6, regrow: 260, verb: 'Mine iron ore', tool: 'pick' },
  bush:  { res: 'food',  hp: 3, yield: 1, swing: 0.8, regrow: 110, verb: 'Pick berries', tool: 'hand' },
  fish:  { res: 'food',  hp: 2, yield: 1, swing: 2.2, regrow: 60,  verb: 'Catch fish', tool: 'rod' },
};

// Upgrades bought at the Blacksmith. `speed` divides swing time, `bonus` adds
// to every swing's yield.
export const UPGRADES = {
  axe:   { name: 'Iron Axe',     icon: '🪓', cost: { iron: 3, wood: 4 }, text: 'Chop twice as fast, +1 wood a swing.', speed: 1.8, bonus: 1 },
  pick:  { name: 'Iron Pickaxe', icon: '⛏️', cost: { iron: 3, wood: 4 }, text: 'Mine twice as fast, +1 stone a swing.', speed: 1.8, bonus: 1 },
  sword: { name: 'Steel Sword',  icon: '🗡️', cost: { iron: 5 },          text: 'Wolves run off after one hit instead of three.' },
  net:   { name: 'Fishing Net',  icon: '🥅', cost: { wood: 6, iron: 1 }, text: 'Twice the fish from every cast.', bonus: 1 },
};

/*
 * Buildings. `r` is the footprint radius (for placement and collision), `time`
 * is seconds of hammering to finish it. `needs` lists buildings you must have
 * already finished. Order here is the order in the build menu.
 */
export const BUILDINGS = {
  campfire:   { name: 'Campfire',       icon: '🔥', cost: { wood: 4 },                     r: 1.3, time: 2.5, solid: false,
                text: 'Warmth and light. Wolves keep their distance.', warm: 7, light: 9 },
  torch:      { name: 'Torch Post',     icon: '🕯️', cost: { wood: 2 },                     r: 0.5, time: 1.2, solid: true,
                text: 'A little light for the path. Wolves hate it.', light: 6 },
  hut:        { name: 'Straw Hut',      icon: '🛖', cost: { wood: 12 },                    r: 2.4, time: 5, solid: true,
                text: 'Somewhere to sleep through the night.', warm: 4.5, sleep: true, needs: ['campfire'] },
  farm:       { name: 'Wheat Farm',     icon: '🌾', cost: { wood: 8, food: 2 },            r: 3.6, time: 4, solid: false,
                text: 'Grows wheat. Harvest it for bread.', needs: ['hut'] },
  cottage:    { name: 'Timber Cottage', icon: '🏡', cost: { wood: 20, stone: 12 },         r: 3.4, time: 9, solid: true,
                text: 'Two settlers move in and gather for you.', warm: 5, sleep: true, settlers: 2, needs: ['farm'] },
  well:       { name: 'Stone Well',     icon: '🪣', cost: { stone: 14, wood: 4 },          r: 1.6, time: 6, solid: true,
                text: 'Drink to heal. Farms grow faster near water.', needs: ['cottage'] },
  blacksmith: { name: 'Blacksmith',     icon: '⚒️', cost: { wood: 18, stone: 18, iron: 4 }, r: 3.6, time: 10, solid: true,
                text: 'Forge iron tools and a sword.', warm: 6, light: 7, needs: ['well'] },
  windmill:   { name: 'Windmill',       icon: '🌬️', cost: { wood: 24, stone: 16 },         r: 3.0, time: 12, solid: true,
                text: 'Grinds your wheat. Every harvest gives more bread.', needs: ['blacksmith'] },
  watchtower: { name: 'Watchtower',     icon: '🗼', cost: { wood: 20, stone: 10 },         r: 2.3, time: 9, solid: true,
                text: 'A torch up high. Wolves will not come near.', light: 22, needs: ['blacksmith'] },
  chapel:     { name: 'Chapel',         icon: '⛪', cost: { wood: 20, stone: 36, iron: 2 }, r: 4.6, time: 14, solid: true,
                text: 'A bell tower. Two more settlers join the village.', warm: 5, settlers: 2, needs: ['windmill'] },
  castle:     { name: 'Castle Keep',    icon: '🏰', cost: { wood: 60, stone: 80, iron: 15 }, r: 8.5, time: 25, solid: true,
                text: 'Four towers and a flag. Become Lord of Middle Island.', warm: 12, light: 16, sleep: true, settlers: 4,
                needs: ['chapel', 'watchtower'], minSettlers: 4 },
};

// Survival. Bars run 0–100; rates are per second.
export const BODY = {
  hungerDrain: 0.26,       // ≈ six and a half minutes from full to empty
  eatBelow: 35,            // you eat on your own when hunger drops below this
  eatGives: 28,
  coldDrain: 1.4,          // warmth lost per second at night away from a fire
  warmGain: 9,
  dayWarmGain: 2.5,
  starveHurt: 1.4,
  freezeHurt: 1.8,
  regen: 1.0,              // health back per second when fed and warm
  wellHeal: 40,
};

export const SPEED = { walk: 5.2, run: 8.4 };

export const WOLF = {
  hits: 3,
  bite: 8,
  biteEvery: 0.5,          // the first bite comes quickly once it reaches you
  sense: 15,               // how far away they notice you
  speed: 5.6,
  max: 5,
};

// Settlers bring in a share of the island every SETTLER_EVERY seconds, and
// each eats SETTLER_EATS food per day.
export const SETTLER_EVERY = 35;
export const SETTLER_EATS = 1;

// Farms.
export const FARM = { grow: 90, growWell: 60, food: 5, mill: 3 };

// Build help: each settler adds this fraction of your own hammering speed to
// any site that is under construction.
export const SETTLER_BUILD = 0.18;
