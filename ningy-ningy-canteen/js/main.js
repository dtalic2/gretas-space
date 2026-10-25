// ---------- Ningy Ningy Canteen ----------
//
// Your canteen is a truck. In the morning you're parked at Billy's
// Supermarket: buy food, set your prices, then drive off around Milbil Town.
// Wherever you park, the milbils having lunch there notice and a queue
// collects at your hatch. Each one reads your menu board, decides, and either
// orders or walks off. Tap what they ordered to hand it over, and they pay.
// Lunch is over at 2:00.
//
// The orders themselves are worked out in orders.js; money and the save are
// in state.js.

import {
  PRODUCTS, PRODUCT, SPOT, PLACES, MILBILS, MILBIL, UPGRADES, UPGRADE,
  STEP, PRICE_MAX, DAY_START, DAY_LEN, CLOCK_RATE, DRIVE_RATE, ROAD_SPEED, TURBO,
  PATIENCE, UMBRELLA, ARRIVE_SPREAD, JINGLE, NAMES, NAME_MAX, COLORS, HATS, TRUCKS,
  unitCost, fairPrice, faceFor,
} from './data.js';
import {
  S, load, save, wipe, has, you, money, isOpen, openProducts, totalStock, ratio,
  today, newDay, dealOn, shopPrice, buyPack, returnPack, closeDay, nextDay,
} from './state.js';
import { decide, orderLine, leaveWords } from './orders.js';
import { drawLook } from './milbil.js';
import { foodSVG } from './food.js';
import { truckSVG, stockSign } from './truck.js';
import { mapSVG, placeTruck, route, along } from './town.js';
import { $, esc, toast, floatText, Sheet, card, cardOpen, sfx, setSound } from './ui.js';

load();
setSound(S.sound);
const sheet = new Sheet($('#sheet'));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const short = (c) => money(c, { short: true });

/** A milbil's picture: Greta's drawing if there is one, otherwise drawn here. */
const picOf = (m, cls = '') => m.art
  ? `<img class="milbil art ${cls}" src="${m.art}" alt="${esc(m.name)}" draggable="false">`
  : drawLook(m.look, { cls, title: m.name });

/** "11:45am", "1:05pm" */
function clockText(min){
  const t = DAY_START + Math.min(DAY_LEN, Math.max(0, Math.floor(min)));
  const h = Math.floor(t / 60), mm = t % 60;
  return `${h > 12 ? h - 12 : h}:${String(mm).padStart(2, '0')}${h >= 12 ? 'pm' : 'am'}`;
}

// Everything about right now that isn't saved: the queue, who's walking over,
// the truck on the road.
const RT = {
  mode: 'parked',     // 'parked' or 'driving'
  drive: null,        // { r, to, mins, gone }
  coming: [],         // [{ id, at }] milbils walking over, by game minute
  queue: [],          // [{ id, plan, patience, max }]
  serving: null,      // { id, plan, got:{} } — the one at the hatch
  paid: null,         // the last payment, shown for a moment
  nextServe: 0,       // real time the next milbil may step up
  drifters: new Set(),// milbils who walked up, read the board and left
  mapOpen: false,
  mapPick: null,
  ending: false,
  warned: false,
  saveAt: 0,
};
const walkers = new Map();

// ================================================================= welcome ===

function showWelcome(){
  const w = $('#welcome');
  w.hidden = false;
  const draw = () => {
    $('#welcomeTruck').innerHTML = truckSVG(S.truck, you(), { stock: totalStock() });
  };
  const row = (sel, items, attr, render) => { $(sel).innerHTML = items.map(render).join(''); };
  row('#swatches', COLORS, 'c', c => `<button type="button" class="swatch" data-c="${c}" style="background:${c}" aria-label="Your colour"></button>`);
  row('#hats', HATS, 'h', h => `<button type="button" class="hat-btn" data-h="${h.id}">${h.name}</button>`);
  row('#truckSwatches', TRUCKS, 't', c => `<button type="button" class="swatch" data-t="${c}" style="background:${c}" aria-label="Truck colour"></button>`);
  const marks = () => {
    for (const b of w.querySelectorAll('[data-c]')) b.classList.toggle('on', b.dataset.c === S.color);
    for (const b of w.querySelectorAll('[data-h]')) b.classList.toggle('on', b.dataset.h === S.hat);
    for (const b of w.querySelectorAll('[data-t]')) b.classList.toggle('on', b.dataset.t === S.truck);
  };
  w.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c],[data-h],[data-t]');
    if (!b) return;
    if (b.dataset.c) S.color = b.dataset.c;
    if (b.dataset.h != null) S.hat = b.dataset.h;
    if (b.dataset.t) S.truck = b.dataset.t;
    sfx('tap'); marks(); draw();
  });
  const input = $('#nameInput');
  input.value = S.name || pick(NAMES);
  $('#nameDice').addEventListener('click', () => { input.value = pick(NAMES); sfx('tap'); });
  $('#startBtn').addEventListener('click', () => {
    const name = input.value.trim().slice(0, NAME_MAX);
    if (!name){ input.focus(); return toast('Pop a name in first 🙂'); }
    S.name = name;
    S.started = true;
    save();
    sfx('horn');
    w.hidden = true;
    begin();
  });
  marks();
  draw();
}

// ==================================================================== HUD ===

function renderHud(){
  const t = today();
  $('#meAvatar').innerHTML = drawLook(you(), { title: S.name });
  $('#meName').textContent = S.name || 'You';
  $('#meDay').textContent = `Day ${S.day}`;
  $('#money').textContent = money(S.money);
  renderClock();
  // Not on the very first morning: that money is for food.
  const up = S.day > 1 ? UPGRADES.filter(u => !has(u.id) && u.cost <= S.money).length : 0;
  $('#truckBadge').textContent = up || '';
  $('#shopBadge').textContent = Object.keys(t.deals).length && t.phase !== 'closed' ? '🏷️' : '';
}

function renderClock(){
  const t = today();
  const el = $('#clock');
  el.textContent = t.phase === 'morning' ? clockText(0) : clockText(t.clock);
  const pill = $('#clockPill');
  pill.classList.toggle('paused', t.phase === 'open' && !running() && !RT.ending);
  pill.classList.toggle('late', t.phase === 'open' && t.clock >= DAY_LEN - 20);
  const pct = t.phase === 'open' ? Math.min(100, (t.clock / DAY_LEN) * 100) : 0;
  $('#clockFill').style.width = `${pct}%`;
}

