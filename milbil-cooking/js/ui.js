// ---------- Sheets, toasts, cards and sound ----------
//
// Shared with Milbil GO, plus kitchen noises.

export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);

// ---------------------------------------------------------------- toasts ---

export function clearToasts(){ $('#toasts').innerHTML = ''; }

export function toast(text, kind = ''){
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = text;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

/** A little "+20" that floats up from an element. */
export function floatText(fromEl, text){
  const r = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = 'floater';
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2}px`;
  f.style.top = `${r.top + r.height * 0.3}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

// ----------------------------------------------------------------- sheet ---
// One bottom sheet at a time. Content is an HTML string from `render(tab)`;
// buttons carry data-act and data-id, and clicks come back through onAct.

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
        <div class="sheet-banner"></div>
        <nav class="sheet-tabs"></nav>
        <div class="sheet-body"></div>
      </section>`;
    this.icon = $('.sheet-icon', el);
    this.title = $('h2', el);
    this.sub = $('.sheet-titles p', el);
    this.banner = $('.sheet-banner', el);
    this.tabs = $('.sheet-tabs', el);
    this.body = $('.sheet-body', el);
    $('.sheet-x', el).addEventListener('click', () => this.close());
    $('.sheet-scrim', el).addEventListener('click', () => this.close());
    this.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b || !this.cur) return;
      this.cur.tab = b.dataset.tab;
      this.body.scrollTop = 0;
      this.render();
    });
    // Live lists re-render on a timer; holding off while a finger is down keeps
    // a tap from landing on a button that was swapped out mid-press.
    this.pressing = false;
    el.addEventListener('pointerdown', () => { this.pressing = true; });
    window.addEventListener('pointerup', () => { setTimeout(() => { this.pressing = false; }, 60); });
    window.addEventListener('pointercancel', () => { this.pressing = false; });
    this.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.cur || b.disabled) return;
      this.cur.onAct?.(b.dataset.act, b.dataset.id, b, e);
    });
  }

  get open(){ return !!this.cur; }
  is(key){ return this.cur?.key === key; }

  /** spec: { key, icon, title, sub, tabs:[{id,label}], tab, render(tab), onAct, onClose, cls } */
  show(spec){
    const scroll = this.cur?.key === spec.key ? this.body.scrollTop : 0;
    if (this.cur && this.cur.key !== spec.key) this.cur.onClose?.();
    this.cur = { tab: spec.tabs?.[0]?.id, ...spec };
    this.el.className = `sheet ${spec.cls || ''}`;
    this.el.hidden = false;
    document.body.classList.add('sheet-open');
    requestAnimationFrame(() => this.el.classList.add('show'));
    this.render();
    this.body.scrollTop = scroll;
  }

  render(){
    const c = this.cur;
    if (!c) return;
    this.icon.innerHTML = typeof c.icon === 'function' ? c.icon() : (c.icon || '');
    this.title.innerHTML = typeof c.title === 'function' ? c.title() : (c.title || '');
    this.sub.innerHTML = typeof c.sub === 'function' ? c.sub() : (c.sub || '');
    this.tabs.innerHTML = (c.tabs || []).map(t =>
      `<button type="button" data-tab="${t.id}" class="${t.id === c.tab ? 'on' : ''}">${t.label}</button>`).join('');
    this.tabs.hidden = !(c.tabs && c.tabs.length);
    this.body.innerHTML = c.render(c.tab);
    this.setBanner(c.banner ? c.banner() : '');
  }

  setBanner(html){
    if (this.banner._html === html) return;
    this.banner._html = html;
    this.banner.innerHTML = html || '';
    this.banner.hidden = !html;
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
// A centred pop-up for moments: a catch, a new milbil, a question.

export function card(html, buttons = [{ label: 'OK', cls: 'go' }]){
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    wrap.innerHTML = `<div class="card">${html}<div class="card-btns">${buttons.map((b, i) =>
      `<button type="button" class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div></div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('show'));
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      wrap.classList.remove('show');
      setTimeout(() => wrap.remove(), 220);
      resolve(buttons[+b.dataset.i].value ?? +b.dataset.i);
    });
  });
}

// ----------------------------------------------------------------- sound ---

let ac = null;
let soundOn = true;
// Browsers refuse sound and vibration until the page has been touched, and
// complain in the console if you try — so stay quiet until then.
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
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  f.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

const SOUNDS = {
  tap:     () => tone(660, { dur: 0.05, vol: 0.06, type: 'triangle' }),
  pick:    () => tone(520, { dur: 0.07, vol: 0.07, type: 'triangle', to: 700 }),
  drop:    () => tone(300, { dur: 0.12, vol: 0.09, type: 'sine', to: 160 }),
  coin:    () => { tone(988, { dur: 0.08, type: 'square', vol: 0.05 }); tone(1319, { at: 0.07, dur: 0.16, type: 'square', vol: 0.05 }); },
  buy:     () => { tone(523, { dur: 0.08, type: 'triangle' }); tone(784, { at: 0.07, dur: 0.14, type: 'triangle' }); },
  nope:    () => tone(200, { dur: 0.16, type: 'sawtooth', vol: 0.05, to: 140 }),
  chop:    () => { noise(0.05, { vol: 0.25, freq: 2500, q: 2 }); tone(180, { dur: 0.06, vol: 0.1, type: 'triangle', to: 90 }); },
  mash:    () => noise(0.12, { vol: 0.18, freq: 500, q: 1.5, to: 250 }),
  swish:   () => noise(0.14, { vol: 0.12, freq: 1800, q: 0.8, to: 900 }),
  stir:    () => noise(0.2, { vol: 0.08, freq: 900, q: 3, to: 1300 }),
  pour:    () => noise(0.6, { vol: 0.1, freq: 2600, q: 0.7, to: 1200 }),
  squeeze: () => { noise(0.1, { vol: 0.15, freq: 700, q: 2, to: 300 }); tone(240, { dur: 0.1, vol: 0.06, to: 160 }); },
  sizzle:  () => noise(0.5, { vol: 0.06, freq: 5000, q: 0.5 }),
  flip:    () => tone(300, { dur: 0.22, type: 'sine', to: 900, vol: 0.09 }),
  pop:     () => tone(900, { dur: 0.08, type: 'square', to: 200, vol: 0.06 }),
  lever:   () => { tone(260, { dur: 0.08, type: 'square', vol: 0.05 }); noise(0.06, { vol: 0.1, freq: 900 }); },
  step:    () => { tone(784, { dur: 0.08, type: 'triangle', vol: 0.09 }); tone(1047, { at: 0.07, dur: 0.12, type: 'triangle', vol: 0.09 }); },
  oops:    () => [392, 330].forEach((f, i) => tone(f, { at: i * 0.12, dur: 0.16, type: 'triangle', vol: 0.09 })),
  ding:    () => { tone(1568, { dur: 0.5, type: 'sine', vol: 0.09 }); tone(2093, { at: 0.02, dur: 0.4, type: 'sine', vol: 0.04 }); },
  serve:   () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.16, type: 'triangle', vol: 0.1 })),
  level:   () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.2, type: 'square', vol: 0.05 })),
  door:    () => { tone(1175, { dur: 0.12, vol: 0.06 }); tone(1480, { at: 0.1, dur: 0.18, vol: 0.06 }); },
  order:   () => { tone(880, { dur: 0.07, vol: 0.05 }); tone(1175, { at: 0.08, dur: 0.1, vol: 0.05 }); },
};
export const sfx = (name) => { try { SOUNDS[name]?.(); } catch {} };

let buzzOn = true;
export function setBuzz(on){ buzzOn = !!on; }
export function buzz(pattern){ if (buzzOn && touched && navigator.vibrate) try { navigator.vibrate(pattern); } catch {} }
