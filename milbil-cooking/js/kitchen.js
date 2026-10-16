// ---------- The kitchen ----------
//
// The recipe card says what to do, step by step. Drag an ingredient down from
// the shelf onto the counter to use it. Some just go straight in (pour, add);
// the rest need a gesture: swipe down to chop, up and down to mash, round and
// round to stir, and so on.
//
// You're allowed to get it wrong. The wrong thing (or the right thing too
// early) goes in anyway, and when you press Serve the dish is checked. Right
// first time and it goes out to the customer; otherwise it's binned and you
// try again.

import { ACTS, ING, KINDS, DISH, DISHES } from './data.js';
import { S, menu, fmt } from './state.js';
import { ingredientSVG, dishSVG, stationSVG, toolSVG, TOOLS, menuDishSVG } from './food.js';
import { drawLook, chefLook, customerHTML } from './milbil.js';
import { $, esc, sfx, buzz, toast, card } from './ui.js';

const SHELF_SIZE = 8;
const HELP_AFTER = 7;      // seconds stuck on a step before the right card glows
const TOOL_PX = 92;
const SELF_TIP = { squeeze: { tip: [32, 60], rot: 180 }, shake: { tip: [32, 54], rot: 160 } };
const ACT_SOUND = { chop: 'chop', mash: 'mash', roll: 'swish', grate: 'swish', spread: 'swish', shake: 'swish',
  squeeze: 'squeeze', stir: 'stir', blend: 'stir', fry: 'sizzle', boil: 'stir', cook: 'flip', toast: 'lever' };
const PRAISE = ['Nice!', 'Yum!', 'Great job!', 'Perfect!', 'Brilliant!', 'Lovely!', 'Ooh, tasty!'];

const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const nowS = () => performance.now() / 1000;
const isAre = (name) => /s$/i.test(name) ? 'are' : 'is';     // "the peas are", "the onion is"

/**
 * Follow one finger (or the mouse) from press to lift, calling down/move/up
 * with { x, y, target }. `down` returns false to ignore a press.
 *
 * A finger comes through Touch Events, with the page's own scrolling and
 * zooming switched off while it's down. Phones (iPhones and iPads above all)
 * cancel a Pointer Events touch the moment they think you might be scrolling,
 * which used to drop whatever you were dragging. A mouse or pen uses Pointer
 * Events, which are fine for those.
 */
function follow(el, { down, move, up }){
  let live = null;                      // { touch: id } or { pointer: id }
  const at = (p) => ({ x: p.clientX, y: p.clientY, target: p.target });
  const mine = (e) => [...e.changedTouches].find(t => t.identifier === live?.touch);

  el.addEventListener('touchstart', (e) => {
    if (live) return;
    const t = e.changedTouches[0];
    if (down(at(t)) === false) return;
    live = { touch: t.identifier };
    e.preventDefault();                 // no scrolling, no zoom, no pretend mouse click
  }, { passive: false });
  addEventListener('touchmove', (e) => {
    const t = live?.touch != null && mine(e);
    if (!t) return;
    e.preventDefault();
    move(at(t));
  }, { passive: false });
  const lift = (cancelled) => (e) => {
    const t = live?.touch != null && mine(e);
    if (!t) return;
    live = null;
    up(at(t), cancelled);
  };
  addEventListener('touchend', lift(false));
  addEventListener('touchcancel', lift(true));

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || live) return;
    if (down(at(e)) === false) return;
    live = { pointer: e.pointerId };
    e.preventDefault();
    el.setPointerCapture?.(e.pointerId);
  });
  el.addEventListener('pointermove', (e) => { if (live?.pointer === e.pointerId) move(at(e)); });
  const plift = (cancelled) => (e) => {
    if (live?.pointer !== e.pointerId) return;
    live = null;
    up(at(e), cancelled);
  };
  el.addEventListener('pointerup', plift(false));
  el.addEventListener('pointercancel', plift(true));
}

