// ---------- 3x3 Runner 3D: boot, screens, camera and the frame loop ----------

import * as THREE from 'three';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Run } from './game.js';
import { buildDog, animateDog, setWear } from './dog.js';
import { MathEngine } from './mathq.js';
import { DOGS, POWERUPS, RIVALS, xpForLevel } from './data.js';
import * as store from './save.js';
import * as audio from './audio.js';
import { sfx } from './audio.js';
import * as P from './progress.js';
import * as UI from './ui.js';
const { $, show, toast, popup, fmt } = UI;

// ---------- boot ----------
const bootBar = $('.boot-bar i');
bootBar.style.width = '20%';

let save = store.load();
P.ensureDaily(save);
const engine = new MathEngine(save.math);
const world = new World($('#scene'), save.settings.quality);
const fx = new Effects(world.scene);
bootBar.style.width = '60%';

let dog = null;
let state = 'menu';          // menu | countdown | running | paused | revive | over
let run = null;
let camMode = 'menu';        // menu | showcase | run
let camBlend = 0;
const chosenBoosts = { headstart:false, startshield:false };

function makeDog(id = save.dog, wear = save.wear){
  if (dog) world.scene.remove(dog.root);
  const def = DOGS.find(d => d.id === id) || DOGS[0];
  dog = buildDog(def, wear);
  dog.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  world.scene.add(dog.root);
  if (run) run.dog = dog;
  return dog;
}
makeDog();

const hooks = {
  sfx: name => sfx[name]?.(),
  bump: () => sfx.lane(),
  coin: () => {
    coinCombo = performance.now() - lastCoinAt < 300 ? Math.min(coinCombo + 1, 12) : 0;
    lastCoinAt = performance.now();
    sfx.coin(coinCombo);
  },
  power: type => {
    const p = POWERUPS[type];
    popup(`${p.icon} ${p.name}!`, 'blue', true, -60);
    toast(`${p.icon} ${p.name}`, p.desc, 'green');
    powerDirty = true;
  },
  question: (q, secs) => {
    const card = $('#question');
    card.classList.remove('good', 'bad', 'hidden');
    void card.offsetWidth;                      // restart the entry animation
    $('#qText').textContent = q.text.includes('?') ? q.text : `${q.text} = ?`;
    qTimer = { gate: run.activeGate, from: run.z - run.activeGate.z };
    sfx.question();
    audio.speak(q.text);
  },
  questionHide: () => { show('#question', false); qTimer = null; },
  answer: (res, info) => {
    const card = $('#question');
    qTimer = null;
    card.classList.add(res.ok ? 'good' : 'bad');
    const shown = res.text.includes('?') ? res.text.replace('?', res.answer) : `${res.text} = ${res.answer}`;
    $('#qText').textContent = shown;
    setTimeout(() => { if (!qTimer) show('#question', false); }, 1100);
    if (res.ok){
      sfx.correct();
      popup(res.fast ? 'SUPER FAST!' : pick(['Correct!', 'Brilliant!', 'Paw-some!', 'Great!', 'Yes!']), 'good');
      popup(`+${info.pts}  🪙+${info.bonusCoins}`, 'gold', true, 50);
      if (res.fast) sfx.fast();
      if (info.streak % 3 === 0 && info.mult > 1){
        const m = $('#hudMult'); m.classList.remove('pop'); void m.offsetWidth; m.classList.add('pop');
        toast(`🔥 ${info.streak} in a row!`, `Multiplier ×${info.mult}`, 'gold');
      }
    }
  },
  shieldSaved: reason => {
    popup(reason === 'wrong' ? 'Shield saved you!' : 'Shield!', 'blue');
    if (reason === 'wrong') toast('🛡️ Your shield saved you', 'Look out for the right answer next time!');
    powerDirty = true;
  },
  crash: (reason, res) => {
    state = 'revive';
    audio.setMusicIntensity(0);
    setTimeout(() => openRevive(reason, res), 900);
  },
  rival: (r, what) => {
    if (what === 'taunt') toast(`🐾 ${r.name}`, `“${r.taunt}”`, 'pink');
    else {
      const first = !save.rivalsBeaten.includes(r.name);
      toast(`🏆 You beat ${r.name}!`, `“${r.lose}”${first ? ' +100 coins' : ''}`, 'gold');
      if (first){ save.rivalsBeaten.push(r.name); run.coins += 100; run.stats.coins += 100; }
      sfx.levelUp();
      fx.burstConfetti(run.x, 3, run.z - 6, 60);
    }
  },
};
let coinCombo = 0, lastCoinAt = 0, qTimer = null, powerDirty = true;

