// ---------- Milbil GO — start-up, GPS, and the game loop ----------

import { SPECIES_BY_ID, RARITY, SHOP_TYPES, SHOW_SHOPS_M, SHOW_MILBILS_M, XP_NEW_SPECIES,
         VIEW_W_M, VIEW_L_M } from './data.js';
import * as Store from './state.js';
import { MapView } from './map.js';
import { shopsNear, milbilsNear, distance, bearingTo, offset } from './geo.js';
import { milbilHTML } from './milbil.js';
import { encounter } from './catch.js';
import { advance } from './garden.js';
import { Sheet, toast, clearToasts, card, sfx, setSound, setBuzz, buzz, $, esc } from './ui.js';
import { openGarden, tickGarden, restockTree, gardenNeeds } from './gardenview.js';
import { openShop, tickShop } from './shops.js';
import { openBook, openBag, openNearby, tickNearby, openSettings, howToPlay, foundCount } from './book.js';
import { fmtNum, fmtDist } from './format.js';

// Where you start if the game has never had a location: a big open field.
const DEFAULT_POS = { lat: -33.8985, lng: 151.2341 };   // Centennial Park, Sydney
const PAD_SPEED = 0.5;        // metres per second on the joystick — a stroll across a 5 m screen
const STARTERS = ['sprouty', 'freckles', 'giggle'];
const NAMES = ['Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Bobbin', 'Wix', 'Doodle', 'Crumb', 'Pocket',
               'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep', 'Sprig', 'Noodle', 'Tumble', 'Winkle'];

let state = Store.load();
let M = Store.mods(state);
let dirty = false;

const sheet = new Sheet($('#sheet'));
const map = new MapView($('#map'), { onTap: onMapTap, viewW: VIEW_W_M, viewL: VIEW_L_M });

let pos = state.lastPos || DEFAULT_POS;   // where you really are
let shown = { ...pos };                    // where your milbil is drawn, easing toward pos
const gps = { status: 'off', acc: null, watch: null, fixes: 0, good: false };
let walkFrom = null;
let shops = [], wild = [];
const spotted = new Set();       // milbils that have already buzzed you
let inEncounter = false;
let started = false;
let wiping = false;
const save = () => { if (!wiping) Store.save(state); };

// ---------------------------------------------------------------- shared ---
// Everything the screens need, in one place.

const G = {
  get state(){ return state; },
  M: () => M,
  sheet,
  distTo: (p) => distance(shown, p),
  mapBearing: () => map.bearing,
  changed(){ M = Store.mods(state); dirty = true; hud(); },
  addXp(n){
    const before = Store.levelOf(state.xp);
    state.xp += Math.round(n * M.xp);
    const after = Store.levelOf(state.xp);
    if (after > before){ sfx('level'); toast(`⭐ Level ${after}!`, 'good big'); }
  },
  setAvatar(id){
    state.avatar = id;
    G.changed();
    meSprite();
    sfx('caught');
    toast(`You're playing as <b>${esc(SPECIES_BY_ID[id].name)}</b> — ${esc(SPECIES_BY_ID[id].perkText)}`, 'good');
    if (sheet.is('book')) sheet.render();
  },
  setMode(m){ setMode(m); },
  applySettings(){ setSound(state.settings.sound); setBuzz(state.settings.buzz); },
  wipe(){ wiping = true; Store.wipe(); location.reload(); },
  tapThing(id){ tapThing(id); },
  nearShops: () => shops.map(s => ({ ...s, d: distance(shown, s), bearing: bearingTo(shown, s) })).sort((a, b) => a.d - b.d),
  nearMilbils: () => wild.map(w => ({ ...w, d: distance(shown, w), bearing: bearingTo(shown, w) })).sort((a, b) => a.d - b.d),
};
G.applySettings();

// ------------------------------------------------------------------- HUD ---

