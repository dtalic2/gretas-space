// ---------- MilMATHS ----------
//
// Wires the whole thing together. There are three tabs along the bottom —
// **Home** (your stage), **Library** (every comic) and **Milbils** (the shop
// and the workshop) — one of which is showing in #view at any time.
//
// Over the top of that there can be one full screen (a lesson, a test, a comic,
// a set of results) and at most one sheet sliding up from the bottom.
// Everything else is a toast.

import {
  S, load, save, saveNow, wipe, rollOver, lapsedDays, LAPSE_DAYS, SCALE_MINUTES,
  has, ownsPart, buddy, rank, toNextRank, fmt,
  record, isDone, stageOpen, stageDone, lessonsDone, lessonOpen, bookOpen,
  testRecord, testPassed, testOpen, current, allDone, counts,
  buyMilbil, buyFeature, buyPart, saveCustom, wear,
  setClock, clockLeft, addMinutes, learned, todayMinutes, totalMinutes, scalePos, readBook, XP,
  STAGES, STAGE, ALL_LESSONS, getLesson, getTest, PASS_WRONG,
  ALL_BOOKS, getBook, bookBefore, booksOf,
} from './state.js';
import {
  MILBILS, MILBIL, FEATURES, FEATURE, FEATURE_GROUPS, RANKS,
  PARTS, PART, PART_GROUPS, lookFromParts,
} from './shop.js';
import { Countdown, recommend, dayLine, dayShape, nextHoliday, mmss, STATES } from './clock.js';
import { drawLook, artHTML } from './milbil.js';
import { pageHTML, castHTML } from './books.js';
import { Lesson, buddyHTML } from './lesson.js';
import { $, esc, Sheet, card, toast, floatText, sfx, setSound, buzz, setBuzz, confetti } from './ui.js';

const el = {};
let sheet, clock, running = null, learnTimer = null;

const NAMES = ['Greta', 'Milly', 'Bil', 'Pip', 'Sprout', 'Nugget', 'Pickle', 'Bean', 'Tilly', 'Ro', 'Mo', 'Dot'];

// ===================================================================== HUD ===

function paintHud(){
  el.avatar.innerHTML = buddyHTML();
  el.name.textContent = S.name || 'You';
  const r = rank();
  el.rank.textContent = `${r.icon} ${r.name}`;
  el.xp.textContent = fmt(S.xp);
  paintClock();
  paintBadges();
}

function paintBadges(){
  const affordable = [
    ...MILBILS.filter(m => !S.owned.includes(m.id) && m.cost <= S.xp),
    ...FEATURES.filter(f => !has(f.id) && f.cost <= S.xp),
    ...PARTS.filter(p => !ownsPart(p.id) && p.cost <= S.xp),
  ].length;
  el.milBadge.textContent = affordable || '';
  const unread = ALL_BOOKS.filter(b => bookOpen(b) && !S.read.includes(b.id)).length;
  el.libBadge.textContent = unread || '';
}

function bump(node){ node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }

function gainedXp(){
  el.xp.textContent = fmt(S.xp);
  bump(el.xpPill);
  paintBadges();
}

// ============================================== the clock, and time spent ===

function paintClock(){
  const c = S.clock;
  el.clockPill.classList.toggle('off', !c.set);
  el.clockPill.classList.toggle('out', !!c.set && c.left <= 0);
  el.clockPill.classList.toggle('held', !!c.set && c.left > 0 && clock?.paused);
  if (!c.set) el.clockNum.textContent = 'set';
  else if (c.left <= 0) el.clockNum.textContent = 'up!';
  else el.clockNum.textContent = mmss(c.left);
}

function startClock(){
  clock = new Countdown({
    onTick: (c) => { clockLeft(c.left); paintClock(); },
    onDone: timesUp,
  });
  if (S.clock.set && S.clock.left > 0) clock.set(S.clock.left, { start: true });
  else paintClock();
}

/**
 * Put a new time on the clock.
 *
 * The saved figure and the running countdown have to move together or the two
 * drift apart, so nothing outside here touches one without the other.
 */
function useClock(minutes){
  if (minutes > 0){ setClock(minutes * 60); clock.set(S.clock.left, { start: true }); }
  else { setClock(0, { chosen: true }); clock.stop(); }
  paintClock();
}

function extendClock(minutes){
  addMinutes(minutes);
  clock.set(S.clock.left, { start: true });
  paintClock();
}

/**
 * Count learning time.
 *
 * Started when a lesson, test or comic opens and stopped when it closes, so
 * the minutes on the gauge are minutes actually spent on maths. Deciding which
 * hat to buy is not maths. The countdown in the corner keeps running either
 * way — that one is measuring how long you have been sitting here.
 */
function startLearning(){
  if (learnTimer) return;
  learnTimer = setInterval(() => {
    if (document.hidden) return;
    learned(1);
  }, 1000);
}

function stopLearning(){
  clearInterval(learnTimer);
  learnTimer = null;
  saveNow();
}

async function timesUp(){
  sfx('times'); buzz([60, 60, 60]);
  paintClock();
  const t = S.log;
  const buttons = [{ label:'Finish for today', cls:'go' }];
  if (has('snooze')) buttons.unshift({ label:'⏱️ Five more minutes', cls:'ghost', value:'more' });
  const out = await card(`
    <h3>⏰ Time's up</h3>
    <p>That's the ${Math.round(S.clock.set / 60)} minutes you set yourself.</p>
    <ul class="tally">
      <li><b>${todayMinutes()}</b> minutes of it actually doing maths</li>
      <li><b>${t.questions}</b> questions answered, <b>${t.right}</b> right</li>
      <li><b>${fmt(t.xp)}</b> XP earned today</li>
    </ul>
    <p class="muted">Nothing stops working — the clock is only here so you know
      where you are. Come back tomorrow for a fresh one.</p>`, buttons);
  if (out === 'more'){ extendClock(5); toast('⏱️ Five more minutes.'); }
}

function askTheDay({ forced = false } = {}){
  if (!forced && S.clock.chosen) return;
  openDaySheet();
}

/** Shown once, on the way in, if it has been a while. */
async function lapseNotice(){
  await card(`
    <h3>⚠️ Caution</h3>
    <p>You haven't played this game for a long time — <b>${lapsedDays} days</b>.
      We strongly recommend that you keep reinforcing your learning.</p>
    <p class="muted">Nothing has been lost. Your stage, your stars and your XP are
      exactly where you left them.</p>`, [{ label:"Right, let's go", cls:'go' }]);
}

// ==================================================================== tabs ===

const TABS = { home: paintHome, library: paintLibrary, milbils: paintMilbils };

function setTab(name, { remember = true } = {}){
  if (!TABS[name]) name = 'home';
  if (remember && S.tab !== name){ S.tab = name; saveNow(); }
  for (const b of el.tabbar.querySelectorAll('.tab')) b.classList.toggle('on', b.dataset.tab === name);
  el.view.scrollTop = 0;
  TABS[name]();
}

