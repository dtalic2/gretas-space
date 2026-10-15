// ---------- Restock Food: answer questions to refill every plate ----------
//
// Like Blooket: the question sits in a white box at the top, with four
// coloured answers underneath. Get it right and every food on your menu gets
// more servings. Get it wrong and you see the right answer.
//
// The questions keep coming, one after another, until you tap Back to the
// café, so you can restock as much as you like in one go. Turn on Auto-serve
// and the milbils get served while you answer; your cash ticks up at the top.

import { G, on, emit, addStock, menu, persist } from './game.js';
import { RESTOCK } from './data.js';
import { makeQuestion } from './questions.js';
import { foodSVG } from './food.js';
import { money } from './format.js';
import { sfx } from './audio.js';
import { $, esc, bump } from './ui.js';
import { clockHTML } from './race.js';

const NEXT_AFTER_RIGHT_MS = 900;
const NEXT_AFTER_WRONG_MS = 2200;

let box = null;
let q = null;
let phase = 'closed';       // 'closed' | 'ask' | 'result'
let nextTimer = 0;

export const quizOpen = () => phase !== 'closed';

export function initQuiz(){
  box = $('#quiz');
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-back]')) return close();
    if (e.target.closest('[data-auto]')) return toggleAutoServe();
    if (phase === 'ask'){
      const b = e.target.closest('[data-i]');
      if (b) answer(Number(b.dataset.i));
    } else if (phase === 'result' && e.target.closest('.q-result')){
      ask();
    }
  });
  on('cash', renderCash);
  on('auto', renderAuto);
}

/** Auto-serve: milbils get served without tapping them. */
export function toggleAutoServe(){
  G.s.settings.autoServe = !G.s.settings.autoServe;
  persist();
  sfx('pop');
  emit('auto');
}

export function openQuiz(){
  if (phase !== 'closed') return;
  phase = 'ask';
  box.hidden = false;
  document.body.classList.add('quizzing');
  box.innerHTML = `
    <div class="q-top">
      <div class="q-head">
        <span class="q-label">🍽️ Restock Food</span>${clockHTML()}
        <span class="q-cash">💵 <b></b></span>
      </div>
      <div class="q-box"><span class="q-text"></span></div>
    </div>
    <div class="q-answers"></div>
    <div class="q-foot">
      <button type="button" class="q-back" data-back="1">⬅️ Back to the café</button>
      <button type="button" class="q-auto" data-auto="1"></button>
    </div>`;
  renderCash();
  renderAuto();
  ask();
}

function ask(){
  if (phase === 'closed') return;
  clearTimeout(nextTimer);
  box.querySelector('.q-result')?.remove();
  q = makeQuestion(G.s.settings);
  phase = 'ask';
  box.querySelector('.q-text').textContent = q.text;
  box.querySelector('.q-answers').innerHTML = q.options.map((n, i) =>
    `<button type="button" class="ans a${i}" data-i="${i}"><span class="key">${i + 1}</span><b>${n}</b></button>`).join('');
  bump(box.querySelector('.q-box'), 'pop');
}

function answer(i){
  if (phase !== 'ask') return;
  const ok = q.options[i] === q.answer;
  phase = 'result';
  box.querySelector(`[data-i="${i}"]`)?.classList.add(ok ? 'right' : 'wrong');

  const res = document.createElement('div');
  if (ok){
    G.s.stats.right++;
    addStock(RESTOCK);
    G.s.hints.restocked = true;
    sfx('correct');
    res.className = 'q-result ok';
    res.innerHTML = `<div class="q-big">Correct!</div>
      <div class="q-gain">${menu().map(f => `<span>${foodSVG(f.id)}<b>+${RESTOCK}</b></span>`).join('')}</div>
      <div class="q-tap">Next question coming… (tap to skip)</div>`;
  } else {
    G.s.stats.wrong++;
    sfx('wrong');
    res.className = 'q-result bad';
    res.innerHTML = `<div class="q-big">Incorrect</div>
      <div class="q-correct">${esc(q.text)} = <b>${q.answer}</b></div>
      <div class="q-tap">Next question coming… (tap to skip)</div>`;
  }
  box.appendChild(res);
  emit('answered', ok);
  clearTimeout(nextTimer);
  nextTimer = setTimeout(ask, ok ? NEXT_AFTER_RIGHT_MS : NEXT_AFTER_WRONG_MS);
}

function renderCash(){
  const b = box?.querySelector('.q-cash b');
  if (b) b.textContent = money(G.s.cash);
}

function renderAuto(){
  const b = box?.querySelector('.q-auto');
  if (!b) return;
  const on = !!G.s.settings.autoServe;
  b.classList.toggle('on', on);
  b.innerHTML = `🤖 Auto-serve: <b>${on ? 'On' : 'Off'}</b>`;
}

export function closeQuiz(){ close(); }

function close(){
  if (phase === 'closed') return;
  clearTimeout(nextTimer);
  phase = 'closed';
  box.hidden = true;
  box.innerHTML = '';
  document.body.classList.remove('quizzing');
}

/** Number keys 1-4 answer; Space or Enter skips to the next question; Escape goes back. */
export function quizKey(e){
  if (phase === 'closed') return false;
  if (e.key === 'Escape'){ close(); return true; }
  if (phase === 'ask' && /^[1-4]$/.test(e.key)){ answer(Number(e.key) - 1); return true; }
  if (phase === 'result' && (e.key === ' ' || e.key === 'Enter')){ ask(); return true; }
  return true;
}
