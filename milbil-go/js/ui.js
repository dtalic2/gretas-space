// ---------- Sheets, toasts, cards and sound ----------

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

const SOUNDS = {
  tap:     () => tone(660, { dur: 0.05, vol: 0.06, type: 'triangle' }),
  coin:    () => { tone(988, { dur: 0.08, type: 'square', vol: 0.05 }); tone(1319, { at: 0.07, dur: 0.16, type: 'square', vol: 0.05 }); },
  buy:     () => { tone(523, { dur: 0.08, type: 'triangle' }); tone(784, { at: 0.07, dur: 0.14, type: 'triangle' }); },
  nope:    () => tone(200, { dur: 0.16, type: 'sawtooth', vol: 0.05, to: 140 }),
  plant:   () => tone(330, { dur: 0.12, type: 'triangle', to: 440 }),
  water:   () => { tone(900, { dur: 0.08, to: 500 }); tone(1100, { at: 0.06, dur: 0.08, to: 600 }); },
  harvest: () => { tone(660, { dur: 0.08, type: 'triangle' }); tone(880, { at: 0.06, dur: 0.12, type: 'triangle' }); },
  throw:   () => tone(300, { dur: 0.3, type: 'sine', to: 900, vol: 0.08 }),
  hit:     () => tone(500, { dur: 0.12, type: 'triangle', to: 1000 }),
  miss:    () => tone(500, { dur: 0.25, type: 'sine', to: 180, vol: 0.07 }),
  wobble:  () => tone(170, { dur: 0.14, type: 'triangle', vol: 0.12 }),
  pop:     () => tone(900, { dur: 0.08, type: 'square', to: 200, vol: 0.06 }),
  flee:    () => [523, 440, 349].forEach((f, i) => tone(f, { at: i * 0.1, dur: 0.12, type: 'triangle' })),
  caught:  () => [523, 659, 784, 1047].forEach((f, i) => tone(f, { at: i * 0.09, dur: 0.16, type: 'triangle', vol: 0.1 })),
  spot:    () => { tone(880, { dur: 0.07, vol: 0.05 }); tone(1175, { at: 0.08, dur: 0.1, vol: 0.05 }); },
  level:   () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, { at: i * 0.08, dur: 0.2, type: 'square', vol: 0.05 })),
  door:    () => { tone(392, { dur: 0.1, type: 'triangle' }); tone(523, { at: 0.08, dur: 0.12, type: 'triangle' }); },
};
export const sfx = (name) => { try { SOUNDS[name]?.(); } catch {} };

let buzzOn = true;
export function setBuzz(on){ buzzOn = !!on; }
export function buzz(pattern){ if (buzzOn && touched && navigator.vibrate) try { navigator.vibrate(pattern); } catch {} }
