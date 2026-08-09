// ---------- High Water: the conductor ----------
//
// Owns the renderer, the clock and the interaction rules. Everything else is a
// module it drives: terrain and water for the world, weather for the look,
// state for the numbers, business for the money, ui for the screen.
import * as THREE from 'three';

import { buildTerrain, height, SITES } from './terrain.js';
import { Flood, DAYS, SAFE_LINE, floodAt } from './water.js';
import { Weather } from './weather.js';
import { WorldProps } from './world.js';
import { Player } from './player.js';
import { GameState } from './state.js';
import { Business } from './business.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import {
  DAY_SECONDS, GATHER_SECONDS, NODES, RES, MATERIALS, PRODUCTS, PROJECTS, STAMINA,
} from './econ.js';

const canvas = document.getElementById('scene');
const ui = new UI();
const audio = new Audio();
const state = new GameState();

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8fa4ae, 30, 150);
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 600);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------------------------------------------------------- world
let flood, weather, props, player, business;

// House geometry the interaction rules need to know about.
const HOUSE = { x: 2, z: 17, half: 5.2 };
const BOAT = { x: 12, z: 22, half: 2.6 };
let houseGroundY = 0, slipGroundY = 0;

// Interaction / session state that isn't worth saving.
const session = {
  paused: true,
  eDown: false,
  holdT: 0,
  gatherT: 0,
  workT: 0,
  climb: 0,            // 0 ground, 1 deck, 2 roof platform
  aboard: false,
  lastDay: 0,
  drownT: 0,
  station: null,
  ended: false,
};

const clock = new THREE.Clock();

// ---------------------------------------------------------------- boot
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function boot(){
  ui.boot(0.08, 'Carving the valley…');
  await nextFrame();
  scene.add(buildTerrain());

  ui.boot(0.34, 'Letting the river in…');
  await nextFrame();
  flood = new Flood(scene);

  ui.boot(0.52, 'Rolling in the weather…');
  await nextFrame();
  weather = new Weather(scene);

  ui.boot(0.68, 'Putting up the village…');
  await nextFrame();
  props = new WorldProps(scene);
  houseGroundY = height(HOUSE.x, HOUSE.z);
  slipGroundY = height(BOAT.x, BOAT.z);

  ui.boot(0.86, 'Finding your boots…');
  await nextFrame();
  player = new Player(scene, canvas, camera, audio);
  business = new Business(scene, state, audio);

  // The house is the one thing big enough to swallow the camera.
  const houseMin = new THREE.Vector3(), houseMax = new THREE.Vector3();
  player.obstacle = () => {
    if (state.houseStage < 3) return null;          // no walls yet, nothing solid
    houseMin.set(HOUSE.x - HOUSE.half, houseGroundY + 1.6, HOUSE.z - HOUSE.half);
    houseMax.set(HOUSE.x + HOUSE.half, houseGroundY + 7.6, HOUSE.z + HOUSE.half);
    return { min: houseMin, max: houseMax };
  };

  ui.boot(1, 'Ready.');
  await nextFrame();

  const resumed = state.load();
  syncBuilt();
  session.lastDay = Math.floor(state.day);

  ui.hideBoot();
  ui.showHud();

  if (resumed && state.day > 0.01 && !state.ended){
    session.paused = false;
    ui.toast(`Resumed on day ${Math.floor(state.day) + 1}`, 'good');
    start();
  } else {
    if (state.ended) state.reset();
    ui.showIntro(() => { state.seenIntro = true; session.paused = false; start(); });
  }

  requestAnimationFrame(frame);
}

function start(){
  audio.unlock();
  clock.getDelta();          // drop the boot-time delta
}

/** Push saved progress into the meshes. */
function syncBuilt(){
  props.setHouseStage(state.houseStage);
  props.setBoatStage(state.boatStage);
  props.setBusinessTier(state.tier);
  props.liftStall(state.houseStage >= 2);
}

// ---------------------------------------------------------------- helpers
// Platform heights come from PROJECTS.house — see the note there. The meshes in
// world.js are built to the same offsets.
const STAND = (i) => PROJECTS.house.stages[i].stand;
const DECK_Y = () => houseGroundY + STAND(1);
const ROOF_Y = () => houseGroundY + STAND(3);

