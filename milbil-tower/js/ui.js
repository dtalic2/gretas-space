// ---------- HUD and panels ----------
//
// Everything outside the canvas: the chips along the top, the workshop, the
// field guide, and the two stop-the-world panels. The canvas never draws UI and
// this module never draws game.

import { UPGRADES, UP_GROUPS, nextCost, maxLevel, towerStats } from './upgrades.js';
import { TYPES, ORDER } from './types.js';
import { milbilStill } from './milbil-art.js';
import { state, save } from './state.js';
import { game, PHASE, remaining } from './game.js';
import * as audio from './audio.js';

const $ = (id) => document.getElementById(id);

const el = {};
let onRetry = null;
let lastCoins = -1;

export function init(handlers) {
  for (const id of [
    'hud', 'coins', 'roundNo', 'leftNo', 'hint', 'bounceChip', 'bounceNo', 'btnShop', 'btnSound', 'btnHelp',
    'shop', 'shopCoins', 'shopList', 'shopClose',
    'help', 'helpClose', 'guide',
    'over', 'overRound', 'overStats', 'overRetry', 'overShop',
    'pause', 'pauseResume',
  ]) el[id] = $(id);

  onRetry = handlers.retry;

  el.btnShop.onclick = () => openShop();
  el.shopClose.onclick = () => closeAll();
  el.btnHelp.onclick = () => openHelp();
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
  for (const o of [el.shop, el.help]) {
    o.addEventListener('pointerdown', (e) => { if (e.target === o) closeAll(); });
  }

  el.btnSound.textContent = state.muted ? '🔇' : '🔊';
  el.hud.classList.remove('hidden');
}

// ---------- per-frame sync ----------

export function sync() {
  if (state.coins !== lastCoins) {
    el.coins.textContent = state.coins.toLocaleString();
    if (state.coins > lastCoins && lastCoins >= 0) {
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
  if (!el.shop.classList.contains('hidden') || !el.help.classList.contains('hidden')) return;
  setPaused(!game.paused);
}

export function anyPanelOpen() {
  return [el.shop, el.help, el.over, el.pause].some((o) => !o.classList.contains('hidden'));
}

export function closeAll() {
  el.shop.classList.add('hidden');
  el.help.classList.add('hidden');
  el.pause.classList.add('hidden');
  // The game-over panel is not dismissible — you have to choose to try again.
  if (game.phase !== PHASE.OVER) game.paused = false;
}

export function openShop() {
  el.over.classList.add('hidden');
  el.help.classList.add('hidden');
  el.pause.classList.add('hidden');
  el.shop.classList.remove('hidden');
  game.paused = true;
  renderShop();
}

export function openHelp() {
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
