// UI: draws the state from game.js and turns taps into game actions.
import { CROPS, CROP, RIVALS, RIVAL, BUILDINGS, MAX_PLOTS, DAY_LENGTH, plotBase } from './data.js';
import * as G from './game.js';

const $ = id => document.getElementById(id);
const fmt = n => Math.round(n).toLocaleString();
const fmtTime = s => (s >= 60 ? `${Math.floor(s / 60)}m${Math.round(s % 60) ? ` ${Math.round(s % 60)}s` : ''}` : `${Math.round(s)}s`);

const fresh = G.load();
let tab = 'market';
let focusCrop = null;      // crop picked on the market board to price-check

// ---------------------------------------------------------------- helpers

function toast(text, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  $('toasts').appendChild(el);
  setTimeout(() => el.remove(), 2600);
  while ($('toasts').children.length > 3) $('toasts').firstChild.remove();
}

function floatText(text, x, y, color) {
  const el = document.createElement('div');
  el.className = 'float';
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  if (color) el.style.color = color;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

// Only touch the DOM when the markup actually changed, so buttons aren't
// swapped out from under a finger mid-tap.
const lastHtml = {};
function setHtml(id, html) {
  if (lastHtml[id] === html) return;
  lastHtml[id] = html;
  $(id).innerHTML = html;
}

// ---------------------------------------------------------------- header

let shownCoins = null;
function drawHeader() {
  if (shownCoins !== null && shownCoins !== G.S.coins) {
    $('coins').parentElement.classList.remove('bump');
    void $('coins').offsetWidth;
    $('coins').parentElement.classList.add('bump');
  }
  shownCoins = G.S.coins;
  $('coins').textContent = fmt(G.S.coins);
  $('day').textContent = G.S.day;
  $('daybar').style.width = `${(G.S.dayT / DAY_LENGTH) * 100}%`;
  $('storage').textContent = `${G.shedCount()}/${G.storageCap()}`;
  $('stallcount').textContent = `${G.stallCount()}/${G.stallCap()}`;
  $('news').textContent = `🗞️ ${G.S.news}`;
  $('plotcount').textContent = `${G.S.plots.length}/${MAX_PLOTS} plots`;
}

// ---------------------------------------------------------------- farm

function drawSeeds() {
  const html = CROPS.map(c => {
    const locked = !G.cropUnlocked(c);
    const cls = ['seed', c.exotic && 'exotic', locked && 'locked', G.S.seed === c.id && 'on', G.S.coins < c.seed && 'poor']
      .filter(Boolean).join(' ');
    const title = locked
      ? `${c.name} — needs a ${c.tier === 1 ? 'Greenhouse' : 'Tropical Dome'}`
      : `${c.name}: seed ${c.seed} coins, grows in ${fmtTime(c.grow / G.growSpeed())}, sells around ${fmt(G.S.fair[c.id])}`;
    return `<button class="${cls}" data-seed="${c.id}" title="${title}">
      <span class="e">${locked ? '🔒' : c.emoji}</span>
      <span class="c">🪙${c.seed} · ${fmtTime(c.grow / G.growSpeed())}</span></button>`;
  }).join('');
  setHtml('seeds', html);
}

let plotEls = [];
function buildField() {
  const field = $('field');
  field.innerHTML = '';
  plotEls = G.S.plots.map((_, i) => {
    const b = document.createElement('button');
    b.className = 'plot';
    b.dataset.i = i;
    b.innerHTML = '<span class="tag"></span><span class="plant"></span><span class="bar"><i></i></span>';
    field.appendChild(b);
    return { b, tag: b.children[0], plant: b.children[1], bar: b.children[2], fill: b.children[2].firstChild, state: '' };
  });
}

const STAGES = ['🌱', '🌿', '🪴'];
function drawField() {
  if (plotEls.length !== G.S.plots.length) buildField();
  const now = Date.now();
  G.S.plots.forEach((p, i) => {
    const el = plotEls[i];
    let state, glyph, tag = '';
    if (!p.crop) {
      state = 'empty'; glyph = '＋';
    } else {
      const t = G.plotProgress(p, now);
      const c = CROP[p.crop];
      if (t >= 1) { state = 'ready'; glyph = c.emoji; tag = c.name; } else {
        state = 'grow';
        glyph = t < 0.6 ? STAGES[Math.min(2, Math.floor(t * 5))] : c.emoji;
        const left = Math.ceil((1 - t) * p.dur);
        tag = `${c.emoji} ${fmtTime(left)}`;
      }
      el.fill.style.width = `${t * 100}%`;
    }
    if (!el.b.classList.contains(state)) el.b.className = `plot ${state}`;
    if (el.plant.textContent !== glyph) el.plant.textContent = glyph;
    if (el.tag.textContent !== tag) el.tag.textContent = tag;
    el.bar.style.display = state === 'grow' ? '' : 'none';
    el.b.title = !p.crop ? `Plant ${CROP[G.S.seed].name}` : state === 'ready' ? `Harvest ${CROP[p.crop].name}` : 'Growing…';
  });
}

// ---------------------------------------------------------------- market

function priceChip(cropId) {
  const low = G.lowestRival(cropId);
  return low == null ? '<span class="muted">none</span>' : `🪙${fmt(low)}`;
}

function trendArrow(id) {
  const t = G.S.trend[id];
  return t > 0 ? '<span class="up">▲</span>' : t < 0 ? '<span class="down">▼</span>' : '<span class="muted">·</span>';
}

function forecastBox(cropId, price) {
  const { share, perDay } = G.forecast(cropId, price);
  const fair = G.S.fair[cropId];
  let cls, txt;
  if (share <= 0.001) { cls = 'none'; txt = price > fair * 1.3 ? 'Too pricey — no shopper will pay that.' : 'Other stalls are cheaper — you won\'t sell until they run out.'; }
  else if (share > 0.45) { cls = 'fast'; txt = 'Selling fast!'; }
  else if (share > 0.2) { cls = 'ok'; txt = 'Selling steadily.'; }
  else { cls = 'slow'; txt = 'Selling slowly.'; }
  const perDayTxt = share > 0.001 ? ` About <b>${perDay < 1 ? '<1' : Math.round(perDay)}</b> a day at this price.` : '';
  return `<div class="forecast ${cls}">${cls === 'fast' ? '🚀' : cls === 'ok' ? '👍' : cls === 'slow' ? '🐌' : '🚫'} ${txt}${perDayTxt}</div>`;
}

function sellCard(c) {
  const inShed = G.S.shed[c.id] || 0;
  const lst = G.S.stall[c.id];
  const onStall = lst ? lst.qty : 0;
  const price = G.priceOf(c.id);
  const comps = G.competitors(c.id);
  const low = comps.length ? comps[0].price : null;
  const fair = G.S.fair[c.id];
  const profit = price - c.seed;
  const chips = [
    `<span class="chip guide" title="What the town thinks it's worth today">📋 Guide 🪙${fmt(fair)} ${trendArrow(c.id)}</span>`,
    ...comps.map((x, k) => `<span class="chip ${k === 0 ? 'low' : ''}" title="${x.rival.name} has ${x.qty} for sale">${x.rival.emoji} ${x.rival.name} 🪙${fmt(x.price)} ×${x.qty}</span>`),
    onStall ? `<span class="chip you">🧑‍🌾 You 🪙${fmt(price)} ×${onStall}</span>` : '',
  ].join('');
  return `<div class="sell">
    <div class="sell-head">
      <span class="e">${c.emoji}</span>
      <div><div class="n">${c.name}${c.exotic ? ' <span class="xo">✦ exotic</span>' : ''}</div>
        <div class="margin">Seed 🪙${c.seed} → profit <b class="${profit > 0 ? 'up' : 'down'}">${profit >= 0 ? '+' : ''}${fmt(profit)}</b> each</div></div>
      <div class="q">storage <b>${inShed}</b><br>on stall <b>${onStall}</b></div>
    </div>
    <div class="comp">${comps.length ? '' : '<span class="chip">No other farmer is selling these today!</span>'}${chips}</div>
    <div class="pricer">
      <span class="muted">Your price</span>
      <button class="step" data-price="${c.id}" data-d="-5" title="-5">−5</button>
      <button class="step" data-price="${c.id}" data-d="-1" title="-1">−</button>
      <span class="val">🪙${fmt(price)}</span>
      <button class="step" data-price="${c.id}" data-d="1" title="+1">+</button>
      <button class="step" data-price="${c.id}" data-d="5" title="+5">+5</button>
    </div>
    <div class="quick">
      ${low != null ? `<button class="btn small" data-set="${c.id}" data-v="${low}">Match lowest (${fmt(low)})</button>
      <button class="btn small" data-set="${c.id}" data-v="${Math.max(1, low - 1)}">Undercut (${fmt(Math.max(1, low - 1))})</button>` : ''}
      <button class="btn small" data-set="${c.id}" data-v="${Math.round(fair)}">Guide price (${fmt(fair)})</button>
      ${comps.length ? '' : `<button class="btn small" data-set="${c.id}" data-v="${Math.round(fair * 1.25)}">Premium (${fmt(fair * 1.25)})</button>`}
    </div>
    ${forecastBox(c.id, price)}
    <div class="sendrow">
      <button class="btn green small" data-send="${c.id}" data-n="1" ${inShed ? '' : 'disabled'}>Send 1 →</button>
      <button class="btn green small" data-send="${c.id}" data-n="5" ${inShed ? '' : 'disabled'}>Send 5 →</button>
      <button class="btn green small" data-send="${c.id}" data-n="999" ${inShed ? '' : 'disabled'}>Send all →</button>
      <button class="btn small" data-back="${c.id}" ${onStall ? '' : 'disabled'}>← Take back</button>
    </div>
  </div>`;
}

function drawMarket() {
  const mine = CROPS.filter(c => (G.S.shed[c.id] || 0) + (G.S.stall[c.id] ? G.S.stall[c.id].qty : 0) > 0 || focusCrop === c.id);
  const today = G.S.today;
  let html = '';

  html += `<h3 class="section-title">🧺 Your stall</h3>`;
  if (!mine.length) {
    html += `<p class="muted">Nothing to sell yet. Harvest some crops, then send them here. Tap any crop on the price board below to check the competition first.</p>`;
  } else {
    html += mine.map(sellCard).join('');
  }
  html += `<p class="muted">Sold today: <b>${today.sold}</b> for 🪙<b>${fmt(today.earned)}</b>. Shoppers pick the cheapest stall they can afford, so watch your rivals!</p>`;

  html += `<h3 class="section-title">📊 Price board — today's market</h3>
    <table class="board"><thead><tr>
      <th>Crop</th><th class="num">Seed</th><th class="num">Guide</th><th class="num">Cheapest rival</th><th class="num">Shoppers/day</th>
    </tr></thead><tbody>`;
  html += CROPS.map(c => {
    const have = (G.S.shed[c.id] || 0) + (G.S.stall[c.id] ? G.S.stall[c.id].qty : 0);
    const cls = [have && 'mine', !G.cropUnlocked(c) && 'locked'].filter(Boolean).join(' ');
    return `<tr class="${cls}" data-focus="${c.id}" style="cursor:pointer">
      <td>${c.emoji} ${c.name}${c.exotic ? ' <span class="xo">✦</span>' : ''}</td>
      <td class="num">${c.seed}</td>
      <td class="num">${fmt(G.S.fair[c.id])} ${trendArrow(c.id)}</td>
      <td class="num">${priceChip(c.id)}</td>
      <td class="num">~${Math.round(c.demand * G.demandMult())}</td></tr>`;
  }).join('');
  html += `</tbody></table><p class="muted">✦ = exotic. They cost more to grow, but sell for much more — and fewer farmers compete for them.</p>`;
  setHtml('tab-market', html);
}

// ---------------------------------------------------------------- land

function dealTag(factor) {
  if (factor < 0.92) return '<span class="deal good">bargain</span>';
  if (factor > 1.12) return '<span class="deal bad">pricey</span>';
  return '<span class="deal fair">fair</span>';
}

function drawLand() {
  const full = G.S.plots.length >= MAX_PLOTS;
  let html = `<h3 class="section-title">🗺️ Land for sale</h3>
    <p class="muted">You own <b>${G.S.plots.length}</b> of ${MAX_PLOTS} possible plots. Farmers put land up for sale each morning — offers vanish at the end of the day. A normal plot is worth about 🪙${fmt(plotBase(G.S.plots.length))} right now.</p>`;
  if (!G.S.offers.length) html += `<p class="muted">No farmers are selling today. Check back tomorrow!</p>`;
  html += G.S.offers.map(o => {
    const r = RIVAL[o.rival];
    const cost = G.offerPrice(o);
    const tooBig = G.S.plots.length + o.plots > MAX_PLOTS;
    return `<div class="row"><span class="e">${r.emoji}</span>
      <div class="info"><b>${r.name} is selling ${o.plots} plot${o.plots > 1 ? 's' : ''} ${dealTag(o.factor)}</b>
      <span>${o.plots > 1 ? `About 🪙${fmt(cost / o.plots)} a plot. ` : ''}${r.name} has ${G.S.rivalPlots[o.rival]} plots left.</span></div>
      <div class="price"><button class="btn gold" data-offer="${o.id}" ${tooBig || G.S.coins < cost ? 'disabled' : ''}>🪙${fmt(cost)}</button></div></div>`;
  }).join('');
  html += `<div class="row"><span class="e">🏛️</span>
    <div class="info"><b>Council plot</b><span>Always for sale, one at a time — but it costs 50% more than a fair farmer's price.</span></div>
    <div class="price"><button class="btn" data-council ${full || G.S.coins < G.councilPrice() ? 'disabled' : ''}>🪙${fmt(G.councilPrice())}</button></div></div>`;

  html += `<h3 class="section-title">🧑‍🌾 The other farmers</h3><div class="rivals">`;
  html += RIVALS.map(r => `<div class="rival"><b>${r.emoji} ${r.name}</b><br>${r.blurb}<br>
    <span class="muted">Grows: ${r.grows.map(id => CROP[id].emoji).join(' ')}</span></div>`).join('');
  html += '</div>';
  setHtml('tab-land', html);
}

// ---------------------------------------------------------------- build

function drawBuild() {
  const html = `<h3 class="section-title">🔨 Build & buy</h3>` + BUILDINGS.map(b => {
    const n = G.S.built[b.id];
    const maxed = n >= b.max;
    const cost = G.buildingCost(b);
    const blocked = b.needs && !G.S.built[b.needs];
    const count = b.max > 1 ? ` <small class="muted">(${n}/${b.max})</small>` : '';
    return `<div class="row ${maxed ? 'done' : ''}"><span class="e">${b.emoji}</span>
      <div class="info"><b>${b.name}${count}</b><span>${b.text}${blocked ? ` Needs the ${BUILDINGS.find(x => x.id === b.needs).name}.` : ''}</span></div>
      <div class="price">${maxed ? '✅ Built' : `<button class="btn gold" data-build="${b.id}" ${G.S.coins < cost || blocked ? 'disabled' : ''}>🪙${fmt(cost)}</button>`}</div></div>`;
  }).join('') + `<p class="muted">Need more fields? Buy land from other farmers in the 🗺️ Land tab.</p>`;
  setHtml('tab-build', html);
}

// ---------------------------------------------------------------- storage

function drawShed() {
  const items = Object.entries(G.S.shed).filter(([, n]) => n > 0);
  let html = `<h3 class="section-title">📦 Storage <small class="muted">${G.shedCount()}/${G.storageCap()}</small></h3>`;
  html += items.length
    ? `<div class="inv">${items.map(([id, n]) => `<div><span class="e">${CROP[id].emoji}</span><b>${n}</b> ${CROP[id].name}<br><span class="muted">~🪙${fmt(n * G.S.fair[id])}</span></div>`).join('')}</div>`
    : '<p class="muted">Empty. Harvested crops wait here until you send them to market.</p>';
  const y = G.S.yesterday;
  html += `<h3 class="section-title">📈 Farm records</h3><div class="statgrid">
    <span>Market day</span><b>${G.S.day}</b>
    <span>Plots owned</span><b>${G.S.plots.length}</b>
    <span>Crops sold (all time)</span><b>${fmt(G.S.total.sold)}</b>
    <span>Coins earned (all time)</span><b>🪙${fmt(G.S.total.earned)}</b>
    <span>Coins spent (all time)</span><b>🪙${fmt(G.S.total.spent)}</b>
    <span>Yesterday's sales</span><b>${y ? `${y.sold} for 🪙${fmt(y.earned)}` : '—'}</b>
  </div>
  <p style="margin-top:16px"><button class="btn small" data-reset>🔄 Start a new farm</button></p>`;
  setHtml('tab-shed', html);
}

// ---------------------------------------------------------------- log

function drawLog() {
  setHtml('log', G.S.log.slice(0, 20).map(l => `<li class="${l.kind}">Day ${l.day}: ${l.text}</li>`).join('')
    || '<li class="muted">Quiet so far…</li>');
}

// ---------------------------------------------------------------- draw

function drawPanels() {
  drawSeeds();
  if (tab === 'market') drawMarket();
  if (tab === 'land') drawLand();
  if (tab === 'build') drawBuild();
  if (tab === 'shed') drawShed();
  drawLog();
}

function drawAll() { drawHeader(); drawField(); drawPanels(); }

// ---------------------------------------------------------------- input

$('field').addEventListener('click', e => {
  const b = e.target.closest('.plot');
  if (!b) return;
  const i = +b.dataset.i;
  const p = G.S.plots[i];
  const r = b.getBoundingClientRect();
  if (!p.crop) {
    const c = CROP[G.S.seed];
    if (G.plant(i)) {
      floatText(`-${c.seed}🪙`, r.left + r.width / 2 - 18, r.top, '#b8461b');
      b.classList.add('pop');
      setTimeout(() => b.classList.remove('pop'), 400);
    }
  } else if (G.plotProgress(p) >= 1) {
    const c = CROP[p.crop];
    const n = G.harvest(i);
    if (n) floatText(`+${n} ${c.emoji}`, r.left + r.width / 2 - 20, r.top);
  } else {
    const c = CROP[p.crop];
    toast(`${c.emoji} ${c.name} is ${Math.floor(G.plotProgress(p) * 100)}% grown.`);
  }
  drawAll();
});

$('seeds').addEventListener('click', e => {
  const b = e.target.closest('[data-seed]');
  if (!b) return;
  const c = CROP[b.dataset.seed];
  if (!G.cropUnlocked(c)) { toast(`🔒 ${c.name} needs a ${c.tier === 1 ? 'Greenhouse' : 'Tropical Dome'} — see the Build tab.`, 'warn'); return; }
  G.S.seed = c.id;
  drawAll();
});

$('plantAll').onclick = () => { const n = G.plantAll(); if (n) toast(`🌱 Planted ${n} ${CROP[G.S.seed].name}.`); drawAll(); };
$('harvestAll').onclick = () => {
  const n = G.harvestAll();
  toast(n ? `🧺 Harvested ${n} crops into storage.` : 'Nothing is ripe yet.');
  drawAll();
};

$('tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (!b) return;
  tab = b.dataset.tab;
  for (const x of $('tabs').children) x.classList.toggle('on', x === b);
  for (const t of ['market', 'land', 'build', 'shed']) $(`tab-${t}`).hidden = t !== tab;
  drawPanels();
});

