// ---------- 3x3 Runner 3D: boot, screens, camera and the frame loop ----------

import * as THREE from 'three';
import { World } from './world.js';
import { Effects } from './effects.js';
import { Run } from './game.js';
import { buildDog, animateDog, setWear, nameTag } from './dog.js';
import { MathEngine } from './mathq.js';
import { DOGS, POWERUPS, RIVALS, CHALLENGE, xpForLevel } from './data.js';
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
if (save.settings.touchButtons === null) save.settings.touchButtons = matchMedia('(pointer:coarse)').matches;
const engine = new MathEngine(save.math);
const world = new World($('#scene'), save.settings.quality);
const fx = new Effects(world.scene);
bootBar.style.width = '60%';

let dog = null;
let state = 'menu';
let challengeTable = null;   // set while a Multiplication Challenge is running          // menu | countdown | running | paused | revive | over
let run = null;
let camMode = 'menu';        // menu | showcase | run
let camBlend = 0;
const chosenBoosts = { headstart:false, startshield:false };

function makeDog(id = save.dog, wear = save.wear){
  if (dog) world.scene.remove(dog.root);
  const def = DOGS.find(d => d.id === id) || DOGS[0];
  dog = buildDog(def, wear);
  dog.root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  dog.tag = nameTag(store.dogName(save, def.id), '#ffffff');
  dog.tag.position.y = 1.35;
  dog.tag.visible = state === 'menu';
  dog.root.add(dog.tag);
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
    if (run.challenge) updateHearts();
    if (res.ok){
      sfx.correct();
      popup(res.fast ? 'SUPER FAST!' : pick(['Correct!', 'Brilliant!', 'Paw-some!', 'Great!', `Good dog, ${myName()}!`, `Go, ${myName()}!`]), 'good');
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
    if (run.challenge){ setTimeout(() => finishChallenge(false), 1000); return; }
    setTimeout(() => openRevive(reason, res), 900);
  },
  heartLost: (hearts, reason, res) => {
    updateHearts(true);
    popup(hearts === 1 ? '💔 Last heart!' : '💔', 'bad');
    if (reason === 'wrong' && res) toast(`Remember: ${factText(res)}`, `${hearts} heart${hearts === 1 ? '' : 's'} left`, 'pink');
  },
  challengeDone: () => {
    popup('Challenge complete!', 'gold');
    sfx.levelUp();
    fx.burstConfetti(run.x, 3, run.z - 6, 140);
    state = 'finishing';
    setTimeout(() => finishChallenge(true), 1400);
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
  renameDog: (id, done) => askName(id, done),
  startChallenge: t => startRun(t),
  resetAll(){ save = store.reset(); P.ensureDaily(save); Object.assign(engine, new MathEngine(null)); run.save = save;
    makeDog(); app.commit(); UI.closePanel(); toast('Progress reset'); app.refreshBoosts(); },
};

function applySettings(){
  const s = save.settings;
  audio.setSound(s.sound); audio.setMusic(s.music); audio.setVoice(s.voice);
  show('#touchPad', !!s.touchButtons);
  $('#hud').classList.toggle('pad', !!s.touchButtons);
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
  challenge: ['Multiplication Challenge', UI.renderChallenge, false],
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
  if (dog.tag) dog.tag.visible = true;
  const daily = () => {
    if (!P.loginReward(save)) return;
    const lr = P.loginReward(save);
    celebrate('Daily reward!', `<div class="unlock"><span>🎁</span> Day ${lr.day} — 🪙 ${lr.amount}</div>
      <p>Come back tomorrow for more!</p>`, () => app.claimLogin(), 'Claim');
  };
  // first visit: meet your dog and give it a name
  if (!save.askedName){ save.askedName = true; store.save(save); askName(save.dog, daily, true); }
  else daily();
}

// ---------- naming your dog ----------
const NAME_IDEAS = ['Biscuit', 'Rocket', 'Pickle', 'Waffles', 'Noodle', 'Ziggy', 'Pepper', 'Bolt', 'Maple', 'Captain',
  'Sprout', 'Pixel', 'Bean', 'Nacho', 'Comet', 'Muffin', 'Scout', 'Tofu', 'Sherlock', 'Dotty', 'Turbo', 'Cookie', 'Echo', 'Fudge'];
let nameCb = null, nameFor = null;
function myName(){ return store.dogName(save, save.dog); }
function askName(id, done = null, first = false){
  const def = DOGS.find(d => d.id === id) || DOGS[0];
  nameFor = id; nameCb = done;
  $('#nameTitle').textContent = first ? 'Meet your dog!' : 'Rename your dog';
  $('#nameBreed').textContent = first ? `This ${def.breed} is ready to run. What's their name?` : `Your ${def.breed} is called…`;
  const input = $('#nameInput');
  input.value = store.dogName(save, id);
  $('#nameCancel').textContent = first ? `Keep "${def.name}"` : 'Cancel';
  const ideas = NAME_IDEAS.slice().sort(() => Math.random() - 0.5).slice(0, 5);
  const sugg = $('#nameSugg'); sugg.innerHTML = '';
  for (const n of ideas){
    const b = document.createElement('button'); b.textContent = n;
    b.onclick = () => { input.value = n; sfx.click(); };
    sugg.appendChild(b);
  }
  show('#nameModal');
  // don't pop the phone keyboard over the suggestions on first open
  if (!matchMedia('(pointer:coarse)').matches) setTimeout(() => { input.focus(); input.select(); }, 50);
}
function closeName(saveIt){
  const id = nameFor;
  if (saveIt){
    const clean = store.cleanName($('#nameInput').value);
    const def = DOGS.find(d => d.id === id);
    if (clean && clean !== def.name) save.dogNames[id] = clean; else delete save.dogNames[id];
    store.save(save);
    sfx.bark();
    toast(`🐾 Hello, ${store.dogName(save, id)}!`, '', 'gold');
    if (state === 'menu') makeDog(camMode === 'showcase' ? dog.def.id : save.dog);
  }
  $('#nameInput').blur();
  show('#nameModal', false);
  UI.bindSave(save);
  const cb = nameCb; nameCb = null; nameFor = null;
  cb?.();
}
$('#nameSave').onclick = () => closeName(true);
$('#nameCancel').onclick = () => closeName(false);
$('#nameDice').onclick = () => { $('#nameInput').value = NAME_IDEAS[Math.floor(Math.random() * NAME_IDEAS.length)]; sfx.click(); };
$('#nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') closeName(true); if (e.key === 'Escape') closeName(false); });
$('#btnName').onclick = () => { sfx.click(); askName(save.dog); };

