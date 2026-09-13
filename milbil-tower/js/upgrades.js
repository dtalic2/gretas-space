// ---------- Tower upgrades ----------
//
// Coins come off Milbils, and this is the only place they go. Each upgrade is a
// short ladder with hand-set prices rather than a formula, so the first one lands
// within a round or two of play and the last one is a genuine project.
//
// A typical Milbil pays 30, so read every price below as "about this many
// Milbils".

export const UPGRADES = {
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
  plating: {
    name: 'Tower Plating',
    icon: '🛡️',
    blurb: 'One more shield, and every shield repaired right now.',
    costs: [260, 750, 1900],
    detail: (l) => `${3 + l} shields`,
  },
  damper: {
    name: 'Damper Field',
    icon: '🌀',
    blurb: 'Milbils hop more slowly across the whole board.',
    costs: [320, 850, 2100],
    detail: (l) => (l ? `Milbils ${Math.round(l * 9)}% slower` : 'no effect yet'),
  },
};

export const UP_ORDER = ['charge', 'focus', 'power', 'pierce', 'plating', 'damper'];

/** Price of the next level, or null when the ladder is topped out. */
export function nextCost(key, level) {
  const c = UPGRADES[key].costs;
  return level >= c.length ? null : c[level];
}

export function maxLevel(key) {
  return UPGRADES[key].costs.length;
}

/** Everything the simulation needs to know about the tower, derived from levels. */
export function towerStats(up) {
  return {
    cooldown: 0.62 * Math.pow(0.84, up.charge),   // seconds between shots
    beamHalf: 0.085 + up.focus * 0.042,           // beam half-width, in board squares
    damage: 1 + up.power,
    pierce: 1 + up.pierce,                        // Milbils a single beam can hit
    maxShields: 3 + up.plating,
    hopScale: 1 + up.damper * 0.09,               // multiplies Milbil rest time
  };
}