let hudAvatar = '';
function hud(){
  if (hudAvatar !== state.avatar){ $('#meAvatar').innerHTML = milbilHTML(state.avatar); hudAvatar = state.avatar; }
  $('#meName').textContent = state.name || 'You';
  $('#lvl').textContent = Store.levelOf(state.xp);
  $('#xpbar').style.width = `${Math.round(Store.levelProgress(state.xp) * 100)}%`;
  $('#coins').textContent = fmtNum(state.coins);
  const g = gardenNeeds(G);
  $('#gardenBadge').textContent = g.ripe ? `✨${g.ripe}` : g.thirsty ? `💧${g.thirsty}` : '';
  $('#dexCount').textContent = `${foundCount(G)}/${Object.keys(SPECIES_BY_ID).length}`;
  const basket = Object.values(state.basket).reduce((a, b) => a + b, 0);
  $('#bagBadge').textContent = basket ? fmtNum(basket) : '';
  gpsPill();
}

function gpsPill(){
  const el = $('#gpsPill');
  let text, cls = '';
  if (state.mode === 'pad'){ text = '🕹️ Joystick mode'; }
  else if (gps.status === 'ok'){
    const a = Math.round(gps.acc || 0);
    text = `📡 GPS ±${a} m`; cls = a <= 25 ? 'ok' : a <= 60 ? 'meh' : 'bad';
  }
  else if (gps.status === 'wait') { text = '📡 Finding you…'; cls = 'meh'; }
  else if (gps.status === 'denied') { text = '📍 Location is off — tap me'; cls = 'bad'; }
  else { text = '📡 No GPS signal — tap me'; cls = 'bad'; }
  if (map.mapOffline) text += ' · 🗺️ map offline';
  if (el._t !== text){ el.textContent = text; el._t = text; }
  el.className = `gps-pill ${cls}`;
}
$('#gpsPill').addEventListener('click', () => {
  if (state.mode === 'pad') return openSettings(G);
  if (gps.status === 'denied' || gps.status === 'error' || gps.status === 'none') gpsTrouble();
});

$('#meBtn').addEventListener('click', () => { sfx('tap'); openBook(G); });
$('#dexBtn').addEventListener('click', () => { sfx('tap'); openBook(G); });
$('#gardenBtn').addEventListener('click', () => { sfx('tap'); openGarden(G); });
$('#bagBtn').addEventListener('click', () => { sfx('tap'); openBag(G); });
$('#nearbyBtn').addEventListener('click', () => { sfx('tap'); openNearby(G); });
$('#settingsBtn').addEventListener('click', () => { sfx('tap'); openSettings(G); });
$('#compass').addEventListener('click', () => { sfx('tap'); spinTo(0); map.zoomOffset = 0; });

function spinTo(target){
  const from = map.bearing;
  let delta = ((target - from + 540) % 360) - 180;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 400);
    map.bearing = (from + delta * (1 - Math.pow(1 - k, 3)) + 360) % 360;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// -------------------------------------------------------- the world map ---

function meSprite(){
  const html = `<div class="me-ring"></div><div class="walker">${milbilHTML(state.avatar)}</div>`;
  const s = map.sprites.get('me');
  if (s) s.el.firstChild.innerHTML = html;
  else map.addSprite('me', shown, html, { cls: 'me' });
}

function shopHTML(s){
  const t = SHOP_TYPES[s.type];
  return `<div class="pin" style="--c:${t.color};--d:${t.dark}"><span class="pin-top">${t.emoji}</span><i class="pin-pole"></i></div>
    <div class="label">${t.name}</div>`;
}
function wildHTML(w){
  const sp = SPECIES_BY_ID[w.species];
  return `<div class="wild" style="--rc:${RARITY[sp.rarity].color}"><div class="hop">${milbilHTML(w.species)}</div></div>`;
}

