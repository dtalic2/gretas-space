// ---------- Middle Island: the conductor ----------
//
// Owns the renderer, the clock and the rules. Everything else is a module it
// drives: terrain and sky for the look, world for what is on the island, state
// for the numbers, ui for the screen.
import * as THREE from 'three';

import { buildTerrain, buildSea, height, inland } from './terrain.js';
import { Sky, nightOf, isNight, clockText } from './sky.js';
import { Particles } from './particles.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Wolves, Flock, Village } from './creatures.js';
import { GameState } from './state.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { QUESTS } from './quests.js';
import { BUILDERS } from './models.js';
import {
  DAY_SECONDS, DAY_SPLIT, RES, NODES, BUILDINGS, UPGRADES, BODY, FARM,
  SETTLER_EVERY, SETTLER_EATS, SETTLER_BUILD,
} from './econ.js';

const canvas = document.getElementById('scene');
const ui = new UI();
const audio = new Audio();
const state = new GameState();
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.localClippingEnabled = true;       // buildings rise out of the ground as you hammer

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfe2f6, 60, 260);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let sea, sky, fx, world, player, wolves, flock, village;
const g = { state };                 // what quests look at

// Interaction state that isn't worth saving.
const s = {
  paused: true,
  eHeld: false,
  eTap: false,
  workT: 0,
  hammerT: 0,
  wellT: 0,
  saveT: 0,
  build: null,          // { type, ghost, rotOff, ok, x, z, rot }
  target: null,
  hungryWarned: false,
  lastEat: -99,
  sleeping: false,
  time: 0,
};

// ---------------------------------------------------------------- boot
async function boot(){
  ui.boot(0.1, 'Raising the island from the sea…');
  await frame();
  buildTerrain(scene);
  sea = buildSea(scene);
  ui.boot(0.35, 'Painting the sky…');
  await frame();
  sky = new Sky(scene);
  fx = new Particles(scene);
  ui.boot(0.5, 'Planting the forests…');
  await frame();
  world = new World(scene, fx, audio);
  g.world = world;
  ui.boot(0.75, 'Waking the wildlife…');
  await frame();
  player = new Player(scene, canvas, camera, world);
  g.player = player;
  wolves = new Wolves(scene, world, fx, audio);
  flock = new Flock(scene, world);
  village = new Village(scene, world);

  const hasSave = state.load();
  if (hasSave){
    world.restore(state.world ?? {});
    const p = state.player ?? world.spawnPoint;
    player.spawn(p.x, p.z, p.facing ?? Math.PI);
  } else {
    player.spawn(world.spawnPoint.x, world.spawnPoint.z, Math.PI);
  }
  village.sync(settlers());
  ui.boot(1, 'Ready');
  // Warm the shaders up so the first frame of play doesn't hitch.
  renderer.compile(scene, camera);
  await frame();
  ui.booted();

  bindInput();
  requestAnimationFrame(loop);

  const autostart = sessionStorage.getItem('mi-autostart');
  sessionStorage.removeItem('mi-autostart');
  if (autostart) start(false);
  else ui.title(hasSave && state.started, () => start(true), () => {
    if (hasSave){ state.wipe(); sessionStorage.setItem('mi-autostart', '1'); location.reload(); }
    else start(false);
  });
}

function start(resumed){
  audio.unlock();
  state.started = true;
  s.paused = false;
  ui.showHud(true);
  if (!resumed){
    ui.toast('🌊 You wash up on the shore of <b>Middle Island</b>.', 'good');
    setTimeout(() => ui.toast('Hold <b>E</b> next to a tree to chop it.'), 1800);
  } else {
    ui.toast(`Welcome back. Day ${state.day}.`, 'good');
  }
  save();
}

// ---------------------------------------------------------------- rules
function settlers(){
  let n = 0;
  for (const b of world.buildings) if (b.progress >= 1) n += BUILDINGS[b.type].settlers ?? 0;
  return n;
}

function save(){ if (state.started) state.save(world, player); }

function screenOf(v){
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * innerWidth, y: (-p.y * 0.5 + 0.5) * innerHeight };
}
function popAt(text, pos){
  const sp = screenOf(pos);
  ui.pop(text, sp.x + (Math.random() - 0.5) * 30, sp.y);
}

