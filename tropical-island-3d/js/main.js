// ---------- Coconut Cove: the conductor ----------
//
// Owns the renderer, the clock and the rules. Everything else is a module it
// drives: terrain and sky for the look, world for places and plants, animals
// for your friends, fishing for the rod, state for the save, ui for the screen.
import * as THREE from 'three';

import { buildTerrain, buildSea, height, inland, SEA } from './terrain.js';
import { Sky, nightOf, isNight, clockText } from './sky.js';
import { Particles } from './particles.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Animals } from './animals.js';
import { Fishing } from './fishing.js';
import { GameState } from './state.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { GOALS } from './quests.js';
import { DAY_SECONDS, ITEMS, FISH, SHOP, ANIMALS, BREATH } from './econ.js';

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
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc8f0ff, 80, 320);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 900);
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let sea, sky, fx, world, player, animals, fishing;
const g = { state };                 // what the goals look at

const s = {
  paused: true,
  eTap: false,
  ukeT: 0, strumT: 0,
  saveT: 0,
  talkT: 20,
  time: 0,
  wasSwimming: false,
  napping: false,
};

// ---------------------------------------------------------------- boot
async function boot(){
  ui.boot(0.1, 'Warming up the sand…');
  await frame();
  buildTerrain(scene);
  sea = buildSea(scene);
  ui.boot(0.35, 'Filling the lagoon…');
  await frame();
  sky = new Sky(scene);
  fx = new Particles(scene);
  ui.boot(0.5, 'Growing the palms…');
  await frame();
  world = new World(scene, fx, audio);
  g.world = world;
  ui.boot(0.75, 'Waking up the animals…');
  await frame();
  player = new Player(scene, canvas, camera, world);
  g.player = player;
  animals = new Animals(scene, world, fx, audio);
  g.animals = animals;
  fishing = new Fishing(scene, fx, audio, ui);

  const hasSave = state.load();
  const home = world.home;
  const p = state.player ?? home;
  player.spawn(p.x, p.z, p.facing ?? Math.PI);        // facing home, the lagoon behind the camera
  player.setLook(state.wearing);
  ui.boot(1, 'Aloha!');
  renderer.compile(scene, camera);
  await frame();
  ui.booted();
  bindInput();
  requestAnimationFrame(loop);

  const auto = sessionStorage.getItem('cc-autostart');
  sessionStorage.removeItem('cc-autostart');
  if (auto) start(false);
  else ui.title(hasSave && state.started, () => start(true), () => {
    if (hasSave){ state.wipe(); sessionStorage.setItem('cc-autostart', '1'); location.reload(); }
    else start(false);
  });
}

function start(resumed){
  audio.unlock();
  state.started = true;
  s.paused = false;
  ui.showHud(true);
  if (resumed) ui.toast(`🌺 Welcome back! Day ${state.day}.`, 'good');
  else {
    ui.toast('🌴 Aloha! Welcome to <b>Coconut Cove</b>.', 'good');
    setTimeout(() => ui.toast('🐶 Coco is excited to see you. Walk over and press <b>E</b>.'), 1800);
  }
  save();
}

function save(){ if (state.started) state.save(player); }

