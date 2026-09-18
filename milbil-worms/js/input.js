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
  G, aimToward, releaseAim, cancelAim, nudgeAim, walk, jump, fireWeapon, selectWeapon,
  panCamera, screenToWorld, needsTarget, focusOn, setUserZoom, toggleOverview,
} from './game.js';
import { WEAPON_ORDER } from './weapons.js';
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

/** Walking and jumping stay live during the retreat window; aiming does not. */
function canMove() {
  return myTurn() || (G.phase === 'fire' && G.retreat > 0 && G.active &&
                      G.activeTeam && !G.activeTeam.cpu && !paused);
}

function overlayOpen() {
  return ui.isOpen('menu') || ui.isOpen('help') || ui.isOpen('pause') ||
         ui.isOpen('over') || ui.isOpen('weapons');
}

export function init(canvas) {
  // ---------------- pointer ----------------
  canvas.addEventListener('pointerdown', (e) => {
    unlock();
    // Capture keeps a drag alive when the finger wanders over the HUD. It can
    // throw for a pointer the browser no longer considers active, and losing
    // the rest of this handler to that would wedge the controls.
    try { canvas.setPointerCapture?.(e.pointerId); } catch {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: 0 });

    if (pointers.size === 2) {                 // two fingers: look around
      if (aiming !== null) cancelAim();         // ...and not a half-charged shot
      aiming = null;
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: G.cam.user };
      return;
    }
    if (e.button === 2 || e.button === 1) { panning = e.pointerId; return; }
    if (overlayOpen()) return;

    if (myTurn()) {
      aiming = e.pointerId;
      if (!needsTarget() || G.target) aimToward(...worldOf(e), G.cam.zoom);
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
      // Zoom about the point between the fingers, and carry the map along with
      // them. Pinching out far enough hands you the whole board — the floor is
      // the fit-the-world zoom, not an arbitrary number.
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const before = screenToWorld(mid.x, mid.y);
      setUserZoom(pinch.zoom * (d / pinch.d));
      G.cam.zoom = G.cam.base * G.cam.user;      // apply now: the anchor maths needs it exact
      const after = screenToWorld(mid.x, mid.y);
      panCamera(before.x - after.x, before.y - after.y);
      if (pinch.mid) {
        panCamera((pinch.mid.x - mid.x) / G.cam.zoom, (pinch.mid.y - mid.y) / G.cam.zoom);
      }
      pinch.mid = mid;
      return;
    }
    if (panning === e.pointerId) {
      panCamera(-dx / G.cam.zoom, -dy / G.cam.zoom);
      return;
    }
    if (aiming === e.pointerId && myTurn() && (!needsTarget() || G.target)) {
      aimToward(...worldOf(e), G.cam.zoom);
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
    if (p.moved < 14) { cancelAim(); return; }   // stray tap: do not waste the turn
    const power = releaseAim();
    // A drag that never got clear of the dead zone is a fumble, not a shot at
    // ten percent power in whatever direction the barrel happened to be.
    if (power <= 0.1) { cancelAim(); return; }
    fireWeapon(power);
    G.power = 0;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', (e) => {
    pointers.delete(e.pointerId);
    if (aiming === e.pointerId) { aiming = null; cancelAim(); }
    if (panning === e.pointerId) panning = null;
    pinch = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const before = screenToWorld(e.clientX, e.clientY);
    setUserZoom(G.cam.user * (e.deltaY > 0 ? 0.9 : 1.1));
    G.cam.zoom = G.cam.base * G.cam.user;
    const after = screenToWorld(e.clientX, e.clientY);
    panCamera(before.x - after.x, before.y - after.y);
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
    if (k === 'z') { toggleOverview(); return; }

    if (/^[0-9]$/.test(k)) {
      const idx = k === '0' ? 9 : +k - 1;
      const key = WEAPON_ORDER[idx];
      if (key) selectWeapon(key);
      return;
    }

    if (!canMove()) return;
    if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault();
    if (k === 'enter') jump(G.active);
    // While retreating you may walk and jump, but the gun is put away.
    if (myTurn() && k === ' ' && !held.has(' ') && (!needsTarget() || G.target)) {
      G.charging = true;
    }
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
    if (canMove()) jump(G.active);
  });
  document.getElementById('currentWeapon').onclick = () => ui.toggleWeapons();

  document.getElementById('btnZoom').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    toggleOverview();
  });

  // Fine aim. One press is a third of a degree; holding it accelerates, so the
  // same pair of buttons does both "nearly right" and "exactly right".
  repeatBtn('btnAimUp', (step) => nudgeAim(-0.006 * step));
  repeatBtn('btnAimDown', (step) => nudgeAim(0.006 * step));

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

/** Fires once on press, then repeatedly while held, ramping up. */
function repeatBtn(id, fn) {
  const b = document.getElementById(id);
  let timer = null;
  let held = 0;
  const stop = () => { clearInterval(timer); timer = null; b.classList.remove('on'); };
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (!myTurn()) return;
    b.classList.add('on');
    held = 0;
    fn(1);
    timer = setInterval(() => {
      if (!myTurn()) return stop();
      held++;
      fn(Math.min(6, 1 + held * 0.35));
    }, 70);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, stop);
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
  if (!canMove()) return;
  const m = G.active;
  let dir = padDir;
  if (held.has('a') || held.has('arrowleft')) dir = -1;
  if (held.has('d') || held.has('arrowright')) dir = 1;
  if (dir) walk(m, dir, dt);

  if (!myTurn()) return;
  if (held.has('w') || held.has('arrowup')) nudgeAim(-dt * 1.3);
  if (held.has('s') || held.has('arrowdown')) nudgeAim(dt * 1.3);
}