/** Work out what's around you, and add or drop sprites to match. */
function refreshWorld(){
  const now = Date.now();
  for (const [id, t] of Object.entries(state.gone)) if (t < now) delete state.gone[id];
  shops = shopsNear(shown, SHOW_SHOPS_M);
  wild = milbilsNear(shown, SHOW_MILBILS_M, now).filter(m => !state.gone[m.id]);
  if (state.starters) wild.push(...state.starters.map(s => ({ ...s, kind: 'milbil', starter: true, leave: Infinity })));

  const want = new Set(['me']);
  for (const s of shops){
    want.add(s.id);
    if (!map.sprites.has(s.id)) map.addSprite(s.id, s, shopHTML(s), { cls: `shop t-${s.type}` });
    map.sprites.get(s.id).el.classList.toggle('near', distance(shown, s) <= M.reach);
  }
  for (const w of wild){
    want.add(w.id);
    if (!map.sprites.has(w.id)){
      const sp = map.addSprite(w.id, w, wildHTML(w), { cls: `milbil-sprite r-${SPECIES_BY_ID[w.species].rarity}` });
      sp.el.classList.add('appear');
    }
    const near = distance(shown, w) <= M.reach;
    map.sprites.get(w.id).el.classList.toggle('near', near);
    // Buzz once per milbil. With the whole game a few metres across, GPS wobble
    // carries you in and out of reach constantly, and re-buzzing each time is noise.
    if (near && !spotted.has(w.id) && !inEncounter){
      spotted.add(w.id);
      sfx('spot');
      buzz(60);
    }
  }
  for (const id of spotted) if (!want.has(id)) spotted.delete(id);
  for (const id of [...map.sprites.keys()]) if (!want.has(id)) map.removeSprite(id);
}

function onMapTap(sprite){
  if (!sprite) return;
  if (sprite.id === 'me'){ sfx('tap'); openBook(G); return; }
  tapThing(sprite.id);
}

function tapThing(id){
  const w = wild.find(x => x.id === id);
  if (w){
    const d = distance(shown, w);
    if (d <= M.reach * 1.3) return startEncounter(w);   // a little slack for GPS wobble
    sfx('nope');
    toast(`🚶 That milbil is ${fmtDist(d)} away — walk ${fmtDist(d - M.reach)} closer!`);
    const el = map.sprites.get(id)?.el;
    if (el){ el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); }
    return;
  }
  const s = shops.find(x => x.id === id);
  if (s){ sfx('door'); openShop(G, s); }
}

/** Three friendly milbils wait right next to you on your very first walk. */
function ensureStarters(){
  if (state.starters !== null) return;
  state.starters = STARTERS.map((species, i) => {
    const p = offset(pos, Math.sin((40 + i * 120) * Math.PI / 180) * 0.75, Math.cos((40 + i * 120) * Math.PI / 180) * 0.75);
    return { id: `starter-${species}`, species, lat: p.lat, lng: p.lng };
  });
  dirty = true;
  setTimeout(() => toast('🫧 Three milbils are waiting right next to you! Tap one to catch it.', 'good big'), 1200);
}

// ------------------------------------------------------------- catching ---

async function startEncounter(w){
  if (inEncounter) return;
  inEncounter = true;
  sheet.close();
  clearToasts();
  document.body.classList.add('catching');
  const result = await encounter($('#encounterHost'), { species: w.species, catchBonus: M.catch, sfx, buzz });
  document.body.classList.remove('catching');
  inEncounter = false;
  if (result === 'left') return;
  if (w.starter) state.starters = state.starters.filter(s => s.id !== w.id);
  else state.gone[w.id] = w.leave;
  map.removeSprite(w.id);
  wild = wild.filter(x => x.id !== w.id);
  if (result === 'caught') await caught(w.species);
  else toast(`💨 ${esc(SPECIES_BY_ID[w.species].name)} ran away. There'll be others!`);
  G.changed();
  save();
}

async function caught(id){
  const sp = SPECIES_BY_ID[id], r = RARITY[sp.rarity];
  const isNew = !(state.dex[id] > 0);
  state.dex[id] = (state.dex[id] || 0) + 1;
  state.stats.caught++;
  const coins = Math.round(r.coins * M.coins);
  state.coins += coins;
  const xp = r.xp + (isNew ? XP_NEW_SPECIES : 0);
  G.addXp(xp);
  G.changed();
  const isMe = state.avatar === id;
  const choice = await card(`<div class="big-pic">${milbilHTML(id)}</div>
    ${isNew ? '<div class="new-tag">NEW!</div>' : ''}
    <h2>You caught ${esc(sp.name)}!</h2>
    <p><span class="rar" style="background:${r.color}">${r.name}</span></p>
    <p class="reward">+🪙 ${fmtNum(coins)} &nbsp; +${fmtNum(Math.round(xp * M.xp))} XP</p>
    <p class="perk">Play as ${esc(sp.name)}: <b>${esc(sp.perkText)}</b></p>`,
    isMe ? [{ label: 'Yay!', cls: 'go' }]
         : [{ label: 'Keep exploring', value: 'no' }, { label: `Play as ${esc(sp.name)}`, cls: 'go', value: 'play' }]);
  if (choice === 'play') G.setAvatar(id);
}

