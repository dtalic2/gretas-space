// ---------- The other cafés in town, and the leaderboard ----------
//
// In Blooket you race the rest of the class. Here you race three milbil cafés
// run by Greta's own drawings. They earn at about your pace (a little slower
// when they're well ahead, a little faster when they're well behind), so it
// stays a race however far you've got. They never use abilities on you.

import { G, cafeName } from './game.js';
import { RIVALS, CHEF_LOOK } from './data.js';
import { drawLook, artHTML } from './milbil.js';
import { money, ordinal } from './format.js';
import { $, esc, toast } from './ui.js';

const BASE_RATE = 0.6;      // $ per second they make even when you're not earning

export function standings(){
  const rows = [{ id: 'me', name: cafeName(), cash: G.s.cash, me: true },
    ...RIVALS.map(r => ({ ...r, cash: G.s.rivals[r.id] || 0 }))];
  return rows.sort((a, b) => b.cash - a.cash || (a.me ? -1 : b.me ? 1 : 0));
}
export const myRank = () => standings().findIndex(r => r.me) + 1;

let lastRank = 0;
let lastCheer = -Infinity;

/** Once a second. */
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
    const cash = G.s.rivals[r.id] || 0;
    const ratio = cash / you;
    const band = ratio > 1.4 ? 0.5 : ratio < 0.6 ? 1.6 : 1;
    const wobble = 0.6 + Math.random() * 0.8;
    G.s.rivals[r.id] = cash + Math.max(BASE_RATE, G.rate) * r.pace * band * wobble * dt;
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

export function renderRankPill(){
  const rank = myRank();
  const pill = $('#rankBtn');
  pill.querySelector('b').textContent = ordinal(rank);
  pill.dataset.rank = rank;
}

/** Status line for a rival hit by an ability. */
function offText(id){
  const off = G.rivalOff[id];
  if (!off) return '';
  const s = Math.ceil((off.until - performance.now()) / 1000);
  if (s <= 0) return '';
  return off.why === 'trash' ? `🗑️ No food for ${s}s` : `🔍 Shut for inspection ${s}s`;
}

const MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];

export function boardHTML(){
  return `<div class="board">${standings().map((r, i) => `
    <div class="board-row ${r.me ? 'me' : ''}">
      <span class="medal">${MEDALS[i]}</span>
      <span class="board-pic">${r.me ? drawLook(CHEF_LOOK, { title: 'You' }) : artHTML(r.art, r.name)}</span>
      <span class="board-name"><b>${esc(r.name)}</b><small>${r.me ? 'You!' : offText(r.id)}</small></span>
      <span class="board-cash">${money(r.cash)}</span>
    </div>`).join('')}</div>
    <p class="note">The other cafés are run by Greta's own milbils. They earn at about your pace, so keep serving to stay on top!</p>`;
}

/** Buttons for picking which café an ability hits. */
export function targetHTML(abilityId){
  return `<div class="targets">${RIVALS.map(r => `
    <button type="button" class="target" data-act="target" data-id="${abilityId}:${r.id}">
      <span class="board-pic">${artHTML(r.art, r.name)}</span>
      <span class="board-name"><b>${esc(r.name)}</b><small>${offText(r.id) || money(G.s.rivals[r.id] || 0)}</small></span>
    </button>`).join('')}</div>`;
}
