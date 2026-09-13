// ---------- Tower upgrades ----------
//
// Coins come off Milbils, and this is the only place they go. Each upgrade is a
// short ladder with hand-set prices rather than a formula, so the first rung
// lands within a round or two of play and the last is a genuine project.
//
// A typical Milbil pays 30, so read every price below as "about this many
// Milbils".
//
// The ladders are grouped by what they change, not by price: the laser itself,
// what happens where the beam lands, and the tower underneath it.

export const UPGRADES = {
  // ---------------- the laser ----------------
  charge: {
    name: 'Charge Coil',
    icon: '⚡',
    blurb: 'Recharges the laser faster between shots.',
    costs: [90, 220, 460, 950, 1900],
    detail: (l) => `${(0.62 * Math.pow(0.84, l)).toFixed(2)}s per shot`,
  },
  focus: {
    name: 'Beam Focus',
    icon: '🎯',
    blurb: 'A fatter beam. Near misses start counting as hits.',
    costs: [130, 300, 640, 1300],
    detail: (l) => `${['thin', 'steady', 'wide', 'very wide', 'enormous'][l]} beam`,
  },
  power: {
    name: 'Overcharge',
    icon: '🔥',
    blurb: 'Each zap does more damage. Chonks stop being a chore.',
    costs: [380, 950, 2300],
    detail: (l) => `${1 + l} damage per zap`,
  },
  pierce: {
    name: 'Piercer',
    icon: '➶',
    blurb: 'The beam carries on through Milbils instead of stopping at the first.',
    costs: [520, 1500, 3400],
    detail: (l) => (l ? `hits ${1 + l} in a line` : 'stops at the first hit'),
  },
  split: {
    name: 'Twin Beam',
    icon: '🔱',
    blurb: 'Fires a fan of beams. The middle one still goes exactly where you aim.',
    costs: [1200, 3400],
    detail: (l) => `${['one beam', 'three beams', 'five beams'][l]}`,
  },

  // ---------------- where the beam lands ----------------
  chain: {
    name: 'Chain Zap',
    icon: '🕸️',
    blurb: 'A popping Milbil throws a spark at whoever is standing too close.',
    costs: [900, 2200, 5000],
    detail: (l) => (l ? `arcs to ${l} nearby Milbil${l > 1 ? 's' : ''}` : 'no arc'),
  },
  stun: {
    name: 'Stun Coil',
    icon: '❄️',
    blurb: 'A Milbil that survives a zap is frozen stiff and cannot hop.',
    costs: [700, 1800, 4000],
    detail: (l) => (l ? `frozen for ${(l * 0.6).toFixed(1)}s` : 'no effect yet'),
  },
  combo: {
    name: 'Combo Amp',
    icon: '✨',
    blurb: 'Pays more for every extra Milbil you catch in one beam.',
    costs: [600, 1500, 3600],
    detail: (l) => `🪙 ${25 * (1 + l)} per extra Milbil`,
  },

  // ---------------- the tower ----------------
  plating: {
    name: 'Tower Plating',
    icon: '🛡️',
    blurb: 'One more shield, and every shield repaired right now.',
    costs: [260, 750, 1900],
    detail: (l) => `${3 + l} shields`,
  },
  deflect: {
    name: 'Deflector',
    icon: '🧲',
    blurb: 'Throws a Milbil that reaches the tower back to the far row, for free.',
    costs: [850, 2100, 4600],
    detail: (l) => (l ? `${l} bounce${l > 1 ? 's' : ''} per round` : 'no bounces'),
  },
  damper: {
    name: 'Damper Field',
    icon: '🌀',
    blurb: 'Milbils hop more slowly across the whole board.',
    costs: [320, 850, 2100],
    detail: (l) => (l ? `Milbils ${Math.round(l * 9)}% slower` : 'no effect yet'),
  },
  tracer: {
    name: 'Tracer Array',
    icon: '📡',
    blurb: 'Paints Blinky Milbils so they cannot fade all the way out on you.',
    costs: [1100, 2600],
    detail: (l) => ['Blinkies vanish', 'Blinkies stay faint', 'Blinkies always show'][l],
  },
};

/** Shop sections, in the order they are shown. */
export const UP_GROUPS = [
  { name: 'Laser', keys: ['charge', 'focus', 'power', 'pierce', 'split'] },
  { name: 'On impact', keys: ['chain', 'stun', 'combo'] },
  { name: 'Tower', keys: ['plating', 'deflect', 'damper', 'tracer'] },
];

export const UP_ORDER = UP_GROUPS.flatMap((g) => g.keys);

/** Price of the next level, or null when the ladder is topped out. */
export function nextCost(key, level) {
  const c = UPGRADES[key].costs;
  return level >= c.length ? null : c[level];
}

export function maxLevel(key) {
  return UPGRADES[key].costs.length;
}

/** Angle between adjacent beams of a Twin Beam fan, in radians. */
export const BEAM_SPREAD = 0.12;

/** Everything the simulation needs to know about the tower, derived from levels. */
export function towerStats(up) {
  return {
    cooldown: 0.62 * Math.pow(0.84, up.charge),   // seconds between shots
    beamHalf: 0.085 + up.focus * 0.042,           // beam half-width, in board squares
    damage: 1 + up.power,
    pierce: 1 + up.pierce,                        // Milbils a single beam can hit
    beams: 1 + up.split * 2,                      // always odd, so one beam is dead centre

    chain: up.chain,                              // Milbils a pop arcs to
    chainRange: 1.15 + up.chain * 0.35,           // in board squares
    stunSec: up.stun * 0.6,
    comboCoins: 25 * (1 + up.combo),              // per extra Milbil in one beam

    maxShields: 3 + up.plating,
    deflects: up.deflect,                         // free bounces per round
    hopScale: 1 + up.damper * 0.09,               // multiplies Milbil rest time
    blinkFloor: [0.10, 0.42, 0.75][up.tracer],    // how faint a Blinky may get
  };
}
