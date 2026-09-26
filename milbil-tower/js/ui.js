// ---------- HUD and panels ----------
//
// Everything outside the canvas: the chips along the top, the workshop, the
// field guide, and the two stop-the-world panels. The canvas never draws UI and
// this module never draws game.

import { UPGRADES, UP_GROUPS, nextCost, maxLevel, towerStats } from './upgrades.js';
import { TYPES, ORDER } from './types.js';
import * as sanctuary from './sanctuary.js';
import { FRAMES } from './milbil-art.js';
import { milbilStill } from './milbil-art.js';
import { state, save } from './state.js';
import { game, PHASE, remaining } from './game.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);

const el = {};
let onRetry = null;
let lastCoins = -1;
let sprites = null;          // handed in at boot, for the dancing pen portraits
let penViews = [];           // one small canvas per pen, refreshed when the roster changes
let toastT = 0;

export function init(handlers) {
  for (const id of [
    'hud', 'coins', 'roundNo', 'leftNo', 'hint', 'bounceChip', 'bounceNo', 'btnShop', 'btnSound', 'btnHelp',
    'shop', 'shopCoins', 'shopList', 'shopClose',
    'help', 'helpClose', 'guide',
    'sanct', 'sanctClose', 'sanctRate', 'sanctCount', 'sanctFoot', 'sanctTendAll',
    'pens', 'btnSanct', 'sanctDot', 'toast',
    'over', 'overRound', 'overStats', 'overRetry', 'overShop',
    'pause', 'pauseResume',
  ]) el[id] = $(id);

  onRetry = handlers.retry;
  sprites = handlers.sprites;

  el.btnShop.onclick = () => openShop();
  el.shopClose.onclick = () => closeAll();
  el.btnHelp.onclick = () => openHelp();
  el.btnSanct.onclick = () => openSanctuary();
  el.sanctClose.onclick = () => closeAll();
  el.sanctTendAll.onclick = () => {
    if (sanctuary.tendAll()) audio.chore();
    refreshSanctuary();
  };
  el.helpClose.onclick = () => closeAll();
  el.overRetry.onclick = () => { closeAll(); onRetry(); };
  el.overShop.onclick = () => openShop();
  el.pauseResume.onclick = () => setPaused(false);
  el.btnSound.onclick = () => {
    state.muted = !state.muted;
    el.btnSound.textContent = state.muted ? '🔇' : '🔊';
    save();
    if (!state.muted) audio.coin();
  };

  // Click the backdrop to dismiss, but never the panel itself.
  for (const o of [el.shop, el.help, el.sanct]) {
    o.addEventListener('pointerdown', (e) => { if (e.target === o) closeAll(); });
  }

  el.btnSound.textContent = state.muted ? '🔇' : '🔊';
  el.hud.classList.remove('hidden');
}

// ---------- per-frame sync ----------

export function sync() {
  if (state.coins !== lastCoins) {
    el.coins.textContent = state.coins.toLocaleString();
    // Only a real payout flashes the chip; the sanctuary's steady drip must not.
    if (state.coins - lastCoins >= 10 && lastCoins >= 0) {
      el.coins.parentElement.classList.remove('flash');
      void el.coins.parentElement.offsetWidth;     // restart the animation
      el.coins.parentElement.classList.add('flash');
    }
    lastCoins = state.coins;
    if (!el.shop.classList.contains('hidden')) renderShop();
  }
  el.roundNo.textContent = game.round;
  el.leftNo.textContent = remaining();

  // Bounces left, shown only once there is a Deflector to have any.
  const hasDeflect = towerStats(state.up).deflects > 0;
  el.bounceChip.classList.toggle('hidden', !hasDeflect);
  if (hasDeflect) el.bounceChip.classList.toggle('spent', game.deflects === 0);
  el.bounceNo.textContent = game.deflects;

  if (!sanctuaryOpen()) {
    const needsHand = state.sanctuary.pens.some((p) => sanctuary.mood(p) < 0.55);
    el.sanctDot.classList.toggle('hidden', !game.rescued && !needsHand);
    el.sanctDot.classList.toggle('chore', !game.rescued && needsHand);
  }

  if (game.phase === PHASE.OVER && el.over.classList.contains('hidden')) showOver();
}

/** A short line of coaching that fades out once the player clearly has it. */
export function hint(text) {
  el.hint.textContent = text;
  el.hint.style.opacity = text ? '1' : '0';
}

// ---------- panels ----------

function setPaused(on) {
  game.paused = on;
  el.pause.classList.toggle('hidden', !on);
}
export { setPaused };

export function togglePause() {
  if (game.phase === PHASE.OVER) return;
  if (anyPanelOpen() && el.pause.classList.contains('hidden')) return;
  setPaused(!game.paused);
}

export function anyPanelOpen() {
  return [el.shop, el.help, el.sanct, el.over, el.pause].some((o) => !o.classList.contains('hidden'));
}

export function closeAll() {
  el.shop.classList.add('hidden');
  el.help.classList.add('hidden');
  el.sanct.classList.add('hidden');
  el.pause.classList.add('hidden');
  // The game-over panel is not dismissible — you have to choose to try again.
  if (game.phase !== PHASE.OVER) game.paused = false;
}