function buildStatus(type){
  const def = BUILDINGS[type];
  const built = world.done(type);
  const missing = (def.needs ?? []).filter((n) => !world.has(n));
  if (missing.length) return { built, locked: `Build a ${BUILDINGS[missing[0]].name} first` };
  if (def.minSettlers && settlers() < def.minSettlers) return { built, locked: `Needs ${def.minSettlers} settlers (you have ${settlers()})` };
  if (type === 'castle' && world.buildings.some((b) => b.type === 'castle')) return { built, locked: 'You already have a castle' };
  return { built, locked: null };
}

function openBuildMenu(){
  if (s.build) cancelBuild();
  audio.ui();
  s.paused = true;
  ui.onPanelClose = () => { s.paused = false; };
  ui.buildMenu(state.res, buildStatus, (type) => { s.paused = false; beginBuild(type); });
}

// Ghost preview while you pick a spot.
const ghostOk = new THREE.MeshLambertMaterial({ color: 0x7dff7a, transparent: true, opacity: 0.45, depthWrite: false, emissive: 0x1f5a1c });
const ghostBad = new THREE.MeshLambertMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.45, depthWrite: false, emissive: 0x5a1c1c });

function beginBuild(type){
  const m = BUILDERS[type](world.buildings.filter((b) => b.type === type).length);
  const ghost = m.group;
  ghost.traverse((o) => { if (o.isMesh){ o.material = ghostOk; o.castShadow = false; } });
  m.setGrowth?.(1);
  scene.add(ghost);
  // Step the camera back so you can see the whole footprint.
  const dist = player.camDist;
  player.camDist = Math.max(dist, BUILDINGS[type].r * 2.2 + 9);
  s.build = { type, ghost, rotOff: 0, ok: false, dist };
  ui.toast(`Walk to where you want your ${BUILDINGS[type].name}.`);
}

function cancelBuild(){
  if (!s.build) return;
  scene.remove(s.build.ghost);
  player.camDist = s.build.dist;
  s.build = null;
  ui.buildBar(false);
}

function updateGhost(){
  const b = s.build;
  const def = BUILDINGS[b.type];
  const p = player.position, f = player.facing;
  const dist = def.r + 1.8;
  const x = Math.round((p.x + Math.sin(f) * dist) * 2) / 2;
  const z = Math.round((p.z + Math.cos(f) * dist) * 2) / 2;
  // Face the front door toward you, in quarter turns.
  const rot = Math.round((f + Math.PI) / (Math.PI / 2)) * (Math.PI / 2) + b.rotOff;
  const check = world.canPlace(b.type, x, z);
  const afford = state.has(def.cost);
  b.ok = check.ok && afford;
  b.x = x; b.z = z; b.rot = rot;
  b.ghost.position.set(x, check.y + 0.02, z);
  b.ghost.rotation.y = rot;
  const mat = b.ok ? ghostOk : ghostBad;
  if (b.mat !== mat){ b.ghost.traverse((o) => { if (o.isMesh) o.material = mat; }); b.mat = mat; }
  b.clears = check.clears ?? [];
  let note = check.reason;
  if (check.ok && !afford) note = 'Not enough materials';
  else if (check.ok && b.clears.length){
    const gain = world.clearGain(b.clears);
    note = `Clears ${b.clears.length} in the way` + (Object.keys(gain).length ? ` (${Object.entries(gain).map(([k, v]) => `+${v} ${RES[k].icon}`).join(' ')})` : '');
  }
  ui.buildBar(true, `${def.icon} ${def.name}`, b.ok, note, check.ok && b.clears.length > 0);
}

function placeBuild(){
  const b = s.build;
  if (!b) return;
  if (!b.ok){ audio.deny(); return; }
  const def = BUILDINGS[b.type];
  state.pay(def.cost);
  const gain = world.clearGain(world.under(b.type, b.x, b.z));
  for (const [k, v] of Object.entries(gain)) state.add(k, v);
  if (Object.keys(gain).length) ui.toast(`🪓 You clear the ground: ${Object.entries(gain).map(([k, v]) => `+${v} ${RES[k].icon}`).join(' ')}`);
  const site = world.place(b.type, b.x, b.z, b.rot);
  audio.place();
  cancelBuild();
  ui.toast(`${def.icon} Now hold <b>E</b> at the site to build it.`);
  s.target = { kind: 'building', ref: site };
  save();
}

