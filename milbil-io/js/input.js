// ---------- Steering your milbil ----------
//
// On a phone or tablet you drag: put your finger down anywhere and slide it
// the way you want your milbil to walk, like paper.io. A little ring shows
// where you started, and follows your finger if it goes a long way, so a
// small slide back is always enough to turn round.
//
// With a mouse your milbil walks towards the pointer. Arrow keys and WASD work
// too. Your milbil never stops: let go and it keeps walking the same way.

import { cam, sx, sy } from './draw.js';

const REACH = 46;            // CSS pixels from where you started before the ring follows
const KEYS = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
};

const held = new Set();
let want = null;             // where your finger last pointed
let mouse = null;            // where the mouse is, if it's steering
let touch = null;
let ring, knob;

export function initInput(el, ringEl){
  ring = ringEl;
  knob = ringEl.querySelector('i');
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  addEventListener('keydown', (e) => {
    const k = KEYS[e.code];
    if (!k || e.target.closest?.('input')) return;
    e.preventDefault();
    held.add(k);
    mouse = null;
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) held.delete(k); });
  addEventListener('blur', () => { held.clear(); up({ pointerId: touch?.id }); });
}

/** Forget the last game's steering. */
export function resetInput(){
  want = null;
  mouse = null;
  touch = null;
  showRing();
}

function down(e){
  if (e.pointerType === 'mouse'){ mouse = { x: e.clientX, y: e.clientY }; return; }
  if (touch) return;
  touch = { id: e.pointerId, ax: e.clientX, ay: e.clientY, x: e.clientX, y: e.clientY };
  try { e.target.setPointerCapture(e.pointerId); } catch {}
  showRing();
}

function move(e){
  if (e.pointerType === 'mouse'){ mouse = { x: e.clientX, y: e.clientY }; return; }
  if (!touch || e.pointerId !== touch.id) return;
  touch.x = e.clientX; touch.y = e.clientY;
  const dx = touch.x - touch.ax, dy = touch.y - touch.ay, d = Math.hypot(dx, dy);
  if (d > 8) want = Math.atan2(dy, dx);
  if (d > REACH){ touch.ax = touch.x - dx / d * REACH; touch.ay = touch.y - dy / d * REACH; }
  showRing();
}

function up(e){
  if (touch && e.pointerId === touch.id){ touch = null; showRing(); }
}

function showRing(){
  if (!ring) return;
  ring.hidden = !touch;
  if (!touch) return;
  ring.style.transform = `translate(${touch.ax}px, ${touch.ay}px)`;
  knob.style.transform = `translate(${touch.x - touch.ax}px, ${touch.y - touch.ay}px)`;
}

/** Called every tick for you: set p.want. Your milbil stands still on its
 *  land until you first steer, then sets off the way you pointed. */
export function steerYou(p){
  const kx = held.has('r') - held.has('l'), ky = held.has('d') - held.has('u');
  let a = want;
  if (kx || ky) a = Math.atan2(ky, kx);
  else if (mouse){
    const dx = mouse.x - sx(p.x) / cam.dpr, dy = mouse.y - sy(p.y) / cam.dpr;
    a = dx * dx + dy * dy > 64 ? Math.atan2(dy, dx) : null;
  }
  if (a === null) return;
  p.want = a;
  if (p.still){ p.still = false; p.dir = a; }
}

/** Does this device steer by touch? */
export const touchy = () => matchMedia('(pointer: coarse)').matches;
