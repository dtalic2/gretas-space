// ---------- Everything made of HTML: chips, sheets, bubbles, toasts ----------
//
// The UI never changes the game itself. It reads state, draws, and calls back
// into `game` for anything that actually happens.

import * as THREE from 'three';
import { CROPS, ITEMS, BUILD, ORDER_SLOTS } from './data.js';
import { barnMax } from './save.js';
import * as E from './econ.js';
import * as F from './format.js';

const $ = (id) => document.getElementById(id);

/** "🌾 ×3" plus a quiet "have 1" only when you are short. */
function needChip(id, need, have, cls = 'want-item'){
  const it = ITEMS[id];
  const short = have < need;
  return `<span class="${cls}${short ? ' short' : ''}">
    <span class="em">${it.emoji}</span>×${need}${short ? `<small>have ${have}</small>` : ''}</span>`;
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));

export class UI {
  constructor(game){
    this.game = game;
    this.el = {
      hud: $('hud'), coins: $('coins'), level: $('level'), xpBar: $('xpBar'), pop: $('pop'),
      barnLabel: $('barnLabel'), objective: $('objective'), objText: $('objText'),
      orderBadge: $('orderBadge'), toasts: $('toasts'), pops: $('pops'), markers: $('markers'),
      panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'),
      placeBar: $('placeBar'), placeName: $('placeName'), placeHint: $('placeHint'), placeOk: $('placeOk'),
      levelUp: $('levelUp'), lvlNum: $('lvlNum'), lvlPurse: $('lvlPurse'), lvlUnlocks: $('lvlUnlocks'),
      welcome: $('welcome'), welcomeBody: $('welcomeBody'),
    };
    this.marks = new Map();
    this.ctx = null;
    this._vec = new THREE.Vector3();
    this._bind();
  }

