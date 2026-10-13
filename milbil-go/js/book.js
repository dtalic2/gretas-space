// ---------- The Milbil Book, your bag, what's nearby, and settings ----------

import { SPECIES, SPECIES_BY_ID, RARITY, RARITY_ORDER, CROPS, ANIMALS, CHARMS, TOOLS, DECOR,
         SHOP_TYPES, OWN_TREE } from './data.js';
import { milbilHTML } from './milbil.js';
import { fmtNum } from './format.js';
import { esc, toast, card, sfx } from './ui.js';
import { shopBadge } from './shops.js';

/** Can you play as this one? You always have your Common Milbil. */
export const playable = (G, id) => id === 'common' || (G.state.dex[id] || 0) > 0;
export const foundCount = (G) => SPECIES.filter(s => playable(G, s.id)).length;

// ------------------------------------------------------------ the book ---

export function openBook(G){
  G.sheet.show({
    key: 'book', cls: 'tall',
    icon: '📖',
    title: 'Milbil Book',
    sub: () => `${foundCount(G)} of ${SPECIES.length} kinds found · ${fmtNum(G.state.stats.caught)} caught`,
    render: () => renderBook(G),
    onAct: (act, id) => act === 'species' && showSpecies(G, id),
  });
}

function renderBook(G){
  const me = SPECIES_BY_ID[G.state.avatar];
  const head = `<div class="me-card"><div class="pic">${milbilHTML(me.id)}</div>
    <div><small>You're playing as</small><b>${esc(me.name)}</b><span class="perk">${esc(me.perkText)}</span>
    <small class="tip">Catch milbils on the map, then tap one here to play as it.</small></div></div>`;
  return head + RARITY_ORDER.map(r => {
    const list = SPECIES.filter(s => s.rarity === r);
    return `<h3 class="mini" style="color:${RARITY[r].color}">${RARITY[r].name}</h3><div class="dex">${list.map(s => {
      const have = playable(G, s.id), n = G.state.dex[s.id] || 0;
      return `<button type="button" class="dex-cell ${have ? '' : 'unknown'} ${s.id === G.state.avatar ? 'me' : ''}" data-act="species" data-id="${s.id}">
        <span class="pic">${milbilHTML(s.id)}</span>
        <b>${have ? esc(s.name) : '???'}</b>
        <small>${s.id === G.state.avatar ? '⭐ You' : n ? `×${n}` : have ? 'Starter' : '&nbsp;'}</small></button>`;
    }).join('')}</div>`;
  }).join('');
}

async function showSpecies(G, id){
  const s = SPECIES_BY_ID[id];
  const have = playable(G, id);
  sfx('tap');
  if (!have){
    await card(`<div class="big-pic unknown">${milbilHTML(id)}</div><h2>???</h2>
      <p><span class="rar" style="background:${RARITY[s.rarity].color}">${RARITY[s.rarity].name}</span></p>
      <p>You haven't found this milbil yet. Keep walking!${s.night ? '<br><small>Psst… this one likes the dark.</small>' : ''}</p>`);
    return;
  }
  const isMe = G.state.avatar === id;
  const choice = await card(`<div class="big-pic">${milbilHTML(id)}</div><h2>${esc(s.name)}</h2>
    <p><span class="rar" style="background:${RARITY[s.rarity].color}">${RARITY[s.rarity].name}</span>
    ${G.state.dex[id] ? ` · caught ${G.state.dex[id]}` : ''}</p>
    <p class="blurb">${esc(s.blurb)}</p>
    <p class="perk">${isMe ? 'Your perk' : 'Play as it'}: <b>${esc(s.perkText)}</b></p>`,
    isMe ? [{ label: 'OK', cls: 'go' }]
         : [{ label: 'Close', value: 'no' }, { label: `Play as ${esc(s.name)}`, cls: 'go', value: 'play' }]);
  if (choice === 'play') G.setAvatar(id);
}

// ------------------------------------------------------------- the bag ---

export function openBag(G){
  G.sheet.show({
    key: 'bag', cls: 'tall',
    icon: '🎒',
    title: 'Your Bag',
    sub: () => `🪙 ${fmtNum(G.state.coins)}`,
    tabs: [{ id: 'harvest', label: '🧺 Harvest' }, { id: 'seeds', label: '🌱 Seeds' }, { id: 'things', label: '🐾 Helpers' }],
    render: (tab) => renderBag(G, tab),
    onAct: (act, id) => {
      if (act === 'pick'){ G.state.selSeed = id; sfx('tap'); toast(`${CROPS[id].emoji} ${esc(CROPS[id].name)} is ready to plant`); G.sheet.render(); }
    },
  });
}

const line = (e, t, m, right = '', cls = '') =>
  `<div class="row ${cls}"><span class="r-e">${e}</span><div class="r-t"><b>${t}</b><small>${m}</small></div><div class="r-b">${right}</div></div>`;

