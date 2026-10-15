// ---------- The Shop: food, café upgrades and abilities ----------
//
// Open it any time, like a Blooket live game. Food is Blooket Café's menu:
// unlock each food, then upgrade it four times to sell it for more. Each
// level puts it on a new colour of plate. Café upgrades make everything sell
// for more, and redecorate.

import { G, emit, spend, addCash, addStock, priceOf, cafeLevel, persist, boost } from './game.js';
import { FOODS, PLATES, CAFE_LEVELS, ABILITIES, ABILITY_BY_ID, MAX_LEVEL, UNLOCK_STOCK,
         HAPPY_MS, TRASH_MS, INSPECT_MS, CRATE_STOCK, TAX_RATE, RIVALS, cafeOf, extraText } from './data.js';
import { foodSVG } from './food.js';
import { money, times } from './format.js';
import { sfx } from './audio.js';
import { esc, toast } from './ui.js';
import { targetHTML, rivalCash, setRivalCash } from './rivals.js';
import { clockHTML } from './race.js';

let sheet = null;
let aiming = null;          // ability waiting for you to pick a café

export function initShop(s){ sheet = s; }

export function openShop(tab = 'food'){
  aiming = null;
  sheet.open({
    name: 'shop', icon: '🛒', title: 'Shop',
    tabs: [{ id: 'food', label: '🍞 Food' }, { id: 'cafe', label: '☕ Café' }, { id: 'powers', label: '⚡ Abilities' }],
    extra: () => `${clockHTML()}<span class="cash-mini">${money(G.s.cash)}</span>`,
    render,
    onAct,
    onClose: () => { aiming = null; },
  });
  sheet.cur.tab = tab;
  sheet.render();
}

/** Keep prices and buttons fresh while it's open. */
export function refreshShop(){ if (sheet?.is('shop')) sheet.render(); }

function render(tab){
  if (tab === 'cafe') return cafeTab();
  if (tab === 'powers') return aiming ? aimTab() : powersTab();
  return foodTab();
}

