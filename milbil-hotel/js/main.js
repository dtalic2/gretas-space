// ---------- Milbil Hotel: boot, wiring and the frame loop ----------

import * as THREE from 'three';
import { FLOOR_H, MAX_FLOORS, ITEMS, EXTRA, WISH, CHARACTER, floorCost, unlocksAt } from './data.js';
import * as E from './econ.js';
import * as S from './save.js';
import * as F from './format.js';
import * as UI from './ui.js';
import { World } from './world.js';
import { Hotel } from './hotel.js';
import { CameraRig } from './camera.js';
import { Audio } from './audio.js';

const $ = UI.$;
const bootBar = (p, msg) => { $('bootBar').style.width = p + '%'; if (msg) $('bootMsg').textContent = msg; };

bootBar(15, 'Fluffing the pillows…');

let state = S.load();
const awayEvents = E.tick(state, Date.now());
const awayFor = (Date.now() - (state.lastSeen || Date.now())) / 1000;

const world = new World($('scene'));
bootBar(45, 'Polishing the bell…');
const hotel = new Hotel(world.scene, state);
bootBar(75, 'Opening the front door…');
const audio = new Audio(state.muted);
const raycaster = new THREE.Raycaster();

const rig = new CameraRig(world.camera, $('scene'), { onTap: (x, y) => tapAt(x, y) });
rig.fit();
rig.setTop(state.floors * FLOOR_H + 2, state.floors * FLOOR_H / 2 + 1);
rig.goal.set(-1, 3.4, 0);
rig._clamp();
rig.target.copy(rig.goal);

let placing = null;              // { id, kind } while choosing where a room goes
let panelKind = null;            // which panel is open, so it can be refreshed
const levelQueue = [];
let resetting = false;

// ------------------------------------------------------------- helpers ----

function screenOf(v){
  const p = v.clone().project(world.camera);
  if (p.z > 1) return null;
  return { x:(p.x + 1) / 2 * window.innerWidth, y:(1 - p.y) / 2 * window.innerHeight };
}

function floatAt(v, text){
  const p = screenOf(v);
  if (p) UI.floater(p.x, p.y, text);
}

function persist(){ if (!resetting) S.save(state); }

function changed(){
  hotel.sync();
  rig.setTop(state.floors * FLOOR_H + 2, state.floors * FLOOR_H / 2 + 1);
  hud();
  persist();
}

function levelUps(ups){
  if (!ups || !ups.length) return;
  levelQueue.push(...ups);
  if ($('levelUp').classList.contains('hidden')) showLevel();
}

function showLevel(){
  const u = levelQueue.shift();
  if (!u) return;
  audio.level();
  $('lvlNum').textContent = u.level;
  $('lvlPurse').textContent = `Milbil Town is talking about your hotel. They send ${u.bonus} coins.`;
  const un = unlocksAt(u.level);
  $('lvlUnlocks').innerHTML = un.length
    ? un.map(x => `<span>${x.emoji} ${x.name}</span>`).join('')
    : '<span>⭐ Guests turn up a little more often</span>';
  $('levelUp').classList.remove('hidden');
}

$('lvlGo').addEventListener('click', () => {
  $('levelUp').classList.add('hidden');
  if (levelQueue.length) showLevel();
});

function panel(kind, fn){
  panelKind = kind;
  fn();
}

UI.$('panelClose').addEventListener('click', () => { UI.closePanel(); panelKind = null; });
$('panel').addEventListener('click', (e) => { if (e.target.id === 'panel'){ UI.closePanel(); panelKind = null; } });

// ------------------------------------------------------------- actions ----