function renderBag(G, tab){
  const s = G.state, m = G.M();
  if (tab === 'seeds'){
    const seeds = Object.entries(s.seeds).filter(([, n]) => n > 0).sort((a, b) => CROPS[a[0]].cost - CROPS[b[0]].cost);
    if (!seeds.length) return `<p class="note big">No seeds. Walk to a 🌱 Seed Shop or ✨ Magic Tree.</p>`;
    return `<p class="note">Tap a seed to plant it next.</p>` + seeds.map(([id, n]) =>
      `<button type="button" class="row as-btn ${id === s.selSeed ? 'sel' : ''}" data-act="pick" data-id="${id}"><span class="r-e">${CROPS[id].emoji}</span>
       <span class="r-t"><b>${esc(CROPS[id].name)} <span class="cnt">×${fmtNum(n)}</span></b><small>${id === s.selSeed ? '✓ Planting next' : 'Tap to plant next'}</small></span></button>`).join('');
  }
  if (tab === 'things'){
    const a = Object.entries(s.animals).map(([id, n]) => line(ANIMALS[id].emoji, `${esc(ANIMALS[id].name)} <span class="cnt">×${n}</span>`, esc(ANIMALS[id].desc)));
    const c = Object.keys(s.charms).map(id => line(CHARMS[id].emoji, esc(CHARMS[id].name), esc(CHARMS[id].desc)));
    const t = Object.keys(s.tools).map(id => line(TOOLS[id].emoji, esc(TOOLS[id].name), esc(TOOLS[id].desc)));
    const d = Object.keys(s.decor).map(id => line(DECOR[id].emoji, esc(DECOR[id].name), 'Decoration'));
    if (s.tree) t.unshift(line(OWN_TREE.emoji, OWN_TREE.name, esc(OWN_TREE.desc)));
    const st = s.stats;
    return `<p class="note">Growth ×${m.grow.toFixed(2)} · Sales ×${m.sell.toFixed(2)} · ${Math.round(m.luck * 100)}% double harvest${m.off ? ` · ${Math.round(m.off * 100)}% off in shops` : ''}</p>` +
      (a.length ? `<h3 class="mini">Animals</h3>${a.join('')}` : '') +
      (c.length ? `<h3 class="mini">Charms</h3>${c.join('')}` : '') +
      (t.length ? `<h3 class="mini">Tools</h3>${t.join('')}` : '') +
      (d.length ? `<h3 class="mini">Decorations</h3>${d.join('')}` : '') +
      (!a.length && !c.length && !t.length && !d.length ? `<p class="note big">Nothing yet. Animals, charms and tools from the shops on the map end up here.</p>` : '') +
      `<h3 class="mini">Your adventure</h3><p class="stats">🫧 ${fmtNum(st.caught)} milbils caught · 🧺 ${fmtNum(st.harvested)} crops picked · 🪙 ${fmtNum(st.earned)} earned · 🚶 ${(st.walked / 1000).toFixed(2)} km walked</p>`;
  }
  const items = Object.entries(s.basket).filter(([, n]) => n > 0);
  if (!items.length) return `<p class="note big">Your basket is empty. Pick ✨ ripe crops in your 🌱 garden.</p>`;
  const total = items.reduce((t, [id, n]) => t + Math.round(CROPS[id].sell * m.sell) * n, 0);
  return `<p class="note">Worth 🪙 ${fmtNum(total)} at any 🧺 <b>Market</b> on the map.</p>` + items.map(([id, n]) =>
    line(CROPS[id].emoji, `${esc(CROPS[id].name)} <span class="cnt">×${fmtNum(n)}</span>`, `🪙 ${fmtNum(Math.round(CROPS[id].sell * m.sell))} each`)).join('');
}

// ---------------------------------------------------------- what's near ---

export function openNearby(G){
  G.sheet.show({
    key: 'nearby',
    icon: '👀',
    title: 'Nearby',
    sub: 'Walk toward the arrows',
    tabs: [{ id: 'milbils', label: '🫧 Milbils' }, { id: 'shops', label: '🏪 Shops' }],
    render: (tab) => renderNearby(G, tab),
    onAct: (act, id) => act === 'go' && G.tapThing(id),
  });
}
export function tickNearby(G){ if (G.sheet.is('nearby') && !G.sheet.pressing) G.sheet.render(); }

