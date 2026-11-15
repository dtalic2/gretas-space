// ---------- Egg Heist ----------
//
// Boot, the scene, the input, and the loop. Everything with rules of its own
// lives in a module next door; this file is the wiring and the order things
// happen in.
//
// The shape of a session: pick a character and a biome, creep out to a nest,
// take an egg, run back inside your fence, stand on the stump, answer a
// times-tables question, and keep the animal. Coins from the animals buy the
// kit that makes the next raid easier.

import * as THREE from 'three';
import { GameState, UPGRADES, upgradeCost } from './state.js';
import { Questions } from './mathq.js';
import { World, BIOMES, PEN_R, makeEgg } from './world.js';
import { Guardian } from './guardian.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { profileById } from './profiles.js';
import { buildCritter, speciesById, rarityById, SPECIES } from './animals.js';

const $ = (id) => document.getElementById(id);

// --------------------------------------------------------------- the basics
const state = new GameState();
state.load();

const questions = new Questions(state.tables, state.facts);
const audio = new Audio();

const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

const hemi = new THREE.HemisphereLight(0xffffff, 0x6a7d54, 0.95);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff2d8, 1.05);
sun.position.set(28, 44, 18);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const sc = sun.shadow.camera;
sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 1; sc.far = 160;
scene.add(sun, sun.target);

const world = new World(scene);
let player = null;
let guards = [];

// ---------------------------------------------------------------- the input
const keys = new Set();
const input = { x: 0, y: 0, sprint: false, crouch: false, jump: false, lookDx: 0, lookDy: 0 };
const touch = { active: false, x: 0, y: 0, sprint: false, crouch: false };
const isTouch = matchMedia('(pointer: coarse)').matches;

function readKeys(){
  let x = 0, y = 0;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;

  // the stick wins when a thumb is on it
  if (touch.active){ x = touch.x; y = touch.y; }
  input.x = x;
  input.y = y;
  input.sprint = keys.has('shift') || touch.sprint;
  input.crouch = keys.has('control') || keys.has('c') || touch.crouch;
}

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' '){ input.jump = true; e.preventDefault(); }
  if (k === 'e') doAction();
  if (k === 'm') ui.el.btnSound.click();
  if (k === 'escape' && mode === 'play' && !ui.anyOverlay) pause();
  else if (k === 'escape' && !$('paused').classList.contains('hidden')) resume();
  keys.add(k === ' ' ? 'space' : k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// drag anywhere on the world to look around
let dragId = null, lastX = 0, lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragId = e.pointerId; lastX = e.clientX; lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== dragId) return;
  input.lookDx += e.clientX - lastX;
  input.lookDy += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
});
const endDrag = (e) => { if (e.pointerId === dragId) dragId = null; };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// the on-screen stick
const stick = $('stick'), knob = $('stickKnob');
let stickId = null;
stick.addEventListener('pointerdown', (e) => {
  stickId = e.pointerId;
  touch.active = true;
  stick.setPointerCapture(e.pointerId);
  moveStick(e);
});
stick.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
const dropStick = (e) => {
  if (e.pointerId !== stickId) return;
  stickId = null; touch.active = false; touch.x = touch.y = 0;
  knob.style.transform = 'translate(-50%,-50%)';
};
stick.addEventListener('pointerup', dropStick);
stick.addEventListener('pointercancel', dropStick);

function moveStick(e){
  const r = stick.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const max = r.width * 0.36;
  let dx = e.clientX - cx, dy = e.clientY - cy;
  const d = Math.hypot(dx, dy);
  if (d > max){ dx = dx / d * max; dy = dy / d * max; }
  touch.x = dx / max;
  touch.y = dy / max;
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}

