// ---------- Adaptive times-tables question engine ----------
// Tracks per-table skill and biases questions toward the tables the player misses.

import { FAST_ANSWER_SEC } from './data.js';

const TABLES = [1,2,3,4,5,6,7,8,9,10,11,12];

// Tables the player has access to, widening as they level up.
function tablePool(level){
  if (level <= 1) return [1,2,5,10];
  if (level === 2) return [1,2,3,4,5,10];
  if (level === 3) return [1,2,3,4,5,6,10];
  if (level === 4) return [2,3,4,5,6,7,8,10];
  if (level === 5) return [2,3,4,5,6,7,8,9,10];
  if (level <= 7) return [2,3,4,5,6,7,8,9,10,11];
  return TABLES;
}

export class MathEngine {
  constructor(saved){
    // skill[t] = rolling success rate 0..1 (starts optimistic-neutral)
    this.skill   = saved?.skill   || Object.fromEntries(TABLES.map(t => [t, 0.5]));
    this.seen    = saved?.seen    || Object.fromEntries(TABLES.map(t => [t, 0]));
    this.correct = saved?.correct || 0;
    this.asked   = saved?.asked   || 0;
    this.streak  = saved?.streak  || 0;
    this.best    = saved?.best    || 0;
    this.current = null;
  }

  serialize(){
    return { skill:this.skill, seen:this.seen, correct:this.correct,
             asked:this.asked, streak:this.streak, best:this.best };
  }

  accuracy(){ return this.asked ? Math.round(100 * this.correct / this.asked) : null; }

  /**
   * Build a question.
   * @param {number} level  player level (widens the table pool)
   * @param {'normal'|'hard'} mode  hard = magic tree (missing-factor / bigger numbers)
   */
  next(level, mode = 'normal'){
    const pool = tablePool(level);

    // Weight = how much this table needs practice. Unseen tables get a nudge too.
    const weights = pool.map(t => {
      const need = 1 - this.skill[t];          // 0 (mastered) .. 1 (struggling)
      const fresh = this.seen[t] < 3 ? 0.35 : 0;
      return 0.12 + need * need * 1.6 + fresh; // squared so weak tables dominate
    });

    const a = pick(pool, weights);
    let b;
    if (mode === 'hard'){
      // Magic tree leans on the upper half of the table.
      const hi = level >= 5 ? 12 : 10;
      b = 6 + Math.floor(Math.random() * (hi - 5));
    } else {
      b = 1 + Math.floor(Math.random() * (level <= 2 ? 10 : 12));
    }

    const product = a * b;
    let text, answer;

    // Missing-factor questions once the player is decent, always at the magic tree.
    const missingFactor = mode === 'hard'
      ? Math.random() < 0.55
      : (this.skill[a] > 0.7 && this.asked > 12 && Math.random() < 0.22);

    if (missingFactor){
      // Either phrasing hides the same operand, so the answer is b in both cases.
      answer = b;
      text = Math.random() < 0.5 ? `${a} × ? = ${product}` : `? × ${a} = ${product}`;
    } else {
      answer = product;
      text = Math.random() < 0.5 ? `${a} × ${b} = ?` : `${b} × ${a} = ?`;
    }

    this.current = { a, b, text, answer, table:a, mode, asked:performance.now() };
    return this.current;
  }

  /**
   * Grade the current question.
   * @returns {{ok:boolean, answer:number, seconds:number, fast:boolean, streak:number}}
   */
  grade(input){
    const q = this.current;
    if (!q) return { ok:false, answer:0, seconds:99, fast:false, streak:0 };

    const ok = Number(input) === q.answer;
    const seconds = (performance.now() - q.asked) / 1000;

    this.asked++;
    this.seen[q.table] = (this.seen[q.table] || 0) + 1;
    if (ok) this.correct++;

    // Exponential moving average per table.
    const alpha = 0.3;
    this.skill[q.table] = clamp01(this.skill[q.table] * (1 - alpha) + (ok ? 1 : 0) * alpha);

    this.streak = ok ? this.streak + 1 : 0;
    if (this.streak > this.best) this.best = this.streak;

    return { ok, answer:q.answer, seconds, fast: ok && seconds <= FAST_ANSWER_SEC, streak:this.streak };
  }

  /** Coin multiplier from the current streak, capped. */
  streakMult(cap = 2.0){
    return Math.min(cap, 1 + this.streak * 0.1);
  }

  /** The two tables the player is weakest at, for end-of-session feedback. */
  weakest(level){
    return tablePool(level)
      .filter(t => this.seen[t] >= 2)
      .sort((x,y) => this.skill[x] - this.skill[y])
      .slice(0,2);
  }
}

function pick(items, weights){
  const total = weights.reduce((s,w) => s + w, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++){
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const clamp01 = v => Math.max(0, Math.min(1, v));