run = new Run({ world, effects:fx, engine, save, dog, hooks });

// ---------- app facade for panels ----------
const app = {
  get save(){ return save; },
  engine,
  sfx: n => sfx[n]?.(),
  commit(){ store.save(save); UI.bindSave(save); },
  previewDog(id){ if (dog.def.id !== id) makeDog(id, save.wear); },
  tryOn(slot, id){ setWear(dog, { ...save.wear, [slot]:id }); },
  refreshDog(){ makeDog(); },
  refreshBoosts(){ UI.renderBoostRow(app, chosenBoosts); },
  open: name => openScreen(name),
  claimMission(i){ const c = P.claimMission(save, i); if (c){ save.coins += c; sfx.buy(); toast(`Mission reward +${c} 🪙`, '', 'gold'); } app.commit(); },
  claimDaily(i){ const c = P.claimDaily(save, i); if (c){ save.coins += c; sfx.buy(); toast(`Quest reward +${c} 🪙`, '', 'gold'); } app.commit(); },
  claimLogin(){ const c = P.takeLoginReward(save); if (c){ sfx.buy(); toast(`Daily reward +${c} 🪙`, `Day ${save.daily.loginStreak} streak`, 'gold'); } app.commit(); },
  applySettings,
  resetAll(){ save = store.reset(); P.ensureDaily(save); Object.assign(engine, new MathEngine(null)); run.save = save;
    makeDog(); app.commit(); UI.closePanel(); toast('Progress reset'); app.refreshBoosts(); },
};

function applySettings(){
  const s = save.settings;
  audio.setSound(s.sound); audio.setMusic(s.music); audio.setVoice(s.voice);
  if (world.quality !== s.quality) world.setQuality(s.quality);
}
applySettings();

const SCREENS = {
  dogs:      ['Dogs', UI.renderDogs, true],
  wardrobe:  ['Outfits', UI.renderWardrobe, true],
  upgrades:  ['Power-ups & Boosts', UI.renderUpgrades, false],
  missions:  ['Missions', UI.renderMissions, false],
  tables:    ['Times Tables', UI.renderTables, false],
  rivals:    ['Rivals', UI.renderRivals, false],
  settings:  ['Settings', UI.renderSettings, false],
  help:      ['How to play', UI.renderHelp, false],
};

function openScreen(name){
  const [title, render, showcase] = SCREENS[name];
  sfx.click();
  camMode = showcase ? 'showcase' : 'menu';
  $('#menu').classList.toggle('hidden', showcase);
  UI.openPanel(title, render(app), {
    center: !showcase && name !== 'upgrades',
    onClose: () => { camMode = 'menu'; makeDog(); UI.bindSave(save); app.refreshBoosts(); if (state === 'menu') show('#menu'); },
  });
}

$$('[data-open]').forEach(b => b.addEventListener('click', () => openScreen(b.dataset.open)));
function $$(s){ return [...document.querySelectorAll(s)]; }
$('#panelClose').onclick = () => { sfx.click(); UI.closePanel(); };