/** Where you would be standing right now, for the flood gauge and the ending. */
const refugeHeight = () => state.refugeHeight(houseGroundY);

const insideHouse = () => Math.abs(player.position.x - HOUSE.x) < HOUSE.half
  && Math.abs(player.position.z - HOUSE.z) < HOUSE.half;

const boatFloatY = () => (state.boatStage >= 3 ? Math.max(slipGroundY, flood.level - 0.75) : slipGroundY);
const insideBoat = () => Math.abs(player.position.x - BOAT.x) < BOAT.half
  && Math.abs(player.position.z - BOAT.z) < 4.6;

/** The stall is shut when the water is over the counter and the deck isn't up. */
function stallOpen(){
  if (state.houseStage >= 2) return true;
  return flood.level < height(-9, 12) + 0.9;
}

/** A gather site works until the water is over your waist. */
function nodeUsable(site){
  return flood.level < SITES[site].y + 1.0;
}

// ---------------------------------------------------------------- stations
function nearestStation(){
  let best = null, bestD = Infinity;
  const p = player.position;
  for (const st of props.stations){
    // `vertical` is set on stations that live on a platform, so they can't be
    // used from the ground underneath. Most stations leave it unset — the depot
    // barge in particular floats away from its own recorded height.
    if (st.vertical !== undefined && Math.abs(p.y - st.pos.y) > st.vertical) continue;
    const d = Math.hypot(p.x - st.pos.x, p.z - st.pos.z);
    if (d < st.radius && d < bestD){ best = st; bestD = d; }
  }
  return best;
}

/**
 * What E does here. `tap` is the instant action, `work` is the hold-to-do-it one.
 * Returning a label for each keeps the prompt and the handlers in step.
 */
function actionsFor(st){
  if (!st) return null;

  if (st.node){
    const spec = NODES[st.node];
    if (!nodeUsable(st.node)) return { label: `${SITES[st.node].label} is under water` };
    if (state.nodeLeft[st.node] <= 0) return { label: `${SITES[st.node].label} is picked clean today` };
    if (state.satchelFree <= 0) return { label: 'Satchel full — take it to your stall' };
    return { work: 'gather', workLabel: spec.verb, label: `Hold E · ${spec.verb}` };
  }

  switch (st.id){
    case 'stall':
      return stallOpen()
        ? { tap: 'stall', label: 'E · Your business' }
        : { label: 'The stall is under water — raise the house to lift it' };

    case 'depot':
      return { tap: 'depot', label: "E · Marv's depot" };

    case 'bed':
      return flood.level > houseGroundY + 0.5
        ? { label: 'The tent is swamped' }
        : { tap: 'bed', label: 'E · Tent' };

    case 'house': {
      const done = state.houseDone;
      const ready = !done && state.canStart('house');
      const climbable = state.houseStage >= 2;
      const parts = ['E · House plans'];
      if (ready) parts.push(`hold E · ${state.nextStage('house').name}`);
      if (climbable) parts.push(session.climb ? '⬆ down' : '⬆ climb up');
      return {
        tap: 'house', work: ready ? 'house' : null,
        workLabel: ready ? `Building the ${state.nextStage('house').name}` : null,
        climb: climbable, label: parts.join('  ·  '),
      };
    }

    case 'boat': {
      const done = state.boatDone;
      const ready = !done && state.canStart('boat');
      const parts = ['E · Boat plans'];
      if (ready) parts.push(`hold E · ${state.nextStage('boat').name}`);
      if (done) parts.push(session.aboard ? '⬆ step off' : '⬆ climb aboard');
      return {
        tap: 'boat', work: ready ? 'boat' : null,
        workLabel: ready ? `Building the ${state.nextStage('boat').name}` : null,
        board: done, label: parts.join('  ·  '),
      };
    }

    default:
      return { label: st.label };
  }
}

// ---------------------------------------------------------------- guide arrow
const camDir = new THREE.Vector3();

/**
 * Point the on-screen arrow at whatever the objective line is talking about.
 * `goto` is a station id, or 'node' for the nearest gather site still above water
 * — the one piece of the advice that depends on where the player is standing.
 */
