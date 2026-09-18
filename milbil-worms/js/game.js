// ---------- The match ----------
//
// Teams, turns, whose Milbil is standing where, and the one function that hurts
// anything (`blast`). The turn is a small state machine:
//
//   intro  -> banner, camera swings to whoever is up      (~1.1s)
//   aim    -> you may walk, jump, aim, switch, fire       (30s clock)
//   fire   -> the shot is in the air; the clock is off
//   settle -> everything has stopped; deaths resolve      (~0.7s)
//   over   -> one side has nobody left
//
// Nothing outside this file moves a Milbil or changes a health bar.

import { clamp, approach, seeded, shuffle, TAU, dist } from './util.js';
import { Terrain, WORLD } from './terrain.js';
import { THEMES, THEME_KEYS } from './themes.js';
import { WEAPONS, WEAPON_ORDER, startingAmmo, CRATE_TABLE } from './weapons.js';
import { bakeTeam } from './art.js';
import * as proj from './projectiles.js';
import * as fx from './fx.js';
import { sfx } from './audio.js';

export const TURN_TIME = 30;
export const MAX_HP = 100;
const WALK_SPEED = 66;
const STEP_UP = 15;
const JUMP_VY = -335;
const JUMP_VX = 155;
const GRAVITY = 640;
const FALL_SAFE = 95;
const SUDDEN_ROUND = 9;
const WATER_RISE = 8;
const BODY_H = 42;
const HALF_W = 10;

const NAMES = [
  'Bibble', 'Wonk', 'Plonk', 'Zib', 'Noodle', 'Squib', 'Tuffet', 'Blip',
  'Gonk', 'Mo', 'Pip', 'Tonk', 'Wibble', 'Fizz', 'Doodad', 'Nub',
  'Chomp', 'Yolk', 'Scrum', 'Bops', 'Kip', 'Munge', 'Twizzle', 'Gribb',
];

export const TEAM_DEFS = [
  { id: 0, name: 'GLOW', hue: 0, accent: '#7af0ff', soft: 'rgba(122,240,255,.5)' },
  { id: 1, name: 'FLUX', hue: 172, accent: '#ff5f8f', soft: 'rgba(255,95,143,.5)' },
];

let uid = 0;

export const G = {
  phase: 'menu',
  phaseT: 0,
  time: 0,
  round: 1,
  turn: 0,
  wind: 0,
  timer: TURN_TIME,
  terrain: null,
  theme: THEMES.canyon,
  teams: [],
  milbils: [],
  crates: [],
  projectiles: [],
  plane: null,
  active: null,
  activeTeam: null,
  weapon: 'bazooka',
  target: null,
  power: 0,
  charging: false,
  waterY: WORLD.h - 46,
  retreat: 0,          // seconds of "run!" left after dropping something fused
  suddenDeath: false,
  winner: null,
  banner: null,
  opts: { teamSize: 4, cpu: true, guide: 'short' },
  stats: [{ damage: 0, kills: 0, best: 0 }, { damage: 0, kills: 0, best: 0 }],
  cam: { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 1, tx: 0, ty: 0, base: 1, user: 1, manual: 0 },
  view: { w: 800, h: 600 },
};

// ---------------------------------------------------------------- setup