// ---------------------------------------------------------------- helpers
function popAt(text, pos){
  const v = pos.clone().project(camera);
  ui.pop(text, (v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 30, (-v.y * 0.5 + 0.5) * innerHeight);
}
const friendOf = (k) => state.friends[k];
const isBest = (k) => friendOf(k).hearts >= ANIMALS[k].hearts;
const gear = () => ({ snorkel: !!state.owned.snorkel });

/** Take the cheapest fish out of your bag, for a hungry friend. */
function takeFish(){
  const f = FISH.filter((q) => state.fish[q.key] > 0).sort((a, b) => a.price - b.price)[0];
  if (!f) return null;
  state.fish[f.key]--;
  if (!state.fish[f.key]) delete state.fish[f.key];
  return f;
}

const BEST_PERK = {
  dog: 'Coco will follow you anywhere. Even swimming!',
  parrot: 'Pip flies over and rides on your shoulder!',
  monkey: 'Momo will tag along with you now.',
  turtle: 'You can ride on Shelly\'s back! Swim up to her and press E.',
  crab: 'Pinch scuttles along behind you now.',
  dolphin: 'Splash will swim beside you out in the water.',
};

function befriend(a, { food = null } = {}){
  const k = a.key, def = ANIMALS[k], f = friendOf(k);
  const at = a.root.position.clone().add(new THREE.Vector3(0, 1.5, 0));
  animals.love(a);
  if (food){
    if (food === 'fish'){ const fish = takeFish(); ui.toast(`${def.icon} ${def.name} gobbles up your ${fish.name.toLowerCase()}!`); }
    else { state.bag[food]--; ui.toast(`${def.icon} ${def.name} loves the ${ITEMS[food].name.toLowerCase()}!`); }
  } else if (f.petDay === state.day || f.hearts >= def.hearts){
    popAt('❤️', at);
    if (k === 'parrot' && isBest('parrot')) ui.toast(`🦜 Pip: “${animals.parrotTalk()}”`);
    return;
  } else {
    ui.toast(`${def.icon} ${def.name} ${{ dog: 'wags his tail like crazy', parrot: 'fluffs up happily', monkey: 'chatters and claps', turtle: 'blinks slowly at you', crab: 'waves a claw', dolphin: 'clicks and whistles' }[k]}.`);
  }
  f.petDay = state.day;
  if (f.hearts < def.hearts){
    f.hearts++;
    popAt('❤️ +1', at);
    if (f.hearts >= def.hearts){
      audio.done();
      setTimeout(() => ui.toast(`💖 You and ${def.name} are best friends! ${BEST_PERK[k]}`, 'good'), 600);
    }
  }
  save();
}

/** What E would do right now, as { text, run, locked }. */
function actionNow(){
  const p = player.position;
  if (player.riding) return { text: 'Let go of Shelly', run: () => { player.riding = null; ui.toast('🐢 You let go. Shelly paddles off.'); } };

  // Whatever is closest wins, but Coco is always at your heels, so he only
  // gets E when nothing else is within reach.
  const near = world.nearest(p, player.facing, player.swimming);
  const na = animals.nearest(p, player.facing);
  let a = na && (!near || na.score <= near.score) ? na.a : null;
  if (a){
    const def = ANIMALS[a.key];
    if (a.key === 'turtle' && isBest('turtle') && player.swimming){
      return { text: `Ride ${def.name} 🐢`, run: () => { player.riding = a; animals.love(a); ui.toast('🐢 Hold on tight! Steer with the joystick.'); } };
    }
    const food = def.food;
    const has = food === 'fish' ? state.fishCount > 0 : food && state.bag[food] > 0;
    if (food && has && !isBest(a.key)) return { text: `Give ${food === 'fish' ? '🐟' : ITEMS[food].icon} to ${def.name}`, run: () => befriend(a, { food }) };
    return { text: `Pet ${def.name}`, run: () => befriend(a) };
  }

  if (near?.kind === 'node'){
    const n = near.ref;
    if (n.type === 'pearl' && !(player.diving && p.y < height(n.x, n.z) + 1.6)){
      return { text: state.owned.snorkel ? 'Dive down to open the oyster' : 'An oyster! You need a snorkel to dive', locked: true };
    }
    const verb = { coconut: 'Shake the palm for a coconut', mango: 'Pick a mango', banana: 'Pick bananas', shell: 'Pick up the seashell',
      star: 'Pick up the starfish', seaweed: 'Grab some seaweed', pearl: 'Open the oyster' }[n.type];
    return { text: verb, run: () => {
      const k = world.pick(n);
      if (!k) return;
      state.bag[k]++;
      if (state.found[k] !== undefined) state.found[k]++;
      audio.pick();
      popAt(`+1 ${ITEMS[k].icon}`, new THREE.Vector3(n.x, Math.max(height(n.x, n.z), p.y) + 1.8, n.z));
      if (k === 'pearl') ui.toast('⚪ A shiny pearl! Kai pays well for these.', 'good');
    } };
  }
  if (near?.kind === 'place'){
    const pl = near.ref;
    if (pl.kind === 'shop') return { text: "Talk to Kai", run: openShop };
    if (pl.kind === 'hut') return isNight(state.t)
      ? { text: 'Go to sleep', run: () => rest('sleep') }
      : { text: 'Your hut. Sleep here at night', locked: true };
    if (pl.kind === 'hammock') return { text: 'Nap in the hammock', run: () => rest('nap') };
  }
  if (!player.swimming && fishing.target(player)){
    return { text: 'Cast your line 🎣', run: () => fishing.cast(player) };
  }
  return null;
}

async function rest(kind){
  if (s.napping) return;
  s.napping = true;
  s.paused = true;
  ui.fade(true);
  await new Promise((r) => setTimeout(r, 900));
  if (kind === 'sleep'){
    if (state.t > 0.5) state.day++;
    state.t = 0.02;
  } else {
    state.t += 0.12;
    if (state.t >= 1){ state.t -= 1; state.day++; }
  }
  save();
  await new Promise((r) => setTimeout(r, 600));
  ui.fade(false);
  s.paused = false;
  s.napping = false;
  if (kind === 'sleep'){ audio.dawn(); ui.toast(`🌅 Good morning! Day ${state.day}.`, 'good'); }
  else ui.toast('😴 What a lovely nap.');
}

// ---------------------------------------------------------------- shop, journal, help
function openShop(){
  audio.ui();
  s.paused = true;
  ui.onPanelClose = () => { s.paused = false; };
  const refresh = () => ui.shop(state, handlers);
  const handlers = {
    sell(kind){
      let got = 0;
      if (kind === 'fish'){ for (const f of FISH) got += (state.fish[f.key] ?? 0) * f.price; state.fish = {}; }
      if (kind === 'shells') for (const k of ['shell', 'star', 'pearl']){ got += state.bag[k] * ITEMS[k].price; state.bag[k] = 0; }
      if (kind === 'coconut'){ got = state.bag.coconut * ITEMS.coconut.price; state.bag.coconut = 0; }
      if (!got) return;
      state.coins += got;
      state.flags.sold = true;
      audio.coin();
      ui.toast(`🪙 Kai pays you ${got} coins. “Mahalo!”`, 'good');
      save(); refresh();
    },
    buy(k){
      const it = SHOP[k];
      if (state.coins < it.price){ audio.deny(); return; }
      state.coins -= it.price;
      state.owned[k] = true;
      if (['hat', 'lei', 'glasses'].includes(k)){ state.wearing[k] = true; player.setLook(state.wearing); }
      audio.coin(); audio.done();
      ui.toast(`${it.icon} You got the <b>${it.name}</b>! ${{ snorkel: 'Hold 🤿 while swimming to dive.', ukulele: 'Tap 🎸 or press U to play.', rod: 'Rare fish, here we come!' }[k] ?? ''}`, 'good');
      save(); refresh();
    },
    wear(k){
      if (!['hat', 'lei', 'glasses'].includes(k)) return;
      state.wearing[k] = !state.wearing[k];
      player.setLook(state.wearing);
      audio.ui();
      save(); refresh();
    },
  };
  refresh();
}

function openJournal(){
  audio.ui();
  s.paused = true;
  ui.onPanelClose = () => { s.paused = false; };
  ui.journal(state);
}

function openHelp(){
  s.paused = true;
  ui.onPanelClose = () => { s.paused = false; };
  ui.help(() => { state.wipe(); state.started = false; sessionStorage.setItem('cc-autostart', '1'); location.reload(); });
}

function playUkulele(){
  if (!state.owned.ukulele || player.swimming || fishing.busy || s.ukeT > 0) return;
  s.ukeT = 4;
  s.strumT = 0;
  player.holding = 'ukulele';
  const n = animals.dance(player.position, 4);
  if (n) ui.toast(n > 1 ? '🎶 Everyone starts to dance!' : '🎶 Your friend starts to dance!');
  state.flags.played = true;
}

// ---------------------------------------------------------------- input
function bindInput(){
  const act = () => { audio.unlock(); if (!s.paused || fishing.busy) s.eTap = true; };
  addEventListener('keydown', (e) => {
    if (e.repeat || !state.started) return;
    audio.unlock();
    if (e.code === 'Escape'){ ui.closePanel(); return; }
    if (ui.panelOpen){ if (['KeyJ', 'KeyH', 'KeyE'].includes(e.code)) ui.closePanel(); return; }
    if (s.paused) return;
    if (e.code === 'KeyE' || e.code === 'Enter') act();
    if (e.code === 'Space'){ player.wantDive = true; if (player.jump()) audio.jump(); }
    if (e.code === 'KeyU') playUkulele();
    if (e.code === 'KeyJ') openJournal();
    if (e.code === 'KeyH') openHelp();
    if (e.code === 'KeyM') toggleSound();
  });
  addEventListener('keyup', (e) => { if (e.code === 'Space') player.wantDive = false; });

  const tap = (id, fn, up) => {
    const el = document.getElementById(id);
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); audio.unlock(); fn(); });
    if (up) for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, up);
  };
  tap('tAct', act);
  tap('tJump', () => { if (s.paused) return; player.wantDive = true; if (player.jump()) audio.jump(); }, () => { player.wantDive = false; });
  tap('tRun', () => { player.wantRun = !player.wantRun; });
  tap('tUke', () => { if (!s.paused) playUkulele(); });
  document.getElementById('btnJournal').onclick = () => { if (!s.paused) openJournal(); };
  document.getElementById('btnHelp').onclick = () => { if (!s.paused) openHelp(); };
  document.getElementById('btnSound').onclick = toggleSound;
  const mus = document.getElementById('btnMusic');
  mus.onclick = () => { audio.unlock(); audio.setMusic(!audio.music); mus.classList.toggle('off', !audio.music); };

  // The joystick: works with a finger or a mouse.
  const stick = document.getElementById('stick');
  const knob = stick.querySelector('i');
  let sid = null;
  const move = (e) => {
    const r = stick.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(dx, dy);
    if (l > 1){ dx /= l; dy /= l; }
    player.stick.x = dx; player.stick.y = dy;
    knob.style.transform = `translate(${dx * r.width * 0.3}px, ${dy * r.height * 0.3}px)`;
  };
  stick.addEventListener('pointerdown', (e) => { sid = e.pointerId; stick.setPointerCapture(sid); stick.classList.add('on'); move(e); audio.unlock(); });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === sid) move(e); });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; player.stick.x = player.stick.y = 0; knob.style.transform = ''; stick.classList.remove('on'); };
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);

  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
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
const fogDay = new THREE.Color(), UNDER = new THREE.Color(0x0e7a8a);

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
  if (playing){ state.t += dt / DAY_SECONDS; if (state.t >= 1){ state.t -= 1; state.day++; audio.dawn(); ui.toast(`🌅 Day ${state.day}. Your friends are ready for pats!`, 'good'); } }
  const night = nightOf(state.t);

  if (!state.started){
    const a = t * 0.05;
    camera.position.set(Math.sin(a) * 75, 30, Math.cos(a) * 75 + 10);
    camera.lookAt(0, 2, 10);
  }

  // ---- E, and what it does
  let action = null;
  const press = s.eTap;
  s.eTap = false;
  if (playing && fishing.busy){
    const caught = fishing.update(dt, t, player, press, { night: night > 0.5, proRod: !!state.owned.rod });
    if (caught) landed(caught);
  } else if (fishing.busy){
    fishing.update(dt, t, player, false, { night: night > 0.5, proRod: !!state.owned.rod });
  } else if (playing){
    action = actionNow();
    if (action && press && !action.locked) action.run();
    else if (press && action?.locked) audio.deny();
  }

  // ---- the ukulele
  if (s.ukeT > 0){
    s.ukeT -= dt; s.strumT -= dt;
    if (s.strumT <= 0){ s.strumT = 0.45; audio.strum([0, 5, 7, 0, 9, 5, 7, 0][Math.floor(t * 2.2) % 8]); fx.emit({ x: player.position.x, y: player.position.y + 2, z: player.position.z, vx: (Math.random() - 0.5), vy: 1.2, life: 1.2, color: 0xffd23a, size: 0.25 }); }
    if (s.ukeT <= 0 && player.holding === 'ukulele') player.holding = null;
  }

  if (state.started) player.update(dt, !playing || fishing.busy || s.ukeT > 0, gear(), night);

  // ---- water: splashes, the swim goal, breath
  if (playing){
    if (player.swimming !== s.wasSwimming){
      s.wasSwimming = player.swimming;
      audio.splash();
      fx.burst(new THREE.Vector3(player.position.x, SEA, player.position.z), 22, 0xe8fbff, { up: 4, spread: 2, size: 0.22 });
      if (player.swimming && !state.flags.swam){ state.flags.swam = true; ui.toast('🏊 Splash! The water is lovely and warm.'); }
      if (!player.swimming) player.riding = null;
    }
    if (player.stroke) audio.swim();
    if (player.footstep) audio.step(player.depth > 0.1);
    if (player.diving && player.breath <= 0.01 && !s.breathWarned){ s.breathWarned = true; ui.toast('🫧 Out of breath! Up you go.'); }
    if (!player.diving) s.breathWarned = false;
  }
  ui.breath(state.started && player.swimming && state.owned.snorkel && player.breath < BREATH - 0.05 ? player.breath / BREATH : null);

  // ---- the world
  const under = camera.position.y < SEA - 0.05;
  sea.update(t, 1 - night * 0.7, under);
  sky.update(dt, state.t, player.position);
  world.update(playing ? dt : 0, t, night, player.position);
  animals.update(dt, t, player, state.friends, night);
  fx.update(dt);
  audio.under = under;
  audio.ambience(dt, THREE.MathUtils.clamp(1 - (inland(player.position.x, player.position.z) - 0.3) / 0.6, 0, 1), night);
  if (under){
    scene.fog.color.copy(UNDER);
    scene.fog.near = 1; scene.fog.far = 32;
  } else {
    scene.fog.near = THREE.MathUtils.lerp(80, 30, night);
    scene.fog.far = THREE.MathUtils.lerp(320, 150, night);
  }
  ui.underwater(under);

  // Pip chats from your shoulder now and then.
  if (playing && isBest('parrot')){
    s.talkT -= dt;
    if (s.talkT <= 0){ s.talkT = 35 + Math.random() * 30; ui.toast(`🦜 Pip: “${animals.parrotTalk()}”`); audio.squawk(); }
  }

  if (!state.started) return;
  if (playing){
    let goal = GOALS[state.goal], ticked = 0;
    while (goal && state.goal < GOALS.length - 1 && goal.done(g)){
      if (ticked++ < 2) ui.toast(`✅ ${goal.text}`, 'good');
      state.goal++;
      goal = GOALS[state.goal];
    }
    if (ticked){ audio.done(); save(); }
    s.saveT += dt;
    if (s.saveT > 6){ s.saveT = 0; save(); }
  }

  // ---- HUD
  ui.setBag(state);
  const c = clockText(state.t);
  ui.setClock(state.day, c.time, c.part);
  const goal = GOALS[state.goal];
  ui.setGoal(goal.text, goal.hint);
  const tgt = goal.target(g);
  if (tgt){
    const dx = tgt.x - player.position.x, dz = tgt.z - player.position.z, yaw = player.camYaw;
    ui.setGuide(Math.atan2(dx * Math.cos(yaw) - dz * Math.sin(yaw), -dx * Math.sin(yaw) - dz * Math.cos(yaw)), Math.hypot(dx, dz));
  } else ui.setGuide(null);
  ui.prompt(playing && action ? action.text : fishing.state === 'wait' ? 'Waiting for a bite… (E to reel in)' : null, !!action?.locked);
  ui.setButtons({ swimming: player.swimming, snorkel: !!state.owned.snorkel, ukulele: !!state.owned.ukulele, running: player.wantRun });
}

function landed({ def, size }){
  const j = state.journal[def.key];
  const fresh = !j;
  state.journal[def.key] = { count: (j?.count ?? 0) + 1, best: Math.max(j?.best ?? 0, size) };
  if (def.key !== 'boot') state.fish[def.key] = (state.fish[def.key] ?? 0) + 1;
  const record = j && size > j.best;
  const msg = def.key === 'boot'
    ? '👢 You caught… an old boot. Well, it\'s something!'
    : `${def.icon} You caught a <b>${def.name}</b>! ${size} cm`;
  ui.toast(msg + (fresh ? '<span class="new">NEW!</span>' : record ? '<span class="new">BIGGEST!</span>' : ''), 'big');
  if (def.legend) setTimeout(() => ui.toast('✨ The legendary Golden Fish! Kai won\'t believe it!', 'good'), 900);
  save();
}

// Debugging: `__cc.sim(30)` runs thirty seconds of game without drawing.
window.__cc = {
  get state(){ return state; }, get world(){ return world; }, get player(){ return player; }, get animals(){ return animals; },
  get fishing(){ return fishing; }, save, tap(){ s.eTap = true; },
  sim(sec){ for (let i = 0; i < sec * 20; i++) tick(0.05); },
};
boot();