// ---------- menu ----------
function enterMenu(){
  state = 'menu';
  camMode = 'menu';
  run.dispose();
  dog.root.position.set(0, 0, 0);
  dog.root.rotation.set(0, 0, 0);
  dog.pivot.rotation.set(0, 0, 0);
  dog.root.visible = true;
  snapCam = true;
  show('#menu'); show('#hud', false); show('#gameover', false);
  UI.bindSave(save);
  UI.renderBoostRow(app, chosenBoosts);
  audio.setMusicIntensity(0);
  if (P.loginReward(save)){
    const lr = P.loginReward(save);
    celebrate('Daily reward!', `<div class="unlock"><span>🎁</span> Day ${lr.day} — 🪙 ${lr.amount}</div>
      <p>Come back tomorrow for more!</p>`, () => app.claimLogin(), 'Claim');
  }
}

$('#btnPlay').onclick = () => startRun();

function startRun(){
  if (!save.tables.length){ toast('Pick some times tables first!'); openScreen('tables'); return; }
  audio.initAudio(); audio.startMusic();
  sfx.click();
  show('#menu', false); show('#gameover', false); UI.closePanel();
  show('#hud');
  const opts = {};
  for (const k of ['headstart', 'startshield']){
    if (chosenBoosts[k] && save.boosts[k] > 0){ save.boosts[k]--; opts[k] = true; }
    chosenBoosts[k] = false;
  }
  store.save(save);
  makeDog();
  run.start({ startShield:opts.startshield });
  camMode = 'run'; camBlend = 0;
  state = 'countdown';
  powerDirty = true;
  show('#question', false);
  if (matchMedia('(pointer:coarse)').matches && save.runs < 3){
    show('#touchHint'); setTimeout(() => show('#touchHint', false), 4500);
  }
  let n = 3;
  const cd = $('#countdown'), span = cd.querySelector('span');
  show(cd);
  const tick = () => {
    span.textContent = n > 0 ? n : 'GO!';
    span.style.animation = 'none'; void span.offsetWidth; span.style.animation = '';
    sfx.countdown(n === 0);
    if (n === 0){
      setTimeout(() => show(cd, false), 500);
      state = 'running';
      sfx.bark();
      if (opts.headstart) run.startRocket(400 / 24, true);
      return;
    }
    n--; setTimeout(tick, 650);
  };
  tick();
}