function factText(r){ return r.text.includes('?') ? r.text.replace('?', r.answer) : `${r.text} = ${r.answer}`; }

$('#btnPlay').onclick = () => startRun();

function startRun(challenge = null){
  challengeTable = challenge;
  if (!challenge && !save.tables.length){ toast('Pick some times tables first!'); openScreen('tables'); return; }
  audio.initAudio(); audio.startMusic();
  sfx.click();
  UI.closePanel();                     // its onClose re-shows the menu, so close it first
  show('#menu', false); show('#gameover', false);
  show('#hud');
  const opts = {};
  // boosts are for endless runs; a challenge is the same test for everyone
  if (!challenge) for (const k of ['headstart', 'startshield']){
    if (chosenBoosts[k] && save.boosts[k] > 0){ save.boosts[k]--; opts[k] = true; }
    chosenBoosts[k] = false;
  }
  store.save(save);
  makeDog();
  dog.tag.visible = false;
  run.start({ startShield:opts.startshield, challenge });
  show('#challengeBar', !!challenge);
  if (challenge){ $('#chTable').textContent = `×${challenge}`; updateHearts(); }
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
    span.textContent = n > 0 ? n : `GO, ${myName().toUpperCase()}!`;
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
  const list = run.challenge ? `🏅 ×${run.challenge.table} Challenge — ${run.challenge.answered}/${run.challenge.queue.length} answered, ${'❤️'.repeat(run.challenge.hearts)}` : P.missionView(save, run.stats).map(m => `${m.done ? '✅' : '⬜'} ${m.text} <b>${fmt(m.progress)}/${fmt(m.goal)}</b>`).join('<br>');
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
$('#btnQuit').onclick = () => { show('#pause', false); run.alive = false; if (run.challenge) finishChallenge(false); else endRun(); };
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
// Bank a finished run: missions, quests, coins, totals, XP. Shared by endless and challenge.
function settleRun({ countBest = true } = {}){
  const st = run.stats;
  const score = Math.floor(run.score);
  const newBest = countBest && score > save.best;
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
  if (countBest){
    save.best = Math.max(save.best, score);
    save.bestDistance = Math.max(save.bestDistance, Math.floor(st.distance));
  }
  save.runs++;
  save.totals.correct += st.correct; save.totals.asked += st.asked;
  save.totals.coins += st.coins; save.totals.distance += Math.floor(st.distance);

  const xp = P.runXp(st);
  const lvlBefore = save.level, xpBefore = save.xp;
  const gained = P.addXp(save, xp);
  save.math = engine.serialize();
  return { st, score, newBest, rewards, xp, lvlBefore, xpBefore, gained };
}

function fillCard(r, { banner, tip, stars = null }){
  const { st } = r;
  $('#goBanner').textContent = banner;
  show('#goStars', stars !== null);
  if (stars !== null) $('#goStars').innerHTML = [0, 1, 2].map(i => i < stars ? '<i>★</i>' : '★').join('');
  $('#goScoreLabel').textContent = stars !== null ? `${myName()}'s score` : 'Score';
  $('#goScore').textContent = fmt(r.score);
  show('#goBest', r.newBest && save.runs > 1);
  $('#goDist').textContent = `${fmt(st.distance)} m`;
  $('#goCoins').textContent = fmt(run.coins);
  $('#goAnswers').textContent = `${st.correct}/${stars !== null ? run.challenge.queue.length : st.asked}`;
  $('#goStreak').textContent = st.bestStreak;
  $('#goXpGain').textContent = `+${r.xp} XP`;
  $('#goLevel').textContent = r.lvlBefore;
  const bar = $('#goXp');
  bar.style.transition = 'none'; bar.style.width = `${100 * r.xpBefore / xpForLevel(r.lvlBefore)}%`;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bar.style.transition = '';
    bar.style.width = r.gained.length ? '100%' : `${100 * save.xp / xpForLevel(save.level)}%`;
    if (r.gained.length) setTimeout(() => { $('#goLevel').textContent = save.level; bar.style.transition = 'none'; bar.style.width = '0%';
      requestAnimationFrame(() => { bar.style.transition = ''; bar.style.width = `${100 * save.xp / xpForLevel(save.level)}%`; }); }, 1000);
  }));
  $('#goTip').innerHTML = tip;
  $('#goRewards').innerHTML = r.rewards.map(x => `<div>${x}</div>`).join('');
  show('#hud', false);
}

