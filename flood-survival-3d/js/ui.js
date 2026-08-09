// ---------- All the DOM ----------
//
// Nothing in here knows about three.js, and nothing outside here touches an
// element. Panels are rendered as strings and wired by delegation on
// data-action, which keeps a shop screen to one readable block.
import {
  RES, RES_IDS, MATERIALS, MAT_IDS, PRODUCTS, TIERS, SATCHEL, NODES, DAY_SECONDS,
  matPrice, PROJECTS, projectRemaining,
} from './econ.js';
import { DAYS, SAFE_LINE, floodsOnDay } from './water.js';
import { RIM_Y, SITES } from './terrain.js';

const $ = (id) => document.getElementById(id);
const money = (n) => `$${n}`;

// Gauge range, in metres, from riverbed to well over the surge.
const G_LO = -2.5, G_HI = 12.6;
const gaugePct = (y) => `${((y - G_LO) / (G_HI - G_LO)) * 100}%`;

export class UI {
  constructor(){
    this.el = {
      boot: $('boot'), bootBar: $('boot').querySelector('.boot-bar i'), bootMsg: $('bootMsg'),
      hud: $('hud'), money: $('money'), dayNum: $('dayNum'), clock: $('clock'),
      wIco: $('wIco'), wText: $('wText'), objective: $('objective'),
      guide: $('guide'), guideArrow: $('guide').querySelector('i'), guideText: $('guideText'),
      gaugeFill: $('gaugeFill'), gaugeNum: $('gaugeNum'), markSafe: $('markSafe'), markRefuge: $('markRefuge'),
      satchel: $('satchel'), stamina: $('stamina'), staminaBar: $('stamina').querySelector('i'),
      prompt: $('prompt'), promptText: $('promptText'), holdBar: $('holdBar'),
      toasts: $('toasts'), pops: $('pops'),
      panel: $('panel'), panelTitle: $('panelTitle'), panelBody: $('panelBody'), panelClose: $('panelClose'),
      intro: $('intro'), introGo: $('introGo'), introSafe: $('introSafe'), introControls: $('introControls'),
      dayCard: $('dayCard'), dayCardNum: $('dayCardNum'), dayCardBody: $('dayCardBody'), dayCardGo: $('dayCardGo'),
      ending: $('ending'), endMark: $('endMark'), endTitle: $('endTitle'), endBody: $('endBody'), endAgain: $('endAgain'),
      underwater: $('underwater'), flash: $('flash'),
      stick: $('stick'), stickKnob: $('stick').querySelector('i'),
      btnAct: $('btnAct'), btnRun: $('btnRun'), btnClimb: $('btnClimb'),
      btnPlan: $('btnPlan'), btnSound: $('btnSound'), btnCog: $('btnCog'),
    };

    this.el.introSafe.textContent = SAFE_LINE.toFixed(1);
    this.el.introControls.textContent = matchMedia('(hover:hover) and (pointer:fine)').matches
      ? 'WASD to move · drag to look · Shift to run · E to use · Tab for your plan'
      : 'Left stick to move · drag the world to look · E button to use';

    this.el.markSafe.style.bottom = gaugePct(SAFE_LINE);
    this.el.markSafe.querySelector('span').textContent = `surge ${SAFE_LINE.toFixed(1)}`;

    this.el.panelClose.addEventListener('click', () => this.closePanel());
    this.el.panel.addEventListener('click', (e) => { if (e.target === this.el.panel) this.closePanel(); });
    this.el.panelBody.addEventListener('click', (e) => {
      const b = e.target.closest('[data-action]');
      if (!b || b.disabled) return;
      this.onAction?.(b.dataset.action, b.dataset.arg, Number(b.dataset.n || 1));
    });

    this.onClose = null;
    this.onAction = null;
    this.panelKind = null;
    this._toastSeen = new Map();
  }

  // ------------------------------------------------------------------ boot
  boot(pct, msg){
    this.el.bootBar.style.width = `${Math.round(pct * 100)}%`;
    if (msg) this.el.bootMsg.textContent = msg;
  }

  hideBoot(){ this.el.boot.classList.add('hidden'); }
  showHud(){ this.el.hud.classList.remove('hidden'); }

  showIntro(cb){
    this.el.intro.classList.remove('hidden');
    this.el.introGo.onclick = () => { this.el.intro.classList.add('hidden'); cb(); };
  }