export class Kitchen {
  constructor(game){
    this.game = game;
    this.el = $('#kitchen');
    this.cook = null;
    this.drag = null;
    this.g = null;
    this.shelf = $('#kShelf');
    this.counter = $('#kCounter');
    this.dishEl = $('#kDish');
    this.stationEl = $('#kStation');
    this.toolEl = $('#kTool');
    this.hintEl = $('#kHint');
    this.stepsEl = $('#kSteps');
    this.serveBtn = $('#kServe');

    $('#kBack').addEventListener('click', () => { sfx('tap'); this.close(); });
    $('#kBin').addEventListener('click', () => this.binIt());
    $('#kOrders').addEventListener('click', () => this.game.openOrders());
    this.serveBtn.addEventListener('click', () => this.serve());

    // Swiping ingredients down from the shelf, and the gestures on the counter.
    follow(this.shelf, { down: (p) => this.dragStart(p), move: (p) => this.dragMove(p), up: (p, x) => this.dragEnd(p, x) });
    follow(this.counter, { down: (p) => this.gStart(p), move: (p) => this.gMove(p), up: () => this.gEnd() });
  }

  get isOpen(){ return !this.el.hidden; }

  // --------------------------------------------------------- open/close ---

  /** Start cooking for a customer, or carry on if it's the same one. */
  async open(cust){
    if (this.cook && this.cook.cust !== cust && this.cook.layers.length && this.cook.cust.state === 'wait'){
      const keep = await card(`<div class="card-pic">${menuDishSVG(this.cook.dish.id)}</div>
        <h3>Stop making ${esc(this.cook.dish.name)}?</h3><p>It'll go in the bin, and you'll start ${esc(DISH[cust.dish].name)} for ${esc(cust.name)} instead.</p>`,
        [{ label: 'Keep cooking', value: true }, { label: 'Switch', cls: 'warn', value: false }]);
      if (keep){ this.show(); return; }
    }
    if (!this.cook || this.cook.cust !== cust) this.setup(cust);
    this.show();
  }

  show(){
    this.el.hidden = false;
    document.body.classList.add('in-kitchen');
    requestAnimationFrame(() => this.el.classList.add('show'));
    this.renderAll();
    this.game.ordersChanged();
  }

  close(){
    this.dragCancel();
    this.el.classList.remove('show');
    document.body.classList.remove('in-kitchen');
    setTimeout(() => { if (!this.el.classList.contains('show')) this.el.hidden = true; }, 220);
    this.game.ordersChanged();
  }

  setup(cust){
    const dish = DISH[cust.dish];
    const need = [...new Set(dish.steps.map(s => s.ing))];
    // Things that don't belong: from your other dishes first, then from the
    // cheapest dishes you haven't bought yet, so a short menu still has a full shelf.
    const ings = (list) => [...new Set(list.flatMap(d => d.steps.map(s => s.ing)))].filter(i => !need.includes(i));
    const mine = shuffle(ings(menu()));
    const more = ings(DISHES.filter(d => !menu().includes(d))).filter(i => !mine.includes(i)).slice(0, SHELF_SIZE);
    const others = [...mine, ...shuffle(more)];
    this.cook = {
      cust, dish,
      shelf: shuffle([...need, ...others.slice(0, Math.max(0, SHELF_SIZE - need.length))]),
      done: dish.steps.map(() => false),
      next: 0,
      layers: [],
      mistakes: [],
      prep: null,
      stuckSince: nowS(),
      seed: Math.floor(Math.random() * 1000),
    };
    this.renderShelf();
  }

  /** Bin the dish and start again (same order, same shelf). */
  reset(){
    const c = this.cook;
    c.done = c.dish.steps.map(() => false);
    c.next = 0;
    c.layers = [];
    c.mistakes = [];
    c.prep = null;
    c.stuckSince = nowS();
    this.renderAll();
  }

