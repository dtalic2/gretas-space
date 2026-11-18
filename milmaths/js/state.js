// ---------- Everything MilMATHS remembers ----------
//
// One object, S, saved into localStorage whenever anything changes. It holds
// who you are, what you have unlocked, what you own, and today's clock — so
// shutting the laptop in the middle of lesson 6 loses nothing but the lesson.
//
// Two separate XP numbers are worth understanding:
//
//   S.xp     what is in your pocket. Buying things takes it away.
//   S.total  every XP you have ever earned. Nothing ever takes it away, so
//            your rank can only go up, no matter how much you spend.
//
// And two separate clocks:
//
//   S.clock  the countdown you set yourself. It runs wherever you are in the
//            game, including the shop, because it is measuring how long you
//            have been sitting here.
//   S.log.secs  how long you have actually spent *learning* — in a lesson, a
//            test or a book. Time in the shop does not count towards it.

import { STAGES, STAGE, ALL_LESSONS, lessonKey, getLesson, getTest, testKey, PASS_WRONG } from './curriculum.js';
import { ALL_BOOKS, getBook, bookBefore, booksOf } from './books.js';
import { MILBIL, FEATURE, PART, FREE_PARTS, lookFromParts, rankFor, nextRank } from './shop.js';
import { ymd } from './clock.js';

const KEY = 'milmaths-v1';

// What a question is worth. See README for where these numbers came from.
export const XP = {
  first:   10,   // right, first go
  second:   4,   // right, after a wrong one
  shown:    2,   // wrong twice, so the game showed you — you still turned up
  lesson:  20,   // finishing a lesson you had not finished before
  perfect: 30,   // ...on top, if every question was right first go
  book:    15,   // reading a book for the first time
  streak:   2,   // extra per question on a 3+ run, if you own the Streak Bonus
  test:    10,   // per right answer in a stage test
  passed: 150,   // ...plus this for passing one for the first time
};

/** The time-spent gauge runs from nothing to five hours. */
export const SCALE_MINUTES = 300;

/** Days away before MilMATHS says something about it. */
export const LAPSE_DAYS = 2;

const fresh = () => ({
  started: false,
  name: '',
  milbil: 'common',        // who sits beside you
  owned: ['common'],       // milbils you have bought
  features: [],            // features you have bought
  parts: [...FREE_PARTS],  // workshop parts you have bought
  custom: null,            // { name, chosen } — the milbil you built yourself
  theme: 'day',            // 'day' | 'night' | 'board'
  tab: 'home',             // home | library | milbils
  xp: 0,
  total: 0,
  done: {},                // lessonKey -> { stars, clean, of, wrong, at }
  tests: {},               // testKey   -> { passed, wrong, of, best, at }
  read: [],                // book ids you have opened
  state: 'NSW',            // which state's public holidays to use
  birthday: null,          // { m, d }
  sound: true,
  clock: null,             // today's countdown, see freshClock()
  log: null,               // today's tally, see freshLog()
  totalSecs: 0,            // learning seconds, all time
  days: 0,                 // days you have turned up at all
  lastPlayed: null,        // 'YYYY-MM-DD' of the last day you were here
});

const freshClock = (date) => ({ date, set:0, left:0, running:false, chosen:false, added:0 });
const freshLog = (date) => ({ date, questions:0, right:0, xp:0, lessons:0, secs:0 });

export const S = fresh();

/** Set after load() if you have been away a while, for main.js to mention. */
export let lapsedDays = 0;