function endRun(){
  state = 'over';
  show('#question', false); qTimer = null;
  const r = settleRun();
  store.save(save);
  const weak = engine.weakest(save.tables);
  const cr = run.crashRes;
  const name = UI.esc(myName());
  fillCard(r, {
    banner: r.newBest ? 'New high score!' : r.score > 1500 ? `Great run, ${myName()}!` : pick(['Nice try!', 'Good run!', `Good dog, ${myName()}!`]),
    tip: cr && !cr.ok ? `💡 Remember: <b>${factText(cr)}</b>`
      : weak.length ? `💡 ${name} says: keep practising the <b>${weak.map(w => '×' + w).join(' and ')}</b> tables` : '',
  });
  setTimeout(() => {
    show('#gameover');
    if (r.newBest) { sfx.levelUp(); fx.burstConfetti(run.x, 2, run.z - 4, 120); }
    if (r.gained.length) setTimeout(() => showLevelUps(r.gained), 1300);
  }, 250);
}

// ---------- Multiplication Challenge results ----------
function finishChallenge(completed){
  if (state === 'results') return;
  state = 'results';
  show('#question', false); qTimer = null;
  const C = run.challenge, t = C.table;
  const correct = run.stats.correct;
  const stars = CHALLENGE.stars.filter(n => correct >= n).length;
  const prev = save.challenge[t] || 0;
  const masteredBefore = store.mastered(save);
  const r = settleRun({ countBest:false });
  if (stars > prev){
    save.challenge[t] = stars;
    const bonus = CHALLENGE.starCoins.slice(prev, stars).reduce((a, b) => a + b, 0);
    save.coins += bonus;
    r.rewards.unshift(`⭐ New best on ×${t}: ${stars} star${stars > 1 ? 's' : ''} <b>+${bonus} 🪙</b>`);
  }
  const masteredNow = store.mastered(save);
  const newDogs = DOGS.filter(d => d.challenge && masteredBefore < d.challenge && masteredNow >= d.challenge);
  for (const d of newDogs) r.rewards.unshift(`🏅 You won ${d.name} the ${d.breed}!`);
  store.save(save);

  const missed = run.stats.asked - correct;
  fillCard(r, {
    stars,
    banner: completed ? (stars === 3 ? `×${t} mastered!` : `×${t} Challenge done!`) : `×${t} Challenge over`,
    tip: stars === 3 ? `🏆 Perfect! ${UI.esc(myName())} knows every fact in the ${t} times table.`
      : !completed ? `💡 Out of hearts after ${C.answered} of ${C.queue.length}. ${run.crashRes && !run.crashRes.ok ? `Remember: <b>${factText(run.crashRes)}</b>` : 'Try again!'}`
      : `💡 ${missed} wrong — ${stars < 3 ? `get all ${CHALLENGE.questions} right for 3 stars` : ''}`,
  });
  setTimeout(() => {
    show('#gameover');
    if (stars >= 2){ sfx.levelUp(); fx.burstConfetti(run.x, 2, run.z - 4, 120); }
    const after = () => r.gained.length && setTimeout(() => showLevelUps(r.gained), 300);
    if (newDogs.length) setTimeout(() => {
      sfx.bark();
      celebrate('New dog!', newDogs.map(d => `<div class="unlock"><span>🏅</span> ${d.name} the ${d.breed}</div>`).join('')
        + '<p>Find them in the Dogs menu.</p>', after);
    }, 1300);
    else after();
  }, 250);
}