// ---------- pause ----------
function pause(){
  if (state !== 'running') return;
  state = 'paused';
  run.paused = true;
  const list = P.missionView(save, run.stats).map(m => `${m.done ? '✅' : '⬜'} ${m.text} <b>${fmt(m.progress)}/${fmt(m.goal)}</b>`).join('<br>');
  $('#pauseMissions').innerHTML = list;
  show('#pause');
}
function resume(){
  if (state !== 'paused') return;
  show('#pause', false);
  state = 'running'; run.paused = false;
}
$('#btnPause').onclick = pause;
$('#btnResume').onclick = resume;
$('#btnQuit').onclick = () => { show('#pause', false); run.alive = false; endRun(); };
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- revive ----------
let quizTimer = null;
function openRevive(reason, res){
  show('#revive');
  $('#reviveTitle').textContent = reason === 'wrong' ? 'Oops, wrong gate!' : pick(['Ouch!', 'Bonk!', 'Whoops!']);
  $('#reviveAnswer').innerHTML = reason === 'wrong' && res
    ? `Remember: <b>${res.text.includes('?') ? res.text.replace('?', res.answer) : `${res.text} = ${res.answer}`}</b>`
    : 'Keep running?';
  show('#reviveQuiz', false); show('#reviveBtns');
  const n = save.boosts.revive || 0;
  $('#reviveCount').textContent = `×${n}`;
  $('#btnReviveItem').disabled = n <= 0;
  show('#btnReviveQuiz', !run.usedQuizRevive);
}
$('#btnReviveItem').onclick = () => {
  if ((save.boosts.revive || 0) <= 0) return;
  save.boosts.revive--; store.save(save);
  doRevive();
};
$('#btnGiveUp').onclick = () => { show('#revive', false); endRun(); };
$('#btnReviveQuiz').onclick = () => {
  run.usedQuizRevive = true;
  show('#reviveBtns', false); show('#reviveQuiz');
  const q = engine.next(run.tables(), 0.5);
  q.shownAt = performance.now();
  $('#rqText').textContent = q.text.includes('?') ? q.text : `${q.text} = ?`;
  audio.speak(q.text);
  const opts = $('#rqOpts'); opts.innerHTML = '';
  let answered = false;
  const finish = (value) => {
    if (answered) return; answered = true;
    clearInterval(quizTimer);
    const r = engine.grade(value, q);
    run.stats.asked++;
    [...opts.children].forEach(b => { b.disabled = true; if (Number(b.textContent) === q.answer) b.style.outline = '5px solid #2ecc71'; });
    if (r.ok){
      run.stats.correct++; sfx.correct();
      $('#rqText').textContent = '✔ ' + $('#rqText').textContent.replace('?', q.answer);
      setTimeout(doRevive, 650);
    } else {
      sfx.wrong();
      $('#rqText').textContent = $('#rqText').textContent.replace('?', q.answer);
      setTimeout(() => { show('#revive', false); endRun(); }, 1400);
    }
  };
  for (const v of q.options){
    const b = document.createElement('button');
    b.textContent = v;
    b.onclick = () => finish(v);
    opts.appendChild(b);
  }
  const start = performance.now(), dur = 7000;
  quizTimer = setInterval(() => {
    const left = 1 - (performance.now() - start) / dur;
    $('#rqTimer').style.width = `${Math.max(0, left * 100)}%`;
    if (left <= 0) finish(null);
  }, 50);
};
function doRevive(){
  show('#revive', false);
  run.revive();
  state = 'running';
  sfx.bark();
  popup('Keep going!', 'good');
}

// ---------- end of run ----------
function endRun(){
  state = 'over';
  show('#question', false); qTimer = null;
  const st = run.stats;
  const score = Math.floor(run.score);
  const newBest = score > save.best;
  // missions & quests first: totalCorrect goals read the totals before this run is added
  const rewards = [];
  P.checkMissions(save, st);
  P.commitMissions(save, st);
  save.missions.active.forEach((m, i) => {
    if (!m.done) return;
    const text = missionText(m.idx);
    const c = P.claimMission(save, i);
    save.coins += c; rewards.push(`🎯 ${text} <b>+${c} 🪙</b>`);
  });
  P.commitDaily(save, st);
  save.daily.quests.forEach((q, i) => {
    if (q.done && !q.claimed){ const c = P.claimDaily(save, i); save.coins += c; rewards.push(`📅 Daily quest done <b>+${c} 🪙</b>`); }
  });

  save.coins += run.coins;
  save.best = Math.max(save.best, score);
  save.bestDistance = Math.max(save.bestDistance, Math.floor(st.distance));
  save.runs++;
  save.totals.correct += st.correct; save.totals.asked += st.asked;
  save.totals.coins += st.coins; save.totals.distance += Math.floor(st.distance);

  const xp = P.runXp(st);
  const lvlBefore = save.level, xpBefore = save.xp;
  const gained = P.addXp(save, xp);
  save.math = engine.serialize();
  store.save(save);

  // fill the card
  $('#goBanner').textContent = newBest ? 'New high score!' : score > 1500 ? 'Great run!' : pick(['Nice try!', 'Good run!', 'Woof!']);
  $('#goScore').textContent = fmt(score);
  show('#goBest', newBest && save.runs > 1);
  $('#goDist').textContent = `${fmt(st.distance)} m`;
  $('#goCoins').textContent = fmt(run.coins);
  $('#goAnswers').textContent = `${st.correct}/${st.asked}`;
  $('#goStreak').textContent = st.bestStreak;
  $('#goXpGain').textContent = `+${xp} XP`;
  $('#goLevel').textContent = lvlBefore;
  const bar = $('#goXp');
  bar.style.transition = 'none'; bar.style.width = `${100 * xpBefore / xpForLevel(lvlBefore)}%`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = '';
    bar.style.width = gained.length ? '100%' : `${100 * save.xp / xpForLevel(save.level)}%`;
    if (gained.length) setTimeout(() => { $('#goLevel').textContent = save.level; bar.style.transition = 'none'; bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = `${100 * save.xp / xpForLevel(save.level)}%`; }); }, 1000);
  }));
  const weak = engine.weakest(save.tables);
  const r = run.crashRes;
  $('#goTip').innerHTML = r && !r.ok ? `💡 Remember: <b>${r.text.includes('?') ? r.text.replace('?', r.answer) : `${r.text} = ${r.answer}`}</b>`
    : weak.length ? `💡 Keep practising the <b>${weak.map(w => '×' + w).join(' and ')}</b> tables` : '';
  $('#goRewards').innerHTML = rewards.map(x => `<div>${x}</div>`).join('');
  show('#hud', false);
  setTimeout(() => {
    show('#gameover');
    if (newBest) { sfx.levelUp(); fx.burstConfetti(run.x, 2, run.z - 4, 120); }
    if (gained.length) setTimeout(() => showLevelUps(gained), 1300);
  }, 250);
}