  // ------------------------------------------------------------------ HUD
  hud(state, day, weather, level, refuge, staminaPct){
    const e = this.el;
    e.money.textContent = state.money;
    e.dayNum.textContent = Math.min(DAYS, Math.floor(day) + 1);

    const frac = day - Math.floor(day);
    e.clock.textContent = frac < 0.10 ? 'dawn' : frac < 0.30 ? 'morning'
      : frac < 0.42 ? 'midday' : frac < 0.58 ? 'afternoon'
      : frac < 0.70 ? 'sunset' : frac < 0.86 ? 'evening' : 'night';

    const w = weather.label();
    e.wIco.textContent = w.ico;
    e.wText.textContent = w.text;

    e.gaugeFill.style.height = gaugePct(level);
    e.gaugeNum.textContent = level.toFixed(1);
    e.markRefuge.style.bottom = gaugePct(refuge);
    e.markRefuge.querySelector('span').textContent = `you ${refuge.toFixed(1)}`;
    e.markRefuge.style.background = refuge >= SAFE_LINE ? 'var(--good)' : 'var(--amber)';

    // Satchel, only the lines that have something in them.
    const rows = RES_IDS.filter((id) => state.satchel[id] > 0)
      .map((id) => `<div class="sat"><span>${RES[id].ico}</span>${state.satchel[id]}</div>`);
    if (state.carried >= SATCHEL) rows.push('<div class="sat full">SATCHEL FULL</div>');
    e.satchel.innerHTML = rows.join('');

    e.staminaBar.style.width = `${staminaPct * 100}%`;
    e.stamina.classList.toggle('low', staminaPct < 0.3);

    const a = this.advice(state, day, refuge);
    e.objective.innerHTML = a.html;
    return a.goto;
  }

  /**
   * What to do next, and where it is. `goto` is a station id, or 'node' meaning
   * whichever gather site is nearest and still above water — main resolves that,
   * because only it knows where the player is standing.
   */
  advice(state, day, refuge){
    const say = (html, goto) => ({ html, goto });

    if (state.houseDone) return say('The roof platform is up. <b>Climb it before the surge.</b>', 'house');
    if (state.boatDone) return say('The boat floats. <b>Be aboard on the last night.</b>', 'boat');

    // Before the first sale, walk them through it. $10 buys nothing at the depot,
    // so pointing at the build site first would be advice they cannot take.
    if (state.sales === 0){
      if (state.carried < 3 && state.shelfCount() === 0 && state.crafts.length === 0){
        return say('First job: follow the arrow and <b>hold E to gather</b>.', 'node');
      }
      if (state.shelfCount() === 0 && state.crafts.length === 0){
        return say('Now <b>press E at your stall</b> and make something to sell.', 'stall');
      }
      return say('Stay near the stall — <b>a neighbour will come and buy it.</b>', 'stall');
    }

    if (state.money < 6 && state.carried === 0 && state.shelfCount() === 0){
      return say('Broke. <b>Hold E at a gather site</b> to fill your satchel, then make something at your stall.', 'node');
    }
    if (state.carried >= SATCHEL) return say('Satchel full. <b>Take it to your stall.</b>', 'stall');
    if (state.shelfCount() > 0 && state.tier === 0 && state.money >= TIERS[1].cost){
      return say(`${money(state.money)} banked. <b>Upgrade your stall to a Handcart.</b>`, 'stall');
    }
    if (state.crafts.length === 0 && state.carried >= 3){
      return say('You have materials. <b>Start something at your stall.</b>', 'stall');
    }

    if (state.houseStage === 0 && state.boatStage === 0){
      return say(`Day ${Math.floor(day) + 1} of ${DAYS} and nothing built. <b>Pick the house or the boat</b>, then buy the timber for stage 1.`, 'house');
    }
    if (refuge < SAFE_LINE){
      const which = state.boatStage > 0 ? 'boat' : 'house';
      const short = Object.entries(state.missingFor(which) || {})
        .map(([id, n]) => `${n}× ${MATERIALS[id].name}`);
      if (short.length){
        return state.money >= 12
          ? say(`Next: <b>${state.nextStage(which).name}</b> — buy ${short.join(', ')} from Marv.`, 'depot')
          : say(`Next: <b>${state.nextStage(which).name}</b> — needs ${short.join(', ')}. Earn it at the stall.`, 'stall');
      }
      return say(`The timber is on site. <b>Hold E to build the ${state.nextStage(which).name}.</b>`, which);
    }
    return say('Keep the money coming in.', 'stall');
  }