$('btnAct').onclick = () => doAction();
$('btnJump').onclick = () => { input.jump = true; };
const hold = (el, set) => {
  const on = (v) => (e) => { e.preventDefault(); set(v); el.classList.toggle('on', v); };
  el.addEventListener('pointerdown', on(true));
  el.addEventListener('pointerup', on(false));
  el.addEventListener('pointercancel', on(false));
  el.addEventListener('pointerleave', on(false));
};
hold($('btnSneak'), (v) => { touch.crouch = v; });
hold($('btnRun'), (v) => { touch.sprint = v; });

// ------------------------------------------------------------------- the UI
const ui = new UI(state, {
  click: () => audio.ui(),
  onKey: () => audio.ui(),
  onDeny: () => audio.deny(),
  onWrong: () => audio.wrong(),
  onSound: (on) => audio.setEnabled(on),
  onPlay: () => startRaid(),
  onPause: () => pause(),
  onResume: () => resume(),
  onQuit: () => toMenu(),
  onTables: () => questions.setTables(state.tables),
  onProfile: (id) => {
    if (player) player.setProfile(scene, profileById(id), state.loadout);
  },
  onBiome: () => { pendingRebuild = true; },
  onBuyUpgrade: (id) => buyUpgrade(id),
  onBuyBiome: (i) => buyBiome(i),
});

// --------------------------------------------------------------- the actions
let mode = 'boot';
let pendingRebuild = true;
let busy = false;                 // a question or a reveal is up
let safeTimer = 0;
let caughtCool = 0;

function doAction(){
  if (mode !== 'play' || busy || !player || player.stunT > 0) return;

  if (player.onStump && player.carry.length){ hatchOne(); return; }

  const nest = world.nearestNest(player.pos, 3.8);
  if (!nest) return;
  if (player.full){
    ui.toast('Your basket is full — get it home!', 'bad');
    audio.deny();
    return;
  }

  const egg = world.takeEgg(nest);
  if (!egg) return;

  player.take(egg, makeEgg);
  audio.grab();
  audio.roar();
  state.stats.steals++;
  ui.flash('gold');
  ui.toast(`You lifted ${aOrAn(rarityById(egg.species.rarity).name)} egg — <b>run!</b>`, 'gold');

  // every guardian close enough to hear it sits up; the one on this nest is certain
  nest.guardian?.startle();
  for (const g of guards){
    if (g === nest.guardian) continue;
    const d = Math.hypot(g.pos.x - player.pos.x, g.pos.z - player.pos.z);
    if (d < 22) g.alert = Math.min(1, g.alert + 0.55);
  }
}

async function hatchOne(){
  busy = true;
  const egg = player.handOver();
  const r = rarityById(egg.species.rarity);
  const q = questions.next();

  const ok = await ui.ask(q, {
    icon: '🥚',
    sub: `${r.name} egg — answer to crack it open`,
    check: (v) => {
      const good = questions.record(q, v);
      if (good) state.stats.correct++; else state.stats.wrong++;
      state.save();
      return good;
    },
  });

  if (ok){
    const coins = state.earn(6 + r.coins * 2);
    const res = state.addAnimal(egg.species.id);
    audio.hatch();
    if (res.isNew) setTimeout(() => audio.fanfare(), 420);
    world.populatePen(state.animals, buildCritter, speciesById);
    ui.flash('good');
    await ui.reveal(egg.species, res.isNew, coins);
    refreshHud();
  }
  busy = false;
}

async function askToBuy(q, icon, sub){
  busy = true;
  const ok = await ui.ask(q, {
    icon, sub, cancelable: true,
    check: (v) => {
      const good = questions.record(q, v);
      if (good) state.stats.correct++; else state.stats.wrong++;
      state.save();
      return good;
    },
  });
  busy = false;
  return ok;
}

async function buyUpgrade(id){
  const u = UPGRADES.find((x) => x.id === id);
  const cost = upgradeCost(u, state.level(id));
  if (state.level(id) >= u.max || state.coins < cost){ audio.deny(); return; }

  const ok = await askToBuy(questions.next(), u.icon, `${u.name} · ${cost} 🪙`);
  if (!ok) return;

  if (state.buy(id)){
    audio.coin();
    ui.toast(`${u.icon} ${u.name} — level ${state.level(id)}`, 'good');
    applyLoadout();
    refreshHud();
  }
}

