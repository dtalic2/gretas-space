// ---------- The other cafés in town, and the leaderboard ----------
//
// Ten milbil cafés, five of them run by Greta's own drawings.
//
// Free play: they earn at about your pace (a little slower when they're well
// ahead, a little faster when they're well behind), so it stays a race however
// far you've got.
//
// Time mode: every rival runs a real café with the same menu and prices as
// yours, starting from nothing. It earns from the foods it has, and buys
// whichever upgrade pays best, as long as it has time to pay for itself. How
// fast it serves is its own skill, so it doesn't speed up or slow down with
// you. Play well and you'll beat it.
//
// Rivals never use abilities on you.

import { G, cafeName } from './game.js';
import { RIVALS, RIVAL_BY_ID, CHEF_LOOK, FOODS, CAFE_LEVELS, MAX_LEVEL,
         RACE_Q, RACE_S, RACE_JITTER, cafeOf, cafePay } from './data.js';
import { drawLook, artHTML } from './milbil.js';
import { money, ordinal } from './format.js';
import { $, esc, toast } from './ui.js';

const BASE_RATE = 0.6;      // free play: $ per second they make even when you're not earning

// ----------------------------------------------------------- cash ---

export function rivalCash(id){
  return G.race ? G.race.rivals[id].cash : (G.s.rivals[id] || 0);
}
export function setRivalCash(id, v){
  if (G.race) G.race.rivals[id].cash = v;
  else G.s.rivals[id] = v;
}

export function standings(){
  const rows = [{ id: 'me', name: G.s.name || 'You', cafe: cafeName(), cash: G.s.cash, me: true },
    ...RIVALS.map(r => ({ ...r, cafe: cafeOf(r), cash: rivalCash(r.id) }))];
  return rows.sort((a, b) => b.cash - a.cash || (a.me ? -1 : b.me ? 1 : 0));
}
export const myRank = () => standings().findIndex(r => r.me) + 1;

/** Picture of anyone on the leaderboard. */
export function faceHTML(row){
  if (row.me) return drawLook(CHEF_LOOK, { title: 'You' });
  const r = RIVAL_BY_ID[row.id];
  return r.art ? artHTML(r.art, r.name) : drawLook(r.look, { title: r.name });
}

// ------------------------------------------------------- time mode ---

const sps = (n) => 5 * n / (RACE_Q + 5 * n / RACE_S);

function income(r){
  let sum = 0, n = 0;
  FOODS.forEach((f, i) => { if (r.lv[i]){ sum += f.prices[r.lv[i] - 1]; n++; } });
  return n ? sps(n) * r.skill * (sum / n) * cafePay(CAFE_LEVELS[r.cafe - 1]) : 0;
}

// Every purchase a rival could make next: the next food, any upgrade, or the
// next café level.
function choices(r){
  const out = [];
  const n = r.lv.filter(Boolean).length;
  if (n < FOODS.length) out.push({ cost: FOODS[n].costs[0], apply: (x) => { x.lv[n] = 1; } });
  r.lv.forEach((l, i) => {
    if (l && l < MAX_LEVEL) out.push({ cost: FOODS[i].costs[l], apply: (x) => { x.lv[i]++; } });
  });
  if (r.cafe < CAFE_LEVELS.length) out.push({ cost: CAFE_LEVELS[r.cafe].cost, apply: (x) => { x.cafe++; } });
  return out;
}

// Buy the best-value thing, as often as it can afford to, but only things
// that will earn their cost back before the time runs out.
function shop(r, timeLeft){
  for (let guard = 0; guard < 20; guard++){
    const now = income(r);
    let best = null;
    for (const c of choices(r)){
      const after = { lv: r.lv.slice(), cafe: r.cafe, skill: r.skill };
      c.apply(after);
      const gain = income(after) - now;
      if (gain <= 0 || gain * timeLeft * r.greed < c.cost) continue;
      const value = gain / Math.max(1, c.cost);
      if (!best || value > best.value) best = { ...c, value };
    }
    if (!best || best.cost > r.cash) return;
    r.cash -= best.cost;
    best.apply(r);
  }
}

