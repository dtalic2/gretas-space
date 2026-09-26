// ---------- All the DOM. Knows nothing about three.js ----------
import { ITEMS, FISH, SHOP, ANIMALS } from './econ.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(){
    this.touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    document.body.classList.toggle('desktop', !this.touch);
    this._last = {};
    this.onPanelClose = null;
    $('panelClose').onclick = () => this.closePanel();
    $('panel').addEventListener('pointerdown', (e) => { if (e.target.id === 'panel') this.closePanel(); });
  }

  boot(frac, msg){ $('bootBar').style.width = `${Math.round(frac * 100)}%`; if (msg) $('bootMsg').textContent = msg; }
  booted(){ $('boot').classList.add('hidden'); }

  title(hasSave, onContinue, onNew){
    $('title').classList.remove('hidden');
    $('btnContinue').classList.toggle('hidden', !hasSave);
    $('btnNew').textContent = hasSave ? 'Start over' : 'Start';
    $('btnNew').classList.toggle('alt', hasSave);
    $('btnContinue').onclick = () => { $('title').classList.add('hidden'); onContinue(); };
    // Tap twice to wipe a saved island. (No confirm(): embedded pages block it.)
    let armed = false;
    $('btnNew').onclick = () => {
      if (hasSave && !armed){ armed = true; $('btnNew').textContent = 'Tap again to start over'; return; }
      $('title').classList.add('hidden'); onNew();
    };
  }

  showHud(on){ $('hud').classList.toggle('hidden', !on); }

  setBag(state){
    const coins = Math.floor(state.coins);
    if (this._last.coins !== coins){
      $('coins').textContent = coins;
      if (this._last.coins !== undefined && coins > this._last.coins) this._bump($('coins').parentElement);
      this._last.coins = coins;
    }
    const chips = [['🐟', state.fishCount], ...Object.entries(ITEMS).map(([k, it]) => [it.icon, state.bag[k]])].filter(([, n]) => n > 0);
    const key = chips.map((c) => c.join('')).join('|');
    if (this._last.bag !== key){
      $('bagChips').innerHTML = chips.map(([i, n]) => `<div class="chip"><span>${i}</span><b>${n}</b></div>`).join('');
      this._last.bag = key;
    }
  }
  _bump(el){ el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }

  setClock(day, time, part){
    $('dayNum').textContent = `Day ${day}`;
    $('clockTime').textContent = time;
    $('clockIco').textContent = part === 'night' ? '🌙' : part === 'dawn' ? '🌅' : part === 'evening' ? '🌇' : '☀️';
  }

  setGoal(text, hint){
    const key = text + '|' + hint;
    if (this._goal === key) return;
    const fresh = this._goal && this._goal.split('|')[0] !== text;
    this._goal = key;
    $('goalText').textContent = text;
    $('goalHint').textContent = hint ?? '';
    if (fresh){ const g = $('goal'); g.classList.remove('flash'); void g.offsetWidth; g.classList.add('flash'); }
  }

  setGuide(angle, dist){
    if (angle === null){ $('guide').classList.add('hidden'); return; }
    $('guide').classList.remove('hidden');
    $('guideArrow').style.transform = `rotate(${angle}rad)`;
    $('guideText').textContent = dist < 5 ? 'Here!' : `${Math.round(dist)} m`;
  }

  prompt(text, locked = false){
    const el = $('prompt');
    if (!text){ el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('locked', locked);
    if (this._prompt !== text){ $('promptText').textContent = text; this._prompt = text; }
  }

  breath(frac){
    $('breath').classList.toggle('hidden', frac === null);
    if (frac !== null) $('breathBar').style.width = `${Math.round(frac * 100)}%`;
  }

  bite(on){ $('bite').classList.toggle('hidden', !on); }

  reel(r){
    $('reel').classList.toggle('hidden', !r);
    if (!r) return;
    $('reelZone').style.left = `${r.zone[0] * 100}%`;
    $('reelZone').style.width = `${(r.zone[1] - r.zone[0]) * 100}%`;
    $('reelNeedle').style.left = `${r.needle * 100}%`;
    $('reelLabel').textContent = this.touch ? 'Tap E when the needle is in the green!' : 'Press E when the needle is in the green!';
  }

  toast(msg, kind = ''){
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = msg;
    $('toasts').appendChild(t);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
    setTimeout(() => t.remove(), 4400);
  }

  pop(text, x, y){
    const p = document.createElement('div');
    p.className = 'pop';
    p.textContent = text;
    p.style.left = `${x}px`; p.style.top = `${y}px`;
    $('pops').appendChild(p);
    setTimeout(() => p.remove(), 1150);
  }

  underwater(on){ $('under').style.opacity = on ? 1 : 0; }
  fade(on){ $('fade').classList.toggle('on', on); }

  setButtons({ swimming, snorkel, ukulele, running }){
    const j = $('tJump');
    const dive = swimming && snorkel;
    j.textContent = dive ? '🤿' : '⤒';
    j.title = dive ? 'Dive (hold Space)' : 'Jump (Space)';
    j.classList.toggle('dive', dive);
    $('tUke').classList.toggle('hidden', !ukulele);
    $('tRun').classList.toggle('on', running);
  }

  // ------------------------------------------------------------ panels
  get panelOpen(){ return !$('panel').classList.contains('hidden'); }
  _open(title, html){ $('panelTitle').textContent = title; $('panelBody').innerHTML = html; $('panel').classList.remove('hidden'); }
  closePanel(){
    if (!this.panelOpen) return;
    $('panel').classList.add('hidden');
    const f = this.onPanelClose; this.onPanelClose = null; f?.();
  }

  /** Kai's shack: sell what you've gathered, buy gear. */
  shop(state, { sell, buy, wear }){
    const fishValue = FISH.reduce((s, f) => s + (state.fish[f.key] ?? 0) * f.price, 0);
    const shellValue = ['shell', 'star', 'pearl'].reduce((s, k) => s + state.bag[k] * ITEMS[k].price, 0);
    const nutValue = state.bag.coconut * ITEMS.coconut.price;
    const greet = state.fishCount || shellValue || nutValue
      ? 'Aloha! Ooh, what have you got for me today?'
      : 'Aloha, friend! Bring me fish, shells or coconuts and I\'ll pay you in coins.';
    const sellBtn = (id, label, value, detail) => `<button id="${id}" ${value ? '' : 'disabled'}><b>${label} · 🪙 ${value}</b><small>${detail}</small></button>`;
    const cards = Object.entries(SHOP).map(([k, it]) => {
      const have = state.owned[k];
      const wearable = ['hat', 'lei', 'glasses'].includes(k);
      const on = state.wearing[k];
      return `<button class="card" data-k="${k}" ${!have && state.coins < it.price ? 'disabled' : ''}>
        <div class="row"><span class="ico">${it.icon}</span><span class="nm">${it.name}</span></div>
        <div class="tx">${it.text}</div>
        ${have ? `<div class="owned">${wearable ? (on ? '✓ Wearing · tap to take off' : 'Yours · tap to put on') : '✓ Yours'}</div>` : `<div class="price">🪙 ${it.price}</div>`}
      </button>`;
    }).join('');
    this._open("Kai's Tiki Shack", `
      <div class="kai"><span>🧑🏽</span><div><b>Kai:</b> ${greet}</div></div>
      <div class="sec">Sell</div>
      <div class="sell">
        ${sellBtn('sellFish', 'Sell fish', fishValue, state.fishCount ? `${state.fishCount} fish in your bag` : 'Catch some from the dock')}
        ${sellBtn('sellShells', 'Sell shells & pearls', shellValue, 'Seashells, starfish and pearls')}
        ${sellBtn('sellNuts', 'Sell coconuts', nutValue, `${state.bag.coconut} coconuts`)}
      </div>
      <div class="sec">Buy</div>
      <div class="cards">${cards}</div>
      <p class="sec" style="text-transform:none;letter-spacing:0">Tip: keep a fish or two. Pinch and Splash love them!</p>`);
    $('sellFish').onclick = () => sell('fish');
    $('sellShells').onclick = () => sell('shells');
    $('sellNuts').onclick = () => sell('coconut');
    for (const el of $('panelBody').querySelectorAll('.card')){
      el.onclick = () => { const k = el.dataset.k; if (state.owned[k]) wear(k); else buy(k); };
    }
  }

  journal(state){
    const hearts = (n, max) => '❤️'.repeat(n) + '🤍'.repeat(Math.max(0, max - n));
    const likes = { mango: '🥭 mangoes', banana: '🍌 bananas', seaweed: '🌿 seaweed', fish: '🐟 fish' };
    const friends = Object.entries(ANIMALS).map(([k, a]) => {
      const f = state.friends[k];
      const bf = f.hearts >= a.hearts;
      return `<div class="friend"><span class="ico">${a.icon}</span>
        <div><span class="nm">${a.name}</span><small>${bf ? 'Best friends!' : a.food ? `Loves ${likes[a.food]}` : 'Loves pats'}</small></div>
        <span class="hearts">${hearts(f.hearts, a.hearts)}</span></div>`;
    }).join('');
    const got = Object.keys(state.journal).length;
    const fish = FISH.map((f) => {
      const j = state.journal[f.key];
      return j ? `<div class="fishcard"><span class="ico">${f.icon}</span>${f.name}<small>×${j.count} · best ${j.best} cm</small></div>`
        : `<div class="fishcard unknown"><span class="ico">❓</span>???<small>${f.night ? 'bites at night' : f.where === 'deep' ? 'deep water' : f.where === 'shallow' ? 'the lagoon' : ''}</small></div>`;
    }).join('');
    this._open('Island Journal', `
      <div class="sec">Friends</div><div class="friends">${friends}</div>
      <div class="sec">Fish · ${got} of ${FISH.length}</div><div class="fishgrid">${fish}</div>
      <div class="sec">Found</div>
      <div class="kai"><span>🐚</span><div>${state.found.shell} seashells · ${state.found.star} starfish · ${state.found.pearl} pearls</div></div>`);
  }

  help(onRestart){
    const rows = [
      ['Move', 'joystick (bottom left), or <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows'],
      ['Look around · zoom', 'drag the scene · scroll or pinch'],
      ['Pick, pet, fish, talk', '<b>E</b>'],
      ['Jump · dive', '<kbd>Space</kbd> or ⤒ (hold to dive with a snorkel)'],
      ['Run', '<kbd>Shift</kbd> or 🏃'],
      ['Ukulele · journal', '<kbd>U</kbd> 🎸 · <kbd>J</kbd> 📔'],
    ];
    this._open('How to play', `<div class="help">
      <table>${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</table>
      <ul>
        <li><b>Fishing:</b> face the water and press E to cast. When the bobber dips and you see <b>!</b>, press E. Then press E again when the needle is in the green.</li>
        <li><b>Where to fish:</b> the dock and the lagoon for reef fish; the ocean beaches for big deep-sea fish; anywhere at night for glow squid.</li>
        <li><b>Friends:</b> pet each animal once a day, and bring their favourite food. Three hearts makes you best friends, and something special happens.</li>
        <li><b>Sleep</b> in your hut at night, or nap in the hammock any time. The game saves itself.</li>
      </ul>
      <button id="hRestart">↺ Start a new island</button>
    </div>`);
    let armed = false;
    $('hRestart').onclick = () => { if (!armed){ armed = true; $('hRestart').textContent = 'Tap again. Everything will be lost'; return; } onRestart(); };
  }
}