  // -------------------------------------------------------------- wiring --
  _bind(){
    $('btnShop').onclick = () => this.openShop();
    $('btnOrders').onclick = () => this.openOrders();
    $('btnBarn').onclick = () => this.openBarn();
    $('btnHelp').onclick = () => this.openHelp();
    $('panelClose').onclick = () => this.close();
    this.el.panel.addEventListener('click', (e) => { if (e.target === this.el.panel) this.close(); });
    this.el.objective.onclick = () => this.game.followObjective();
    $('placeCancel').onclick = () => this.game.cancelPlace();
    $('placeOk').onclick = () => this.game.confirmPlace();
    $('lvlGo').onclick = () => { this.el.levelUp.classList.add('hidden'); this._nextLevelCard(); };
    $('welcomeGo').onclick = () => this.el.welcome.classList.add('hidden');

    // One click handler for every button inside a panel.
    this.el.panelBody.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b) return;
      this.action(b.dataset);
    });
  }

  action(d){
    const g = this.game;
    const obj = this.ctx && this.ctx.uid != null ? E.objAt(g.state, this.ctx.uid) : null;
    switch (d.act){
      case 'buy':      g.buy(d.type); break;
      case 'plant':    if (obj) g.plant(obj, d.crop); break;
      case 'harvest':  if (obj) g.harvest(obj); break;
      case 'queue':    if (obj) g.queue(obj, d.good); break;
      case 'unqueue':  if (obj) g.unqueue(obj); break;
      case 'collect':  if (obj) g.collect(obj); break;
      case 'move':     if (obj) g.startMove(obj); break;
      case 'armsell':  this.sellArmed = this.ctx.uid; this.refresh(); break;
      case 'sellobj':  if (obj) g.sellObj(obj); this.sellArmed = null; break;
      case 'fill':     g.fill(Number(d.uid)); break;
      case 'skip':     g.skip(Number(d.uid)); break;
      case 'sell':     g.sellItem(d.id, Number(d.n)); break;
      case 'upgrade':  g.upgradeBarn(); break;
      case 'close':    this.close(); break;
      case 'wipe':     g.wipe(); break;
    }
  }

  // ----------------------------------------------------------------- hud --
  hud(){
    const s = this.game.state;
    const p = E.population(s);
    const prog = E.levelProgress(s);
    this.el.coins.textContent = F.coins(s.coins);
    this.el.level.textContent = s.level;
    this.el.xpBar.style.width = (prog.frac * 100).toFixed(1) + '%';
    this.el.pop.textContent = `${p.free}/${p.total}`;
    this.el.barnLabel.textContent = `${E.barnCount(s)}/${barnMax(s)}`;

    const ready = s.orders.filter(o => E.canFill(s, o)).length;
    this.el.orderBadge.textContent = ready;
    this.el.orderBadge.classList.toggle('hidden', ready === 0);
  }

  objective(step){
    if (!step){ this.el.objective.classList.add('hidden'); return; }
    this.el.objective.classList.remove('hidden');
    this.el.objText.textContent = step.text;
  }

  toast(text, kind = ''){
    const d = document.createElement('div');
    d.className = 'toast ' + kind;
    d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 320); }, 1900);
    while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
  }

  /** A floating "+12 🪙" at a world position. */
  pop(world, text){
    const v = this._vec.copy(world).project(this.game.world.camera);
    if (v.z > 1) return;
    const d = document.createElement('div');
    d.className = 'pop';
    d.textContent = text;
    d.style.left = ((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    d.style.top = ((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
    this.el.pops.appendChild(d);
    setTimeout(() => d.remove(), 1200);
  }

  // ------------------------------------------------------------- markers --
  /** Bubbles that float over anything with something to say. */
  markers(now){
    const { town, state, world } = this.game;
    const cam = world.camera;
    const seen = new Set();

    // Zoomed out, only the things you can act on get a bubble — a farm of
    // ticking clocks at island scale is unreadable.
    const far = this.game.rig ? this.game.rig.dist > 40 : false;

    for (const obj of state.objs){
      const info = this._markerFor(obj, state, now);
      if (!info) continue;
      if (far && info.cls === '') continue;
      const anchor = town.anchor(obj.uid);
      if (!anchor) continue;
      const v = this._vec.copy(anchor).project(cam);
      if (v.z > 1) continue;
      const x = (v.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
      if (x < -80 || y < -60 || x > window.innerWidth + 80 || y > window.innerHeight + 60) continue;

      seen.add(obj.uid);
      let m = this.marks.get(obj.uid);
      if (!m){
        m = document.createElement('div');
        this.el.markers.appendChild(m);
        this.marks.set(obj.uid, m);
      }
      // Neighbouring plots stagger up and down so rows of fields stay legible.
      const lift = ((obj.x + obj.z) % 2) * 17;
      m.style.transform = `translate(${x.toFixed(1)}px, ${(y - lift).toFixed(1)}px) translate(-50%,-100%)`;
      const cls = 'mk ' + info.cls;
      if (m.className !== cls) m.className = cls;
      if (m._html !== info.html){ m.innerHTML = info.html; m._html = info.html; }
    }

    for (const [uid, m] of this.marks){
      if (!seen.has(uid)){ m.remove(); this.marks.delete(uid); }
    }
  }

  _markerFor(obj, state, now){
    if (obj.type === 'field'){
      if (!obj.crop) return { cls:'empty', html:'<span>＋</span>' };
      const c = E.crop(obj.crop);
      if (E.cropReady(obj, now)) return { cls:'ready', html:`<span>${c.emoji}</span><span>✓</span>` };
      const left = (E.cropReadyAt(obj) - now) / 1000;
      const pct = (E.cropProgress(obj, now) * 100).toFixed(0);
      return { cls:'', html:`<span>${c.emoji}</span><span class="bar"><i style="width:${pct}%"></i></span><span>${F.clock(left)}</span>` };
    }

    if (obj.type === 'helipad'){
      const ready = state.orders.filter(o => E.canFill(state, o)).length;
      if (ready) return { cls:'ready', html:`<span>🚁</span><span>${ready} to mail</span>` };
      if (state.orders.length) return { cls:'empty', html:`<span>🚁</span><span>${state.orders.length} waiting</span>` };
      return null;
    }

    if (obj.type === 'barn'){
      if (E.barnSpace(state) <= 0) return { cls:'ready', html:'<span>📦</span><span>Full</span>' };
      return null;
    }

    if (obj.ready && obj.ready.length){
      const g = E.good(obj.ready[0]);
      return { cls:'ready', html:`<span>${g.emoji}</span><span>×${obj.ready.length}</span>` };
    }
    if (obj.queue && obj.queue.length){
      const head = obj.queue[0];
      const g = E.good(head.id);
      const pct = (E.factoryProgress(obj, now) * 100).toFixed(0);
      const left = (head.endAt - now) / 1000;
      return { cls:'', html:`<span>${g.emoji}</span><span class="bar"><i style="width:${pct}%"></i></span><span>${F.clock(left)}</span>` };
    }
    if (BUILD[obj.type] && BUILD[obj.type].kind === 'factory'){
      return { cls:'empty', html:'<span>＋</span>' };
    }
    return null;
  }

  // -------------------------------------------------------------- panels --
  open(title, html, ctx){
    this.ctx = ctx || null;
    this.el.panelTitle.textContent = title;
    this.el.panelBody.innerHTML = html;
    this.el.panel.classList.remove('hidden');
    this.el.panelBody.scrollTop = 0;
  }

  close(){
    this.el.panel.classList.add('hidden');
    this.sellArmed = null;
    this.ctx = null;
    this.reopen = null;
  }

  /** Re-render whatever is open, after something changed underneath it. */
  refresh(){
    if (this.el.panel.classList.contains('hidden') || !this.reopen) return;
    const keep = this.el.panelBody.scrollTop;
    this.reopen();
    this.el.panelBody.scrollTop = keep;
  }

  // ---- shop
  openShop(){
    this.reopen = () => this.openShop();
    const s = this.game.state;
    const groups = [
      ['Fields & homes', ['field', 'cottage', 'burrow', 'tower', 'manor']],
      ['Workshops', ['bakery', 'press', 'pen', 'loom', 'kitchen']],
      ['Pretty things', ['tree', 'flowers', 'lamp', 'bench', 'fountain', 'statue']],
    ];
    let html = '<p class="sub">Tap something to buy it, then drag it where you want it. Workshops need free milbils to run them.</p>';
    for (const [title, ids] of groups){
      html += `<h3 class="help">${title}</h3><div class="cards">`;
      for (const id of ids){
        const d = BUILD[id];
        const cost = E.costOf(s, id);
        const check = E.buyCheck(s, id);
        const locked = s.level < d.level;
        const meta = [];
        if (d.gives) meta.push(`👥 +${d.gives}`);
        if (d.needs) meta.push(`👥 ${d.needs} needed`);
        meta.push(`${d.w}×${d.d}`);
        html += `<button class="card-item${check.ok ? '' : ' locked'}" data-act="buy" data-type="${id}">
          <span class="top"><span class="em">${d.emoji}</span><span class="nm">${esc(d.name)}</span></span>
          <span class="cost">${locked ? '🔒 Level ' + d.level : '🪙 ' + F.coins(cost)}</span>
          <span class="meta">${meta.map(m => `<span>${m}</span>`).join('')}</span>
          <span class="meta">${esc(d.blurb)}</span>
        </button>`;
      }
      html += '</div>';
    }
    this.open('🛒 Build', html, { kind:'shop' });
  }

  // ---- barn
  openBarn(){
    this.reopen = () => this.openBarn();
    const s = this.game.state;
    const used = E.barnCount(s), max = barnMax(s);
    let html = `<p class="sub">The barn holds everything you grow and make — ${used} of ${max} spaces used.</p>
      <div class="cap"><i style="width:${Math.min(100, used / max * 100).toFixed(1)}%"></i></div>`;

    const ids = Object.keys(s.barn).filter(id => s.barn[id] > 0 && ITEMS[id]);
    if (!ids.length){
      html += '<p class="sub">Nothing in here yet. Plant a field and come back.</p>';
    } else {
      html += '<div class="stock">';
      for (const id of ids.sort((a, b) => (ITEMS[a].sell - ITEMS[b].sell))){
        const it = ITEMS[id];
        html += `<div class="stock-item">
          <span class="em">${it.emoji}</span>
          <span class="nm">${esc(it.name)}<br><span style="color:var(--ink-dim);font-weight:700">🪙 ${it.sell} each</span></span>
          <span class="n">${s.barn[id]}</span>
          <button data-act="sell" data-id="${id}" data-n="1">Sell</button>
        </div>`;
      }
      html += '</div>';
    }

    html += `<div class="actions" style="margin-top:16px">
        <button class="pill go" data-act="upgrade">Bigger barn — 🪙 ${F.coins(this.game.barnCost())} (+25 spaces)</button>
      </div>
      <p class="tiny">Selling straight from the barn is quick, but the helipad pays far more for the same goods.</p>`;
    this.open('📦 Barn', html, { kind:'barn' });
  }

  // ---- orders
  openOrders(){
    this.reopen = () => this.openOrders();
    const s = this.game.state;
    const now = Date.now();
    let html = '<p class="sub">Milbils from other islands land on the pad with a list. Mail one their goods and the helicopter takes it away.</p>';

    if (!s.orders.length){
      html += '<p class="sub">Nobody on the pad. Somebody is on their way.</p>';
    }
    for (const o of s.orders){
      const can = E.canFill(s, o);
      const who = E.characterFor(o);
      html += `<div class="order">
        <div class="who"><img src="${who.art}" alt=""><span><b>${esc(who.name)}</b> is waiting for:</span></div>
        <div class="want">`;
      for (const w of o.want) html += needChip(w.id, w.n, s.barn[w.id] || 0);
      html += `</div>
        <div class="pay"><span class="c">🪙 ${F.coins(o.coins)}</span><span class="x">⭐ ${o.xp} xp</span></div>
        <div class="acts">
          <button class="pill go" data-act="fill" data-uid="${o.uid}" ${can ? '' : 'disabled'}>${can ? 'Mail it' : 'Not enough yet'}</button>
          <button class="pill" data-act="skip" data-uid="${o.uid}">${now < s.skipAt ? 'Skip in ' + F.clock(E.skipReadyIn(s, now)) : 'Send them home'}</button>
        </div></div>`;
    }
    const wait = Math.max(0, (s.nextOrderAt - now) / 1000);
    if (s.orders.length < ORDER_SLOTS) html += `<p class="tiny">Next visitor lands in ${F.clock(wait)}.</p>`;
    this.open('🚁 Helipad', html, { kind:'orders' });
  }

  // ---- a tapped building
  openObject(obj){
    this.reopen = () => this.openObject(E.objAt(this.game.state, obj.uid) || obj);
    const s = this.game.state;
    const d = E.def(obj.type);
    const kind = BUILD[obj.type] ? BUILD[obj.type].kind : obj.type;
    const ctx = { kind:'object', uid:obj.uid };
    const now = Date.now();

    if (obj.type === 'barn') return this.openBarn();
    if (obj.type === 'helipad') return this.openOrders();

    if (kind === 'field') return this.open(`${d.emoji} ${d.name}`, this._fieldBody(obj, s, now), ctx);
    if (kind === 'factory') return this.open(`${d.emoji} ${d.name}`, this._factoryBody(obj, s, now), ctx);
    if (kind === 'house') return this.open(`${d.emoji} ${d.name}`, this._houseBody(obj, s), ctx);
    return this.open(`${d.emoji} ${d.name}`, this._decorBody(obj, s), ctx);
  }

  _objActions(obj, extra = ''){
    const refund = Math.round(E.costOf(this.game.state, obj.type) * 0.5);
    const armed = this.sellArmed === obj.uid;
    return `<div class="actions">
      ${extra}
      <button class="pill" data-act="move">✋ Move it</button>
      ${E.canSell(obj) ? `<button class="pill warn" data-act="${armed ? 'sellobj' : 'armsell'}">
        ${armed ? 'Tap again to sell it' : `Sell for 🪙 ${F.coins(refund)}`}</button>` : ''}
    </div>`;
  }

  _fieldBody(obj, s, now){
    if (!obj.crop){
      let html = '<p class="sub">Pick something to plant. Wheat seed is always free — the barn keeps a sack for emergencies.</p><div class="cards">';
      for (const c of CROPS){
        const check = E.plantCheck(s, c.id);
        const seed = E.seedCost(c);
        html += `<button class="card-item${check.ok ? '' : ' locked'}" data-act="plant" data-crop="${c.id}">
          <span class="top"><span class="em">${c.emoji}</span><span class="nm">${esc(c.name)}</span></span>
          <span class="cost">${s.level < c.level ? '🔒 Level ' + c.level : (seed ? '🪙 ' + seed + ' seed' : 'free seed')}</span>
          <span class="meta"><span>⏳ ${F.span(c.secs)}</span><span>🪙 ${c.sell * c.yield} a crop</span><span>⭐ ${c.xp}</span></span>
        </button>`;
      }
      html += '</div>' + this._objActions(obj);
      return html;
    }

    const c = E.crop(obj.crop);
    const ready = E.cropReady(obj, now);
    const left = Math.max(0, (E.cropReadyAt(obj) - now) / 1000);
    const pct = (E.cropProgress(obj, now) * 100).toFixed(0);
    let html = `<div class="card-item wide" style="cursor:default">
        <span class="top"><span class="em">${c.emoji}</span><span class="nm">${esc(c.name)}</span></span>
        <span class="meta">${ready ? 'Ready to pick' : 'Ripe in ' + F.clock(left)}</span>
        <span class="cap" style="margin:8px 0 0"><i style="width:${pct}%"></i></span>
      </div>`;
    html += `<div class="actions" style="margin-top:12px">
        <button class="pill go" data-act="harvest" ${ready ? '' : 'disabled'}>
          ${ready ? `Harvest ${c.yield} ${esc(c.name)}` : 'Still growing'}</button>
      </div>`;
    return html + this._objActions(obj);
  }

  _factoryBody(obj, s, now){
    const d = BUILD[obj.type];
    const recipes = E.recipesAt(obj.type);
    let html = `<p class="sub">${esc(d.blurb)} Runs on ${d.needs} milbils.</p>`;

    // The bench: what is cooking and what is waiting.
    html += '<div class="queue">';
    for (let i = 0; i < E.QUEUE_CAP; i++){
      const ready = (obj.ready || [])[i];
      const item = (obj.queue || [])[i];
      if (ready){
        html += `<div class="slot done">${E.good(ready).emoji}<small>done</small></div>`;
      } else if (item){
        const pct = i === 0 ? E.factoryProgress(obj, now) * 100 : 0;
        const left = i === 0 ? F.clock((item.endAt - now) / 1000) : 'waiting';
        html += `<div class="slot"><div class="fill" style="height:${pct.toFixed(0)}%"></div>${E.good(item.id).emoji}<small>${left}</small></div>`;
      } else {
        html += '<div class="slot" style="opacity:.5">·</div>';
      }
    }
    html += '</div>';

    const readyN = (obj.ready || []).length;
    html += `<div class="actions" style="margin-bottom:14px">
      <button class="pill go" data-act="collect" ${readyN ? '' : 'disabled'}>${readyN ? `Collect ${readyN}` : 'Nothing ready'}</button>
      ${(obj.queue || []).length > 1 ? '<button class="pill" data-act="unqueue">Cancel last</button>' : ''}
    </div>`;

    html += '<div class="cards">';
    for (const g of recipes){
      const check = E.queueCheck(s, obj, g.id);
      const needs = Object.entries(g.in)
        .map(([id, n]) => needChip(id, n, s.barn[id] || 0, 'ing')).join('');
      html += `<button class="card-item${check.ok ? '' : ' locked'}" data-act="queue" data-good="${g.id}">
        <span class="top"><span class="em">${g.emoji}</span><span class="nm">${esc(g.name)}</span></span>
        <span class="needs">${s.level < g.level ? '🔒 Level ' + g.level : needs}</span>
        <span class="meta"><span>⏳ ${F.span(g.secs)}</span><span>🪙 ${g.sell}</span><span>⭐ ${g.xp}</span></span>
      </button>`;
    }
    html += '</div>';
    return html + this._objActions(obj);
  }

  _houseBody(obj, s){
    const d = BUILD[obj.type];
    const names = this.game.residents(obj);
    const p = E.population(s);
    let html = `<p class="sub">${esc(d.blurb)}</p>
      <div class="rows">
        <div class="row"><span>Living here</span><b>${names.map(esc).join(', ')}</b></div>
        <div class="row"><span>Milbils in town</span><b>${p.total}</b></div>
        <div class="row"><span>Free for new work</span><b>${p.free}</b></div>
      </div>`;
    return html + this._objActions(obj);
  }

  _decorBody(obj, s){
    const d = BUILD[obj.type];
    return `<p class="sub">${esc(d.blurb)}</p>` + this._objActions(obj);
  }

  // ---- help
  openHelp(){
    this.reopen = () => this.openHelp();
    const s = this.game.state;
    const html = `<div class="help">
      <p>Milbil Town runs on real time. Crops and workshops keep going while the
      game is closed — up to eight hours' worth.</p>
      <p class="tiny" style="margin-top:0">The visitors on the helipad were drawn by Greta.</p>
      <h3>The loop</h3>
      <ul>
        <li><b>Fields.</b> Tap an empty field to plant, tap it again when the bubble shows ✓.</li>
        <li><b>Workshops.</b> Tap one, pick a recipe, and it cooks through its queue. Tap to collect.</li>
        <li><b>The helipad 🚁.</b> Visitors land with a list. Mailing it pays about 1.6× what the barn pays, plus XP.</li>
        <li><b>Homes 🏡.</b> Every workshop needs free milbils. Homes are where they come from.</li>
        <li><b>The barn 📦.</b> Limited space. Upgrade it, or sell the surplus.</li>
      </ul>
      <h3>Moving around</h3>
      <ul>
        <li>Drag to move the island, pinch to zoom, twist with two fingers to turn.</li>
        <li>Mouse: drag to pan, right-drag or shift-drag to turn, wheel to zoom.</li>
        <li>Keyboard: <kbd>WASD</kbd> pan, <kbd>Q</kbd>/<kbd>E</kbd> turn, <kbd>+</kbd>/<kbd>-</kbd> zoom, <kbd>M</kbd> mute, <kbd>H</kbd> help.</li>
      </ul>
      <h3>This town so far</h3>
      <div class="rows">
        <div class="row"><span>Harvests</span><b>${s.stats.harvest}</b></div>
        <div class="row"><span>Things made</span><b>${s.stats.made}</b></div>
        <div class="row"><span>Deliveries mailed</span><b>${s.stats.delivered}</b></div>
        <div class="row"><span>Buildings put up</span><b>${s.stats.built}</b></div>
      </div>
      <div class="actions" style="margin-top:14px">
        <button class="pill warn" data-act="wipe">Start a brand new town</button>
      </div>
    </div>`;
    this.open('⚙️ How to play', html, { kind:'help' });
  }

  // ---- placement bar
  placeBar(show, name, ok, why){
    this.el.placeBar.classList.toggle('hidden', !show);
    if (!show) return;
    this.el.placeName.textContent = name;
    this.el.placeHint.textContent = ok ? 'Drag it, or tap where you want it' : (why || 'It will not fit there');
    this.el.placeOk.disabled = !ok;
  }

  // ---- level up cards (they can stack when a big order lands)
  levelUp(levels){
    this._lvlQueue = (this._lvlQueue || []).concat(levels);
    if (this.el.levelUp.classList.contains('hidden')) this._nextLevelCard();
  }

  _nextLevelCard(){
    const q = this._lvlQueue || [];
    if (!q.length) return;
    const lvl = q.shift();
    const unlocks = this.game.unlocksAt(lvl);
    this.el.lvlNum.textContent = lvl;
    this.el.lvlPurse.textContent = `The town council sends ${30 * lvl} coins.`;
    this.el.lvlUnlocks.innerHTML = unlocks.length
      ? unlocks.map(u => `<span>${u.emoji} ${esc(u.name)}</span>`).join('')
      : '<span>🌱 More room to grow</span>';
    this.el.levelUp.classList.remove('hidden');
  }

  welcomeBack(rep, away){
    const mins = Math.round(away / 60);
    const rows = [];
    if (rep.fields) rows.push(['🌾 Fields ready to pick', rep.fields]);
    if (rep.shelves) rows.push(['📦 Things waiting in workshops', rep.shelves]);
    if (rep.orders) rows.push(['🚁 Visitors on the helipad', rep.orders]);
    if (!rows.length) return false;
    this.el.welcomeBody.innerHTML =
      `<div class="row"><span>You were away</span><b>${mins < 60 ? mins + ' min' : F.clock(away)}</b></div>` +
      rows.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
    this.el.welcome.classList.remove('hidden');
    return true;
  }
}
