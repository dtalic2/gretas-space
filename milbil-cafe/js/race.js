// ---------- Time mode: a race against ten milbil cafés ----------
//
// Pick how long to play. Everyone starts from nothing: just Toast and $0.
// After 3-2-1-Go the clock runs, and when it hits zero whoever has the most
// cash wins. Then the podium (1st, 2nd and 3rd), and your own review: where
// you came, how much cash you had, and how your game went.

import { G, enterRace, persist, menu, boost } from './game.js';
import { CAFE_LEVELS, FOODS } from './data.js';
import { raceRivals, standings, faceHTML, rowsHTML, medal, resetRankCheer, renderRankPill } from './rivals.js';
import { money, moneyHTML, times, ordinal } from './format.js';
import { sfx } from './audio.js';
import { $, esc, bump } from './ui.js';

let hooks = {};
let shownSecond = -1;

export function initRace(h){
  hooks = h;
  $('#results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-res]');
    if (!b) return;
    sfx('pop');
    if (b.dataset.res === 'again') hooks.onAgain(G.race.minutes);
    if (b.dataset.res === 'home') hooks.onHome();
  });
}

export const racing = () => !!G.race && G.race.live;

/** "4:32", for the clocks on the café, the question screen and the shop. */
export function clockText(){
  const s = Math.max(0, Math.ceil(G.race?.left ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
/** A little clock to drop into overlays during a race. */
export const clockHTML = () => G.race ? `<span class="race-clock">⏱️ <b>${clockText()}</b></span>` : '';

/** Set up a fresh café and rivals, then count down 3-2-1-Go. */
export function startRace(minutes){
  $('#results').hidden = true;
  enterRace({ minutes, left: minutes * 60, live: false, over: false, rivals: raceRivals() });
  resetRankCheer();
  renderRankPill();
  shownSecond = -1;
  renderTimer();
  $('#timer').hidden = false;
  countdown(() => {
    if (!G.race) return;
    G.race.live = true;
    hooks.onGo();
  });
}

function countdown(done){
  const el = $('#bigmsg');
  const steps = ['3', '2', '1', 'Go!'];
  let i = 0;
  const next = () => {
    if (i === steps.length){ el.hidden = true; done(); return; }
    el.hidden = false;
    el.textContent = steps[i];
    el.classList.toggle('go', i === 3);
    el.classList.remove('long');
    bump(el, 'show');
    sfx(i === 3 ? 'go' : 'tick');
    i++;
    setTimeout(next, i === steps.length ? 650 : 850);
  };
  next();
}

/** Every frame while the race is on. */
export function tickRace(dt){
  const r = G.race;
  if (!r?.live) return;
  r.left -= dt;
  renderTimer();
  if (r.left <= 0) finishRace(false);
}

function renderTimer(){
  const r = G.race;
  if (!r) return;
  const s = Math.max(0, Math.ceil(r.left));
  if (s === shownSecond) return;
  shownSecond = s;
  const text = clockText();
  for (const el of document.querySelectorAll('#timer, .race-clock')){
    el.querySelector('b').textContent = text;
    el.classList.toggle('low', s <= 30);
    el.classList.toggle('final', s <= 10);
    if (r.live && s <= 10 && s > 0) bump(el, 'beat');
  }
  if (r.live && s <= 10 && s > 0) sfx('tick');
}

/** Time's up (or you finished early from Settings). */
export function finishRace(early){
  const r = G.race;
  if (!r || r.over) return;
  r.live = false;
  r.over = true;
  r.early = early;
  r.left = Math.max(0, r.left);
  renderTimer();
  hooks.onStop();
  const el = $('#bigmsg');
  el.hidden = false;
  el.classList.remove('go');
  el.textContent = early ? 'Finished!' : "Time's up!";
  el.classList.add('long');
  bump(el, 'show');
  sfx('whistle');
  setTimeout(() => { el.hidden = true; showResults(); }, 1900);
}

// ------------------------------------------------------------ results ---

function showResults(){
  const r = G.race;
  if (!r) return;
  const rows = standings();
  const place = rows.findIndex(x => x.me) + 1;
  const me = rows[place - 1];
  const of = rows.length;

  // Your best for this length of race.
  const rec = G.free.records[r.minutes];
  const isBest = !rec || place < rec.place || (place === rec.place && me.cash > rec.cash);
  if (isBest){ G.free.records[r.minutes] = { place, cash: Math.round(me.cash), of }; persist(); }

  let msg;
  if (place === 1) msg = '🏆 You won! The best café in town!';
  else if (place <= 3) msg = `🎉 You're on the podium! Only <b>${money(rows[0].cash - me.cash)}</b> behind ${esc(rows[0].name)}.`;
  else msg = `Only <b>${money(rows[2].cash - me.cash)}</b> more and you'd have beaten ${esc(rows[2].name)} for 3rd place. Have another go!`;

  const asked = G.s.stats.right + G.s.stats.wrong;
  const step = (i) => {
    const x = rows[i];
    if (!x) return '';
    return `<div class="podium-spot p${i + 1} ${x.me ? 'me' : ''}">
      <div class="podium-pic">${faceHTML(x)}</div>
      <b class="podium-name">${esc(x.me ? (G.s.name || 'You') : x.name)}</b>
      <span class="podium-cash">${moneyHTML(x.cash)}</span>
      <div class="podium-block"><span>${i + 1}</span></div>
    </div>`;
  };

  const box = $('#results');
  box.innerHTML = `
    ${place <= 3 ? confetti() : ''}
    <div class="results-card">
      <h1 class="logo small">${r.early ? 'Finished!' : "Time's up!"}</h1>
      <p class="results-sub">${r.minutes} minute race · ${of} cafés</p>
      <div class="podium">${step(1)}${step(0)}${step(2)}</div>

      <div class="review ${place <= 3 ? 'top' : ''}">
        <div class="review-head">Your review</div>
        <div class="review-place">${medal(place - 1)} You came <b>${ordinal(place)}</b> out of ${of}</div>
        <div class="review-cash"><small>Your cash</small><b>${moneyHTML(me.cash)}</b></div>
        <p class="review-msg">${msg}</p>
        <div class="stats">
          <div><b>${G.s.stats.served.toLocaleString('en-US')}</b><small>milbils served</small></div>
          <div><b>${G.s.stats.right} of ${asked}</b><small>questions right</small></div>
          <div><b>${menu().length} of ${FOODS.length}</b><small>foods on your menu</small></div>
          <div><b>Level ${G.s.cafe}</b><small>${CAFE_LEVELS[G.s.cafe - 1].look} café</small></div>
        </div>
        <p class="review-boost">💸 By the end, every milbil was paying <b>${times(boost())}</b></p>
        <p class="review-best">${isBest
          ? `🏅 New best for ${r.minutes} minutes!`
          : `Your best for ${r.minutes} minutes: <b>${ordinal(rec.place)}</b> with <b>${money(rec.cash)}</b>`}</p>
      </div>

      <details class="everyone"><summary>See all ${of} places</summary>${rowsHTML(rows)}</details>

      <div class="results-btns">
        <button type="button" class="btn-play" data-res="again">🔁 Play again</button>
        <button type="button" class="btn-home" data-res="home">🏠 Start screen</button>
      </div>
    </div>`;
  box.hidden = false;
  box.scrollTop = 0;
  sfx(place === 1 ? 'win' : place <= 3 ? 'cheer' : 'done');
}

function confetti(){
  const colors = ['#ff4b3e', '#ffb100', '#2fbf4c', '#1f8fff', '#9b5de5', '#ff7eb6'];
  let out = '';
  for (let i = 0; i < 60; i++){
    out += `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${colors[i % colors.length]};
      animation-delay:${(Math.random() * 1.6).toFixed(2)}s;animation-duration:${(2.4 + Math.random() * 1.8).toFixed(2)}s;
      transform:rotate(${Math.round(Math.random() * 360)}deg)"></i>`;
  }
  return `<div class="confetti" aria-hidden="true">${out}</div>`;
}
