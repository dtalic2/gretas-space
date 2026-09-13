// ---------- The Milbils ----------
//
// A Milbil is the glowing square-bodied creature from the original sketch: yellow
// body, one round eye and one big leaf eye, a cyan grin, one arm up mid-wave, one
// arm out, and two bent dancing legs.
//
// Every variant is the *same* drawing with its colour wheel rotated, so they all
// read as family. `hue` is that rotation in degrees.
//
// PAYOUT RULE: a typical Milbil is worth 30 coins. Everything else is priced off
// how hard it actually is to hit — a Zippy hops twice as often, a Chonk soaks
// three zaps, a Shifty jumps out of your crosshair — so the coins climb with the
// trouble, not with the round number.

export const TYPES = {
  milbil: {
    key: 'milbil',
    name: 'Milbil',
    blurb: 'The classic. Hops about, waves at you, worth a tidy 30.',
    coins: 30,
    hp: 1,
    hue: 0,               // the sketch colours, untouched
    hopMs: 2000,          // rest between hops
    scale: 0.94,          // sprite size as a fraction of one board square
    hit: 0.31,            // hitbox radius as a fraction of one board square
    from: 1,              // first round it can show up in
    weight: 100,
  },

  zippy: {
    key: 'zippy',
    name: 'Zippy Milbil',
    blurb: 'Hops more than twice as often. Small, jittery, hard to line up.',
    coins: 55,
    hp: 1,
    hue: 128,             // cyan
    hopMs: 880,
    scale: 0.8,
    hit: 0.26,
    from: 3,
    weight: 70,
  },

  blinky: {
    key: 'blinky',
    name: 'Blinky Milbil',
    blurb: 'Fades most of the way out between hops. Shoot the ghost of it.',
    coins: 80,
    hp: 1,
    hue: 82,              // green
    hopMs: 1500,
    scale: 0.94,
    hit: 0.31,
    from: 5,
    weight: 55,
    fade: true,
  },

  chonk: {
    key: 'chonk',
    name: 'Chonk Milbil',
    blurb: 'Big and slow, but it soaks three zaps before it pops.',
    coins: 120,
    hp: 3,
    hue: 252,             // magenta
    hopMs: 2600,
    scale: 1.18,
    hit: 0.42,
    from: 7,
    weight: 48,
  },

  shifty: {
    key: 'shifty',
    name: 'Shifty Milbil',
    blurb: 'Feels the crosshair on it and bolts. Catch it on the move.',
    coins: 180,
    hp: 1,
    hue: 212,             // violet
    hopMs: 1300,
    scale: 0.85,
    hit: 0.26,
    from: 10,
    weight: 40,
    dodge: true,
  },

  mega: {
    key: 'mega',
    name: 'MEGA MILBIL',
    blurb: 'Every fifth round. Twelve zaps, and it is worth every one.',
    coins: 600,
    hp: 12,
    hue: 330,             // orange
    hopMs: 2900,
    scale: 1.5,
    hit: 0.52,
    from: 5,
    weight: 0,            // never rolled randomly — placed by the boss rule
    boss: true,
  },
};

export const ORDER = ['milbil', 'zippy', 'blinky', 'chonk', 'shifty', 'mega'];

/** Boss rounds are every 5th. Round 20 and up get a second Mega. */
export function megaCount(round) {
  if (round % 5 !== 0) return 0;
  return round >= 20 ? 2 : 1;
}

/**
 * Build the roster for a round.
 *
 * The rule the game is built on: **round N contains exactly N Milbils.** Round 1
 * is one lone Milbil, round 2 is two, and so on. What changes with N is the
 * *mix* — tougher variants unlock and then crowd out the plain ones, so round 12
 * is not just twelve of what round 2 had.
 */
export function buildWave(round, rand = Math.random) {
  const out = [];

  // Bosses take their slots first so the count still lands on exactly N.
  for (let i = 0; i < Math.min(megaCount(round), round); i++) out.push('mega');

  const pool = ORDER.filter((k) => !TYPES[k].boss && round >= TYPES[k].from);

  while (out.length < round) {
    // Later rounds lean on the harder end of the pool: a type's weight grows with
    // how long it has been unlocked, so plain Milbils thin out instead of
    // vanishing outright.
    let total = 0;
    const w = pool.map((k) => {
      const t = TYPES[k];
      const age = round - t.from;
      const weight = t.weight * (1 + age * 0.11);
      total += weight;
      return weight;
    });

    let r = rand() * total;
    let pick = pool[0];
    for (let i = 0; i < pool.length; i++) {
      r -= w[i];
      if (r <= 0) { pick = pool[i]; break; }
    }
    out.push(pick);
  }

  return out;
}

/** Milbils get a little brisker as the rounds climb, but it tops out at 1.75x. */
export function roundSpeed(round) {
  return Math.min(1.75, 1 + (round - 1) * 0.032);
}
