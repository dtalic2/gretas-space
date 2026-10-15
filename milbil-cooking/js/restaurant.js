// ---------- The restaurant ----------
//
// Sit-down restaurants: customers walk in the door, order (at an ordering
// machine if you have one, otherwise you tap them to take their order), sit
// at a free table and wait. When you serve them, your chef carries the dish
// out, they eat, and go.
//
// The Drive-Through: milbils queue up in cars along a winding lane and order
// at the speaker as they pull in. When their food is ready it goes out of the
// window in a bag, they drive off, and everyone behind moves up.
//
// Everything sits in one stage and is placed in pixels by layout(), so moving
// about is just a CSS transition from one spot to the next.

import { EAT_SECONDS, VIPS, VIP_CHANCE, NAMES, ORDER_SKEW, spawnGap, DISH } from './data.js';
import { S, place, menu, nextTableCost, tablesHere, fmt } from './state.js';
import { customerHTML, randomLook, drawLook, chefLook } from './milbil.js';
import { menuDishSVG, dishSVG } from './food.js';
import { $, sfx, floatText } from './ui.js';
import { signHTML, fitSign } from './sign.js';

const SPEED = 190;          // walking, in pixels a second
const DRIVE = 260;          // driving
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const miniDish = {};
const dishPic = (id) => (miniDish[id] ??= menuDishSVG(id, 'dish mini'));

/** What someone orders: anything on your menu, but mostly the dearest things. */
export function pickDish(){
  const list = menu();
  const weights = list.map((_, i) => ORDER_SKEW ** i);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++){ r -= weights[i]; if (r < 0) return list[i].id; }
  return list[list.length - 1].id;
}

// ----------------------------------------------------------- furniture ---

const tableSVG = (cloth, accent) => `<svg viewBox="0 0 100 72" aria-hidden="true">
  <ellipse cx="50" cy="66" rx="26" ry="5" fill="#0000001f"/>
  <rect x="45" y="28" width="10" height="36" rx="3" fill="#8a6a55"/>
  <ellipse cx="50" cy="65" rx="17" ry="4.5" fill="#8a6a55"/>
  <path d="M4 26 Q4 44 10 46 Q50 54 90 46 Q96 44 96 26 Z" fill="${cloth}"/>
  <path d="M10 44 Q50 52 90 44 L90 46 Q50 54 10 46 Z" fill="${accent}" opacity=".5"/>
  <ellipse cx="50" cy="26" rx="46" ry="12" fill="${cloth}"/>
  <ellipse cx="50" cy="26" rx="46" ry="12" fill="${accent}" opacity=".08"/>
  <ellipse cx="34" cy="22" rx="12" ry="2.6" fill="#fff" opacity=".6"/>
</svg>`;

const chairSVG = (accent) => `<svg viewBox="0 0 60 60" aria-hidden="true">
  <rect x="6" y="4" width="48" height="56" rx="14" fill="${accent}"/>
  <rect x="12" y="10" width="36" height="44" rx="10" fill="#fff" opacity=".25"/>
</svg>`;

const kioskSVG = (accent) => `<svg viewBox="0 0 44 76" aria-hidden="true">
  <ellipse cx="22" cy="73" rx="17" ry="3" fill="#0000001f"/>
  <rect x="14" y="44" width="16" height="28" rx="3" fill="#5b6475"/>
  <rect x="6" y="70" width="32" height="5" rx="2.5" fill="#5b6475"/>
  <rect x="2" y="2" width="40" height="46" rx="8" fill="${accent}"/>
  <rect x="7" y="7" width="30" height="31" rx="4" fill="#fff" class="kiosk-screen"/>
  <rect x="10" y="10" width="11" height="8" rx="2" fill="#ffd166"/><rect x="23" y="10" width="11" height="8" rx="2" fill="#7bd389"/>
  <rect x="10" y="20" width="11" height="8" rx="2" fill="#ff8fab"/><rect x="23" y="20" width="11" height="8" rx="2" fill="#7fc4ff"/>
  <rect x="10" y="30" width="24" height="5" rx="2.5" fill="${accent}" opacity=".6"/>
  <rect x="16" y="41" width="12" height="3" rx="1.5" fill="#00000033"/>
</svg>`;

