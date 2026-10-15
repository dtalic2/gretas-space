// ---------- Start-up, the start screen, settings, hints and the game loop ----------

import { G, on, persist, startOver, happy, nextLocked, totalStock, leaveRace } from './game.js';
import { CHEF_LOOK, FOODS, RACE_MINUTES, RIVALS } from './data.js';
import { initCafe, tickCafe, openDoors, anyoneStuck, waitingCount, renderScene, resetCafe } from './cafe.js';
import { initQuiz, openQuiz, closeQuiz, quizOpen, quizKey, toggleAutoServe } from './quiz.js';
import { initShop, openShop, refreshShop } from './shop.js';
import { tickRivals, renderRankPill, resetRankCheer, boardHTML } from './rivals.js';
import { initRace, startRace, tickRace, finishRace, clockHTML } from './race.js';
import { MODES, TABLES } from './questions.js';
import { drawLook } from './milbil.js';
import { foodSVG } from './food.js';
import { money, ordinal } from './format.js';
import { sfx, unlockAudio } from './audio.js';
import { $, Sheet, bump } from './ui.js';

const sheet = new Sheet($('#sheet'));
let running = false;        // customers coming in, clocks ticking

// ------------------------------------------------------------- top bar ---

// Shrink the number as it grows so it always fits.
function renderCash(){
  const el = $('#cash'), t = money(G.s.cash);
  el.textContent = t;
  el.style.fontSize = t.length <= 6 ? '' : t.length <= 8 ? '21px' : t.length <= 10 ? '18px' : t.length <= 12 ? '15px' : '13px';
}

on('cash', (n) => {
  renderCash();
  if (n > 0) bump($('#cashPill'), 'grow');
  refreshShop();
});

// Swapping between your saved café and a race.
on('switch', () => {
  resetCafe();
  resetRankCheer();
  renderCash();
  renderRankPill();
  renderHappy();
  $('#timer').hidden = !G.race;
  $('#hint').hidden = true;
});

// ------------------------------------------------------ question picker ---
// The same picker sits on the start screen and in Settings.

function qpickHTML(){
  const st = G.free.settings;
  const showTables = st.qmode === 'times' || st.qmode === 'mix';
  return `<div class="qpick-label">Restock questions</div>
    <div class="qmodes">${MODES.map(m =>
      `<button type="button" data-qmode="${m.id}" class="${st.qmode === m.id ? 'on' : ''}">${m.icon} ${m.name}</button>`).join('')}</div>
    ${showTables ? `<div class="qpick-label small">Which times tables?</div>
      <div class="tables">${TABLES.map(t =>
        `<button type="button" data-table="${t}" class="${st.tables.includes(t) ? 'on' : ''}">${t}</button>`).join('')}</div>` : ''}`;
}

function wireQpick(el, rerender){
  el.addEventListener('click', (e) => {
    const m = e.target.closest('[data-qmode]');
    const t = e.target.closest('[data-table]');
    const st = G.free.settings;
    if (m) st.qmode = m.dataset.qmode;
    else if (t){
      const n = Number(t.dataset.table);
      if (st.tables.includes(n)){ if (st.tables.length > 1) st.tables = st.tables.filter(x => x !== n); }
      else st.tables = [...st.tables, n].sort((a, b) => a - b);
    } else return;
    sfx('pop');
    persist();
    rerender();
  });
}

// --------------------------------------------------------- start screen ---

function modeHTML(){
  const st = G.free.settings;
  const time = st.mode === 'time';
  return `<div class="qpick-label">How do you want to play?</div>
    <div class="modes">
      <button type="button" data-mode="free" class="mode-btn ${time ? '' : 'on'}">
        <span class="e">🌈</span><b>Free play</b><small>No clock. Your café is saved.</small></button>
      <button type="button" data-mode="time" class="mode-btn ${time ? 'on' : ''}">
        <span class="e">⏱️</span><b>Time mode</b><small>Race ${RIVALS.length} milbils. Most cash wins!</small></button>
    </div>
    ${time ? `<div class="qpick-label small">How long?</div>
      <div class="minutes">${RACE_MINUTES.map(m =>
        `<button type="button" data-min="${m}" class="${st.minutes === m ? 'on' : ''}"><b>${m}</b> min</button>`).join('')}</div>` : ''}`;
}