async function buyBiome(i){
  const b = BIOMES[i];
  if (state.biomeUnlocked(i) || state.coins < b.cost){ audio.deny(); return; }

  const ok = await askToBuy(questions.next(), b.icon, `${b.name} · ${b.cost} 🪙`);
  if (!ok) return;

  if (state.unlockBiome(i)){
    audio.fanfare();
    ui.toast(`${b.icon} ${b.name} is open — pick it before a raid`, 'gold');
    refreshHud();
  }
}

function applyLoadout(){
  if (player) player.loadout = state.loadout;
}

// ---------------------------------------------------------------- the modes
function buildBiome(){
  const l = state.loadout;
  world.build(state.biome, l.luck);
  world.populatePen(state.animals, buildCritter, speciesById);

  const b = BIOMES[state.biome];
  guards = world.nests.map((n) => {
    const g = new Guardian(n, b, b.speed[n.tier], b.wake);
    n.guardian = g;
    world.group.add(g.group);
    return g;
  });

  hemi.intensity = b.id === 'starfall' ? 0.55 : 0.95;
  hemi.groundColor.set(b.ground2);
  sun.intensity = b.id === 'starfall' ? 0.5 : 1.05;
  pendingRebuild = false;
}

function startRaid(){
  audio.unlock();
  audio.setEnabled(state.sound);

  if (pendingRebuild || !player) buildBiome();

  const prof = profileById(state.profile);
  if (!player) player = new Player(scene, prof, state.loadout);
  else player.setProfile(scene, prof, state.loadout);

  player.pos.set(0, 0, PEN_R - 2);
  player.vel.set(0, 0, 0);
  player.camYaw = Math.PI;
  camera.position.set(0, 7, PEN_R + 7);

  ui.hideStart();
  ui.showHud(true);
  $('touch').classList.toggle('hidden', !isTouch);
  refreshHud();
  mode = 'play';

  if (!state.seenHelp){
    state.seenHelp = true;
    state.save();
    ui.toast('Creep up on a nest and press <b>E</b>', 'good');
  }
}

function toMenu(){
  mode = 'menu';
  ui.hidePause();
  ui.showHud(false);
  ui.banner(null);
  ui.vignette(0);
  if (player) player.dropAll();
  state.save();
  ui.showStart();
}

function pause(){
  if (mode !== 'play') return;
  mode = 'paused';
  ui.showPause({
    '🪙 Coins': Math.floor(state.coins),
    '🐣 Species': `${state.collected}/${SPECIES.length}`,
    '🥚 Stolen': state.stats.steals,
    '✅ Right': state.stats.correct,
    '❌ Wrong': state.stats.wrong,
    '📈 Per min': state.income,
  });
}

function resume(){
  if (mode !== 'paused') return;
  ui.hidePause();
  mode = 'play';
}

function refreshHud(){
  ui.setHud({
    coins: state.coins,
    carried: player ? player.carry.length : 0,
    carry: state.loadout.carry,
    dex: state.collected,
    place: BIOMES[state.biome].name,
  });
}

const aOrAn = (w) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);

// ----------------------------------------------------------------- the loop
let last = performance.now() / 1000;
let t = 0;
let saveTimer = 0;

