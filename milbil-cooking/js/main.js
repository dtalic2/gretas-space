// ---------- Milbil Cooking ----------
//
// Start-up, the screens around the edge (menu, orders, upgrades, settings),
// paying and buying, and the game loop. The dining room is restaurant.js and
// the cooking is kitchen.js.

import { DISHES, DISH, TIERS, COLORS, NAMES, MACHINE_COSTS, tipShare } from './data.js';
import { S, load, save, wipe, tier, nextTier, nextTableCost, nextMachineCost, spend, earn, fmt } from './state.js';
import { Restaurant } from './restaurant.js';
import { Kitchen } from './kitchen.js';
import { menuDishSVG, ingredientSVG } from './food.js';
import { drawLook, chefLook, customerHTML } from './milbil.js';
import { $, esc, toast, floatText, Sheet, card, sfx, setSound } from './ui.js';

load();
setSound(S.sound);
const sheet = new Sheet($('#sheet'));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const stars = (n) => '★'.repeat(n) + '☆'.repeat(TIERS.length - n);

// --------------------------------------------------------------- game ---

const game = {
  room: null,
  kitchen: null,

  ordersChanged(){
    const n = this.room.orders.length;
    $('#ordersBtn').hidden = S.machines === 0;
    $('#ordersBadge').textContent = n || '';
    const kOrders = $('#kOrders');
    kOrders.hidden = S.machines === 0;
    $('em', kOrders).textContent = n || '';
    const cooking = this.kitchen.cook && this.kitchen.cook.cust.state === 'wait';
    $('#kitchenBadge').textContent = cooking ? '…' : (S.machines === 0 && n ? n : '');
    if (sheet.is('orders') && !sheet.pressing) sheet.render();
    for (const c of this.room.customers) this.room.renderCust(c);
  },

  openKitchen(){
    sfx('tap');
    const k = this.kitchen;
    if (k.cook && k.cook.cust.state === 'wait') return k.open(k.cook.cust);
    if (S.machines > 0) return openOrders();
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

  /** A perfect dish: the chef takes it out, and they pay. */
  served(c, layers){
    const d = DISH[c.dish];
    const base = d.price * (c.vip ? 2 : 1);
    const tip = Math.round(d.price * tipShare(this.room.now - c.orderedAt));
    this.room.serve(c, layers, (el) => {
      earn(base + tip);
      S.served++;
      S.perfect[d.id] = (S.perfect[d.id] || 0) + 1;
      save();
      sfx('coin');
      floatText(el, `+${fmt(base + tip)} 🪙`);
      if (tip) toast(`⭐ Speedy service! ${esc(c.name)} gave you a tip of <b>🪙 ${fmt(tip)}</b>`, 'good');
      hud(true);
    });
    hud();
  },

  offerTable(){ offerTable(); },
};

// ---------------------------------------------------------------- HUD ---

function hud(bump = false){
  $('#coins').textContent = fmt(S.coins);
  $('#placeName').textContent = tier().name;
  $('#placeStars').textContent = stars(S.tier);
  $('#meAvatar').innerHTML = drawLook(chefLook(S.color), { title: S.name });
  if (bump){ const p = $('#coinPill'); p.classList.remove('bump'); void p.offsetWidth; p.classList.add('bump'); }
  // A dot on Upgrade when there's something you can afford.
  const can = [nextTableCost(), nextMachineCost(), nextTier()?.cost].some(c => c != null && c <= S.coins);
  $('#shopBadge').textContent = can ? '!' : '';
}

// --------------------------------------------------------------- menu ---

let openDish = null;
function openMenu(){
  sfx('tap');
  sheet.show({
    key: 'menu', icon: '📖', cls: 'tall',
    title: 'Menu',
    sub: 'What milbils can order, and what they pay you',
    render: () => TIERS.map(T => {
      const open = T.n <= S.tier;
      const dishes = DISHES.filter(d => d.tier === T.n);
      return `<h3 class="menu-head ${open ? '' : 'locked'}">${open ? '' : '🔒 '}${T.name}${open ? '' : ` <small>opens when you get the ${T.name}</small>`}</h3>
        <div class="menu-grid">${dishes.map((d, i) => `
          <button type="button" class="menu-card ${open ? '' : 'locked'} ${openDish === d.id ? 'open' : ''}" data-act="dish" data-id="${d.id}">
            ${menuDishSVG(d.id)}
            <b>${esc(d.name)}</b>
            <span class="price">🪙 ${fmt(d.price)}</span>
            ${S.perfect[d.id] ? `<small class="made">Made ${S.perfect[d.id]}×</small>` : ''}
          </button>
          ${i % 2 ? [dishes[i - 1], d].filter(x => x.id === openDish).map(recipeHTML).join('') : ''}`).join('')}</div>`;
    }).join('') + '<p class="menu-foot">⭐ VIPs pay double. Serve fast for a tip!</p>',
    onAct: (act, id) => {
      if (act === 'dish'){ sfx('tap'); openDish = openDish === id ? null : id; sheet.render(); }
    },
  });
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
    sub: () => `From your ordering machine${S.machines > 1 ? 's' : ''}. Tap one to cook it.`,
    render: () => {
      const list = game.room.orders;
      if (!list.length) return `<div class="empty"><div class="empty-ico">🧾</div><p>No orders yet.</p><p class="muted">Customers order on the machine as they walk in.</p></div>`;
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

function openShop(){
  sfx('tap');
  sheet.show({
    key: 'shop', icon: '🛠️', cls: 'tall',
    title: 'Upgrade',
    sub: () => `You have 🪙 ${fmt(S.coins)}`,
    render: () => {
      const T = tier(), N = nextTier(), tc = nextTableCost(), mc = nextMachineCost();
      const newDishes = N ? DISHES.filter(d => d.tier === N.n) : [];
      return `
        <h3 class="shop-head">🏠 Bigger restaurant</h3>
        ${N ? `<div class="up-card big">
          <div class="up-top"><div><b>${N.name}</b><small>${stars(N.n)}</small></div>
            <button type="button" class="btn buy" data-act="tier" ${S.coins < N.cost ? 'disabled' : ''}>🪙 ${fmt(N.cost)}</button></div>
          <p>Room for <b>${N.maxTables} tables</b> and ${newDishes.length} new dishes that pay more:</p>
          <div class="up-dishes">${newDishes.map(d => `<span>${menuDishSVG(d.id)}<small>🪙${d.price}</small></span>`).join('')}</div>
        </div>` : `<div class="up-card"><b>You own the Milbil Palace! 👑</b><p>It's the biggest restaurant there is.</p></div>`}

        <h3 class="shop-head">🪑 Tables <small>${S.tables} of ${T.maxTables}</small></h3>
        <div class="up-card">
          <div class="up-top"><p>More tables, more customers at once.</p>
            ${tc != null ? `<button type="button" class="btn buy" data-act="table" ${S.coins < tc ? 'disabled' : ''}>🪙 ${fmt(tc)}</button>`
              : `<span class="full">${N ? 'Full! Get a bigger restaurant for more room.' : 'Full!'}</span>`}</div>
        </div>

        <h3 class="shop-head">🧾 Ordering machines <small>${S.machines} of ${MACHINE_COSTS.length}</small></h3>
        <div class="up-card">
          <div class="up-top"><p>${S.machines ? 'Each extra machine brings customers in faster.' : 'Customers order on it as they walk in, so you don\'t have to take their order. Every order shows up in the 🧾 Orders list: tap one and start cooking.'}</p>
            ${mc != null ? `<button type="button" class="btn buy" data-act="machine" ${S.coins < mc ? 'disabled' : ''}>🪙 ${fmt(mc)}</button>` : '<span class="full">All built!</span>'}</div>
        </div>`;
    },
    onAct: (act) => {
      if (act === 'tier') buyTier();
      if (act === 'table') buyTable();
      if (act === 'machine') buyMachine();
    },
  });
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

async function buyTier(){
  const N = nextTier();
  if (!N) return;
  if (!spend(N.cost)) return cantAfford(N.cost);
  S.tier = N.n;
  save();
  sfx('level');
  game.room.build();
  afterBuy();
  sheet.close();
  confetti();
  const fresh = DISHES.filter(d => d.tier === N.n);
  await card(`<h3 class="big-title">🎉 Welcome to your<br>${N.name}!</h3>
    <p>Room for <b>${N.maxTables} tables</b>, and new dishes on the menu:</p>
    <div class="up-dishes">${fresh.map(d => `<span>${menuDishSVG(d.id)}<small>${esc(d.name)}</small></span>`).join('')}</div>`,
    [{ label: 'Let\'s cook!', cls: 'go' }]);
}

function afterBuy(){
  hud();
  game.ordersChanged();
  if (sheet.is('shop')) sheet.render();
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
    sub: () => `${esc(S.name)}'s ${tier().name}`,
    render: () => `
      <div class="set-row"><span>🔊 Sound</span><button type="button" class="btn ${S.sound ? 'go' : ''}" data-act="sound">${S.sound ? 'On' : 'Off'}</button></div>
      <div class="set-row"><span>🎨 Your chef</span><button type="button" class="btn" data-act="chef">Change</button></div>
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
      <li><span>🛠️</span>Spend coins on tables, ordering machines and a bigger restaurant.</li>
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
    if (first) game.room.nextSpawn = game.room.now + 1;
  };
  w.hidden = false;
}

// --------------------------------------------------------------- boot ---

game.kitchen = new Kitchen(game);
game.room = new Restaurant(game);
game.kitchen.drawChef();

$('#menuBtn').addEventListener('click', openMenu);
$('#kitchenBtn').addEventListener('click', () => game.openKitchen());
$('#ordersBtn').addEventListener('click', openOrders);
$('#shopBtn').addEventListener('click', openShop);
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
  game, S,
  wipe(){ localStorage.removeItem('milbil-cooking-v1'); location.reload(); },
};