function onBuilt(b){
  const def = BUILDINGS[b.type];
  audio.done();
  ui.toast(`${def.icon} <b>${def.name}</b> finished!`, 'good');
  if (def.settlers){
    setTimeout(() => ui.toast(`👥 ${def.settlers} settlers move in.`, 'good'), 900);
    village.sync(settlers());
  }
  if (b.type === 'chapel') setTimeout(() => audio.bell(), 600);
  if (b.type === 'castle' && !state.won){
    state.won = true;
    audio.fanfare();
    setTimeout(() => audio.bell(), 1600);
    setTimeout(() => {
      s.paused = true;
      ui.win([
        ['📅', `Day ${state.day}`], ['🏠', `${world.buildings.length} buildings`], ['👥', `${settlers()} settlers`],
        ['🪵', `${state.gathered.wood} wood cut`], ['🪨', `${state.gathered.stone} stone mined`],
      ], () => { s.paused = false; });
    }, 2600);
  }
  save();
}

/** What pressing E here would do. */
function actionFor(t){
  if (!t) return null;
  if (t.kind === 'node'){
    const n = t.ref, def = NODES[n.type];
    return { hold: true, text: def.verb, face: n };
  }
  const b = t.ref, def = BUILDINGS[b.type];
  if (b.progress < 1) return { hold: true, text: `Build ${def.name} — ${Math.floor(b.progress * 100)}%`, face: b, site: true };
  if (b.type === 'farm'){
    if (b.growth >= 1) return { hold: true, text: 'Harvest wheat', face: b, harvest: true };
    return { text: `Wheat growing — ${Math.floor(b.growth * 100)}%`, locked: true };
  }
  if (b.type === 'well') return s.wellT > 0 ? { text: 'The bucket is still coming up…', locked: true } : { tap: 'drink', text: 'Drink from the well' };
  if (b.type === 'blacksmith') return { tap: 'smith', text: 'Use the forge' };
  if (def.sleep){
    if (isNight(state.t)) return { tap: 'sleep', text: `Sleep in the ${def.name}` };
    return { text: `${def.name} — sleep here at night`, locked: true };
  }
  return null;
}

function toolFor(n){ return NODES[n.type].tool; }

function gatherSwing(n){
  const def = NODES[n.type];
  const up = state.upgrades;
  let amount = def.yield;
  if (n.type === 'tree' && up.axe) amount += UPGRADES.axe.bonus;
  if (n.type === 'rock' && up.pick) amount += UPGRADES.pick.bonus;
  if (n.type === 'fish' && up.net) amount += UPGRADES.net.bonus;
  world.hit(n, amount);
  state.add(def.res, amount);
  ({ tree: () => audio.chop(), rock: () => audio.mine(), iron: () => audio.mine(), bush: () => audio.pick(), fish: () => audio.reel() })[n.type]();
  audio.get();
  popAt(`+${amount} ${RES[def.res].icon}`, new THREE.Vector3(n.x, height(n.x, n.z) + 2, n.z));
}

function swingTime(n){
  const def = NODES[n.type], up = state.upgrades;
  let sp = 1;
  if (n.type === 'tree' && up.axe) sp = UPGRADES.axe.speed;
  if ((n.type === 'rock' || n.type === 'iron') && up.pick) sp = UPGRADES.pick.speed;
  return def.swing / sp;
}

function doTap(kind, b){
  if (kind === 'drink'){
    state.health = Math.min(100, state.health + BODY.wellHeal);
    state.warmth = Math.min(100, state.warmth + 10);
    s.wellT = 15;
    audio.drink();
    popAt('+❤️', new THREE.Vector3(b.x, b.y + 2.5, b.z));
    ui.toast('🪣 Cool, fresh water. You feel much better.');
  } else if (kind === 'smith'){
    audio.ui();
    s.paused = true;
    ui.onPanelClose = () => { s.paused = false; };
    ui.smithMenu(state.res, state.upgrades, (k) => {
      const u = UPGRADES[k];
      if (!state.has(u.cost)) return;
      state.pay(u.cost);
      state.upgrades[k] = true;
      audio.hammer(); setTimeout(() => audio.done(), 200);
      ui.toast(`${u.icon} You forged the <b>${u.name}</b>!`, 'good');
      save();
    });
  } else if (kind === 'sleep'){
    sleep(b);
  }
}

