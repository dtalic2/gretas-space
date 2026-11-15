// ---------- The questions ----------
//
// Every egg costs one times-tables fact, and so does everything in the shop.
// The pick is weighted rather than random: a fact you have just got wrong comes
// back soon, a fact you have never seen comes next, and a fact you have had
// right three times in a row mostly steps aside. That is the whole adaptive
// idea — practise what you do not know yet, not what you already do.
//
// Weights live in the save file as a flat map of `a×b` → { seen, wrong, streak },
// so the game remembers what is hard for *this* player between sessions.

export const TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
export const DEFAULT_TABLES = [2, 3, 4, 5, 10];

const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];

export class Questions {
  /** `facts` is the live map from the save file — this class writes into it. */
  constructor(tables, facts){
    this.setTables(tables);
    this.facts = facts || {};
    this.recent = [];
  }

  setTables(tables){
    this.tables = (tables && tables.length) ? [...tables] : [...DEFAULT_TABLES];
  }

  stat(key){
    if (!this.facts[key]) this.facts[key] = { seen: 0, wrong: 0, streak: 0 };
    return this.facts[key];
  }

  /**
   * How badly this fact needs asking.
   *   never seen        → 6
   *   got it wrong      → up to 40, fading as you get it right again
   *   solid three times → 1
   */
  weight(a, b){
    const s = this.facts[`${a}x${b}`];
    if (!s || !s.seen) return 6;
    let w = 3;
    w += s.wrong * 9;
    w -= Math.min(s.streak, 3) * 0.8;
    if (s.streak >= 3) w *= 0.35;
    return Math.max(0.6, Math.min(40, w));
  }

  /** The next fact to ask, avoiding the last few. */
  next(){
    const pool = [];
    for (const a of this.tables){
      for (let b = 1; b <= 12; b++){
        const key = `${a}x${b}`;
        if (this.recent.includes(key)) continue;
        pool.push({ a, b, key, w: this.weight(a, b) });
      }
    }
    if (!pool.length){
      const a = pick(this.tables), b = 1 + randInt(12);
      return this._make(a, b);
    }

    let roll = pool.reduce((t, x) => t + x.w, 0) * Math.random();
    let chosen = pool[pool.length - 1];
    for (const x of pool){ roll -= x.w; if (roll <= 0){ chosen = x; break; } }

    this.recent.push(chosen.key);
    if (this.recent.length > 5) this.recent.shift();
    return this._make(chosen.a, chosen.b);
  }

  _make(a, b){
    return { a, b, key: `${a}x${b}`, right: a * b, text: `${a} × ${b}` };
  }

  /** Fold an answer back in. Returns true if it was right. */
  record(q, given){
    const ok = Number(given) === q.right;
    const s = this.stat(q.key);
    s.seen++;
    if (ok){
      s.streak++;
      // One right answer pays off one past mistake, so a fact can settle down.
      if (s.streak >= 2 && s.wrong > 0) s.wrong--;
    } else {
      s.wrong++;
      s.streak = 0;
      // A missed fact jumps the queue next time.
      this.recent = this.recent.filter((k) => k !== q.key);
    }
    return ok;
  }

  /** The facts this player keeps getting wrong, worst first. */
  trouble(limit = 6){
    return Object.entries(this.facts)
      .filter(([, s]) => s.wrong > 0)
      .sort((x, y) => y[1].wrong - x[1].wrong)
      .slice(0, limit)
      .map(([k, s]) => ({ key: k, text: k.replace('x', ' × '), wrong: s.wrong }));
  }
}
