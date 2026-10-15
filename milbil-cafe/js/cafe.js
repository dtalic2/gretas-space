// ---------- The café floor: milbils come in, you serve them ----------
//
// Up to three milbils wait at a time. Each one has a speech bubble with its
// order. Tap a milbil to serve it everything you have in stock. You get paid
// for each serving as it goes, and once the whole order is served the milbil
// says thanks and leaves.

import { G, on, emit, menu, nextLocked, priceOf, earn, happy, cafeName } from './game.js';
import { SPOTS, SPOT_X, DOOR_X, WALK_MS_PER_100, ARRIVE_GAP_MS, AUTO_SERVE_WAIT_MS, AUTO_SERVE_GAP_MS,
         ORDER_KINDS, ORDER_QTY, CUSTOMERS, PLATES } from './data.js';
import { foodSVG } from './food.js';
import { customerHTML } from './milbil.js';
import { money, shortMoney } from './format.js';
import { sfx } from './audio.js';
import { $, floatText, bump } from './ui.js';

const spots = [];
let nextAutoAt = 0;

// While the question screen is up, servings happen out of sight: no flying
// food or floating money over the question, and only a soft coin sound.
const quiet = () => document.body.classList.contains('quizzing');
let floor, tray, scene;
let onShop = () => {}, onRestock = () => {};

const rand = (lo, hi) => lo + Math.random() * (hi - lo);

function weighted(weights){
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < weights.length; i++){ r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}

export function initCafe(opts){
  onShop = opts.onShop;
  onRestock = opts.onRestock;
  scene = $('#scene');
  floor = $('#floor');
  tray = $('#tray');
  const now = performance.now();
  for (let i = 0; i < SPOTS; i++) spots.push({ cust: null, nextAt: now + 500 + i * 900 });

  // Tapping anywhere in a milbil's column serves it.
  floor.addEventListener('click', (e) => {
    const el = e.target.closest('.cust');
    if (el) serve(Number(el.dataset.spot));
  });
  tray.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.shop) return onShop();
    const id = b.dataset.food;
    if (id && !(G.s.stock[id] > 0)) return onRestock();
    bump(b, 'wiggle');
  });

  on('stock', () => { renderTray(); spots.forEach(sp => sp.cust && renderBubble(sp.cust)); });
  on('menu', () => { renderTray(); spots.forEach(sp => sp.cust && renderBubble(sp.cust)); });
  on('cash', renderTray);
  on('cafe', renderScene);
  renderScene();
  renderTray();
}

export function renderScene(){
  scene.dataset.lv = G.s.cafe;
  $('#signName').textContent = cafeName();
}

// ------------------------------------------------------------------ tray ---

function renderTray(){
  const plates = menu().map(f => {
    const lvl = G.s.foods[f.id], n = G.s.stock[f.id] || 0, p = PLATES[lvl - 1];
    return `<button type="button" class="plate ${n ? '' : 'empty'}" data-food="${f.id}"
        style="--plate:${p.color};--rim:${p.rim}" aria-label="${f.name}: ${n} left">
        ${foodSVG(f.id)}<span class="count">${n}</span></button>`;
  });
  const next = nextLocked();
  if (next){
    const can = G.s.cash >= next.costs[0];
    plates.push(`<button type="button" class="plate locked ${can ? 'can' : ''}" data-shop="1" aria-label="Unlock ${next.name} in the shop">
      ${foodSVG(next.id)}<span class="lock">${can ? '🛒' : '🔒'} ${shortMoney(next.costs[0])}</span></button>`);
  }
  tray.innerHTML = plates.join('');
}

/** Where a food's plate is, for the serving animation. */
const plateEl = (id) => tray.querySelector(`[data-food="${id}"]`);

// ------------------------------------------------------------- customers ---

// Somebody who isn't already in the café.
function pickCustomer(){
  const here = new Set(spots.map(sp => sp.cust?.who.id));
  const i = weighted(CUSTOMERS.map(c => here.has(c.id) ? 0 : c.weight ?? 1));
  return CUSTOMERS[i];
}

function makeOrder(){
  const foods = menu().slice();
  const kinds = Math.min(foods.length, 1 + weighted(ORDER_KINDS));
  const order = [];
  for (let k = 0; k < kinds; k++){
    const f = foods.splice(Math.floor(Math.random() * foods.length), 1)[0];
    const qty = 1 + weighted(ORDER_QTY);
    order.push({ food: f.id, qty, need: qty });
  }
  return order;
}

function walkTime(fromX, toX){ return Math.abs(toX - fromX) / 100 * WALK_MS_PER_100; }

function spawn(i){
  const who = pickCustomer();
  const c = { spot: i, who, order: makeOrder(), state: 'in' };
  const el = document.createElement('div');
  el.className = 'cust walking';
  el.dataset.spot = i;
  el.style.left = `${DOOR_X}%`;
  el.innerHTML = `<div class="bubble"></div><div class="cbody">${customerHTML(who)}</div>`;
  floor.appendChild(el);
  c.el = el;
  spots[i].cust = c;

  const ms = walkTime(DOOR_X, SPOT_X[i]);
  el.style.transitionDuration = `${ms}ms`;
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = `${SPOT_X[i]}%`; }));
  setTimeout(() => {
    if (c.state !== 'in') return;
    c.state = 'wait';
    c.readyAt = performance.now();
    el.classList.remove('walking');
    renderBubble(c);
    bump(el.querySelector('.bubble'), 'pop');
    if (!quiet()) sfx('bell');
    emit('arrived');
  }, ms + 30);
}