async function sleep(b, fainted = false){
  if (s.sleeping) return;
  s.sleeping = true;
  s.paused = true;
  player.sleeping = true;
  ui.fade(true);
  await new Promise((r) => setTimeout(r, 900));
  // Wake at dawn. Fainting in the daytime only costs you the fright.
  if (!fainted || isNight(state.t)){
    if (state.t > 0.5) newDay();
    state.t = 0.02;
  }
  if (!fainted){
    state.warmth = 100;
    state.health = Math.min(100, state.health + 35);
    state.hunger = Math.max(0, state.hunger - 12);
  }
  for (const w of wolves.list) w.gone = true;
  wolves.update(0, 0, 0, player, state.day);
  if (b){
    const r = BUILDINGS[b.type].r + 1.2;
    const x = b.x + Math.sin(b.rot) * r, z = b.z + Math.cos(b.rot) * r;
    player.spawn(x, z, b.rot);
  }
  save();
  await new Promise((r) => setTimeout(r, 700));
  ui.fade(false);
  s.paused = false;
  s.sleeping = false;
  player.sleeping = false;
  audio.dawn();
  if (world.has('chapel')) setTimeout(() => audio.bell(), 900);
  if (!fainted) ui.toast(`🌅 Good morning! Day ${state.day}.`, 'good');
}

function newDay(){
  state.day++;
  // Settlers eat.
  const n = settlers();
  if (n > 0){
    const need = n * SETTLER_EATS;
    if (state.res.food >= need){ state.res.food -= need; s.hungryWarned = false; }
    else {
      state.res.food = 0;
      ui.toast('😟 Your settlers are hungry! They stop working until there is food.', 'bad');
      s.hungryWarned = true;
    }
  }
}

function faint(){
  ui.toast('😵 You collapse… and wake up somewhere safe.', 'bad');
  const home = world.buildings.find((b) => b.progress >= 1 && BUILDINGS[b.type].sleep);
  for (const k of ['wood', 'stone']) state.res[k] = Math.floor(state.res[k] * 0.7);
  state.health = 60;
  state.hunger = Math.max(state.hunger, 50);
  state.warmth = 80;
  if (home) sleep(home, true);
  else {
    const sp = world.spawnPoint;
    player.spawn(sp.x, sp.z, Math.PI);
    sleep(null, true);
  }
}

function settlersWork(){
  const n = settlers();
  if (!n || s.hungryWarned) return;
  const got = { wood: 0, stone: 0, food: 0, iron: 0 };
  for (let i = 0; i < n; i++){
    const k = i % 4 === 3 && world.has('blacksmith') ? 'iron' : i % 2 === 0 ? 'wood' : 'stone';
    got[k] += k === 'iron' ? 1 : 2;
  }
  // They bring in any ripe harvest, too.
  for (const b of world.buildings){
    if (b.type === 'farm' && b.progress >= 1 && b.growth >= 1){
      got.food += FARM.food + (world.has('windmill') ? FARM.mill : 0);
      b.growth = 0; b.model.setGrowth(0);
    }
  }
  const parts = [];
  for (const [k, v] of Object.entries(got)) if (v){ state.add(k, v); parts.push(`+${v} ${RES[k].icon}`); }
  if (parts.length) ui.toast(`👥 Your settlers bring in ${parts.join(' ')}`);
}