export function newMatch(opts = {}) {
  Object.assign(G.opts, opts);
  const seed = (Math.random() * 1e9) | 0;
  const rand = seeded(seed);
  const themeKey = opts.theme && THEMES[opts.theme] ? opts.theme : THEME_KEYS[(rand() * THEME_KEYS.length) | 0];
  G.theme = THEMES[themeKey];
  G.terrain = new Terrain(G.theme, seed);
  G.waterY = WORLD.h - 46;
  G.suddenDeath = false;
  G.winner = null;
  G.round = 1;
  G.turn = 0;
  G.time = 0;
  G.plane = null;
  G.target = null;
  G.projectiles.length = 0;
  G.crates.length = 0;
  G.milbils.length = 0;
  G.stats = [{ damage: 0, kills: 0, best: 0 }, { damage: 0, kills: 0, best: 0 }];
  fx.clearFx();

  const names = shuffle(NAMES.slice(), rand);
  G.teams = TEAM_DEFS.map((d, i) => ({
    ...d,
    cpu: i === 1 ? !!G.opts.cpu : false,
    ammo: startingAmmo(),
    sprites: d.sprites || bakeTeam(d.hue, d.accent, 168),
    next: 0,
    weapon: 'bazooka',      // each side remembers what it last had out
  }));
  // Sprite sheets are expensive and never change, so keep them on the defs.
  TEAM_DEFS.forEach((d, i) => { d.sprites = G.teams[i].sprites; });

  const n = clamp(G.opts.teamSize | 0, 1, 6);
  for (let t = 0; t < 2; t++) {
    const spots = pickSpawns(t, n, rand);
    for (let i = 0; i < n; i++) {
      G.milbils.push(makeMilbil(t, names.pop() ?? `Mil-${i}`, spots[i]));
    }
  }

  G.weapon = 'bazooka';
  G.phase = 'intro';
  G.phaseT = 0;
  G.turn = -1;
  nextTurn(true);
}

function makeMilbil(team, name, spot) {
  return {
    id: ++uid,
    team,
    name,
    voice: uid * 37,
    x: spot.x,
    y: spot.y,
    vx: 0,
    vy: 0,
    hp: MAX_HP,
    alive: true,
    dying: false,
    dieT: 0,
    facing: team === 0 ? 1 : -1,
    aim: team === 0 ? -0.5 : Math.PI + 0.5,
    grounded: false,
    walkT: 0,
    walking: 0,
    phase: Math.random(),
    hurtT: 0,
    fallFrom: spot.y,
    seed: (Math.random() * 1000) | 0,
  };
}

/**
 * Somewhere flat, in this team's half, not on top of a team-mate. Falls back to
 * anywhere solid rather than ever returning nothing — an unspawnable map would
 * be worse than a cramped one.
 */
function pickSpawns(team, n, rand) {
  const t = G.terrain;
  const lo = team === 0 ? 0.05 : 0.55;
  const hi = team === 0 ? 0.45 : 0.95;
  const spots = [];
  const taken = [];

  for (let attempt = 0; attempt < 5000 && spots.length < n; attempt++) {
    const relax = attempt / 5000;
    const x = t.w * (lo + rand() * (hi - lo));
    const y = t.surfaceAt(x);
    if (y >= G.waterY - 26 || y >= t.h - 4) continue;
    const flat = Math.abs(t.surfaceAt(x - 13) - y) < 13 + relax * 26
              && Math.abs(t.surfaceAt(x + 13) - y) < 13 + relax * 26;
    if (!flat) continue;
    if (taken.some((p) => Math.abs(p - x) < 74 - relax * 50)) continue;
    taken.push(x);
    spots.push({ x, y: y - 1 });
  }
  while (spots.length < n) {
    const x = t.w * (lo + rand() * (hi - lo));
    spots.push({ x, y: Math.min(t.surfaceAt(x) - 1, G.waterY - 30) });
  }
  return spots;
}

// ---------------------------------------------------------------- turns

export function aliveOf(team) {
  return G.milbils.filter((m) => m.team === team && m.alive);
}

export function teamHealth(team) {
  return aliveOf(team).reduce((s, m) => s + m.hp, 0);
}

