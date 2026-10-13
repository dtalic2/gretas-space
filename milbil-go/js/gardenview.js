// ---------- Your garden ----------
//
// The 3x3 bed you carry in your pocket. It is open from anywhere on the map —
// it's the shops and the milbils you have to walk to.

import { CROPS, ANIMALS, DECOR, TOOLS, GRID, PLOT_ORDER, OWN_TREE, OWN_TREE_RESTOCK_SEC,
         OWN_TREE_MIN_BATCH, OWN_TREE_MAX_BATCH, OWN_TREE_MAX_ITEMS, XP_HARVEST } from './data.js';
import { isReady, isThirsty, secondsLeft, plant, harvest, emptyPlot } from './garden.js';
import { fmtNum, fmtTime } from './format.js';
import { esc, toast, floatText, sfx } from './ui.js';

const RANK = (() => { const r = []; PLOT_ORDER.forEach((idx, k) => { r[idx] = k; }); return r; })();
const owned = (G, i) => RANK[i] < G.state.plotsOwned;

let dig = false;

/** Which plot indices the grid shows: just the middle 3x3 until you own more. */
function visiblePlots(G){
  const all = Array.from({ length: GRID * GRID }, (_, i) => i);
  if (G.state.plotsOwned > 9) return all;
  return all.filter(i => { const r = Math.floor(i / GRID), c = i % GRID; return r >= 1 && r <= 3 && c >= 1 && c <= 3; });
}

export function openGarden(G){
  G.sheet.show({
    key: 'garden', cls: 'tall garden-sheet',
    icon: '🌱',
    title: () => `${esc(G.state.name || 'Your')}'s Garden`,
    sub: () => {
      const m = G.M();
      return `Growth ×${m.grow.toFixed(2)} · Sales ×${m.sell.toFixed(2)}${m.luck ? ` · ${Math.round(m.luck * 100)}% double` : ''}`;
    },
    render: () => render(G),
    onAct: (act, id, el) => act === 'plot' ? tapPlot(G, +id, el)
      : act === 'locked' ? (sfx('nope'), toast('🔨 Buy more soil at a <b>Carpenter</b> on the map'))
      : act === 'seed' ? selectSeed(G, id)
      : act === 'tend' ? tendAll(G)
      : act === 'dig' ? toggleDig(G)
      : act === 'tree' ? collectTree(G, el)
      : null,
    onClose: () => { dig = false; },
  });
  tickGarden(G);
}

function render(G){
  const s = G.state;
  const vis = visiblePlots(G);
  const cols = vis.length > 9 ? GRID : 3;
  const plots = vis.map(i => owned(G, i)
    ? `<button type="button" class="plot" data-act="plot" data-id="${i}">
         <span class="p-crop"></span><span class="p-badge"></span><span class="p-time"></span><span class="p-bar"><i></i></span></button>`
    : `<button type="button" class="plot locked" data-act="locked" data-id="${i}"><span>🔒</span></button>`).join('');

  const animals = Object.entries(s.animals).flatMap(([id, n]) => Array(Math.min(n, 4)).fill(ANIMALS[id]?.emoji)).filter(Boolean);
  const decor = Object.keys(s.decor).map(id => DECOR[id]?.emoji).filter(Boolean);
  const meadow = animals.length || decor.length
    ? `<div class="meadow">${decor.map(e => `<span class="deco">${e}</span>`).join('')}${animals.map((e, k) =>
        `<span class="critter" style="animation-delay:${(k * 0.37) % 2}s">${e}</span>`).join('')}</div>`
    : `<div class="meadow empty">Animals from the 🐾 <b>Animal Shop</b> live here and make everything grow faster.</div>`;

  const seeds = Object.entries(s.seeds).filter(([, n]) => n > 0).sort((a, b) => CROPS[a[0]].cost - CROPS[b[0]].cost);
  const seedBar = seeds.length
    ? seeds.map(([id, n]) => `<button type="button" class="seed ${id === s.selSeed ? 'on' : ''}" data-act="seed" data-id="${id}">
        <span class="e">${CROPS[id].emoji}</span><b>${fmtNum(n)}</b><small>${esc(CROPS[id].name)}</small></button>`).join('')
    : `<p class="none">No seeds left! Walk to a 🌱 <b>Seed Shop</b> or ✨ <b>Magic Tree</b> to buy some.</p>`;

  const bulk = Object.keys(TOOLS).filter(k => TOOLS[k].bulk && s.tools[k]);
  const tools = [
    bulk.length ? `<button type="button" class="btn go" data-act="tend">⚡ Tend all</button>` : '',
    s.tools.shovel ? `<button type="button" class="btn ${dig ? 'warn' : ''}" data-act="dig">🪏 ${dig ? 'Digging… tap a plant' : 'Dig up'}</button>` : '',
    s.tree ? `<button type="button" class="btn magic" data-act="tree">${OWN_TREE.emoji} Magic Sapling <b class="tree-n"></b></button>` : '',
  ].join('');

  return `
    ${meadow}
    <div class="grid c${cols} ${dig ? 'digging' : ''}">${plots}</div>
    ${tools ? `<div class="g-tools">${tools}</div>` : ''}
    <h3 class="mini">Your seeds <small>tap one, then tap soil</small></h3>
    <div class="seedbar">${seedBar}</div>
    <p class="hint">Crops get thirsty 💧 part way — tap to water and they grow twice as fast. Tap ✨ ripe crops to pick them, then sell them at a 🧺 <b>Market</b>.</p>`;
}