const repaint = () => setTab(S.tab, { remember: false });

// ============================================================ home: the map ===

function paintHome(){
  const cur = current();
  el.view.innerHTML = gaugeHTML() + STAGES.map(st => stageHTML(st, cur)).join('') + footerHTML();
  const now = el.view.querySelector('.row.now');
  if (now && !el.view.dataset.scrolled){
    el.view.dataset.scrolled = '1';
    setTimeout(() => now.scrollIntoView({ block:'center', behavior:'smooth' }), 240);
  }
}

/** The 0–300 minute scale, with today's learning time on it. */
function gaugeHTML(){
  const mins = todayMinutes();
  const pos = scalePos() * 100;
  const rec = recommend(new Date(), { state:S.state, birthday:S.birthday });
  const target = Math.min(100, (rec.minutes / SCALE_MINUTES) * 100);
  return `<section class="gauge card">
    <div class="gauge-top">
      <b>${mins} min</b>
      <small>of maths today · ${fmt(totalMinutes())} min all time</small>
    </div>
    <div class="scale">
      <i class="scale-fill" style="width:${pos.toFixed(2)}%"></i>
      ${rec.minutes ? `<i class="scale-mark" style="left:${target.toFixed(2)}%" title="today's suggestion"></i>` : ''}
    </div>
    <div class="scale-ends"><span>0</span><span>75</span><span>150</span><span>225</span><span>${SCALE_MINUTES} min</span></div>
    <p class="gauge-note">Only lessons, tests and comics count towards this. Time in the shop does not.</p>
  </section>`;
}

function stageHTML(st, cur){
  const open = stageOpen(st.id);
  const done = lessonsDone(st.id);
  const rows = [];
  for (const l of st.lessons){
    const bk = bookBefore(st.id, l.n);
    if (bk) rows.push(bookRowHTML(bk));
    rows.push(lessonRowHTML(st, l, cur));
  }
  rows.push(testRowHTML(st, cur));
  return `
    <section class="stage${open ? '' : ' shut'}" style="--accent:${st.colour};--tint:${st.tint}">
      <header class="stage-top">
        <span class="stage-icon">${open ? st.icon : '🔒'}</span>
        <div class="stage-txt">
          <b>Stage ${st.id} · ${esc(st.name)}</b>
          <small>${esc(st.year)}</small>
        </div>
        <span class="stage-score">${testPassed(st.id) ? '✓' : `${done}/${st.lessons.length}`}</span>
      </header>
      <p class="stage-blurb">${open ? esc(st.blurb)
        : `Pass the Stage ${st.id - 1} test and this opens up.`}</p>
      ${open ? `<ol class="rows">${rows.join('')}</ol>` : ''}
    </section>`;
}

function bookRowHTML(bk){
  const open = bookOpen(bk);
  const read = S.read.includes(bk.id);
  return `<li class="row book${open ? '' : ' shut'}${read ? ' read' : ''}"
      ${open ? `data-book="${bk.id}"` : ''}>
    <span class="row-n">${open ? bk.icon : '🔒'}</span>
    <span class="row-txt"><b>${esc(bk.name)}</b><small>${read ? `Comic · ${esc(bk.teaches)}` : `Comic · ${esc(bk.teaches)} · +${XP.book} XP`}</small></span>
    <span class="row-end">${read ? '✓' : open ? '›' : ''}</span>
  </li>`;
}

function lessonRowHTML(st, l, cur){
  const open = lessonOpen(st.id, l.n);
  const r = record(st.id, l.n);
  const isNow = cur.kind === 'lesson' && cur.stage === st.id && cur.n === l.n;
  const stars = r ? '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars) : '';
  return `<li class="row lesson${open ? '' : ' shut'}${r ? ' done' : ''}${isNow ? ' now' : ''}"
      ${open ? `data-lesson="${st.id}-${l.n}"` : ''}>
    <span class="row-n">${open ? l.n : '🔒'}</span>
    <span class="row-txt">
      <b>${esc(l.name)}</b>
      <small>${open ? (r ? `${r.clean}/${r.of} first go · no more XP` : `${l.qs.length} questions`)
        : 'Finish the lesson before this one'}</small>
    </span>
    <span class="row-end">${r ? `<i class="stars">${stars}</i>` : isNow ? '<i class="go-dot">▶</i>' : open ? '›' : ''}</span>
  </li>`;
}

function testRowHTML(st, cur){
  const open = testOpen(st.id) && stageOpen(st.id);
  const t = testRecord(st.id);
  const passed = testPassed(st.id);
  const isNow = cur.kind === 'test' && cur.stage === st.id;
  const test = getTest(st.id);
  return `<li class="row test${open ? '' : ' shut'}${passed ? ' done' : ''}${isNow ? ' now' : ''}"
      ${open ? `data-test="${st.id}"` : ''}>
    <span class="row-n">${open ? '📝' : '🔒'}</span>
    <span class="row-txt">
      <b>Stage ${st.id} Test</b>
      <small>${passed ? `Passed · best ${t.best}/${t.of}`
        : open ? `${test.qs.length} questions · more than ${PASS_WRONG} wrong and the stage starts again`
        : 'Finish all twenty lessons first'}${t && !passed ? ` · last go ${t.of - t.wrong}/${t.of}` : ''}</small>
    </span>
    <span class="row-end">${passed ? '🏅' : isNow ? '<i class="go-dot">▶</i>' : open ? '›' : ''}</span>
  </li>`;
}

function footerHTML(){
  const c = counts();
  if (allDone()) return `<p class="map-foot big">🏆 Every lesson and every test in MilMATHS, finished.
    ${c.stars} stars out of ${c.starsOf}. Go back over anything you like — it pays nothing,
    but the stars still count.</p>`;
  return `<p class="map-foot">${c.lessons} of ${c.of} lessons · ${c.tests} of ${c.testsOf} tests ·
    ${c.stars} of ${c.starsOf} stars · ${c.books} of ${c.booksOf} comics read</p>`;
}

// =============================================================== library ===