function updateGuide(goto){
  let st = null;

  if (goto === 'node'){
    let bestD = Infinity;
    for (const s of props.stations){
      if (!s.node || !nodeUsable(s.node) || state.nodeLeft[s.node] <= 0) continue;
      const d = Math.hypot(player.position.x - s.pos.x, player.position.z - s.pos.z);
      if (d < bestD){ bestD = d; st = s; }
    }
  } else if (goto){
    st = props.stations.find((s) => s.id === goto) || null;
  }

  if (!st || st === session.station){ ui.guide(0, null); return; }

  const dx = st.pos.x - player.position.x, dz = st.pos.z - player.position.z;
  camera.getWorldDirection(camDir);
  // atan2(x, z) for both, so the difference is a rotation about the vertical.
  // Screen-clockwise is the negative of that, which is what CSS rotate wants.
  let rel = Math.atan2(dx, dz) - Math.atan2(camDir.x, camDir.z);
  while (rel > Math.PI) rel -= Math.PI * 2;
  while (rel < -Math.PI) rel += Math.PI * 2;

  ui.guide(-rel * (180 / Math.PI), st.label, Math.hypot(dx, dz));
}

// ---------------------------------------------------------------- panels
function openStall(){
  pause();
  ui.open('stall', `${state.tierInfo.ico} ${state.tierInfo.name}`, ui.stallHtml(state), (action, arg) => {
    if (action === 'craft'){
      const p = PRODUCTS.find((q) => q.id === arg);
      const why = state.canCraft(p);
      if (why){ audio.deny(); ui.toast(why, 'bad'); }
      else if (state.startCraft(p)){ audio.ui(); ui.toast(`Making a ${p.name}`, 'good'); }
    }
    if (action === 'upgrade'){
      if (state.upgrade()){
        audio.done();
        props.setBusinessTier(state.tier);
        ui.toast(`Upgraded to ${state.tierInfo.name}`, 'money');
      } else audio.deny();
    }
    ui.el.panelTitle.textContent = `${state.tierInfo.ico} ${state.tierInfo.name}`;
    ui.refresh(ui.stallHtml(state));
    player.setCarried(state.carried);
  });
}

function openDepot(){
  pause();
  ui.open('depot', "🛒 Marv's Depot", ui.depotHtml(state, state.day), (action, arg, n) => {
    if (action === 'buy'){
      const got = state.buyMat(arg, n, state.day);
      if (got){ audio.buy(); ui.toast(`${got}× ${MATERIALS[arg].name} sent to the site`, 'money'); }
      else { audio.deny(); ui.toast('Not enough money', 'bad'); }
    }
    if (action === 'sellraw'){
      const paid = state.sellRaw(arg);
      if (paid){ audio.cash(); ui.toast(`Sold for $${paid}`, 'money'); }
      player.setCarried(state.carried);
    }
    ui.refresh(ui.depotHtml(state, state.day));
  });
}

function openProject(which){
  pause();
  const p = PROJECTS[which];
  ui.open(which, `${p.ico} ${p.name}`, ui.projectHtml(which, state, state.day, houseGroundY), () => {});
}

function openBed(){
  pause();
  ui.open('bed', '⛺ Tent', ui.tentHtml(state, state.day), (action) => {
    if (action === 'sleep'){
      ui.closePanel();
      sleepToDawn();
    }
  });
}

function openPlan(){
  pause();
  ui.open('plan', '📋 Your plan', ui.planHtml(state, state.day, flood.level, refugeHeight()), () => {});
}

function openHelp(){
  pause();
  ui.el.btnCog.classList.remove('nudge');
  ui.open('help', '⚙️ How to play', ui.helpHtml(audio.enabled), (action) => {
    if (action === 'sound'){
      toggleSound();
      ui.refresh(ui.helpHtml(audio.enabled));
    }
    if (action === 'restart'){
      GameState.clear();
      location.reload();
    }
  });
}

function pause(){ session.paused = true; }
ui.onClose = () => { if (!session.ended) session.paused = false; };

// ---------------------------------------------------------------- actions
function doTap(st, act){
  if (!act) return;
  if (act.tap === 'stall') return openStall();
  if (act.tap === 'depot') return openDepot();
  if (act.tap === 'bed') return openBed();
  if (act.tap === 'house') return openProject('house');
  if (act.tap === 'boat') return openProject('boat');
  void st;
}