function updateHearts(hit = false){
  const C = run.challenge;
  if (!C) return;
  const h = $('#chHearts');
  h.textContent = '❤️'.repeat(C.hearts) + '🤍'.repeat(CHALLENGE.hearts - C.hearts);
  if (hit){ h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit'); }
  $('#chProg').textContent = `${C.answered} / ${C.queue.length}`;
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

$('#btnAgain').onclick = () => { show('#gameover', false); run.dispose(); startRun(challengeTable); };
$('#btnHome').onclick = () => { sfx.click(); enterMenu(); };

// ---------- input ----------
const typing = e => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
const overlayOpen = () => !$('#celebrate').classList.contains('hidden') || !$('#nameModal').classList.contains('hidden');

addEventListener('keydown', e => {
  audio.initAudio();
  if (e.repeat || typing(e)) return;
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
    else if ((k === 'enter' || k === ' ') && !UI.panelOpen() && !overlayOpen()) startRun();
  } else if ((state === 'over' || state === 'results') && (k === 'enter' || k === ' ') && !overlayOpen() && !$('#gameover').classList.contains('hidden')){
    show('#gameover', false); run.dispose(); startRun(challengeTable);
  }
});

// Touch: swipe anywhere (one swipe = one move), or use the on-screen buttons.
const act = a => {
  if (state !== 'running') return;
  if (a === 'left') run.move(-1);
  else if (a === 'right') run.move(1);
  else if (a === 'jump') run.jump();
  else if (a === 'slide') run.slide();
};
for (const b of document.querySelectorAll('#touchPad button')){
  b.addEventListener('pointerdown', e => {
    e.preventDefault(); e.stopPropagation();
    audio.initAudio();
    act(b.dataset.act);
    b.classList.add('down');
    navigator.vibrate?.(8);
  });
  const up = () => b.classList.remove('down');
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
}

let touch = null;
// Swipes are measured in CSS pixels but scaled to the screen, so a short flick with a
// thumb counts on a phone. One finger can chain moves (left, then up) without lifting.
const swipeDist = () => Math.max(14, Math.min(26, Math.min(innerWidth, innerHeight) * 0.035));
function swipe(dx, dy, x, y){
  const horiz = Math.abs(dx) > Math.abs(dy) * 0.8;     // favour lanes on diagonal flicks
  const dir = horiz ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'jump' : 'slide');
  act(dir);
  swipeMark(dir, x, y);
  navigator.vibrate?.(6);
  return dir;
}
addEventListener('pointerdown', e => {
  audio.initAudio();
  if (state !== 'running' || e.target.closest('button')) return;
  touch = { id:e.pointerId, x:e.clientX, y:e.clientY, t:performance.now(), last:null, lastT:0, moved:false };
}, { passive:true });
addEventListener('pointermove', e => {
  if (!touch || e.pointerId !== touch.id || state !== 'running') return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  const need = touch.last ? swipeDist() * 1.6 : swipeDist();
  if (Math.abs(dx) < need && Math.abs(dy) < need) return;
  const now = performance.now();
  const horiz = Math.abs(dx) > Math.abs(dy) * 0.8;
  const dir = horiz ? (dx > 0 ? 'right' : 'left') : (dy < 0 ? 'jump' : 'slide');
  // a repeat in the same direction needs a short pause, so one long drag isn't two moves
  if (dir === touch.last && now - touch.lastT < 220) return;
  swipe(dx, dy, e.clientX, e.clientY);
  touch.last = dir; touch.lastT = now; touch.moved = true;
  touch.x = e.clientX; touch.y = e.clientY;             // re-arm from here for a chained move
}, { passive:true });
addEventListener('pointerup', e => {
  // a quick flick can end before any move event crossed the threshold
  if (touch && !touch.moved && e.pointerId === touch.id && performance.now() - touch.t < 350){
    const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) swipe(dx, dy, e.clientX, e.clientY);
  }
  touch = null;
}, { passive:true });

