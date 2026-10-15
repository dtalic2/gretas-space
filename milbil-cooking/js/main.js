// ---------- Milbil Cooking ----------
//
// Start-up, the screens around the edge (menu, orders, upgrades, settings),
// paying and buying, and the game loop. The dining room is restaurant.js and
// the cooking is kitchen.js.

import { DISHES, DISH, PLACES, PLACE, MAX_STARS, COLORS, NAMES, MACHINE_COSTS, tipFor } from './data.js';
import { S, load, save, wipe, place, owns, hasDish, menu, nextTableCost, nextMachineCost, tablesHere, spend, earn, fmt } from './state.js';
import { Restaurant, pickDish } from './restaurant.js';
import { Kitchen } from './kitchen.js';
import { menuDishSVG, ingredientSVG } from './food.js';
import { drawLook, chefLook, customerHTML } from './milbil.js';
import { $, esc, toast, floatText, Sheet, card, sfx, setSound } from './ui.js';
import { openSignMaker, setupSignMaker, signName } from './sign.js';

load();
setSound(S.sound);
const sheet = new Sheet($('#sheet'));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const stars = (n) => '★'.repeat(n) + '☆'.repeat(MAX_STARS - n);
// At the Drive-Through everyone orders at the speaker, just like a machine.
const ordersList = () => S.machines > 0 || !!place().drive;
const toBuy = () => DISHES.filter(d => !hasDish(d.id));

// --------------------------------------------------------------- game ---

const game = {
  room: null,
  kitchen: null,

  ordersChanged(){
    const n = this.room.orders.length;
    $('#ordersBtn').hidden = !ordersList();
    $('#ordersBadge').textContent = n || '';
    const kOrders = $('#kOrders');
    kOrders.hidden = !ordersList();
    $('em', kOrders).textContent = n || '';
    const cooking = this.kitchen.cook && this.kitchen.cook.cust.state === 'wait';
    $('#kitchenBadge').textContent = cooking ? '…' : (!ordersList() && n ? n : '');
    if (sheet.is('orders') && !sheet.pressing) sheet.render();
    for (const c of this.room.customers) this.room.renderCust(c);
  },

  openKitchen(){
    sfx('tap');
    const k = this.kitchen;
    if (k.cook && k.cook.cust.state === 'wait') return k.open(k.cook.cust);
    if (ordersList()) return openOrders();
    const waiting = this.room.orders;
    if (waiting.length === 1) return k.open(waiting[0]);
    toast(this.room.customers.some(c => c.state === 'order' || c.state === 'wait')
      ? 'Tap a hungry milbil to see what they want 👆'
      : 'No customers yet — they\'ll be in soon!');
  },

  openOrders(){ openOrders(); },

  async tapCustomer(c){
    if (c.state === 'order' || c.state === 'wait'){
      sfx('tap');
      const first = c.state === 'order';
      this.room.takeOrder(c);
      c.el.classList.remove('teach');
      const d = DISH[c.dish];
      const price = d.price * (c.vip ? 2 : 1);
      const cookingThis = this.kitchen.cook?.cust === c;
      const go = await card(`<div class="order-card">
          <div class="order-who">${customerHTML(c)}</div>
          <div class="speech">${first ? 'Hello!' : 'Is it ready yet?'} Can I have <b>${esc(d.name)}</b>, please?</div>
        </div>
        <div class="card-pic">${menuDishSVG(d.id)}</div>
        <p class="order-price">${c.vip ? '⭐ VIP pays double! ' : ''}🪙 <b>${fmt(price)}</b></p>`,
        [{ label: 'Later', value: false }, { label: cookingThis ? '🍳 Keep cooking' : '🍳 Cook it!', cls: 'go', value: true }]);
      if (go && c.state === 'wait') this.kitchen.open(c);
      return;
    }
    if (c.state === 'eat') toast(`${esc(c.name)} is enjoying their ${esc(DISH[c.dish].name.toLowerCase())} 😋`);
    else if (c.state === 'walk' || c.state === 'machine') toast(`${esc(c.name)} is just coming in!`);
  },

  /**
   * A perfect dish. They pay straight away, so nothing's lost if you move
   * restaurants; the coins pop up when the food reaches them.
   */
  served(c, layers){
    const d = DISH[c.dish];
    const base = d.price * (c.vip ? 2 : 1);
    const tip = tipFor(d.price, this.room.now - c.orderedAt);
    earn(base + tip);
    S.served++;
    S.perfect[d.id] = (S.perfect[d.id] || 0) + 1;
    save();
    this.room.serve(c, layers, (el) => {
      sfx('coin');
      floatText(el, `+${fmt(base + tip)} 🪙`);
      if (tip) toast(`⭐ Speedy service! ${esc(c.name)} gave you a tip of <b>🪙 ${fmt(tip)}</b>`, 'good');
      hud(true);
    });
    hud();
  },

  offerTable(){ offerTable(); },

  /** The sign maker. Nobody new comes in while you're designing. */
  openSign(first = false){
    sfx('tap');
    sheet.close();
    this.room.paused = true;
    openSignMaker({
      first,
      onChange: () => this.room.renderSign(),
      onClose: () => {
        this.room.paused = false;
        this.room.renderSign();
        if (first) this.room.nextSpawn = this.room.now + 1;
      },
    });
  },
};