function doClimb(act){
  if (act?.board){
    session.aboard = !session.aboard;
    if (session.aboard){
      player.position.set(BOAT.x, boatFloatY() + 1.0, BOAT.z);
      ui.toast('Aboard. She will float when the water comes.', 'good');
    } else {
      ui.toast('Back on the slip', '');
    }
    audio.ui();
    return;
  }
  if (!act?.climb) return;

  const top = state.houseStage >= 4 ? 2 : 1;
  session.climb = session.climb >= top ? 0 : session.climb + 1;
  // Up puts you on the middle of the platform; down puts you back at the foot of
  // the ladder, which is the south face.
  const z = session.climb ? HOUSE.z : HOUSE.z - (HOUSE.half + 1.0);
  const y = session.climb === 0 ? height(HOUSE.x, z)
    : session.climb === 1 ? DECK_Y() : ROOF_Y();
  player.position.set(HOUSE.x, y, z);
  audio.step(false);
  ui.toast(session.climb === 0 ? 'Back down the ladder'
    : session.climb === 1 ? `On the deck · ${DECK_Y().toFixed(1)}m`
    : `On the roof platform · ${ROOF_Y().toFixed(1)}m`, 'good');
}

function doWork(st, act, dt){
  if (act.work === 'gather'){
    session.gatherT += dt;
    if (session.gatherT >= GATHER_SECONDS){
      session.gatherT = 0;
      const res = NODES[st.node].res;
      if (state.addRes(res, 1)){
        state.nodeLeft[st.node]--;
        player.setCarried(state.carried);
        audio.gather();
        player.burst(
          player.position.clone().setY(player.position.y + 0.9),
          6, RES[res].color, 2.6, 1.2,
        );
        if (state.satchelFree <= 0) ui.toast('Satchel full', 'bad');
        if (state.nodeLeft[st.node] <= 0) ui.toast(`${SITES[st.node].label} is picked clean today`, 'bad');
      }
    }
    return;
  }

  // Building. Progress is per stage and resets if you wander off.
  const which = act.work;
  const stage = state.nextStage(which);
  if (!stage) return;

  session.workT += dt;
  if (Math.floor(session.workT * 2.2) !== Math.floor((session.workT - dt) * 2.2)) audio.hammer();

  if (session.workT >= stage.work){
    session.workT = 0;
    state.completeStage(which);
    syncBuilt();
    audio.done();
    ui.toast(`${stage.name} finished`, 'good');
    if (which === 'house' && state.houseStage === 2){
      ui.toast('Your stall moved up onto the deck', 'money');
      ui.toast('Ladder is up — press ⬆ (or C) here to climb', 'good');
    }
    if (state.houseDone) ui.toast('The house clears the surge. Climb it on the last night.', 'money');
    if (state.boatDone) ui.toast('The boat is finished. She will float.', 'money');
    state.save();
  }
}

// ---------------------------------------------------------------- day cycle
function sleepToDawn(){
  const till = 1 - (state.day - Math.floor(state.day));
  state.day += till;
  player.stamina = STAMINA.max;
  // Crafting carries on through the night.
  business.update(till * DAY_SECONDS, props.stations.find((s) => s.id === 'stall'), flood.level, false, null, null);
  dawn();
}

function dawn(){
  const dayIndex = Math.floor(state.day);
  session.lastDay = dayIndex;
  state.refillNodes();
  state.save();
  audio.dawn();

  if (dayIndex >= DAYS){ finish(); return; }

  const level = floodAt(state.day);
  const tomorrow = floodAt(dayIndex + 1);
  const refuge = refugeHeight();
  const rows = [
    `<div class="row"><span>Water this morning</span><b>${level.toFixed(1)} m</b></div>`,
    `<div class="row"><span>By this time tomorrow</span><b>${tomorrow.toFixed(1)} m</b></div>`,
    `<div class="row ${refuge >= SAFE_LINE ? 'good' : 'bad'}"><span>Highest you can stand</span><b>${refuge.toFixed(1)} m</b></div>`,
    `<div class="row"><span>Money</span><b>$${state.money}</b></div>`,
    `<div class="row"><span>Sold yesterday</span><b>${state.sales} total for $${state.earned}</b></div>`,
  ].join('');

  const drowned = Object.keys(NODES).filter((s) => !nodeUsable(s))
    .map((s) => SITES[s].label);
  let note = drowned.length
    ? `Under water now: <b>${drowned.join(', ')}</b>. Whatever you did not carry out is gone.`
    : 'Everything is still reachable. It will not stay that way.';
  if (dayIndex === DAYS - 1){
    note = 'Last day. The evacuation horn has been going since dawn — the surge comes tonight.';
    audio.siren();
  }

  pause();
  ui.dayCard(dayIndex, rows, note, () => { session.paused = false; });
}