function renderWelcome(){
  const st = G.free.settings;
  $('#welcomeMode').innerHTML = modeHTML();
  $('#welcomeQ').innerHTML = qpickHTML();
  const played = G.free.stats.served > 0;
  let note = '';
  if (st.mode === 'time'){
    $('#playBtn').textContent = '⏱️ Start the race!';
    const rec = G.free.records[st.minutes];
    note = rec
      ? `Your best in ${st.minutes} minutes: <b>${ordinal(rec.place)}</b> place with <b>${money(rec.cash)}</b>.`
      : `Everyone starts with just Toast and $0. Whoever has the most cash after ${st.minutes} minutes wins.`;
  } else {
    $('#playBtn').textContent = played ? 'Back to the café!' : 'Open the café!';
    if (played) note = `Welcome back! You've served <b>${G.free.stats.served.toLocaleString('en-US')}</b> milbils and have <b>${money(G.free.cash)}</b>.`;
  }
  $('#welcomeSave').innerHTML = note;
}

function showWelcome(){
  $('#welcomeArt').innerHTML = `<span class="chef">${drawLook(CHEF_LOOK, { title: 'You, the chef' })}</span>
    <span class="welcome-foods">${FOODS.map(f => foodSVG(f.id)).join('')}</span>`;
  $('#nameInput').value = G.free.name;
  renderWelcome();
  $('#welcome').hidden = false;
  $('#welcome').scrollTop = 0;
}

function play(){
  unlockAudio();
  G.free.name = $('#nameInput').value.trim().slice(0, 12);
  persist();
  $('#welcome').hidden = true;
  if (G.free.settings.mode === 'time'){
    startRace(G.free.settings.minutes);
  } else {
    if (G.race) leaveRace();
    renderScene();
    running = true;
    openDoors();
    sfx('bell');
  }
}

/** Stop everything (for the start screen, or the end of a race). */
function stopPlay(){
  running = false;
  closeQuiz();
  sheet.close();
  $('#hint').hidden = true;
  $('#restockBtn').classList.remove('pulse');
  $('#shopBtn').classList.remove('pulse');
}

function goHome(){
  stopPlay();
  $('#results').hidden = true;
  if (G.race) leaveRace();
  showWelcome();
}

// ------------------------------------------------------------ settings ---

function openSettings(){
  let confirm = false;
  sheet.open({
    name: 'settings', icon: '⚙️', title: 'Settings',
    extra: clockHTML,
    render: () => {
      const st = G.s.stats;
      const race = !!G.race;
      return `
      <div class="qpick in-sheet">${qpickHTML()}</div>
      <div class="set-row">
        <span>Sound</span>
        <button type="button" class="toggle ${G.free.settings.sound ? 'on' : ''}" data-act="sound">${G.free.settings.sound ? '🔊 On' : '🔇 Off'}</button>
      </div>
      <div class="stats">
        <div><b>${st.served.toLocaleString('en-US')}</b><small>milbils served${race ? ' this race' : ''}</small></div>
        <div><b>${st.items.toLocaleString('en-US')}</b><small>servings</small></div>
        <div><b>${st.right.toLocaleString('en-US')}</b><small>answers right</small></div>
        <div><b>${money(st.earned)}</b><small>earned ${race ? 'this race' : 'in all'}</small></div>
      </div>
      ${race
        ? `<button type="button" class="danger" data-act="finish">${confirm ? 'Tap again to finish the race now' : '🏁 Finish the race now'}</button>`
        : `<button type="button" class="home-btn" data-act="home">🏠 Start screen (pick Time mode)</button>
           <button type="button" class="danger" data-act="wipe">${confirm ? 'Tap again to start a brand new café' : '🧹 Start a new café'}</button>`}`;
    },
    onAct: (act) => {
      if (act === 'sound'){ G.free.settings.sound = !G.free.settings.sound; persist(); sfx('pop'); }
      if (act === 'home'){ persist(); goHome(); return; }
      if (act === 'finish' || act === 'wipe'){
        if (!confirm){ confirm = true; }
        else if (act === 'finish'){ sheet.close(); finishRace(true); return; }
        else { running = false; startOver(); return; }
      }
      sheet.render();
    },
  });
}

// --------------------------------------------------------- leaderboard ---

function openBoard(){
  sheet.open({
    name: 'board', icon: '🏆', title: 'Leaderboard',
    extra: clockHTML,
    render: boardHTML,
  });
}

// --------------------------------------------------------------- hints ---
// A few nudges for a first game, each shown until you've done the thing.