export function openShop() {
  el.sanct.classList.add('hidden');
  el.over.classList.add('hidden');
  el.help.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.shop.classList.remove('hidden');
  game.paused = true;
  renderShop();
}

export function openHelp() {
  el.sanct.classList.add('hidden');
  el.shop.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.help.classList.remove('hidden');
  game.paused = true;
  renderGuide();
}

// ---------- workshop ----------

function renderShop() {
  el.shopCoins.textContent = state.coins.toLocaleString();
  el.shopList.replaceChildren();

  for (const group of UP_GROUPS) {
    const head = document.createElement('h3');
    head.className = 'up-group';
    head.textContent = group.name;
    el.shopList.appendChild(head);
    for (const key of group.keys) addUpgradeRow(key);
  }
}

/** One upgrade row: icon, name, current effect, level pips and a buy button. */
function addUpgradeRow(key) {
  const u = UPGRADES[key];
  const lvl = state.up[key];
  const max = maxLevel(key);
  const cost = nextCost(key, lvl);
  const maxed = cost === null;
  const afford = !maxed && state.coins >= cost;

  const row = document.createElement('div');
  row.className = 'up' + (maxed ? ' max' : '');

  const pips = Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
  row.innerHTML =
    `<div class="up-ico">${u.icon}</div>
     <div class="up-txt">
       <div class="up-name">${u.name}</div>
       <div class="up-blurb">${u.blurb}</div>
       <div class="up-meta"><span class="up-now">${u.detail(lvl)}</span><span class="pips">${pips}</span></div>
     </div>`;

  const buy = document.createElement('button');
  buy.className = 'buy' + (maxed ? ' done' : '');
  buy.textContent = maxed ? 'MAX' : `🪙 ${cost.toLocaleString()}`;
  buy.disabled = maxed || !afford;
  buy.onclick = () => purchase(key);
  row.appendChild(buy);

  el.shopList.appendChild(row);
}

function purchase(key) {
  const lvl = state.up[key];
  const cost = nextCost(key, lvl);
  if (cost === null || state.coins < cost) return;

  state.coins -= cost;
  state.up[key] = lvl + 1;

  // Plating hands you the new shield immediately, and patches the ones you lost.
  if (key === 'plating') game.shields = towerStats(state.up).maxShields;

  save();
  audio.buy();
  lastCoins = -1;             // force the HUD to redraw the coin count
  renderShop();
}

// ---------- field guide ----------

function renderGuide() {
  el.guide.replaceChildren();
  for (const key of ORDER) {
    const t = TYPES[key];
    const card = document.createElement('div');
    if (!state.seen[key]) {
      card.className = 'gcard unknown';
      card.innerHTML = `<div class="qm">?</div><div class="gname">Not met yet</div>`;
    } else {
      card.className = 'gcard';
      card.appendChild(milbilStill(key, 156));
      const info = document.createElement('div');
      info.innerHTML =
        `<div class="gname">${t.name}</div>
         <div class="gcoins">🪙 ${t.coins}${t.hp > 1 ? ` · ${t.hp} zaps` : ''}</div>
         <div class="gblurb">${t.blurb}</div>`;
      card.appendChild(info);
    }
    el.guide.appendChild(card);
  }
}

// ---------- tower lost ----------

function showOver() {
  el.shop.classList.add('hidden');
  el.help.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.overRound.textContent = `The Milbils took round ${game.round}`;
  el.overStats.innerHTML =
    `You earned <b style="color:var(--gold)">🪙 ${game.roundCoins.toLocaleString()}</b> this round.<br>` +
    `Best round cleared: <b>${state.best}</b> · Milbils popped: <b>${state.popped.toLocaleString()}</b>`;
  el.over.classList.remove('hidden');
}

export function hideOver() {
  el.over.classList.add('hidden');
}

// ---------- sanctuary ----------

export function openSanctuary() {
  el.shop.classList.add('hidden');
  el.help.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.over.classList.add('hidden');
  el.sanct.classList.remove('hidden');
  el.sanctDot.classList.add('hidden');
  game.paused = true;
  renderSanctuary();
}

export function sanctuaryOpen() {
  return !el.sanct.classList.contains('hidden');
}

/** A short line at the bottom of the screen, for things that are news exactly once. */
export function toast(text, seconds = 6) {
  el.toast.textContent = text;
  el.toast.classList.remove('hidden');
  toastT = seconds;
}

function bar(cls, value) {
  return `<i class="${cls}" style="width:${Math.round(Math.max(0, Math.min(1, value)) * 100)}%"></i>`;
}

/**
 * Build the pen list.
 *
 * Only called when something structural changes — a rescue, a chore, a release.
 * The live parts (drifting need bars, the dancing portraits) are updated in
 * `tickSanctuary` without rebuilding any DOM.
 */
