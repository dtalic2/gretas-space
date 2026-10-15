// ---------- Start-up, the top bar, settings, hints and the game loop ----------

import { G, on, persist, startOver, happy, nextLocked, totalStock } from './game.js';
import { CHEF_LOOK, FOODS } from './data.js';
import { initCafe, tickCafe, openDoors, anyoneStuck, waitingCount, renderScene } from './cafe.js';
import { initQuiz, openQuiz, quizOpen, quizKey } from './quiz.js';
import { initShop, openShop, refreshShop } from './shop.js';
import { tickRivals, renderRankPill, boardHTML } from './rivals.js';
import { MODES, TABLES } from './questions.js';
import { drawLook } from './milbil.js';
import { foodSVG } from './food.js';
import { money } from './format.js';
import { sfx, unlockAudio } from './audio.js';
import { $, Sheet, bump } from './ui.js';

const sheet = new Sheet($('#sheet'));
let running = false;

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

// ------------------------------------------------------ question picker ---
// The same picker sits on the welcome card and in Settings.

function qpickHTML(){
  const st = G.s.settings;
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
    const st = G.s.settings;
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

// ------------------------------------------------------------- welcome ---

function showWelcome(){
  const w = $('#welcome');
  $('#welcomeArt').innerHTML = `<span class="chef">${drawLook(CHEF_LOOK, { title: 'You, the chef' })}</span>
    <span class="welcome-foods">${FOODS.map(f => foodSVG(f.id)).join('')}</span>`;
  $('#nameInput').value = G.s.name;
  const q = $('#welcomeQ');
  const draw = () => { q.innerHTML = qpickHTML(); };
  draw();
  wireQpick(q, draw);
  const played = G.s.stats.served > 0;
  $('#playBtn').textContent = played ? 'Back to the café!' : 'Open the café!';
  $('#welcomeSave').innerHTML = played
    ? `Welcome back! You've served <b>${G.s.stats.served.toLocaleString('en-US')}</b> milbils and have <b>${money(G.s.cash)}</b>.`
    : '';
  $('#playBtn').addEventListener('click', () => {
    unlockAudio();
    G.s.name = $('#nameInput').value.trim().slice(0, 12);
    persist();
    renderScene();
    w.hidden = true;
    start();
  }, { once: true });
}

function start(){
  running = true;
  openDoors();
  sfx('bell');
}

// ------------------------------------------------------------ settings ---

function openSettings(){
  let confirmWipe = false;
  sheet.open({
    name: 'settings', icon: '⚙️', title: 'Settings',
    render: () => `
      <div class="qpick in-sheet">${qpickHTML()}</div>
      <div class="set-row">
        <span>Sound</span>
        <button type="button" class="toggle ${G.s.settings.sound ? 'on' : ''}" data-act="sound">${G.s.settings.sound ? '🔊 On' : '🔇 Off'}</button>
      </div>
      <div class="stats">
        <div><b>${G.s.stats.served.toLocaleString('en-US')}</b><small>milbils served</small></div>
        <div><b>${G.s.stats.items.toLocaleString('en-US')}</b><small>servings</small></div>
        <div><b>${G.s.stats.right.toLocaleString('en-US')}</b><small>answers right</small></div>
        <div><b>${money(G.s.stats.earned)}</b><small>earned in all</small></div>
      </div>
      <button type="button" class="danger" data-act="wipe">${confirmWipe ? 'Tap again to start a brand new café' : '🧹 Start a new café'}</button>`,
    onAct: (act) => {
      if (act === 'sound'){ G.s.settings.sound = !G.s.settings.sound; persist(); sfx('pop'); }
      if (act === 'wipe'){
        if (!confirmWipe){ confirmWipe = true; }
        else { running = false; startOver(); return; }
      }
      sheet.render();
    },
  });
  wireQpickOnce(sheet.body);
}

let qpickWired = false;
function wireQpickOnce(body){
  if (qpickWired) return;
  qpickWired = true;
  wireQpick(body, () => { if (sheet.is('settings')) sheet.render(); });
}

// --------------------------------------------------------- leaderboard ---

function openBoard(){
  sheet.open({ name: 'board', icon: '🏆', title: 'Leaderboard', render: boardHTML });
}

// --------------------------------------------------------------- hints ---
// A few nudges for a first game, each shown until you've done the thing.

function renderHints(){
  const h = G.s.hints;
  const next = nextLocked();
  const stuck = totalStock() === 0 || anyoneStuck();
  let text = '';
  if (!h.served && waitingCount() > 0) text = '👆 Tap a hungry milbil to serve it!';
  else if (!h.restocked && stuck) text = '🍽️ Need more food? Tap <b>Restock Food</b> and answer a question.';
  else if (!h.bought && next && G.s.cash >= next.costs[0]) text = `🛒 You can buy <b>${next.name}</b> in the Shop!`;
  const el = $('#hint');
  el.hidden = !text || !running;
  if (text && el.dataset.text !== text){ el.innerHTML = text; el.dataset.text = text; bump(el, 'pop'); }

  $('#restockBtn').classList.toggle('pulse', running && stuck && waitingCount() > 0);
  $('#shopBtn').classList.toggle('pulse', running && !h.bought && !!next && G.s.cash >= next.costs[0]);
}

function renderHappy(){
  const el = $('#happyBanner');
  const on = happy();
  el.hidden = !on;
  $('#scene').classList.toggle('is-happy', on);
  if (on) el.innerHTML = `😊 Happy Customers! Everyone pays <b>×2</b> · ${Math.ceil((G.happyUntil - performance.now()) / 1000)}s`;
}

// ----------------------------------------------------------------- loop ---

let lastSec = performance.now(), lastSave = performance.now();

function frame(now){
  if (running){
    tickCafe(now);
    if (now - lastSec >= 1000){
      const dt = Math.min(3, (now - lastSec) / 1000);
      lastSec = now;
      tickRivals(dt);
      renderHints();
      renderHappy();
      if (sheet.is('board')) sheet.render();
    }
    if (now - lastSave > 5000){ lastSave = now; persist(); }
  } else {
    lastSec = now;
  }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ start-up ---

function boot(){
  initShop(sheet);
  initQuiz();
  initCafe({ onShop: () => openShop('food'), onRestock: openQuiz });
  renderCash();
  renderRankPill();

  $('#restockBtn').addEventListener('click', openQuiz);
  $('#shopBtn').addEventListener('click', () => openShop('food'));
  $('#menuBtn').addEventListener('click', openSettings);
  $('#rankBtn').addEventListener('click', openBoard);

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
    else if (/^[1-3]$/.test(e.key)) $(`.cust[data-spot="${Number(e.key) - 1}"]`)?.click();
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);

  // For testing from the browser console.
  window.CAFE = {
    cash(n){ G.s.cash += n; renderCash(); refreshShop(); },
    state: () => G.s,
    wipe: startOver,
  };

  showWelcome();
  requestAnimationFrame(frame);
}

boot();
