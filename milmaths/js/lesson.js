// ---------- Doing a lesson, or sitting a test ----------
//
// A **lesson** gives you two goes at every question. Get it right first time
// and it counts as clean, which is what the stars are worked out from. Get it
// wrong twice and the game shows you the answer and explains it — you still
// earn a little, because turning up and getting it wrong is how this works.
//
// A **test** is the same screen with the safety rails off: one go a question,
// no hints, no times table poster — the scratch pad and nothing else, which is
// what you would be allowed in a real one. It still explains every answer
// afterwards, because the point is still learning.
//
// The whole thing lives in one element and tears itself down on the way out,
// so nothing here outlives the screen.

import { S, has, buddy, answered, finishLesson, finishTest, PASS_WRONG, XP } from './state.js';
import { drawLook, artHTML } from './milbil.js';
import { $, esc, sfx, buzz, floatText, confetti, card, mini } from './ui.js';

// What the milbil beside you says. Picked at random so it never reads like a
// machine saying "Correct." forty times in a row.
const YES = ['Yes!', 'Got it.', 'That\'s the one.', 'Spot on.', 'Nice.', 'Correct!', 'Exactly.', 'Lovely.'];
const NEARLY = ['Not quite — have another go.', 'Close. Try once more.', 'Hmm, not that one. One more go?', 'Have another look.'];
const SHOWN = ['Here it is, then.', 'That one is tricky. Look:', 'No shame in this one:', 'Let\'s go through it.'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const buddyHTML = (cls = '') => {
  const b = buddy();
  return b.art ? artHTML(b.art, b.name, cls) : drawLook(b.look, { cls, title: b.name });
};

/** Read a typed answer. Tolerates $, spaces, commas, a lone minus and 4.70. */
export function parseAnswer(raw){
  const t = String(raw ?? '').trim().replace(/[$,\s]/g, '').replace(/[−–—]/g, '-');
  if (!t || t === '-' || t === '.' || t === '-.') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const isRight = (q, value) =>
  q.pick ? value === q.a : (value != null && Math.abs(value - q.a) < 1e-9);

/** How the answer is written out when the game shows it. */
export function showAnswer(q){
  if (q.pick) return q.pick[q.a];
  if (q.money) return `$${q.a.toFixed(2)}`;
  return `${q.a}${q.unit ? ' ' + q.unit : ''}`;
}

export class Lesson {
  /**
   * @param host     the element to draw into
   * @param lesson   a lesson or a test out of the curriculum, with .stage on it
   * @param opts     { replay, onQuit, onFinish, onXp, onTool }
   */
  constructor(host, lesson, opts = {}){
    this.host = host;
    this.lesson = lesson;
    this.isTest = !!lesson.isTest;
    this.replay = !!opts.replay;
    this.opts = opts;
    this.i = 0;
    this.tries = 0;
    this.clean = 0;
    this.streak = 0;
    this.forgiven = false;        // the Second Go feature, once per lesson
    this.typed = '';
    this.chosen = null;
    this.marked = null;           // null while answering, then 'right'|'wrong'|'shown'
    this.earnedTotal = 0;
    this.hinted = false;
    this.minus = lesson.stage === 4;   // negative answers only live in Stage 4
    host.innerHTML = '';
    host.hidden = false;
    this.build();
    this.render();
  }

  get q(){ return this.lesson.qs[this.i]; }
  get total(){ return this.lesson.qs.length; }

  // ------------------------------------------------------------ scaffold ---

  build(){
    this.host.innerHTML = `
      <div class="lsn">
        <header class="lsn-top">
          <button type="button" class="round sm" data-go="quit" aria-label="Back">✕</button>
          <div class="lsn-title"><b></b><small></small></div>
          <div class="lsn-count"></div>
        </header>
        <div class="dots"></div>
        <div class="lsn-body">
          <div class="q-card card">
            <p class="q-text"></p>
            <div class="q-answer"></div>
            <div class="q-mark"></div>
          </div>
          <div class="q-say">
            <div class="q-buddy">${buddyHTML()}</div>
            <p class="bubble"></p>
          </div>
        </div>
        <footer class="lsn-bar"></footer>
      </div>`;
    this.el = {
      title: $('.lsn-title b', this.host),
      sub: $('.lsn-title small', this.host),
      count: $('.lsn-count', this.host),
      dots: $('.dots', this.host),
      text: $('.q-text', this.host),
      answer: $('.q-answer', this.host),
      mark: $('.q-mark', this.host),
      bubble: $('.bubble', this.host),
      bar: $('.lsn-bar', this.host),
    };
    this.el.title.textContent = this.lesson.name;
    this.el.sub.textContent = this.isTest
      ? `One go at each · more than ${PASS_WRONG} wrong and the stage starts again`
      : this.replay ? 'Going back over it — no XP this time' : this.lesson.teach;
    if (this.isTest) this.host.querySelector('.lsn').classList.add('is-test');

    // The host element outlives the lesson, so a handler left behind by the
    // last one would still be listening — and would answer for its own dead
    // instance. Clear it before adding ours.
    if (this.host._onClick) this.host.removeEventListener('click', this.host._onClick);
    this.onClick = (e) => {
      const b = e.target.closest('[data-go],[data-key],[data-opt],[data-tool]');
      if (!b || b.disabled) return;
      if (b.dataset.go) this.go(b.dataset.go);
      else if (b.dataset.key) this.key(b.dataset.key);
      else if (b.dataset.opt != null) this.choose(+b.dataset.opt);
      else if (b.dataset.tool) this.opts.onTool?.(b.dataset.tool, this.q);
    };
    this.host._onClick = this.onClick;
    this.host.addEventListener('click', this.onClick);

    this.onKey = (e) => {
      if (this.host.hidden) return;
      if (e.key >= '0' && e.key <= '9') this.key(e.key);
      else if (e.key === '.') this.key('.');
      else if (e.key === '-' && this.minus) this.key('-');
      else if (e.key === 'Backspace') this.key('del');
      else if (e.key === 'Enter') this.marked ? this.go('next') : this.check();
      else return;
      e.preventDefault();
    };
    addEventListener('keydown', this.onKey);
  }

  destroy(){
    removeEventListener('keydown', this.onKey);
    this.host.removeEventListener('click', this.onClick);
    if (this.host._onClick === this.onClick) this.host._onClick = null;
    this.host.hidden = true;
    this.host.innerHTML = '';
  }

  // -------------------------------------------------------------- drawing ---

  render(){
    const q = this.q;
    this.el.count.textContent = `${this.i + 1} / ${this.total}`;
    this.el.dots.innerHTML = this.lesson.qs.map((_, i) =>
      `<i class="${i < this.i ? (this.marksSoFar?.[i] || 'past') : i === this.i ? 'now' : ''}"></i>`).join('');
    this.el.text.innerHTML = esc(q.q);
    this.el.text.className = `q-text${q.big ? ' big' : ''}`;
    this.el.answer.innerHTML = q.pick ? this.choicesHTML(q) : this.typedHTML(q);
    this.el.mark.innerHTML = '';
    this.el.mark.className = 'q-mark';
    this.el.bubble.textContent = '';
    this.el.bubble.className = 'bubble';
    this.bar();
  }

  choicesHTML(q){
    return `<div class="opts${q.pick.length > 3 ? ' four' : ''}">${q.pick.map((o, i) =>
      `<button type="button" class="opt${this.chosen === i ? ' on' : ''}" data-opt="${i}">${esc(o)}</button>`).join('')}</div>`;
  }

  typedHTML(q){
    const shown = this.typed || '';
    return `<div class="typed${shown ? '' : ' empty'}">
        <span class="typed-val">${esc(shown || '?')}</span>
        ${q.unit ? `<span class="typed-unit">${esc(q.unit)}</span>` : ''}
        ${q.money ? '<span class="typed-unit">dollars</span>' : ''}
      </div>`;
  }

  /** The bar at the bottom: a keypad while answering, a Next button after. */
  bar(){
    const q = this.q;
    const tools = this.toolsHTML();
    if (this.marked){
      const last = this.i + 1 >= this.total;
      const end = this.isTest ? 'Hand the test in →' : 'Finish the lesson →';
      this.el.bar.innerHTML = `<button type="button" class="btn go wide" data-go="next">${last ? end : 'Next question →'}</button>`;
      return;
    }
    if (q.pick){
      this.el.bar.innerHTML = `${tools}
        <button type="button" class="btn go wide" data-go="check" ${this.chosen == null ? 'disabled' : ''}>Check it</button>`;
      return;
    }
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', this.minus ? '-' : '.', '0', this.minus ? '.' : 'del'];
    this.el.bar.innerHTML = `${tools}
      <div class="pad">
        ${keys.map(k => `<button type="button" class="key${k === 'del' ? ' dim' : ''}" data-key="${k}">${k === 'del' ? '⌫' : k === '-' ? '−' : k}</button>`).join('')}
        ${this.minus ? '<button type="button" class="key dim" data-key="del">⌫</button>' : ''}
        <button type="button" class="key check" data-key="check" ${this.typed ? '' : 'disabled'}>Check</button>
      </div>`;
  }

  toolsHTML(){
    const q = this.q;
    const t = [];
    // In a test you get scratch paper and that is all, same as a real one.
    if (!this.isTest && has('hints') && q.hint && !this.hinted) t.push(['hint', '💡', 'Hint']);
    if (has('scratch')) t.push(['scratch', '✏️', 'Scribble']);
    if (!this.isTest && has('numberline')) t.push(['numberline', '📏', 'Number line']);
    if (!this.isTest && has('poster')) t.push(['poster', '🧾', 'Times tables']);
    if (!t.length) return '';
    return `<div class="q-tools">${t.map(([id, icon, name]) =>
      `<button type="button" class="tool" data-${id === 'hint' ? 'go' : 'tool'}="${id}">${icon}<span>${name}</span></button>`).join('')}</div>`;
  }

  // ------------------------------------------------------------- answering ---

  key(k){
    if (this.marked) return;
    if (k === 'check') return this.check();
    sfx('key');
    if (k === 'del') this.typed = this.typed.slice(0, -1);
    else if (k === '.' && this.typed.includes('.')) return;
    else if (k === '-') this.typed = this.typed.startsWith('-') ? this.typed.slice(1) : '-' + this.typed;
    else if (this.typed.replace('-', '').replace('.', '').length < 7) this.typed += k;
    this.el.answer.innerHTML = this.typedHTML(this.q);
    this.bar();
  }

  choose(i){
    if (this.marked) return;
    sfx('tap');
    this.chosen = i;
    this.el.answer.innerHTML = this.choicesHTML(this.q);
    this.bar();
  }

  go(what){
    if (what === 'quit') return this.quit();
    if (what === 'check') return this.check();
    if (what === 'next') return this.next();
    if (what === 'hint') return this.hint();
  }

  hint(){
    this.hinted = true;
    sfx('tap');
    this.el.mark.className = 'q-mark tip';
    this.el.mark.innerHTML = `<b>💡 Hint</b> ${esc(this.q.hint)}`;
    this.bar();
  }

  check(){
    const q = this.q;
    const value = q.pick ? this.chosen : parseAnswer(this.typed);
    if (value == null) return;
    this.tries++;
    const right = isRight(q, value);

    if (right){
      const firstGo = this.tries <= 1;
      const saved = !firstGo && has('secondgo') && !this.forgiven;
      if (saved) this.forgiven = true;
      if (firstGo || saved) this.clean++;
      this.streak = firstGo ? this.streak + 1 : 0;
      this.settle('right', firstGo ? pick(YES) : 'Right — second time counts.');
      return;
    }

    if (this.tries === 1 && !this.isTest){
      this.streak = 0;
      sfx('wrong'); buzz(40);
      this.el.mark.className = 'q-mark bad';
      this.el.mark.innerHTML = `<b>Not that one.</b> Have another go.`;
      this.el.bubble.textContent = pick(NEARLY);
      this.el.bubble.className = 'bubble sad';
      if (q.pick){ this.chosen = null; this.el.answer.innerHTML = this.choicesHTML(q); }
      else { this.typed = ''; this.el.answer.innerHTML = this.typedHTML(q); }
      this.bar();
      return;
    }

    this.streak = 0;
    this.settle('shown', pick(SHOWN));
  }

  /** Mark the question, pay out and show the explanation. */
  settle(how, say){
    const q = this.q;
    this.marked = how;
    (this.marksSoFar ||= [])[this.i] = how === 'right' ? 'ok' : 'no';

    const paid = answered({ right: how === 'right', tries: this.tries, replay: this.replay, streak: this.streak });
    this.earnedTotal += paid;

    this.el.mark.className = `q-mark ${how === 'right' ? 'good' : 'bad'}`;
    this.el.mark.innerHTML =
      `<b>${how === 'right' ? '✓ Right' : `The answer is ${esc(showAnswer(q))}`}</b>` +
      (q.why ? `<span>${esc(q.why).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</span>` : '');
    this.el.bubble.textContent = say;
    this.el.bubble.className = `bubble ${how === 'right' ? '' : 'sad'}`;

    if (how === 'right'){ sfx('right'); buzz(12); }
    else sfx('show');

    if (paid){
      this.opts.onXp?.(paid);
      const where = $('.q-mark', this.host);
      if (where) floatText(where, `+${paid} XP`);
      setTimeout(() => sfx('xp'), 140);
    }

    // Answering is what moves the dots along, so redraw them now.
    this.el.dots.innerHTML = this.lesson.qs.map((_, i) =>
      `<i class="${i < this.i ? (this.marksSoFar[i] || 'past') : i === this.i ? (how === 'right' ? 'ok' : 'no') : ''}"></i>`).join('');
    this.bar();
  }

  next(){
    if (this.i + 1 >= this.total) return this.finish();
    this.i++;
    this.tries = 0;
    this.typed = '';
    this.chosen = null;
    this.marked = null;
    this.hinted = false;
    sfx('tap');
    this.render();
    this.host.querySelector('.lsn-body')?.scrollTo({ top: 0 });
  }

  async quit(){
    if (this.i === 0 && !this.marked) return this.opts.onQuit?.();
    const out = await card(
      `<h3>Leave the ${this.isTest ? 'test' : 'lesson'}?</h3><p>You are on question ${this.i + 1} of
       ${this.total}. Leaving now loses this go${this.isTest ? ' and the test is not marked' : ''} —
       the XP you have already earned is yours to keep.</p>`,
      [{ label:'Keep going', cls:'go' }, { label:'Leave', cls:'ghost', value:'quit' }]);
    if (out === 'quit') this.opts.onQuit?.();
  }

  // --------------------------------------------------------------- the end ---

  finish(){
    if (this.isTest){
      const res = finishTest(this.lesson.stage, { right: this.clean, of: this.total });
      res.earned = res.paid;
      res.isTest = true;
      sfx(res.passed ? 'star' : 'oops');
      if (res.passed && has('confetti')) confetti(100);
      this.opts.onFinish?.(res);
      return;
    }
    const res = finishLesson(this.lesson.stage, this.lesson.n, { clean: this.clean, of: this.total });
    res.earned = this.earnedTotal + res.paid;
    if (res.failed) sfx('oops');
    else if (res.stars === 3) sfx('star');
    else sfx('cheer');
    if (has('confetti') && res.stars >= 2) confetti(res.stars === 3 ? 90 : 50);
    this.opts.onFinish?.(res);
  }
}

export { XP };
