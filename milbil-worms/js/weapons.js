// ---------- The armoury ----------
//
// Ten weapons, and the shape of a turn falls out of which one you pick: a
// bazooka is wind and arc, a grenade is a bounce and a count, dynamite is a
// decision to stand next to something. Everything here is data — projectiles.js
// reads `kind` and does the rest.
//
//   lob      thrown on an arc at the power you charge
//   drop     placed at your feet
//   hitscan  instant, along the aim line
//   target   you pick a point on the map first
//   strike   you pick a column, something arrives from off-screen
//
// `ammo: Infinity` never runs out. Everything else is per-team, per-match, and
// crates are the only way to get more.

export const WEAPONS = {
  bazooka: {
    key: 'bazooka', name: 'Bazooka', icon: '🚀', kind: 'lob',
    blurb: 'The honest one. Wind pushes it the whole way.',
    ammo: Infinity, damage: 45, radius: 62, speed: 980, wind: 1, gravity: 1,
    color: '#ffb457', trail: '#ff9a3c', crate: false, key1: '1',
  },
  grenade: {
    key: 'grenade', name: 'Grenade', icon: '💣', kind: 'lob',
    blurb: 'Bounces. Cooks for three seconds, wherever it ends up.',
    ammo: Infinity, damage: 50, radius: 72, speed: 820, wind: 0.25, gravity: 1,
    bounce: 0.52, fuse: 3, color: '#9dff6b', trail: '#5fd86b', crate: false, key1: '2',
  },
  cluster: {
    key: 'cluster', name: 'Cluster Bomb', icon: '🧨', kind: 'lob',
    blurb: 'Cracks open on impact and rains five bomblets.',
    ammo: 2, damage: 26, radius: 46, speed: 900, wind: 0.8, gravity: 1,
    cluster: { count: 5, damage: 24, radius: 44, speed: 330 },
    color: '#ff5f8f', trail: '#ff2f6f', crate: true, key1: '3',
  },
  homing: {
    key: 'homing', name: 'Homing Blip', icon: '🎯', kind: 'target',
    blurb: 'Pick a spot first. It will find it, wind or no wind.',
    ammo: 1, damage: 52, radius: 62, speed: 620, wind: 0, gravity: 0.25,
    homing: { turn: 3.4, accel: 420, max: 760 },
    color: '#7af0ff', trail: '#36d8ff', crate: true, key1: '4',
  },
  shotgun: {
    key: 'shotgun', name: 'Scatter Gun', icon: '🔫', kind: 'hitscan',
    blurb: 'Two barrels, no arc, no wind. Point it and mean it.',
    ammo: 2, damage: 27, radius: 26, pellets: 2, spread: 0.055, range: 620,
    color: '#ffd75e', trail: '#ffe8a3', crate: true, key1: '5',
  },
  zapbeam: {
    key: 'zapbeam', name: 'Zap Beam', icon: '⚡', kind: 'hitscan',
    blurb: 'Tower surplus. Cuts straight through everything in line.',
    ammo: 2, damage: 34, radius: 22, pellets: 1, spread: 0, range: 1500,
    pierce: true, beam: true,
    color: '#c9a0ff', trail: '#e2ccff', crate: true, key1: '6',
  },
  dynamite: {
    key: 'dynamite', name: 'Dynamite', icon: '🧱', kind: 'drop',
    blurb: 'Dropped at your feet. Four seconds to be somewhere else.',
    ammo: 1, damage: 80, radius: 98, fuse: 4, gravity: 1, bounce: 0.15,
    color: '#ff4d6d', trail: '#ff7a92', crate: true, key1: '7',
  },
  airstrike: {
    key: 'airstrike', name: 'Air Strike', icon: '✈️', kind: 'strike',
    blurb: 'Pick a column. Five bombs, one pass, no take-backs.',
    ammo: 1, damage: 30, radius: 50, bombs: 5, gravity: 1, wind: 0.5,
    color: '#ff9a3c', trail: '#ffc266', crate: true, key1: '8',
  },
  megamill: {
    key: 'megamill', name: 'MEGA MILL', icon: '🌟', kind: 'lob',
    blurb: 'One per match. It rearranges the map and everyone on it.',
    ammo: 1, damage: 135, radius: 175, speed: 760, wind: 0.4, gravity: 1,
    bounce: 0.45, fuse: 4, mega: true,
    color: '#ffd75e', trail: '#fff2b8', crate: false, key1: '9',
  },
  teleport: {
    key: 'teleport', name: 'Teleport', icon: '🌀', kind: 'target',
    blurb: 'Blink anywhere on the map. Does not end your turn.',
    ammo: 1, utility: true, endsTurn: false,
    color: '#7af0ff', trail: '#7af0ff', crate: true, key1: '0',
  },
};

export const WEAPON_ORDER = [
  'bazooka', 'grenade', 'cluster', 'homing', 'shotgun',
  'zapbeam', 'dynamite', 'airstrike', 'megamill', 'teleport',
];

/** What a fresh team carries. */
export function startingAmmo() {
  const a = {};
  for (const k of WEAPON_ORDER) a[k] = WEAPONS[k].ammo;
  return a;
}

/** What a weapon crate can hold, and how many it gives. */
export const CRATE_TABLE = WEAPON_ORDER.filter((k) => WEAPONS[k].crate);
