// ---------- Restock questions ----------
//
// Blooket asks questions from a set your teacher picks. Here you pick: times
// tables (any of 1 to 12), adding to 20, taking away within 20, or a mix.
// Every question has four answers: the right one and three that look right.

export const MODES = [
  { id:'times', name:'Times tables', icon:'✖️' },
  { id:'add',   name:'Adding',       icon:'➕' },
  { id:'take',  name:'Take away',    icon:'➖' },
  { id:'mix',   name:'Mix them up',  icon:'🔀' },
];
export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const rand = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let last = '';

/** A fresh question for the chosen settings: { text, answer, options[4] }. */
export function makeQuestion(settings){
  let q, tries = 0;
  do { q = build(settings); } while (q.text === last && tries++ < 8);
  last = q.text;
  return q;
}

function build({ qmode = 'times', tables = [] } = {}){
  const mode = qmode === 'mix' ? pick(['times', 'add', 'take']) : qmode;

  if (mode === 'add'){
    const a = rand(0, 10), b = rand(1, 10), answer = a + b;
    return finish(`${a} + ${b}`, answer,
      [answer + 1, answer - 1, answer + 2, answer - 2, answer + 10, answer - 10, Math.abs(a - b)]);
  }
  if (mode === 'take'){
    const a = rand(2, 20), b = rand(1, Math.min(a, 10)), answer = a - b;
    return finish(`${a} − ${b}`, answer,
      [answer + 1, answer - 1, answer + 2, answer - 2, a + b, answer + 10]);
  }
  const pool = tables.length ? tables : [2, 5, 10];
  const a = pick(pool), b = rand(1, 12), answer = a * b;
  const text = Math.random() < 0.5 ? `${a} × ${b}` : `${b} × ${a}`;
  return finish(text, answer,
    [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 1, answer - 1,
     answer + 2, answer + 10, answer - 10, swapDigits(answer), a + b]);
}

// Three wrong answers from the believable ones, topped up with near misses.
function finish(text, answer, candidates){
  const wrong = new Set();
  for (const c of shuffle(candidates)){
    if (wrong.size === 3) break;
    if (Number.isInteger(c) && c >= 0 && c !== answer) wrong.add(c);
  }
  let step = 1;
  while (wrong.size < 3){
    const c = answer + (Math.random() < 0.5 ? -step : step);
    if (c >= 0 && c !== answer) wrong.add(c);
    step++;
  }
  return { text, answer, options: shuffle([answer, ...wrong]) };
}

function swapDigits(n){
  const s = String(n);
  if (s.length !== 2 || s[0] === s[1]) return -1;
  return Number(s[1] + s[0]);
}