function missionText(idx){ return P.missionView({ ...save, missions:{ ...save.missions, active:[{ idx, progress:0 }] } })[0].text; }

function showLevelUps(gained){
  const g = gained[gained.length - 1];
  const unlocks = gained.flatMap(x => [
    ...x.dogs.map(d => `<div class="unlock"><span>🐶</span> New dog: ${d.name} the ${d.breed}!</div>`),
    ...x.outfits.map(o => `<div class="unlock"><span>✨</span> ${o.name} unlocked in the shop</div>`),
  ]).join('');
  const bonus = gained.reduce((s, x) => s + x.bonus, 0);
  sfx.levelUp();
  celebrate(`Level ${g.level}!`, `${unlocks}<div class="unlock"><span>🪙</span> +${bonus} coins</div>`);
}

let celCb = null;
function celebrate(title, html, cb = null, btn = 'Woof!'){
  $('#celTitle').textContent = title;
  $('#celBody').innerHTML = html;
  $('#celOk').textContent = btn;
  celCb = cb;
  show('#celebrate');
}
$('#celOk').onclick = () => { show('#celebrate', false); sfx.click(); const cb = celCb; celCb = null; cb?.(); UI.bindSave(save); };

$('#btnAgain').onclick = () => { show('#gameover', false); run.dispose(); startRun(); };
$('#btnHome').onclick = () => { sfx.click(); enterMenu(); };

// ---------- input ----------
addEventListener('keydown', e => {
  audio.initAudio();
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (state === 'running'){
    if (k === 'arrowleft' || k === 'a') run.move(-1);
    else if (k === 'arrowright' || k === 'd') run.move(1);
    else if (k === 'arrowup' || k === 'w' || k === ' ') run.jump();
    else if (k === 'arrowdown' || k === 's') run.slide();
    else if (k === 'p' || k === 'escape') pause();
    if (k.startsWith('arrow') || k === ' ') e.preventDefault();
  } else if (state === 'paused' && (k === 'p' || k === 'escape' || k === ' ')){
    resume();
  } else if (state === 'menu'){
    if (k === 'escape' && UI.panelOpen()) UI.closePanel();
    else if ((k === 'enter' || k === ' ') && !UI.panelOpen()) startRun();
  } else if (state === 'over' && (k === 'enter' || k === ' ') && $('#celebrate').classList.contains('hidden')){
    show('#gameover', false); run.dispose(); startRun();
  }
});