function paintLibrary(){
  const c = counts();
  el.view.innerHTML = `
    <section class="lib-top card">
      <h2>📚 The Library</h2>
      <p>Forty comic books, ten to a stage — one in front of every other lesson. Every one is milbils you have met in the other
        games working an idea out loud, and you can read any of them again whenever you like —
        reading one a second time is free and pays nothing.</p>
      <p class="muted">${c.books} of ${c.booksOf} read.</p>
    </section>
    ${STAGES.map(st => {
      const open = stageOpen(st.id);
      return `<section class="stage${open ? '' : ' shut'}" style="--accent:${st.colour};--tint:${st.tint}">
        <header class="stage-top">
          <span class="stage-icon">${open ? st.icon : '🔒'}</span>
          <div class="stage-txt"><b>Stage ${st.id} · ${esc(st.short)}</b><small>${esc(st.year)}</small></div>
          <span class="stage-score">${booksOf(st.id).filter(b => S.read.includes(b.id)).length}/${booksOf(st.id).length}</span>
        </header>
        <div class="shelf">${booksOf(st.id).map(b => {
          const can = bookOpen(b);
          const read = S.read.includes(b.id);
          return `<article class="tome${can ? '' : ' shut'}${read ? ' read' : ''}" ${can ? `data-book="${b.id}"` : ''}>
            <span class="tome-icon">${can ? b.icon : '🔒'}</span>
            <div class="tome-txt">
              <b>${esc(b.name)}</b>
              <small>${esc(b.teaches)}</small>
              <em>${can ? esc(b.where) : `Opens with lesson ${b.before}`}</em>
            </div>
            <span class="tome-end">${read ? '✓' : can ? '›' : ''}</span>
          </article>`;
        }).join('')}</div>
      </section>`;
    }).join('')}`;
}

// =============================================================== milbils ===

function paintMilbils(){
  const b = buddy();
  el.view.innerHTML = `
    <section class="lib-top card">
      <h2>👾 Milbils</h2>
      <p>Every milbil here has turned up in another game on this account. Buy one with XP and
        they will sit beside you in every lesson, where they help not one bit.</p>
      <div class="wearing">
        <div class="wearing-pic">${buddyHTML()}</div>
        <div><b>${esc(b.name)}</b><small>is sitting with you</small></div>
      </div>
      <div class="chips">
        <button type="button" class="chip go" data-open="shop">🛍️ The shop</button>
        <button type="button" class="chip" data-open="workshop">🔧 Build your own</button>
        <button type="button" class="chip" data-open="features">💡 Features</button>
      </div>
    </section>
    <section class="stage" style="--accent:var(--purple);--tint:var(--tint)">
      <header class="stage-top">
        <span class="stage-icon">🛍️</span>
        <div class="stage-txt"><b>The Milbil Shop</b><small>${fmt(S.xp)} XP to spend</small></div>
        <span class="stage-score">${S.owned.filter(id => MILBIL[id]).length}/${MILBILS.length}</span>
      </header>
      <div class="grid">${MILBILS.map(milbilCardHTML).join('')}</div>
    </section>
    ${S.custom ? `<section class="stage" style="--accent:var(--gold-d);--tint:var(--tint)">
      <header class="stage-top">
        <span class="stage-icon">🔧</span>
        <div class="stage-txt"><b>Your own milbil</b><small>Built in the workshop</small></div>
      </header>
      <div class="grid"><article class="buy owned${S.milbil === 'custom' ? ' on' : ''}">
        <div class="buy-pic">${drawLook(lookFromParts(S.custom.chosen), { title:S.custom.name })}</div>
        <b>${esc(S.custom.name)}</b><small>Yours, and nobody else's.</small>
        ${S.milbil === 'custom' ? '<span class="tagline">Sitting with you</span>'
          : '<button type="button" class="btn sm go" data-wear="custom">Choose</button>'}
      </article></div>
    </section>` : ''}`;
}

function milbilCardHTML(m){
  const owned = S.owned.includes(m.id);
  const on = S.milbil === m.id;
  const can = S.xp >= m.cost;
  return `<article class="buy${owned ? ' owned' : ''}${on ? ' on' : ''}">
    <div class="buy-pic">${m.art ? artHTML(m.art, m.name) : drawLook(m.look, { title:m.name })}</div>
    <b>${esc(m.name)}</b>
    <small>${esc(m.blurb)}</small>
    <em class="from">${esc(m.from)}</em>
    ${on ? '<span class="tagline">Sitting with you</span>'
      : owned ? `<button type="button" class="btn sm go" data-wear="${m.id}">Choose</button>`
      : `<button type="button" class="btn sm ${can ? 'go' : 'off'}" data-buy="${m.id}"${can ? '' : ' disabled'}>✨ ${fmt(m.cost)}</button>`}
  </article>`;
}

// ------------------------------------------------------------- workshop ---

function openWorkshop(){
  // Start from what you are wearing if you built it, else something plain.
  const chosen = { ...(S.custom?.chosen || { colour:'c-violet', hat:'h-none', eyes:'e-dots', mouth:'m-smile', extra:'x-none', badge:'b-none' }) };
  let name = S.custom?.name || '';
  let group = 'colour';

  const render = () => {
    const parts = PARTS.filter(p => p.group === group);
    return `
      <div class="wsp">
        <div class="wsp-stage">${drawLook(lookFromParts(chosen), { title:'your milbil' })}</div>
        <input id="wspName" class="in" maxlength="14" placeholder="Name your milbil" value="${esc(name)}">
      </div>
      <div class="chips wsp-groups">${PART_GROUPS.map(g =>
        `<button type="button" class="chip${g.id === group ? ' go' : ''}" data-act="group" data-id="${g.id}">${esc(g.name)}</button>`).join('')}</div>
      <div class="grid parts">${parts.map(p => {
        const owned = ownsPart(p.id);
        const on = chosen[p.group] === p.id;
        const can = S.xp >= p.cost;
        const preview = { ...chosen, [p.group]: p.id };
        return `<article class="buy part${owned ? ' owned' : ''}${on ? ' on' : ''}">
          <div class="buy-pic">${drawLook(lookFromParts(preview), { title:p.name })}</div>
          <b>${esc(p.name)}</b>
          ${owned ? (on ? '<span class="tagline">On</span>'
                        : `<button type="button" class="btn sm go" data-act="pick" data-id="${p.id}">Use</button>`)
                  : `<button type="button" class="btn sm ${can ? 'go' : 'off'}" data-act="buy" data-id="${p.id}"${can ? '' : ' disabled'}>✨ ${fmt(p.cost)}</button>`}
        </article>`;
      }).join('')}</div>
      <button type="button" class="btn go wide wsp-save" data-act="save">Save and wear it</button>`;
  };

  sheet.show({
    key:'workshop', cls:'wsp-sheet', icon:'🔧',
    title:'Milbil Workshop',
    sub: () => `${fmt(S.xp)} XP · ${S.parts.length} of ${PARTS.length} parts`,
    render,
    onAct: (act, id) => {
      // Keep whatever is typed in the name box across a re-render.
      const box = $('#wspName'); if (box) name = box.value;
      if (act === 'group'){ group = id; sfx('tap'); sheet.render(); return; }
      if (act === 'pick'){ chosen[PART[id].group] = id; sfx('tap'); sheet.render(); return; }
      if (act === 'buy'){
        const p = PART[id];
        if (!buyPart(id)) return sfx('nope');
        chosen[p.group] = id;
        sfx('buy'); buzz(20);
        toast(`🔧 <b>${esc(p.name)}</b> unlocked.`);
        paintHud(); sheet.render();
        return;
      }
      if (act === 'save'){
        saveCustom(name || 'My Milbil', chosen);
        sfx('unlock');
        toast(`🔧 <b>${esc(S.custom.name)}</b> built, and sitting with you.`);
        sheet.close();
        paintHud(); repaint();
      }
    },
  });
}