// ------------------------------------------------------------ GPS & pad ---

function startGPS(){
  if (!('geolocation' in navigator)){ gps.status = 'none'; gpsTrouble(); return; }
  if (gps.watch != null) return;
  gps.status = gps.fixes ? 'ok' : 'wait';
  gps.watch = navigator.geolocation.watchPosition(onFix, onGpsError,
    { enableHighAccuracy: true, maximumAge: 1000, timeout: 30000 });
}
function stopGPS(){
  if (gps.watch != null) navigator.geolocation.clearWatch(gps.watch);
  gps.watch = null;
}

function onFix(p){
  const fix = { lat: p.coords.latitude, lng: p.coords.longitude };
  const acc = p.coords.accuracy || 999;
  // Once there's been a decent fix, ignore the wild ones that come with being indoors.
  if (gps.good && acc > 150) return;
  if (acc <= 60) gps.good = true;
  gps.acc = acc;
  gps.status = 'ok';
  if (++gps.fixes === 1 || distance(pos, fix) > 2000) shown = { ...fix };
  if (walkFrom){
    const d = distance(walkFrom, fix);
    if (d >= 4 && d < 150){ state.stats.walked += d; walkFrom = fix; }
    else if (d >= 150) walkFrom = fix;
  } else walkFrom = fix;
  pos = fix;
  state.lastPos = fix;
  ensureStarters();
}

function onGpsError(e){
  if (e.code === 1){ gps.status = 'denied'; stopGPS(); gpsTrouble(); }
  else if (e.code === 3){ if (!gps.fixes) gps.status = 'wait'; }
  else gps.status = gps.fixes ? 'ok' : 'error';
  hud();
}

async function gpsTrouble(){
  if (state.mode === 'pad') return;
  const pick = await card(`<h2>📍 Can't find you</h2>
    <p>${gps.status === 'denied'
      ? 'This game isn\'t allowed to use your location. You can turn it on in your browser\'s settings for this page, then try again.'
      : 'Your phone isn\'t giving a location right now. Going outside usually helps.'}</p>
    <p>Or play with a joystick instead — no GPS needed.</p>`,
    [{ label: '🕹️ Use the joystick', value: 'pad' }, { label: '📍 Try again', cls: 'go', value: 'gps' }]);
  if (pick === 'pad') setMode('pad');
  else { stopGPS(); startGPS(); }
}

function setMode(m){
  state.mode = m;
  $('#joystick').hidden = m !== 'pad';
  if (m === 'gps'){ startGPS(); }
  else { stopGPS(); gps.status = 'off'; ensureStarters(); }
  dirty = true;
  hud();
}

// joystick
const joy = { x: 0, y: 0, id: null };
{
  const pad = $('#joystick'), knob = pad.firstElementChild;
  const move = (e) => {
    const r = pad.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1){ x /= l; y /= l; }
    joy.x = x; joy.y = y;
    knob.style.transform = `translate(${x * r.width * 0.32}px, ${y * r.height * 0.32}px)`;
  };
  pad.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; pad.setPointerCapture(e.pointerId); move(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) move(e); });
  const up = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerup', up);
  pad.addEventListener('pointercancel', up);
}
const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')) return;
  keys.add(e.key.toLowerCase());
  if (e.key === 'Escape') sheet.close();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());

// ---------------------------------------------------------------- loops ---