// ---------------------------------------------------------------- HUD ---

function hud(bump = false){
  $('#coins').textContent = fmt(S.coins);
  $('#placeName').textContent = place().name;
  $('#placeStars').textContent = stars(place().stars);
  $('#meAvatar').innerHTML = drawLook(chefLook(S.color), { title: S.name });
  if (bump){ const p = $('#coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  // A "!" when there's something you can afford.
  const food = toBuy().some(d => d.cost <= S.coins);
  const more = [nextTableCost(), nextMachineCost(), ...PLACES.filter(p => !owns(p.id)).map(p => p.cost)].some(c => c != null && c <= S.coins);
  $('#menuBadge').textContent = food ? '!' : '';
  $('#shopBadge').textContent = food || more ? '!' : '';
}

// --------------------------------------------------------------- menu ---

let openDish = null;
function openMenu(){
  sfx('tap');
  sheet.show({
    key: 'menu', icon: '📖', cls: 'tall',
    title: 'Menu',
    sub: () => `You have 🪙 ${fmt(S.coins)}. Milbils mostly order the dearest food you sell.`,
    render: () => {
      const mine = menu(), more = toBuy();
      return `<h3 class="menu-head">🍽️ On your menu</h3>${menuGrid(mine)}
        ${more.length ? `<h3 class="menu-head">🛒 New food to buy</h3>${menuGrid(more)}` : '<p class="menu-foot">You sell every dish there is! 👑</p>'}
        <p class="menu-foot">⭐ VIPs pay double. Serve fast for a tip!</p>`;
    },
    onAct: (act, id) => {
      if (act === 'dish'){ sfx('tap'); openDish = openDish === id ? null : id; sheet.render(); }
      if (act === 'buy-dish') buyDish(id);
    },
  });
}

/** Dish cards, two to a row. A dish's recipe opens under its row. */
function menuGrid(dishes){
  return `<div class="menu-grid">${dishes.map((d, i) => {
    const mine = hasDish(d.id);
    return `<div class="menu-card ${mine ? '' : 'shop'} ${openDish === d.id ? 'open' : ''}" data-act="dish" data-id="${d.id}" role="button" tabindex="0">
        ${menuDishSVG(d.id)}
        <b>${esc(d.name)}</b>
        <span class="price">${mine ? '' : '<small>sells for</small> '}🪙 ${fmt(d.price)}</span>
        ${mine && S.perfect[d.id] ? `<small class="made">Made ${S.perfect[d.id]}×</small>` : ''}
        ${mine ? '' : `<button type="button" class="btn buy ${S.coins < d.cost ? 'dim' : ''}" data-act="buy-dish" data-id="${d.id}">Buy 🪙${fmt(d.cost)}</button>`}
      </div>
      ${i % 2 || i === dishes.length - 1 ? dishes.slice(i - (i % 2), i + 1).filter(x => x.id === openDish).map(recipeHTML).join('') : ''}`;
  }).join('')}</div>`;
}

function recipeHTML(d){
  return `<div class="recipe">
    <ol>${d.steps.map(s => `<li>${ingredientSVG(s.ing, 'mini')}<span>${esc(s.text)}</span></li>`).join('')}
      <li><span class="plate-ico">🍽️</span><span>${esc(d.serve)}</span></li></ol>
  </div>`;
}

// ------------------------------------------------------------- orders ---

function openOrders(){
  sfx('tap');
  sheet.show({
    key: 'orders', icon: '🧾',
    title: 'Orders',
    sub: () => `${place().drive ? 'From the Drive-Through speaker' : `From your ordering machine${S.machines > 1 ? 's' : ''}`}. Tap one to cook it.`,
    render: () => {
      const list = game.room.orders;
      if (!list.length) return `<div class="empty"><div class="empty-ico">🧾</div><p>No orders yet.</p><p class="muted">${place().drive ? 'Milbils order at the speaker as they drive up.' : 'Customers order on the machine as they walk in.'}</p></div>`;
      return list.map(c => {
        const d = DISH[c.dish];
        const waited = Math.floor(game.room.now - c.orderedAt);
        const cooking = game.kitchen.cook?.cust === c;
        return `<button type="button" class="order-row ${cooking ? 'cooking' : ''}" data-act="cook" data-id="${c.id}">
          <span class="o-who">${customerHTML(c)}</span>
          <span class="o-pic">${menuDishSVG(d.id)}</span>
          <span class="o-what"><b>${esc(d.name)}</b><small>${esc(c.name)}${c.vip ? ' ⭐ VIP' : ''} · ${cooking ? '🍳 cooking now' : `⏱️ ${waited}s${waited < 45 ? ' · quick = tip!' : ''}`}</small></span>
          <span class="o-price">🪙${fmt(d.price * (c.vip ? 2 : 1))}</span>
        </button>`;
      }).join('');
    },
    onAct: (act, id) => {
      if (act !== 'cook') return;
      const c = game.room.customers.find(x => x.id === +id);
      if (!c || c.state !== 'wait') return;
      sheet.close();
      game.kitchen.open(c);
    },
  });
}

// ----------------------------------------------------------- upgrades ---

let shopTab = 'food';
function openShop(tab){
  sfx('tap');
  if (tab) shopTab = tab;
  sheet.show({
    key: 'shop', icon: '🛠️', cls: 'tall',
    title: 'Upgrade',
    sub: () => `You have 🪙 ${fmt(S.coins)}`,
    tabs: [{ id: 'food', label: '🍽️ Food' }, { id: 'places', label: '🏠 Restaurants' }, { id: 'more', label: '🪑 Tables & machines' }],
    tab: shopTab,
    render: (t) => { shopTab = t; return t === 'places' ? placesHTML() : t === 'more' ? moreHTML() : foodHTML(); },
    onAct: (act, id) => {
      if (act === 'buy-dish') buyDish(id);
      if (act === 'menu') openMenu();
      if (act === 'buy-place') buyPlace(id);
      if (act === 'move') moveTo(id);
      if (act === 'table') buyTable();
      if (act === 'machine') buyMachine();
    },
  });
}

const buyBtn = (act, id, cost, label = '') =>
  `<button type="button" class="btn buy ${S.coins < cost ? 'dim' : ''}" data-act="${act}" data-id="${id}">${label}🪙 ${fmt(cost)}</button>`;

function foodHTML(){
  const next = toBuy().slice(0, 4);
  if (!next.length) return `<div class="up-card"><b>You sell every dish there is! 👑</b></div>`;
  return `<p class="note">Each new dish sells for more than the last, and milbils mostly order the dearest food you sell.</p>
    ${next.map(d => `<div class="up-row">
      <span class="up-pic">${menuDishSVG(d.id)}</span>
      <span class="up-what"><b>${esc(d.name)}</b><small>sells for <i>🪙 ${fmt(d.price)}</i></small></span>
      ${buyBtn('buy-dish', d.id, d.cost)}
    </div>`).join('')}
    <button type="button" class="btn wide" data-act="menu">📖 See the whole menu</button>`;
}

function placesHTML(){
  return `<p class="note">Buy any restaurant you have the coins for, and move between the ones you own. Your tables and machines come with you.</p>
    ${PLACES.map(P => {
      const here = S.place === P.id, mine = owns(P.id);
      return `<div class="place-card ${here ? 'here' : ''}">
        <span class="place-pic" style="--wall:${P.wall};--wall2:${P.wall2};--floor:${P.floor};--floor2:${P.floor2};--accent:${P.accent}">${P.drive ? '<i class="pp-car"></i>' : '<i class="pp-table"></i>'}</span>
        <span class="up-what"><b>${P.name}</b><small class="stars">${stars(P.stars)}</small>
          <small>${P.drive ? `${P.cars} cars queue up outside` : `Room for ${P.maxTables} tables`}</small></span>
        ${here ? '<span class="here-tag">You\'re here</span>'
          : mine ? `<button type="button" class="btn go" data-act="move" data-id="${P.id}">Move here</button>`
          : buyBtn('buy-place', P.id, P.cost)}
      </div>`;
    }).join('')}`;
}

function moreHTML(){
  const P = place(), tc = nextTableCost(), mc = nextMachineCost();
  return `
    <h3 class="shop-head">🪑 Tables ${P.drive ? '' : `<small>${tablesHere()} of ${P.maxTables} here</small>`}</h3>
    <div class="up-card">
      <div class="up-top">${P.drive
        ? `<p>The Drive-Through has no tables: up to ${P.cars} cars queue up outside. Buy tables in a sit-down restaurant.</p>`
        : `<p>More tables, more customers at once. You own ${S.tables}.</p>
          ${tc != null ? buyBtn('table', '', tc) : `<span class="full">Full! A bigger restaurant has more room.</span>`}`}</div>
    </div>
    <h3 class="shop-head">🧾 Ordering machines <small>${S.machines} of ${MACHINE_COSTS.length}</small></h3>
    <div class="up-card">
      <div class="up-top"><p>${S.machines ? 'Each extra machine brings customers in faster.' : 'Customers order on it as they walk in, so you don\'t have to take their order. Every order shows up in the 🧾 Orders list: tap one and start cooking.'}
        ${P.drive ? ' (At the Drive-Through, everyone orders at the speaker anyway.)' : ''}</p>
        ${mc != null ? buyBtn('machine', '', mc) : '<span class="full">All built!</span>'}</div>
    </div>`;
}

async function buyDish(id){
  const d = DISH[id];
  if (!d || hasDish(id)) return;
  if (!spend(d.cost)) return cantAfford(d.cost);
  S.dishes.push(id);
  save();
  sfx('level');
  afterBuy();
  if (sheet.is('menu')) sheet.render();
  await card(`<h3 class="big-title">🎉 New on your menu!</h3>
    <div class="card-pic">${menuDishSVG(d.id)}</div>
    <p><b>${esc(d.name)}</b> sells for <b>🪙 ${fmt(d.price)}</b>.</p>
    <p class="muted">Milbils will start ordering it straight away.</p>`, [{ label: 'Yum!', cls: 'go' }]);
}

async function buyPlace(id){
  const P = PLACE[id];
  if (!P || owns(id)) return;
  if (!spend(P.cost)) return cantAfford(P.cost);
  S.places.push(id);
  moveTo(id, true);
  sfx('level');
  confetti();
  await card(`<h3 class="big-title">🎉 Welcome to your<br>${P.name}!</h3>
    <p>${P.drive
      ? `Milbils drive up in cars and order at the speaker. Cook their food, and it goes out of the window in a bag. Up to <b>${P.cars} cars</b> can queue.`
      : `Room for <b>${P.maxTables} tables</b>. You own ${S.tables}${S.tables < P.maxTables ? ', and you can buy more' : ''}.`}</p>
    <p class="muted">You can move back to your other restaurants from Upgrade → Restaurants.</p>`,
    [{ label: 'Let\'s cook!', cls: 'go' }]);
}

/** Move restaurants. Anyone still waiting goes home, and the doors open again. */
function moveTo(id, bought = false){
  if (!owns(id)) return;
  S.place = id;
  save();
  if (game.kitchen.cook){ game.kitchen.cook = null; if (game.kitchen.isOpen) game.kitchen.close(); }
  game.room.clear();
  game.room.build();
  sheet.close();
  afterBuy();
  if (!bought){ sfx('door'); toast(`Welcome back to your ${place().name}!`, 'good'); }
}

function cantAfford(cost){
  sfx('nope');
  toast(`You need 🪙${fmt(cost - S.coins)} more. Cook some more dishes!`);
}

async function offerTable(){
  const cost = nextTableCost();
  if (cost == null) return;
  sfx('tap');
  if (S.coins < cost) return cantAfford(cost);
  const yes = await card(`<div class="bin-pic">🪑</div><h3>Buy another table?</h3><p>It costs 🪙 <b>${fmt(cost)}</b>. More tables means more customers at once.</p>`,
    [{ label: 'Not now', value: false }, { label: `Buy for 🪙${fmt(cost)}`, cls: 'go', value: true }]);
  if (yes) buyTable();
}

function buyTable(){
  const cost = nextTableCost();
  if (cost == null) return;
  if (!spend(cost)) return cantAfford(cost);
  S.tables++;
  save();
  sfx('buy');
  game.room.build();
  toast(`🪑 New table! You have ${S.tables} now.`, 'good');
  afterBuy();
}

async function buyMachine(){
  const cost = nextMachineCost();
  if (cost == null) return;
  if (!spend(cost)) return cantAfford(cost);
  S.machines++;
  save();
  sfx('buy');
  game.room.build();
  afterBuy();
  if (S.machines === 1){
    sheet.close();
    await card(`<div class="bin-pic">🧾</div><h3>Your ordering machine is ready!</h3>
      <p>Customers now order on it as they walk in. Tap <b>🧾 Orders</b> at the bottom to see every order, then tap one to start cooking it.</p>`,
      [{ label: 'Great!', cls: 'go' }]);
  } else toast(`🧾 Machine ${S.machines} is up and running!`, 'good');
}

function afterBuy(){
  hud();
  game.ordersChanged();
  if (sheet.is('shop') || sheet.is('menu')) sheet.render();
}

function confetti(){
  const box = document.createElement('div');
  box.className = 'confetti';
  const colors = ['#ff6fa5', '#ffc93c', '#4cc9f0', '#7bd389', '#b388ff', '#ff9a3c'];
  for (let i = 0; i < 60; i++){
    const b = document.createElement('i');
    b.style.left = `${Math.random() * 100}%`;
    b.style.background = colors[i % colors.length];
    b.style.animationDelay = `${Math.random() * 0.6}s`;
    b.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    box.appendChild(b);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 3500);
}

// ----------------------------------------------------------- settings ---

function openSettings(){
  sfx('tap');
  sheet.show({
    key: 'settings', icon: '⚙️',
    title: 'Settings',
    sub: () => esc(signName()),
    render: () => `
      <div class="set-row"><span>🔊 Sound</span><button type="button" class="btn ${S.sound ? 'go' : ''}" data-act="sound">${S.sound ? 'On' : 'Off'}</button></div>
      <div class="set-row"><span>🎨 Your chef</span><button type="button" class="btn" data-act="chef">Change</button></div>
      <div class="set-row"><span>🪧 Restaurant sign</span><button type="button" class="btn" data-act="sign">Change</button></div>
      <div class="set-row"><span>❓ How to play</span><button type="button" class="btn" data-act="how">Show me</button></div>
      <div class="stats">
        <div><b>${fmt(S.served)}</b><small>dishes served</small></div>
        <div><b>🪙 ${fmt(S.earned)}</b><small>coins earned</small></div>
        <div><b>${S.tables}</b><small>tables</small></div>
      </div>
      <button type="button" class="btn warn wide" data-act="wipe">Start a new restaurant</button>`,
    onAct: async (act) => {
      if (act === 'sound'){ S.sound = !S.sound; setSound(S.sound); save(); sfx('tap'); sheet.render(); }
      if (act === 'chef'){ sheet.close(); showWelcome(true); }
      if (act === 'sign') game.openSign();
      if (act === 'how'){ sheet.close(); howToPlay(); }
      if (act === 'wipe'){
        const yes = await card(`<h3>Start a brand new restaurant?</h3><p>You'll lose your coins, tables, machines and restaurant, and go back to a Little Café. Your chef stays.</p>`,
          [{ label: 'No, keep it', value: false }, { label: 'Start again', cls: 'warn', value: true }]);
        if (yes){ wipe(); location.reload(); }
      }
    },
  });
}

function howToPlay(){
  return card(`<h3>How to play</h3>
    <ol class="how">
      <li><span>👆</span>A hungry milbil sits down. Tap them to see what they want.</li>
      <li><span>📋</span>In the kitchen, follow the recipe one step at a time.</li>
      <li><span>⬇️</span>Drag each ingredient <b>down</b> from the shelf onto the counter.</li>
      <li><span>🔪</span>Then swipe to do the step: down to chop, up and down to mash, round and round to stir.</li>
      <li><span>🍽️</span>Tap <b>Serve</b>. Got it all right? They pay you! Got it wrong? Try again.</li>
      <li><span>🛒</span>Buy new food from the menu. Each one sells for more than the last.</li>
      <li><span>🛠️</span>Spend coins on tables, ordering machines and new restaurants, like the Drive-Through.</li>
    </ol>`, [{ label: 'Got it!', cls: 'go' }]);
}

// ------------------------------------------------------------ welcome ---

function showWelcome(editing = false){
  const w = $('#welcome');
  const input = $('#nameInput');
  let color = S.color;
  input.value = S.name || '';
  const draw = () => {
    $('#welcomeMilbil').innerHTML = drawLook(chefLook(color), { mood: 'happy' });
    $('#swatches').innerHTML = COLORS.map(c => `<button type="button" role="radio" aria-checked="${c === color}" class="sw ${c === color ? 'on' : ''}" data-c="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('');
  };
  draw();
  $('#welcomeLead').innerHTML = editing ? 'Change your chef.' : 'You\'re a <b>milbil chef</b> with a little café.';
  $('#welcomeText').hidden = editing;
  $('#howBtn').hidden = editing;
  $('#startBtn').textContent = editing ? '✓ Save' : '🍳 Open my café!';
  $('#swatches').onclick = (e) => { const b = e.target.closest('[data-c]'); if (b){ color = b.dataset.c; sfx('tap'); draw(); } };
  $('#nameDice').onclick = () => { input.value = pick(NAMES); sfx('tap'); };
  $('#howBtn').onclick = () => howToPlay();
  $('#startBtn').onclick = () => {
    const name = input.value.trim();
    if (!name){ sfx('nope'); input.focus(); input.classList.remove('shake'); void input.offsetWidth; input.classList.add('shake'); return; }
    S.name = name.slice(0, 14);
    S.color = color;
    const first = !S.started;
    S.started = true;
    save();
    sfx('buy');
    w.classList.add('out');
    setTimeout(() => { w.hidden = true; w.classList.remove('out'); }, 300);
    game.room.build();
    game.kitchen.drawChef();
    hud();
    if (first) game.openSign(true);
  };
  w.hidden = false;
}

// --------------------------------------------------------------- boot ---

setupSignMaker();
game.kitchen = new Kitchen(game);
game.room = new Restaurant(game);
game.kitchen.drawChef();

$('#menuBtn').addEventListener('click', openMenu);
$('#kitchenBtn').addEventListener('click', () => game.openKitchen());
$('#ordersBtn').addEventListener('click', openOrders);
$('#shopBtn').addEventListener('click', () => openShop());
$('#settingsBtn').addEventListener('click', openSettings);
$('#meBtn').addEventListener('click', () => { sfx('tap'); showWelcome(true); });

hud();
game.ordersChanged();
if (!S.started) showWelcome(false);

// Show a first-timer who to tap.
let taught = S.served > 0;
let lastSheetRender = 0;
function loop(){
  const now = performance.now() / 1000;
  if (S.started){
    game.room.tick(now);
    game.kitchen.frame();
    if (!taught){
      const c = game.room.customers.find(x => x.state === 'order' || x.state === 'wait');
      if (c && !game.kitchen.isOpen && !sheet.open){ c.el.classList.add('teach'); taught = true; }
    }
    if (sheet.is('orders') && now - lastSheetRender > 1 && !sheet.pressing){ lastSheetRender = now; sheet.render(); }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// For testing in the browser console.
window.COOK = {
  coins(n = 1000){ earn(n); hud(); },
  game, S, pickDish,
  wipe(){ localStorage.removeItem('milbil-cooking-v1'); location.reload(); },
};