export function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, fresh(), JSON.parse(raw));
  } catch {}

  // Anything could be in there — an old save, or a half-written one. Put it
  // back into shape rather than trusting it.
  S.xp = Math.max(0, Math.round(Number(S.xp) || 0));
  S.total = Math.max(S.xp, Math.round(Number(S.total) || 0));
  S.totalSecs = Math.max(0, Math.round(Number(S.totalSecs) || 0));
  S.owned = [...new Set(['common', ...(Array.isArray(S.owned) ? S.owned : []).filter(id => MILBIL[id] || id === 'custom')])];
  S.features = [...new Set((Array.isArray(S.features) ? S.features : []).filter(id => FEATURE[id]))];
  S.parts = [...new Set([...FREE_PARTS, ...(Array.isArray(S.parts) ? S.parts : []).filter(id => PART[id])])];
  if (S.custom && typeof S.custom === 'object'){
    S.custom.chosen = Object.fromEntries(Object.entries(S.custom.chosen || {}).filter(([, v]) => PART[v]));
    S.custom.name = String(S.custom.name || 'My Milbil').slice(0, 14);
  } else S.custom = null;
  if (!S.owned.includes(S.milbil) || (S.milbil === 'custom' && !S.custom)) S.milbil = 'common';
  S.read = [...new Set((Array.isArray(S.read) ? S.read : []).filter(id => getBook(id)))];
  S.done = (S.done && typeof S.done === 'object') ? S.done : {};
  for (const k of Object.keys(S.done)) if (!ALL_LESSONS.some(l => lessonKey(l.stage, l.n) === k)) delete S.done[k];
  S.tests = (S.tests && typeof S.tests === 'object') ? S.tests : {};
  for (const k of Object.keys(S.tests)) if (![1, 2, 3, 4].some(n => testKey(n) === k)) delete S.tests[k];
  if (!['day', 'night', 'board'].includes(S.theme)) S.theme = 'day';
  if (S.theme === 'night' && !has('night')) S.theme = 'day';
  if (S.theme === 'board' && !has('board')) S.theme = 'day';
  if (!['home', 'library', 'milbils'].includes(S.tab)) S.tab = 'home';

  const today = ymd(new Date());
  lapsedDays = S.lastPlayed && S.lastPlayed !== today ? daysBetween(S.lastPlayed, today) : 0;
  rollOver();
}

/** Whole days from one yyyy-mm-dd to another. */
export function daysBetween(a, b){
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** A new day wipes the clock and the tally, and counts as turning up. */
export function rollOver(){
  const today = ymd(new Date());
  if (!S.clock || S.clock.date !== today) S.clock = freshClock(today);
  if (!S.log || S.log.date !== today) S.log = freshLog(today);
  if (S.lastPlayed !== today){ S.lastPlayed = today; S.days = (S.days | 0) + 1; }
}

let pending = null;
export function save(){
  // Called on every tick of the countdown, so coalesce.
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
  }, 120);
}
export function saveNow(){
  clearTimeout(pending); pending = null;
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {}
}

export function wipe(){
  const keep = { name:S.name, state:S.state, birthday:S.birthday, sound:S.sound };
  Object.assign(S, fresh(), keep, { started:true });
  rollOver();
  saveNow();
}

// ------------------------------------------------------------------ you ---

export const has = (featureId) => S.features.includes(featureId);
export const ownsPart = (id) => S.parts.includes(id);

/** The milbil sitting with you — one from the shop, or the one you built. */
export function buddy(){
  if (S.milbil === 'custom' && S.custom){
    return { id:'custom', name: S.custom.name, look: lookFromParts(S.custom.chosen) };
  }
  return MILBIL[S.milbil] || MILBIL.common;
}

export const rank = () => rankFor(S.total);
export const toNextRank = () => {
  const n = nextRank(S.total);
  return n ? { ...n, need: n.at - S.total } : null;
};
export const fmt = (n) => Math.round(n).toLocaleString('en-AU');

// ------------------------------------------------------------- progress ---

export const record = (stage, n) => S.done[lessonKey(stage, n)] || null;
export const isDone = (stage, n) => !!record(stage, n);

export const testRecord = (stage) => S.tests[testKey(stage)] || null;
export const testPassed = (stage) => !!testRecord(stage)?.passed;

/** Every lesson in a stage finished — which is what opens the test. */
export const lessonsDone = (stage) => (STAGE[stage]?.lessons || []).filter(l => isDone(stage, l.n)).length;
export const stageDone = (stage) => lessonsDone(stage) === (STAGE[stage]?.lessons.length ?? 0);
export const testOpen = (stage) => stageDone(stage);