function finish(){
  session.ended = true;
  pause();
  const refuge = refugeHeight();
  const kind = state.boatDone ? 'boat'
    : refuge >= SAFE_LINE ? 'house'
    : refuge >= floodAt(DAYS) - 0.5 ? 'wet'
    : 'lost';
  state.ended = kind;
  state.save();
  if (kind === 'lost') audio.siren(); else audio.done();
  ui.ending(kind, state, refuge, () => {
    GameState.clear();
    location.reload();
  });
}

// ---------------------------------------------------------------- swept away
function sweep(){
  const lost = state.loseSatchel();
  player.setCarried(0);
  player.stamina = STAMINA.max * 0.4;
  session.climb = 0;
  session.aboard = false;
  const s = props.stations.find((st) => st.id === 'bed');
  player.spawn(s.pos.x, s.pos.z + 1.5);
  audio.splash();
  ui.toast(lost ? `The current took you — and ${lost} materials` : 'The current took you back', 'bad');
}

// ---------------------------------------------------------------- input
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  audio.unlock();
  if (e.code === 'Escape'){ ui.closePanel(); return; }
  if (ui.panelOpen) return;

  if (e.code === 'KeyE'){ session.eDown = true; session.holdT = 0; }
  if (e.code === 'KeyC') doClimb(actionsFor(session.station));
  if (e.code === 'Tab'){ e.preventDefault(); openPlan(); }
  if (e.code === 'KeyH') openHelp();
  if (e.code === 'KeyM') toggleSound();
});

addEventListener('keyup', (e) => {
  if (e.code !== 'KeyE') return;
  if (session.eDown && session.holdT < 0.28 && !ui.panelOpen) doTap(session.station, actionsFor(session.station));
  session.eDown = false;
  session.holdT = 0;
  session.gatherT = 0;
  session.workT = 0;
});

ui.el.btnAct.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  audio.unlock();
  session.eDown = true;
  session.holdT = 0;
});
const releaseAct = () => {
  if (!session.eDown) return;
  if (session.holdT < 0.28) doTap(session.station, actionsFor(session.station));
  session.eDown = false;
  session.holdT = 0;
  session.gatherT = 0;
  session.workT = 0;
};
ui.el.btnAct.addEventListener('pointerup', releaseAct);
ui.el.btnAct.addEventListener('pointercancel', releaseAct);

// Climbing gets its own button: touch has no C key, and the act button is
// already spoken for by the panels.
ui.el.btnClimb.addEventListener('click', () => doClimb(actionsFor(session.station)));

ui.el.btnRun.addEventListener('pointerdown', (e) => { e.preventDefault(); player.wantSprint = true; ui.el.btnRun.classList.add('on'); });
const stopRun = () => { player.wantSprint = false; ui.el.btnRun.classList.remove('on'); };
ui.el.btnRun.addEventListener('pointerup', stopRun);
ui.el.btnRun.addEventListener('pointercancel', stopRun);

ui.el.btnPlan.addEventListener('click', () => { audio.ui(); openPlan(); });
ui.el.btnCog.addEventListener('click', () => { audio.ui(); openHelp(); });
ui.el.btnSound.addEventListener('click', toggleSound);

function toggleSound(){
  audio.unlock();
  audio.setEnabled(!audio.enabled);
  ui.el.btnSound.textContent = audio.enabled ? '🔊' : '🔇';
}

ui.bindStick((x, y) => { player.stick.x = x; player.stick.y = y; });