/** Update every plot in place. Called often; never replaces the buttons. */
export function tickGarden(G){
  if (!G.sheet.is('garden')) return;
  const m = G.M();
  for (const el of G.sheet.body.querySelectorAll('.plot:not(.locked)')){
    const p = G.state.plots[+el.dataset.id];
    const c = CROPS[p.crop];
    const ready = isReady(p), thirsty = isThirsty(p);
    el.classList.toggle('ready', ready);
    el.classList.toggle('thirsty', thirsty);
    el.classList.toggle('empty', !c);
    el.classList.toggle('watered', !!(c && p.watered && !ready));
    const crop = el.children[0], badge = el.children[1], time = el.children[2], bar = el.children[3].firstChild;
    if (!c){
      if (crop.textContent) crop.textContent = '';
      badge.textContent = ''; time.textContent = ''; bar.style.width = '0';
      continue;
    }
    const pic = p.prog < 0.2 && !p.fruited ? '🌱' : c.emoji;
    if (crop.textContent !== pic) crop.textContent = pic;
    crop.style.transform = `scale(${ready ? 1 : (0.45 + 0.5 * Math.min(1, p.prog)).toFixed(3)})`;
    badge.textContent = ready ? '✨' : thirsty ? '💧' : c.perennial && p.fruited ? '🌳' : '';
    time.textContent = ready ? 'Pick!' : fmtTime(Math.ceil(secondsLeft(p, m)));
    bar.style.width = `${Math.round(Math.min(1, p.prog) * 100)}%`;
  }
  const tn = G.sheet.body.querySelector('.tree-n');
  if (tn && G.state.tree) tn.textContent = G.state.tree.stock.length ? `· ${G.state.tree.stock.length} 🎁` : '· growing';
}

// --------------------------------------------------------------- actions ---

function selectSeed(G, id){
  G.state.selSeed = id;
  sfx('tap');
  G.sheet.render();
  tickGarden(G);
}

function toggleDig(G){
  dig = !dig;
  sfx('tap');
  G.sheet.render();
  tickGarden(G);
}

function tapPlot(G, i, el){
  const s = G.state, p = s.plots[i], m = G.M();
  const c = CROPS[p.crop];

  if (dig){
    if (!c){ toast('🪏 Nothing to dig up there'); return; }
    const back = Math.floor(c.cost * m.digBack);
    Object.assign(p, emptyPlot());
    s.coins += back;
    floatText(el, `+${fmtNum(back)} 🪙`);
    sfx('coin');
    dig = false;
    G.changed(); G.sheet.render(); tickGarden(G);
    return;
  }

  if (c && isReady(p)){
    const double = Math.random() < m.luck;
    const n = double ? 2 : 1;
    s.basket[p.crop] = (s.basket[p.crop] || 0) + n;
    s.stats.harvested += n;
    G.addXp(XP_HARVEST * n);
    harvest(p, m.water);
    floatText(el, double ? `${c.emoji} ×2!` : `+1 ${c.emoji}`);
    sfx('harvest');
    G.changed(); tickGarden(G);
    return;
  }
  if (c && isThirsty(p)){
    p.watered = true;
    el.classList.add('splash');
    setTimeout(() => el.classList.remove('splash'), 500);
    sfx('water');
    G.changed(); tickGarden(G);
    return;
  }
  if (c){
    toast(`${c.emoji} ${esc(c.name)} · ${Math.floor(p.prog * 100)}% · ready in ${fmtTime(Math.ceil(secondsLeft(p, m)))}${p.watered ? ' · 💦 watered' : ''}`);
    return;
  }
  // empty soil
  const id = s.seeds[s.selSeed] > 0 ? s.selSeed
           : Object.keys(s.seeds).find(k => s.seeds[k] > 0);
  if (!id){ sfx('nope'); toast('No seeds! Find a 🌱 <b>Seed Shop</b> on the map'); return; }
  s.selSeed = id;
  const kept = Math.random() < m.seedSave;
  if (!kept && --s.seeds[id] <= 0) delete s.seeds[id];
  plant(p, id, m.water);
  if (kept) floatText(el, 'Seed saved!');
  sfx('plant');
  G.changed();
  G.sheet.render();
  tickGarden(G);
}