  /** Point at something. `bearing` is degrees clockwise from straight ahead. */
  guide(bearing, label, dist){
    const g = this.el.guide;
    if (label == null){ g.classList.add('hidden'); return; }
    g.classList.remove('hidden');
    this.el.guideArrow.style.transform = `rotate(${bearing}deg)`;
    this.el.guideText.textContent = `${label} · ${Math.round(dist)}m`;
  }

  setPrompt(text, hold = null){
    this.el.prompt.classList.remove('hidden');
    this.el.promptText.textContent = text;
    this.el.holdBar.parentElement.style.display = hold === null ? 'none' : '';
    if (hold !== null) this.el.holdBar.style.width = `${hold * 100}%`;
  }

  clearPrompt(){ this.el.prompt.classList.add('hidden'); }

  toast(msg, kind = ''){
    // Collapse repeats — gathering fires a lot.
    const last = this._toastSeen.get(msg) || 0;
    const now = performance.now();
    if (now - last < 900) return;
    this._toastSeen.set(msg, now);

    const d = document.createElement('div');
    d.className = `toast ${kind}`;
    d.textContent = msg;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.remove(), 2600);
  }

  /** Floating number at a screen position, for sales. */
  pop(text, x, y){
    const d = document.createElement('div');
    d.className = 'pop';
    d.textContent = text;
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.style.transform = 'translate(-50%,0)';
    this.el.pops.appendChild(d);
    setTimeout(() => d.remove(), 1300);
  }

  submerged(on){ this.el.underwater.style.opacity = on ? 1 : 0; }
  flash(v){ this.el.flash.style.opacity = String(Math.min(0.55, v * 0.5)); }

  // ------------------------------------------------------------------ panels
  open(kind, title, html, onAction){
    this.panelKind = kind;
    this.el.panelTitle.textContent = title;
    this.el.panelBody.innerHTML = html;
    this.el.panelBody.scrollTop = 0;
    this.onAction = onAction;
    this.el.panel.classList.remove('hidden');
  }

  /** Re-render the open panel in place, keeping the scroll position. */
  refresh(html){
    if (this.el.panel.classList.contains('hidden')) return;
    const top = this.el.panelBody.scrollTop;
    this.el.panelBody.innerHTML = html;
    this.el.panelBody.scrollTop = top;
  }

  closePanel(){
    if (this.el.panel.classList.contains('hidden')) return;
    this.el.panel.classList.add('hidden');
    this.panelKind = null;
    this.onAction = null;
    this.onClose?.();
  }

  get panelOpen(){ return !this.el.panel.classList.contains('hidden'); }

  // -------------------------------------------------- your business
  stallHtml(state){
    const t = state.tierInfo;
    const busy = state.crafts.length;

    const benches = state.crafts.map((c) => {
      const p = PRODUCTS.find((q) => q.id === c.id);
      return `<div class="item">
        <div class="ico">${p.ico}</div>
        <div><div class="name">${p.name}</div>
          <div class="sub">${Math.max(0, c.secs - c.t).toFixed(0)}s left</div>
          <div class="bar"><i style="width:${(c.t / c.secs) * 100}%"></i></div></div>
        <div class="act"><span class="tag">working</span></div>
      </div>`;
    }).join('');

    const idle = Array.from({ length: t.slots - busy }, () =>
      '<div class="item dim"><div class="ico">▫️</div><div><div class="name">Free bench</div>'
      + '<div class="sub">Pick something to make below.</div></div><div class="act"></div></div>').join('');

    const shelf = Object.entries(state.shelf).filter(([, n]) => n > 0).map(([id, n]) => {
      const p = PRODUCTS.find((q) => q.id === id);
      return `<span class="tag have">${p.ico} ${p.name} ×${n} · ${money(state.priceOf(id))}</span>`;
    }).join('');

    const makeable = PRODUCTS.map((p) => {
      const why = state.canCraft(p);
      const locked = p.tier > state.tier + 1;
      const cost = Object.entries(p.cost)
        .map(([id, q]) => `<em>${state.satchel[id]}/${q}</em> ${RES[id].ico}`).join('  ');
      return `<div class="item ${why ? 'dim' : ''}">
        <div class="ico">${p.ico}</div>
        <div><div class="name">${p.name} · ${money(Math.round(p.price * t.mult))}</div>
          <div class="sub">${cost} · ${p.secs}s${locked ? ' · needs a better shop' : ''}<br>${p.blurb}</div></div>
        <div class="act"><button class="pill" data-action="craft" data-arg="${p.id}" ${why ? 'disabled' : ''}>Make</button></div>
      </div>`;
    }).join('');

    const next = TIERS[state.tier + 1];
    const upgrade = next ? `<div class="item">
        <div class="ico">${next.ico}</div>
        <div><div class="name">${next.name} · ${money(next.cost)}</div>
          <div class="sub">${next.blurb}<br>${next.slots} benches · ×${next.mult.toFixed(2)} prices · a customer every ${next.custEvery}s</div></div>
        <div class="act"><button class="pill" data-action="upgrade" ${state.money < next.cost ? 'disabled' : ''}>Buy</button></div>
      </div>` : '<p class="blurb">You have the best shop in the valley.</p>';

    return `
      <p class="blurb"><b>${t.ico} ${t.name}</b> — ${t.slots} bench${t.slots > 1 ? 'es' : ''},
        prices ×${t.mult.toFixed(2)}, a customer roughly every ${t.custEvery}s while there is stock.
        You have made ${state.sales} sale${state.sales === 1 ? '' : 's'} for ${money(state.earned)}.</p>

      <div class="section">On the bench</div>
      ${benches}${idle}

      <div class="section">On the shelf${shelf ? '' : ' — empty, so nobody stops'}</div>
      <div class="tally">${shelf || '<span class="tag short">nothing to sell</span>'}</div>

      <div class="section">Make something</div>
      ${makeable}

      <div class="section">Grow the business</div>
      ${upgrade}`;
  }

  // -------------------------------------------------- depot
  depotHtml(state, day){
    const rows = MAT_IDS.map((id) => {
      const m = MATERIALS[id];
      const price = matPrice(id, day);
      const can = state.money >= price;
      return `<div class="item ${can ? '' : 'dim'}">
        <div class="ico">${m.ico}</div>
        <div><div class="name">${m.name} · ${money(price)}</div>
          <div class="sub">You have <em>${state.stock[id]}</em> at the build site.</div></div>
        <div class="act qty">
          <button class="pill" data-action="buy" data-arg="${id}" data-n="1" ${can ? '' : 'disabled'}>×1</button>
          <button class="pill ghost" data-action="buy" data-arg="${id}" data-n="5" ${state.money >= price * 5 ? '' : 'disabled'}>×5</button>
        </div>
      </div>`;
    }).join('');

    const raw = RES_IDS.filter((id) => state.satchel[id] > 0).map((id) => `
      <div class="item">
        <div class="ico">${RES[id].ico}</div>
        <div><div class="name">${RES[id].name} ×${state.satchel[id]}</div>
          <div class="sub">Marv pays ${money(RES[id].sell)} each. Your stall pays far better.</div></div>
        <div class="act"><button class="pill ghost" data-action="sellraw" data-arg="${id}">Sell ${money(state.satchel[id] * RES[id].sell)}</button></div>
      </div>`).join('');

    return `
      <p class="blurb">“Everyone wants timber this week, so everyone pays more for it.”
        Prices are up <b>${Math.round(5.5 * day)}%</b> on Monday and will keep climbing.
        Anything you buy is carted straight to your build site.</p>

      <div class="section">Timber & sundries</div>
      ${rows}

      ${raw ? `<div class="section">Sell raw materials</div>${raw}` : ''}`;
  }

  // -------------------------------------------------- a project
  projectHtml(which, state, day, padY){
    const proj = PROJECTS[which];
    const i = state.stageOf(which);
    const done = i >= proj.stages.length;
    // Absolute heights are always pad + stand, never a second hardcoded number.
    const stands = (s) => (s.stand ? ` — stands ${(padY + s.stand).toFixed(1)}m` : '');

    const stages = proj.stages.map((s, k) => {
      const state_ = k < i ? 'built' : k === i ? 'next' : 'later';
      const need = Object.entries(s.need).map(([id, q]) => {
        const have = state.stock[id];
        const cls = k < i ? 'have' : have >= q ? 'have' : 'short';
        return `<span class="tag ${cls}">${MATERIALS[id].ico} ${MATERIALS[id].name} ${k < i ? q : `${have}/${q}`}</span>`;
      }).join('');
      return `<div class="item ${state_ === 'later' ? 'dim' : ''}">
        <div class="ico">${k < i ? '✅' : k === i ? '🔨' : '▫️'}</div>
        <div><div class="name">${k + 1}. ${s.name}${stands(s)}</div>
          <div class="sub">${s.note} · ${s.work}s of work</div>
          <div class="tally">${need}</div></div>
        <div class="act"></div>
      </div>`;
    }).join('');

    let footer;
    if (done){
      footer = which === 'boat'
        ? '<p class="blurb">Finished. She sits on the slip and will lift the moment the water reaches her.</p>'
        : `<p class="blurb">Finished. The roof platform stands at
           ${(padY + proj.stages[3].stand).toFixed(1)}m — clear of the ${SAFE_LINE.toFixed(1)}m surge.</p>`;
    } else {
      const missing = state.missingFor(which);
      const short = Object.entries(missing).map(([id, n]) =>
        `${n}× ${MATERIALS[id].name} (${money(n * matPrice(id, day))})`);
      footer = short.length
        ? `<p class="blurb">Still short: <b>${short.join(', ')}</b>. Buy it from Marv's barge on the river.</p>`
        : `<p class="blurb">Everything is here. <b>Hold E at the site</b> to put in the
           ${proj.stages[i].work} seconds of work.</p>`;
    }

    return `<p class="blurb">${proj.blurb}</p><div class="section">Stages</div>${stages}${footer}`;
  }

  // -------------------------------------------------- plan / help / tent
  planHtml(state, day, level, refuge){
    const houseLeft = state.houseDone ? 0 : this._cost('house', state, day);
    const boatLeft = state.boatDone ? 0 : this._cost('boat', state, day);
    const daysLeft = (DAYS - day).toFixed(1);

    // Read the altitudes straight off the terrain, so this table can never lie
    // about which site drowns first.
    const nodes = Object.keys(NODES).map((site) => {
      const y = SITES[site].y;
      const gone = level > y + 1.0;
      return `<div class="row ${gone ? 'bad' : ''}">
        <span>${RES[NODES[site].res].name} at ${SITES[site].label}
          <small style="color:var(--dim)">${y.toFixed(1)}m</small></span>
        <b>${gone ? 'under water' : `goes under day ${Math.ceil(floodsOnDay(y))}`}</b></div>`;
    }).join('');

    return `
      <div class="rows">
        <div class="row"><span>Water now</span><b>${level.toFixed(1)} m</b></div>
        <div class="row ${refuge >= SAFE_LINE ? 'good' : 'bad'}">
          <span>Highest you can stand</span><b>${refuge.toFixed(1)} m</b></div>
        <div class="row bad"><span>The surge, end of day ${DAYS}</span><b>${SAFE_LINE.toFixed(1)} m</b></div>
        <div class="row"><span>Time left</span><b>${daysLeft} days</b></div>
        <div class="row"><span>Money</span><b>${money(state.money)}</b></div>
      </div>

      <div class="section">Two ways out</div>
      <div class="choice">
        <div><h3>🏠 ${PROJECTS.house.name}</h3>
          <p>${PROJECTS.house.blurb}<br><br>Stage ${state.houseStage}/4 ·
          <b>${state.houseDone ? 'done' : `${money(houseLeft)} of timber to go`}</b></p></div>
        <div><h3>⛵ ${PROJECTS.boat.name}</h3>
          <p>${PROJECTS.boat.blurb}<br><br>Stage ${state.boatStage}/4 ·
          <b>${state.boatDone ? 'done' : `${money(boatLeft)} of timber to go`}</b></p></div>
      </div>

      <div class="section">What the water takes next</div>
      <div class="rows">${nodes}
        <div class="row"><span>Your homestead pad
          <small style="color:var(--dim)">${SITES.homestead.y.toFixed(1)}m</small></span>
          <b>day ${Math.ceil(floodsOnDay(SITES.homestead.y))}</b></div>
        <div class="row"><span>Cedar Ridge, highest ground
          <small style="color:var(--dim)">${RIM_Y.toFixed(1)}m</small></span>
          <b>day ${Math.ceil(floodsOnDay(RIM_Y))}</b></div>
      </div>`;
  }

  /** What the rest of a project costs at today's prices, net of timber on site. */
  _cost(which, state, day){
    return projectRemaining(PROJECTS[which], state.stageOf(which), state.stock, day).money;
  }

  helpHtml(soundOn){
    const touch = !matchMedia('(hover:hover) and (pointer:fine)').matches;
    return `
      <p class="blurb">The arrow under your objective always points at the next thing
        to do, and tells you how far it is. If you only remember one thing: <b>the amber
        line at the top of the screen is your next job.</b></p>

      <div class="section">Do this first</div>
      <div class="rows">
        <div class="row"><span><b>1.</b> Follow the arrow to a gather site and <b>hold E</b></span><b>free materials</b></div>
        <div class="row"><span><b>2.</b> Walk back to your <b>stall</b> and press E — make a Sandbag</span><b>$6 each</b></div>
        <div class="row"><span><b>3.</b> Wait for a neighbour to buy it, then make more</span><b>money</b></div>
        <div class="row"><span><b>4.</b> Swim out to <b>Marv's barge</b> and buy beams and nails</span><b>timber</b></div>
        <div class="row"><span><b>5.</b> Hold E at the <b>house site</b> or the <b>boat slip</b></span><b>build it</b></div>
      </div>

      <div class="section">Controls</div>
      <div class="rows">
        <div class="row"><span>Move</span><b>${touch ? 'left stick' : 'W A S D or arrow keys'}</b></div>
        <div class="row"><span>Look around</span><b>drag the world${touch ? '' : ' · wheel to zoom'}</b></div>
        <div class="row"><span>Run</span><b>${touch ? 'RUN button' : 'hold Shift'}</b></div>
        <div class="row"><span>Use a place</span><b>tap ${touch ? 'the E button' : 'E'}</b></div>
        <div class="row"><span>Gather or build</span><b>hold ${touch ? 'the E button' : 'E'}</b></div>
        <div class="row"><span>Climb a ladder / board the boat</span><b>${touch ? 'the ⬆ button' : 'C'}</b></div>
        <div class="row"><span>Your plan and the flood table</span><b>${touch ? '📋 button' : 'Tab'}</b></div>
      </div>

      <div class="section">The five places</div>
      <div class="rows">
        <div class="row"><span>🪧 Your stall</span><b>make and sell — your only income</b></div>
        <div class="row"><span>🛒 Marv's depot, on the river</span><b>buy timber</b></div>
        <div class="row"><span>🏠 House site · ⛵ Boat slip</span><b>hold E to build</b></div>
        <div class="row"><span>🌾🧱🔩🪵 Four gather sites</span><b>free, until they flood</b></div>
        <div class="row"><span>⛺ Tent</span><b>sleep to dawn, if you are spent</b></div>
      </div>

      <div class="section">Things worth knowing</div>
      <p class="blurb">
        <b>Customers only stop if something is finished on the shelf.</b> An empty stall
        earns nothing, so leave it stocked before you wander off.<br><br>
        <b>The low ground floods first.</b> Reeds go under around day 3, scrap day 4.
        Whatever you did not carry out is gone for good — so the early days are worth
        more than the late ones.<br><br>
        <b>Deep water costs stamina.</b> Run the bar out mid-swim and the current takes
        you back to the tent, and everything in your satchel with it. Your satchel holds
        ${SATCHEL}.<br><br>
        <b>Cedar Ridge will not save you.</b> The whole valley goes under. It is the boat
        or the roof platform, and nothing else.
      </p>

      <div class="section">Settings</div>
      <div class="item">
        <div class="ico">${soundOn ? '🔊' : '🔇'}</div>
        <div><div class="name">Sound</div><div class="sub">Rain, thunder, hammering and the till.</div></div>
        <div class="act"><button class="pill ghost" data-action="sound">${soundOn ? 'Turn off' : 'Turn on'}</button></div>
      </div>
      <div class="item">
        <div class="ico">↺</div>
        <div><div class="name">Start over</div><div class="sub">Back to day 1 with $10. There is no undo.</div></div>
        <div class="act"><button class="pill ghost" data-action="restart">Restart</button></div>
      </div>

      <p class="tiny">A day is ${DAY_SECONDS} seconds. ${DAYS} of them, and then the surge.</p>`;
  }

  tentHtml(state, day){
    const till = 1 - (day - Math.floor(day));
    return `
      <p class="blurb">Your tent, for as long as the pad stays dry.</p>
      <div class="rows">
        <div class="row"><span>Day</span><b>${Math.floor(day) + 1} of ${DAYS}</b></div>
        <div class="row"><span>Sleeping costs</span><b>${(till * 100).toFixed(0)}% of a day</b></div>
        <div class="row bad"><span>The water will rise</span><b>while you sleep</b></div>
      </div>
      <p class="blurb">Sleeping puts you at dawn with full stamina and refilled gather
        sites — but the flood gets those hours too. Only worth it when you are spent
        and there is nothing on the bench.</p>
      <button class="pill" data-action="sleep" style="width:100%;padding:13px">Sleep until dawn</button>
      ${state.crafts.length ? '<p class="blurb">⚠️ You have work on the bench. It will finish while you sleep.</p>' : ''}`;
  }

  // ------------------------------------------------------------------ cards
  dayCard(dayIndex, rows, note, cb){
    this.el.dayCardNum.textContent = `Day ${dayIndex + 1} of ${DAYS}`;
    this.el.dayCardBody.innerHTML = `<div class="rows">${rows}</div><p class="note">${note}</p>`;
    this.el.dayCard.classList.remove('hidden');
    this.el.dayCardGo.onclick = () => { this.el.dayCard.classList.add('hidden'); cb(); };
  }

  ending(kind, state, refuge, cb){
    const E = {
      boat: { mark: '⛵', title: 'You float out',
        body: `The surge came through at ${SAFE_LINE.toFixed(1)} metres and lifted the boat clean
               off the slip. You watched the ridge go under from the water, which is not something
               you will forget.` },
      house: { mark: '🏠', title: 'The house holds',
        body: `Water to the eaves and you sat above it on the platform, dry, with everything you
               own underneath you. The valley is a lake. Your stall is still on the deck.` },
      wet: { mark: '🪜', title: 'Wet feet, still here',
        body: `You made ${refuge.toFixed(1)} metres of high ground and the surge came in at
               ${SAFE_LINE.toFixed(1)}. It was close, and cold, and you spent the night holding
               a rafter — but morning came and you were still on it.` },
      lost: { mark: '🌊', title: 'The valley won',
        body: `Nothing you built stood higher than ${refuge.toFixed(1)} metres, and the water came
               to ${SAFE_LINE.toFixed(1)}. A rescue boat found you in a cedar on the ridge at first
               light. Everything else is under the lake.` },
    }[kind];

    this.el.endMark.textContent = E.mark;
    this.el.endTitle.textContent = E.title;
    this.el.endBody.innerHTML = `
      <p class="lede">${E.body}</p>
      <div class="rows">
        <div class="row"><span>Business</span><b>${state.tierInfo.name}</b></div>
        <div class="row good"><span>Sales</span><b>${state.sales} for ${money(state.earned)}</b></div>
        <div class="row"><span>House</span><b>stage ${state.houseStage} of 4</b></div>
        <div class="row"><span>Boat</span><b>stage ${state.boatStage} of 4</b></div>
        <div class="row"><span>Money left</span><b>${money(state.money)}</b></div>
        ${state.sweptAway ? `<div class="row bad"><span>Lost to the current</span><b>${state.sweptAway} materials</b></div>` : ''}
      </div>`;
    this.el.ending.classList.remove('hidden');
    this.el.endAgain.onclick = () => { this.el.ending.classList.add('hidden'); cb(); };
  }

  // ------------------------------------------------------------------ stick
  /** Virtual thumbstick. Reports -1..1 on each axis. */
  bindStick(onMove){
    const el = this.el.stick, knob = this.el.stickKnob;
    let id = null;
    const R = 34;

    const set = (dx, dy) => {
      const d = Math.hypot(dx, dy);
      const k = d > R ? R / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      onMove(Math.max(-1, Math.min(1, dx / R)), Math.max(-1, Math.min(1, dy / R)));
    };

    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId;
      el.setPointerCapture(id);
      const r = el.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    el.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      const r = el.getBoundingClientRect();
      set(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    });
    const up = (e) => {
      if (e.pointerId !== id) return;
      id = null;
      knob.style.transform = '';
      onMove(0, 0);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }
}