const pips = (lvl) => `<span class="pips">${PLATES.map((p, i) =>
  `<i style="--c:${i < lvl ? p.rim : '#0000'}" class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>`;

function buyBtn(act, id, cost, label){
  const can = G.s.cash >= cost;
  return `<button type="button" class="buy ${can ? 'can' : ''}" data-act="${act}" data-id="${id}" ${can ? '' : 'disabled'}>
    <small>${label}</small><b>${money(cost)}</b></button>`;
}

function foodTab(){
  const c = cafeLevel();
  return `<p class="note">Each food sells for more at every level, and goes on a fancier plate.
    ${c.mult > 1
      ? `Your café makes everything sell for <b>×${c.mult}</b>, and milbils pay <b>${extraText(c)} more</b>.`
      : `Milbils pay <b>${extraText(c)} more</b> at your café.`}
    Every milbil you serve makes the next one pay 10% more: right now <b>${times(boost())}</b>, and it's in these prices.</p>
    <div class="cards">${FOODS.map(f => {
      const lvl = G.s.foods[f.id] || 0;
      const plate = PLATES[Math.max(0, lvl - 1)];
      let right, sell;
      if (!lvl){
        right = buyBtn('unlock', f.id, f.costs[0], 'Unlock');
        sell = `Sells for <b>${money(priceOf(f.id, 1))}</b>`;
      } else if (lvl < MAX_LEVEL){
        right = buyBtn('upgrade', f.id, f.costs[lvl], `Level ${lvl + 1}`);
        sell = `Sells for <b>${money(priceOf(f.id))}</b> → <b class="up">${money(priceOf(f.id, lvl + 1))}</b>`;
      } else {
        right = `<span class="maxed">⭐ MAX</span>`;
        sell = `Sells for <b>${money(priceOf(f.id))}</b>`;
      }
      return `<div class="card food-card ${lvl ? '' : 'locked'}">
        <span class="plate big" style="--plate:${plate.color};--rim:${plate.rim}">${foodSVG(f.id)}</span>
        <span class="card-mid">
          <b class="card-name">${f.name}</b>
          ${lvl ? pips(lvl) : '<span class="locked-tag">🔒 Locked</span>'}
          <small>${sell}</small>
        </span>
        ${right}
      </div>`;
    }).join('')}</div>`;
}

function cafeTab(){
  const cur = G.s.cafe;
  return `<p class="note">A bigger café makes <b>everything</b> you sell worth more, makes milbils pay extra on top, and gives it a new look.</p>
    <div class="cards">${CAFE_LEVELS.map((c, i) => {
      const lvl = i + 1;
      let right;
      if (lvl <= cur) right = `<span class="maxed">${lvl === cur ? '✅ Now' : '✓'}</span>`;
      else if (lvl === cur + 1) right = buyBtn('cafe', String(lvl), c.cost, 'Upgrade');
      else right = `<span class="maxed dim">🔒 ${money(c.cost)}</span>`;
      return `<div class="card cafe-card ${lvl === cur ? 'now' : ''}">
        <span class="swatch" data-lv="${lvl}"><i></i></span>
        <span class="card-mid">
          <b class="card-name">Level ${lvl}: ${c.look}</b>
          <small>Everything sells for <b>×${c.mult}</b>, and milbils pay <b>${extraText(c)} more</b></small>
        </span>
        ${right}
      </div>`;
    }).join('')}</div>`;
}

function powersTab(){
  return `<p class="note">Use them as often as you like. Using one again while it's still going adds more time.</p>
    <div class="cards">${ABILITIES.map(a => `<div class="card power-card">
        <span class="power-icon">${a.icon}</span>
        <span class="card-mid"><b class="card-name">${a.name}</b><small>${a.text}</small></span>
        ${buyBtn('power', a.id, a.cost, a.target ? 'Pick a café' : 'Use')}
      </div>`).join('')}</div>`;
}

function aimTab(){
  const a = ABILITY_BY_ID[aiming];
  return `<p class="note"><b>${a.icon} ${a.name}</b> — which café?</p>
    ${targetHTML(a.id)}
    <button type="button" class="link-btn" data-act="cancel">Never mind</button>`;
}

function onAct(act, id){
  if (act === 'unlock' || act === 'upgrade'){
    const f = FOODS.find(x => x.id === id);
    const lvl = G.s.foods[id] || 0;
    if (lvl >= MAX_LEVEL || !spend(f.costs[lvl])) return;
    G.s.foods[id] = lvl + 1;
    if (!lvl){
      G.s.stock[id] = (G.s.stock[id] || 0) + UNLOCK_STOCK;
      G.s.hints.bought = true;
      toast(`${foodSVG(id, 'food inline')} <b>${f.name}</b> is on the menu!`, 'good');
    } else {
      toast(`${foodSVG(id, 'food inline')} <b>${f.name}</b> is level ${lvl + 1}! It sells for <b>${money(priceOf(id))}</b>`, 'good');
    }
    sfx('buy');
    emit('menu');
  }
  else if (act === 'cafe'){
    const lvl = Number(id);
    if (lvl !== G.s.cafe + 1 || !spend(CAFE_LEVELS[lvl - 1].cost)) return;
    G.s.cafe = lvl;
    sfx('power');
    const c = CAFE_LEVELS[lvl - 1];
    toast(`☕ Your café is now <b>${c.look}</b>! Everything sells for <b>×${c.mult}</b>, and milbils pay <b>${extraText(c)} more</b>`, 'good big');
    emit('cafe');
    emit('menu');
  }
  else if (act === 'power'){
    const a = ABILITY_BY_ID[id];
    if (!a || G.s.cash < a.cost) return;
    if (a.target){ aiming = id; sheet.render(); return; }
    if (!spend(a.cost)) return;
    usePower(a);
  }
  else if (act === 'target'){
    const [aid, rid] = id.split(':');
    const a = ABILITY_BY_ID[aid];
    if (!a || !spend(a.cost)) return;
    aiming = null;
    usePower(a, RIVALS.find(r => r.id === rid));
  }
  else if (act === 'cancel'){
    aiming = null;
  }
  persist();
  sheet.render();
}

// Abilities can be used again and again. One that lasts a while gets longer
// if you use it again before it runs out.
function lastsUntil(until, ms){ return Math.max(performance.now(), until || 0) + ms; }
const secsLeft = (until) => Math.ceil((until - performance.now()) / 1000);

function usePower(a, rival){
  sfx('power');
  switch (a.id){
    case 'paycheck': {
      const bonus = Math.round(G.s.cash * 0.25);
      addCash(bonus);
      toast(`💵 Paycheck Bonus! <b>+${money(bonus)}</b>`, 'good big');
      break;
    }
    case 'crate':
      addStock(CRATE_STOCK);
      toast(`📦 Supply Crate! <b>+${CRATE_STOCK}</b> of every food`, 'good big');
      break;
    case 'happy':
      G.happyUntil = lastsUntil(G.happyUntil, HAPPY_MS);
      toast(`😊 Happy Customers! Everyone pays <b>double</b> for ${secsLeft(G.happyUntil)} seconds`, 'good big');
      emit('happy');
      break;
    case 'trash': {
      const until = lastsUntil(G.rivalOff[rival.id]?.until, TRASH_MS);
      G.rivalOff[rival.id] = { until, why: 'trash' };
      toast(`🗑️ <b>${esc(cafeOf(rival))}</b> has no food for ${secsLeft(until)} seconds!`, 'good big');
      break;
    }
    case 'inspect': {
      const until = lastsUntil(G.rivalOff[rival.id]?.until, INSPECT_MS);
      G.rivalOff[rival.id] = { until, why: 'inspect' };
      toast(`🔍 <b>${esc(cafeOf(rival))}</b> is shut for an inspection for ${secsLeft(until)} seconds!`, 'good big');
      break;
    }
    case 'taxes': {
      let got = 0;
      for (const r of RIVALS){
        const take = Math.round(rivalCash(r.id) * TAX_RATE);
        setRivalCash(r.id, rivalCash(r.id) - take);
        got += take;
      }
      addCash(got);
      toast(`🧾 TAXES!!! The other cafés paid you <b>${money(got)}</b>`, 'good big');
      break;
    }
  }
}