let touch = null;
addEventListener('pointerdown', e => {
  audio.initAudio();
  if (state === 'running' && e.pointerType !== 'mouse') touch = { x:e.clientX, y:e.clientY, t:performance.now(), done:false };
}, { passive:true });
addEventListener('pointermove', e => {
  if (!touch || touch.done || state !== 'running') return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  const th = 28;
  if (Math.abs(dx) > th || Math.abs(dy) > th){
    touch.done = true;
    if (Math.abs(dx) > Math.abs(dy)) run.move(dx > 0 ? 1 : -1);
    else if (dy < 0) run.jump(); else run.slide();
  }
}, { passive:true });
addEventListener('pointerup', () => { touch = null; }, { passive:true });
// mouse users can drag too
addEventListener('mousedown', e => { if (state === 'running') touch = { x:e.clientX, y:e.clientY, done:false }; });

// ---------- camera ----------
const camPos = new THREE.Vector3(0, 2, -6), camLook = new THREE.Vector3();
const tmpPos = new THREE.Vector3(), tmpLook = new THREE.Vector3();
let clock = 0, snapCam = true;

function updateCamera(dt){
  const cam = world.camera;
  const portrait = innerWidth / innerHeight < 0.8;
  const narrow = innerWidth < 700;
  let fov = world.baseFov;
  if (camMode === 'run' && run){
    const up = run.power.rocket > 0 ? 3.2 : 0;
    tmpPos.set(run.x * 0.55, 3.2 + run.y * 0.55 + up * 0.5 + (portrait ? 0.8 : 0), run.z + (portrait ? 7.2 : 6.3));
    tmpLook.set(run.x * 0.75, 1.1 + run.y * 0.6, run.z - 7);
    fov += (run.speed - 13) * 0.45 + (run.power.rocket > 0 ? 6 : 0);
    camBlend = Math.min(1, camBlend + dt * 1.2);
  } else if (camMode === 'showcase'){
    const a = clock * 0.35;
    dog.root.rotation.y = Math.sin(a) * 0.9 + Math.PI * 0.15;
    const z = dog.root.position.z;
    // keep the dog clear of the panel: centred in the space left of it on desktop,
    // above it on phones (where the panel is a bottom sheet)
    const d = 4.6;
    const frac = narrow ? 0 : Math.min(534, innerWidth - 28) / innerWidth;
    const halfW = d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.aspect;
    tmpPos.set(0, narrow ? 1.6 : 1.5, z - d);
    tmpLook.set(-frac * halfW, narrow ? -0.35 : 0.75, z);
    camBlend = 1;
  } else {
    dog.root.rotation.y *= 0.95;
    const a = clock * 0.18;
    const z = dog.root.position.z;
    tmpPos.set(Math.sin(a) * 3.5, 1.7 + Math.sin(clock * 0.3) * 0.2, z - 5.5 - Math.cos(a) * 0.8);
    tmpLook.set(0, 1.0 + (portrait ? -0.4 : 0.35), z);
    camBlend = 1;
  }
  const k = snapCam ? 1 : camMode === 'run' ? Math.min(1, dt * (2 + camBlend * 8)) : Math.min(1, dt * 3);
  snapCam = false;
  camPos.lerp(tmpPos, k);
  camLook.lerp(tmpLook, k);
  cam.position.copy(camPos);
  if (run && run.shake > 0 && save.settings.shake){
    const s = run.shake * 0.35;
    cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
  }
  cam.lookAt(camLook);
  cam.fov += (fov - cam.fov) * Math.min(1, dt * 3);
  cam.updateProjectionMatrix();
}