function frame(){
  requestAnimationFrame(frame);

  const now = performance.now() / 1000;
  const dt = Math.min(0.05, now - last);
  last = now;

  const running = mode === 'play' && !busy && !ui.anyOverlay;
  if (running){
    t += dt;
    readKeys();
    player.update(dt, input, world);
    input.jump = false;
    input.lookDx = 0;
    input.lookDy = 0;

    world.update(dt, t, state.loadout.luck);

    // ---- the giants
    let chased = false, worstAlert = 0;
    for (const g of guards){
      g.update(dt, {
        time: t,
        playerPos: player.pos,
        noise: player.noise,
        inPen: player.inPen,
        onCatch: onCaught,
        onStomp: (gg, d) => audio.stomp(d),
        onWake: () => audio.roar(),
      });
      if (g.chasing) chased = true;
      const d = Math.hypot(g.pos.x - player.pos.x, g.pos.z - player.pos.z);
      if (d < 30) worstAlert = Math.max(worstAlert, g.alert);
    }

    // ---- what the screen says
    ui.meters(Math.max(player.noise, worstAlert * 0.9), player.stamina);
    ui.vignette(chased ? 0.5 + Math.sin(t * 7) * 0.12 : 0);

    if (safeTimer > 0){
      safeTimer -= dt;
      ui.banner('SAFE!', 'safe');
    } else if (chased && player.carry.length){
      ui.banner('RUN!');
    } else if (chased){
      ui.banner('LOOK OUT!');
    } else {
      ui.banner(null);
    }

    const nest = world.nearestNest(player.pos, 3.8);
    if (player.onStump && player.carry.length) ui.prompt('<b>E</b> Hatch an egg');
    else if (nest && !player.full) ui.prompt('<b>E</b> Take an egg');
    else if (nest && player.full) ui.prompt('Basket full — get it home');
    else if (player.carry.length && player.inPen) ui.prompt('Stand on the stump');
    else ui.prompt(null);

    // ---- the animals pay their way
    if (state.income){
      state.coins += (state.income / 60) * dt;
      state.lifetime += (state.income / 60) * dt;
    }
    refreshHud();

    // ---- made it home
    if (player.inPen && player.carry.length && !wasInPen){
      safeTimer = 1.4;
      audio.safe();
    }
    wasInPen = player.inPen;

    if (caughtCool > 0) caughtCool -= dt;

    saveTimer += dt;
    if (saveTimer > 8){ saveTimer = 0; state.save(); }
  }

  if (player) player.updateCamera(camera, running ? dt : 0.016, guards.flatMap((g) => g.bulk));
  sun.target.position.copy(player ? player.pos : new THREE.Vector3());
  sun.position.set((player?.pos.x || 0) + 28, 44, (player?.pos.z || 0) + 18);

  renderer.render(scene, camera);
}

let wasInPen = true;

function onCaught(g){
  if (caughtCool > 0 || player.stunT > 0) return;
  caughtCool = 2.2;

  const lost = player.dropAll();
  player.stun(1.4);
  audio.caught();
  ui.flash('bad');
  state.stats.caught++;

  if (lost.length){
    // the eggs go back where they came from, and come back on the nest shortly
    for (const n of world.nests) if (n.guardian === g) n.refill = Math.min(n.refill || 99, 3);
    ui.toast(`Caught! You dropped ${lost.length === 1 ? 'the egg' : `${lost.length} eggs`}.`, 'bad');
  } else {
    ui.toast('Caught! Nothing to drop, at least.', 'bad');
  }

  // it has what it wanted, so it goes home
  g.state = 'return';
}

// ------------------------------------------------------------------ resizing
function resize(){
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- the opening
const bootBar = $('bootBar'), bootMsg = $('bootMsg');
const steps = [
  [18, 'Rolling out the grass…'],
  [42, 'Hiding the nests…'],
  [66, 'Putting the giants to sleep…'],
  [88, 'Counting the eggs…'],
  [100, 'Ready.'],
];
let step = 0;
const tick = setInterval(() => {
  const [pct, msg] = steps[step++];
  bootBar.style.width = `${pct}%`;
  bootMsg.textContent = msg;
  if (step >= steps.length){
    clearInterval(tick);
    setTimeout(() => {
      $('boot').classList.add('hidden');
      mode = 'menu';
      ui.showStart();
    }, 320);
  }
}, 220);

audio.setEnabled(state.sound);
buildBiome();
player = new Player(scene, profileById(state.profile), state.loadout);
player.pos.set(0, 0, PEN_R - 2);
camera.position.set(0, 8, PEN_R + 10);
frame();