function renderBubble(c){
  const b = c.el.querySelector('.bubble');
  if (c.state === 'in'){ b.innerHTML = ''; return; }
  if (c.state === 'out'){ b.innerHTML = '<span class="thanks">❤️ Yum!</span>'; return; }
  b.innerHTML = c.order.map(it => {
    const short = it.need > (G.s.stock[it.food] || 0);
    return `<div class="ord ${it.need ? '' : 'done'} ${it.need && short ? 'short' : ''}">
      ${foodSVG(it.food)}<b>${it.need ? `×${it.need}` : '✓'}</b></div>`;
  }).join('');
}

/** Serve one milbil everything you can (by a tap, or by Auto-serve). */
export function serve(i, auto = false){
  const c = spots[i]?.cust;
  if (!c || c.state !== 'wait') return;
  const mult = happy() ? 2 : 1;
  let pay = 0;
  for (const it of c.order){
    if (!it.need) continue;
    const have = G.s.stock[it.food] || 0;
    const n = Math.min(have, it.need);
    if (!n) continue;
    G.s.stock[it.food] = have - n;
    it.need -= n;
    pay += priceOf(it.food) * n * mult;
    G.s.stats.items += n;
    if (!quiet()) flyFood(it.food, c.el);
  }

  if (!pay){
    if (auto) return;
    bump(c.el, 'nope');
    sfx('nope');
    emit('short');
    return;
  }

  earn(pay);
  if (!quiet()) floatText(c.el.querySelector('.bubble'), `+${money(pay)}`, mult > 1 ? 'happy' : '');
  sfx(auto ? 'coin' : 'serve');
  G.s.hints.served = true;
  emit('stock');

  if (c.order.every(it => !it.need)) leave(c);
  else emit('short');
}

function leave(c){
  c.state = 'out';
  G.s.stats.served++;
  renderBubble(c);
  bump(c.el, 'happy-hop');
  if (!quiet()) setTimeout(() => sfx('thanks'), 120);
  const sp = spots[c.spot];
  const ms = walkTime(SPOT_X[c.spot], DOOR_X);
  setTimeout(() => {
    c.el.classList.add('walking', 'leaving');
    c.el.style.transitionDuration = `${ms}ms`;
    c.el.style.left = `${DOOR_X}%`;
  }, 650);
  setTimeout(() => {
    c.el.remove();
    if (sp.cust === c){
      sp.cust = null;
      sp.nextAt = performance.now() + rand(...ARRIVE_GAP_MS);
    }
  }, 650 + ms + 50);
  emit('served');
}

/** A serving flies from its plate up to the milbil. */
function flyFood(id, toEl){
  const from = plateEl(id), to = toEl.querySelector('.bubble') || toEl;
  if (!from) return;
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
  const size = Math.min(a.width, 56);
  const f = document.createElement('div');
  f.className = 'fly';
  f.innerHTML = foodSVG(id);
  f.style.width = f.style.height = `${size}px`;
  f.style.left = `${a.left + a.width / 2 - size / 2}px`;
  f.style.top = `${a.top + a.height / 2 - size / 2}px`;
  document.body.appendChild(f);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const anim = f.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 50}px) scale(1.15)`, opacity: 1, offset: 0.5 },
    { transform: `translate(${dx}px, ${dy}px) scale(.5)`, opacity: 0.2 },
  ], { duration: 480, easing: 'ease-in-out' });
  anim.onfinish = () => f.remove();
  setTimeout(() => f.remove(), 900);
}

/** Every frame: bring in new milbils when a spot is free, and Auto-serve. */
export function tickCafe(now){
  for (let i = 0; i < spots.length; i++){
    const sp = spots[i];
    if (!sp.cust && now >= sp.nextAt) spawn(i);
  }
  if (G.s.settings.autoServe && now >= nextAutoAt) autoServe(now);
}

// Auto-serve serves one milbil at a time, a moment after it reaches the
// counter. It only hands out food that's been ordered and is on a plate, and
// it serves milbils whose whole order is ready first, so they leave and make
// room for the next one.
function autoServe(now){
  const ready = spots.map(sp => sp.cust).filter(c =>
    c?.state === 'wait' && now - c.readyAt >= AUTO_SERVE_WAIT_MS &&
    c.order.some(it => it.need && (G.s.stock[it.food] || 0) > 0));
  if (!ready.length) return;
  const whole = (c) => c.order.every(it => it.need <= (G.s.stock[it.food] || 0));
  const c = ready.find(whole) || ready[0];
  serve(c.spot, true);
  nextAutoAt = now + AUTO_SERVE_GAP_MS;
}

/** Is anybody waiting for food you don't have? */
export function anyoneStuck(){
  return spots.some(sp => sp.cust?.state === 'wait' &&
    sp.cust.order.some(it => it.need > (G.s.stock[it.food] || 0)));
}

export const waitingCount = () => spots.filter(sp => sp.cust?.state === 'wait').length;

/** Empty the café, for switching between free play and a race. */
export function resetCafe(){
  for (const sp of spots){
    if (sp.cust) sp.cust.state = 'gone';
    sp.cust = null;
  }
  floor.querySelectorAll('.cust').forEach(el => el.remove());
  renderScene();
  renderTray();
}

/** The first milbils come in a moment after the café opens. */
export function openDoors(){
  const now = performance.now();
  spots.forEach((sp, i) => { if (!sp.cust) sp.nextAt = now + 400 + i * 900; });
}
