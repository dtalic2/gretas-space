// ---------- Boot, input, loop ----------

import { layout } from './board.js';
import { buildSprites, spritePx } from './milbil-art.js';
import { game, PHASE, startRound, update, fire, beamDirs } from './game.js';
import { state, load, save } from './state.js';
import * as sanctuary from './sanctuary.js';
import * as render from './render.js';
import * as ui from './ui.js';
import * as audio from './audio.js';

const cv = document.getElementById('scene');
const ctx = cv.getContext('2d');

let L = null;
let dpr = 1;
let sprites = null;
let spriteCell = 0;          // board square the current sprites were baked for
let aimTouched = false;
const touchOnly = matchMedia('(hover: none)').matches;

// ---------- canvas ----------

function resize() {
  const W = Math.max(240, window.innerWidth);
  const H = Math.max(360, window.innerHeight);
  dpr = Math.min(2, window.devicePixelRatio || 1);

  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  cv.style.width = `${W}px`;
  cv.style.height = `${H}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  L = layout(W, H);
  game.L = L;
  render.invalidate();

  if (!aimTouched) game.aim = { x: L.W / 2, y: L.by + L.cell };
}

// Re-bake sprites only once a resize has settled, and only if the board really
// changed size — otherwise a slow drag of a desktop window re-renders 48 sprites
// on every frame of the drag.
let rebakeTimer = 0;
function scheduleRebake() {
  clearTimeout(rebakeTimer);
  rebakeTimer = setTimeout(async () => {
    if (!spriteCell || Math.abs(L.cell - spriteCell) / spriteCell < 0.25) return;
    if (spritePx('milbil', L.cell, dpr) === spritePx('milbil', spriteCell, dpr)) return;
    sprites = await buildSprites(L.cell, dpr);
    spriteCell = L.cell;
  }, 420);
}

// ---------- input ----------

function pointAt(e) {
  const r = cv.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function setAim(p) {
  game.aim = p;
  aimTouched = true;
}

function shoot() {
  if (ui.anyPanelOpen()) return;
  if (fire()) bumpHint();
}

let dragging = false;

cv.addEventListener('pointerdown', (e) => {
  audio.unlock();
  if (ui.anyPanelOpen()) return;
  dragging = true;
  try { cv.setPointerCapture(e.pointerId); } catch { /* not all pointers capture */ }
  setAim(pointAt(e));
  // A mouse fires the instant you click. A finger is covering the board, so it
  // aims while it is down and fires when it lifts — you get to see the line first.
  if (e.pointerType === 'mouse') shoot();
  e.preventDefault();
});

cv.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse' || dragging) setAim(pointAt(e));
});

cv.addEventListener('pointerup', (e) => {
  if (dragging && e.pointerType !== 'mouse') shoot();
  dragging = false;
});

cv.addEventListener('pointercancel', () => { dragging = false; });
cv.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === ' ' || k === 'enter') { e.preventDefault(); audio.unlock(); shoot(); }
  else if (k === 'b') { audio.unlock(); ui.anyPanelOpen() ? ui.closeAll() : ui.openShop(); }
  else if (k === 's') { audio.unlock(); ui.anyPanelOpen() ? ui.closeAll() : ui.openSanctuary(); }
  else if (k === 'h') { ui.anyPanelOpen() ? ui.closeAll() : ui.openHelp(); }
  else if (k === 'p') ui.togglePause();
  else if (k === 'escape') ui.closeAll();
});

addEventListener('resize', () => { resize(); scheduleRebake(); });
addEventListener('orientationchange', () => setTimeout(() => { resize(); scheduleRebake(); }, 250));
addEventListener('blur', () => { if (game.phase === PHASE.PLAY) ui.setPaused(true); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.phase === PHASE.PLAY) ui.setPaused(true);
});

// ---------- hints ----------
// Three lines, each retired as soon as the player has clearly got it.

let shotsFired = 0;
function bumpHint() { shotsFired++; }

function hintText() {
  if (game.paused || ui.anyPanelOpen()) return '';
  if (game.phase === PHASE.OVER) return '';
  if (shotsFired < 3) {
    return touchOnly ? 'Hold and drag to aim · lift your finger to fire'
                     : 'Move to aim · click or press Space to fire';
  }
  if (state.best < 1) return 'Pop every Milbil to clear the round';
  if (state.coins >= 90 && !Object.values(state.up).some(Boolean)) {
    return 'Spend those coins on the tower — tap 🛠️';
  }
  return '';
}

// ---------- loop ----------

let last = 0;
let sanctuarySave = 12;      // seconds between routine saves of sanctuary drift
function frame(t) {
  const dt = Math.min(0.05, (t - last) / 1000 || 0);
  last = t;

  update(dt);

  // The sanctuary runs on wall-clock time, so it ticks even while the game is
  // paused behind a panel — that is the whole point of an idle pen.
  sanctuary.tick();
  sanctuarySave -= dt;
  if (sanctuarySave <= 0) { save(); sanctuarySave = 12; }

  render.draw(ctx, L, sprites, dpr);
  ui.sync();
  ui.tickSanctuary(dt);
  ui.hint(hintText());

  requestAnimationFrame(frame);
}

// ---------- boot ----------

async function boot() {
  load();
  resize();

  const bar = document.getElementById('bootBar');
  const msg = document.getElementById('bootMsg');

  sprites = await buildSprites(L.cell, dpr, (p) => {
    bar.style.width = `${Math.round(p * 100)}%`;
    if (p > 0.5) msg.textContent = 'Teaching the Milbils to dance…';
  });
  spriteCell = L.cell;

  ui.init({
    sprites,
    retry: () => {
      ui.hideOver();
      startRound(game.round);
    },
  });

  // Catch the sanctuary up on however long the tab was closed, and say what it
  // earned — otherwise the coins appear from nowhere.
  const away = sanctuary.awaySeconds();
  const earned = sanctuary.tick();
  if (earned > 0 && away > 120) {
    const mins = Math.round(away / 60);
    const when = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
    ui.toast(`🏡 The sanctuary earned 🪙 ${earned.toLocaleString()} while you were away (${when}). Go and check on them.`);
  }

  startRound(1);

  const splash = document.getElementById('boot');
  splash.classList.add('gone');
  setTimeout(() => splash.remove(), 600);

  requestAnimationFrame((t) => { last = t; frame(t); });
}

// Handy when tuning from the browser console: milbilTower.game, .state
window.milbilTower = { game, state, startRound, fire, beamDirs };

boot();