/** Fresh rival cafés for a race, each a little better or worse than usual. */
export function raceRivals(){
  return Object.fromEntries(RIVALS.map(r => [r.id, {
    cash: 0, lv: FOODS.map((f, i) => i === 0 ? 1 : 0), cafe: 1,
    skill: r.skill * (1 + (Math.random() * 2 - 1) * RACE_JITTER),
    greed: r.greed,
  }]));
}

// ------------------------------------------------------------ tick ---

let lastRank = 0;
let lastCheer = -Infinity;

/** Once a second while you're playing. */
export function tickRivals(dt){
  // Your pace: earnings over the last half a minute or so.
  G.rate = G.rate * 0.95 + (G.earnedThisSec / dt) * 0.05;
  G.earnedThisSec = 0;

  const now = performance.now();
  const you = Math.max(50, G.s.cash);
  for (const r of RIVALS){
    const off = G.rivalOff[r.id];
    if (off && now < off.until) continue;
    if (off) delete G.rivalOff[r.id];

    if (G.race){
      const rv = G.race.rivals[r.id];
      shop(rv, G.race.left);
      const made = income(rv) * dt;
      rv.cash += made;
    } else {
      const cash = G.s.rivals[r.id] || 0;
      const ratio = cash / you;
      const band = ratio > 1.4 ? 0.5 : ratio < 0.6 ? 1.6 : 1;
      const wobble = 0.6 + Math.random() * 0.8;
      G.s.rivals[r.id] = cash + Math.max(BASE_RATE, G.rate) * r.pace * band * wobble * dt;
    }
  }

  // Cheer when you take 1st place, but not every time it swaps back and forth.
  const rank = myRank();
  if (lastRank > 1 && rank === 1 && G.s.cash >= 20 && now - lastCheer > 90000){
    lastCheer = now;
    toast(`🏆 <b>${esc(cafeName())}</b> is in 1st place!`, 'good big');
  }
  lastRank = rank;
  renderRankPill();
}

export function resetRankCheer(){ lastRank = 0; lastCheer = -Infinity; }

export function renderRankPill(){
  const rank = myRank();
  const pill = $('#rankBtn');
  pill.querySelector('b').textContent = ordinal(rank);
  pill.dataset.rank = rank;
}

// ------------------------------------------------------- leaderboard ---

/** Status line for a rival hit by an ability. */
export function offText(id){
  const off = G.rivalOff[id];
  if (!off) return '';
  const s = Math.ceil((off.until - performance.now()) / 1000);
  if (s <= 0) return '';
  return off.why === 'trash' ? `🗑️ No food for ${s}s` : `🔍 Shut for inspection ${s}s`;
}

const MEDALS = ['🥇', '🥈', '🥉'];
export const medal = (i) => MEDALS[i] || `<span class="place-num">${i + 1}</span>`;

export function rowsHTML(rows){
  return `<div class="board">${rows.map((r, i) => `
    <div class="board-row ${r.me ? 'me' : ''}">
      <span class="medal">${medal(i)}</span>
      <span class="board-pic">${faceHTML(r)}</span>
      <span class="board-name"><b>${esc(r.me ? cafeName() : r.cafe)}</b><small>${r.me ? 'You!' : offText(r.id)}</small></span>
      <span class="board-cash">${money(r.cash)}</span>
    </div>`).join('')}</div>`;
}

export function boardHTML(){
  const note = G.race
    ? `Whoever has the most cash when the time runs out wins. Every other café started from nothing too, with the same menu as you.`
    : `The other cafés earn at about your pace, so keep serving to stay on top!`;
  return `${rowsHTML(standings())}<p class="note">${note}</p>`;
}

/** Buttons for picking which café an ability hits. */
export function targetHTML(abilityId){
  return `<div class="targets">${RIVALS.map(r => `
    <button type="button" class="target" data-act="target" data-id="${abilityId}:${r.id}">
      <span class="board-pic">${faceHTML(r)}</span>
      <span class="board-name"><b>${esc(cafeOf(r))}</b><small>${offText(r.id) || money(rivalCash(r.id))}</small></span>
    </button>`).join('')}</div>`;
}