  async binIt(){
    const c = this.cook;
    if (!c || (!c.layers.length && !c.prep)) return;
    sfx('tap');
    const yes = await card(`<div class="bin-pic">🗑️</div><h3>Start this dish again?</h3><p>Everything on the ${c.dish.dish} goes in the bin.</p>`,
      [{ label: 'No', value: false }, { label: 'Start again', cls: 'warn', value: true }]);
    if (yes){ sfx('drop'); this.reset(); }
  }

  // ------------------------------------------------------------ render ---

  renderAll(){
    this.renderTop();
    this.renderShelf();
    this.renderSteps();
    this.renderWork(true);
  }

  renderTop(){
    const c = this.cook;
    const price = c.dish.price * (c.cust.vip ? 2 : 1);
    $('#kOrder').innerHTML = `<span class="k-cust">${customerHTML(c.cust)}</span>
      <span class="k-what"><b>${esc(c.dish.name)}</b><small>for ${esc(c.cust.name)}${c.cust.vip ? ' ⭐ VIP' : ''}</small></span>
      <span class="k-price">🪙${fmt(price)}</span>`;
    $('#kPic').innerHTML = menuDishSVG(c.dish.id);
  }

  renderShelf(){
    const c = this.cook;
    if (!c) return;
    this.shelf.innerHTML = c.shelf.map(id => {
      const ing = ING[id];
      return `<button type="button" class="ing-card" data-ing="${id}" style="--bg:${KINDS[ing.kind]}">${ingredientSVG(id)}<span>${esc(ing.name)}</span></button>`;
    }).join('');
  }

  renderSteps(){
    const c = this.cook;
    const allDone = c.done.every(Boolean);
    const early = new Set(c.mistakes.filter(m => m.kind === 'early').map(m => m.idx));
    this.stepsEl.innerHTML = c.dish.steps.map((st, i) => {
      const cls = early.has(i) ? 'oops' : c.done[i] ? 'done' : i === c.next ? 'now' : '';
      return `<li class="${cls}"><i>${c.done[i] && !early.has(i) ? '✓' : i + 1}</i>${ingredientSVG(st.ing, 'mini')}<span>${esc(st.text)}</span></li>`;
    }).join('') + `<li class="serve-step ${allDone ? 'now' : ''}"><i>${c.dish.steps.length + 1}</i><span class="plate-ico">🍽️</span><span>${esc(c.dish.serve)}</span></li>`;
    const now = this.stepsEl.querySelector('.now');
    if (now) now.scrollIntoView({ block: 'nearest' });
    this.serveBtn.classList.toggle('ready', allDone);
  }

  /** Overall progress of the step being worked on, 0 to 1. */
  progress(){
    const pr = this.cook?.prep;
    if (!pr) return 0;
    const ph = pr.A.phases[pr.phase];
    if (!ph) return 1;
    let frac = 0;
    if (ph.g === 'auto' || ph.g === 'wait') frac = Math.min(1, (nowS() - pr.phaseStart) / ph.s);
    else if (ph.g === 'circle') frac = Math.min(1, (pr.count + Math.abs(this.g?.acc || 0) / (Math.PI * 2)) / ph.n);
    else frac = pr.count / ph.n;
    return Math.min(1, (pr.phase + frac) / pr.A.phases.length);
  }

  renderWork(force = false){
    const c = this.cook;
    if (!c) return;
    const pr = c.prep;
    const p = this.progress();
    if (!force && pr && Math.abs(p - (this._lastP ?? -1)) < 0.015 && pr.phase === this._lastPhase) return;
    this._lastP = p;
    this._lastPhase = pr?.phase;

    const atDish = !pr || pr.A.at === 'dish';
    const allDone = c.done.every(Boolean);
    this.dishEl.innerHTML = dishSVG(c.dish.dish, c.layers, {
      pending: pr && atDish ? { ing: pr.ing, act: pr.act, seed: pr.seed, p } : null,
      finished: allDone && !pr,
    });
    this.counter.classList.toggle('with-station', !atDish);
    if (!atDish){
      this.stationEl.innerHTML = stationSVG(pr.A.at, pr.ing, pr.act, pr.phase >= pr.A.phases.length ? 1 : p, pr.phase);
      this.stationEl.dataset.kind = pr.A.at;
    } else if (!pr){
      this.stationEl.innerHTML = '';
    }
    this.renderTool();
    this.renderHint(p);
  }