function nextTurn(first = false) {
  if (checkOver()) return;

  G.turn++;
  const teamIdx = G.turn % 2;
  if (!first && teamIdx === 0) {
    G.round++;
    if (G.round > SUDDEN_ROUND && !G.suddenDeath) startSuddenDeath();
  }
  if (G.suddenDeath && !first) {
    G.waterY = Math.max(WORLD.h * 0.42, G.waterY - WATER_RISE);
    drownCheck();
    if (checkOver()) return;
  }

  const team = G.teams[teamIdx];
  const squad = aliveOf(teamIdx);
  if (!squad.length) { nextTurn(); return; }

  team.next = team.next % squad.length;
  const m = squad[team.next];
  team.next = (team.next + 1) % squad.length;

  G.activeTeam = team;
  G.active = m;
  G.wind = Math.round((Math.random() * 2 - 1) * 20) / 20;
  G.timer = TURN_TIME;
  G.power = 0;
  G.retreat = 0;
  G.charging = false;
  G.target = null;
  G.phase = 'intro';
  G.phaseT = 0;
  G.cam.manual = 0;
  G.camHold = null;
  m.vx = 0;
  // The weapon is the team's, not the game's: the computer picking a cluster
  // bomb on its turn must not leave one in your hands on yours.
  G.weapon = hasAmmo(team.weapon, team) ? team.weapon : firstWithAmmo(team);
  G.banner = { title: `${team.name} — ${m.name}`, color: team.accent, life: 1.6 };
  sfx.turn(teamIdx);
  maybeDropCrate();
  focusOn(m, true);
  if (G.ai) G.ai.reset();
}

function startSuddenDeath() {
  G.suddenDeath = true;
  for (const m of G.milbils) if (m.alive) m.hp = Math.min(m.hp, 25);
  G.banner = { title: 'SUDDEN DEATH', sub: 'the water is coming up', color: '#ff4d6d', life: 2.6 };
  fx.screenFlash(0.4, '#ff4d6d');
  sfx.sudden();
}

export function endTurn() {
  if (G.phase === 'over') return;
  G.phase = 'settle';
  G.phaseT = 0;
}

function checkOver() {
  const a = aliveOf(0).length, b = aliveOf(1).length;
  if (a > 0 && b > 0) return false;
  if (G.phase === 'over') return true;
  G.phase = 'over';
  G.winner = a === b ? -1 : a > b ? 0 : 1;
  G.active = null;
  if (G.winner === -1) sfx.lose();
  else if (G.teams[G.winner].cpu) sfx.lose();
  else sfx.win();
  return true;
}

// ---------------------------------------------------------------- damage

/**
 * The only thing in the game that hurts anybody. Everything — rockets, falling,
 * drowning, a Milbil's own death blast — comes through here or `hurt`.
 */
G.blast = function blast(x, y, radius, damage, opts = {}) {
  const { team = -1, color = '#ffb457', mega = false, quiet = false } = opts;
  const craterR = opts.crater ?? radius * 0.86;

  G.terrain.crater(x, y, craterR);
  if (!quiet) {
    fx.explode(x, y, radius, { color, debris: G.theme.rock[0], mega });
    sfx.boom(clamp(radius / 70, 0.5, 2.2));
  }

  // Hold the camera on the impact for a beat before it swings to the next
  // Milbil. Cutting away the instant a shell lands throws away the payoff.
  G.camHold = { x, y, t: quiet ? 0.5 : 1.15 };

  const reach = radius * 1.05;
  for (const m of G.milbils) {
    if (!m.alive) continue;
    const d = dist(x, y, m.x, m.y - 20);
    if (d > reach) continue;
    const k = Math.pow(1 - d / reach, 0.75);
    const dmg = Math.max(1, Math.round(damage * k));
    const ang = Math.atan2(m.y - 20 - y, m.x - x) || -Math.PI / 2;
    const imp = 150 + 420 * k;
    m.vx += Math.cos(ang) * imp;
    m.vy += Math.sin(ang) * imp - 90 * k;
    m.grounded = false;
    m.fallFrom = m.y;
    hurt(m, dmg, team);
  }

  for (let i = G.crates.length - 1; i >= 0; i--) {
    const c = G.crates[i];
    if (dist(x, y, c.x, c.y) < reach) {
      fx.explode(c.x, c.y, 46, { color: '#ffd75e', debris: G.theme.rock[0] });
      G.crates.splice(i, 1);
    }
  }
};

