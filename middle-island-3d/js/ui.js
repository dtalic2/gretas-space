// ---------- All the DOM. Knows nothing about three.js ----------
import { RES, RES_KEYS, BUILDINGS, UPGRADES } from './econ.js';

const $ = (id) => document.getElementById(id);
const costHtml = (cost, have) => Object.entries(cost).map(([k, v]) =>
  `<span class="${(have[k] ?? 0) < v ? 'short' : ''}">${RES[k].icon} ${v}</span>`).join('');

export class UI {
  constructor(){
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    document.body.classList.toggle('desktop', !this.touch);
    this._last = {};
    this.res = $('res');
    this.res.innerHTML = RES_KEYS.map((k) => `<div class="chip" id="r_${k}"><span class="ico">${RES[k].icon}</span><b>0</b></div>`).join('')
      + `<div class="chip" id="r_people" title="Settlers"><span class="ico">👥</span><b>0</b></div>`;
    $('panelClose').onclick = () => this.closePanel();
    $('panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') this.closePanel(); });
    $('titleControls').innerHTML = this.touch
      ? 'Left stick to walk · drag to look · <b>E</b> to gather and build · ⚔️ to fight · 🔨 to build'
      : '<kbd>WASD</kbd> walk · <kbd>Shift</kbd> run · drag to look · scroll to zoom · <kbd>E</kbd> gather / build · <kbd>Space</kbd> swing · <kbd>B</kbd> build menu';
    if (this.touch) for (const k of document.querySelectorAll('kbd[data-touch]')) k.textContent = k.dataset.touch;
    this.onPanelClose = null;
  }

  boot(frac, msg){ $('bootBar').style.width = `${Math.round(frac * 100)}%`; if (msg) $('bootMsg').textContent = msg; }
  booted(){ $('boot').classList.add('hidden'); }

  title(hasSave, onContinue, onNew){
    $('title').classList.remove('hidden');
    $('btnContinue').classList.toggle('hidden', !hasSave);
    $('btnNew').textContent = hasSave ? 'New Game' : 'Start';
    $('btnNew').classList.toggle('alt', hasSave);
    $('btnContinue').onclick = () => { $('title').classList.add('hidden'); onContinue(); };
    $('btnNew').onclick = () => {
      if (hasSave && !confirm('Start again? Your island will be lost.')) return;
      $('title').classList.add('hidden'); onNew();
    };
  }

  showHud(on){ $('hud').classList.toggle('hidden', !on); }

  setRes(res, people){
    for (const k of RES_KEYS){
      const v = Math.floor(res[k] ?? 0);
      if (this._last[k] === v) continue;
      const el = $(`r_${k}`);
      el.querySelector('b').textContent = v;
      if (this._last[k] !== undefined && v > this._last[k]){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
      this._last[k] = v;
    }
    if (this._last.people !== people){
      $('r_people').querySelector('b').textContent = people;
      $('r_people').classList.toggle('hidden', people === 0);
      this._last.people = people;
    }
  }

  need(keys){
    for (const k of keys){ const el = $(`r_${k}`); el.classList.remove('need'); void el.offsetWidth; el.classList.add('need'); }
  }

  setBars(hp, food, warm, night){
    const set = (id, v) => {
      const el = $(id);
      el.style.width = `${Math.max(0, Math.min(100, v))}%`;
      el.parentElement.parentElement.classList.toggle('low', v < 25);
    };
    set('barHp', hp); set('barFood', food); set('barWarm', warm);
    $('barWarm').parentElement.parentElement.classList.toggle('cold', night && warm < 60);
  }

  setClock(day, time, part){
    const d = `Day ${day}`;
    if (this._day !== d){ $('dayNum').textContent = d; this._day = d; }
    $('clockTime').textContent = time;
    $('clockIco').textContent = part === 'night' ? '🌙' : part === 'dawn' ? '🌅' : part === 'evening' ? '🌇' : '☀️';
  }

  setObjective(text, hint, goal){
    const key = text + '|' + hint + '|' + goal;
    if (this._obj === key) return;
    const fresh = this._obj && this._obj.split('|')[0] !== text;
    this._obj = key;
    $('qText').innerHTML = text + (goal ? `<span class="goal">${goal}</span>` : '');
    $('qHint').textContent = hint ?? '';
    if (fresh){ const o = $('objective'); o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash'); }
  }

  setGuide(angle, dist, label){
    if (angle === null){ $('guide').classList.add('hidden'); return; }
    $('guide').classList.remove('hidden');
    $('guideArrow').style.transform = `rotate(${angle}rad)`;
    $('guideText').textContent = dist < 6 ? (label ?? 'Here!') : `${Math.round(dist)} m`;
  }

  prompt(text, hold = 0, locked = false){
    const el = $('prompt');
    if (!text){ el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('locked', locked);
    if (this._prompt !== text){ $('promptText').textContent = text; this._prompt = text; }
    $('holdBar').style.width = `${Math.round(hold * 100)}%`;
  }

  buildBar(show, name, ok, reason, note = false){
    $('buildBar').classList.toggle('hidden', !show);
    if (!show) return;
    $('bbName').textContent = name;
    const r = $('bbReason');
    r.textContent = ok && !note ? 'Looks like a good spot' : reason;
    r.classList.toggle('bad', !ok);
    $('bbPlace').disabled = !ok;
  }

  toast(msg, kind = ''){
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = msg;
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => t.remove(), 4200);
  }

  pop(text, x, y){
    const p = document.createElement('div');
    p.className = 'pop';
    p.textContent = text;
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    $('pops').appendChild(p);
    setTimeout(() => p.remove(), 1150);
  }

  hurt(){ const h = $('hurt'); h.style.transition = 'none'; h.style.opacity = 1; void h.offsetWidth; h.style.transition = 'opacity .6s'; h.style.opacity = 0; }
  nightTint(v){ $('night').style.opacity = v * 0.85; }
  fade(on){ $('fade').classList.toggle('on', on); }

  // ------------------------------------------------------------ panels
  get panelOpen(){ return !$('panel').classList.contains('hidden'); }

  _open(title, html){
    $('panelTitle').textContent = title;
    $('panelBody').innerHTML = html;
    $('panel').classList.remove('hidden');
  }

  closePanel(){
    if (!this.panelOpen) return;
    $('panel').classList.add('hidden');
    this.onPanelClose?.();
    this.onPanelClose = null;
  }

  /**
   * @param status(type) → { built, locked: reason|null }
   */
  buildMenu(res, status, onPick){
    const cards = Object.entries(BUILDINGS).map(([k, b]) => {
      const st = status(k);
      const afford = Object.entries(b.cost).every(([r, v]) => (res[r] ?? 0) >= v);
      const dis = st.locked || !afford;
      return `<button class="card" data-k="${k}" ${dis ? 'disabled' : ''}>
        <div class="row"><span class="ico">${b.icon}</span><span class="nm">${b.name}</span></div>
        <div class="tx">${b.text}</div>
        <div class="cost">${costHtml(b.cost, res)}</div>
        ${st.locked ? `<div class="lock">🔒 ${st.locked}</div>` : st.built ? `<div class="owned">You have ${st.built}</div>` : ''}
      </button>`;
    }).join('');
    this._open('Build', `<div class="cards">${cards}</div>`);
    for (const el of $('panelBody').querySelectorAll('.card')){
      el.onclick = () => { if (!el.disabled){ const k = el.dataset.k; this.onPanelClose = null; $('panel').classList.add('hidden'); onPick(k); } };
    }
  }

  smithMenu(res, owned, onBuy){
    const render = () => {
      const cards = Object.entries(UPGRADES).map(([k, u]) => {
        const have = !!owned[k];
        const afford = Object.entries(u.cost).every(([r, v]) => (res[r] ?? 0) >= v);
        return `<button class="card" data-k="${k}" ${have || !afford ? 'disabled' : ''}>
          <div class="row"><span class="ico">${u.icon}</span><span class="nm">${u.name}</span></div>
          <div class="tx">${u.text}</div>
          ${have ? '<div class="owned">✓ Forged</div>' : `<div class="cost">${costHtml(u.cost, res)}</div>`}
        </button>`;
      }).join('');
      this._open('The Forge', `<div class="cards">${cards}</div>`);
      for (const el of $('panelBody').querySelectorAll('.card')){
        el.onclick = () => { if (!el.disabled){ onBuy(el.dataset.k); render(); } };
      }
    };
    render();
  }

  help(actions){
    const rows = this.touch
      ? [['Walk', 'left stick'], ['Look', 'drag the screen · pinch to zoom'], ['Gather / build / use', 'hold <b>E</b>'], ['Fight wolves', '⚔️'], ['Build menu', '🔨'], ['Run', 'RUN']]
      : [['Walk', '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows'], ['Run', 'hold <kbd>Shift</kbd>'], ['Look · zoom', 'drag · scroll'],
         ['Gather / build / use', 'hold <kbd>E</kbd>'], ['Fight wolves', '<kbd>Space</kbd>'], ['Build menu', '<kbd>B</kbd>'],
         ['Rotate while placing', '<kbd>R</kbd>'], ['Sound', '<kbd>M</kbd>']];
    this._open('How to play', `<div class="help">
      <table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <h3>Staying alive</h3>
      <ul>
        <li><b>🍗 Hunger</b> goes down all the time. You eat bread on your own when you have some — pick berries, catch fish at the ripples by the shore, or grow wheat.</li>
        <li><b>🔥 Warmth</b> drops at night unless you are near a campfire or one of your houses.</li>
        <li><b>❤️ Health</b> comes back when you are fed and warm. Drink from a well to heal fast.</li>
        <li><b>🐺 Wolves</b> prowl at night. They are afraid of fire — stand in the light of a campfire, torch or watchtower. Hit them to chase them off.</li>
        <li><b>🛖 Sleep</b> in a hut or cottage at night to skip to morning. The game saves itself all the time.</li>
      </ul>
      <h3>Growing a village</h3>
      <p>Each Cottage brings two <b>settlers</b>. They gather wood, stone and food for you, help hammer new buildings,
        and eat a little bread each day. Build a Chapel for more, and the Castle Keep to rule the island.</p>
      <div class="row-btns">
        <button id="hRestart" class="danger">↺ Start a new island</button>
      </div>
    </div>`);
    $('hRestart').onclick = actions.restart;
  }

  win(stats, onGo){
    $('winBody').innerHTML = `<p>The flags go up over the Castle Keep and the chapel bell rings out across the water.
      From one shipwrecked sailor to a whole village — Middle Island is yours.</p>
      <div class="stats">${stats.map(([i, v]) => `<div>${i} ${v}</div>`).join('')}</div>`;
    $('win').classList.remove('hidden');
    $('winGo').onclick = () => { $('win').classList.add('hidden'); onGo(); };
  }
}