  renderHint(p){
    const c = this.cook, pr = c.prep;
    let text = '';
    if (pr){
      const ph = pr.A.phases[pr.phase];
      if (!ph) text = '';
      else if (ph.g === 'auto') text = `${pr.A.verb === 'Pour' ? 'Pouring' : 'Adding'} the ${ING[pr.ing].name.toLowerCase()}…`;
      else text = ph.hint + (ph.n > 1 ? ` <b>${pr.count}/${ph.n}</b>` : '');
    } else if (c.done.every(Boolean)){
      text = c.mistakes.length ? 'All done? Tap <b>Serve</b> 🍽️' : 'Ready! Tap <b>Serve</b> 🍽️';
    } else {
      const st = c.dish.steps[c.next];
      text = `<b>Step ${c.next + 1}:</b> swipe the <b>${esc(ING[st.ing].name.toLowerCase())}</b> down ⬇️`;
    }
    const span = $('span', this.hintEl);
    if (span._t !== text){ span._t = text; span.innerHTML = text; }
    $('.k-bar > i', this.hintEl).style.width = `${Math.round(p * 100)}%`;
    this.hintEl.classList.toggle('busy', !!pr);
  }

  // ------------------------------------------------------------ the tool ---

  toolInfo(){
    const pr = this.cook?.prep;
    if (!pr) return null;
    const ph = pr.A.phases[pr.phase];
    if (!ph) return null;
    if (ph.g === 'auto') return { self: true, rot: pr.act === 'pour' ? -115 : 0, tip: [32, 60], cls: pr.act === 'pour' ? 'pouring' : 'dropping' };
    if (ph.g === 'wait') return null;
    if (!pr.A.tool) return null;                          // the blender and toaster are worked by hand
    if (pr.A.tool === 'self') return { self: true, ...SELF_TIP[pr.act], cls: '' };
    return { id: pr.A.tool, tip: TOOLS[pr.A.tool].tip, rot: 0, cls: '' };
  }

  renderTool(){
    const t = this.toolInfo();
    const pr = this.cook?.prep;
    const el = this.toolEl;
    if (!t){ el.hidden = true; el._key = ''; return; }
    const key = `${pr.ing}|${pr.act}|${pr.phase}|${t.id || 'self'}`;
    if (el._key !== key){
      el._key = key;
      el.innerHTML = `<div class="tool-demo"><div class="tool-in" style="transform:rotate(${t.rot || 0}deg)">${t.self ? ingredientSVG(pr.ing) : toolSVG(t.id)}</div></div>`;
      el.className = `k-tool ${t.cls}`;
      el.dataset.g = pr.A.phases[pr.phase].g;
      el.hidden = false;
      if (!this.g) this.restTool();
    }
  }

  /** Where the tool waits, gently showing the gesture, when you're not touching. */
  restTool(){
    const el = this.toolEl;
    const pr = this.cook?.prep;
    if (!pr || el.hidden) return;
    const box = this.counter.getBoundingClientRect();
    const target = (pr.A.at === 'dish' ? this.dishEl : this.stationEl).getBoundingClientRect();
    const auto = pr.A.phases[pr.phase]?.g === 'auto';
    const x = target.left + target.width * (auto ? 0.62 : 0.5) - box.left - TOOL_PX / 2;
    const y = target.top - box.top - TOOL_PX * (auto ? 0.5 : 0.3);
    el.classList.add('resting');
    el.style.transform = `translate(${x}px, ${y}px)`;
  }