export function hurt(m, dmg, byTeam = -1) {
  if (!m.alive || dmg <= 0) return;
  m.hp -= dmg;
  m.hurtT = 0.65;
  const friendly = byTeam === m.team;
  fx.floater(m.x, m.y - 56, `-${dmg}`, friendly ? '#ffd75e' : '#ff4d6d', { size: 22 + Math.min(16, dmg / 4) });
  sfx.ouch(m.voice);
  if (byTeam >= 0) {
    G.stats[byTeam].damage += Math.min(dmg, m.hp + dmg);
    G.stats[byTeam].best = Math.max(G.stats[byTeam].best, dmg);
  }
  if (m.hp <= 0) {
    m.hp = 0;
    m.dying = true;
    m.dieT = 0.55;
    if (byTeam >= 0 && !friendly) G.stats[byTeam].kills++;
    if (byTeam >= 0) {
      G.banner = friendly
        ? { title: 'OWN GOAL', sub: `${m.name} was on your side`, color: '#ffd75e', life: 1.8 }
        : { title: 'GOT ONE', sub: `${m.name} is off the map`, color: G.teams[byTeam].accent, life: 1.6 };
    }
  } else if (dmg >= 55 && byTeam >= 0 && !friendly) {
    G.banner = { title: 'DIRECT HIT', color: '#ffd75e', life: 1.2 };
  }
}

function die(m, drowned = false) {
  if (!m.alive) return;
  m.alive = false;
  m.dying = false;
  if (drowned) {
    fx.splash(m.x, G.waterY, G.theme.waterEdge);
    sfx.splash();
    fx.floater(m.x, G.waterY - 40, 'GLUB', G.theme.waterEdge, { size: 24 });
  } else {
    sfx.gone(m.voice);
    G.blast(m.x, m.y - 18, 62, 26, { team: -1, color: G.teams[m.team].accent });
    fx.floater(m.x, m.y - 60, m.name.toUpperCase(), G.teams[m.team].accent, { size: 24, life: 1.6 });
  }
}

function drownCheck() {
  for (const m of G.milbils) if (m.alive && m.y > G.waterY) die(m, true);
}

// ---------------------------------------------------------------- movement

function bodyHits(x, y) {
  const t = G.terrain;
  return (
    t.solidAt(x, y - 3) || t.solidAt(x, y - BODY_H * 0.55) || t.solidAt(x, y - BODY_H + 4) ||
    t.solidAt(x - HALF_W, y - 12) || t.solidAt(x + HALF_W, y - 12) ||
    t.solidAt(x - HALF_W, y - BODY_H + 8) || t.solidAt(x + HALF_W, y - BODY_H + 8)
  );
}

/** Walk one step, climbing small ledges and following the ground downhill. */
export function walk(m, dir, dt) {
  if (!m.alive || !m.grounded) return;
  m.facing = dir;
  m.walking = 0.12;
  const t = G.terrain;
  const stepX = dir * WALK_SPEED * dt;
  const nx = m.x + stepX;
  if (nx < 8 || nx > t.w - 8) return;

  // up first: try the flat step, then climb
  for (let up = 0; up <= STEP_UP; up++) {
    const ny = m.y - up;
    if (!bodyHits(nx, ny)) {
      // then settle down onto whatever is below, if it is close
      let drop = 0;
      while (drop < STEP_UP + 6 && !t.solidAt(nx, ny + drop + 1)) drop++;
      if (drop <= STEP_UP) {
        m.x = nx;
        m.y = ny + drop;
      } else {
        m.x = nx;
        m.y = ny;
        m.grounded = false;
        m.fallFrom = m.y;
      }
      m.walkT += dt;
      if (m.walkT > 0.16) { m.walkT = 0; sfx.step(); }
      return;
    }
  }
}

