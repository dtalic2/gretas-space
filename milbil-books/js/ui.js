// ---------- Sheets, cards, toasts, sound and confetti ----------
//
// The same furniture as MilMATHS and Milbil Lunchbox: one sheet that slides up
// from the bottom, a card in the middle for moments that need an answer, toasts
// for everything else. The noises are made on the spot with the Web Audio API,
// so there are no sound files to load.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);

// ---------------------------------------------------------------- toasts ---

export function toast(html, { undo = null, ms = 2600 } = {}){
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${html}</span>${undo ? '<button type="button">Undo</button>' : ''}`;
  if (undo) t.querySelector('button').addEventListener('click', () => { undo(); t.remove(); });
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

// ----------------------------------------------------------------- sheet ---
// One bottom sheet at a time. Content is an HTML string from render(); buttons
// carry data-act and data-id, and clicks come back through onAct.

export class Sheet {
  constructor(el){
    this.el = el;
    this.cur = null;
    el.innerHTML = `
      <div class="sheet-scrim"></div>
      <section class="sheet-card" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <div class="sheet-icon"></div>
          <div class="sheet-titles"><h2></h2><p></p></div>
          <button class="sheet-x" type="button" aria-label="Close">✕</button>
        </header>
        <div class="sheet-body"></div>
      </section>`;
    this.icon = $('.sheet-icon', el);
    this.title = $('h2', el);
    this.sub = $('.sheet-titles p', el);
    this.body = $('.sheet-body', el);
    $('.sheet-x', el).addEventListener('click', () => this.close());
    $('.sheet-scrim', el).addEventListener('click', () => this.close());
    this.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.cur || b.disabled) return;
      this.cur.onAct?.(b.dataset.act, b.dataset.id, b, e);
    });
    this.body.addEventListener('input', (e) => this.cur?.onInput?.(e.target, e));
    this.body.addEventListener('change', (e) => this.cur?.onChange?.(e.target, e));
  }

  get open(){ return !!this.cur; }

  /** spec: { key, icon, title, sub, render(), onAct, onInput, onChange, onClose, cls } */
  show(spec){
    if (this.cur && this.cur.key !== spec.key) this.cur.onClose?.();
    this.cur = spec;
    this.el.className = `sheet ${spec.cls || ''}`;
    this.el.hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => this.el.classList.add('show'));
    this.render();
    this.body.scrollTop = 0;
  }

  render(){
    const c = this.cur;
    if (!c) return;
    this.icon.innerHTML = c.icon || '';
    this.title.innerHTML = c.title || '';
    this.sub.innerHTML = c.sub || '';
    this.sub.hidden = !c.sub;
    this.body.innerHTML = c.render();
  }

  close(){
    if (!this.cur) return;
    const c = this.cur;
    this.cur = null;
    this.el.classList.remove('show');
    document.body.classList.remove('sheet-open');
    setTimeout(() => { if (!this.cur) this.el.hidden = true; }, 260);
    c.onClose?.();
  }
}

// ------------------------------------------------------------------ card ---
// A pop-up for moments that need an answer. Resolves with the chosen button's
// value (or its index), or null if it was closed by tapping outside.

export function card(html, buttons = [{ label: 'OK', cls: 'go' }], { cls = '', top = false, onOpen = null, dismiss = true } = {}){
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = `card-wrap${top ? ' top' : ''}`;
    wrap.innerHTML = `<div class="card ${cls}" role="dialog" aria-modal="true">${html}
      <div class="card-btns">${buttons.map((b, i) =>
        `<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    const done = (value) => {
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 220);
      resolve(value);
    };
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (b){ const it = buttons[+b.dataset.i]; done(it.value ?? +b.dataset.i); return; }
      if (dismiss && e.target === wrap) done(null);
    });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dismiss) done(null);
      if (e.key === 'Enter' && !e.shiftKey && e.target.tagName === 'INPUT'){
        e.preventDefault();
        const go = wrap.querySelector('.btn.go');
        go?.click();
      }
    });
    onOpen?.(wrap, done);
  });
}

// ----------------------------------------------------------------- sound ---

let ac = null;
let soundOn = true;
// Browsers refuse sound until the page has been touched, and complain in the
// console if you try — so stay quiet until then.
let touched = false;
addEventListener('pointerdown', () => { touched = true; }, { capture: true, once: true });
addEventListener('keydown', () => { touched = true; }, { capture: true, once: true });
export function setSound(on){ soundOn = !!on; }

function audio(){
  if (!soundOn || !touched) return null;
  if (!ac){
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { ac = new AC(); } catch { return null; }
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, { at = 0, dur = 0.12, type = 'sine', vol = 0.12, to = null } = {}){
  const a = audio();
  if (!a) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

let noiseBuf = null;
function noise(dur, { at = 0, vol = 0.1, freq = 1200, q = 1, to = null } = {}){
  const a = audio();
  if (!a) return;
  if (!noiseBuf){
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noiseBuf;
  const fl = a.createBiquadFilter();
  fl.type = 'bandpass';
  fl.frequency.setValueAtTime(freq, t);
  if (to) fl.frequency.exponentialRampToValueAtTime(to, t + dur);
  fl.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(fl).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap:    () => tone(660, { dur: 0.05, vol: 0.05, type: 'triangle' }),
  pick:   () => tone(880, { dur: 0.05, vol: 0.05, type: 'triangle' }),
  pop:    () => { tone(420, { dur: 0.09, vol: 0.12, type: 'sine', to: 900 }); tone(1200, { at: 0.07, dur: 0.06, vol: 0.05, type: 'triangle' }); },
  grow:   () => [392, 523, 659].forEach((fq, i) => tone(fq, { at: i * 0.05, dur: 0.1, type: 'triangle', vol: 0.06 })),
  snap:   () => tone(1400, { dur: 0.025, vol: 0.035, type: 'square' }),
  words:  () => { tone(700, { dur: 0.06, vol: 0.06, type: 'triangle' }); tone(990, { at: 0.06, dur: 0.08, vol: 0.06, type: 'triangle' }); },
  page:   () => noise(0.18, { vol: 0.08, freq: 2200, q: 1.4, to: 800 }),
  bin:    () => tone(220, { dur: 0.16, type: 'triangle', vol: 0.08, to: 110 }),
  undo:   () => tone(520, { dur: 0.07, vol: 0.05, type: 'triangle', to: 390 }),
  nope:   () => tone(200, { dur: 0.16, type: 'sawtooth', vol: 0.045, to: 140 }),
  whoosh: () => noise(0.5, { vol: 0.09, freq: 500, q: 0.8, to: 3200 }),
  cheer:  () => [523, 659, 784, 1047, 1319].forEach((fq, i) => tone(fq, { at: 0.35 + i * 0.08, dur: 0.2, type: 'square', vol: 0.045 })),
  open:   () => [523, 784].forEach((fq, i) => tone(fq, { at: i * 0.07, dur: 0.14, type: 'triangle', vol: 0.07 })),
};
export const sfx = (name) => { try { SOUNDS[name]?.(); } catch {} };

// -------------------------------------------------------------- confetti ---

const CONFETTI_COLOURS = ['#ffc531', '#3fae4a', '#2f80ed', '#e5484d', '#9b5de5', '#ff6fae'];

export function confetti(count = 70){
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < count; i++){
    const bit = document.createElement('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
    bit.style.animationDelay = `${Math.random() * 0.5}s`;
    bit.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    bit.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
    bit.style.setProperty('--drift', `${Math.random() * 80 - 40}px`);
    if (i % 3 === 0) bit.style.borderRadius = '50%';
    box.appendChild(bit);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3200);
}

// ------------------------------------------------------------------ time ---

export function ago(ts){
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  const d = Math.round(s / 86400);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}

export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
