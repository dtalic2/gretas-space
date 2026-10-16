// ---------- Start-up, the start screen, the game loop and the scoreboard ----------

import { ROSTER, ROSTER_BY_ID, GRETAS, LEVELS, LEVEL_IDS, BOTS, STEP, RESPAWN, MILESTONES } from './data.js';
import { world, reset, addPlayer, spawn, step, standings, pct, TOTAL } from './world.js';
import { newBrain, steerBot } from './bots.js';
import { assignColors, palette, RAINBOW_CSS } from './colors.js';
import { initDraw, setPalettes, render, follow, burst, floatText, initMini, drawMini } from './draw.js';
import { initInput, resetInput, steerYou, touchy } from './input.js';
import { sfx, unlockAudio } from './audio.js';
import { sprite } from './sprites.js';
import { drawLook } from './milbil.js';
import { S, save } from './state.js';

const $ = (q) => document.querySelector(q);
const esc = (s) => String(s).replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`);
const fmt = (n) => n.toFixed(n < 10 ? 2 : 1) + '%';
const ordinal = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th');
const clock = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const colorCSS = (c) => c === 'rainbow' ? RAINBOW_CSS : c;
const pic = (ch) => ch.art
  ? `<img class="milbil art" src="${ch.art}" alt="" draggable="false">`
  : drawLook(ch.look, { title: ch.name });

let mode = 'attract';     // 'attract': bots playing behind the start screen; 'play'; 'over'
let paused = false;
let you = null;
let focus = null;         // who the camera follows
let leaderId = 0;
let lv = LEVELS.normal;
let pals = [];            // everyone's colours, by player id
let round = null;         // this game so far

// ------------------------------------------------------------ the cast ---

function shuffle(a){
  for (let i = a.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Greta's five drawings are always on the island; drawn milbils make up the rest.
function cast(pickId){
  const drawn = shuffle(ROSTER.filter(r => !r.art && r.id !== pickId).map(r => r.id));
  const ids = [...GRETAS.filter(id => id !== pickId), ...drawn].slice(0, pickId ? BOTS : BOTS + 1);
  return ids.map(id => ROSTER_BY_ID[id]);
}

function setup(withYou){
  reset();
  const chars = withYou ? [ROSTER_BY_ID[S.pick], ...cast(S.pick)] : cast(null);
  const colors = assignColors(chars.map(c => c.color));
  pals = [null];
  chars.forEach((ch, k) => {
    const human = withYou && k === 0;
    const p = addPlayer({ ch, human, name: human ? (S.name || 'You') : ch.short || ch.name });
    if (!human) p.ai = newBrain();
    pals[p.id] = palette(colors[k]);
    sprite(ch);
  });
  setPalettes(pals);
  for (const p of world.players) spawn(p);
  you = withYou ? world.players[0] : null;
  focus = you || world.players[0];
  follow(focus.x, focus.y, 0, true);
  window.ISLAND = { world, pals, you };          // for poking at in the console
}

function steer(p, dt){
  if (!p.human) return steerBot(p, dt, lv);
  const was = p.still;
  steerYou(p);
  if (was && !p.still) setOff();
}

// Your first drag: off you go.
function setOff(){
  $('#hint').hidden = true;
  if (S.games < 3) toast('Walk out, make a loop, and come back to your land to <b>fill it in</b>!', 'big', 5000);
}

function respawns(){
  for (const p of world.players){
    if (p.alive || p.human) continue;
    p.wait ??= rand(...RESPAWN);
    if (world.time - p.diedAt > p.wait){
      p.wait = undefined;
      p.ai = newBrain();
      spawn(p);
    }
  }
}

// ------------------------------------------------------------- playing ---

function start(){
  lv = LEVELS[S.level];
  setup(true);
  resetInput();
  you.still = true;
  mode = 'play';
  paused = false;
  round = { ms: new Set(), rank: 99, bestRank: 99, crownAt: -99, shown: false, filled: false };
  $('#welcome').hidden = true;
  $('#over').hidden = true;
  $('#pause').hidden = true;
  $('#hud').hidden = false;
  $('#meSwatch').style.background = pals[you.id].css;
  $('#toasts').replaceChildren();
  $('#hint').innerHTML = touchy() ? '👆 <b>Drag</b> the way you want to go!' : '🖱️ <b>Move your mouse</b> the way you want to go!';
  $('#hint').hidden = false;
  sfx('go');
  hud();
}

function home(){
  mode = 'attract';
  paused = false;
  lv = LEVELS.normal;
  setup(false);
  $('#hud').hidden = true;
  $('#hint').hidden = true;
  $('#over').hidden = true;
  $('#pause').hidden = true;
  $('#welcome').hidden = false;
  renderWelcome();
}

function setPaused(on){
  if (mode !== 'play') return;
  paused = on;
  $('#pause').hidden = !on;
  if (on) renderPause();
}

function milestones(){
  const now = pct(you);
  for (const m of MILESTONES){
    if (now >= m && !round.ms.has(m)){
      round.ms.add(m);
      if (m === 100) toast('🌈 <b>The whole island is yours!</b>', 'big good', 5000);
      else toast(`🎉 <b>${m}%</b> of the island is yours!`, 'good');
      sfx('cheer');
    }
  }
}

const HOW = {
  cut:  (by) => `<b>${esc(by.name)}</b> cut your trail!`,
  self: () => 'You walked into your own trail!',
  bump: (by) => `You bumped into <b>${esc(by.name)}</b>!`,
  land: (by) => `<b>${esc(by.name)}</b> took all your land!`,
};

function events(){
  for (const e of world.events.splice(0)){
    if (e.type === 'capture'){
      if (e.p !== you) continue;
      round.filled = true;
      sfx('fill', Math.floor(e.cells / 25));
      if (e.cells > 0) floatText(you.x, you.y - 3.4, '+' + fmt(e.cells / TOTAL * 100), '#fff');
      milestones();
      continue;
    }
    // somebody's been caught
    const { p, by } = e;
    burst(e.x, e.y, p.id);
    if (p === you){
      sfx('caught');
      $('#hint').hidden = true;
      $('#toasts').replaceChildren();
      mode = 'over';
      setTimeout(() => showOver(e), 1300);
    } else if (by === you){
      sfx('catch');
      toast(`💥 You caught <b>${esc(p.name)}</b>!`, 'good');
      floatText(e.x, e.y - 2, '💥', '#fff', true);
    } else if (mode !== 'attract' && Math.hypot(e.x - (you?.x ?? 0), e.y - (you?.y ?? 0)) < 20){
      sfx('poof');
    }
  }
}

// --------------------------------------------------------- scoreboard ---

function row(p, n, top){
  const pal = pals[p.id];
  const w = Math.max(6, p.cells / Math.max(1, top.cells) * 100);
  return `<li class="${p === you ? 'me' : ''}" style="--c:${pal.css};--w:${w.toFixed(1)}%">
    <span class="r">${n}</span><span class="n">${esc(p.name)}</span><b>${fmt(pct(p))}</b></li>`;
}

function hud(){
  const list = standings();
  if (!list.length) return;
  leaderId = list.length > 1 && list[1].cells === list[0].cells ? 0 : list[0].id;   // the crown is for a clear leader
  if (mode === 'attract' || $('#hud').hidden) return;
  const top5 = list.slice(0, 5);
  let html = top5.map((p, k) => row(p, k + 1, list[0])).join('');
  if (you.alive && !top5.includes(you)) html += `<li class="gap">⋯</li>` + row(you, list.indexOf(you) + 1, list[0]);
  $('#leaders').innerHTML = html;
  $('#mePct').textContent = fmt(pct(you));
  $('#meKills').textContent = you.kills;
  // Places only count once you've filled in some land: at the start everyone's tied.
  if (mode !== 'play' || !you.alive || !round.filled) return;
  const rank = list.indexOf(you) + 1;
  if (leaderId === you.id && round.rank !== 1 && world.time - round.crownAt > 10){
    round.crownAt = world.time;
    toast('👑 You\'re in <b>first place</b>!', 'good');
    sfx('crown');
  }
  round.rank = rank;
  round.bestRank = Math.min(round.bestRank, rank);
}

// ------------------------------------------------------------- screens ---

function showOver(e){
  if (mode !== 'over' || round.shown) return;
  round.shown = true;
  const most = you.peak / TOTAL * 100;
  const newBest = most > S.best + 1e-9;
  S.best = Math.max(S.best, most);
  S.bestKills = Math.max(S.bestKills, you.kills);
  if (round.bestRank < 99 && (!S.bestPlace || round.bestRank < S.bestPlace)) S.bestPlace = round.bestRank;
  S.games++;
  save();
  const place = round.bestRank < 99 ? ordinal(round.bestRank) : '—';
  $('#over').innerHTML = `
    <div class="card over-card">
      <div class="over-pic">${pic(you.ch)}</div>
      <h2 class="over-msg">${HOW[e.how](e.by)}</h2>
      <div class="stats">
        <div><b>${fmt(most)}</b><small>Most land</small></div>
        <div><b>${you.kills}</b><small>Milbils caught</small></div>
        <div><b>${place}</b><small>Best place</small></div>
        <div><b>${clock(world.time - you.bornAt)}</b><small>Time</small></div>
      </div>
      <p class="over-best">${newBest ? '🏅 <b>New best!</b>' : `Your best: <b>${fmt(S.best)}</b> of the island`}</p>
      <div class="over-btns">
        <button type="button" class="btn-play" id="againBtn">▶ Play again</button>
        <button type="button" class="btn-home" id="homeBtn">🏠 Start screen</button>
      </div>
    </div>`;
  $('#over').hidden = false;
  $('#againBtn').onclick = () => { sfx('click'); start(); };
  $('#homeBtn').onclick = () => { sfx('click'); home(); };
  if (newBest) sfx('cheer');
}

function renderPause(){
  $('#pause').innerHTML = `
    <div class="card pause-card">
      <h2 class="logo small">Paused</h2>
      <button type="button" class="btn-play" id="resumeBtn">▶ Keep playing</button>
      <button type="button" class="btn-soft" id="soundBtn">${S.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
      <button type="button" class="btn-soft" id="quitBtn">🏠 Start screen</button>
    </div>`;
  $('#resumeBtn').onclick = () => setPaused(false);
  $('#soundBtn').onclick = () => { S.sound = !S.sound; save(); renderPause(); sfx('click'); };
  $('#quitBtn').onclick = () => home();
}

function renderWelcome(){
  $('#nameInput').value = S.name;
  $('#howSteer').textContent = touchy() ? 'Drag' : 'Move your mouse';
  $('#picks').innerHTML = ROSTER.map(r => `
    <button type="button" class="pick${r.id === S.pick ? ' on' : ''}" data-id="${r.id}" style="--c:${colorCSS(r.color)}" aria-label="${esc(r.name)}">
      <span class="pick-pic">${pic(r)}</span><small>${esc(r.name)}</small>
    </button>`).join('');
  $('#levels').innerHTML = LEVEL_IDS.map(id => {
    const L = LEVELS[id];
    return `<button type="button" class="lvl${id === S.level ? ' on' : ''}" data-lv="${id}">
      <span class="e">${L.e}</span><b>${L.name}</b><small>${L.blurb}</small></button>`;
  }).join('');
  const bits = [];
  if (S.games){
    bits.push(`Your best: <b>${fmt(S.best)}</b> of the island`);
    if (S.bestKills) bits.push(`<b>${S.bestKills}</b> caught in one game`);
    if (S.bestPlace) bits.push(`best place <b>${ordinal(S.bestPlace)}</b>`);
  }
  $('#welcomeBest').innerHTML = bits.join(' · ');
}

// -------------------------------------------------------------- toasts ---

function toast(html, cls = '', ms = 2800){
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = html;
  box.append(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, ms);
}

// ---------------------------------------------------------------- loop ---

let last = performance.now(), acc = 0, hudT = 0, miniT = 0, focusT = 0;

function frame(now){
  const dt = Math.min(.1, (now - last) / 1000);
  last = now;
  if (!paused){
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 8){ step(STEP, steer); respawns(); acc -= STEP; n++; }
    if (n === 8) acc = 0;
  }
  events();
  if (mode === 'attract' && (!focus.alive || (focusT -= dt) <= 0)){
    focus = standings()[0] || focus;
    focusT = 15;
  }
  follow(focus.x, focus.y, dt);
  render(now / 1000, paused ? 0 : dt, leaderId, you?.id);
  if ((hudT -= dt) <= 0){ hudT = .2; hud(); }
  if ((miniT -= dt) <= 0 && mode !== 'attract'){ miniT = .3; drawMini(you); }
  requestAnimationFrame(frame);
}

// ------------------------------------------------------------ start-up ---

initDraw($('#board'));
initMini($('#mini'));
initInput($('#board'), $('#ring'));

$('#picks').addEventListener('click', (e) => {
  const b = e.target.closest('.pick');
  if (!b) return;
  S.pick = b.dataset.id;
  save();
  for (const el of document.querySelectorAll('.pick')) el.classList.toggle('on', el === b);
  sfx('click');
});
$('#levels').addEventListener('click', (e) => {
  const b = e.target.closest('.lvl');
  if (!b) return;
  S.level = b.dataset.lv;
  save();
  for (const el of document.querySelectorAll('.lvl')) el.classList.toggle('on', el === b);
  sfx('click');
});
$('#nameInput').addEventListener('input', (e) => { S.name = e.target.value.trim().slice(0, 12); save(); });
$('#playBtn').addEventListener('click', () => { unlockAudio(); start(); });
$('#pauseBtn').addEventListener('click', () => { unlockAudio(); setPaused(true); });

addEventListener('keydown', (e) => {
  if (e.target.closest?.('input')){
    if (e.key === 'Enter') $('#playBtn').click();
    return;
  }
  if (mode === 'play' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) setPaused(!paused);
  else if (e.key === 'Enter' && mode === 'attract') $('#playBtn').click();
  else if (e.key === 'Enter' && mode === 'over' && round.shown) start();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
// Phones: stop pinches and double-taps zooming the page.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault());

home();
requestAnimationFrame(frame);