export function jump(m) {
  if (!m.alive || !m.grounded) return;
  m.vy = JUMP_VY;
  m.vx = m.facing * JUMP_VX;
  m.grounded = false;
  m.fallFrom = m.y;
  sfx.jump();
}

function physics(m, dt) {
  const t = G.terrain;
  if (m.grounded) {
    // Stay glued to the ground when it is blown out from under you.
    if (!t.solidAt(m.x, m.y + 2)) {
      m.grounded = false;
      m.fallFrom = m.y;
    } else {
      m.vx *= Math.pow(0.02, dt);
      return;
    }
  }

  m.vy += GRAVITY * dt;
  m.vx *= Math.pow(0.55, dt);

  const speed = Math.hypot(m.vx, m.vy);
  const slices = clamp(Math.ceil((speed * dt) / 3), 1, 18);
  const h = dt / slices;
  for (let s = 0; s < slices; s++) {
    const nx = clamp(m.x + m.vx * h, -30, t.w + 30);
    const ny = m.y + m.vy * h;

    if (bodyHits(nx, m.y)) {              // wall: stop sideways, slide down
      m.vx *= -0.28;
    } else {
      m.x = nx;
    }

    if (bodyHits(m.x, ny)) {
      if (m.vy > 0) {                     // landed
        let up = 0;
        while (up < 24 && bodyHits(m.x, m.y - up)) up++;
        m.y -= up ? up - 1 : 0;
        const fall = m.y - m.fallFrom;
        const impact = m.vy;
        m.vy = 0;
        m.vx = 0;
        m.grounded = true;
        if (impact > 260 && fall > FALL_SAFE) {
          hurt(m, Math.min(45, Math.round((fall - FALL_SAFE) * 0.32)), -1);
          fx.spark(m.x, m.y, '#ffffff', { n: 10, speed: 140, dir: -Math.PI / 2, spread: 2.4, life: 0.3, size: 1.8 });
        }
        sfx.land();
        break;
      } else {                            // ceiling
        m.vy = 0;
        break;
      }
    } else {
      m.y = ny;
    }
  }

  if (m.y > G.waterY) die(m, true);
  if (m.x < -20 || m.x > t.w + 20 || m.y > t.h + 200) {
    fx.floater(clamp(m.x, 30, t.w - 30), t.h - 60, 'off the map', '#ff4d6d', { size: 20 });
    die(m, true);
  }
}

// ---------------------------------------------------------------- crates

function maybeDropCrate() {
  if (G.crates.length >= 3 || Math.random() > 0.42) return;
  const t = G.terrain;
  let x = 0;
  for (let i = 0; i < 60; i++) {
    x = t.w * (0.08 + Math.random() * 0.84);
    if (t.surfaceAt(x) < G.waterY - 40) break;
  }
  const health = Math.random() < 0.3;
  const item = health ? null : CRATE_TABLE[(Math.random() * CRATE_TABLE.length) | 0];
  G.crates.push({
    x, y: -40, vy: 0, kind: health ? 'health' : 'weapon',
    item, amount: health ? 30 : 1 + ((Math.random() * 2) | 0),
    grounded: false, bob: Math.random() * TAU,
  });
  sfx.crate();
  fx.floater(x, 60, health ? 'HEALTH CRATE' : 'WEAPON CRATE', '#ffd75e', { size: 20, life: 1.8 });
}

function updateCrates(dt) {
  const t = G.terrain;
  for (let i = G.crates.length - 1; i >= 0; i--) {
    const c = G.crates[i];
    c.bob += dt * 2.2;
    if (!c.grounded) {
      c.vy = Math.min(78, c.vy + 200 * dt);     // parachute: a gentle terminal fall
      c.y += c.vy * dt;
      if (t.solidAt(c.x, c.y + 14)) {
        c.grounded = true;
        c.y = t.groundBelow(c.x, c.y) - 14;
      }
      if (c.y > G.waterY) {
        fx.splash(c.x, G.waterY, G.theme.waterEdge);
        sfx.splash();
        G.crates.splice(i, 1);
        continue;
      }
    }
    for (const m of G.milbils) {
      if (!m.alive) continue;
      if (Math.abs(m.x - c.x) < 24 && Math.abs(m.y - 18 - c.y) < 30) {
        collect(m, c);
        G.crates.splice(i, 1);
        break;
      }
    }
  }
}

