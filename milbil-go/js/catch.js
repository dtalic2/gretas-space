// ---------- Catching a milbil ----------
//
// Swipe the bubble up at the milbil. It hops about, harder ones more so. The
// coloured ring shrinks and grows: land the bubble while the ring is small for
// a better chance. A caught milbil wobbles the bubble three times — if it breaks
// out first you can throw again, though it may run off.

import { SPECIES_BY_ID, RARITY } from './data.js';
import { milbilHTML } from './milbil.js';

const lerp = (a, b, t) => a + (b - a) * t;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * @param {HTMLElement} host   where to put the overlay
 * @param {object} o  { species, catchBonus, sfx(name), buzz(ms) }
 * @returns {Promise<'caught'|'fled'|'left'>}
 */
export function encounter(host, { species, catchBonus = 0, sfx = () => {}, buzz = () => {} }){
  const sp = SPECIES_BY_ID[species];
  const rar = RARITY[sp.rarity];
  const ringColor = rar.catch >= 0.8 ? '#4cd964' : rar.catch >= 0.6 ? '#c7e43a'
                  : rar.catch >= 0.45 ? '#ffcc00' : rar.catch >= 0.3 ? '#ff9500' : '#ff3b30';

  const el = document.createElement('div');
  el.className = 'enc';
  el.innerHTML = `
    <div class="enc-sky"></div><div class="enc-hills"></div>
    <div class="enc-top">
      <button class="enc-run" type="button">🏃 Run away</button>
      <div class="enc-name"><b>${sp.name}</b><span class="rar" style="background:${rar.color}">${rar.name}</span></div>
    </div>
    <div class="enc-mb">
      <div class="enc-shadow"></div>
      <div class="enc-ring" style="--ring:${ringColor}"><i></i></div>
      <div class="enc-pic">${milbilHTML(species, { cls: 'big' })}</div>
    </div>
    <div class="enc-msg"></div>
    <div class="bubble enc-bubble"></div>
    <div class="enc-hint">Swipe the bubble up at ${sp.name}!</div>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const mb = el.querySelector('.enc-mb');
  const pic = el.querySelector('.enc-pic');
  const ringIn = el.querySelector('.enc-ring i');
  const bubble = el.querySelector('.enc-bubble');
  const msg = el.querySelector('.enc-msg');
  const hint = el.querySelector('.enc-hint');

  // ---- the milbil hops about ----
  const wobble = { common: 0.10, uncommon: 0.16, rare: 0.22, epic: 0.28, legendary: 0.32 }[sp.rarity];
  const speed = { common: 0.0011, uncommon: 0.0014, rare: 0.0017, epic: 0.002, legendary: 0.0023 }[sp.rarity];
  let mbX = 0, mbY = 0, ring = 1, running = true, frozen = false, t0 = performance.now();

  const layout = () => {
    const W = el.clientWidth, H = el.clientHeight;
    return { W, H, cx: W / 2, cy: H * 0.40, bx: W / 2, by: H - Math.max(110, H * 0.15) };
  };

  const tick = (now) => {
    if (!running) return;
    const L = layout();
    const t = now - t0;
    if (!frozen){
      mbX = L.cx + Math.sin(t * speed) * L.W * wobble + Math.sin(t * speed * 2.7) * L.W * 0.03;
      mbY = L.cy - Math.abs(Math.sin(t * 0.004)) * 16;
      ring = 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(t * 0.0042));
    }
    mb.style.transform = `translate(${mbX}px, ${mbY}px)`;
    ringIn.style.transform = `translate(-50%,-50%) scale(${ring})`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // ---- the bubble ----
  let state = 'ready';     // ready | drag | flying | busy
  let samples = [];
  const resetBubble = () => {
    const L = layout();
    bubble.style.transition = 'none';
    bubble.style.opacity = '1';
    bubble.className = 'bubble enc-bubble';
    setBubble(L.bx, L.by, 1, 0);
    state = 'ready';
  };
  const setBubble = (x, y, s, r) => { bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${s}) rotate(${r}deg)`; };
  resetBubble();
  window.addEventListener('resize', resetBubble);

  let resolveFn;
  const done = new Promise(r => { resolveFn = r; });
  const finish = (result) => {
    if (!running) return;
    running = false;
    window.removeEventListener('resize', resetBubble);
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
    resolveFn(result);
  };
  el.querySelector('.enc-run').addEventListener('click', () => { sfx('tap'); finish('left'); });

  bubble.addEventListener('pointerdown', (e) => {
    if (state !== 'ready') return;
    state = 'drag';
    bubble.setPointerCapture(e.pointerId);
    samples = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    hint.classList.add('hide');
  });
  bubble.addEventListener('pointermove', (e) => {
    if (state !== 'drag') return;
    const r = el.getBoundingClientRect();
    samples.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (samples.length > 12) samples.shift();
    setBubble(e.clientX - r.left, e.clientY - r.top, 1, 0);
  });
  const release = () => {
    if (state !== 'drag') return;
    const now = performance.now();
    const recent = samples.filter(s => now - s.t < 110);
    const a = recent[0] || samples[0], b = samples[samples.length - 1];
    const dt = Math.max(16, b.t - a.t);
    const vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;   // px per ms
    if (vy > -0.35){ resetBubble(); return; }
    const r = el.getBoundingClientRect();
    throwBubble(b.x - r.left, b.y - r.top, vx, vy);
  };
  bubble.addEventListener('pointerup', release);
  bubble.addEventListener('pointercancel', release);

  async function throwBubble(x0, y0, vx, vy){
    state = 'flying';
    sfx('throw');
    const L = layout();
    const power = -vy / 1.4;                  // ~0.5 is a lazy flick, 2 a real fling
    const targetY = mbY - 40;
    const reach = Math.min(1, power / 0.5);
    const over = power > 4;
    const landY = over ? targetY - L.H * 0.35 : lerp(y0, targetY, reach);
    const landX = x0 + vx * 330;
    const dur = 620;
    const start = performance.now();
    await new Promise(res => {
      const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 2);
        setBubble(lerp(x0, landX, e), lerp(y0, landY, e) - Math.sin(Math.PI * t) * 90, lerp(1, 0.55, t), t * 540);
        if (t < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    const hit = !over && reach >= 1 && Math.abs(landX - mbX) < Math.max(52, L.W * 0.13);
    if (!hit){
      bubble.style.transition = 'opacity .35s, transform .35s';
      bubble.style.opacity = '0';
      say(over ? 'Too hard!' : reach < 1 ? 'Too short!' : 'Missed!');
      sfx('miss');
      await wait(450);
      if (running) resetBubble();
      return;
    }
    await capture(landX, landY);
  }

  function say(text, cls = ''){
    msg.textContent = text;
    msg.className = `enc-msg pop ${cls}`;
    void msg.offsetWidth;
    msg.classList.add('go');
  }

  async function capture(x, y){
    state = 'busy';
    frozen = true;
    const quality = ring < 0.5 ? ['Excellent!', 1.0] : ring < 0.75 ? ['Great!', 0.6] : ['Nice!', 0.3];
    say(quality[0], 'good');
    sfx('hit');
    const base = rar.catch;
    const p = Math.min(0.98, 1 - (1 - base) * (1 - quality[1] * 0.5) * (1 - catchBonus));
    const caught = Math.random() < p;

    // into the bubble...
    pic.style.transition = 'transform .35s ease-in, opacity .35s';
    pic.style.transform = `translate(${x - mbX}px, ${y - mbY + 40}px) scale(0.1)`;
    pic.style.opacity = '0';
    el.querySelector('.enc-ring').style.opacity = '0';
    await wait(380);
    // ...the bubble drops to the grass and wobbles
    bubble.style.transition = 'transform .3s cubic-bezier(.3,1.6,.6,1)';
    setBubble(x, y + 60, 0.7, 0);
    bubble.classList.add('full');
    await wait(450);
    const shakes = caught ? 3 : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < shakes; i++){
      bubble.classList.remove('shake'); void bubble.offsetWidth; bubble.classList.add('shake');
      sfx('wobble');
      await wait(750);
      if (!running) return;
    }
    if (caught){
      bubble.classList.add('sealed');
      sfx('caught');
      buzz([40, 60, 80]);
      say('Gotcha!', 'good big');
      await wait(1100);
      finish('caught');
      return;
    }
    // broke free
    bubble.classList.add('popped');
    sfx('pop');
    pic.style.transition = 'transform .3s cubic-bezier(.3,1.6,.6,1), opacity .2s';
    pic.style.transform = '';
    pic.style.opacity = '1';
    say('It broke free!');
    await wait(500);
    if (Math.random() < rar.flee){
      say(`${sp.name} ran away…`);
      pic.style.transition = 'transform .6s ease-in, opacity .6s';
      pic.style.transform = 'translateY(-60px) scale(.6)';
      pic.style.opacity = '0';
      sfx('flee');
      await wait(1200);
      finish('fled');
      return;
    }
    el.querySelector('.enc-ring').style.opacity = '';
    frozen = false;
    t0 = performance.now();
    resetBubble();
  }

  return done;
}