const doorSVG = (accent) => `<svg viewBox="0 0 60 100" aria-hidden="true">
  <rect x="0" y="0" width="60" height="100" rx="8" fill="#ffffff" opacity=".7"/>
  <rect x="5" y="5" width="50" height="95" rx="6" fill="${accent}"/>
  <rect x="12" y="12" width="36" height="34" rx="16" fill="#cdeaff"/>
  <path d="M18 20 L26 14" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>
  <circle cx="46" cy="62" r="3.5" fill="#ffd166"/>
  <rect x="12" y="78" width="36" height="4" rx="2" fill="#000" opacity=".12"/>
</svg>`;

// A car, facing right, in two halves so the driver sits between them.
const CAR_COLORS = ['#ff6f61', '#4c7df0', '#ffc531', '#3fae4a', '#9b5de5', '#ff8fab', '#14b8a6', '#ff9a3c'];
const carBack = (c) => `<svg class="car-back" viewBox="0 0 120 74" aria-hidden="true">
  <ellipse cx="60" cy="70" rx="54" ry="4" fill="#0000002e"/>
  <path d="M28 34 Q31 4 56 4 H76 Q94 4 100 34 Z" fill="${c}"/>
  <path d="M36 34 Q39 10 57 10 H74 Q88 10 92 34 Z" fill="#d6efff"/>
</svg>`;
const carFront = (c) => `<svg class="car-front" viewBox="0 0 120 74" aria-hidden="true">
  <path d="M5 38 Q5 31 13 31 H104 Q116 31 116 42 V55 Q116 61 110 61 H11 Q5 61 5 55 Z" fill="${c}"/>
  <path d="M63 31 V61" stroke="#00000022" stroke-width="2"/>
  <rect x="5" y="45" width="111" height="4" fill="#fff" opacity=".35"/>
  <rect x="68" y="36" width="10" height="3" rx="1.5" fill="#00000035"/>
  <rect x="109" y="35" width="7" height="6" rx="2" fill="#fff3a8"/>
  <rect x="5" y="36" width="5" height="6" rx="2" fill="#ff8a8a"/>
  <circle cx="30" cy="61" r="10" fill="#2f2a3a"/><circle cx="30" cy="61" r="4" fill="#c9ced8"/>
  <circle cx="92" cy="61" r="10" fill="#2f2a3a"/><circle cx="92" cy="61" r="4" fill="#c9ced8"/>
</svg>`;