  moveTool(p){
    const t = this.toolInfo();
    if (!t || this.toolEl.hidden) return;
    const box = this.counter.getBoundingClientRect();
    // The tip's spot inside the (possibly rotated) tool box.
    const a = (t.rot || 0) * Math.PI / 180, k = TOOL_PX / 64;
    const dx = (t.tip[0] - 32) * k, dy = (t.tip[1] - 32) * k;
    const tx = TOOL_PX / 2 + dx * Math.cos(a) - dy * Math.sin(a);
    const ty = TOOL_PX / 2 + dx * Math.sin(a) + dy * Math.cos(a);
    this.toolEl.classList.remove('resting');
    this.toolEl.style.transform = `translate(${p.x - box.left - tx}px, ${p.y - box.top - ty}px)`;
  }

  // ------------------------------------------------------------ dragging ---

  // An ingredient goes in if you drag it onto the counter, flick it
  // downwards from anywhere, or just tap it.

  dragStart(p){
    const cardEl = p.target?.closest?.('.ing-card');
    if (!cardEl || this.drag) return false;
    this.drag = { ing: cardEl.dataset.ing, card: cardEl, x0: p.x, y0: p.y, moved: false, ghost: null };
    cardEl.classList.add('held');
    sfx('pick');
  }

  dragMove(p){
    const d = this.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(p.x - d.x0, p.y - d.y0) > 8){
      d.moved = true;
      d.ghost = this.ghost(d.ing);
    }
    if (d.ghost){
      d.ghost.style.transform = `translate(${p.x - 44}px, ${p.y - 60}px)`;
      this.counter.classList.toggle('drop-over', this.overCounter(p) || this.flicked(d, p));
    }
  }

  ghost(ing){
    const g = document.createElement('div');
    g.className = 'ghost';
    g.innerHTML = ingredientSVG(ing);
    document.body.appendChild(g);
    return g;
  }

  /** Anywhere below the shelf counts as the counter. */
  overCounter(p){
    return p.y >= this.counter.getBoundingClientRect().top - 20;
  }

  /** A swipe that's gone mostly downwards. */
  flicked(d, p){
    const dx = p.x - d.x0, dy = p.y - d.y0;
    return dy > 36 && dy > Math.abs(dx) * 0.7;
  }

  dragEnd(p, cancelled = false){
    const d = this.drag;
    if (!d) return;
    this.drag = null;
    d.card.classList.remove('held');
    this.counter.classList.remove('drop-over');
    if (cancelled){ this.flyBack(d); return; }
    if (!d.moved || this.overCounter(p) || this.flicked(d, p)){
      if (this.drop(d.ing)){ this.flyIn(d); return; }
    }
    this.flyBack(d);
  }

  /** The ingredient sails down onto the dish. */
  flyIn(d){
    const from = d.card.getBoundingClientRect();
    const g = d.ghost || this.ghost(d.ing);
    if (!d.ghost) g.style.transform = `translate(${from.left + from.width / 2 - 44}px, ${from.top}px)`;
    const to = this.dishEl.getBoundingClientRect();
    requestAnimationFrame(() => {
      g.classList.add('in');
      g.style.transform = `translate(${to.left + to.width / 2 - 44}px, ${to.top + to.height * 0.25 - 44}px) scale(.7)`;
    });
    setTimeout(() => g.remove(), 280);
  }

  flyBack(d){
    if (!d.ghost) return;
    const r = d.card.getBoundingClientRect();
    d.ghost.classList.add('back');
    d.ghost.style.transform = `translate(${r.left + r.width / 2 - 44}px, ${r.top + 4}px) scale(.6)`;
    setTimeout(() => d.ghost.remove(), 260);
  }

  dragCancel(){
    if (!this.drag) return;
    this.drag.ghost?.remove();
    this.drag.card.classList.remove('held');
    this.drag = null;
    this.counter.classList.remove('drop-over');
  }

  // ----------------------------------------------------------- cooking ---

  /** An ingredient lands on the counter. Returns false if it can't go yet. */
  drop(ing){
    const c = this.cook;
    if (c.prep){
      sfx('nope');
      toast('Finish this step first!');
      return false;
    }
    const steps = c.dish.steps;
    let idx = -1, kind = 'ok';
    if (c.next < steps.length && steps[c.next].ing === ing) idx = c.next;
    else {
      const later = steps.findIndex((s, i) => s.ing === ing && !c.done[i]);
      if (later >= 0){ idx = later; kind = 'early'; }
      else kind = steps.some(s => s.ing === ing) ? 'extra' : 'wrong';
    }
    const act = idx >= 0 ? steps[idx].act : ING[ing].act;
    const A = ACTS[act];
    c.prep = { ing, act, A, idx, kind, phase: 0, count: 0, phaseStart: nowS(), seed: c.seed + c.layers.length * 17 + 3 };
    c.stuckSince = nowS();
    this.shelf.querySelector('.glow')?.classList.remove('glow');
    sfx('drop');
    const g = A.phases[0].g;
    if (g === 'auto') sfx(act === 'pour' ? 'pour' : 'pop');
    if (g === 'wait') sfx('sizzle');
    this.renderWork(true);
    return true;
  }

  gStart(p){
    const pr = this.cook?.prep;
    if (!pr || this.g) return false;
    this.g = {
      anchor: { x: p.x, y: p.y }, armed: true, low: p.y, high: p.y,
      dir: 0, turn: null, ext: null,
      last: null, lastH: null, acc: 0,
    };
    this.moveTool(p);
  }

  gMove(p){
    const g = this.g, pr = this.cook?.prep;
    if (!g || !pr) return;
    this.moveTool(p);
    const ph = pr.A.phases[pr.phase];
    if (!ph) return;
    const x = p.x, y = p.y;
    // Still sizzling or pouring: keep up with the finger, so a flip counts
    // from wherever it is when the wait's over, without lifting first.
    if (ph.g === 'auto' || ph.g === 'wait'){ Object.assign(g, { anchor: { x, y }, low: y, high: y, armed: true }); return; }
    switch (ph.g){
      case 'down':
        if (g.armed && y - g.anchor.y > 34){ g.armed = false; g.low = y; this.stroke(); }
        else if (!g.armed){ g.low = Math.max(g.low, y); if (g.low - y > 12){ g.armed = true; g.anchor.y = y; } }
        break;
      case 'up':
        if (g.armed && g.anchor.y - y > 40){ g.armed = false; g.high = y; this.stroke(); }
        else if (!g.armed){ g.high = Math.min(g.high, y); if (y - g.high > 12){ g.armed = true; g.anchor.y = y; } }
        break;
      case 'updown':
      case 'side': {
        const v = ph.g === 'side' ? x : y;
        if (g.turn == null){ g.turn = g.ext = v; break; }
        if (g.dir === 0){ if (Math.abs(v - g.ext) > 8){ g.dir = Math.sign(v - g.ext); g.ext = v; } break; }
        if ((v - g.ext) * g.dir > 0) g.ext = v;
        else if (Math.abs(v - g.ext) > 12){
          if (Math.abs(g.ext - g.turn) >= 24) this.stroke();
          g.turn = g.ext; g.ext = v; g.dir = -g.dir;
        }
        break;
      }
      case 'circle': {
        // Count turns of the swipe's own direction, so a circle anywhere on
        // the counter works, not just one around the pan.
        if (!g.last){ g.last = { x, y }; break; }
        const dx = x - g.last.x, dy = y - g.last.y;
        if (Math.hypot(dx, dy) < 7) break;
        g.last = { x, y };
        const h = Math.atan2(dy, dx);
        if (g.lastH != null){
          let d = h - g.lastH;
          if (d > Math.PI) d -= Math.PI * 2;
          if (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) > 2.2) g.acc = 0;                                            // a sharp back-and-forth isn't a circle
          else {
            if (g.acc && Math.sign(d) !== Math.sign(g.acc) && Math.abs(d) > 0.35) g.acc = 0;   // turned the other way
            g.acc += d;
          }
          if (Math.abs(g.acc) >= Math.PI * 1.8){ g.acc = 0; this.stroke(); }
          else if (Math.abs(g.acc) > 0.6 && !g.swish){ g.swish = true; setTimeout(() => { if (this.g) this.g.swish = false; }, 350); sfx(ACT_SOUND[pr.act] || 'stir'); }
        }
        g.lastH = h;
        this.renderWork();
        break;
      }
    }
  }

  gEnd(){
    const g = this.g, pr = this.cook?.prep;
    if (!g) return;
    this.g = null;
    const ph = pr?.A.phases[pr.phase];
    if (ph && (ph.g === 'updown' || ph.g === 'side') && g.turn != null && Math.abs(g.ext - g.turn) >= 24) this.stroke();
    this.restTool();
    this.renderWork(true);
  }

  /** One chop / mash / stir… */
  stroke(){
    const c = this.cook, pr = c.prep;
    const ph = pr.A.phases[pr.phase];
    pr.count++;
    sfx(ACT_SOUND[pr.act] || 'tap');
    buzz(8);
    this.stationEl.classList.remove('bump'); void this.stationEl.offsetWidth; this.stationEl.classList.add('bump');
    if (ph.g === 'up'){ this.stationEl.classList.remove('flip'); void this.stationEl.offsetWidth; this.stationEl.classList.add('flip'); }
    if (pr.count >= ph.n) this.nextPhase();
    else this.renderWork(true);
  }

  nextPhase(){
    const pr = this.cook.prep;
    pr.phase++;
    pr.count = 0;
    pr.phaseStart = nowS();
    if (this.g){ this.g.acc = 0; this.g.turn = null; this.g.dir = 0; }
    if (pr.phase >= pr.A.phases.length){ this.finishPrep(); return; }
    const g = pr.A.phases[pr.phase].g;
    if (g === 'wait') sfx('sizzle');
    this.renderWork(true);
  }

  /** The step's done: it goes on the dish, and we see if it was right. */
  finishPrep(){
    const c = this.cook, pr = c.prep;
    this.g = null;
    const commit = () => {
      c.prep = null;
      c.layers.push({ ing: pr.ing, act: pr.act, seed: pr.seed });
      const name = ING[pr.ing].name;
      if (pr.kind === 'ok'){
        c.done[pr.idx] = true;
        sfx('step');
        this.say(pick(PRAISE), 'happy');
      } else {
        if (pr.kind === 'early') c.done[pr.idx] = true;
        c.mistakes.push({ kind: pr.kind, ing: pr.ing, idx: pr.idx, at: c.next });
        sfx('oops');
        buzz([30, 40, 30]);
        this.say('Uh oh…', 'worried');
        toast(pr.kind === 'early' ? `Hmm… the ${esc(name.toLowerCase())} ${isAre(name)} step ${pr.idx + 1}, not step ${c.next + 1}!`
          : pr.kind === 'extra' ? `Oops — that's too much ${esc(name.toLowerCase())}!`
          : `Hmm… there's no ${esc(name.toLowerCase())} in ${esc(c.dish.name)}!`, 'bad');
      }
      c.next = c.done.findIndex(d => !d);
      if (c.next < 0) c.next = c.dish.steps.length;
      c.stuckSince = nowS();
      this.renderSteps();
      this.renderWork(true);
      if (c.done.every(Boolean)){ sfx('ding'); if (!c.mistakes.length) this.say('Ready to serve!', 'happy'); }
    };
    if (pr.A.at === 'dish'){ commit(); return; }
    // Slide it across from the station onto the dish.
    pr.phase = pr.A.phases.length;
    this.renderWork(true);
    this.toolEl.hidden = true;
    const from = this.stationEl.getBoundingClientRect(), to = this.dishEl.getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'flyer';
    fly.innerHTML = this.stationEl.innerHTML;
    Object.assign(fly.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
    document.body.appendChild(fly);
    this.stationEl.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      fly.style.transform = `translate(${to.left + to.width / 2 - from.left - from.width / 2}px, ${to.top + to.height * 0.35 - from.top - from.height / 2}px) scale(.45)`;
      fly.style.opacity = '0';
    });
    setTimeout(() => { fly.remove(); this.stationEl.style.visibility = ''; commit(); }, 420);
  }

  // -------------------------------------------------------------- serve ---

  async serve(){
    const c = this.cook;
    if (!c) return;
    if (c.prep){ sfx('nope'); toast('Finish this step first!'); return; }
    const missing = c.dish.steps.filter((_, i) => !c.done[i]);
    if (!c.mistakes.length && missing.length){
      sfx('nope');
      toast(`Not finished yet! Next: <b>${esc(c.dish.steps[c.next].text)}</b>`);
      return;
    }
    if (c.mistakes.length){
      sfx('oops');
      const lines = [];
      for (const m of c.mistakes){
        const n = ING[m.ing].name.toLowerCase();
        const line = m.kind === 'wrong' ? `There's no ${n} in ${c.dish.name}.`
          : m.kind === 'extra' ? `Too much ${n}!`
          : `The ${n} went in too early. It's step ${m.idx + 1}.`;
        if (!lines.includes(line)) lines.push(line);
      }
      for (const st of missing) lines.push(`You didn't do: ${st.text.toLowerCase()}.`);
      this.say('Oh no!', 'worried');
      await card(`<div class="card-milbil">${drawLook(chefLook(S.color), { mood: 'worried' })}</div>
        <h3>Oh no! That's not quite right.</h3>
        <ul class="oops-list">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        <p>${esc(c.cust.name)} can't eat that! Have another go.</p>`,
        [{ label: '🔁 Try again', cls: 'go' }]);
      this.reset();
      return;
    }
    // Right first time!
    const layers = c.layers.slice();
    const cust = c.cust;
    this.cook = null;
    sfx('serve');
    const yay = document.createElement('div');
    yay.className = 'yay';
    yay.innerHTML = `<div class="yay-dish">${dishSVG(c.dish.dish, layers, { finished: true })}</div><b>Perfect!</b>`;
    this.el.appendChild(yay);
    setTimeout(() => {
      yay.remove();
      this.close();
      this.game.served(cust, layers);
    }, 1100);
  }

  say(text, mood = ''){
    const chef = $('#kChef');
    chef.querySelector('.milbil')?.remove();
    chef.insertAdjacentHTML('beforeend', drawLook(chefLook(S.color), { mood }));
    const say = $('#kSay');
    say.textContent = text;
    say.classList.remove('pop'); void say.offsetWidth; say.classList.add('pop');
    clearTimeout(this._sayT);
    this._sayT = setTimeout(() => {
      say.classList.remove('pop');
      chef.querySelector('.milbil')?.remove();
      chef.insertAdjacentHTML('beforeend', drawLook(chefLook(S.color)));
    }, 1600);
  }

  // -------------------------------------------------------------- frame ---

  frame(){
    if (!this.isOpen || !this.cook) return;
    const c = this.cook, pr = c.prep;
    if (pr){
      const ph = pr.A.phases[pr.phase];
      if (ph && (ph.g === 'auto' || ph.g === 'wait')){
        if (nowS() - pr.phaseStart >= ph.s) this.nextPhase();
        else this.renderWork();
      }
    } else if (!c.done.every(Boolean) && nowS() - c.stuckSince > HELP_AFTER){
      // Stuck? Make the right ingredient glow.
      const want = c.dish.steps[c.next]?.ing;
      const el = this.shelf.querySelector(`[data-ing="${want}"]`);
      if (el && !el.classList.contains('glow')) el.classList.add('glow');
    }
  }

  /** The chef at the bottom of the kitchen, in your colour. */
  drawChef(){
    const chef = $('#kChef');
    chef.querySelector('.milbil')?.remove();
    chef.insertAdjacentHTML('beforeend', drawLook(chefLook(S.color)));
  }
}