function bump(sel){
  const el = $(sel);
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

// ================================================================== scene ===

const PROP_SPOTS = [
  { right: 8, bottom: 50, size: 56 },
  { right: 92, bottom: 62, size: 30 },
  { right: 150, bottom: 58, size: 26 },
  { right: 46, bottom: 120, size: 26 },
];

function renderScene(){
  const t = today();
  const s = SPOT[t.at];
  const sc = $('#scene');
  sc.style.setProperty('--sky1', s.sky[0]);
  sc.style.setProperty('--sky2', s.sky[1]);
  sc.style.setProperty('--ground', s.ground);
  $('#sceneBg').innerHTML = `
    <span class="cloud c1">☁️</span><span class="cloud c2">☁️</span>
    ${s.props.map((e, i) => {
      const p = PROP_SPOTS[i % PROP_SPOTS.length];
      return `<span class="prop" style="right:${p.right}px;bottom:${p.bottom}px;font-size:${p.size}px">${e}</span>`;
    }).join('')}
    <div class="ground"></div>`;
  renderTruck();
  $('#sceneTag').innerHTML = `${s.icon} ${esc(s.name)}`;
  sc.classList.toggle('driving', RT.mode === 'driving');
}

function renderTruck(){
  $('#truckWrap').innerHTML = truckSVG(S.truck, you(), { lights: has('lights'), umbrella: has('umbrella'), stock: totalStock() });
}

/** Keep the sign on the truck showing how much food is left. */
function renderSign(){
  const g = $('#truckWrap .stock-sign');
  if (!g) return;
  const n = totalStock();
  if (g._n === n) return;
  const changed = g._n != null;
  g._n = n;
  g.innerHTML = stockSign(n);
  if (changed){ g.classList.remove('tick'); void g.getBoundingClientRect(); g.classList.add('tick'); }
}

// Where milbils stand. The first one is at the hatch; everyone else lines
// up behind them, squeezing together when the queue gets long.
function geometry(){
  const W = $('#scene').clientWidth || 340;
  const truck = $('#truckWrap').getBoundingClientRect().width || 200;
  const MW = 54;
  const front = 4 + truck * (145 / 220) - MW / 2;
  return { W, MW, front };
}

function slotX(i, n){
  const { W, MW, front } = geometry();
  if (i === 0) return front;
  const start = front + MW + 4;
  const room = W - MW - 4 - start;
  const gap = n > 2 ? Math.min(MW - 6, room / (n - 2)) : MW - 6;
  return start + (i - 1) * Math.max(14, gap);
}

function walkerEl(id){
  let el = walkers.get(id);
  if (el) return el;
  const m = MILBIL[id];
  el = document.createElement('div');
  el.className = 'walker';
  el.dataset.id = id;
  el.innerHTML = `<div class="bubble" hidden></div><div class="pat" hidden><i></i></div>${picOf(m)}`;
  $('#walkers').appendChild(el);
  walkers.set(id, el);
  el._x = geometry().W + 20;
  el.style.transform = `translateX(${el._x}px)`;
  return el;
}

function moveTo(el, x, { speed = 150 } = {}){
  const dist = Math.abs(x - (el._x ?? x));
  el._x = x;
  if (dist < 1) return;
  el.style.transitionDuration = `${Math.max(0.25, dist / speed).toFixed(2)}s`;
  el.classList.add('walking');
  clearTimeout(el._stop);
  el._stop = setTimeout(() => el.classList.remove('walking'), Math.max(250, dist / speed * 1000));
  requestAnimationFrame(() => { el.style.transform = `translateX(${x}px)`; });
}

function say(el, text, ms = 0){
  const b = el.querySelector('.bubble');
  clearTimeout(b._hide);
  b.innerHTML = text;
  b.hidden = !text;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  if (ms) b._hide = setTimeout(() => { b.hidden = true; }, ms);
}

function walkOff(id, bubble = ''){
  const el = walkers.get(id);
  if (!el) return;
  walkers.delete(id);
  el.classList.add('leaving');
  el.querySelector('.pat').hidden = true;
  if (bubble) say(el, bubble);
  const { W } = geometry();
  setTimeout(() => moveTo(el, W + 70, { speed: 120 }), bubble ? 500 : 0);
  setTimeout(() => el.remove(), 3200);
}

function layoutQueue(){
  const n = RT.queue.length;
  RT.queue.forEach((q, i) => {
    const el = walkerEl(q.id);
    el.style.zIndex = String(50 - i);
    el.classList.toggle('front', i === 0);
    moveTo(el, slotX(i, n));
  });
}

function clearScene(bubble){
  for (const q of RT.queue) walkOff(q.id, bubble);
  for (const id of RT.drifters) walkOff(id);
  for (const [id, el] of walkers){ el.remove(); walkers.delete(id); }
  RT.drifters.clear();
}

// ================================================================= status ===

function hungryAt(spotId){
  const t = today();
  return MILBILS.filter(m => t.who[m.id].spot === spotId && !t.who[m.id].done).length;
}

function renderStatus(){
  const t = today();
  const s = SPOT[t.at];
  let html;
  if (t.phase === 'morning'){
    const deals = Object.keys(t.deals);
    html = `<b>☀️ Good morning!</b> You're parked at Billy's Supermarket with <b>${money(S.money)}</b>.
      Buy some food 🛒, check your prices 📋, then drive 🗺️ somewhere hungry. Lunch starts when you drive off.
      ${deals.length ? `<span class="deal-line">🏷️ ${deals.map(dealText).join(' · ')}</span>` : ''}`;
  } else if (t.phase === 'closed'){
    html = `<b>🌙 Lunch is over.</b>`;
  } else if (RT.mode === 'driving'){
    html = `<b>🚚 Driving to ${esc(SPOT[RT.drive.to].name)}…</b>`;
  } else if (s.shop){
    html = `<b>🛒 Back at Billy's.</b> Stock up, then drive somewhere hungry.`;
  } else {
    const coming = RT.coming.length;
    const inQ = RT.queue.length;
    const likes = Object.keys(s.likes || {}).filter(isOpen).map(id => PRODUCT[id]);
    if (!coming && !inQ && !hungryAt(s.id)){
      const left = MILBILS.filter(m => !t.who[m.id].done).length;
      html = `<b>Everyone here has had lunch.</b> ${left ? `${left} milbils around town still haven't — drive 🗺️ somewhere else!` : 'Every milbil in town has had lunch!'}`;
    } else {
      html = `<b>${inQ ? `👥 ${inQ} in the queue` : 'Waiting for milbils…'}</b>${coming ? ` · 🚶 ${coming} more on the way` : ''}
        ${likes.length ? `<span class="muted"> · milbils here like ${likes.map(p => p.plural).join(', ')}</span>` : ''}`;
    }
  }
  $('#status').innerHTML = html;
}

const dealText = (id) => `Save <b>${short(dealOn(id))}</b> on each ${esc(PRODUCT[id].pack)}`;

// ============================================================ the order ===

function renderOrder(){
  const box = $('#orderCard');
  const sv = RT.serving;
  if (RT.paid){
    const p = RT.paid;
    box.innerHTML = `<div class="paid">
      <span class="paid-pic">${picOf(MILBIL[p.id])}</span>
      <div><b>${esc(MILBIL[p.id].name)} paid ${money(p.total)}</b>
        <small>${p.given > p.total ? `💵 Handed you ${money(p.given)} · change ${money(p.given - p.total)}` : '🪙 Paid with the exact money'}</small></div>
      <span class="paid-plus">+${money(p.total)}</span></div>`;
    return;
  }
  if (!sv){
    const t = today();
    const idle = t.phase === 'morning' ? 'Nobody to serve at the supermarket. Drive somewhere first!'
      : RT.mode === 'driving' ? 'On the road…'
      : SPOT[t.at].shop ? 'Nobody buys lunch at the supermarket.'
      : RT.queue.length ? 'Next, please!' : 'Nobody at the hatch yet.';
    box.innerHTML = `<p class="idle">🪟 ${idle}</p>`;
    return;
  }
  const m = MILBIL[sv.id];
  const w = today().who[sv.id];
  const chips = sv.plan.lines.flatMap(l => Array.from({ length: l.qty }, (_, i) => {
    const done = (sv.got[l.id] || 0) > i;
    return `<span class="want ${done ? 'got' : ''}" title="${esc(PRODUCT[l.id].name)}">${foodSVG(l.id)}<i>${done ? '✓' : ''}</i></span>`;
  })).join('');
  box.innerHTML = `
    <div class="order-who">
      <span class="order-pic">${picOf(m)}</span>
      <div class="order-txt">
        <b>${esc(m.name)}</b>
        <small>💰 Has ${money(w.cash)}${w.save ? ` · 🐷 keeping ${money(w.save)} for tomorrow${w.waffle ? ' (saving up for a waffle!)' : ''}` : ''}</small>
      </div>
      <span class="order-total">Total<b>${money(sv.plan.total)}</b></span>
    </div>
    <p class="say">“${esc(orderLine(sv.plan, sv.id))}”</p>
    <div class="order-row"><div class="wants">${chips}</div><span class="muted">Tap the food below to hand it over 👇</span></div>`;
}

// ============================================================ the counter ===

function renderCounter(){
  const sv = RT.serving;
  const need = (id) => sv ? (sv.plan.lines.find(l => l.id === id)?.qty || 0) - (sv.got[id] || 0) : 0;
  const items = openProducts().map(p => {
    const n = S.stock[p.id] || 0;
    const f = faceFor(ratio(p));
    return `<button type="button" class="sell ${need(p.id) > 0 ? 'need' : ''} ${n ? '' : 'empty'}" data-id="${p.id}">
      ${foodSVG(p.id)}
      <b>${esc(p.name)}</b>
      <span class="sell-price">${money(S.prices[p.id])} <i title="${f.text}">${f.face}</i></span>
      <em class="count ${n ? '' : 'zero'}">${n ? `×${n}` : 'none'}</em>
    </button>`;
  }).join('');
  const total = totalStock();
  renderSign();
  $('#counterCard').innerHTML = `
    <div class="counter-head"><h2>🥡 In the truck</h2><span class="muted">${total ? `${total} things to sell` : 'Empty! Buy food at Billy\'s 🛒'}</span></div>
    <div class="counter">${items}</div>`;
}

$('#counterCard').addEventListener('click', (e) => {
  const b = e.target.closest('.sell');
  if (!b) return;
  handOver(b.dataset.id, b);
});

// ============================================================ the bar ===

function renderBar(){
  const t = today();
  const drive = $('#driveBtn');
  drive.disabled = RT.mode === 'driving' || t.phase === 'closed';
  drive.innerHTML = t.phase === 'morning' ? '🚚 Drive off!' : RT.mode === 'driving' ? '🚚 Driving…' : '🗺️ Drive';
  $('#shopBtn').classList.toggle('here', !!SPOT[t.at].shop && RT.mode === 'parked');
}

function renderAll(){
  renderHud();
  renderScene();
  renderStatus();
  renderOrder();
  renderCounter();
  renderBar();
  layoutQueue();
}

// ============================================================ the loop ===

function running(){
  const t = S.today;
  if (!t || t.phase !== 'open' || RT.ending || document.hidden) return false;
  if (RT.mode === 'driving') return true;
  return !sheet.open && !cardOpen() && !RT.mapOpen && $('#report').hidden;
}

let last = performance.now();
let uiTimer = 0;
function frame(now){
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (running()) tick(dt, now);
  uiTimer += dt;
  if (uiTimer > 0.25){ uiTimer = 0; renderClock(); updatePatience(); }
  requestAnimationFrame(frame);
}

function tick(dt, now){
  const t = today();
  if (RT.mode === 'driving'){
    const d = RT.drive;
    const step = dt * DRIVE_RATE;
    d.gone += step;
    t.clock += step;
    const pos = along(d.r, Math.min(1, d.gone / d.mins) * d.r.len);
    const svg = $('#mapBox svg');
    if (svg) placeTruck(svg, pos.x, pos.y, pos.dx);
    $('#mapClock').textContent = `🕐 ${clockText(t.clock)}`;
    if (d.gone >= d.mins) arrive();
  } else {
    t.clock += dt * CLOCK_RATE;
    while (RT.coming.length && RT.coming[0].at <= t.clock) walkUp(RT.coming.shift().id);
    for (const q of [...RT.queue]){
      if (RT.serving?.id === q.id) continue;
      q.patience -= dt * CLOCK_RATE;
      if (q.patience <= 0) leaveQueue(q, 'slow');
    }
    if (!RT.serving && RT.queue.length && now >= RT.nextServe) stepUp();
  }
  if (!RT.warned && t.clock >= DAY_LEN - 15){
    RT.warned = true;
    toast('⏰ 15 minutes until lunch is over!');
    sfx('bell');
  }
  if (t.clock >= DAY_LEN){ t.clock = DAY_LEN; endDay(); return; }
  if (now > RT.saveAt){ RT.saveAt = now + 4000; save(); }
}

function updatePatience(){
  for (const q of RT.queue){
    const el = walkers.get(q.id);
    if (!el) continue;
    const bar = el.querySelector('.pat');
    const f = q.patience / q.max;
    const show = RT.serving?.id !== q.id && f < 0.6;
    bar.hidden = !show;
    if (show){
      const i = bar.querySelector('i');
      i.style.width = `${Math.max(0, f * 100)}%`;
      i.style.background = f < 0.25 ? 'var(--red)' : 'var(--gold)';
    }
  }
}

// ============================================================ milbils ===

/** Everyone having lunch here today wanders over, a few at a time. */
function callCrowd(){
  const t = today();
  const s = SPOT[t.at];
  RT.coming = [];
  if (s.shop) return;
  const spread = ARRIVE_SPREAD * (has('jingle') ? JINGLE : 1);
  for (const m of MILBILS){
    const w = t.who[m.id];
    if (w.spot !== s.id || w.done) continue;
    RT.coming.push({ id: m.id, at: t.clock + 1 + Math.random() * spread });
  }
  RT.coming.sort((a, b) => a.at - b.at);
}

/** A milbil walks up and reads the menu board. */
function walkUp(id){
  const plan = decide(id);
  if (plan.leave){
    // Walks up, has a look, walks off.
    const el = walkerEl(id);
    RT.drifters.add(id);
    const { W, MW } = geometry();
    const x = Math.min(W - MW - 6, slotX(RT.queue.length, RT.queue.length + 1));
    el.style.zIndex = '5';
    moveTo(el, x);
    setTimeout(() => {
      RT.drifters.delete(id);
      walkOff(id, leaveWords(plan.leave, id).bubble);
      sfx('huff');
    }, 1300);
    gone(id, plan.leave);
    renderStatus();
    return;
  }
  const max = PATIENCE * (has('umbrella') ? UMBRELLA : 1);
  RT.queue.push({ id, plan, patience: max, max });
  sfx('hello');
  layoutQueue();
  renderStatus();
}

/** Mark someone as gone for the day, and say why. */
function gone(id, reason){
  const t = today();
  t.who[id].done = reason;
  t.left[reason] = (t.left[reason] || 0) + 1;
  S.totals.left++;
  toast(leaveWords(reason, id).toast);
  save();
}

function leaveQueue(q, reason){
  RT.queue = RT.queue.filter(x => x !== q);
  if (RT.serving?.id === q.id) putBack();
  walkOff(q.id, leaveWords(reason, q.id).bubble);
  sfx('huff');
  gone(q.id, reason);
  layoutQueue();
  renderOrder();
  renderCounter();
  renderStatus();
}

/** The next milbil steps up to the hatch and orders. */
function stepUp(){
  const q = RT.queue[0];
  // Things may have sold out, or prices changed, while they waited.
  const plan = decide(q.id);
  if (plan.leave){ leaveQueue(q, plan.leave); return; }
  q.plan = plan;
  RT.serving = { id: q.id, plan, got: {} };
  RT.paid = null;
  const el = walkerEl(q.id);
  say(el, plan.lines.map(l => `${l.qty > 1 ? `<b>${l.qty}×</b>` : ''}${foodSVG(l.id, 'mini')}`).join(''));
  sfx('pick');
  renderOrder();
  renderCounter();
  renderStatus();
}


/** Tapping food on the counter hands it over. */
function handOver(id, btn){
  const t = today();
  const p = PRODUCT[id];
  if (t.phase !== 'open' || RT.mode !== 'parked' || SPOT[t.at].shop){
    sfx('nope');
    return toast(t.phase === 'morning' ? 'Drive somewhere first — there\'s nobody here to sell to! 🗺️' : 'There\'s nobody here to sell to.');
  }
  const sv = RT.serving;
  if (!sv){ sfx('nope'); return toast(RT.queue.length ? 'Just a moment — they\'re coming to the hatch.' : 'Nobody\'s at the hatch yet.'); }
  if (!(S.stock[id] > 0)){ sfx('nope'); return toast(`You've run out of ${p.plural}.`); }
  const line = sv.plan.lines.find(l => l.id === id);
  if (!line || (sv.got[id] || 0) >= line.qty){
    sfx('nope');
    btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
    const el = walkers.get(sv.id);
    if (el) say(el, line ? 'I only wanted one!' : 'I didn\'t order that!', 1400);
    return;
  }
  S.stock[id]--;
  sv.got[id] = (sv.got[id] || 0) + 1;
  sfx('hand');
  floatText(btn, '✓');
  if (sv.plan.lines.every(l => (sv.got[l.id] || 0) >= l.qty)) pay();
  else { renderOrder(); renderCounter(); }
  save();
}

/** Give back anything on the counter for an order that never finished. */
function putBack(){
  const sv = RT.serving;
  if (!sv) return;
  for (const [id, n] of Object.entries(sv.got)) S.stock[id] = (S.stock[id] || 0) + n;
  RT.serving = null;
  save();
}

/** They've got everything: they pay, and walk off happy. */
function pay(){
  const t = today();
  const sv = RT.serving;
  const w = t.who[sv.id];
  const total = sv.plan.total;
  // Exact money, or the smallest note that covers it.
  const notes = [500, 1000, 2000].filter(n => n >= total && n <= w.cash);
  const given = (total % 100 === 0 && Math.random() < 0.5) || !notes.length || Math.random() < 0.25 ? total : notes[0];

  S.money += total;
  t.sales += total;
  t.served++;
  S.served++;
  S.totals.sales += total;
  S.totals.served++;
  w.spent = total;
  w.done = 'served';
  for (const l of sv.plan.lines){
    t.sold[l.id] = (t.sold[l.id] || 0) + l.qty;
    w.got[l.id] = l.qty;
  }
  const words = { bargain: '🤩 Bargain!', happy: pick(['😋 Yum!', '😋 Thanks!', '😋 Yummy!']), pricey: '😕 Bit pricey…' }[sv.plan.mood];
  RT.queue.shift();
  walkOff(sv.id, `${words}${sv.plan.lines.map(l => foodSVG(l.id, 'mini')).join('')}`);
  RT.serving = null;
  RT.paid = { id: sv.id, total, given };
  RT.nextServe = performance.now() + 1300;
  setTimeout(() => { if (RT.paid?.id === sv.id){ RT.paid = null; renderOrder(); } }, 1600);
  sfx('till');
  floatText($('#moneyPill'), `+${money(total)}`);
  bump('#moneyPill');
  save();
  layoutQueue();
  renderHud();
  renderOrder();
  renderCounter();
  renderStatus();
  checkUnlocks();
}

/** Serving milbils unlocks new things at Billy's. */
function checkUnlocks(){
  for (const p of PRODUCTS){
    if (!p.unlock || S.served < p.unlock || S.unlocked.includes(p.id)) continue;
    S.unlocked.push(p.id);
    save();
    sfx('cheer');
    card(`<div class="unlock-pic">${foodSVG(p.id)}</div>
      <h2>🎉 Unlocked: ${esc(p.plural)}!</h2>
      <p>You've served ${S.served} milbils, so Billy's Supermarket will sell you <b>${esc(p.plural)}</b> now — <b>${short(p.price)} each</b>.</p>
      <p class="muted">${esc(p.blurb)} Buy some next time you're at Billy's, and check the price on your menu board.</p>`,
      [{ label: 'Yum!', cls: 'go' }]).then(() => { renderCounter(); renderHud(); });
  }
}

// ============================================================ driving ===

function openMap(){
  const t = today();
  if (t.phase === 'closed') return;
  RT.mapOpen = true;
  RT.mapPick = RT.mode === 'driving' ? RT.drive.to : null;
  $('#map').hidden = false;
  renderMap();
  sfx('tap');
}

function closeMap(){
  RT.mapOpen = false;
  $('#map').hidden = true;
}

function renderMap(){
  const t = today();
  const counts = {};
  for (const s of PLACES) counts[s.id] = hungryAt(s.id);
  const from = RT.mode === 'driving' ? RT.drive.from : t.at;
  $('#mapBox').innerHTML = mapSVG({ counts, at: from, color: S.truck, selected: RT.mapPick });
  if (RT.mode === 'driving'){
    const d = RT.drive;
    const pos = along(d.r, Math.min(1, d.gone / d.mins) * d.r.len);
    placeTruck($('#mapBox svg'), pos.x, pos.y, pos.dx);
  }
  $('#mapClock').textContent = t.phase === 'morning' ? 'Lunch starts when you drive off' : `🕐 ${clockText(t.clock)}`;
  renderMapInfo();
}

function driveMins(from, to){
  return route(from, to).len / (ROAD_SPEED * (has('turbo') ? TURBO : 1));
}

function renderMapInfo(){
  const t = today();
  const info = $('#mapInfo');
  if (RT.mode === 'driving'){
    info.innerHTML = `<p class="map-hint">🚚 Driving to <b>${esc(SPOT[RT.drive.to].name)}</b>…</p>`;
    return;
  }
  const id = RT.mapPick;
  if (!id){
    const hungry = MILBILS.filter(m => !t.who[m.id].done).length;
    info.innerHTML = `<p class="map-hint">Tap a place to drive there. The red numbers are milbils there who haven't had lunch yet${hungry ? ` (${hungry} in all)` : ''}.</p>`;
    return;
  }
  const s = SPOT[id];
  const mins = Math.round(driveMins(t.at, id));
  const here = id === t.at;
  const there = MILBILS.filter(m => t.who[m.id].spot === id);
  const hungry = there.filter(m => !t.who[m.id].done);
  const likes = Object.keys(s.likes || {}).map(pid => PRODUCT[pid]).filter(p => isOpen(p.id));
  info.innerHTML = `
    <div class="map-pick">
      <div class="map-pick-head"><span class="map-icon">${s.icon}</span>
        <div><b>${esc(s.name)}</b><small>${s.shop ? 'Buy more food here.' : `${hungry.length} hungry milbil${hungry.length === 1 ? '' : 's'} here today`}${likes.length ? ` · they like ${likes.map(p => p.plural).join(', ')}` : ''}</small></div></div>
      ${!s.shop && there.length ? `<div class="map-faces">${there.map(m => `<span class="${t.who[m.id].done ? 'done' : ''}" title="${esc(m.name)}">${picOf(m)}</span>`).join('')}</div>` : ''}
      <button type="button" class="btn go block" id="goBtn" ${here ? 'disabled' : ''}>${here ? 'You\'re parked here' : `🚚 Drive there · ${mins} min`}</button>
    </div>`;
  $('#goBtn')?.addEventListener('click', () => startDrive(id));
}

$('#mapBox').addEventListener('click', (e) => {
  if (RT.mode === 'driving') return;
  const g = e.target.closest('[data-spot]');
  if (!g) return;
  RT.mapPick = g.dataset.spot;
  sfx('tap');
  renderMap();
});
$('#mapClose').addEventListener('click', closeMap);

async function startDrive(to){
  const t = today();
  if (t.phase === 'closed' || RT.mode === 'driving' || to === t.at) return;
  if (t.phase === 'morning' && totalStock() === 0){
    const go = await card(`<h2>🥡 Your truck is empty!</h2><p>There's nothing to sell yet. Buy some food at Billy's Supermarket first?</p>`,
      [{ label: '🛒 Go shopping', cls: 'go', value: 'shop' }, { label: 'Drive anyway', value: 'go' }]);
    if (go === 'shop'){ closeMap(); openShop(); return; }
  }
  if (t.phase === 'morning'){ t.phase = 'open'; t.clock = 0; }
  // Anyone still waiting is disappointed, but they'll come over again if you come back.
  putBack();
  clearScene('😢 Aww!');
  RT.queue = [];
  RT.coming = [];
  RT.paid = null;
  const from = t.at;
  const r = route(from, to);
  RT.drive = { r, from, to, mins: driveMins(from, to), gone: 0 };
  RT.mode = 'driving';
  t.at = to;
  save();
  sfx('engine');
  renderMap();
  renderAll();
}

function arrive(){
  const t = today();
  RT.mode = 'parked';
  RT.drive = null;
  setTimeout(() => { if (RT.mode === 'parked') closeMap(); }, 350);
  renderAll();
  const s = SPOT[t.at];
  if (s.shop){
    sfx('horn');
    setTimeout(openShop, 400);
    return;
  }
  sfx(has('jingle') ? 'jingle' : 'horn');
  callCrowd();
  renderStatus();
  const n = RT.coming.length;
  toast(n ? `🚚 Parked at ${esc(s.name)}. ${n} milbil${n === 1 ? '' : 's'} heading over!` : `🚚 Parked at ${esc(s.name)}. Nobody hungry here right now.`);
}

// ============================================================ end of day ===

function endDay(){
  if (RT.ending) return;
  RT.ending = true;
  const t = today();
  if (RT.mode === 'driving'){ RT.mode = 'parked'; RT.drive = null; closeMap(); }
  putBack();
  clearScene('👋 See you tomorrow!');
  RT.queue = [];
  RT.coming = [];
  RT.paid = null;
  sheet.close();
  sfx('bell');
  const sum = closeDay();
  renderAll();
  setTimeout(() => showReport(sum), 900);
}

function showReport(sum){
  const r = $('#report');
  const profit = sum.sales - sum.spent;
  const left = sum.left;
  const leftN = Object.values(left).reduce((a, b) => a + b, 0);
  const sold = Object.entries(sum.sold).filter(([, n]) => n).map(([id, n]) =>
    `<li>${foodSVG(id)}<span>${n} × ${esc(n === 1 ? PRODUCT[id].name : PRODUCT[id].plural)}</span></li>`).join('');
  const stock = PRODUCTS.filter(p => S.stock[p.id]).map(p => `${S.stock[p.id]} ${esc(S.stock[p.id] === 1 ? p.name : p.plural)}`);
  const reasons = [
    ['pricey', '😤', 'thought your prices were too high'],
    ['broke', '😢', 'didn\'t have enough money'],
    ['soldout', '🥡', 'wanted something you\'d sold out of'],
    ['slow', '⏳', 'got tired of waiting'],
  ].filter(([k]) => left[k]).map(([k, e, txt]) => `<li>${e} ${left[k]} ${txt}</li>`).join('');
  r.innerHTML = `<div class="inner">
    <h2>🌙 That's lunch!</h2>
    <p class="center muted">Day ${sum.day} at Ningy Ningy Canteen</p>
    <div class="card big-num">
      <div><b>${sum.served}</b><small>milbils served 😋</small></div>
      <div><b class="${profit >= 0 ? 'pos' : 'neg'}">${profit >= 0 ? '+' : ''}${money(profit)}</b><small>profit today</small></div>
    </div>
    <div class="card till">
      <div><span>💰 Milbils paid you</span><b>${money(sum.sales)}</b></div>
      <div><span>🛒 You spent at Billy's</span><b>−${money(sum.spent)}</b></div>
      <div class="tot"><span>${profit >= 0 ? '📈 Profit' : '📉 Loss'}</span><b class="${profit >= 0 ? 'pos' : 'neg'}">${money(profit)}</b></div>
      <div><span>🏦 Money you have now</span><b>${money(S.money)}</b></div>
    </div>
    ${sold ? `<div class="card"><h3>What you sold</h3><ul class="sold">${sold}</ul></div>` : ''}
    ${leftN ? `<div class="card"><h3>Milbils who walked off: ${leftN}</h3><ul class="reasons">${reasons}</ul>
      ${left.pricey ? '<p class="muted small">Milbils expect to pay about double what Billy\'s normally charges. Try lowering a price or two on your menu board 📋.</p>' : ''}</div>` : ''}
    <div class="card"><h3>🌙 Overnight</h3>
      <p class="small">Every milbil gets more lunch money for tomorrow — ${money(sum.earned)} between them. Anything they saved today, they still have.</p>
      ${sum.bonus.length ? `<ul class="bonus">${sum.bonus.map(b => `<li><span class="bonus-pic">${picOf(MILBIL[b.id])}</span><span><b>${esc(MILBIL[b.id].name)}</b> ${esc(b.job)} and earned an extra <b>${money(b.amt)}</b>!</span></li>`).join('')}</ul>` : ''}
    </div>
    ${stock.length ? `<p class="center muted small">Still in your truck for tomorrow: ${stock.join(', ')}.</p>` : ''}
    <button type="button" class="btn go big block" id="nextDayBtn">🌅 Start day ${sum.day + 1}</button>
  </div>`;
  r.hidden = false;
  r.scrollTop = 0;
  sfx('star');
  $('#nextDayBtn').addEventListener('click', () => {
    nextDay();
    RT.ending = false;
    RT.warned = false;
    RT.mode = 'parked';
    r.hidden = true;
    renderAll();
    sfx('horn');
    morningCard();
  });
}

function morningCard(){
  const t = today();
  const deals = Object.keys(t.deals);
  const savers = MILBILS.filter(m => t.who[m.id].save > 0);
  const bits = [];
  if (t.gift) bits.push(`<p>👵 You'd run out of money and food, so Granny Ningy gave you <b>${money(t.gift)}</b> to get going again.</p>`);
  bits.push(deals.length
    ? `<div class="deal-box"><b>🏷️ Deals at Billy's today</b>${deals.map(id => `<span>${foodSVG(id)} ${dealText(id)}</span>`).join('')}</div>`
    : `<p>No deals at Billy's today. Everything's the normal price.</p>`);
  if (savers.length) bits.push(`<p class="small">🐷 ${savers.length} milbil${savers.length === 1 ? ' is' : 's are'} keeping some money for tomorrow: ${savers.map(m => m.name).join(', ')}.</p>`);
  card(`<h2>☀️ Day ${S.day}</h2>${bits.join('')}`, [{ label: 'Let\'s go!', cls: 'go' }]);
}

// ============================================================ sheets ===

function openShop(){
  const render = () => {
    const t = today();
    const here = SPOT[t.at].shop && RT.mode === 'parked';
    const rows = PRODUCTS.map(p => {
      if (!isOpen(p.id)) return `<div class="shop-row locked">
        <div class="pack-pic">${foodSVG(p.id)}</div>
        <div class="shop-info"><b>🔒 ${esc(p.plural)}</b><small>${short(p.price)} each, once you've served ${p.unlock} milbils (${S.served}/${p.unlock}).</small>
          <div class="meter"><i style="width:${Math.min(100, S.served / p.unlock * 100)}%"></i></div></div></div>`;
      // The big price is for one, so it's easy to see the truck charges double.
      // Packs say what the whole pack costs underneath.
      const deal = dealOn(p.id);
      const price = shopPrice(p);
      const canBack = (t.bought[p.id] || []).length && (S.stock[p.id] || 0) >= p.size;
      const n = S.stock[p.id] || 0;
      return `<div class="shop-row ${deal ? 'deal' : ''}">
        <div class="pack-pic">${foodSVG(p.id)}${p.size > 1 ? `<i>×${p.size}</i>` : ''}</div>
        <div class="shop-info">
          <b>${esc(p.name)}${p.unit ? ` <small>(${esc(p.unit)})</small>` : ''}</b>
          <small>${p.size > 1 ? `${esc(p.inPack)}: <b>${money(price)}</b> for the ${esc(p.per)}` : esc(p.blurb)}</small>
          ${deal ? `<span class="save">🏷️ Save ${short(deal)} on each ${esc(p.name)}!</span>` : ''}
          <small class="have">In your truck: <b>${n}</b></small>
        </div>
        <div class="shop-buy">
          <span class="shop-price">${deal ? `<s>${short(p.price / p.size)}</s>` : ''}<b>${short(price / p.size)}</b><small>${p.unit ? 'a serve' : 'each'}</small></span>
          <span class="buy-btns">
            <button type="button" class="btn small" data-act="back" data-id="${p.id}" ${here && canBack ? '' : 'disabled'} aria-label="Put back">−</button>
            <button type="button" class="btn go small" data-act="buy" data-id="${p.id}" ${here && S.money >= price ? '' : 'disabled'}>${p.size > 1 ? `Buy ${p.size}` : 'Buy'}</button>
          </span>
        </div>
      </div>`;
    }).join('');
    const deals = Object.keys(t.deals);
    return `${!here ? `<div class="note-box">🚚 You're not parked at Billy's. Drive here 🗺️ to buy more food.</div>` : ''}
      ${deals.length ? `<div class="deal-box"><b>🏷️ Today's deals</b>${deals.map(id => `<span>${dealText(id)}</span>`).join('')}</div>` : '<p class="muted small">No deals today.</p>'}
      ${rows}`;
  };
  sheet.show({
    key: 'shop', icon: '🛒', title: 'Billy\'s Supermarket',
    sub: 'Prices are for one of each. Your truck charges about double.',
    banner: () => `<div class="sheet-money">💰 You have <b>${money(S.money)}</b>${today().spent ? ` · spent ${money(today().spent)} today` : ''}</div>`,
    render,
    onAct: (act, id, btn) => {
      if (act === 'buy'){
        if (buyPack(id)){ sfx('buy'); floatText(btn, `−${money(shopPrice(PRODUCT[id]))}`); }
        else { sfx('nope'); toast('Not enough money for that.'); }
      } else if (act === 'back'){
        if (returnPack(id)) sfx('back');
      }
      sheet.render();
      renderHud(); renderCounter();
    },
    onClose: () => { renderAll(); },
  });
}

function openPrices(){
  const render = () => {
    const rows = openProducts().map(p => {
      const price = S.prices[p.id];
      const cost = unitCost(p);
      const f = faceFor(ratio(p));
      const make = price - cost;
      return `<div class="price-row">
        ${foodSVG(p.id)}
        <div class="price-info">
          <b>${esc(p.name)}${p.unit ? ` <small>(${esc(p.unit)})</small>` : ''}</b>
          <small>At Billy's: <b>${short(cost)}</b>${p.unit ? ' a serve' : ' each'} · fair price <b>${money(fairPrice(p))}</b> (double)</small>
          <small class="${make >= 0 ? 'pos' : 'neg'}">${make > 0 ? `You make ${short(make)} on each` : make === 0 ? 'You make nothing on these' : `You lose ${short(-make)} on each!`}</small>
        </div>
        <div class="price-side">
          <div class="stepper">
            <button type="button" data-act="down" data-id="${p.id}" ${price <= STEP ? 'disabled' : ''} aria-label="Cheaper">−</button>
            <b>${money(price)}</b>
            <button type="button" data-act="up" data-id="${p.id}" ${price >= PRICE_MAX ? 'disabled' : ''} aria-label="Dearer">+</button>
          </div>
          <span class="face" title="What milbils think">${f.face} ${f.text}</span>
        </div>
      </div>`;
    }).join('');
    const locked = PRODUCTS.filter(p => !isOpen(p.id)).map(p =>
      `<p class="muted small">🔒 ${esc(p.plural)} — serve ${p.unlock} milbils to unlock (${S.served}/${p.unlock})</p>`).join('');
    return `<div class="note-box">Milbils think a fair price is about <b>double</b> what Billy's normally charges for one.
      Go higher and some milbils buy less, or walk off. Go lower and some buy two!</div>${rows}${locked}`;
  };
  sheet.show({
    key: 'prices', icon: '📋', title: 'Your menu board',
    sub: 'Tap − and + to change your prices. They go up and down 50c at a time.',
    render,
    onAct: (act, id) => {
      const v = S.prices[id] + (act === 'up' ? STEP : -STEP);
      S.prices[id] = Math.max(STEP, Math.min(PRICE_MAX, v));
      sfx('tap');
      save();
      sheet.render();
    },
    onClose: () => { renderCounter(); },
  });
}

function openTruck(){
  const render = () => {
    const paints = TRUCKS.map(c => `<button type="button" class="swatch ${c === S.truck ? 'on' : ''}" data-act="paint" data-id="${c}" style="background:${c}" aria-label="Paint"></button>`).join('');
    const rows = UPGRADES.map(u => {
      const own = has(u.id);
      return `<div class="row ${own ? 'own' : ''}">
        <span class="ic">${u.icon}</span>
        <div><b>${esc(u.name)}</b><small>${esc(u.text)}</small></div>
        ${own ? '<span class="tick">✓</span>' : `<button type="button" class="btn gold small" data-act="buy" data-id="${u.id}" ${S.money >= u.cost ? '' : 'disabled'}>${money(u.cost)}</button>`}
      </div>`;
    }).join('');
    return `<div class="truck-preview">${truckSVG(S.truck, you(), { lights: has('lights'), umbrella: has('umbrella'), stock: totalStock() })}</div>
      <h3>Paint it</h3><div class="swatches">${paints}</div>
      <h3>Make it better</h3>${rows}`;
  };
  sheet.show({
    key: 'truck', icon: '🚚', title: 'Your truck',
    sub: 'Spend some of your profit on the canteen.',
    banner: () => `<div class="sheet-money">💰 You have <b>${money(S.money)}</b></div>`,
    render,
    onAct: (act, id) => {
      if (act === 'paint'){ S.truck = id; sfx('tap'); }
      if (act === 'buy'){
        const u = UPGRADE[id];
        if (has(id) || S.money < u.cost) return;
        S.money -= u.cost;
        S.upgrades.push(id);
        sfx('cheer');
        toast(`${u.icon} ${esc(u.name)}!`);
      }
      save();
      sheet.render();
      renderHud();
      renderTruck();
    },
  });
}

function openBook(){
  const render = (tab) => {
    const t = today();
    const s = SPOT[tab];
    const list = MILBILS.filter(m => m.spot === tab);
    return `<p class="muted small">${esc(s.icon)} These milbils usually have lunch at ${esc(s.name)}. One day in four they go somewhere else.</p>` +
      list.map(m => {
        const w = t.who[m.id];
        const status = w.done === 'served' ? '✅ Had lunch with you today'
          : w.done ? `${leaveWords(w.done, m.id).bubble} today`
          : w.spot !== m.spot ? `📍 At ${esc(SPOT[w.spot].name)} today`
          : '🍽️ Hasn\'t had lunch yet';
        return `<div class="row mb-row">
          <span class="ic">${picOf(m)}</span>
          <div><b>${esc(m.name)}</b>
            <small>${esc(m.blurb)}</small>
            <small class="likes">💖 ${m.likes.map(id => `<span>${foodSVG(id, 'mini')}${esc(PRODUCT[id].plural)}</span>`).join('')}</small>
            <small>💰 ${money(w.cash)} today${w.save ? ` · 🐷 keeping ${money(w.save)}` : ''} · ${status}</small>
          </div>
        </div>`;
      }).join('');
  };
  sheet.show({
    key: 'book', icon: '📖', title: 'Milbils of Milbil Town',
    sub: 'Who has lunch where, what they love, and how much money they have today.',
    tabs: PLACES.map(s => ({ id: s.id, label: `${s.icon} ${s.short}` })),
    render,
  });
}

function openHelp(){
  sheet.show({
    key: 'help', icon: '❓', title: 'How to run a canteen',
    render: () => `
      <div class="help">
        <h3>🛒 1. Buy food at Billy's</h3>
        <p>Every morning you start at Billy's Supermarket. Billy's shows the price of one of each thing. Some things only come in packs: a packet of ice blocks has 4 in it (50c each, so $2 for the packet), a 6-pack of spring rolls makes 2 serves of 3, and a juice pack has 4 juices.
        Some days Billy's has <b>deals</b> on a few things — the deal tells you how much you save on each one.</p>
        <h3>📋 2. Set your prices</h3>
        <p>Milbils think a fair price is about <b>double</b> what Billy's normally charges for one. A Beef Bowl costs you $1.50, so milbils expect to pay about $3. An Ice Block costs you 50c, so they expect $1.
        Charge more and you make more on each one, but some milbils will buy less, and some will walk off. Charge less and some will buy two!</p>
        <h3>🗺️ 3. Drive around Milbil Town</h3>
        <p>Lunch runs from 11:00 to 2:00. Drive to a place and the milbils having lunch there will see the truck and queue up. When everyone there has had lunch, drive somewhere else.
        The red number on the map is how many milbils there haven't eaten yet. Driving takes time!</p>
        <h3>🥡 4. Take their order</h3>
        <p>The milbil at the hatch tells you what they want. Tap that food on the counter to hand it over. When they've got everything, they pay.</p>
        <h3>💰 Milbils and money</h3>
        <p>Every milbil has a different amount of lunch money — about $4.50 on most days. Some keep a bit back for tomorrow 🐷, and they all get more money overnight.
        Someone with $3 can't buy a $3.50 bowl, however much they'd like to.</p>
        <h3>🔓 New things to sell</h3>
        <p>Serve 10 milbils and Billy's starts selling you Pop Cakes (50c each). Serve 30 and you can get Portable Waffles ($2 each).</p>
      </div>`,
  });
}

function openSettings(){
  sheet.show({
    key: 'settings', icon: '⚙️', title: 'Settings',
    render: () => `
      <div class="row"><span class="ic">🔊</span><div><b>Sound</b></div>
        <button type="button" class="btn small ${S.sound ? 'go' : ''}" data-act="sound">${S.sound ? 'On' : 'Off'}</button></div>
      <div class="row"><span class="ic">📊</span><div><b>So far</b>
        <small>${S.totals.days} days · ${S.totals.served} milbils served · ${money(S.totals.sales)} taken · ${money(S.totals.spent)} spent at Billy's</small></div><span></span></div>
      <div class="row"><span class="ic">🧹</span><div><b>Start over</b><small>Back to day 1 with $20. Your name and colours stay.</small></div>
        <button type="button" class="btn red small" data-act="wipe">Start over</button></div>`,
    onAct: async (act) => {
      if (act === 'sound'){ S.sound = !S.sound; setSound(S.sound); save(); sheet.render(); sfx('tap'); }
      if (act === 'wipe'){
        sheet.close();
        const yes = await card('<h2>Start over?</h2><p>Your money, food and upgrades all go. This can\'t be undone.</p>',
          [{ label: 'Keep playing', value: false }, { label: 'Start over', cls: 'red', value: true }]);
        if (!yes) return;
        wipe();
        clearScene();
        Object.assign(RT, { mode: 'parked', drive: null, queue: [], coming: [], serving: null, paid: null, ending: false, warned: false });
        $('#report').hidden = true;
        newDay();
        renderAll();
        firstMorning();
      }
    },
  });
}

$('#shopBtn').addEventListener('click', () => { sfx('tap'); openShop(); });
$('#priceBtn').addEventListener('click', () => { sfx('tap'); openPrices(); });
$('#driveBtn').addEventListener('click', openMap);
$('#truckBtn').addEventListener('click', () => { sfx('tap'); openTruck(); });
$('#meBtn').addEventListener('click', () => { sfx('tap'); openTruck(); });
$('#bookBtn').addEventListener('click', () => { sfx('tap'); openBook(); });
$('#helpBtn').addEventListener('click', () => { sfx('tap'); openHelp(); });
$('#setBtn').addEventListener('click', () => { sfx('tap'); openSettings(); });

// ============================================================ start ===

function firstMorning(){
  card(`<div class="intro-truck">${truckSVG(S.truck, you(), { stock: totalStock() })}</div>
    <h2>Welcome to Ningy Ningy Canteen!</h2>
    <ol class="steps">
      <li>🛒 Buy food at <b>Billy's Supermarket</b>. You've got ${money(S.money)}.</li>
      <li>📋 Check your <b>prices</b>. Milbils expect about double what Billy's charges.</li>
      <li>🗺️ <b>Drive</b> somewhere and serve the queue that collects!</li>
    </ol>`, [{ label: '🛒 Go shopping', cls: 'go' }]).then(() => openShop());
}

function begin(){
  const t = today();
  RT.mode = 'parked';
  renderAll();
  if (t.phase === 'closed' && S.summary){ showReport(S.summary); return; }
  if (t.phase === 'open' && !SPOT[t.at].shop){ callCrowd(); renderStatus(); }
  if (t.phase === 'morning' && S.day === 1 && !S.hinted.intro){
    S.hinted.intro = true; save();
    firstMorning();
  }
}

document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
addEventListener('resize', () => layoutQueue());
requestAnimationFrame(frame);

if (!S.started) showWelcome();
else begin();