function renderHints(){
  if (!running) return;
  const h = G.s.hints;
  const next = nextLocked();
  const stuck = totalStock() === 0 || anyoneStuck();
  let text = '';
  if (!h.served && waitingCount() > 0) text = '👆 Tap a hungry milbil to serve it!';
  else if (!h.restocked && stuck) text = '🍽️ Need more food? Tap <b>Restock Food</b> and answer a question.';
  else if (!h.bought && next && G.s.cash >= next.costs[0]) text = `🛒 You can buy <b>${next.name}</b> in the Shop!`;
  const el = $('#hint');
  el.hidden = !text;
  if (text && el.dataset.text !== text){ el.innerHTML = text; el.dataset.text = text; bump(el, 'pop'); }

  $('#restockBtn').classList.toggle('pulse', stuck && waitingCount() > 0);
  $('#shopBtn').classList.toggle('pulse', !h.bought && !!next && G.s.cash >= next.costs[0]);
}

function renderAuto(){
  const on = !!G.free.settings.autoServe;
  const b = $('#autoBtn');
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on);
  b.querySelector('small').textContent = on ? 'On' : 'Off';
}

function renderHappy(){
  const el = $('#happyBanner');
  const on = happy();
  el.hidden = !on;
  $('#scene').classList.toggle('is-happy', on);
  if (on) el.innerHTML = `😊 Happy Customers! Everyone pays <b>×2</b> · ${Math.ceil((G.happyUntil - performance.now()) / 1000)}s`;
}

// ----------------------------------------------------------------- loop ---

let lastFrame = performance.now(), lastSec = lastFrame, lastSave = lastFrame;

function frame(now){
  // Hidden tabs get no frames, so a race clock pauses while you're away.
  const dt = Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;
  if (running){
    tickCafe(now);
    if (G.race) tickRace(dt);
  }
  if (running && now - lastSec >= 1000){
    const sec = Math.min(3, (now - lastSec) / 1000);
    lastSec = now;
    tickRivals(sec);
    renderHints();
    renderHappy();
    if (sheet.is('board')) sheet.render();
  } else if (!running){
    lastSec = now;
  }
  if (now - lastSave > 5000){ lastSave = now; persist(); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ start-up ---

function boot(){
  initShop(sheet);
  initQuiz();
  initCafe({ onShop: () => openShop('food'), onRestock: openQuiz });
  initRace({
    onGo: () => { running = true; openDoors(); },
    onStop: stopPlay,
    onHome: goHome,
    onAgain: (minutes) => startRace(minutes),
  });
  renderCash();
  renderRankPill();

  $('#restockBtn').addEventListener('click', openQuiz);
  $('#autoBtn').addEventListener('click', toggleAutoServe);
  on('auto', renderAuto);
  renderAuto();
  $('#shopBtn').addEventListener('click', () => openShop('food'));
  $('#menuBtn').addEventListener('click', openSettings);
  $('#rankBtn').addEventListener('click', openBoard);
  $('#playBtn').addEventListener('click', play);

  // Start screen: free play or time mode, and how long.
  $('#welcomeMode').addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]');
    const t = e.target.closest('[data-min]');
    const st = G.free.settings;
    if (m) st.mode = m.dataset.mode;
    else if (t) st.minutes = Number(t.dataset.min);
    else return;
    sfx('pop');
    persist();
    renderWelcome();
  });
  wireQpick($('#welcomeQ'), renderWelcome);
  wireQpick(sheet.body, () => { if (sheet.is('settings')) sheet.render(); });

  on('short', renderHints);
  on('served', renderHints);
  on('arrived', renderHints);
  on('answered', renderHints);
  on('happy', renderHappy);

  document.addEventListener('keydown', (e) => {
    if (!running || e.target.closest?.('input')) return;
    if (quizOpen()){ if (quizKey(e)) e.preventDefault(); return; }
    if (sheet.isOpen){ if (e.key === 'Escape') sheet.close(); return; }
    if (e.key === ' ' || e.key === 'r' || e.key === 'R'){ e.preventDefault(); openQuiz(); }
    else if (e.key === 's' || e.key === 'S') openShop('food');
    else if (e.key === 'a' || e.key === 'A') toggleAutoServe();
    else if (/^[1-3]$/.test(e.key)) $(`.cust[data-spot="${Number(e.key) - 1}"]`)?.click();
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);

  // For testing from the browser console.
  window.CAFE = {
    cash(n){ G.s.cash += n; renderCash(); refreshShop(); },
    state: () => G.s,
    race: () => G.race,
    endRace: () => { if (G.race) G.race.left = 0.01; },
    wipe: startOver,
  };

  showWelcome();
  requestAnimationFrame(frame);
}

boot();