document.querySelector('.panel').addEventListener('click', e => {
  const t = e.target.closest('button, tr[data-focus]');
  if (!t || t.disabled) return;
  const d = t.dataset;
  if (d.price) G.setPrice(d.price, G.priceOf(d.price) + +d.d);
  else if (d.set) G.setPrice(d.set, +d.v);
  else if (d.send) {
    const n = G.sendToMarket(d.send, +d.n);
    if (n) toast(`🎪 ${n} ${CROP[d.send].emoji} on your stall at 🪙${G.priceOf(d.send)} each.`);
  }
  else if (d.back) G.takeBack(d.back);
  else if (d.focus) {
    focusCrop = d.focus;
    drawPanels();
    $('tab-market').scrollTop = 0;
    return;
  }
  else if (d.offer) G.buyOffer(d.offer);
  else if ('council' in d) G.buyCouncilPlot();
  else if (d.build) G.build(d.build);
  else if ('reset' in d) {
    if (confirm('Start a brand new farm? Your coins, land and crops will be gone.')) { G.reset(); buildField(); }
  }
  drawAll();
});

G.onEvent((type, data) => {
  if (type === 'warn') toast(data, 'warn');
  if (type === 'build') toast(`${data.emoji} ${data.name} built!`, 'good');
  if (type === 'land') toast('🗺️ New land! Your farm just got bigger.', 'good');
  if (type === 'sale') {
    const el = $('coins').getBoundingClientRect();
    floatText(`+${data.price}`, el.left, el.bottom + 4);
  }
  if (type === 'day') showReport(data);
});