/** Stage 1 is always open. After that you have to pass the test before it. */
export const stageOpen = (stage) => stage === 1 || testPassed(stage - 1);

/** Lesson 1 of an open stage is open; the rest wait for the one before them. */
export function lessonOpen(stage, n){
  if (!stageOpen(stage)) return false;
  return n === 1 || isDone(stage, n - 1);
}

export const bookOpen = (book) => lessonOpen(book.stage, book.before);

/** What the game thinks you are on: a lesson, a test, or nothing left. */
export function current(){
  for (const st of STAGES){
    if (!stageOpen(st.id)) break;
    for (const l of st.lessons) if (!isDone(st.id, l.n)) return { kind:'lesson', stage:st.id, n:l.n, lesson:l };
    if (!testPassed(st.id)) return { kind:'test', stage:st.id, n:11 };
  }
  return { kind:'done', stage:4, n:11 };
}

export const allDone = () => STAGES.every(st => stageDone(st.id) && testPassed(st.id));

export const counts = () => ({
  lessons: ALL_LESSONS.filter(l => isDone(l.stage, l.n)).length,
  of: ALL_LESSONS.length,
  stars: Object.values(S.done).reduce((n, r) => n + (r.stars || 0), 0),
  starsOf: ALL_LESSONS.length * 3,
  books: S.read.length,
  booksOf: ALL_BOOKS.length,
  tests: [1, 2, 3, 4].filter(testPassed).length,
  testsOf: 4,
});

// ------------------------------------------------------------------- XP ---

/** Add XP. Everything that pays out goes through here. */
export function earn(amount){
  const n = Math.max(0, Math.round(amount));
  if (!n) return 0;
  S.xp += n;
  S.total += n;
  S.log.xp += n;
  save();
  return n;
}

export function spend(amount){
  if (S.xp < amount) return false;
  S.xp -= amount;
  save();
  return true;
}

export function buyMilbil(id){
  const m = MILBIL[id];
  if (!m || S.owned.includes(id)) return false;
  if (!spend(m.cost)) return false;
  S.owned.push(id);
  S.milbil = id;
  saveNow();
  return true;
}

export function buyFeature(id){
  const f = FEATURE[id];
  if (!f || has(id)) return false;
  if (!spend(f.cost)) return false;
  S.features.push(id);
  if (id === 'night') S.theme = 'night';
  if (id === 'board') S.theme = 'board';
  saveNow();
  return true;
}

export function buyPart(id){
  const p = PART[id];
  if (!p || ownsPart(id)) return false;
  if (!spend(p.cost)) return false;
  S.parts.push(id);
  saveNow();
  return true;
}

/** Save the milbil you built, and put it on. */
export function saveCustom(name, chosen){
  S.custom = { name: String(name || 'My Milbil').trim().slice(0, 14) || 'My Milbil', chosen: { ...chosen } };
  if (!S.owned.includes('custom')) S.owned.push('custom');
  S.milbil = 'custom';
  saveNow();
  return S.custom;
}

export function wear(id){
  if (!S.owned.includes(id)) return false;
  if (id === 'custom' && !S.custom) return false;
  S.milbil = id;
  saveNow();
  return true;
}

// ------------------------------------------- finishing lessons and tests ---

/**
 * Stars, counting the questions you did not get right first go.
 *
 *   0 wrong → ★★★    1 wrong → ★★    2 wrong → ★    3 or more → nothing
 *
 * Nothing means the lesson does not count: it stays open and so does
 * everything behind it, until you come back and do better.
 */
export const starsFor = (wrong) => Math.max(0, 3 - wrong);

/**
 * Write up a finished lesson.
 *
 * The first time through pays out. Going back over an old lesson pays nothing
 * at all — that is the deal — but it can still raise your stars, so there is a
 * reason to go back and get it right.
 */