// A little arrow flashes where your finger is, so you can see each swipe register.
const SWIPE_ICON = { left:'◀', right:'▶', jump:'▲', slide:'▼' };
function swipeMark(dir, x, y){
  const m = document.createElement('div');
  m.className = `swipe-mark ${dir}`;
  m.textContent = SWIPE_ICON[dir];
  m.style.left = `${x}px`; m.style.top = `${y}px`;
  document.body.appendChild(m);
  setTimeout(() => m.remove(), 450);
}
addEventListener('pointercancel', () => { touch = null; }, { passive:true });
// stop long-press menus and iOS pinch/double-tap zoom from stealing touches mid-run
addEventListener('contextmenu', e => { if (!typing(e)) e.preventDefault(); });
addEventListener('gesturestart', e => e.preventDefault());
addEventListener('dblclick', e => e.preventDefault());

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
    tmpPos.set(0, narrow ? 2.0 : 1.5, z - (narrow ? 5.6 : d));
    tmpLook.set(-frac * halfW, narrow ? -1.25 : 0.75, z);
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
let lastMult = 0, lastStreak = -1, missionTick = 0, lastChKey = '';
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
  if (run.challenge){
    const key = `${run.challenge.hearts}|${run.challenge.answered}`;
    if (key !== lastChKey){ lastChKey = key; updateHearts(); }
  }
  if (r && run.score < r.score && !run.challenge){
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

// ---------- contact shadow ----------
const blob = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(20,20,40,1)'); g.addColorStop(0.6, 'rgba(20,20,40,0.5)'); g.addColorStop(1, 'rgba(20,20,40,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.5),
    new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 1;
  world.scene.add(m);
  return m;
})();

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
  } else if (state === 'revive' || state === 'over' || state === 'finishing' || state === 'results'){
    if (run.alive) animateDog(dog, dt, 'idle', 0, { happy:true });
    if (run && !run.alive){
      // tumble
      dog.pivot.rotation.x += (-1.2 - dog.pivot.rotation.x) * Math.min(1, dt * 6);
      animateDog(dog, dt, 'crash', 0);
    }
    if (run.shake > 0) run.shake = Math.max(0, run.shake - dt * 2.5);
  } else if (state === 'menu'){
    animateDog(dog, dt, 'idle', 0, { happy:true });
  }

  // soft contact shadow under the dog, shrinking as it leaves the ground
  const ground = state === 'menu' ? 0 : (run.ground || 0);
  const lift = Math.max(0, dog.root.position.y - ground);
  blob.position.set(dog.root.position.x, ground + 0.03, dog.root.position.z);
  blob.scale.setScalar(1.1 / (1 + lift * 0.35) * (dog.def.size ?? 1));
  blob.material.opacity = 0.42 / (1 + lift * 0.6);
  blob.visible = dog.root.visible !== false && !(run.power?.rocket > 0 && state === 'running');

  // speed lines once the dog is really moving (and always on the rocket)
  const rush = state === 'running'
    ? Math.max(0, Math.min(1, (run.speed - 19) / 10)) + (run.power.rocket > 0 ? 0.8 : 0) : 0;
  world.updateSpeedLines(dt, Math.min(1, rush), run.speed || 0);

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
window.__runner = { get run(){ return run; }, get state(){ return state; }, world, save:() => save, snap:() => { snapCam = true; } };

function pick(a){ return a[Math.floor(Math.random() * a.length)]; }
