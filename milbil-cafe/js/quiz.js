// ---------- Restock Food: answer a question to refill every plate ----------
//
// Like Blooket: the question sits in a white box at the top, with four
// coloured answers underneath. Get it right and every food on your menu gets
// more servings. Get it wrong and you see the right answer, then try another.

import { G, addStock, menu, emit } from './game.js';
import { RESTOCK } from './data.js';
import { makeQuestion } from './questions.js';
import { foodSVG } from './food.js';
import { sfx } from './audio.js';
import { $, esc } from './ui.js';

let box = null;
let q = null;
let phase = 'closed';       // 'closed' | 'ask' | 'result'
let closeTimer = 0;

export const quizOpen = () => phase !== 'closed';

export function initQuiz(){
  box = $('#quiz');
  box.addEventListener('click', (e) => {
    if (phase === 'ask'){
      const b = e.target.closest('[data-i]');
      if (b) answer(Number(b.dataset.i));
    } else if (phase === 'result' && e.target.closest('.q-result')){
      close();
    }
  });
}

export function openQuiz(){
  if (phase !== 'closed') return;
  q = makeQuestion(G.s.settings);
  phase = 'ask';
  box.hidden = false;
  document.body.classList.add('quizzing');
  box.innerHTML = `
    <div class="q-top">
      <div class="q-label">🍽️ Restock Food</div>
      <div class="q-box"><span>${esc(q.text)}</span></div>
    </div>
    <div class="q-answers">
      ${q.options.map((n, i) => `<button type="button" class="ans a${i}" data-i="${i}">
        <span class="key">${i + 1}</span><b>${n}</b></button>`).join('')}
    </div>
    <button type="button" class="q-skip" data-skip="1">Back to the café</button>`;
  box.querySelector('[data-skip]').addEventListener('click', close);
}

function answer(i){
  if (phase !== 'ask') return;
  const ok = q.options[i] === q.answer;
  phase = 'result';
  const picked = box.querySelector(`[data-i="${i}"]`);
  picked?.classList.add(ok ? 'right' : 'wrong');

  const res = document.createElement('div');
  if (ok){
    G.s.stats.right++;
    addStock(RESTOCK);
    G.s.hints.restocked = true;
    sfx('correct');
    res.className = 'q-result ok';
    res.innerHTML = `<div class="q-big">Correct!</div>
      <div class="q-gain">${menu().map(f => `<span>${foodSVG(f.id)}<b>+${RESTOCK}</b></span>`).join('')}</div>
      <div class="q-tap">Tap to keep serving</div>`;
  } else {
    G.s.stats.wrong++;
    sfx('wrong');
    res.className = 'q-result bad';
    res.innerHTML = `<div class="q-big">Incorrect</div>
      <div class="q-correct">${esc(q.text)} = <b>${q.answer}</b></div>
      <div class="q-tap">Tap to go back</div>`;
  }
  box.appendChild(res);
  emit('answered', ok);
  clearTimeout(closeTimer);
  closeTimer = setTimeout(close, ok ? 1300 : 2600);
}

function close(){
  if (phase === 'closed') return;
  clearTimeout(closeTimer);
  phase = 'closed';
  box.hidden = true;
  box.innerHTML = '';
  document.body.classList.remove('quizzing');
}

/** Number keys 1-4 answer; Enter or Space moves on after the result. */
export function quizKey(e){
  if (phase === 'ask' && /^[1-4]$/.test(e.key)){ answer(Number(e.key) - 1); return true; }
  if (phase === 'ask' && e.key === 'Escape'){ close(); return true; }
  if (phase === 'result' && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')){ close(); return true; }
  return phase !== 'closed';
}