function collect(m, c) {
  const team = G.teams[m.team];
  if (c.kind === 'health') {
    m.hp = Math.min(MAX_HP, m.hp + c.amount);
    fx.floater(m.x, m.y - 56, `+${c.amount}`, '#9dff6b', { size: 26 });
  } else {
    const w = WEAPONS[c.item];
    team.ammo[c.item] = (team.ammo[c.item] || 0) + c.amount;
    fx.floater(m.x, m.y - 56, `${w.icon} +${c.amount}`, '#ffd75e', { size: 24 });
    if (G.active === m && !hasAmmo(G.weapon, team)) { G.weapon = c.item; team.weapon = c.item; }
  }
  fx.ring(c.x, c.y, 6, 60, '#ffd75e', { width: 4, life: 0.5 });
  fx.spark(c.x, c.y, '#ffd75e', { n: 22, speed: 220, life: 0.6, size: 2 });
  sfx.pickup();
}

// ---------------------------------------------------------------- weapons

export function hasAmmo(key, team = G.activeTeam) {
  if (!team) return false;
  const a = team.ammo[key];
  return a === Infinity || a > 0;
}

export function firstWithAmmo(team = G.activeTeam) {
  return WEAPON_ORDER.find((k) => hasAmmo(k, team)) ?? 'bazooka';
}

export function selectWeapon(key) {
  if (!WEAPONS[key] || !hasAmmo(key)) return false;
  G.weapon = key;
  if (G.activeTeam) G.activeTeam.weapon = key;
  G.target = null;
  sfx.select();
  return true;
}

export function needsTarget() {
  const w = WEAPONS[G.weapon];
  return w.kind === 'target' || w.kind === 'strike';
}

export function fireWeapon(power) {
  if (G.phase !== 'aim' || !G.active) return false;
  const w = WEAPONS[G.weapon];
  if (!hasAmmo(G.weapon)) return false;
  if (needsTarget() && !G.target) return false;

  const team = G.activeTeam;
  if (team.ammo[G.weapon] !== Infinity) team.ammo[G.weapon]--;

  const ok = proj.fire(G, G.weapon, {
    angle: G.active.aim,
    power: clamp(power, 0.08, 1),
    target: G.target,
  });
  if (!ok) return false;

  G.charging = false;
  G.power = 0;
  G.target = null;
  // Anything with a fuse hands the turn back for a moment: dropping dynamite at
  // your own feet with no way to walk away is not a weapon, it is a mistake.
  G.retreat = w.retreat ?? 0;
  fx.shake(w.kind === 'hitscan' ? 2 : 4);

  if (!hasAmmo(G.weapon)) {
    G.weapon = firstWithAmmo();
    team.weapon = G.weapon;
  }
  if (w.endsTurn === false) return true;
  G.phase = 'fire';
  G.phaseT = 0;
  return true;
}

// ---------------------------------------------------------------- camera

export function focusOn(m, snap = false) {
  if (!m) return;
  G.cam.tx = m.x;
  G.cam.ty = m.y - 40;
  if (snap) {
    G.cam.x = G.cam.tx;
    G.cam.y = G.cam.ty;
  }
}

export function panCamera(dx, dy) {
  G.cam.x = clamp(G.cam.x + dx, 0, WORLD.w);
  G.cam.y = clamp(G.cam.y + dy, 0, WORLD.h);
  G.cam.tx = G.cam.x;
  G.cam.ty = G.cam.y;
  G.cam.manual = 2.2;
}