function tendAll(G){
  const s = G.state, m = G.M();
  let h = 0, sow = 0, w = 0;
  if (s.tools.basket){
    for (const p of s.plots){
      if (!isReady(p)) continue;
      const n = Math.random() < m.luck ? 2 : 1;
      s.basket[p.crop] = (s.basket[p.crop] || 0) + n;
      s.stats.harvested += n;
      G.addXp(XP_HARVEST * n);
      harvest(p, m.water);
      h += n;
    }
  }
  if (s.tools.drill){
    s.plots.forEach((p, i) => {
      if (p.crop || !owned(G, i) || !(s.seeds[s.selSeed] > 0)) return;
      if (!(Math.random() < m.seedSave) && --s.seeds[s.selSeed] <= 0) delete s.seeds[s.selSeed];
      plant(p, s.selSeed, m.water);
      sow++;
    });
  }
  if (s.tools.sprinkler){
    for (const p of s.plots) if (isThirsty(p)){ p.watered = true; w++; }
  }
  const bits = [h && `harvested ${h}`, sow && `sowed ${sow}`, w && `watered ${w}`].filter(Boolean);
  toast(bits.length ? `⚡ ${bits.join(' · ')}` : '⚡ Nothing needs doing right now');
  sfx(bits.length ? 'harvest' : 'tap');
  G.changed(); G.sheet.render(); tickGarden(G);
}

// ------------------------------------------------------- your magic tree ---

/** Top up the sapling's gifts for however long it's been. */
export function restockTree(G, now = Date.now()){
  const t = G.state.tree;
  if (!t) return;
  const m = G.M();
  const every = OWN_TREE_RESTOCK_SEC * 1000 / m.treeSpeed;
  const pool = Object.keys(CROPS);
  const weights = pool.map(id => 1 / Math.sqrt(CROPS[id].cost));
  const total = weights.reduce((a, b) => a + b, 0);
  const pick = () => { let r = Math.random() * total; for (let k = 0; k < pool.length; k++){ if ((r -= weights[k]) < 0) return pool[k]; } return pool[0]; };
  let guard = 0;
  while (now - t.last >= every && guard++ < 50){
    t.last += every;
    if (t.stock.length >= OWN_TREE_MAX_ITEMS){ t.last = now; break; }
    const n = OWN_TREE_MIN_BATCH + Math.floor(Math.random() * (OWN_TREE_MAX_BATCH - OWN_TREE_MIN_BATCH + 1)) + m.treeBatch;
    for (let k = 0; k < n && t.stock.length < OWN_TREE_MAX_ITEMS; k++) t.stock.push(pick());
  }
}

function collectTree(G, el){
  const t = G.state.tree;
  if (!t.stock.length){ toast('🌳 No gifts yet — the sapling restocks every couple of minutes'); return; }
  const got = {};
  for (const id of t.stock){ G.state.seeds[id] = (G.state.seeds[id] || 0) + 1; got[id] = (got[id] || 0) + 1; }
  t.stock = [];
  toast(`🌳 Free seeds: ${Object.entries(got).map(([id, n]) => `${CROPS[id].emoji}×${n}`).join(' ')}`, 'good');
  floatText(el, '🎁');
  sfx('coin');
  G.changed(); G.sheet.render(); tickGarden(G);
}

/** How many plots want you: ripe and thirsty, for the badge on the map. */
export function gardenNeeds(G){
  let ripe = 0, thirsty = 0;
  for (const p of G.state.plots){ if (isReady(p)) ripe++; else if (isThirsty(p)) thirsty++; }
  return { ripe, thirsty };
}