function renderNearby(G, tab){
  const reach = G.M().reach;
  const arrow = (b) => `<span class="arrow" style="transform:rotate(${Math.round(b - G.mapBearing())}deg)">⬆</span>`;
  const dist = (d) => d <= reach ? '<span class="in">In reach!</span>' : `${fmtNum(Math.round(d))} m`;
  if (tab === 'shops'){
    const list = G.nearShops().slice(0, 25);
    if (!list.length) return `<p class="note big">No shops nearby — try walking a little way.</p>`;
    return list.map(x => `<button type="button" class="row as-btn" data-act="go" data-id="${x.id}">${shopBadge(x.type, 'r-e')}
      <span class="r-t"><b>${esc(x.name)}</b><small>${SHOP_TYPES[x.type].blurb}</small></span><span class="r-b dist">${dist(x.d)} ${arrow(x.bearing)}</span></button>`).join('');
  }
  const list = G.nearMilbils().slice(0, 25);
  if (!list.length) return `<p class="note big">No milbils about right now. New ones pop up every few minutes — keep walking!</p>`;
  return list.map(x => {
    const s = SPECIES_BY_ID[x.species];
    const known = playable(G, s.id);
    return `<button type="button" class="row as-btn" data-act="go" data-id="${x.id}"><span class="r-e pic">${milbilHTML(s.id, { cls: known ? '' : 'shadow' })}</span>
      <span class="r-t"><b>${known ? esc(s.name) : '???'} ${known ? '' : '<span class="new">new!</span>'}</b><small style="color:${RARITY[s.rarity].color}">${RARITY[s.rarity].name}</small></span>
      <span class="r-b dist">${dist(x.d)} ${arrow(x.bearing)}</span></button>`;
  }).join('');
}

// ------------------------------------------------------------- settings ---

export function openSettings(G){
  G.sheet.show({
    key: 'settings',
    icon: '⚙️',
    title: 'Settings',
    sub: '',
    render: () => {
      const st = G.state.settings;
      return `
        <button type="button" class="row as-btn" data-act="sound"><span class="r-e">${st.sound ? '🔊' : '🔇'}</span><span class="r-t"><b>Sound</b><small>${st.sound ? 'On' : 'Off'}</small></span></button>
        <button type="button" class="row as-btn" data-act="buzz"><span class="r-e">📳</span><span class="r-t"><b>Buzz when a milbil is in reach</b><small>${st.buzz ? 'On' : 'Off'}</small></span></button>
        <button type="button" class="row as-btn" data-act="mode"><span class="r-e">${G.state.mode === 'pad' ? '📍' : '🕹️'}</span><span class="r-t"><b>${G.state.mode === 'pad' ? 'Switch to GPS' : 'Switch to the joystick'}</b>
          <small>${G.state.mode === 'pad' ? 'Walk for real — your phone follows you' : 'No GPS? Walk around with a joystick instead'}</small></span></button>
        <button type="button" class="row as-btn" data-act="rename"><span class="r-e">✏️</span><span class="r-t"><b>Rename your milbil</b><small>${esc(G.state.name)}</small></span></button>
        <button type="button" class="row as-btn" data-act="help"><span class="r-e">❓</span><span class="r-t"><b>How to play</b><small>The short version</small></span></button>
        <button type="button" class="row as-btn danger" data-act="reset"><span class="r-e">🗑️</span><span class="r-t"><b>Start again</b><small>Wipes your garden, coins and Milbil Book</small></span></button>
        <p class="note">Map © OpenStreetMap contributors. Milbil drawings by Greta.</p>`;
    },
    onAct: async (act) => {
      const st = G.state.settings;
      if (act === 'sound'){ st.sound = !st.sound; G.applySettings(); }
      else if (act === 'buzz'){ st.buzz = !st.buzz; G.applySettings(); }
      else if (act === 'mode'){ G.setMode(G.state.mode === 'pad' ? 'gps' : 'pad'); }
      else if (act === 'rename'){
        const n = prompt('What is your milbil called?', G.state.name);
        if (n && n.trim()) G.state.name = n.trim().slice(0, 14);
      }
      else if (act === 'help'){ await howToPlay(); }
      else if (act === 'reset'){
        const ok = await card('<h2>Start again?</h2><p>This wipes your garden, coins, bag and Milbil Book. It can\'t be undone.</p>',
          [{ label: 'Keep playing', value: false }, { label: 'Wipe it all', cls: 'warn', value: true }]);
        if (ok){ G.wipe(); return; }
      }
      G.changed();
      if (G.sheet.is('settings')) G.sheet.render();
    },
  });
}

export function howToPlay(){
  return card(`<h2>How to play</h2>
    <ol class="how">
      <li><b>Walk around</b> for real. The map follows you.</li>
      <li><b>Milbils</b> pop up near you. Get close, tap one, and swipe a bubble at it to catch it.</li>
      <li>Tap a milbil in your <b>📖 Milbil Book</b> to play as it — each one has a perk.</li>
      <li>Open your <b>🌱 Garden</b> any time. Plant seeds, water them 💧 and pick them ✨.</li>
      <li>Walk to a <b>🧺 Market</b> to sell your harvest, then to a <b>🌱 Seed Shop</b>, <b>✨ Magic Tree</b>, <b>🐾 Animal Shop</b> or <b>🔨 Carpenter</b> to spend it.</li>
    </ol>
    <p class="safety">🚸 Look up while you walk, stay with a grown-up, and never go somewhere you shouldn't to catch a milbil.</p>`,
    [{ label: 'Got it!', cls: 'go' }]);
}
