// ---------- Adaptive times-tables engine ----------
// Picks from the tables the player chose, leaning toward the ones they miss, and builds
// three lane answers: the right one plus two believable wrong ones.

import { FAST_ANSWER_SEC } from './data.js';

const ALL = [1,2,3,4,5,6,7,8,9,10,11,12];

export class MathEngine {
  constructor(saved){
    this.skill = saved?.skill || Object.fromEntries(ALL.map(t => [t, 0.5]));
    this.seen  = saved?.seen  || Object.fromEntries(ALL.map(t => [t, 0]));
    this.current = null;
    this.lastKey = '';
  }

  serialize(){ return { skill:this.skill, seen:this.seen }; }

  /**
   * @param {number[]} tables   tables to practise
   * @param {number} difficulty 0..1 — how far into the run we are
   */
  next(tables, difficulty = 0){
    const pool = tables.length ? tables : [2,5,10];
    const weights = pool.map(t => {
      const need = 1 - (this.skill[t] ?? 0.5);
      return 0.15 + need * need * 1.6 + ((this.seen[t] ?? 0) < 3 ? 0.3 : 0);
    });

    let a, b, key, tries = 0;
    do {
      a = pick(pool, weights);
      const hi = difficulty > 0.4 ? 12 : 10;
      b = 1 + Math.floor(Math.random() * hi);
      key = `${a}x${b}`;
    } while (key === this.lastKey && tries++ < 6);
    this.lastKey = key;

    // Now and then, once the run is warmed up, hide a factor instead of the product.
    const missing = difficulty > 0.35 && (this.skill[a] ?? 0) > 0.65 && Math.random() < 0.2;
    const product = a * b;
    let text, answer;
    if (missing){
      answer = b;
      text = `${a} × ? = ${product}`;
    } else {
      answer = product;
      text = Math.random() < 0.5 ? `${a} × ${b}` : `${b} × ${a}`;
    }

    const options = shuffle([answer, ...distractors(a, b, answer, missing)]);
    this.current = { a, b, table:a, text, answer, options, asked: performance.now() };
    return this.current;
  }

  /** A fixed fact (Challenge mode walks through a whole table). */
  make(a, b){
    const answer = a * b;
    const text = Math.random() < 0.5 ? `${a} × ${b}` : `${b} × ${a}`;
    const options = shuffle([answer, ...distractors(a, b, answer, false)]);
    this.current = { a, b, table:a, text, answer, options, asked: performance.now() };
    return this.current;
  }

  /** Grade a picked value against a question (defaults to the latest one asked). */
  grade(value, q = this.current){
    if (!q) return null;
    const ok = value === q.answer;
    const seconds = (performance.now() - (q.shownAt ?? q.asked)) / 1000;
    const t = q.table;
    this.seen[t] = (this.seen[t] || 0) + 1;
    this.skill[t] = clamp01((this.skill[t] ?? 0.5) * 0.7 + (ok ? 0.3 : 0));
    // Credit the other factor too; 3×7 is also practice for the 7s.
    if (q.b !== t && q.b <= 12){
      this.skill[q.b] = clamp01((this.skill[q.b] ?? 0.5) * 0.9 + (ok ? 0.1 : 0));
    }
    if (this.current === q) this.current = null;
    return { ok, answer:q.answer, text:q.text, table:t, b:q.b, seconds,
             fast: ok && seconds <= FAST_ANSWER_SEC };
  }

  weakest(tables){
    return tables.filter(t => this.seen[t] >= 2)
      .sort((x, y) => this.skill[x] - this.skill[y]).slice(0, 2);
  }
}

// Wrong answers that look right: neighbouring facts, off-by-a-bit, swapped digits.
function distractors(a, b, answer, missing){
  const set = new Set();
  const cands = missing
    ? [b + 1, b - 1, b + 2, b - 2, a, b * 2]
    : [a * (b + 1), a * (b - 1), (a + 1) * b, (a - 1) * b, answer + 1, answer - 1,
       answer + 10, answer - 10, answer + 2, swapDigits(answer), a + b];
  for (const c of shuffle(cands)){
    if (c > 0 && c !== answer && Number.isInteger(c)) set.add(c);
    if (set.size === 2) break;
  }
  while (set.size < 2){
    const c = answer + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 5));
    if (c > 0 && c !== answer) set.add(c);
  }
  return [...set];
}

function swapDigits(n){
  const s = String(n);
  if (s.length !== 2 || s[0] === s[1]) return -1;
  return Number(s[1] + s[0]);
}

function pick(items, weights){
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++){ r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

export function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const clamp01 = v => Math.max(0, Math.min(1, v));
