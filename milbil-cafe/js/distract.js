// ---------- Distractions: the spy cam ----------
//
// The other cafés are played by the computer, so you can't see their screens.
// When you send a distraction, the spy cam pops up for a few seconds instead:
// a little picture of their café, with their screen going swirly, upside
// down, bubbly, foggy or disco while they try to serve. Tap it to close it.

import { cafeOf } from './data.js';
import { faceHTML } from './rivals.js';
import { $, esc } from './ui.js';

const SHOW_MS = 3200;
let timer = 0;

function bubbles(){
  let out = '';
  for (let i = 0; i < 14; i++){
    const size = 14 + Math.round(Math.random() * 26);
    out += `<i style="left:${Math.round(Math.random() * 92)}%;width:${size}px;height:${size}px;
      animation-delay:${(Math.random() * 1.6).toFixed(2)}s;animation-duration:${(1.6 + Math.random() * 1.4).toFixed(2)}s"></i>`;
  }
  return out;
}

/** Peek at the café you just distracted. */
export function spyCam(rival, trick){
  let box = $('#spycam');
  if (!box){
    box = document.createElement('div');
    box.id = 'spycam';
    box.className = 'spycam-wrap';
    box.addEventListener('click', close);
    document.body.appendChild(box);
  }
  box.innerHTML = `
    <div class="spycam">
      <div class="spy-head">📺 Spy cam: <b>${esc(cafeOf(rival))}</b></div>
      <div class="spy-screen fx-${trick.id}">
        <div class="spy-inner">
          <div class="spy-wall"><span class="spy-sign">${esc(cafeOf(rival))}</span></div>
          <div class="spy-floor"></div>
          <div class="spy-chef">${faceHTML({ id: rival.id })}</div>
          <div class="spy-plates"><i></i><i></i><i></i></div>
        </div>
        <div class="spy-fx">${trick.id === 'bubbles' ? bubbles() : ''}</div>
      </div>
      <div class="spy-cap">${trick.icon} <b>${trick.name}!</b> ${esc(rival.name)} can hardly serve for ${trick.secs} seconds.</div>
    </div>`;
  box.hidden = false;
  box.classList.remove('out');
  clearTimeout(timer);
  timer = setTimeout(close, SHOW_MS);
}

function close(){
  const box = $('#spycam');
  if (!box) return;
  clearTimeout(timer);
  box.classList.add('out');
  setTimeout(() => { if (box.classList.contains('out')) box.hidden = true; }, 250);
}
