// ---------- Panels, cards, toasts and the little numbers that float up ----------
//
// Everything here writes HTML. The actions it offers (build, check in, collect)
// are handed in by main.js, so this file never touches the rules directly.

import {
  ROOMS, AREAS, EXTRAS, ITEMS, CHARACTERS, CHARACTER, WISH, MAX_FLOORS, MAX_KEEPERS, KEEPER_COST,
  KEEPER_LEVEL, LOBBY_MAX, floorCost, lobbyCost, keeperDelay,
} from './data.js';
import * as E from './econ.js';
import * as F from './format.js';

export const $ = (id) => document.getElementById(id);

// ---------------------------------------------------------------- bits ----

const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0');

export function face(guest, small = false){
  const c = CHARACTER[guest.who];
  return `<div class="face${small ? ' small' : ''}"><img src="${c.art}" alt="${c.name}"></div>`;
}

export function wantLine(guest){
  const it = ITEMS[guest.wants];
  let s = `Wants a <b>${it.emoji} ${it.name}</b>`;
  if (guest.wish){
    const w = WISH[guest.wish];
    s += ` · would love ${w.emoji} ${w.text}`;
  }
  return s;
}

export function toast(text, kind = ''){
  const box = $('toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = text;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 2400);
}

export function floater(x, y, text){
  const el = document.createElement('div');
  el.className = 'floater';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.textContent = text;
  $('pops').appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

// --------------------------------------------------------------- panel ----

let onClose = null;

export function openPanel(title, html, bind, closed){
  $('panelTitle').textContent = title;
  $('panelBody').innerHTML = html;
  $('panel').classList.remove('hidden');
  onClose = closed || null;
  if (bind) bind($('panelBody'));
}

export function closePanel(){
  $('panel').classList.add('hidden');
  const cb = onClose;
  onClose = null;
  cb && cb();
}

export const panelOpen = () => !$('panel').classList.contains('hidden');

/** Wire every [data-act] button in a panel to one handler. */
function acts(root, handler){
  root.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', () => handler(b.dataset.act, b.dataset)));
}

// ---------------------------------------------------------------- shop ----

function itemCard(state, it, k){
  const open = state.level >= it.level;
  const cost = it.kind === 'area' || it.kind === 'room' ? E.costOf(state, it.id) : it.cost;
  const owned = it.kind === 'area' ? E.countOf(state, it.id) > 0 : it.kind === 'extra' ? !!state.extras[it.id] : false;
  const count = it.kind === 'room' ? E.countOf(state, it.id) : 0;
  let meta = '';
  if (it.kind === 'room') meta = `<span>⏱ ${F.span(it.secs)}</span><span>🪙 ${it.pay} a stay</span>${count ? `<span>you have ${count}</span>` : ''}`;
  if (it.kind === 'area') meta = `<span>grants ${it.emoji} ${it.wish}</span>`;
  const cls = ['card-item', !open ? 'locked' : '', owned ? 'owned' : ''].join(' ');
  const price = owned ? '<span class="tag-own">✓ Built</span>'
              : open ? `<span class="cost">🪙 ${F.coins(cost)}</span>` : `<span class="cost">🔒 Level ${it.level}</span>`;
  return `<button class="${cls}" data-act="pick" data-id="${it.id}" data-kind="${it.kind}"${k ? ` data-key="${k}"` : ''}>
    <div class="top"><span class="em">${it.emoji}</span><span class="nm">${it.name}</span></div>
    <div class="meta">${meta}</div>
    <div class="meta">${it.blurb}</div>
    ${price}
  </button>`;
}

function hotelCards(state){
  const out = [];
  out.push(`<button class="card-item${state.floors >= MAX_FLOORS ? ' owned' : ''}" data-act="floor">
    <div class="top"><span class="em">🏗</span><span class="nm">New floor</span></div>
    <div class="meta">Three more spaces for rooms, on top. You have ${state.floors} of ${MAX_FLOORS}.</div>
    ${state.floors >= MAX_FLOORS ? '<span class="tag-own">✓ As tall as it goes</span>' : `<span class="cost">🪙 ${F.coins(floorCost(state.floors))}</span>`}
  </button>`);
  const size = E.lobbySize(state);
  out.push(`<button class="card-item${size >= LOBBY_MAX ? ' owned' : ''}" data-act="lobby">
    <div class="top"><span class="em">🛋️</span><span class="nm">Bigger lobby</span></div>
    <div class="meta">Room for one more guest to wait. Holds ${size} now, ${LOBBY_MAX} at most.</div>
    ${size >= LOBBY_MAX ? '<span class="tag-own">✓ As big as it goes</span>' : `<span class="cost">🪙 ${F.coins(lobbyCost(state.lobbyUps))}</span>`}
  </button>`);
  const k = state.keepers;
  const locked = state.level < KEEPER_LEVEL;
  out.push(`<button class="card-item${locked ? ' locked' : ''}${k >= MAX_KEEPERS ? ' owned' : ''}" data-act="keeper">
    <div class="top"><span class="em">🧹</span><span class="nm">Housekeeper</span></div>
    <div class="meta">${k ? `${k} on staff: rooms tidy themselves after ${keeperDelay(k)}s.` : 'Somebody with a mop. Rooms tidy themselves.'}</div>
    ${k >= MAX_KEEPERS ? '<span class="tag-own">✓ Staff room full</span>'
      : locked ? `<span class="cost">🔒 Level ${KEEPER_LEVEL}</span>` : `<span class="cost">🪙 ${F.coins(KEEPER_COST[k])}</span>`}
  </button>`);
  return out.join('');
}

export function shopPanel(state, a, { tab = 'rooms', key = null } = {}){
  const tabs = key ? [['rooms', '🛏️ Rooms'], ['areas', '☕ Areas']]
                   : [['rooms', '🛏️ Rooms'], ['areas', '☕ Areas'], ['outside', '🌷 Outside'], ['hotel', '🏨 Hotel']];
  let body = '';
  if (tab === 'rooms') body = ROOMS.map(r => itemCard(state, { ...r, kind:'room' }, key)).join('');
  if (tab === 'areas') body = AREAS.map(r => itemCard(state, { ...r, kind:'area' }, key)).join('');
  if (tab === 'outside') body = EXTRAS.map(r => itemCard(state, { ...r, kind:'extra' })).join('');
  if (tab === 'hotel') body = hotelCards(state);
  const subs = {
    rooms: 'Where guests sleep. Fancier rooms take longer and pay far more. A guest will happily take a nicer room than they asked for.',
    areas: 'Rooms nobody sleeps in. Guests often wish for one — grant the wish and they pay half as much again.',
    outside: 'Built once, around the hotel.',
    hotel: 'Grow the building itself.',
  };
  const html = `<div class="tabs">${tabs.map(([id, label]) => `<button data-act="tab" data-tab="${id}" class="${id === tab ? 'on' : ''}">${label}</button>`).join('')}</div>
    <p class="sub">${key ? 'Choose what goes in this space. ' : ''}${subs[tab]}</p>
    <div class="cards">${body}</div>`;
  openPanel(key ? 'Build here' : 'Build', html, (root) => acts(root, (act, d) => {
    if (act === 'tab') return shopPanel(state, a, { tab:d.tab, key });
    if (act === 'pick') return a.pick(d.id, d.kind, d.key || null, () => shopPanel(state, a, { tab, key }));
    if (act === 'floor') return a.floor(() => shopPanel(state, a, { tab, key }));
    if (act === 'lobby') return a.lobby(() => shopPanel(state, a, { tab, key }));
    if (act === 'keeper') return a.keeper(() => shopPanel(state, a, { tab, key }));
  }));
}

// ----------------------------------------------------------- room panel ----

export function roomPanel(state, k, a){
  const r = state.rooms[k];
  if (!r) return;
  const it = ITEMS[r.type];
  const [f] = E.unkey(k);
  const where = f ? `floor ${f}` : 'the ground floor';
  let status = '', buttons = '';
  if (it.kind === 'area'){
    status = `<div class="row"><span>Guests wishing for ${it.emoji} ${it.wish}</span><b>pay +50%</b></div>`;
    buttons = `<button class="pill warn" data-act="knock">Knock down (+🪙 ${F.coins(Math.floor(E.costOf(state, r.type) / 2))})</button>`;
  } else if (r.st === 'busy'){
    const left = (r.endsAt - Date.now()) / 1000;
    status = `<div class="guest-card">${face(r.guest)}<div class="info"><b>${r.guest.name}</b>
      <div class="line">Staying another ${F.clock(left)}</div>
      <div class="line ${r.happy ? 'good' : ''}">${r.happy ? `😊 Wish granted — paying 🪙 ${r.pay}` : `Paying 🪙 ${r.pay}`}</div></div></div>`;
  } else if (r.st === 'pay'){
    status = `<div class="row"><span>${r.guest ? r.guest.name : 'A guest'} left coins on the pillow</span><b>🪙 ${r.pay}</b></div>`;
    buttons = `<button class="pill go" data-act="collect">Collect 🪙 ${r.pay}</button>`;
  } else if (r.st === 'messy'){
    status = `<div class="row"><span>Needs a tidy before the next guest</span><b>🧹</b></div>`;
    buttons = `<button class="pill go" data-act="tidy">Tidy it 🧹</button>`;
  } else {
    status = `<div class="row"><span>Clean and ready</span><b>✓</b></div>`;
    buttons = `<button class="pill warn" data-act="knock">Knock down (+🪙 ${F.coins(Math.floor(E.costOf(state, r.type) / 2))})</button>`;
  }
  const facts = it.kind === 'room'
    ? `<div class="rows"><div class="row"><span>A stay lasts</span><b>${F.span(it.secs)}</b></div><div class="row"><span>Pays</span><b>🪙 ${it.pay}+</b></div></div>` : '';
  openPanel(`${it.emoji} ${it.name}`, `<p class="sub">${it.blurb} On ${where}.</p>${status}${facts}<div class="actions">${buttons}</div>`,
    (root) => acts(root, (act) => a[act] && a[act](k)));
}

// ---------------------------------------------------------------- lobby ----

export function lobbyPanel(state, a){
  const now = Date.now();
  const size = E.lobbySize(state);
  const cards = state.lobby.map(g => {
    const room = E.roomFor(state, g);
    const left = g.patience - (now - g.arrived) / 1000;
    const pct = Math.max(0, Math.min(100, left / g.patience * 100));
    const wishOk = g.wish && E.has(state, g.wish);
    let line;
    if (room){
      const q = E.quote(state, g, state.rooms[room].type);
      line = `<div class="line good">Will pay 🪙 ${q.pay}${q.upgraded ? ' — upgraded to a ' + ITEMS[state.rooms[room].type].name : ''}${wishOk ? ' · wish granted 😊' : ''}</div>`;
    } else {
      line = `<div class="line bad">${E.countOf(state, g.wants) ? `No free ${ITEMS[g.wants].name} yet` : `You have no ${ITEMS[g.wants].name}`}</div>`;
    }
    return `<div class="guest-card${g.via === 'heli' ? ' vip' : ''}">${face(g)}<div class="info">
      <b>${g.name}</b>${g.via === 'heli' ? ' <span class="tag">🚁 flew in</span>' : ''}
      <div class="line">${wantLine(g)}</div>${line}
      <div class="wait"><i style="width:${pct}%"></i></div></div>
      <button class="pill go" data-act="checkin" data-uid="${g.uid}"${room ? '' : ' disabled'}>Check in</button></div>`;
  }).join('');
  const empty = `<p class="sub">Nobody waiting just now. Guests walk in off the street every few seconds.</p>`;
  openPanel(`🛎️ Lobby · ${state.lobby.length}/${size}`, (cards || empty) +
    `<p class="tiny">Guests wait about ${Math.round(state.lobby[0] ? state.lobby[0].patience / 60 : 2.5)} minutes before giving up.
     The bar under each one is how much patience is left.</p>`,
    (root) => acts(root, (act, d) => act === 'checkin' && a.checkin(Number(d.uid))));
}

// ----------------------------------------------------------- guest book ----

export function bookPanel(state){
  const s = state.stats;
  const cards = CHARACTERS.map(c => {
    const n = s.vip[c.id] || 0;
    return `<div class="who${n ? '' : ' never'}"><div class="face"><img src="${c.art}" alt="${c.name}"></div>
      <b>${c.name}</b><span class="n">${n ? `stayed ${F.plural(n, 'time')}` : 'not yet'}</span><small>${c.line}</small></div>`;
  }).join('');
  openPanel('📖 Guest book', `<div class="totals">
      <span>🛎️ ${s.checkins} checked in</span>
      <span>🪙 ${F.coins(s.earned)} earned</span><span>😢 ${s.walked} gave up waiting</span></div>
    <p class="sub">Everyone who stays comes over from Milbil Town. Guests who fly in to your helipad pay double.</p>
    <div class="book">${cards}</div>`);
}

// ----------------------------------------------------------------- help ----

export function helpPanel(state, a){
  openPanel('⚙️ Milbil Hotel', `<div class="help">
    <h3>How it works</h3>
    <ul>
      <li><b>Guests arrive</b> along the pavement and wait in the lobby. Tap one (or the 🛎️ Lobby button) to check them in.</li>
      <li>They take the lift up to <b>the room they asked for</b> — or a nicer one, which they pay a little extra for.</li>
      <li>When they leave, <b>tap the 🪙</b> over their room, then <b>tap the 🧹</b> to tidy it. Housekeepers do the tidying for you.</li>
      <li>Most guests have <b>a wish</b> — breakfast, a bubble bath, a swim. Build the café, spa or pool and they pay 50% more.</li>
      <li>Nobody waits for ever. A guest with no room gives up after a couple of minutes and goes home.</li>
      <li>Stays carry on while the game is closed. Come back to coins on the pillows.</li>
    </ul>
    <h3>Getting around</h3>
    <p>Drag to move up and down the hotel, pinch or scroll to zoom.
      Keys: <kbd>WASD</kbd> move · <kbd>+</kbd>/<kbd>−</kbd> zoom · <kbd>B</kbd> build · <kbd>L</kbd> lobby ·
      <kbd>G</kbd> guest book · <kbd>M</kbd> mute · <kbd>Esc</kbd> close</p>
    <h3>Your hotel</h3>
    <p>It saves by itself, in this browser. To move it somewhere else, save it to a file.</p>
    <div class="actions">
      <button class="pill" data-act="exportFile">💾 Save to a file</button>
      <button class="pill" data-act="importFile">📂 Load a save file</button>
    </div>
    <details class="savebox"><summary>Copy it as text instead</summary>
      <textarea id="saveText" spellcheck="false"></textarea>
      <div class="actions"><button class="pill" data-act="copyText">Copy</button><button class="pill" data-act="loadText">Load this text</button></div>
    </details>
    <div class="actions"><button class="pill warn" data-act="reset">Start a new hotel</button></div>
    <p class="tiny">Level ${state.level} · ${state.floors} floors · started ${new Date(state.created).toLocaleDateString()}.
      Play it anywhere: <a href="https://dtalic2.github.io/gretas-space/milbil-hotel/" target="_blank" rel="noopener">dtalic2.github.io/gretas-space/milbil-hotel</a></p>
  </div>`, (root) => {
    const ta = root.querySelector('#saveText');
    root.querySelector('.savebox').addEventListener('toggle', () => { ta.value = a.exportText(); });
    acts(root, (act) => a[act] && a[act](ta));
  });
}