const actions = {
  checkin(uid){
    const g = state.lobby.find(x => x.uid === uid);
    const r = E.checkIn(state, uid, Date.now());
    if (!r.ok){
      audio.nope();
      UI.toast(r.why, 'bad');
      return;
    }
    audio.bell();
    const room = ITEMS[state.rooms[r.key].type];
    UI.toast(`${g.name} → ${room.emoji} ${room.name}${r.wished ? ' 😊' : ''}`, 'good');
    changed();
    if (panelKind === 'lobby') openLobby();
  },

  collect(k){
    const top = hotel.slotTop(k);
    const r = E.collect(state, k, Date.now());
    if (!r.ok) return;
    audio.coins();
    floatAt(top, `+${r.coins} 🪙${r.happy ? ' 😊' : ''}`);
    if (panelKind === 'room'){ UI.closePanel(); panelKind = null; }
    changed();
    levelUps(r.levels);
  },

  tidy(k){
    const r = E.tidy(state, k);
    if (!r.ok) return;
    audio.tidy();
    floatAt(hotel.slotTop(k), '✨');
    if (panelKind === 'room'){ UI.closePanel(); panelKind = null; }
    changed();
    levelUps(r.levels);
  },

  knock(k){
    const it = ITEMS[state.rooms[k].type];
    ask(`Knock down the ${it.name}?`, 'You get half its price back, and the space is empty again.', 'Knock it down', () => {
      const r = E.demolish(state, k);
      if (!r.ok){ UI.toast(r.why, 'bad'); return; }
      UI.toast(`Knocked down — +🪙 ${r.back}`);
      changed();
    });
  },

  pick(id, kind, key, refresh){
    if (kind === 'extra'){
      const r = E.buyExtra(state, id);
      if (!r.ok){ audio.nope(); UI.toast(r.why, 'bad'); return; }
      audio.build();
      UI.toast(`${EXTRA[id].emoji} ${EXTRA[id].name} built!`, 'good');
      changed();
      UI.closePanel(); panelKind = null;
      if (id === 'pool' || id === 'sign') rig.lookAt(state.floors * FLOOR_H);
      levelUps(r.levels);
      return;
    }
    const chk = E.buildCheck(state, id);
    if (!chk.ok){
      audio.nope();
      UI.toast(chk.full ? 'No empty space — add a floor from 🏨 Hotel' : chk.why, 'bad');
      return;
    }
    const empties = E.emptySlots(state);
    if (key || empties.length === 1) return place(id, key || empties[0]);
    UI.closePanel(); panelKind = null;
    placing = { id, kind };
    $('placeName').textContent = `${ITEMS[id].emoji} ${ITEMS[id].name} · 🪙 ${F.coins(chk.cost)}`;
    $('placeBar').classList.remove('hidden');
  },

  floor(refresh){
    const r = E.buyFloor(state);
    if (!r.ok){ audio.nope(); UI.toast(r.why, 'bad'); return; }
    audio.build();
    UI.toast(`Floor ${state.floors - 1} is up — three new spaces!`, 'good');
    changed();
    rig.lookAt((state.floors - 1) * FLOOR_H + 1.5);
    levelUps(r.levels);
    if (refresh) refresh();
  },

  lobby(refresh){
    const r = E.growLobby(state);
    if (!r.ok){ audio.nope(); UI.toast(r.why, 'bad'); return; }
    audio.build();
    UI.toast(`The lobby now holds ${E.lobbySize(state)} guests`, 'good');
    changed();
    refresh && refresh();
  },

  keeper(refresh){
    const r = E.hireKeeper(state, Date.now());
    if (!r.ok){ audio.nope(); UI.toast(r.why, 'bad'); return; }
    audio.build();
    UI.toast(`🧹 A housekeeper has joined the staff`, 'good');
    changed();
    refresh && refresh();
  },

  // ---- saving ----
  exportText(){ return S.exportText(state); },
  exportFile(){
    const blob = new Blob([S.exportText(state)], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `milbil-hotel-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  },
  importFile(){
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json,text/plain';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0];
      if (f) loadFrom(await f.text());
    };
    inp.click();
  },
  copyText(ta){
    ta.value = S.exportText(state);
    ta.select();
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject())
      .then(() => UI.toast('Copied'), () => { document.execCommand && document.execCommand('copy'); UI.toast('Copied'); });
  },
  loadText(ta){ loadFrom(ta.value); },
  reset(){
    ask('Start a new hotel?', 'This hotel will be gone for good unless you saved a copy first.', 'Start again', () => {
      resetting = true;
      S.wipe();
      location.reload();
    });
  },
};

function loadFrom(text){
  ask('Load this save?', 'It replaces the hotel you have now.', 'Load it', () => {
    try {
      S.importText(text);
      resetting = true;
      location.reload();
    } catch (err){
      UI.toast(err.message, 'bad');
    }
  });
}

/** A yes-or-no card in the panel. Browser confirm() boxes are ugly on phones and blocked in some frames. */
function ask(title, text, yes, onYes){
  panel('ask', () => UI.openPanel(title, `<p class="sub">${text}</p>
    <div class="actions"><button class="pill" id="askNo">Keep it</button><button class="pill warn" id="askYes">${yes}</button></div>`,
    (root) => {
      root.querySelector('#askNo').addEventListener('click', () => { UI.closePanel(); panelKind = null; });
      root.querySelector('#askYes').addEventListener('click', () => { UI.closePanel(); panelKind = null; onYes(); });
    }));
}

function place(id, key){
  const r = E.build(state, id, key);
  if (!r.ok){ audio.nope(); UI.toast(r.why, 'bad'); return; }
  audio.build();
  UI.closePanel(); panelKind = null;
  cancelPlacing();
  changed();
  const [f] = E.unkey(key);
  rig.lookAt(f * FLOOR_H + 1.5);
  UI.toast(`${ITEMS[id].emoji} ${ITEMS[id].name} built!`, 'good');
  levelUps(r.levels);
}

function cancelPlacing(){
  placing = null;
  $('placeBar').classList.add('hidden');
}
$('placeCancel').addEventListener('click', cancelPlacing);

function openShop(opts){ panel('shop', () => UI.shopPanel(state, actions, opts)); }
function openLobby(){ panel('lobby', () => UI.lobbyPanel(state, actions)); }
function openRoom(k){ panel('room', () => UI.roomPanel(state, k, actions)); }

function openFloor(){
  if (state.floors >= MAX_FLOORS){ UI.toast('The hotel is as tall as it goes'); return; }
  const cost = floorCost(state.floors);
  panel('floor', () => UI.openPanel('🏗 A new floor', `
    <p class="sub">Build floor ${state.floors} on top: three more spaces for rooms or areas, and the lift goes up another stop.</p>
    <div class="rows"><div class="row"><span>Costs</span><b>🪙 ${F.coins(cost)}</b></div>
    <div class="row"><span>You have</span><b>🪙 ${F.coins(state.coins)}</b></div></div>
    <div class="actions"><button class="pill go" id="floorGo"${state.coins < cost ? ' disabled' : ''}>Build it</button></div>`,
    (root) => root.querySelector('#floorGo').addEventListener('click', () => { UI.closePanel(); panelKind = null; actions.floor(); })));
}

// ---------------------------------------------------------------- taps ----

function tapSlot(k){
  const r = state.rooms[k];
  if (!r){
    if (placing) return place(placing.id, k);
    return openShop({ key:k });
  }
  if (placing){ UI.toast('That space is taken — pick a ＋', 'bad'); return; }
  if (r.st === 'pay') return actions.collect(k);
  if (r.st === 'messy' && !state.keepers) return actions.tidy(k);
  openRoom(k);
}

function tapAt(x, y){
  audio.startAmbient();
  const ndc = new THREE.Vector2(x / window.innerWidth * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, world.camera);
  const hit = hotel.pick(raycaster);
  if (!hit) return;
  audio.tap();
  if (hit.guest) return actions.checkin(hit.guest);
  if (hit.slot) return tapSlot(hit.slot);
  if (hit.roof) return openFloor();
  if (hit.lobby) return openLobby();
}

// ------------------------------------------------------------- markers ----

const markers = new Map();       // id -> element

$('markers').addEventListener('click', (e) => {
  const el = e.target.closest('.mk');
  if (!el) return;
  audio.startAmbient();
  audio.tap();
  const d = el.dataset;
  if (d.slot) return tapSlot(d.slot);
  if (d.guest) return actions.checkin(Number(d.guest));
  if (d.roof) return openFloor();
});

function marker(id, pos, cls, html, data){
  let el = markers.get(id);
  if (!el){
    el = document.createElement('button');
    el.className = 'mk';
    Object.assign(el.dataset, data);
    $('markers').appendChild(el);
    markers.set(id, el);
  }
  el._seen = true;
  const want = 'mk ' + cls;
  if (el.className !== want) el.className = want;
  if (el._html !== html){ el.innerHTML = html; el._html = html; }
  const p = pos && screenOf(pos);
  if (!p || p.x < -80 || p.x > window.innerWidth + 80 || p.y < -60 || p.y > window.innerHeight + 80){
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.style.left = p.x.toFixed(1) + 'px';
  el.style.top = p.y.toFixed(1) + 'px';
}

function updateMarkers(){
  const now = Date.now();
  for (const el of markers.values()) el._seen = false;

  for (const k of E.allSlots(state)){
    const r = state.rooms[k];
    const top = hotel.slotTop(k);
    if (!r){
      marker('s' + k, top.setY(top.y - 1.2), placing ? 'add placing' : 'add', placing ? 'Put it here' : '＋', { slot:k });
    } else if (r.st === 'busy'){
      const it = ITEMS[r.type];
      const pct = Math.max(0, Math.min(100, 100 - (r.endsAt - now) / (it.secs * 10)));
      marker('s' + k, top, 'busy', `<span class="em">💤</span><span class="bar"><i style="width:${pct.toFixed(0)}%"></i></span>${F.clock((r.endsAt - now) / 1000)}`, { slot:k });
    } else if (r.st === 'pay'){
      marker('s' + k, top, 'pay', `<span class="em">🪙</span>${r.pay}${r.happy ? ' 😊' : ''}`, { slot:k });
    } else if (r.st === 'messy'){
      const auto = state.keepers && r.tidyAt;
      marker('s' + k, top, auto ? 'messy' : 'messy tap',
        auto ? `<span class="em">🧹</span>${F.clock((r.tidyAt - now) / 1000)}` : '<span class="em">🧹</span>Tidy', { slot:k });
    }
  }

  if (state.floors < MAX_FLOORS){
    const cost = floorCost(state.floors);
    marker('roof', hotel.roofTop(), state.coins >= cost ? 'floor' : 'floor cant', `＋ Floor · 🪙 ${F.coins(cost)}`, { roof:'1' });
  }

  for (const g of state.lobby){
    const pos = hotel.guestTop(g.uid);
    const a = hotel.actorFor(g.uid);
    if (!pos || !a || a.path.length > 1) continue;         // still walking in
    const left = g.patience - (now - g.arrived) / 1000;
    const pct = Math.max(0, Math.min(100, left / g.patience * 100));
    const room = E.roomFor(state, g);
    const it = ITEMS[g.wants];
    const wish = g.wish ? `<span class="em">${WISH[g.wish].emoji}</span>` : '';
    const cls = ['guest', pct < 25 ? 'low' : '', room ? '' : 'nope'].join(' ');
    marker('g' + g.uid, pos, cls, `<span class="em">${it.emoji}</span>${wish}<span class="bar"><i style="width:${pct.toFixed(0)}%"></i></span>`, { guest:String(g.uid) });
  }

  for (const [id, el] of markers){
    if (!el._seen){ el.remove(); markers.delete(id); }
  }
}

// ----------------------------------------------------------------- HUD ----

function hud(){
  $('coins').textContent = F.coins(state.coins);
  $('level').textContent = state.level;
  $('xpBar').style.width = (E.levelProgress(state) * 100).toFixed(1) + '%';
  const size = E.lobbySize(state);
  $('waiting').textContent = `${state.lobby.length}/${size}`;
  document.querySelector('.chip.guests').classList.toggle('full', state.lobby.length >= size);
  const badge = $('lobbyBadge');
  badge.textContent = state.lobby.length;
  badge.classList.toggle('hidden', !state.lobby.length);
  const obj = E.objective(state);
  $('objective').classList.toggle('hidden', !obj);
  if (obj && $('objText').textContent !== obj) $('objText').textContent = obj;
  $('btnSound').textContent = state.muted ? '🔇' : '🔊';
}

$('objective').addEventListener('click', () => {
  const s = state.stats;
  if (!s.checkins && state.lobby.length) return openLobby();
  if (state.floors < 3 && s.tidied) return openFloor();
  openShop();
});

$('btnShop').addEventListener('click', () => { audio.tap(); openShop(); });
$('btnLobby').addEventListener('click', () => { audio.tap(); openLobby(); });
$('btnBook').addEventListener('click', () => { audio.tap(); panel('book', () => UI.bookPanel(state)); });
$('btnHelp').addEventListener('click', () => { audio.tap(); panel('help', () => UI.helpPanel(state, actions)); });
$('btnSound').addEventListener('click', () => {
  state.muted = !state.muted;
  audio.setMuted(state.muted);
  if (!state.muted){ audio.startAmbient(); audio.tap(); }
  hud(); persist();
});

window.addEventListener('keydown', (e) => {
  if (e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase();
  if (k === 'escape'){
    if (placing) cancelPlacing();
    else if (UI.panelOpen()){ UI.closePanel(); panelKind = null; }
    return;
  }
  if (k === 'b') openShop();
  if (k === 'l') openLobby();
  if (k === 'g') panel('book', () => UI.bookPanel(state));
  if (k === 'h') panel('help', () => UI.helpPanel(state, actions));
  if (k === 'm') $('btnSound').click();
});

// ---------------------------------------------------------------- time ----

function onEvents(events, quiet = false){
  if (!events.length) return;
  let lobbyChanged = false;
  for (const e of events){
    if (e.type === 'arrive'){
      lobbyChanged = true;
      if (quiet) continue;
      audio.chime();
      if (e.guest.via === 'heli') UI.toast(`🚁 ${CHARACTER[e.guest.who].name} has flown in from Milbil Town!`, 'good');
    }
    if (e.type === 'leave'){
      lobbyChanged = true;
      if (quiet) continue;
      audio.sad();
      UI.toast(`😢 ${e.guest.name} got tired of waiting and went home`, 'bad');
    }
    if (e.type === 'checkout' && !quiet) audio.note(1320, 0.1, 'triangle', 0, 0.3);
  }
  hotel.sync();
  hud();
  if (lobbyChanged && panelKind === 'lobby') openLobby();
}

setInterval(() => onEvents(E.tick(state, Date.now())), 250);
setInterval(persist, 5000);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
window.addEventListener('pagehide', persist);

// ------------------------------------------------------------------ boot ----

function welcomeBack(){
  const rep = E.awayReport(awayEvents);
  const coins = E.waitingCoins(state);
  if (awayFor < 90 || (!rep.checkouts && !rep.tidied)) return false;
  const rows = [
    [`🛎️ Guests checked out`, rep.checkouts],
    [`🪙 Coins waiting on pillows`, F.coins(coins)],
  ];
  if (rep.tidied) rows.push([`🧹 Rooms the housekeepers tidied`, rep.tidied]);
  $('welcomeBody').innerHTML = `<p class="lede">You were away ${F.span(Math.round(awayFor))}.</p>` +
    rows.map(([a, b]) => `<div class="row"><span>${a}</span><b>${b}</b></div>`).join('');
  $('welcome').classList.remove('hidden');
  return true;
}
$('welcomeGo').addEventListener('click', () => { $('welcome').classList.add('hidden'); audio.startAmbient(); });

$('introGo').addEventListener('click', () => {
  state.introSeen = true;
  $('intro').classList.add('hidden');
  audio.startAmbient();
  audio.bell();
  persist();
});

window.addEventListener('resize', () => { world.resize(); rig.fit(); });

let last = performance.now();
function frame(now){
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  world.update(dt);
  audio.setNight(world.night);
  rig.update(dt);
  world.scene.fog.near = rig.dist + 40;
  world.scene.fog.far = rig.dist + 150;
  hotel.update(dt, t);
  updateMarkers();
  world.render();
  requestAnimationFrame(frame);
}

bootBar(100, 'Ding!');
hud();
requestAnimationFrame((n) => {
  last = n;
  frame(n);
  setTimeout(() => {
    $('boot').classList.add('hidden');
    $('hud').classList.remove('hidden');
    if (!state.introSeen) $('intro').classList.remove('hidden');
    else welcomeBack();
    if (!S.storageWorks()) UI.toast('This window cannot keep a save — use ⚙️ → Save to a file', 'bad');
  }, 250);
});

onEvents([], true);
window.__hotel = { state: () => state, E, hotel };