export function finishLesson(stage, n, { clean, of }){
  const key = lessonKey(stage, n);
  const before = S.done[key];
  const wrong = of - clean;
  const stars = starsFor(wrong);
  const perfect = wrong === 0;
  const replay = !!before;
  const failed = stars === 0;

  let paid = 0;
  if (!replay && !failed){
    paid += XP.lesson;
    if (perfect) paid += XP.perfect;
    if (has('double')) paid *= 2;
    paid = earn(paid);
    S.log.lessons++;
  }

  if (!failed){
    S.done[key] = {
      stars: Math.max(stars, before?.stars || 0),
      clean: Math.max(clean, before?.clean || 0),
      of,
      wrong: Math.min(wrong, before?.wrong ?? wrong),
      at: ymd(new Date()),
    };
  }
  saveNow();
  return { stars, wrong, perfect, replay, failed, paid, of, clean, best: S.done[key] || null };
}

/**
 * Mark a stage test.
 *
 * More than PASS_WRONG wrong and the whole stage has to be done again — the
 * twenty lessons lock and must be worked through from the start. XP already
 * earned, books already read and anything bought stay exactly where they are.
 */
export function finishTest(stage, { right, of }){
  const key = testKey(stage);
  const before = S.tests[key];
  const wrong = of - right;
  const passed = wrong <= PASS_WRONG;
  const firstPass = passed && !before?.passed;

  // The per-question XP is for the first sitting only, and the pass bonus for
  // the first pass. Otherwise failing on purpose would be a way to farm it.
  let paid = 0;
  if (!before || (passed && !before.passed)){
    paid = (before ? 0 : right * XP.test) + (passed && !before?.passed ? XP.passed : 0);
    if (has('double')) paid *= 2;
    paid = earn(paid);
  }

  S.tests[key] = {
    passed: passed || !!before?.passed,
    wrong, of,
    best: Math.max(right, before?.best || 0),
    at: ymd(new Date()),
  };
  if (!passed) redoStage(stage);
  saveNow();
  return { passed, firstPass, right, wrong, of, paid, replay: !!before?.passed };
}

/** Lock a stage's twenty lessons again. Nothing else is touched. */
export function redoStage(stage){
  for (const l of STAGE[stage]?.lessons || []) delete S.done[lessonKey(stage, l.n)];
  saveNow();
}

/** XP for one answered question. Replays pay nothing. */
export function answered({ right, tries, replay, streak }){
  S.log.questions++;
  if (right) S.log.right++;
  if (replay) return 0;
  let base = right ? (tries <= 1 ? XP.first : XP.second) : XP.shown;
  if (right && has('streak') && streak >= 3) base += XP.streak;
  if (has('double')) base *= 2;
  return earn(base);
}

export function readBook(id){
  if (S.read.includes(id)) return 0;
  S.read.push(id);
  const paid = earn(has('double') ? XP.book * 2 : XP.book);
  saveNow();
  return paid;
}

// ------------------------------------------------- the clock and the time ---

export function setClock(seconds, { chosen = true } = {}){
  rollOver();
  S.clock.set = Math.max(0, Math.round(seconds));
  S.clock.left = S.clock.set;
  S.clock.running = seconds > 0;
  S.clock.chosen = chosen;
  S.clock.added = 0;
  saveNow();
}

export function clockLeft(seconds){
  S.clock.left = Math.max(0, seconds);
  save();
}

export function addMinutes(mins){
  rollOver();
  S.clock.left += mins * 60;
  S.clock.set += mins * 60;
  S.clock.added += mins;
  S.clock.running = true;
  saveNow();
}

/**
 * Count learning time.
 *
 * Only called while a lesson, a test or a book is actually on screen. Sitting
 * in the shop deciding which hat to buy is not learning and does not count,
 * which is the whole reason this is separate from the countdown.
 */
export function learned(seconds){
  S.log.secs += seconds;
  S.totalSecs += seconds;
  save();
}

export const todayMinutes = () => Math.floor(S.log.secs / 60);
export const totalMinutes = () => Math.floor(S.totalSecs / 60);

/** Where today sits on the 0–300 minute scale, as a fraction. */
export const scalePos = () => Math.min(1, S.log.secs / (SCALE_MINUTES * 60));

export {
  STAGES, STAGE, ALL_LESSONS, lessonKey, getLesson, getTest, testKey, PASS_WRONG,
  ALL_BOOKS, getBook, bookBefore, booksOf,
};