function updateCamera(dt) {
  const cam = G.cam;
  cam.manual = Math.max(0, cam.manual - dt);

  // On the menu the camera wanders the map on its own. The title screen is a
  // live match nobody is playing, which is worth more than a static backdrop.
  if (G.phase === 'menu') {
    cam.zoom = approach(cam.zoom, cam.base * 0.94, 0.05, dt);
    cam.tx = WORLD.w / 2 + Math.sin(G.time * 0.09) * WORLD.w * 0.28;
    cam.ty = WORLD.h * 0.46 + Math.cos(G.time * 0.07) * 70;
    cam.x = approach(cam.x, cam.tx, 0.02, dt);
    cam.y = approach(cam.y, cam.ty, 0.02, dt);
    const vw0 = G.view.w / cam.zoom, vh0 = G.view.h / cam.zoom;
    cam.x = vw0 >= WORLD.w ? WORLD.w / 2 : clamp(cam.x, vw0 / 2, WORLD.w - vw0 / 2);
    cam.y = vh0 >= WORLD.h ? WORLD.h / 2 : clamp(cam.y, vh0 / 2, WORLD.h - vh0 / 2);
    return;
  }

  // What the camera wants to look at, in priority order: a shot in the air, the
  // plane, a crate on its way down, otherwise whoever is up.
  if (G.camHold) {
    G.camHold.t -= dt;
    if (G.camHold.t <= 0) G.camHold = null;
  }

  if (!cam.manual) {
    const flying = G.projectiles.length ? G.projectiles[G.projectiles.length - 1] : null;
    if (flying) {
      cam.tx = flying.x;
      cam.ty = flying.y;
    } else if (G.camHold) {
      cam.tx = G.camHold.x;
      cam.ty = G.camHold.y;
    } else if (G.plane) {
      cam.tx = G.plane.x;
      cam.ty = G.plane.y + 120;
    } else if (G.active) {
      focusOn(G.active);
    }
  }

  const wantZoom = cam.base * cam.user * (G.projectiles.length || G.plane ? 0.82 : 1);
  cam.zoom = approach(cam.zoom, wantZoom, 0.06, dt);

  const rate = G.projectiles.length ? 0.18 : 0.1;
  cam.x = approach(cam.x, cam.tx, rate, dt);
  cam.y = approach(cam.y, cam.ty, rate, dt);

  // Keep the world on screen: never show past the edges unless it does not fit.
  const vw = G.view.w / cam.zoom, vh = G.view.h / cam.zoom;
  cam.x = vw >= WORLD.w ? WORLD.w / 2 : clamp(cam.x, vw / 2, WORLD.w - vw / 2);
  cam.y = vh >= WORLD.h ? WORLD.h / 2 : clamp(cam.y, vh / 2, WORLD.h - vh / 2);
}

export function screenToWorld(sx, sy) {
  const cam = G.cam;
  return {
    x: cam.x + (sx - G.view.w / 2) / cam.zoom,
    y: cam.y + (sy - G.view.h / 2) / cam.zoom,
  };
}

export function worldToScreen(wx, wy) {
  const cam = G.cam;
  return {
    x: (wx - cam.x) * cam.zoom + G.view.w / 2,
    y: (wy - cam.y) * cam.zoom + G.view.h / 2,
  };
}

// ---------------------------------------------------------------- the tick