// ---------------------------------------------------------------- input
function bindInput(){
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (!state.started) return;
    audio.unlock();
    if (e.code === 'Escape'){ if (ui.panelOpen) ui.closePanel(); else cancelBuild(); return; }
    if (ui.panelOpen){ if (e.code === 'KeyB' || e.code === 'KeyH') ui.closePanel(); return; }
    if (s.paused) return;
    if (e.code === 'KeyE' || e.code === 'Enter'){ if (s.build) placeBuild(); else { s.eTap = true; s.eHeld = true; } }
    if (e.code === 'KeyB') openBuildMenu();
    if (e.code === 'KeyR' && s.build){ s.build.rotOff += Math.PI / 2; audio.ui(); }
    if (e.code === 'Space') attack();
    if (e.code === 'KeyH') openHelp();
    if (e.code === 'KeyM') toggleSound();
  });
  addEventListener('keyup', (e) => { if (e.code === 'KeyE' || e.code === 'Enter') s.eHeld = false; });
  addEventListener('blur', () => { s.eHeld = false; });

  const act = document.getElementById('tAct');
  act.addEventListener('pointerdown', (e) => {
    e.preventDefault(); audio.unlock();
    if (s.paused) return;
    if (s.build) placeBuild(); else { s.eTap = true; s.eHeld = true; }
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) act.addEventListener(ev, () => { s.eHeld = false; });
  document.getElementById('tAttack').addEventListener('pointerdown', (e) => { e.preventDefault(); if (!s.paused) attack(); });
  const run = document.getElementById('tRun');
  run.addEventListener('pointerdown', (e) => { e.preventDefault(); player.wantRun = !player.wantRun; run.classList.toggle('on', player.wantRun); });
  const openB = () => { if (!s.paused || ui.panelOpen) ui.panelOpen ? ui.closePanel() : openBuildMenu(); };
  document.getElementById('tBuild').onclick = openB;
  document.getElementById('btnBuildTop').onclick = openB;
  document.getElementById('bbRotate').onclick = () => { if (s.build){ s.build.rotOff += Math.PI / 2; audio.ui(); } };
  document.getElementById('bbPlace').onclick = () => placeBuild();
  document.getElementById('bbCancel').onclick = () => cancelBuild();
  document.getElementById('btnHelp').onclick = () => openHelp();
  document.getElementById('btnSound').onclick = () => toggleSound();
  const mus = document.getElementById('btnMusic');
  mus.onclick = () => { audio.unlock(); audio.setMusic(!audio.music); mus.classList.toggle('off', !audio.music); };

  // Joystick.
  const stick = document.getElementById('stick');
  const knob = stick.querySelector('i');
  let sid = null;
  const moveStick = (e) => {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1){ dx /= l; dy /= l; }
    player.stick.x = dx; player.stick.y = dy;
    knob.style.transform = `translate(${dx * 36}px, ${dy * 36}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); moveStick(e); audio.unlock(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) moveStick(e); });
  const endStick = (e) => { if (e.pointerId !== sid) return; sid = null; player.stick.x = player.stick.y = 0; knob.style.transform = ''; };
  stick.addEventListener('pointerup', endStick);
  stick.addEventListener('pointercancel', endStick);

  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
}

function attack(){
  if (!player.swing()) return;
  player.showTool('sword');
  audio.swing();
  const hit = wolves.strike(player.position, player.facing, state.upgrades.sword ? 3 : 1);
  if (hit && wolves.chasedOff && !s.wolfTip){ s.wolfTip = true; }
}

function openHelp(){
  s.paused = true;
  ui.onPanelClose = () => { s.paused = false; };
  ui.help({ restart: () => { if (confirm('Start a new island? This one will be lost.')){ state.wipe(); state.started = false; sessionStorage.setItem('mi-autostart', '1'); location.reload(); } } });
}

function toggleSound(){
  audio.unlock();
  audio.setEnabled(!audio.enabled);
  const b = document.getElementById('btnSound');
  b.textContent = audio.enabled ? '🔊' : '🔈';
  b.classList.toggle('off', !audio.enabled);
}

// ---------------------------------------------------------------- the loop
const clock = new THREE.Clock();

function loop(){
  requestAnimationFrame(loop);
  tick(Math.min(clock.getDelta(), 0.05));
  if (state.started) world.clearView(camera.position, player.camTarget);
  renderer.render(scene, camera);
}

function tick(dt){
  s.time += dt;
  const t = s.time;
  const playing = state.started && !s.paused;

  if (playing) state.t += dt / DAY_SECONDS;
  if (state.t >= 1){ state.t -= 1; newDay(); audio.dawn(); if (world.has('chapel')) audio.bell(); ui.toast(`🌅 Day ${state.day} begins.`, 'good'); }
  const night = nightOf(state.t);

  // Before the game starts, the camera drifts slowly around the island.
  if (!state.started){
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 70, 34, Math.cos(a) * 70);
    camera.lookAt(0, 2, 0);
  }

  // What's in reach, and what E would do to it.
  let action = null, work = false, faceAt = null;
  if (playing && !s.build){
    const near = world.nearest(player.position, player.facing);
    // Keep working the same thing while E is held, even if something else is a touch closer.
    if (!(s.eHeld && s.target && s.workT > 0 && near && near.ref !== s.target.ref)) s.target = near;
    action = actionFor(s.target);
    if (action && s.eHeld && action.hold){ work = true; faceAt = action.face; }
    if (action && s.eTap && action.tap) doTap(action.tap, s.target.ref);
  }
  s.eTap = false;

  if (playing){
    player.update(dt, false, work, night, faceAt);
  } else if (state.started){
    player.update(dt, true, false, night, null);
  }

  // Working.
  let holdFrac = 0;
  if (work){
    const ref = s.target.ref;
    if (s.target.kind === 'node'){
      player.showTool(toolFor(ref));
      const st = swingTime(ref);
      s.workT += dt;
      holdFrac = s.workT / st;
      if (s.workT >= st){ s.workT = 0; gatherSwing(ref); }
    } else if (action.site){
      player.showTool('hammer');
      s.hammerT -= dt;
      if (s.hammerT <= 0){ s.hammerT = 0.36; audio.hammer(); }
      const helpers = s.hungryWarned ? 0 : settlers();
      s.workT += dt;
      if (world.build(ref, dt * (1 + helpers * SETTLER_BUILD))) onBuilt(ref);
      holdFrac = ref.progress;
    } else if (action.harvest){
      player.showTool('hand');
      s.workT += dt;
      holdFrac = s.workT / 1.4;
      if (s.workT >= 1.4){
        s.workT = 0;
        const food = FARM.food + (world.has('windmill') ? FARM.mill : 0);
        state.add('food', food);
        ref.growth = 0; ref.model.setGrowth(0);
        audio.pick(); audio.get();
        popAt(`+${food} 🍞`, new THREE.Vector3(ref.x, ref.y + 2, ref.z));
        fx.burst(new THREE.Vector3(ref.x, ref.y + 1, ref.z), 30, 0xf0cf62, { up: 3, spread: 3, size: 0.2 });
      }
    }
  } else {
    s.workT = 0;
    if (player.swingT <= 0 && player.tool) player.showTool(null);
  }

  // Settlers quietly help any building site, even when you aren't hammering.
  if (playing && !s.hungryWarned){
    const n = settlers();
    if (n) for (const b of world.buildings) if (b.progress < 1 && !(work && s.target?.ref === b)){
      if (world.build(b, dt * n * SETTLER_BUILD * 0.35)) onBuilt(b);
    }
  }

  if (playing){
    // ---- the body
    state.hunger = Math.max(0, state.hunger - BODY.hungerDrain * dt);
    if (state.hunger < BODY.eatBelow && state.res.food >= 1){
      state.res.food -= 1;
      state.hunger = Math.min(100, state.hunger + BODY.eatGives);
      audio.eat();
      if (t - s.lastEat > 40) ui.toast('🍞 You eat some food.');
      s.lastEat = t;
    }
    const warmSpot = world.warmAt(player.position.x, player.position.z);
    if (warmSpot) state.warmth = Math.min(100, state.warmth + BODY.warmGain * dt);
    else if (night > 0.55) state.warmth = Math.max(0, state.warmth - BODY.coldDrain * night * dt);
    else state.warmth = Math.min(100, state.warmth + BODY.dayWarmGain * dt);
    if (state.hunger <= 0) state.health -= BODY.starveHurt * dt;
    if (state.warmth <= 0) state.health -= BODY.freezeHurt * dt;
    if (state.hunger > 40 && state.warmth > 35) state.health = Math.min(100, state.health + BODY.regen * dt);

    const bite = wolves.update(dt, t, night, player, state.day);
    if (bite > 0){ state.health -= bite; ui.hurt(); audio.hurt(); }
    if (state.health <= 0 && !s.sleeping) faint();

    s.wellT = Math.max(0, s.wellT - dt);
    state.settlerT += dt;
    if (state.settlerT >= SETTLER_EVERY){ state.settlerT = 0; settlersWork(); }
    if (s.hungryWarned && state.res.food > 0) s.hungryWarned = false;

    if (player.footstep) audio.step(height(player.position.x, player.position.z) < 0.1);
    s.saveT += dt;
    if (s.saveT > 6){ s.saveT = 0; save(); }

    // ---- quests
    // Steps you already did out of order are ticked off together.
    if (state.won) state.quest = QUESTS.length - 1;
    let q = QUESTS[state.quest], ticked = 0;
    while (q && state.quest < QUESTS.length - 1 && q.done(g)){
      if (ticked++ < 2) ui.toast(`✅ ${q.text}`, 'good');
      state.quest++;
      q = QUESTS[state.quest];
    }
    if (ticked){ audio.done(); save(); }
  }

  if (s.build && playing) updateGhost();

  // ---- the world
  sea.update(t, 1 - night * 0.75);
  sky.update(dt, state.t, player.position);
  world.update(playing ? dt : 0, t, night, player.position);
  flock.update(dt, t);
  village.update(dt, t, night);
  fx.update(dt);
  audio.ambience(dt, THREE.MathUtils.clamp(1 - (inland(player.position.x, player.position.z) - 0.3) / 0.6, 0, 1), night);
  scene.fog.near = THREE.MathUtils.lerp(60, 25, night);
  scene.fog.far = THREE.MathUtils.lerp(260, 120, night);

  // ---- the HUD
  if (state.started){
    ui.setRes(state.res, settlers());
    ui.setBars(state.health, state.hunger, state.warmth, night > 0.5);
    const c = clockText(state.t);
    ui.setClock(state.day, c.time, c.part);
    ui.nightTint(night * 0.45);

    const q = QUESTS[state.quest];
    let goal = null;
    if (q.goal){
      const [k, n, src] = q.goal;
      const have = Math.min(n, Math.floor(src === 'gathered' ? state.gathered[k] : state.res[k]));
      goal = `${RES[k].icon} ${have}/${n}`;
    } else if (q.build && !world.buildings.some((b) => b.type === q.build)){
      const def = BUILDINGS[q.build];
      goal = Object.entries(def.cost).map(([k, v]) => `${RES[k].icon} ${Math.min(v, Math.floor(state.res[k]))}/${v}`).join('  ');
    }
    let hint = q.hint;
    if (night > 0.6 && !world.warmAt(player.position.x, player.position.z) && state.warmth < 70) hint = '🥶 It is cold! Get near a fire or into a house.';
    if (wolves.nearestDist(player.position) < 16) hint = '🐺 A wolf! Stand in the firelight, or swing at it (Space / ⚔️).';
    ui.setObjective(q.text, hint, goal);

    const tgt = q.target(g);
    if (tgt && !s.build){
      const dx = tgt.x - player.position.x, dz = tgt.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      const yaw = player.camYaw;
      const fwd = -dx * Math.sin(yaw) - dz * Math.cos(yaw);
      const right = dx * Math.cos(yaw) - dz * Math.sin(yaw);
      ui.setGuide(Math.atan2(right, fwd), dist, tgt.label);
    } else ui.setGuide(null);

    if (playing && action && !s.build) ui.prompt(action.text, holdFrac, !!action.locked);
    else ui.prompt(null);
  }
}

// Debugging: `__mi.sim(30)` runs thirty seconds of game without drawing, and
// `__mi.state.t = 0.8` jumps to nightfall.
window.__mi = {
  get state(){ return state; }, get world(){ return world; }, get player(){ return player; }, save, BUILDINGS,
  sim(sec, hold = false){ s.eHeld = hold; for (let i = 0; i < sec * 20; i++) tick(0.05); s.eHeld = false; },
};
boot();