// ---------------------------------------------------------------- frame
function frame(){
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  if (!player) return;

  const running = !session.paused && !ui.panelOpen && !session.ended;
  if (running) state.day += dt / DAY_SECONDS;

  // --- what E would do here ---
  session.station = nearestStation();
  const act = actionsFor(session.station);
  let working = false;

  if (running && session.eDown){
    session.holdT += dt;
    if (session.holdT > 0.28 && act?.work){
      working = true;
      doWork(session.station, act, dt);
    }
  }
  if (!session.eDown || !act?.work){ session.workT = Math.max(0, session.workT - dt * 2); }

  // --- world ---
  weather.update(running ? dt : 0, state.day, camera, audio);
  flood.update(dt, state.day, camera, weather);

  // Standing on the deck, the roof, or the boat overrides the ground.
  let platformY = null;
  if (session.climb === 1 && insideHouse()) platformY = DECK_Y();
  else if (session.climb === 2 && insideHouse()) platformY = ROOF_Y();
  else if (session.climb && !insideHouse()) session.climb = 0;
  if (session.aboard && insideBoat()) platformY = boatFloatY() + 1.0;
  else if (session.aboard && !insideBoat()) session.aboard = false;

  player.platformY = platformY;
  props.setCutaway(session.climb > 0 || insideHouse());
  player.update(running ? dt : 0, flood.level, !running, working, Math.max(weather.night, weather.rain * 0.35));
  props.update(running ? dt : 0, flood.level, weather, player.position);

  // The boat rides the water once the hull is sealed.
  props.boatGroup.position.y = boatFloatY() + (state.boatStage >= 3 ? Math.sin(props.t * 0.9) * 0.06 : 0);
  props.boatGroup.rotation.z = state.boatStage >= 3 ? Math.sin(props.t * 0.7) * 0.02 : 0;

  // --- business ---
  if (running){
    const stall = props.stations.find((s) => s.id === 'stall');
    business.update(dt, stall, flood.level, stallOpen(), (sale) => {
      const p = PRODUCTS.find((q) => q.id === sale.id);
      const v = sale.pos.clone().project(camera);
      if (v.z < 1){
        ui.pop(`+$${sale.paid}`, (v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight);
      }
      ui.toast(`Sold a ${p.name} for $${sale.paid}`, 'money');
    }, (p) => ui.toast(`${p.name} ready on the shelf`, 'good'));
  }

  // --- getting into trouble ---
  if (running && player.swimming && player.stamina <= 0){
    session.drownT += dt;
    if (session.drownT > 1.6){ session.drownT = 0; sweep(); }
  } else session.drownT = 0;

  // --- day rollover ---
  if (running && Math.floor(state.day) > session.lastDay) dawn();
  if (running && state.day >= DAYS) finish();

  // --- screen ---
  const goto = ui.hud(state, state.day, weather, flood.level, refugeHeight(), player.stamina / STAMINA.max);
  updateGuide(goto);
  if (act) ui.setPrompt(act.label, act.work && session.eDown && session.holdT > 0.28
    ? (act.work === 'gather' ? session.gatherT / GATHER_SECONDS : session.workT / (state.nextStage(act.work)?.work || 1))
    : null);
  else ui.clearPrompt();

  ui.el.btnClimb.classList.toggle('hidden', !(act?.climb || act?.board));
  ui.el.btnClimb.textContent = (session.climb || session.aboard) ? '⬇' : '⬆';

  ui.submerged(camera.position.y < flood.level - 0.05);
  ui.flash(weather.flash);

  // Countdown on the last night, so the surge is never a surprise.
  if (running && state.day > DAYS - 0.25){
    const secs = Math.ceil((DAYS - state.day) * DAY_SECONDS);
    ui.setPrompt(`⚠️ SURGE IN ${secs}s — get to your refuge`, null);
  }

  renderer.render(scene, camera);
}

// Autosave, quietly — but not while the intro is still up, or reloading during
// it would "resume" a game that never started.
setInterval(() => { if (state.seenIntro && !session.ended) state.save(); }, 8000);
addEventListener('pagehide', () => { if (state.seenIntro) state.save(); });

boot().then(() => player.setCarried(state.carried));

// A little handle for poking at things from the console: __hw.state.day = 9.9
// is the fastest way to see the end of the game.
Object.assign(window, {
  __hw: {
    state, session, camera, scene,
    get level(){ return flood.level; },
    get player(){ return player; },
    get weather(){ return weather; },
    get props(){ return props; },
  },
});