export function update(dt) {
  G.time += dt;
  G.phaseT += dt;
  if (G.banner) {
    G.banner.life -= dt;
    if (G.banner.life <= 0) G.banner = null;
  }

  {
    for (const m of G.milbils) {
      if (!m.alive) continue;
      m.phase = (m.phase + dt * (m.walking > 0 ? 1.6 : 0.42)) % 1;
      m.walking = Math.max(0, m.walking - dt);
      m.hurtT = Math.max(0, m.hurtT - dt);
      physics(m, dt);
      if (m.dying) {
        m.dieT -= dt;
        if (m.dieT <= 0) die(m);
      }
    }
    proj.update(G, dt);
    updateCrates(dt);
    fx.update(dt);
    updateCamera(dt);
  }

  switch (G.phase) {
    case 'intro':
      if (G.phaseT > 1.05) {
        G.phase = 'aim';
        G.phaseT = 0;
      }
      break;

    case 'aim': {
      const prev = Math.ceil(G.timer);
      G.timer -= dt;
      if (Math.ceil(G.timer) !== prev && G.timer <= 5 && G.timer > 0) sfx.tick();
      if (G.timer <= 0) {
        G.timer = 0;
        endTurn();
      }
      if (G.charging) {
        G.power = Math.min(1, G.power + dt * 0.85);
        if (G.power >= 1) fireWeapon(1);
      }
      break;
    }

    case 'fire':
      if (G.retreat > 0) {
        G.retreat -= dt;
        if (G.retreat <= 0) {
          G.retreat = 0;
          if (G.active) G.active.walking = 0;
        }
      }
      if (quiet() && G.retreat <= 0) {
        G.phase = 'settle';
        G.phaseT = 0;
      } else if (G.phaseT > 22) {          // nothing should fly this long
        G.phase = 'settle';
        G.phaseT = 0;
      }
      break;

    case 'settle':
      if (G.phaseT > 0.75 && quiet()) {
        if (!checkOver()) nextTurn();
      }
      break;
  }
}

/** True when nothing is in the air, falling, or about to explode. */
function quiet() {
  if (G.projectiles.length || G.plane) return false;
  for (const m of G.milbils) {
    if (!m.alive) continue;
    if (m.dying) return false;
    if (!m.grounded || Math.abs(m.vy) > 12) return false;
  }
  for (const c of G.crates) if (!c.grounded) return false;
  return true;
}

// ---------------------------------------------------------------- aiming

export function aimToward(wx, wy, setPower = true) {
  const m = G.active;
  if (!m || G.phase !== 'aim') return;
  const dx = wx - m.x, dy = wy - (m.y - 22);
  if (Math.hypot(dx, dy) < 6) return;
  m.aim = Math.atan2(dy, dx);
  m.facing = Math.cos(m.aim) >= 0 ? 1 : -1;
  if (setPower) G.power = clamp(Math.hypot(dx, dy) / 250, 0.12, 1);
}

export function nudgeAim(d) {
  const m = G.active;
  if (!m || G.phase !== 'aim') return;
  // Up/down should mean up/down on screen whichever way the Milbil faces.
  m.aim += d * (m.facing >= 0 ? 1 : -1);
  const up = -Math.PI / 2;
  if (m.facing >= 0) m.aim = clamp(m.aim, up - 0.42, Math.PI / 2 + 0.42);
  else {
    let a = m.aim;
    if (a < 0) a += TAU;
    m.aim = clamp(a, Math.PI / 2 - 0.42, Math.PI * 1.5 + 0.42);
  }
}

/** Where a lobbed shot would go, for the aim guide. */
export function previewArc(steps = 90, dtStep = 1 / 30) {
  const m = G.active;
  const w = WEAPONS[G.weapon];
  if (!m || !w.speed) return [];
  const mz = proj.muzzleOf(m);
  let x = mz.x, y = mz.y;
  const v = w.speed * clamp(G.power, 0.08, 1);
  let vx = Math.cos(m.aim) * v, vy = Math.sin(m.aim) * v;
  const pts = [];
  for (let i = 0; i < steps; i++) {
    vy += proj.GRAVITY * (w.gravity ?? 1) * dtStep;
    vx += proj.WIND_ACC * G.wind * (w.wind ?? 0) * dtStep;
    x += vx * dtStep;
    y += vy * dtStep;
    if (x < 0 || x > WORLD.w || y > WORLD.h) break;
    pts.push(x, y);
    if (G.terrain.solidAt(x, y)) break;
  }
  return pts;
}