// ---------- HUD ----------
const hudScore = $('#hudScore'), hudDist = $('#hudDist'), hudCoins = $('#hudCoins'), hudMult = $('#hudMult');
let lastMult = 0, lastStreak = -1, missionTick = 0;
function updateHud(dt){
  hudScore.textContent = fmt(run.score);
  hudDist.textContent = fmt(run.stats.distance);
  hudCoins.textContent = fmt(run.coins);
  if (run.mult !== lastMult){ hudMult.textContent = `×${run.mult}`; lastMult = run.mult; }
  if (run.streak !== lastStreak){
    lastStreak = run.streak;
    show('#hudStreak', run.streak >= 2);
    $('#hudStreak b').textContent = run.streak;
  }
  if (qTimer){
    const left = (run.z - qTimer.gate.z) / qTimer.from;
    const t = $('#qTimer');
    t.style.width = `${Math.max(0, left) * 100}%`;
    t.style.background = left < 0.3 ? '#ff4d5e' : '';
  }
  // power-up bars
  const P2 = run.power;
  const active = ['magnet', 'double', 'rocket'].filter(k => P2[k] > 0);
  if (run.shield) active.push('shield');
  const key = active.join();
  const box = $('#powers');
  if (powerDirty || box.dataset.key !== key){
    box.dataset.key = key; powerDirty = false;
    box.innerHTML = active.map(k => `<div class="pw" data-k="${k}"><span class="pi">${POWERUPS[k].icon}</span>
      <div class="pb"><i style="background:#${POWERUPS[k].color.toString(16).padStart(6, '0')}"></i></div></div>`).join('');
  }
  for (const elx of box.children){
    const k = elx.dataset.k;
    const total = k === 'rocket' && run.rocketHead ? 400 / 24 : run.duration(k);
    elx.querySelector('i').style.width = `${Math.min(100, 100 * P2[k] / total)}%`;
  }
  // next rival
  const r = RIVALS[run.rivalIdx];
  const bar = $('#rivalBar');
  if (r && run.score < r.score){
    show(bar);
    $('#rivalName').textContent = `🐾 ${r.name}`;
    $('#rivalScore').textContent = fmt(r.score);
    const prev = run.rivalIdx > 0 ? RIVALS[run.rivalIdx - 1].score : 0;
    $('#rivalFill').style.width = `${Math.max(0, Math.min(100, 100 * (run.score - prev) / (r.score - prev)))}%`;
  } else show(bar, false);

  // live mission checks
  missionTick -= dt;
  if (missionTick <= 0){
    missionTick = 0.5;
    for (const m of P.checkMissions(save, run.stats)){ toast(`🎯 Mission complete!`, `${m.text} — +${m.reward} 🪙`, 'green'); sfx.buy(); }
    for (const q of P.checkDaily(save, run.stats)){ toast(`📅 Daily quest done!`, `${q.text} — +${q.reward} 🪙`, 'green'); sfx.buy(); }
  }
  audio.setMusicIntensity((run.speed - 13) / 19);
}

// ---------- loop ----------
let last = performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  clock += dt;

  if (state === 'running'){
    run.update(dt);
    updateHud(dt);
  } else if (state === 'countdown'){
    animateDog(dog, dt, 'idle', 0);
    run.spawner.fill(-190, run.speed, 0);
    run.spawner.update(dt, run.z, clock);
  } else if (state === 'revive' || state === 'over'){
    if (run && !run.alive){
      // tumble
      dog.pivot.rotation.x += (-1.2 - dog.pivot.rotation.x) * Math.min(1, dt * 6);
      animateDog(dog, dt, 'crash', 0);
    }
    if (run.shake > 0) run.shake = Math.max(0, run.shake - dt * 2.5);
  } else if (state === 'menu'){
    animateDog(dog, dt, 'idle', 0, { happy:true });
  }

  const focusZ = state === 'menu' ? 0 : run.z;
  world.update(focusZ, dt, world.camera.position.z);
  fx.update(dt);
  updateCamera(dt);
  world.render();
}

// ---------- go ----------
bootBar.style.width = '100%';
world.update(0, 0);
setTimeout(() => {
  $('#boot').classList.add('fade');
  setTimeout(() => $('#boot').remove(), 600);
  enterMenu();
}, 350);
requestAnimationFrame(frame);

// handle for automated checks in the browser console
window.__runner = { get run(){ return run; }, get state(){ return state; }, world, save:() => save };

function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
