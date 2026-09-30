// Everything tunable lives here. Times are in seconds, prices in coins.

export const START = { coins: 10, plots: 4, storage: 20, stall: 12 };

export const MAX_PLOTS = 30;
export const DAY_LENGTH = 60;          // one market day, in real seconds

// fair: what the town thinks a crop is worth today (it drifts day to day).
// demand: how many shoppers want it on an ordinary day.
// tier: 0 = any soil, 1 = needs the Greenhouse, 2 = needs the Tropical Dome.
export const CROPS = [
  { id: 'lettuce',    name: 'Lettuce',      emoji: '🥬', seed: 2,   grow: 15,  fair: 5,    demand: 16, tier: 0 },
  { id: 'carrot',     name: 'Carrot',       emoji: '🥕', seed: 3,   grow: 22,  fair: 8,    demand: 14, tier: 0 },
  { id: 'potato',     name: 'Potato',       emoji: '🥔', seed: 5,   grow: 30,  fair: 12,   demand: 12, tier: 0 },
  { id: 'corn',       name: 'Corn',         emoji: '🌽', seed: 8,   grow: 40,  fair: 19,   demand: 10, tier: 0 },
  { id: 'tomato',     name: 'Tomato',       emoji: '🍅', seed: 12,  grow: 50,  fair: 28,   demand: 9,  tier: 0 },
  { id: 'strawberry', name: 'Strawberry',   emoji: '🍓', seed: 18,  grow: 60,  fair: 42,   demand: 8,  tier: 0 },
  { id: 'eggplant',   name: 'Eggplant',     emoji: '🍆', seed: 26,  grow: 75,  fair: 60,   demand: 6,  tier: 0 },
  { id: 'pumpkin',    name: 'Pumpkin',      emoji: '🎃', seed: 40,  grow: 90,  fair: 90,   demand: 5,  tier: 0 },
  { id: 'watermelon', name: 'Watermelon',   emoji: '🍉', seed: 60,  grow: 110, fair: 135,  demand: 4,  tier: 0 },

  { id: 'pineapple',  name: 'Pineapple',    emoji: '🍍', seed: 90,  grow: 120, fair: 230,  demand: 4,  tier: 1, exotic: true },
  { id: 'kiwi',       name: 'Kiwi',         emoji: '🥝', seed: 110, grow: 130, fair: 285,  demand: 3,  tier: 1, exotic: true },
  { id: 'mango',      name: 'Mango',        emoji: '🥭', seed: 140, grow: 150, fair: 360,  demand: 3,  tier: 1, exotic: true },
  { id: 'coconut',    name: 'Coconut',      emoji: '🥥', seed: 220, grow: 180, fair: 560,  demand: 3,  tier: 2, exotic: true },
  { id: 'starfruit',  name: 'Star Fruit',   emoji: '⭐', seed: 340, grow: 210, fair: 880,  demand: 2,  tier: 2, exotic: true },
  { id: 'goldmelon',  name: 'Golden Melon', emoji: '🍈', seed: 520, grow: 240, fair: 1400, demand: 2,  tier: 2, exotic: true },
];

export const CROP = Object.fromEntries(CROPS.map(c => [c.id, c]));

// Rival farmers. `style` decides how they price; `grows` is what they bring
// to market; `supply` is roughly what share of the town's demand they fill.
export const RIVALS = [
  {
    id: 'bramble', name: 'Bramble', emoji: '🦊', style: 'undercut',
    blurb: 'Always tries to be the cheapest stall — but won\'t sell at a loss.',
    grows: ['carrot', 'potato', 'corn', 'tomato', 'pumpkin'], supply: 0.22,
  },
  {
    id: 'mo', name: 'Old Mo', emoji: '🐻', style: 'steady',
    blurb: 'Sells at the guide price and never changes it during the day.',
    grows: ['lettuce', 'carrot', 'potato', 'strawberry', 'eggplant', 'watermelon', 'pineapple'], supply: 0.2,
  },
  {
    id: 'posy', name: 'Posy', emoji: '🐰', style: 'premium',
    blurb: 'Small batches, fancy prices. The only rival with a hothouse.',
    grows: ['strawberry', 'tomato', 'eggplant', 'kiwi', 'mango', 'starfruit'], supply: 0.16,
  },
  {
    id: 'hank', name: 'Hank', emoji: '🦝', style: 'wild',
    blurb: 'Picks his prices by feel. Some days a bargain, some days a rip-off.',
    grows: ['carrot', 'corn', 'tomato', 'pumpkin', 'watermelon', 'coconut'], supply: 0.2,
  },
];

export const RIVAL = Object.fromEntries(RIVALS.map(r => [r.id, r]));

// Plots cost more the more land you already own.
export function plotBase(owned) {
  return Math.round(20 * Math.pow(1.28, owned - START.plots));
}
// The council always sells land, but at a premium over what farmers ask.
export const COUNCIL_MARKUP = 1.5;

// Things to build. `max` is how many you can own; cost grows by `grow` each time.
export const BUILDINGS = [
  { id: 'shed',     name: 'Tool Shed',     emoji: '🛖', cost: 30,   grow: 1.9, max: 6,
    text: '+15 storage for harvested crops.' },
  { id: 'barn',     name: 'Big Barn',      emoji: '🏚️', cost: 450,  grow: 1,   max: 1,
    text: '+60 storage. Room for a serious harvest.' },
  { id: 'stall',    name: 'Bigger Stall',  emoji: '🎪', cost: 45,   grow: 2.2, max: 4,
    text: '+12 spaces on your market stall.' },
  { id: 'scarecrow',name: 'Scarecrow',     emoji: '🧑‍🌾', cost: 80,   grow: 1,   max: 1,
    text: '15% chance of a double harvest.' },
  { id: 'sprinkler',name: 'Sprinklers',    emoji: '💦', cost: 140,  grow: 1,   max: 1,
    text: 'Everything grows 30% faster.' },
  { id: 'sign',     name: 'Painted Sign',  emoji: '🪧', cost: 160,  grow: 1,   max: 1,
    text: 'Shoppers notice your stall — they\'ll pay up to 6% more to buy from you.' },
  { id: 'greenhouse',name:'Greenhouse',    emoji: '🏡', cost: 260,  grow: 1,   max: 1,
    text: 'Lets you grow Pineapple, Kiwi and Mango.' },
  { id: 'dome',     name: 'Tropical Dome', emoji: '🌴', cost: 1600, grow: 1,   max: 1, needs: 'greenhouse',
    text: 'Lets you grow Coconut, Star Fruit and Golden Melon.' },
];

export const BUILDING = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
