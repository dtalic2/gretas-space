// ---------- Controls ----------
//
// One aiming model for both hands and mice: your Milbil aims at wherever you are
// pointing, and how far away you point is how hard it throws. Drag out, watch
// the arc swing, let go. There is no separate "set angle, then set power" step,
// which is the thing that makes the classic artillery control scheme hard to do
// on a touchscreen.
//
// Everything else is a shortcut to that: the FIRE button charges power on a
// timer while you keep the angle you already had, and the keyboard does angle
// with up/down and power with a held Space.

import {
  G, aimToward, nudgeAim, walk, jump, fireWeapon, selectWeapon, panCamera,
  screenToWorld, needsTarget, focusOn,
} from './game.js';
import { WEAPON_ORDER } from './weapons.js';
import { clamp } from './util.js';
import * as ui from './ui.js';
import { unlock, sfx } from './audio.js';

const held = new Set();
const pointers = new Map();
let aiming = null;         // the pointer id currently aiming
let panning = null;
let pinch = null;
let padDir = 0;
let paused = false;

export function isPaused() { return paused; }
export function setPaused(v) { paused = v; }

function myTurn() {
  return G.phase === 'aim' && G.active && G.activeTeam && !G.activeTeam.cpu && !paused;
}

function overlayOpen() {
  return ui.isOpen('menu') || ui.isOpen('help') || ui.isOpen('pause') ||
         ui.isOpen('over') || ui.isOpen('weapons');
}

export function init(canvas) {
  // ---------------- pointer ----------------
  canvas.addEventListener('pointerdown', (e) => {
    unlock();
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0 });

    if (pointers.size === 2) {                 // two fingers: look around
      aiming = null;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: G.cam.user };
      return;
    }
    if (e.button === 2 || e.button === 1) { panning = e.pointerId; return; }
    if (overlayOpen()) return;

    if (myTurn()) {
      aiming = e.pointerId;
      if (!needsTarget() || G.target) {
        aimToward(...worldOf(e), true);
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.moved += Math.hypot(dx, dy);
    p.x = e.clientX;
    p.y = e.clientY;

    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      G.cam.user = clamp(pinch.zoom * (d / pinch.d), 0.55, 2.4);
      panCamera(-dx / G.cam.zoom / 2, -dy / G.cam.zoom / 2);
      return;
    }
    if (panning === e.pointerId) {
      panCamera(-dx / G.cam.zoom, -dy / G.cam.zoom);
      return;
    }
    if (aiming === e.pointerId && myTurn() && (!needsTarget() || G.target)) {
      aimToward(...worldOf(e), true);
    }
  });

  const release = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (panning === e.pointerId) { panning = null; return; }
    if (aiming !== e.pointerId) return;
    aiming = null;
    if (!p || !myTurn()) return;

    // A tap, not a drag: place the target for the weapons that need one.
    if (needsTarget() && !G.target) {
      const [wx, wy] = worldOf(e);
      G.target = { x: wx, y: wy };
      sfx.select();
      return;
    }
    if (p.moved < 8) { G.power = 0; return; }   // stray tap: do not waste the turn
    fireWeapon(G.power);
    G.power = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    if (aiming === e.pointerId) { aiming = null; G.power = 0; }
    if (panning === e.pointerId) panning = null;
    pinch = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    G.cam.user = clamp(G.cam.user * (e.deltaY > 0 ? 0.9 : 1.1), 0.55, 2.4);
  }, { passive: false });

  // ---------------- keyboard ----------------
  addEventListener('keydown', (e) => {
    unlock();
    const k = e.key.toLowerCase();

    if (k === 'escape') {
      if (ui.isOpen('weapons')) ui.hide('weapons');
      else if (ui.isOpen('help')) { ui.hide('help'); paused = false; }
      else if (ui.isOpen('pause')) { ui.hide('pause'); paused = false; }
      else if (G.phase !== 'menu' && G.phase !== 'over') { ui.show('pause'); paused = true; }
      return;
    }
    if (k === 'tab') { e.preventDefault(); ui.toggleWeapons(); return; }
    if (k === 'm') { document.getElementById('btnSound').click(); return; }
    if (k === 'h') {
      if (ui.isOpen('help')) { ui.hide('help'); paused = false; }
      else { ui.show('help'); paused = true; }
      return;
    }
    if (k === 'p') {
      if (ui.isOpen('pause')) { ui.hide('pause'); paused = false; }
      else if (G.phase !== 'menu' && G.phase !== 'over') { ui.show('pause'); paused = true; }
      return;
    }
    if (overlayOpen()) return;
    if (k === 'c') { focusOn(G.active, true); G.cam.manual = 0; return; }

    if (/^[0-9]$/.test(k)) {
      const idx = k === '0' ? 9 : +k - 1;
      const key = WEAPON_ORDER[idx];
      if (key) selectWeapon(key);
      return;
    }

    if (!myTurn()) return;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === ' ' && !held.has(' ')) {
      if (!needsTarget() || G.target) G.charging = true;
    }
    if (k === 'enter') jump(G.active);
    held.add(k);
  });

  addEventListener('keyup', (e) => {
    const k = e.key.toLowerCase();
    held.delete(k);
    if (k === ' ' && G.charging) {
      G.charging = false;
      fireWeapon(G.power);
      G.power = 0;
    }
  });
  addEventListener('blur', () => { held.clear(); padDir = 0; });

  // ---------------- on-screen buttons ----------------
  holdBtn('btnLeft', () => { padDir = -1; }, () => { if (padDir === -1) padDir = 0; });
  holdBtn('btnRight', () => { padDir = 1; }, () => { if (padDir === 1) padDir = 0; });
  document.getElementById('btnJump').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (myTurn()) jump(G.active);
  });
  document.getElementById('currentWeapon').onclick = () => ui.toggleWeapons();

  const fire = document.getElementById('btnFire');
  fire.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    unlock();
    if (myTurn() && (!needsTarget() || G.target)) G.charging = true;
  });
  const fireUp = () => {
    if (!G.charging) return;
    G.charging = false;
    fireWeapon(G.power);
    G.power = 0;
  };
  fire.addEventListener('pointerup', fireUp);
  fire.addEventListener('pointerleave', fireUp);
  fire.addEventListener('pointercancel', fireUp);
}

function holdBtn(id, on, off) {
  const b = document.getElementById(id);
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); on(); });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    b.addEventListener(ev, () => { b.classList.remove('on'); off(); });
  }
}

function worldOf(e) {
  const p = screenToWorld(e.clientX, e.clientY);
  return [p.x, p.y];
}

/** Held keys and buttons, applied once per frame. */
export function update(dt) {
  if (!myTurn()) return;
  const m = G.active;
  let dir = padDir;
  if (held.has('a') || held.has('arrowleft')) dir = -1;
  if (held.has('d') || held.has('arrowright')) dir = 1;
  if (dir) walk(m, dir, dt);

  if (held.has('w') || held.has('arrowup')) nudgeAim(-dt * 1.3);
  if (held.has('s') || held.has('arrowdown')) nudgeAim(dt * 1.3);
}