function renderSanctuary() {
  const pens = state.sanctuary.pens;
  const cap = sanctuary.capacity();

  el.sanctCount.textContent = `${pens.length} of ${cap} pen${cap === 1 ? '' : 's'}`;
  el.sanctTendAll.disabled = !pens.length;
  el.pens.replaceChildren();
  penViews = [];

  if (!pens.length) {
    const empty = document.createElement('p');
    empty.className = 'pens-empty';
    empty.innerHTML =
      'Nobody home yet.<br><span>Zap a Milbil on the board and it wakes up here — dazed, but fine.</span>';
    el.pens.appendChild(empty);
  }

  pens.forEach((pen, i) => {
    const t = TYPES[pen.key];
    const card = document.createElement('div');
    card.className = 'pen';

    const art = document.createElement('canvas');
    art.className = 'pen-art';
    art.width = art.height = 132;
    card.appendChild(art);

    const body = document.createElement('div');
    body.className = 'pen-body';
    body.innerHTML =
      `<div class="pen-top">
         <span class="pen-name">${pen.name}</span>
         <span class="pen-mood"></span>
       </div>
       <div class="pen-kind">${t.name}</div>
       <div class="pen-pay">🪙 <b></b> / min</div>
       <div class="pen-need"><span>🍖</span><em class="track">${bar('food', pen.food)}</em></div>
       <div class="pen-need"><span>💧</span><em class="track">${bar('water', pen.water)}</em></div>
       <div class="pen-need poo"><span>💩</span><em class="poo-dots"></em></div>`;
    card.appendChild(body);

    const row = document.createElement('div');
    row.className = 'pen-acts';
    const act = (label, title, fn, test) => {
      const b = document.createElement('button');
      b.className = 'act';
      b.innerHTML = label;
      b.title = title;
      b.onclick = () => { fn(i); audio.chore(); refreshSanctuary(); };
      b.dataset.test = test;
      row.appendChild(b);
      return b;
    };
    act('🍖', `Feed ${pen.name}`, sanctuary.feed, 'food');
    act('💧', `Water ${pen.name}`, sanctuary.water, 'water');
    act('🧹', `Scoop up after ${pen.name}`, sanctuary.scoop, 'poo');

    const free = document.createElement('button');
    free.className = 'act free';
    free.innerHTML = '↩';
    free.title = `Let ${pen.name} go, to free the pen`;
    free.onclick = () => {
      if (free.classList.contains('confirm')) { sanctuary.release(i); renderSanctuary(); return; }
      free.classList.add('confirm');
      free.innerHTML = 'Sure?';
      setTimeout(() => { free.classList.remove('confirm'); free.innerHTML = '↩'; }, 2600);
    };
    row.appendChild(free);
    card.appendChild(row);

    el.pens.appendChild(card);
    penViews.push({ pen, art: art.getContext('2d'), body, row });
  });

  el.sanctFoot.textContent = pens.length >= cap
    ? 'Every pen is full. Let one go, or buy another pen in the workshop.'
    : 'Zap a Milbil and it arrives here. Looked-after Milbils pay rent every minute.';

  refreshSanctuary();
}

/** The parts that move: mood, pay, bars, poo, and which chores are worth doing. */
function refreshSanctuary() {
  for (const v of penViews) {
    const { pen, body, row } = v;
    const m = sanctuary.mood(pen);
    body.querySelector('.pen-mood').textContent = sanctuary.moodFace(m);
    body.querySelector('.pen-pay b').textContent = Math.round(sanctuary.coinsPerMin(pen.key) * m);
    body.querySelector('.food').style.width = `${Math.round(pen.food * 100)}%`;
    body.querySelector('.water').style.width = `${Math.round(pen.water * 100)}%`;
    body.querySelector('.poo-dots').textContent =
      '●'.repeat(pen.poo) + '○'.repeat(sanctuary.POO_MAX - pen.poo);
    body.querySelector('.pen-need.poo').classList.toggle('dirty', pen.poo > 0);

    for (const b of row.querySelectorAll('.act[data-test]')) {
      const need = b.dataset.test === 'poo' ? pen.poo > 0 : pen[b.dataset.test] < 0.999;
      b.classList.toggle('wanted', need);
      b.disabled = !need;
    }
  }
  el.sanctRate.textContent = `🪙 ${Math.round(sanctuary.rate())} / min`;
}

/**
 * Per-frame work while the panel is open: redraw the dancing portraits and let
 * the numbers drift. Cheap — a handful of small blits and some text nodes.
 */
export function tickSanctuary(dt) {
  if (toastT > 0) {
    toastT -= dt;
    if (toastT <= 0) el.toast.classList.add('hidden');
  }
  if (!sanctuaryOpen() || !sprites) return;

  for (const v of penViews) {
    const { pen, art } = v;
    // A miserable Milbil dances slowly; a delighted one is all over the place.
    const m = sanctuary.mood(pen);
    pen.phase = (pen.phase + dt * (0.15 + m * 0.75)) % 1;
    const frames = sprites[pen.key];
    const f = frames[Math.floor(pen.phase * FRAMES) % FRAMES];
    const c = art.canvas;
    art.clearRect(0, 0, c.width, c.height);
    art.globalAlpha = 0.45 + m * 0.55;
    art.drawImage(f, 0, 0, c.width, c.height);
  }
  refreshSanctuary();
}
