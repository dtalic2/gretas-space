// ---------- Steering your milbil ----------
//
// On a phone or tablet you drag: put your finger down anywhere and slide it
// the way you want your milbil to walk, like paper.io. Keep your finger down
// and keep steering: your milbil turns whichever way you slide it, for as long
// as you hold on. Where it heads is measured from a point that trails just
// behind your finger, so it turns as soon as your finger changes direction,
// and a small slide back is always enough to turn round. A ring shows it.
//
// Fingers come through Touch Events, with the page's own scrolling, zooming
// and long-press switched off while one is down. Phones (iPhones and iPads
// above all) cancel a Pointer Events touch as soon as they think you might be
// scrolling, which stopped the steering after your first little drag. Milbil
// Cooking found the same thing.
//
// With a mouse your milbil walks towards the pointer, and a pen drags like a
// finger. Arrow keys and WASD work too. Your milbil never stops: let go and it
// keeps walking the same way.

import { cam, sx, sy } from './draw.js';

const REACH = 24;            // CSS pixels the steering point trails behind your finger
const DEAD = 6;              // CSS pixels you have to slide before it counts
const RING = 46;             // CSS pixels, the ring's radius on screen
const KEYS = {
  ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r',
  ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd',
};

const held = new Set();
let want = null;             // where your finger last pointed
let mouse = null;            // where the mouse is, if it's steering
let touch = null;            // the finger (or pen) that's steering: { id, ax, ay, x, y }
let ring, knob;

export function initInput(el, ringEl){
  ring = ringEl;
  knob = ringEl.querySelector('i');

  const mine = (e) => touch && [...e.changedTouches].find(t => t.identifier === touch.id);
  el.addEventListener('touchstart', (e) => {
    e.preventDefault();                // no scrolling, no zoom, no long-press menu
    if (touch) return;                 // one finger steers; a second one is ignored
    const t = e.changedTouches[0];
    press(t.identifier, t.clientX, t.clientY);
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    const t = mine(e);
    if (!t) return;
    e.preventDefault();
    slide(t.clientX, t.clientY);
  }, { passive: false });
  const lift = (e) => { if (mine(e)) release(); };
  addEventListener('touchend', lift);
  addEventListener('touchcancel', lift);

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;                 // fingers are handled above
    if (e.pointerType === 'mouse'){ aim(e); return; }
    if (touch) return;
    press('pen' + e.pointerId, e.clientX, e.clientY);
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') aim(e);
    else if (touch?.id === 'pen' + e.pointerId) slide(e.clientX, e.clientY);
  });
  const penUp = (e) => { if (touch?.id === 'pen' + e.pointerId) release(); };
  el.addEventListener('pointerup', penUp);
  el.addEventListener('pointercancel', penUp);

  addEventListener('keydown', (e) => {
    const k = KEYS[e.code];
    if (!k || e.target.closest?.('input')) return;
    e.preventDefault();
    held.add(k);
    mouse = null;
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) held.delete(k); });
  addEventListener('blur', () => { held.clear(); release(); });
}

/** Forget the last game's steering. */
export function resetInput(){
  want = null;
  mouse = null;
  touch = null;
  showRing();
}

const aim = (e) => { mouse = { x: e.clientX, y: e.clientY }; };

function press(id, x, y){
  touch = { id, ax: x, ay: y, x, y };
  mouse = null;                        // a finger takes over from the mouse
  showRing();
}

function slide(x, y){
  touch.x = x; touch.y = y;
  const dx = x - touch.ax, dy = y - touch.ay, d = Math.hypot(dx, dy);
  if (d > DEAD) want = Math.atan2(dy, dx);
  if (d > REACH){ touch.ax = x - dx / d * REACH; touch.ay = y - dy / d * REACH; }
  showRing();
}

function release(){
  touch = null;
  showRing();
}

// The ring sits where the steering point is, and the knob leans the way
// you're steering (drawn bigger than the real distances, so it's easy to see).
function showRing(){
  if (!ring) return;
  ring.hidden = !touch;
  if (!touch) return;
  const k = RING / REACH;
  let kx = (touch.x - touch.ax) * k, ky = (touch.y - touch.ay) * k;
  const d = Math.hypot(kx, ky);
  if (d > RING){ kx *= RING / d; ky *= RING / d; }
  ring.style.transform = `translate(${touch.ax}px, ${touch.ay}px)`;
  knob.style.transform = `translate(${kx}px, ${ky}px)`;
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