function showReport(y) {
  $('drTitle').textContent = `🌙 End of day ${y.day}`;
  const rows = Object.entries(y.byCrop).map(([id, v]) =>
    `<tr><td>${CROP[id].emoji} ${CROP[id].name}</td><td>${v.n} sold</td><td>🪙${fmt(v.coins)}</td></tr>`).join('');
  $('drBody').innerHTML = (y.sold
    ? `<p>You sold <b>${y.sold}</b> crops for <b>🪙${fmt(y.earned)}</b>.</p><table class="report">${rows}</table>`
    : '<p>You didn\'t sell anything today. Send crops to your stall and price them to beat the other farmers!</p>')
    + `<p>🗞️ ${G.S.news}</p><p class="muted">Rivals have restocked and set new prices. ${G.S.offers.length} farmer${G.S.offers.length === 1 ? ' is' : 's are'} selling land today.</p>`;
  const dlg = $('dayReport');
  if (y.sold && !dlg.open && typeof dlg.showModal === 'function' && !document.hidden) dlg.showModal();
  else if (!y.sold) toast(`☀️ Day ${G.S.day} begins.`, 'good');
}

// ---------------------------------------------------------------- loop

let last = performance.now();
let acc = 0;
function frame(now) {
  const dt = Math.min(0.5, (now - last) / 1000);
  last = now;
  // The market only runs while the day report is closed.
  if (!$('dayReport').open) {
    G.tick(dt);
    acc += dt;
  }
  drawHeader();
  drawField();
  if (acc > 0.5) { acc = 0; drawPanels(); }
  requestAnimationFrame(frame);
}

setInterval(G.save, 4000);
document.addEventListener('visibilitychange', () => { if (document.hidden) G.save(); last = performance.now(); });
window.addEventListener('pagehide', G.save);

drawAll();
if (fresh) toast('🌻 You have 4 plots and 10 coins. Plant lettuce to start!', 'good');
requestAnimationFrame(frame);
window.__G = G;   // handy for poking at things from the console