function openFeatures(){
  sheet.show({
    key:'features', cls:'shop-sheet', icon:'💡',
    title:'Features',
    sub: () => `${fmt(S.xp)} XP to spend`,
    tabs: FEATURE_GROUPS.map(g => ({ id:g.kind, label:g.name })),
    render: (kind) => {
      const g = FEATURE_GROUPS.find(x => x.kind === kind) || FEATURE_GROUPS[0];
      return `<p class="sheet-note">${esc(g.note)}</p>
        <div class="list">${FEATURES.filter(f => f.kind === g.kind).map(f => {
          const owned = has(f.id);
          const can = S.xp >= f.cost;
          const themed = (f.id === 'night' || f.id === 'board');
          const wearing = themed && S.theme === (f.id === 'night' ? 'night' : 'board');
          return `<article class="buy wide${owned ? ' owned' : ''}">
            <span class="buy-icon">${f.icon}</span>
            <div class="buy-txt"><b>${esc(f.name)}</b><small>${esc(f.blurb)}</small></div>
            ${owned
              ? (themed
                  ? `<button type="button" class="btn sm ${wearing ? 'off' : 'go'}" data-act="theme" data-id="${f.id}"${wearing ? ' disabled' : ''}>${wearing ? 'On' : 'Use it'}</button>`
                  : '<span class="tagline">Yours</span>')
              : `<button type="button" class="btn sm ${can ? 'go' : 'off'}" data-act="buy" data-id="${f.id}"${can ? '' : ' disabled'}>✨ ${fmt(f.cost)}</button>`}
          </article>`;
        }).join('')}</div>`;
    },
    onAct: (act, id, btn) => {
      if (act === 'theme'){ setTheme(id === 'night' ? 'night' : 'board'); sheet.render(); return; }
      if (act !== 'buy') return;
      const f = FEATURE[id];
      if (!buyFeature(id)) return sfx('nope');
      sfx('buy'); buzz(20);
      floatText(btn, `−${fmt(f.cost)}`);
      toast(`💡 <b>${esc(f.name)}</b> unlocked.`);
      if (f.id === 'confetti') confetti(40);
      applyTheme();
      paintHud(); sheet.render(); repaint();
    },
  });
}

// ================================================= lessons and the tests ===

function openLesson(stage, n){
  const l = getLesson(stage, n);
  if (!l || !lessonOpen(stage, n)) return;
  const replay = isDone(stage, n);
  const bk = bookBefore(stage, n);
  if (bk && !S.read.includes(bk.id) && !replay) return openBook(bk.id, () => runIt({ ...l, stage }, replay));
  runIt({ ...l, stage }, replay);
}

async function openTest(stage){
  if (!testOpen(stage) || !stageOpen(stage)) return;
  const test = getTest(stage);
  const again = testPassed(stage);
  const out = await card(`
    <h3>📝 ${esc(test.name)}</h3>
    <p>${test.qs.length} questions on everything in <b>${esc(test.sub)}</b>, asked a bit harder
      than the lessons did.</p>
    <ul class="tally">
      <li><b>One go</b> at each question</li>
      <li>Scratch pad only — no hints, no poster</li>
      <li><b>${PASS_WRONG} wrong is still a pass.</b> More than that and all twenty lessons of
        Stage ${stage} open up again and have to be done over.</li>
    </ul>
    ${again ? '<p class="muted">You have already passed this one, so nothing can go wrong and nothing is paid.</p>' : ''}`,
    [{ label:'Not yet', cls:'ghost', value:'no' }, { label:'Start the test', cls:'go', value:'go' }]);
  if (out !== 'go') return;
  runIt(test, again);
}

function runIt(what, replay){
  sheet.close();
  clock?.play();
  startLearning();
  running = new Lesson(el.lesson, what, {
    replay,
    onXp: gainedXp,
    onQuit: () => { running?.destroy(); running = null; stopLearning(); paintHud(); repaint(); },
    onTool: openTool,
    onFinish: (res) => { running?.destroy(); running = null; stopLearning(); showResult(what, res); },
  });
}

// ================================================================ results ===

function showResult(what, res){
  el.result.hidden = false;
  el.result.innerHTML = res.isTest ? testResultHTML(what, res) : lessonResultHTML(what, res);
  paintHud();

  el.result.onclick = (e) => {
    const b = e.target.closest('[data-r]');
    if (!b) return;
    const act = b.dataset.r;
    el.result.hidden = true;
    el.result.onclick = null;
    repaint();
    if (act === 'again') return what.isTest ? openTest(what.stage) : openLesson(what.stage, what.n);
    if (act === 'next') return openLesson(what.stage, what.n + 1);
    if (act === 'test') return openTest(what.stage);
    if (act === 'stage') return openLesson(what.stage + 1, 1);
  };
}

