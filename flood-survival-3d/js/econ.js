// ---------- Numbers ----------
//
// Every balance decision in the game lives in this file. Nothing here imports
// anything, so it can be read top to bottom as the design document.
//
// The shape of the economy: you start with $10, which buys almost nothing. Raw
// materials are free but must be carried; the business turns them into money;
// money buys the timber that keeps you alive. The flood takes the free materials
// away from the bottom up, so early days are worth more than late ones.

export const START_MONEY = 10;
export const DAY_SECONDS = 135;        // real seconds per in-game day
export const SATCHEL = 16;             // raw units you can carry at once

// ---------------------------------------------------------------- raw materials
export const RES = {
  wood:  { name: 'Driftwood', ico: '🪵', color: 0x8b6a43, sell: 2 },
  scrap: { name: 'Scrap',     ico: '🔩', color: 0x8d949c, sell: 2 },
  clay:  { name: 'Clay',      ico: '🧱', color: 0xa4643c, sell: 1 },
  reed:  { name: 'Reeds',     ico: '🌾', color: 0xc4b072, sell: 1 },
};
export const RES_IDS = Object.keys(RES);

/** Where each raw material comes from, and how much a day the place holds. */
export const NODES = {
  woods:    { res: 'wood',  perDay: 16, verb: 'Cut driftwood' },
  junkyard: { res: 'scrap', perDay: 16, verb: 'Pull scrap' },
  claypit:  { res: 'clay',  perDay: 18, verb: 'Dig clay' },
  marsh:    { res: 'reed',  perDay: 20, verb: 'Cut reeds' },
};
export const GATHER_SECONDS = 0.85;    // per unit, holding the action

// ---------------------------------------------------------------- the business
// Products are made at your stall from raw materials and bought by neighbours
// who walk up. Tier raises the price you can charge, how many things you can
// have on the go, and how often somebody turns up.
export const PRODUCTS = [
  { id: 'sandbag',  name: 'Sandbag',   ico: '🧺', cost: { clay: 2, reed: 1 },          price: 6,  secs: 6,  tier: 1,
    blurb: 'Everyone wants these now.' },
  { id: 'bucket',   name: 'Bucket',    ico: '🪣', cost: { scrap: 2 },                  price: 8,  secs: 7,  tier: 1,
    blurb: 'Bailing out cellars all week.' },
  { id: 'paddle',   name: 'Paddle',    ico: '🛶', cost: { wood: 3 },                   price: 11, secs: 9,  tier: 1,
    blurb: 'Sells better once the streets go under.' },
  { id: 'raincoat', name: 'Reed Cape', ico: '🧥', cost: { reed: 2, scrap: 1 },         price: 12, secs: 10, tier: 1,
    blurb: 'Woven reed, tarred seams.' },
  { id: 'lifering', name: 'Life Ring', ico: '🛟', cost: { reed: 3, wood: 2 },          price: 18, secs: 13, tier: 2,
    blurb: 'The village council buys these.' },
  { id: 'pump',     name: 'Hand Pump', ico: '⚙️', cost: { scrap: 4, wood: 2 },         price: 28, secs: 16, tier: 3,
    blurb: 'The most money in the valley.' },
];

export const TIERS = [
  { name: 'Roadside Stall', ico: '🪧', slots: 1, mult: 1.00, custEvery: 9.0, cost: 0,
    blurb: 'A plank on two crates.' },
  { name: 'Handcart',       ico: '🛒', slots: 2, mult: 1.25, custEvery: 6.5, cost: 55,
    blurb: 'Two jobs at once, and you can charge more.' },
  { name: 'Workshop',       ico: '🏚️', slots: 3, mult: 1.55, custEvery: 4.5, cost: 150,
    blurb: 'A real shopfront. Three jobs, best prices.' },
];

// ---------------------------------------------------------------- depot
export const MATERIALS = {
  beam:   { name: 'Stilt Beam', ico: '🪵', base: 11 },
  plank:  { name: 'Plank',      ico: '🟫', base: 6 },
  nail:   { name: 'Nails',      ico: '📌', base: 3 },
  rope:   { name: 'Rope',       ico: '🪢', base: 5 },
  tarp:   { name: 'Tarpaulin',  ico: '🟩', base: 8 },
  pitch:  { name: 'Pitch',      ico: '🛢️', base: 7 },
  canvas: { name: 'Sailcloth',  ico: '⛵', base: 12 },
};
export const MAT_IDS = Object.keys(MATERIALS);

/** Depot prices climb as the valley runs short. Rounded up, so it always bites. */
export function matPrice(id, day){
  return Math.ceil(MATERIALS[id].base * (1 + 0.055 * day));
}

// ---------------------------------------------------------------- the projects
// Two ways out, and you probably cannot afford both.
//
// `stand` is how high above the homestead pad that stage lets you stand, and it
// is the only place that number lives — the meshes in world.js are built to it,
// the flood gauge measures against it, and the ending is decided by it. Getting
// them to agree by writing absolute heights in two places is how the plans end
// up promising a metre the deck does not have.
export const PROJECTS = {
  house: {
    name: 'Raise the House', ico: '🏠',
    blurb: 'Costlier, but you keep your home, your stall and everything in it.',
    stages: [
      { name: 'Stilt Posts',  need: { beam: 6, nail: 12 },            work: 7,  stand: 0,
        note: 'Six posts sunk into the pad. Nothing to stand on yet.' },
      { name: 'Deck Floor',   need: { plank: 10, nail: 8 },           work: 9,  stand: 2.1,
        note: 'A floor you can stand and trade on.' },
      { name: 'Walls',        need: { plank: 14, nail: 10, tarp: 2 }, work: 11, stand: 2.1,
        note: 'Weatherboard and tarred sheet. No higher, but the roof needs them.' },
      { name: 'Roof Platform', need: { plank: 8, tarp: 1, rope: 4 },  work: 12, stand: 6.7,
        note: 'The bit that actually clears the surge.' },
    ],
  },
  boat: {
    name: 'Build a Boat', ico: '⛵',
    blurb: 'Cheaper and faster. You float out, but the valley keeps the rest.',
    stages: [
      { name: 'Keel',      need: { beam: 3, nail: 6 },              work: 7,
        note: 'One long spine on the slip.' },
      { name: 'Ribs',      need: { plank: 8, nail: 8 },             work: 9,
        note: 'Bent frames, steamed over the fire.' },
      { name: 'Planking',  need: { plank: 14, nail: 12, pitch: 2 }, work: 12,
        note: 'Sealed hull. It would float now, barely.' },
      { name: 'Mast & Sail', need: { canvas: 1, rope: 4, beam: 2 }, work: 10,
        note: 'Steering, so the current does not decide for you.' },
    ],
  },
};

// ---------------------------------------------------------------- player body
export const STAMINA = {
  max: 100,
  sprint: 13,      // drain per second
  swim: 9,
  work: 7,
  gather: 3,
  regen: 12,
  regenWalk: 6,
};

export const SPEED = { walk: 6.6, sprint: 10.6, swim: 3.4, wade: 4.2 };

/** Total money a project still needs at today's prices. Drives the HUD advice. */
export function projectRemaining(project, stageIndex, stock, day){
  let money = 0;
  const short = {};
  for (let i = stageIndex; i < project.stages.length; i++){
    for (const [id, qty] of Object.entries(project.stages[i].need)){
      short[id] = (short[id] || 0) + qty;
    }
  }
  for (const [id, qty] of Object.entries(short)){
    const missing = Math.max(0, qty - (stock[id] || 0));
    money += missing * matPrice(id, day);
  }
  return { money, short };
}