let lastT = performance.now();
let walking = 0;
function frame(t){
  const dt = Math.min(0.1, (t - lastT) / 1000);
  lastT = t;

  if (state.mode === 'pad' && !inEncounter){
    let jx = joy.x + (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
    let jy = joy.y + (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
    const l = Math.hypot(jx, jy);
    if (l > 1){ jx /= l; jy /= l; }
    if (l > 0.05){
      const g = map.screenToGround(jx, jy);
      const step = PAD_SPEED * dt;
      pos = offset(pos, g.east * step, g.north * step);
      state.stats.walked += Math.min(1, l) * step;
      state.lastPos = pos;
    }
  }

  const prev = shown;
  const gap = distance(shown, pos);
  if (gap > 400) shown = { ...pos };
  else {
    // GPS jumps by metres even standing still, which is a third of the screen
    // here, so ease toward each fix slowly.
    const k = 1 - Math.exp(-dt / (state.mode === 'pad' ? 0.06 : 2.5));
    shown = { lat: shown.lat + (pos.lat - shown.lat) * k, lng: shown.lng + (pos.lng - shown.lng) * k };
  }
  // Walk animation and which way you face.
  const moved = distance(prev, shown);
  walking = walking * 0.9 + (dt > 0 ? moved / dt : 0) * 0.1;
  const me = map.sprites.get('me');
  if (me){
    me.el.classList.toggle('walking', walking > 0.35);
    if (moved > 0.02){
      const east = (shown.lng - prev.lng) * 111320 * Math.cos(shown.lat * Math.PI / 180);
      const north = (shown.lat - prev.lat) * 111320;
      const sx = map.groundToScreenX(east, north);
      if (Math.abs(sx) > 0.01) me.el.classList.toggle('left', sx < 0);
    }
  }

  map.setCenter(shown);
  map.setReach(M.reach);
  map.moveSprite('me', shown);
  map.render();
  $('#compass').style.setProperty('--b', `${map.bearing}deg`);
  requestAnimationFrame(frame);
}

let lastGrow = Date.now();
function growTick(){
  const now = Date.now();
  const dt = Math.min(now - lastGrow, 8 * 3600 * 1000);
  lastGrow = now;
  for (const p of state.plots) advance(p, dt, M);
  tickGarden(G);
}

let ticks = 0;
function slowTick(){
  ticks++;
  restockTree(G);
  refreshWorld();
  tickShop(G);
  tickNearby(G);
  hud();
  if (dirty || ticks % 5 === 0){ save(); dirty = false; }
}

// ------------------------------------------------------- staying awake ---

let wake = null;
async function keepAwake(){
  try {
    if ('wakeLock' in navigator && document.visibilityState === 'visible' && !wake){
      wake = await navigator.wakeLock.request('screen');
      wake.addEventListener('release', () => { wake = null; });
    }
  } catch { wake = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible'){ if (started) keepAwake(); }
  else save();
});
addEventListener('pagehide', save);

// ------------------------------------------------------------- welcome ---

function welcome(){
  const w = $('#welcome');
  w.hidden = false;
  $('#welcomeMilbil').innerHTML = milbilHTML('common');
  const name = $('#nameInput');
  name.value = state.name || NAMES[Math.floor(Math.random() * NAMES.length)];
  $('#nameDice').addEventListener('click', () => { sfx('tap'); name.value = NAMES[Math.floor(Math.random() * NAMES.length)]; });
  const go = (mode) => {
    state.name = name.value.replace(/\s+/g, ' ').trim().slice(0, 14) || 'Pib';
    w.classList.add('out');
    setTimeout(() => { w.hidden = true; }, 400);
    begin(mode);
  };
  $('#startGps').addEventListener('click', () => { sfx('buy'); go('gps'); });
  $('#startPad').addEventListener('click', () => { sfx('buy'); go('pad'); });
  $('#howBtn').addEventListener('click', () => { sfx('tap'); howToPlay(); });
}

function begin(mode){
  started = true;
  setMode(mode);
  keepAwake();
  G.changed();
  save();
}

// ------------------------------------------------------------------ go ---

meSprite();
hud();
refreshWorld();
requestAnimationFrame(frame);
setInterval(growTick, 250);
setInterval(slowTick, 1000);

if (state.name && state.mode) begin(state.mode);
else welcome();

// For poking at from the console.
window.MILBIL = {
  G, map,
  get state(){ return state; },
  teleport(lat, lng){ pos = { lat, lng }; shown = { ...pos }; state.lastPos = pos; refreshWorld(); },
  walk(east, north){ pos = offset(pos, east, north); },
  coins(n){ state.coins += n; G.changed(); },
  wipe(){ G.wipe(); },
};