const BAG = `<svg viewBox="0 0 48 56" aria-hidden="true">
  <path d="M16 14 Q16 4 24 4 Q32 4 32 14" stroke="#b07a45" stroke-width="3" fill="none"/>
  <path d="M6 14 H42 L40 54 H8 Z" fill="#e8b878"/><path d="M6 14 H42 L41.5 22 H6.5 Z" fill="#d9a05b"/>
  <circle cx="24" cy="36" r="8" fill="#fff" opacity=".85"/><path d="M20 35 q4 5 8 0" stroke="#ff6f61" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

function wallDecor(T){
  const win = (x, w) => `<div class="window" style="left:${x}%;width:${w}%"><i></i></div>`;
  const spots = T.windows === 1 ? [[60, 26]] : T.windows === 2 ? [[42, 20], [74, 20]] : [[38, 16], [60, 16], [82, 14]];
  let html = spots.map(([x, w]) => win(x, w)).join('');
  html += `<div class="lamps">${[30, 55, 80].slice(0, Math.min(3, T.stars + 1)).map(x => `<i style="left:${x}%"></i>`).join('')}</div>`;
  if (T.stars >= 2) html += `<div class="plant" style="left:93%"></div>`;
  if (T.stars >= 3) html += `<div class="frame" style="left:${T.stars >= 4 ? 27 : 30}%"></div>`;
  return html;
}

// The front of the Drive-Through: a menu board with a speaker, and the window.
function driveDecor(){
  return `<div class="dt-board"><b>MENU</b><i></i><i></i><i></i><span class="dt-speaker"></span></div>
    <button type="button" class="dt-window" data-act="kitchen" aria-label="Kitchen">
      <span class="dt-awning"></span>
      <span class="dt-inside"><span class="dt-chef">${drawLook(chefLook(S.color), { title: S.name })}</span></span>
      <span class="dt-sill"></span>
    </button>`;
}

// ---------------------------------------------------------------- room ---

export class Restaurant {
  constructor(game){
    this.game = game;
    this.room = $('#room');
    this.customers = [];
    this.uid = 0;
    this.now = performance.now() / 1000;
    this.nextSpawn = this.now + 1.2;
    this.machineTurn = 0;
    this.chef = { x: 0, y: 0, busy: false, queue: [] };
    this.build();
    this.room.addEventListener('click', (e) => this.onClick(e));
    new ResizeObserver(() => this.layout(false)).observe(this.room);
  }

  get drive(){ return !!place().drive; }

  // Customers whose order is in and who are waiting for food, oldest first.
  get orders(){
    return this.customers.filter(c => c.state === 'wait').sort((a, b) => a.orderedAt - b.orderedAt);
  }

  // ------------------------------------------------------------- build ---

  /** (Re)draw the restaurant you're in. Customers stay put. */
  build(){
    const T = place();
    const R = this.room;
    for (const [k, v] of Object.entries({ wall: T.wall, wall2: T.wall2, floor: T.floor, floor2: T.floor2, accent: T.accent })) R.style.setProperty(`--${k}`, v);
    R.dataset.place = T.id;
    R.classList.toggle('drive', this.drive);
    const sign = signHTML('', '<i class="sign-edit">✏️</i>');
    if (this.drive){
      R.innerHTML = `<div class="wall">${driveDecor()}${sign}</div><div class="floor"></div><div class="stage" id="stage"></div>`;
      this.stage = $('#stage', R);
      let html = '';
      for (let r = 0; r < 4; r++) html += `<div class="lane" data-r="${r}"></div><div class="lane-turn" data-r="${r}"></div>`;
      this.stage.innerHTML = html;
      this.chefEl = null;
    } else {
      R.innerHTML = `
        <div class="wall">${wallDecor(T)}${sign}</div>
        <div class="floor"></div>
        <div class="stage" id="stage"></div>
        <div class="counter" id="counter">
          <div class="counter-top"></div>
          <div class="counter-front">
            <span class="counter-bell">🛎️</span>
            <span class="pass" aria-hidden="true"><i></i><i></i><i></i></span>
          </div>
        </div>`;
      this.stage = $('#stage', R);
      let html = `<div class="door-el">${doorSVG(T.accent)}</div>`;
      for (let k = 0; k < S.machines; k++) html += `<button type="button" class="kiosk" data-k="${k}" aria-label="Ordering machine">${kioskSVG(T.accent)}</button>`;
      for (let i = 0; i < tablesHere(); i++){
        html += `<div class="chair" data-i="${i}">${chairSVG(T.accent)}</div>
          <div class="tbl" data-i="${i}">${tableSVG(T.cloth, T.accent)}<div class="tbl-dish"></div></div>`;
      }
      const cost = nextTableCost();
      if (cost != null) html += `<button type="button" class="tbl-buy" data-act="buy-table"><b>+</b><span>Table</span><em>🪙${fmt(cost)}</em></button>`;
      html += `<div class="chef-walker" id="roomChef"><div class="carry"></div>${drawLook(chefLook(S.color), { title: S.name })}</div>`;
      this.stage.innerHTML = html;
      this.chefEl = $('#roomChef', this.stage);
    }
    for (const c of this.customers){
      this.stage.appendChild(c.el);
      if (c.state === 'eat' && c.table >= 0) this.putDish(c);
    }
    this.layout(false);
  }

  /** Everyone goes home: for moving to another restaurant. */
  clear(){
    for (const c of this.customers) c.el.remove();
    this.customers = [];
    this.chef = { x: 0, y: 0, busy: false, queue: [] };
    this.nextSpawn = this.now + 1.5;
  }

  /** Work out where everything goes from the room's size right now. */
  layout(animate){
    const W = this.room.clientWidth, H = this.room.clientHeight;
    if (!W || !H) return;
    if (this.drive) return this.layoutDrive(W, H, animate);
    const T = place();
    const wallH = clamp(H * 0.22, 92, 150);
    const counterH = clamp(H * 0.14, 70, 100);
    this.room.style.setProperty('--wallH', `${wallH}px`);
    this.room.style.setProperty('--counterH', `${counterH}px`);
    this.W = W; this.H = H; this.wallH = wallH; this.counterH = counterH;
    this.fitSign();

    // Door and machines along the back wall, on the left.
    const doorW = clamp(W * 0.13, 44, 64), doorH = doorW * 1.66;
    this.door = { x: 10 + doorW / 2, y: wallH + 6 };
    this.put($('.door-el', this.stage), 10, wallH - doorH + 2, doorW, 1);
    const kw = clamp(W * 0.1, 34, 46);
    this.kiosks = [];
    this.stage.querySelectorAll('.kiosk').forEach((el, k) => {
      const x = 10 + doorW + 12 + k * (kw + 8);
      this.put(el, x, wallH - kw * 1.15, kw, 30);
      this.kiosks.push({ x: x + kw * 0.5, y: wallH + kw * 0.75, el });
    });

    // Tables in a grid on the floor. A short last row is centred. A wide
    // screen gets more columns, whichever makes the tables biggest.
    const top = wallH + clamp(H * 0.06, 26, 48), bottom = H - counterH - 4, pad = 8;
    const fit = (c) => Math.min((W - pad * 2) / c * 0.72, (bottom - top) / Math.ceil(T.maxTables / c) * 1.02);
    let cols = T.cols;
    for (let c = T.cols + 1; c <= T.maxTables; c++) if (fit(c) > fit(cols) * 1.1) cols = c;
    const rows = Math.ceil(T.maxTables / cols);
    const cellW = (W - pad * 2) / cols, cellH = (bottom - top) / rows;
    const tw = Math.min(cellW * 0.72, cellH * 1.02, 190);
    const th = tw * 0.72;
    this.cw = tw * 0.58;
    this.slots = [];
    for (let i = 0; i < T.maxTables; i++){
      const row = Math.floor(i / cols), col = i % cols;
      const inRow = Math.min(cols, T.maxTables - row * cols);
      const cx = pad + (col + 0.5 + (cols - inRow) / 2) * cellW;
      const base = top + (row + 1) * cellH - cellH * 0.04;
      const tTop = base - th;
      this.slots.push({ cx, tTop, tw, th, row, seatY: tTop + th * 0.42 });
    }
    this.stage.querySelectorAll('.tbl').forEach(el => {
      const s = this.slots[+el.dataset.i];
      this.put(el, s.cx - s.tw / 2, s.tTop, s.tw, s.row * 10 + 13);
    });
    this.stage.querySelectorAll('.chair').forEach(el => {
      const s = this.slots[+el.dataset.i];
      const w = this.cw * 1.15;
      this.put(el, s.cx - w / 2, s.seatY - this.cw * 1.02, w, s.row * 10 + 11);
    });
    const buy = $('.tbl-buy', this.stage);
    if (buy){
      const s = this.slots[tablesHere()];
      const w = Math.min(s.tw * 0.8, 96);
      this.put(buy, s.cx - w / 2, s.tTop + s.th - w * 0.9, w, s.row * 10 + 13);
    }

    // You, behind the counter.
    const chefW = clamp(this.cw * 1.05, 48, 70);
    this.chefW = chefW;
    this.chefHome = { x: W * 0.24, y: H - counterH + chefW * 0.55 };
    if (!this.chef.busy){ this.chef.x = this.chefHome.x; this.chef.y = this.chefHome.y; }
    this.placeChef(false);
    this.placeAll(animate);
  }

  /**
   * The lane winds back and forth: the front row runs right, towards the
   * window; the next one runs left, and so on. Slot 0 is at the window, and
   * each car joins the back of the queue.
   */
  layoutDrive(W, H, animate){
    const T = place();
    const wallH = clamp(H * 0.25, 110, 170);
    this.room.style.setProperty('--wallH', `${wallH}px`);
    this.W = W; this.H = H; this.wallH = wallH;
    this.fitSign();
    const perRow = W > H * 1.1 ? 3 : 2;
    const rows = Math.ceil(T.cars / perRow);
    const top = wallH + 10, bottom = H - 6, pad = 12;
    const rowH = (bottom - top) / rows, cellW = (W - pad * 2) / perRow;
    this.carW = Math.min(cellW * 0.82, rowH * 1.15, 210);
    const carH = this.carW * 74 / 120;
    const laneH = carH * 0.62;
    this.rows = [];
    for (let r = 0; r < rows; r++){
      const y = top + (r + 1) * rowH - rowH * 0.2;           // where the wheels touch
      this.rows.push({ y, dir: r % 2 ? -1 : 1 });
    }
    this.slots = [];
    for (let s = 0; s < T.cars; s++){
      const r = Math.floor(s / perRow), k = s % perRow, R = this.rows[r];
      const col = R.dir > 0 ? perRow - 1 - k : k;
      this.slots.push({ cx: pad + (col + 0.5) * cellW, y: R.y, row: r });
    }
    this.stage.querySelectorAll('.lane').forEach(el => {
      const r = +el.dataset.r, R = this.rows[r];
      el.hidden = !R;
      if (!R) return;
      el.classList.toggle('left', R.dir < 0);
      Object.assign(el.style, { width: `${W}px`, height: `${laneH}px`, transform: `translate(0px, ${R.y - laneH * 0.78}px)`, zIndex: 1 });
    });
    // The bends join each row's back end to the front of the next.
    this.stage.querySelectorAll('.lane-turn').forEach(el => {
      const r = +el.dataset.r, A = this.rows[r], B = this.rows[r + 1];
      el.hidden = !B;
      if (!B) return;
      const x = A.dir > 0 ? 4 : W - 4 - laneH;
      const y1 = A.y - laneH * 0.78;
      Object.assign(el.style, { width: `${laneH}px`, height: `${B.y - A.y + laneH}px`, transform: `translate(${x}px, ${y1}px)`, zIndex: 0 });
    });
    this.placeAll(animate);
  }

  placeAll(animate){
    for (const c of this.customers){
      if (c.target != null){ const p = this.pos(c.target); c.x = p.x; c.y = p.y; }
      this.placeCust(c, animate && !!c.arrive);
    }
  }

  /** Redraw just the sign, after you've changed it. */
  renderSign(){
    $('.wall .sign', this.room)?.remove();
    $('.wall', this.room).insertAdjacentHTML('beforeend', signHTML('', '<i class="sign-edit">✏️</i>'));
    this.fitSign();
  }

  // Sit-down: centred at 60% across the wall, clear of the door, above the
  // windows. Drive-Through: centred along the top, above the board and window.
  fitSign(){
    if (!this.W) return;
    if (this.drive) return fitSign($('.wall .sign', this.room), this.W - 52, this.wallH * 0.32, 24);
    const doorRight = 10 + Math.max(44, Math.min(this.W * 0.13, 64));
    const half = Math.min(this.W * 0.6 - doorRight - 10, this.W * 0.4 - 18);
    fitSign($('.wall .sign', this.room), half * 2, this.wallH * 0.36, 24);
  }

  put(el, x, y, w, z){
    if (!el) return;
    el.style.width = `${w}px`;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.zIndex = z;
  }

  /** Where someone's feet (or a car's wheels) go for a target. */
  pos(t){
    if (this.drive){
      const s = this.slots[t.seat ?? t.enter ?? t.exit] || this.slots[0];
      const R = this.rows[s.row];
      if (t.enter != null) return { x: R.dir > 0 ? -this.carW * 0.7 : this.W + this.carW * 0.7, y: s.y };
      if (t.exit != null) return { x: R.dir > 0 ? this.W + this.carW * 0.7 : -this.carW * 0.7, y: s.y };
      return { x: s.cx, y: s.y };
    }
    if (t === 'door') return { ...this.door };
    if (t.machine != null){ const k = this.kiosks[t.machine] || this.kiosks[0]; return k ? { x: k.x + 4, y: k.y + 6 } : { ...this.door }; }
    const s = this.slots[t.seat];
    return { x: s.cx, y: s.seatY };
  }

  // ---------------------------------------------------------- customers ---

  spawn(){
    const taken = new Set(this.customers.map(c => c.table));
    const free = [];
    const n = this.drive ? place().cars : tablesHere();
    for (let i = 0; i < n; i++) if (!taken.has(i)) free.push(i);
    if (!free.length) return false;
    const vip = Math.random() < VIP_CHANCE ? pick(VIPS) : null;
    const c = {
      id: ++this.uid,
      name: vip ? vip.name : pick(NAMES),
      art: vip?.art || null,
      vip: !!vip,
      look: vip ? null : randomLook(),
      dish: pickDish(),
      // A car joins the back of the queue; a walk-in takes any free table.
      table: this.drive ? free[0] : pick(free),
      state: 'walk',
      ordered: false,
      car: this.drive,
    };
    c.target = this.drive ? { enter: c.table } : 'door';
    const p = this.pos(c.target);
    c.x = p.x; c.y = p.y;
    c.el = document.createElement('div');
    c.el.className = `cust ${c.vip ? 'vip' : ''} ${c.car ? 'car' : ''} entering`;
    c.el.dataset.id = c.id;
    const tag = c.vip ? '<span class="vip-tag">VIP</span>' : '';
    if (c.car){
      const col = pick(CAR_COLORS);
      c.el.innerHTML = `<div class="car-body">${carBack(col)}<div class="car-driver">${customerHTML(c)}</div>${carFront(col)}</div><div class="bubble" hidden></div>${tag}`;
    } else {
      c.el.innerHTML = `<div class="cust-body">${customerHTML(c)}</div><div class="bubble" hidden></div>${tag}`;
    }
    this.stage.appendChild(c.el);
    this.customers.push(c);
    this.face(c);
    this.placeCust(c, false);
    requestAnimationFrame(() => c.el.classList.remove('entering'));
    if (c.car){
      sfx('honk');
      // Drive-Through orders go in at the speaker as you pull up.
      this.go(c, { seat: c.table }, () => { this.placeOrder(c); this.sit(c); });
    } else if (S.machines > 0){
      sfx('door');
      const k = this.machineTurn++ % S.machines;
      this.go(c, { machine: k }, () => { c.state = 'machine'; c.until = this.now + 1.1; this.renderCust(c); });
    } else {
      sfx('door');
      this.go(c, { seat: c.table }, () => this.sit(c));
    }
    return true;
  }

  /** Cars point the way their row runs. */
  face(c){
    if (!c.car) return;
    const s = this.slots[c.target.seat ?? c.target.enter ?? c.target.exit];
    c.el.classList.toggle('left', !!s && this.rows[s.row].dir < 0);
  }

  go(c, target, after){
    const p = this.pos(target);
    const dur = Math.max(0.35, Math.hypot(p.x - c.x, p.y - c.y) / (c.car ? DRIVE : SPEED));
    c.x = p.x; c.y = p.y; c.target = target;
    c.arrive = this.now + dur;
    c.after = after;
    c.el.style.transitionDuration = `${dur.toFixed(2)}s`;
    c.el.classList.add('walking');
    this.face(c);
    this.placeCust(c, true);
  }

  placeCust(c, animate){
    const w = c.car ? this.carW : c.vip ? this.cw * 1.02 : this.cw;
    const h = c.car ? w * 74 / 120 : w * 1.2;
    if (!animate) c.el.style.transitionDuration = '0s';
    c.el.style.width = `${w}px`;
    c.el.style.transform = `translate(${(c.x - w / 2).toFixed(1)}px, ${(c.y - h).toFixed(1)}px)`;
    const parked = c.target?.seat != null && !c.arrive;
    c.el.style.zIndex = parked ? this.slots[c.target.seat].row * 10 + 12 : 150;
  }

  sit(c){
    c.state = c.ordered ? 'wait' : 'order';
    this.placeCust(c, false);
    this.renderCust(c);
    this.game.ordersChanged();
  }

  placeOrder(c){
    c.ordered = true;
    c.orderedAt = this.now;
    sfx('order');
    this.game.ordersChanged();
  }

  /** Tapping someone who's waiting to order. */
  takeOrder(c){
    if (c.state !== 'order') return;
    this.placeOrder(c);
    c.state = 'wait';
    this.renderCust(c);
  }

  renderCust(c){
    const b = $('.bubble', c.el);
    let html = '', cls = 'bubble';
    if (c.state === 'order'){ html = '<b class="bang">!</b>'; cls += ' ask'; }
    else if (c.state === 'machine') html = '<span class="b-emoji">🧾</span>';
    else if (c.state === 'wait'){
      html = dishPic(c.dish);
      const waited = this.now - c.orderedAt;
      cls += waited < 45 ? ' fresh' : waited < 90 ? ' meh' : ' slow';
      if (this.game.kitchen.cook?.cust === c) { html += '<span class="b-pan">🍳</span>'; cls += ' cooking'; }
    } else if (c.state === 'eat') { html = '<span class="b-emoji">😋</span>'; cls += ' small'; }
    else if (c.state === 'leave') { html = '<span class="b-emoji">💛</span>'; cls += ' small'; }
    if (b._html !== html + cls){
      b._html = html + cls;
      b.className = cls;
      b.innerHTML = html;
      b.hidden = !html;
    }
    c.el.classList.toggle('eating', c.state === 'eat');
    c.el.classList.toggle('tappable', c.state === 'order' || c.state === 'wait');
  }

  leave(c){
    const slot = c.table;
    c.state = 'leave';
    const t = this.tblEl(slot);
    if (t) $('.tbl-dish', t).replaceChildren();
    c.table = -1;
    this.renderCust(c);
    const gone = () => {
      c.el.classList.add('entering');
      setTimeout(() => c.el.remove(), 300);
      this.customers = this.customers.filter(x => x !== c);
    };
    if (c.car){
      sfx('honk');
      this.go(c, { exit: slot }, gone);
      this.moveUp();
    } else {
      this.go(c, 'door', gone);
    }
  }

  /** Drive-Through: when a car leaves, the ones behind it pull forward. */
  moveUp(){
    const n = place().cars;
    for (let s = 0; s < n; s++){
      if (this.customers.some(c => c.table === s)) continue;
      const next = this.customers
        .filter(c => c.table > s && (c.state === 'wait' || c.state === 'walk'))
        .sort((a, b) => a.table - b.table)[0];
      if (!next) break;
      next.table = s;
      this.go(next, { seat: s }, next.state === 'walk' ? next.after : null);
    }
  }

  tblEl(i){ return this.stage.querySelector(`.tbl[data-i="${i}"]`); }

  putDish(c){
    const t = this.tblEl(c.table);
    if (t) $('.tbl-dish', t).innerHTML = c.plate || dishPic(c.dish);
  }

  // -------------------------------------------------------------- serve ---

  /**
   * The dish is ready (and already paid for). Your chef carries it out, or at
   * the Drive-Through it goes out of the window in a bag. `arrived` runs when
   * it gets there, for the "+50".
   */
  serve(c, layers, arrived){
    c.state = 'served';
    c.plate = dishSVG(DISH[c.dish].dish, layers, { finished: true, cls: 'dish mini' });
    this.renderCust(c);
    this.game.ordersChanged();
    if (c.car) return this.handOut(c, arrived);
    this.chef.queue.push({ c, arrived });
    if (!this.chef.busy) this.nextDelivery();
  }

  handOut(c, arrived){
    const from = $('.dt-window', this.room).getBoundingClientRect();
    const to = c.el.getBoundingClientRect();
    const bag = document.createElement('div');
    bag.className = 'bag-fly';
    bag.innerHTML = BAG;
    Object.assign(bag.style, { left: `${from.left + from.width / 2 - 20}px`, top: `${from.top + from.height * 0.45}px` });
    document.body.appendChild(bag);
    sfx('swish');
    requestAnimationFrame(() => {
      bag.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height * 0.3 - from.top - from.height * 0.45}px) scale(.8)`;
    });
    setTimeout(() => {
      bag.remove();
      if (!c.el.isConnected) return;
      arrived(c.el);
      this.leave(c);
    }, 650);
  }

  nextDelivery(){
    const job = this.chef.queue.shift();
    if (!job){ this.chef.busy = false; return; }
    const { c, arrived } = job;
    this.chef.busy = true;
    $('.carry', this.chefEl).innerHTML = c.plate;
    const s = this.slots[c.table] || this.slots[0];
    const side = s.cx > this.W / 2 ? -1 : 1;
    this.walkChef({ x: s.cx + side * s.tw * 0.55, y: s.tTop + s.th * 0.8 }, () => {
      $('.carry', this.chefEl).innerHTML = '';
      if (c.table >= 0) this.putDish(c);
      c.state = 'eat';
      c.eatUntil = this.now + EAT_SECONDS;
      this.renderCust(c);
      arrived(c.el);
      this.walkChef(this.chefHome, () => this.nextDelivery());
    });
  }

  walkChef(p, after){
    const dur = Math.max(0.3, Math.hypot(p.x - this.chef.x, p.y - this.chef.y) / (SPEED * 1.3));
    this.chef.x = p.x; this.chef.y = p.y;
    this.chef.arrive = this.now + dur;
    this.chef.after = after;
    this.chefEl.style.transitionDuration = `${dur.toFixed(2)}s`;
    this.chefEl.classList.add('walking');
    this.placeChef(true);
  }

  placeChef(animate){
    if (!this.chefEl) return;
    const w = this.chefW, h = w * 1.2;
    if (!animate) this.chefEl.style.transitionDuration = '0s';
    this.chefEl.style.width = `${w}px`;
    this.chefEl.style.transform = `translate(${(this.chef.x - w / 2).toFixed(1)}px, ${(this.chef.y - h).toFixed(1)}px)`;
    const home = Math.abs(this.chef.y - this.chefHome.y) < 1 && Math.abs(this.chef.x - this.chefHome.x) < 1;
    this.chefEl.style.zIndex = home ? 160 : 175;
  }

  // --------------------------------------------------------------- tick ---

  tick(now){
    this.now = now;
    if (this.paused) this.nextSpawn = Math.max(this.nextSpawn, now + 1);
    if (now >= this.nextSpawn){
      // Cars order at the speaker, so the Drive-Through is as quick as two machines.
      const gap = this.drive ? spawnGap(place().cars, Math.max(2, S.machines)) : spawnGap(tablesHere(), S.machines);
      this.nextSpawn = now + (this.spawn() ? gap : 1);
    }
    for (const c of [...this.customers]){
      if (c.arrive && now >= c.arrive){
        c.arrive = 0;
        c.el.classList.remove('walking');
        this.placeCust(c, false);
        const f = c.after; c.after = null;
        f?.();
      }
      if (c.state === 'machine' && now >= c.until){
        c.state = 'walk';
        this.placeOrder(c);
        const k = this.kiosks[c.target.machine];
        k?.el.classList.remove('ping'); void k?.el.offsetWidth; k?.el.classList.add('ping');
        this.go(c, { seat: c.table }, () => this.sit(c));
      }
      if (c.state === 'eat' && now >= c.eatUntil) this.leave(c);
      if (c.state === 'wait') this.renderCust(c);
    }
    if (this.chef.arrive && now >= this.chef.arrive){
      this.chef.arrive = 0;
      this.chefEl?.classList.remove('walking');
      const f = this.chef.after; this.chef.after = null;
      this.placeChef(false);
      f?.();
    }
  }

  onClick(e){
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'kitchen') return this.game.openKitchen();
    if (act === 'buy-table') return this.game.offerTable();
    if (e.target.closest('.sign')) return this.game.openSign();
    if (e.target.closest('.kiosk')) return this.game.openOrders();
    if (e.target.closest('.counter')) return this.game.openKitchen();
    const el = e.target.closest('.cust');
    if (el){
      const c = this.customers.find(x => x.id === +el.dataset.id);
      if (c) this.game.tapCustomer(c);
    }
  }
}