function lessonResultHTML(l, res){
  const st = STAGE[l.stage];
  const stars = '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars);
  const nextL = st.lessons.find(x => x.n === l.n + 1);
  const toTest = !nextL && testOpen(l.stage) && !testPassed(l.stage);

  if (res.failed) return `
    <div class="result-card card fail" style="--accent:${st.colour};--tint:${st.tint}">
      <div class="result-stars">☆☆☆</div>
      <h2>Not this time</h2>
      <p class="result-sub">${esc(l.name)}</p>
      <div class="result-buddy">${buddyHTML()}</div>
      <ul class="tally">
        <li><b>${res.clean}/${res.of}</b> right first go</li>
        <li><b>${res.wrong}</b> wrong — three or more is no stars</li>
      </ul>
      <p class="result-why">No stars means the lesson does not count yet, so it stays open and
        so does everything behind it. Read the explanations, have another go, and two wrong
        will do it.</p>
      <div class="result-btns">
        <button type="button" class="btn ghost" data-r="map">The map</button>
        <button type="button" class="btn go" data-r="again">Try it again →</button>
      </div>
    </div>`;

  return `
    <div class="result-card card" style="--accent:${st.colour};--tint:${st.tint}">
      <div class="result-stars">${stars}</div>
      <h2>${res.replay ? 'Done again' : res.perfect ? 'Every single one!' : 'Lesson finished'}</h2>
      <p class="result-sub">${esc(l.name)}</p>
      <div class="result-buddy">${buddyHTML()}</div>
      <ul class="tally">
        <li><b>${res.clean}/${res.of}</b> right first go</li>
        <li><b>${res.stars}</b> ${res.stars === 1 ? 'star' : 'stars'} out of 3</li>
        <li><b>${res.replay ? '0' : '+' + fmt(res.earned)}</b> XP ${res.replay ? '— you had already done this one' : 'earned'}</li>
      </ul>
      ${res.replay ? '' : `<p class="result-why">${res.perfect
        ? `All ${res.of} first time, so that's the ${XP.perfect} XP bonus as well.`
        : 'Go back over it any time — the stars can still go up, even though the XP cannot.'}</p>`}
      ${toTest ? `<p class="result-unlock">📝 <b>That's all twenty lessons.</b> The Stage ${l.stage} test is open.</p>` : ''}
      <div class="result-btns">
        <button type="button" class="btn ghost" data-r="map">The map</button>
        ${toTest ? '<button type="button" class="btn go" data-r="test">Sit the test →</button>'
          : nextL && lessonOpen(l.stage, nextL.n) ? '<button type="button" class="btn go" data-r="next">Next lesson →</button>'
          : '<button type="button" class="btn go" data-r="map">Back to the map</button>'}
      </div>
    </div>`;
}

function testResultHTML(test, res){
  const st = STAGE[test.stage];
  const nextStage = STAGE[test.stage + 1];

  if (!res.passed) return `
    <div class="result-card card fail" style="--accent:${st.colour};--tint:${st.tint}">
      <div class="result-stars">📝</div>
      <h2>Not a pass</h2>
      <p class="result-sub">${esc(test.name)}</p>
      <div class="result-buddy">${buddyHTML()}</div>
      <ul class="tally">
        <li><b>${res.right}/${res.of}</b> right</li>
        <li><b>${res.wrong}</b> wrong — more than ${PASS_WRONG} is a fail</li>
        <li><b>${fmt(res.paid)}</b> XP, and you keep every bit of it</li>
      </ul>
      <p class="result-why">All twenty lessons of Stage ${test.stage} have opened up again. Work
        back through them — they pay no XP the second time, but the stars still count, and the
        test will be waiting at the end.</p>
      <div class="result-btns">
        <button type="button" class="btn go wide" data-r="map">Back to Stage ${test.stage}</button>
      </div>
    </div>`;

  return `
    <div class="result-card card" style="--accent:${st.colour};--tint:${st.tint}">
      <div class="result-stars">🏅</div>
      <h2>${res.replay ? 'Passed again' : 'Passed!'}</h2>
      <p class="result-sub">${esc(test.name)}</p>
      <div class="result-buddy">${buddyHTML()}</div>
      <ul class="tally">
        <li><b>${res.right}/${res.of}</b> right</li>
        <li><b>${res.wrong}</b> wrong, and ${PASS_WRONG} was the limit</li>
        <li><b>${res.replay ? '0' : '+' + fmt(res.earned)}</b> XP ${res.replay ? '— already passed' : 'earned'}</li>
      </ul>
      ${nextStage ? `<p class="result-unlock">🔓 <b>Stage ${nextStage.id} is open.</b> ${esc(nextStage.name)}.</p>`
        : '<p class="result-unlock">🏆 <b>That is the whole of MilMATHS.</b> Four stages, forty lessons, four tests.</p>'}
      <div class="result-btns">
        <button type="button" class="btn ghost" data-r="map">The map</button>
        ${nextStage ? `<button type="button" class="btn go" data-r="stage">Start Stage ${nextStage.id} →</button>`
          : '<button type="button" class="btn go" data-r="map">Back to the map</button>'}
      </div>
    </div>`;
}

// ========================================================== comic reader ===

function openBook(id, after){
  const bk = getBook(id);
  if (!bk || !bookOpen(bk)) return;
  sheet.close();
  clock?.play();
  startLearning();
  let page = 0;
  const first = !S.read.includes(bk.id);
  const st = STAGE[bk.stage];

  const draw = () => {
    const last = page + 1 >= bk.pages.length;
    el.reader.innerHTML = `
      <div class="bookpage" style="--accent:${st.colour};--tint:${st.tint}">
        <header class="lsn-top">
          <button type="button" class="round sm" data-b="close" aria-label="Close the comic">✕</button>
          <div class="lsn-title"><b>${esc(bk.name)}</b><small>${esc(bk.teaches)} · ${esc(bk.where)}</small></div>
          <div class="lsn-count">${page + 1} / ${bk.pages.length}</div>
        </header>
        <div class="bookpage-body"><div class="comic card">${pageHTML(bk.pages[page])}</div></div>
        <footer class="lsn-bar row-bar">
          <button type="button" class="btn ghost" data-b="back" ${page ? '' : 'disabled'}>← Back</button>
          <div class="pips">${bk.pages.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>
          <button type="button" class="btn go" data-b="${last ? 'done' : 'fwd'}">${last ? (after ? 'Start the lesson →' : 'Finished') : 'Next →'}</button>
        </footer>
      </div>`;
  };

  el.reader.hidden = false;
  draw();
  el.reader.onclick = (e) => {
    const b = e.target.closest('[data-b]');
    if (!b || b.disabled) return;
    const act = b.dataset.b;
    if (act === 'fwd' || act === 'back'){
      page += act === 'fwd' ? 1 : -1;
      sfx('page'); draw();
      el.reader.querySelector('.bookpage-body').scrollTop = 0;
      return;
    }
    el.reader.hidden = true;
    el.reader.onclick = null;
    stopLearning();
    if (act === 'done' && first){
      const paid = readBook(bk.id);
      if (paid){ gainedXp(); toast(`📚 Comic read. <b>+${paid} XP</b>`); sfx('xp'); }
    }
    paintHud();
    repaint();
    if (act === 'done' && after) after();
  };
}

// ================================================================= sheets ===

function openMe(){
  sheet.show({
    key:'me', icon: () => buddyHTML('tiny'),
    title: () => esc(S.name || 'You'),
    sub: () => { const r = rank(); const n = toNextRank();
      return `${r.icon} ${r.name}${n ? ` · ${fmt(n.need)} XP to ${esc(n.name)}` : ' · the top rank'}`; },
    render: () => {
      const c = counts();
      const cur = current();
      const t = S.log;
      return `
      <div class="stat-row">
        <div class="stat"><b>${fmt(S.xp)}</b><small>XP to spend</small></div>
        <div class="stat"><b>${fmt(S.total)}</b><small>XP ever earned</small></div>
        <div class="stat"><b>${c.stars}</b><small>of ${c.starsOf} stars</small></div>
      </div>
      <h4 class="sheet-h">Today</h4>
      <ul class="tally flat">
        <li><b>${todayMinutes()}</b> minutes of maths (out of a ${SCALE_MINUTES} minute scale)</li>
        <li><b>${t.questions}</b> questions answered, <b>${t.right}</b> right</li>
        <li><b>${fmt(t.xp)}</b> XP earned</li>
      </ul>
      <h4 class="sheet-h">All time</h4>
      <ul class="tally flat">
        <li><b>${fmt(totalMinutes())}</b> minutes of maths</li>
        <li><b>${S.days}</b> ${S.days === 1 ? 'day' : 'days'} you have turned up</li>
        <li><b>${c.tests}</b> of ${c.testsOf} stage tests passed</li>
        <li><b>${c.books}</b> of ${c.booksOf} comics read</li>
      </ul>
      <h4 class="sheet-h">Where you are</h4>
      <p class="sheet-note">${
        cur.kind === 'done' ? 'Everything in MilMATHS is finished. That is the lot.'
        : cur.kind === 'test' ? `The <b>Stage ${cur.stage} test</b>. All twenty lessons are behind you.`
        : `Stage ${cur.stage}, lesson ${cur.n} — <b>${esc(cur.lesson.name)}</b>.`}</p>
      <div class="bars">${STAGES.map(st => {
        const done = lessonsDone(st.id), of = st.lessons.length;
        return `<div class="bar-row"><span>${st.icon} Stage ${st.id}</span>
          <span class="bar"><i style="width:${(done / of) * 100}%;background:${st.colour}"></i></span>
          <b>${testPassed(st.id) ? '🏅' : `${done}/${of}`}</b></div>`;
      }).join('')}</div>
      <h4 class="sheet-h">Ranks</h4>
      <div class="list tight">${RANKS.map(r => `<article class="buy wide${S.total >= r.at ? '' : ' shut'}">
        <span class="buy-icon">${S.total >= r.at ? r.icon : '🔒'}</span>
        <div class="buy-txt"><b>${esc(r.name)}</b><small>${r.at === 0 ? 'From the very start' : `${fmt(r.at)} XP ever earned`}</small></div>
      </article>`).join('')}</div>`;
    },
  });
}

function openDaySheet(){
  const rec = recommend(new Date(), { state:S.state, birthday:S.birthday });
  const shape = rec.shape;
  const choices = [5, 10, 15, 20, 25, 30];
  sheet.show({
    key:'day', cls:'day-sheet', icon: rec.icon,
    title:'Today',
    sub: () => dayLine(new Date(), { state:S.state, birthday:S.birthday }),
    render: () => {
      const c = S.clock;
      const nh = nextHoliday(new Date(), S.state);
      return `
      <div class="rec">
        <b class="rec-mins">${rec.title}</b>
        <p>${esc(rec.why)}</p>
        <small class="muted">MilMATHS works this out from the day, the time and ${esc(STATES.find(s => s.id === S.state)?.name || S.state)}'s
          public holidays. School term dates move about, so take it as a suggestion.</small>
      </div>
      ${c.set ? `
        <div class="timer-now${c.left <= 0 ? ' out' : ''}">
          <b>${c.left > 0 ? mmss(c.left) : "Time's up"}</b>
          <small>${c.left > 0 ? `left of the ${Math.round(c.set / 60)} minutes you set${c.added ? ` (${c.added} added)` : ''}`
            : `you set ${Math.round(c.set / 60)} minutes and used them all`}</small>
          <div class="timer-btns">
            ${c.left > 0 ? `<button type="button" class="btn sm ghost" data-act="hold">${clock?.paused ? '▶ Carry on' : '⏸ Pause'}</button>` : ''}
            <button type="button" class="btn sm ghost" data-act="plus">+5 min</button>
            <button type="button" class="btn sm ghost" data-act="clear">Clear it</button>
          </div>
        </div>` : `
        <p class="sheet-note">Set yourself a time and MilMATHS counts it down. It runs wherever
          you are in the game, shop included, because it is measuring how long you have been
          sitting here. It never stops you doing anything.</p>`}
      <h4 class="sheet-h">${c.set ? 'Start again with' : 'Set the timer'}</h4>
      <div class="chips">
        ${rec.minutes ? `<button type="button" class="chip go" data-act="set" data-id="${rec.minutes}">${rec.icon} ${rec.minutes} min — today's</button>` : ''}
        ${choices.filter(m => m !== rec.minutes).map(m => `<button type="button" class="chip" data-act="set" data-id="${m}">${m} min</button>`).join('')}
      </div>
      <h4 class="sheet-h">Time actually spent on maths</h4>
      <div class="scale big">
        <i class="scale-fill" style="width:${(scalePos() * 100).toFixed(2)}%"></i>
        ${rec.minutes ? `<i class="scale-mark" style="left:${Math.min(100, rec.minutes / SCALE_MINUTES * 100).toFixed(2)}%"></i>` : ''}
      </div>
      <div class="scale-ends"><span>0</span><span>${SCALE_MINUTES} min</span></div>
      <p class="sheet-note"><b>${todayMinutes()} minutes</b> today, counting lessons, tests and
        comics only. The shop and this screen do not count.</p>
      <h4 class="sheet-h">What sort of day it is</h4>
      <ul class="tally flat">
        <li><b>${shape.dayName}</b>${shape.weekend ? ', so no school' : ''}</li>
        ${shape.holiday ? `<li>🎈 <b>${esc(shape.holiday.name)}</b> — a public holiday in ${esc(S.state)}</li>` : ''}
        ${shape.special ? `<li>${shape.special.icon} <b>${esc(shape.special.name)}</b></li>` : ''}
        ${shape.brk ? `<li>🏖️ About the middle of <b>${esc(shape.brk)}</b></li>` : ''}
        ${!shape.holiday && !shape.brk && !shape.weekend ? '<li>🎒 A school day in term time</li>' : ''}
        ${nh ? `<li>📅 Next public holiday: <b>${esc(nh.name)}</b>, ${nh.date.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long' })}</li>` : ''}
      </ul>`;
    },
    onAct: (act, id) => {
      if (act === 'set'){ useClock(+id); sheet.render(); toast(`⏱️ ${id} minutes on the clock.`); sfx('tap'); return; }
      if (act === 'plus'){ extendClock(5); sheet.render(); return; }
      if (act === 'hold'){ clock.toggle(); paintClock(); sheet.render(); return; }
      if (act === 'clear'){ useClock(0); sheet.render(); }
    },
  });
}

function openSettings(){
  sheet.show({
    key:'set', icon:'⚙️', title:'Settings', sub:'Name, state, theme',
    render: () => `
      <h4 class="sheet-h">Your name</h4>
      <div class="set-row">
        <input id="setName" class="in" maxlength="14" value="${esc(S.name)}" autocomplete="off" spellcheck="false">
        <button type="button" class="btn sm go" data-act="name">Save</button>
      </div>
      <h4 class="sheet-h">Where you live</h4>
      <p class="sheet-note">Public holidays are different in every state, and they change what
        MilMATHS suggests for the day.</p>
      <div class="set-row">
        <select id="setState" class="in">${STATES.map(s =>
          `<option value="${s.id}"${s.id === S.state ? ' selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <button type="button" class="btn sm go" data-act="state">Save</button>
      </div>
      <h4 class="sheet-h">Your birthday</h4>
      <p class="sheet-note">MilMATHS gives you the day off. Leave it blank if you would rather not say.</p>
      <div class="set-row">
        <input id="setBday" class="in" type="date" value="${S.birthday ? `2000-${String(S.birthday.m).padStart(2,'0')}-${String(S.birthday.d).padStart(2,'0')}` : ''}">
        <button type="button" class="btn sm go" data-act="bday">Save</button>
      </div>
      <h4 class="sheet-h">Theme</h4>
      <div class="chips">
        <button type="button" class="chip${S.theme === 'day' ? ' go' : ''}" data-act="theme" data-id="day">☀️ Daytime</button>
        <button type="button" class="chip${S.theme === 'night' ? ' go' : ''}${has('night') ? '' : ' shut'}" data-act="theme" data-id="night">🌙 Night${has('night') ? '' : ' 🔒'}</button>
        <button type="button" class="chip${S.theme === 'board' ? ' go' : ''}${has('board') ? '' : ' shut'}" data-act="theme" data-id="board">🟩 Blackboard${has('board') ? '' : ' 🔒'}</button>
      </div>
      <h4 class="sheet-h">Sound</h4>
      <div class="chips">
        <button type="button" class="chip${S.sound ? ' go' : ''}" data-act="sound">${S.sound ? '🔊 Sound on' : '🔇 Sound off'}</button>
      </div>
      <h4 class="sheet-h">Starting again</h4>
      <p class="sheet-note">This wipes every lesson, test, star and XP, and puts you back
        at Stage 1 lesson 1. Your name and your state stay.</p>
      <div class="chips"><button type="button" class="chip danger" data-act="wipe">Start MilMATHS again</button></div>`,
    onAct: async (act, id) => {
      if (act === 'name'){
        const v = $('#setName').value.trim().slice(0, 14);
        if (v){ S.name = v; saveNow(); paintHud(); toast('Saved.'); }
        return;
      }
      if (act === 'state'){ S.state = $('#setState').value; saveNow(); toast('Saved.'); sheet.render(); return; }
      if (act === 'bday'){
        const v = $('#setBday').value;
        S.birthday = v ? { m: +v.slice(5, 7), d: +v.slice(8, 10) } : null;
        saveNow(); toast(S.birthday ? '🎂 Saved.' : 'Cleared.');
        return;
      }
      if (act === 'theme'){
        if (id !== 'day' && !has(id)) return toast(`🔒 ${id === 'night' ? 'Night Mode' : 'The Blackboard theme'} is in Features.`);
        setTheme(id); sheet.render(); return;
      }
      if (act === 'sound'){ S.sound = !S.sound; setSound(S.sound); setBuzz(S.sound); saveNow(); sheet.render(); if (S.sound) sfx('right'); return; }
      if (act === 'wipe'){
        const out = await card(`<h3>Start MilMATHS again?</h3>
          <p>Every lesson, test, star, comic and XP goes. There is no undoing it.</p>`,
          [{ label:'Keep my progress', cls:'go' }, { label:'Wipe it', cls:'danger', value:'yes' }]);
        if (out === 'yes'){ wipe(); sheet.close(); paintHud(); setTab('home'); toast('Back to the beginning.'); }
      }
    },
  });
}

function openHelp(){
  sheet.show({
    key:'help', icon:'❓', title:'How MilMATHS works', sub:'The whole thing on one page',
    render: () => `
      <h4 class="sheet-h">Four stages, four tests</h4>
      <p class="sheet-note">Each stage is a harder slice of the Australian Curriculum than the
        one before. Twenty lessons with a comic in front of every other one, then a test — and
        you cannot touch the next stage until you
        pass that test.</p>
      <div class="list tight">${STAGES.map(st => `<article class="buy wide${stageOpen(st.id) ? '' : ' shut'}">
        <span class="buy-icon">${stageOpen(st.id) ? st.icon : '🔒'}</span>
        <div class="buy-txt"><b>Stage ${st.id} · ${esc(st.name)}</b><small>${esc(st.year)}</small></div>
      </article>`).join('')}</div>
      <h4 class="sheet-h">Stars</h4>
      <ul class="tally flat">
        <li>★★★ <b>everything</b> right first go</li>
        <li>★★ <b>one</b> wrong</li>
        <li>★ <b>two</b> wrong</li>
        <li>no stars — <b>three or more</b> wrong, and the lesson does not count. It stays open
          and so does everything behind it until you come back and do better.</li>
      </ul>
      <h4 class="sheet-h">The stage test</h4>
      <p class="sheet-note">Twelve to fifteen questions, one go each, scratch pad only. <b>More than
        ${PASS_WRONG} wrong and all twenty lessons of that stage open up again</b> and have to be
        done over. Your XP, your comics and anything you have bought are never touched.</p>
      <h4 class="sheet-h">XP</h4>
      <ul class="tally flat">
        <li><b>+${XP.first}</b> right first go · <b>+${XP.second}</b> right second go · <b>+${XP.shown}</b> wrong twice</li>
        <li><b>+${XP.lesson}</b> finishing a lesson, <b>+${XP.perfect}</b> more if it was all first go</li>
        <li><b>+${XP.book}</b> reading a comic for the first time</li>
        <li><b>+${XP.test}</b> per right answer in a test, <b>+${XP.passed}</b> for passing it</li>
      </ul>
      <p class="sheet-note">Spending never costs you a rank: your rank goes on every XP you
        have <i>ever</i> earned, and that number only goes up.</p>
      <h4 class="sheet-h">The clock, and the scale</h4>
      <p class="sheet-note">Tap ⏱ to set how long you are here for today. That countdown runs
        <b>everywhere</b>, shop included. The 0–${SCALE_MINUTES} minute scale on the Home tab is
        different: it only counts time in a lesson, a test or a comic.</p>
      <h4 class="sheet-h">The three tabs</h4>
      <ul class="tally flat">
        <li>🏠 <b>Home</b> — your stage, and the lesson you are on</li>
        <li>📚 <b>Library</b> — all forty comics, readable any time</li>
        <li>👾 <b>Milbils</b> — the shop, the workshop and the features</li>
      </ul>`,
  });
}

// ========================================================= lesson gadgets ===

function openTool(which){
  if (which === 'scratch') return openScratch();
  if (which === 'numberline') return openNumberLine();
  if (which === 'poster') return openPoster();
}

function openPoster(){
  sheet.show({
    key:'poster', icon:'🧾', title:'Times Table Poster', sub:'Looking is allowed',
    cls:'poster-sheet',
    render: () => `<table class="times"><tbody>
      ${Array.from({ length: 13 }, (_, r) => `<tr>${Array.from({ length: 13 }, (_, c) =>
        r === 0 && c === 0 ? '<th>×</th>'
        : r === 0 ? `<th>${c}</th>`
        : c === 0 ? `<th>${r}</th>`
        : `<td class="${r === c ? 'diag' : ''}">${r * c}</td>`).join('')}</tr>`).join('')}
    </tbody></table>`,
  });
}

function openNumberLine(){
  sheet.show({
    key:'numberline', icon:'📏', title:'Number Line', sub:'−10 up to 20',
    cls:'nl-sheet',
    render: () => `<div class="nl">${Array.from({ length: 31 }, (_, i) => {
      const n = i - 10;
      return `<span class="nl-tick${n === 0 ? ' zero' : ''}${n < 0 ? ' neg' : ''}"><i></i><b>${n}</b></span>`;
    }).join('')}</div>
    <p class="sheet-note">Counting forwards goes right, counting back goes left. Crossing the
      nought is just carrying on in the same direction.</p>`,
  });
}

function openScratch(){
  sheet.show({
    key:'scratch', icon:'✏️', title:'Scratch Pad', sub:'Work it out here',
    cls:'scratch-sheet',
    render: () => `<canvas id="pad" width="640" height="420"></canvas>
      <div class="chips"><button type="button" class="chip" data-act="wipe">🧽 Wipe it clean</button></div>`,
    onAct: (act) => { if (act === 'wipe'){ wipePad(); sfx('tap'); } },
  });
  setTimeout(wirePad, 30);
}

let padCtx = null;
function wipePad(){
  const c = $('#pad');
  if (!c) return;
  padCtx = c.getContext('2d');
  padCtx.clearRect(0, 0, c.width, c.height);
}

function wirePad(){
  const c = $('#pad');
  if (!c) return;
  padCtx = c.getContext('2d');
  padCtx.lineWidth = 4;
  padCtx.lineCap = padCtx.lineJoin = 'round';
  let drawing = false;
  const at = (e) => {
    const r = c.getBoundingClientRect();
    return [(e.clientX - r.left) * (c.width / r.width), (e.clientY - r.top) * (c.height / r.height)];
  };
  c.onpointerdown = (e) => {
    drawing = true;
    c.setPointerCapture(e.pointerId);
    padCtx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--ink').trim() || '#2f2640';
    padCtx.beginPath();
    padCtx.moveTo(...at(e));
    e.preventDefault();
  };
  c.onpointermove = (e) => { if (drawing){ padCtx.lineTo(...at(e)); padCtx.stroke(); e.preventDefault(); } };
  c.onpointerup = c.onpointercancel = () => { drawing = false; };
}

// ================================================================= themes ===

function setTheme(name){
  S.theme = name;
  saveNow();
  applyTheme();
  sfx('tap');
}

function applyTheme(){
  document.body.dataset.theme = S.theme;
  const colour = { day:'#dbe7ff', night:'#141424', board:'#17392b' }[S.theme] || '#dbe7ff';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', colour);
}

// ================================================================ welcome ===

function showWelcome(){
  el.welcome.hidden = false;
  $('#welcomeMilbil').innerHTML = drawLook({ line:'#2f80ed', eyes:'happy' }, { title:'A milbil' });
  const sel = $('#stateInput');
  sel.innerHTML = STATES.map(s => `<option value="${s.id}"${s.id === S.state ? ' selected' : ''}>${esc(s.name)}</option>`).join('');
  const input = $('#nameInput');
  input.value = S.name || '';
  $('#nameDice').onclick = () => { input.value = NAMES[Math.floor(Math.random() * NAMES.length)]; sfx('tap'); };
  $('#startBtn').onclick = () => {
    S.name = (input.value.trim() || 'You').slice(0, 14);
    S.state = sel.value;
    S.started = true;
    saveNow();
    el.welcome.hidden = true;
    sfx('unlock');
    paintHud();
    setTab('home');
    setTimeout(() => askTheDay(), 400);
  };
}

// =================================================================== boot ===

function boot(){
  for (const [k, id] of Object.entries({
    view:'view', tabbar:'tabbar', lesson:'lesson', reader:'reader', result:'result', welcome:'welcome',
    avatar:'meAvatar', name:'meName', rank:'meRank', xp:'xpNum', xpPill:'xpPill',
    clockPill:'clockPill', clockNum:'clockNum', libBadge:'libBadge', milBadge:'milBadge',
  })) el[k] = document.getElementById(id);

  load();
  setSound(S.sound);
  setBuzz(S.sound);
  applyTheme();
  sheet = new Sheet($('#sheet'));

  $('#meBtn').onclick = openMe;
  $('#xpPill').onclick = () => setTab('milbils');
  $('#clockPill').onclick = () => openDaySheet();
  $('#dayBtn').onclick = () => openDaySheet();
  $('#helpBtn').onclick = openHelp;
  $('#setBtn').onclick = openSettings;

  el.tabbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    sfx('tap');
    setTab(b.dataset.tab);
  });

  el.view.addEventListener('click', (e) => {
    const hit = e.target.closest('[data-lesson],[data-test],[data-book],[data-buy],[data-wear],[data-open]');
    if (!hit) return;
    const d = hit.dataset;
    if (d.open){ sfx('tap'); return d.open === 'workshop' ? openWorkshop() : d.open === 'features' ? openFeatures() : el.view.scrollTo({ top: 260, behavior:'smooth' }); }
    if (d.wear){ wear(d.wear); sfx('tap'); paintHud(); repaint(); return; }
    if (d.buy){
      const m = MILBIL[d.buy];
      if (!buyMilbil(d.buy)) return sfx('nope');
      sfx('buy'); buzz(20);
      floatText(hit, `−${fmt(m.cost)}`);
      toast(`🛍️ <b>${esc(m.name)}</b> is yours, and sitting with you.`);
      paintHud(); repaint();
      return;
    }
    sfx('tap');
    if (d.book) return openBook(d.book);
    if (d.test) return openTest(+d.test);
    const [stage, n] = d.lesson.split('-').map(Number);
    openLesson(stage, n);
  });

  // A day can roll over while the tab is left open overnight.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return saveNow();
    const was = S.clock.date;
    rollOver();
    if (S.clock.date !== was){ clock.stop(); paintClock(); repaint(); toast('☀️ A new day — the clock has been reset.'); }
  });
  addEventListener('pagehide', saveNow);

  paintHud();
  setTab(S.tab, { remember: false });
  startClock();

  if (!S.started) return showWelcome();
  if (lapsedDays >= LAPSE_DAYS) lapseNotice().then(() => askTheDay());
  else if (!S.clock.chosen) setTimeout(() => askTheDay(), 600);
}

boot();
