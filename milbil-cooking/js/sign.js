// ---------- Your restaurant's sign ----------
//
// The sign over your restaurant says whatever you name it, in the font, colour
// and background you pick. Tap it in the dining room to change it. Until you
// name it, it's "Greta's Little Café" and moves up with the restaurant.

import { SIGN_FONTS, SIGN_COLORS, SIGN_BGS, SIGN_NAMES } from './data.js';
import { S, save, tier } from './state.js';
import { $, esc, sfx } from './ui.js';

const byId = (list) => Object.fromEntries(list.map(x => [x.id, x]));
const FONT = byId(SIGN_FONTS), COLOR = byId(SIGN_COLORS), BG = byId(SIGN_BGS);

const font = () => FONT[S.sign.font] || SIGN_FONTS[0];
const color = () => COLOR[S.sign.color] || SIGN_COLORS[0];
const bg = () => BG[S.sign.bg] || SIGN_BGS[0];
const bgCSS = (b) => b.css ?? tier().accent;

export const defaultName = () => `${S.name || 'Milbil'}'s ${tier().name}`;
export const signName = () => S.sign.name.trim() || defaultName();

/** The sign itself. `extra` goes inside it (the ✏️ badge in the dining room). */
export function signHTML(cls = '', extra = ''){
  const f = font(), c = color(), b = bg();
  const text = c.grad ? `background-image:${c.grad}` : `color:${c.css}`;
  return `<div class="sign bg-${b.id} ${cls}" style="background:${bgCSS(b)};--glow:${c.css}">
    <span class="sign-text ${c.grad ? 'grad' : ''}" style="font-family:${f.css};${text}">${esc(signName())}</span>${extra}</div>`;
}

/**
 * Shrink the writing until the sign fits in maxW x maxH. Long names wrap onto
 * a second line before they get small. Runs again once the font has loaded,
 * since a font that's still loading is measured in the fallback.
 */
export function fitSign(el, maxW, maxH, start = 24){
  if (!el) return;
  const t = $('.sign-text', el);
  const f = font();
  // Measure the writing, not the sign: the ✏️ badge hangs off the sign's
  // corner and would always count as too wide.
  const fit = () => {
    el.style.maxWidth = `${Math.floor(maxW)}px`;
    const cs = getComputedStyle(el);
    const room = () => el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) + 1;
    let size = Math.round(start * f.size);
    t.style.fontSize = `${size}px`;
    while (size > 8 && (t.getBoundingClientRect().width > room() || el.offsetHeight > maxH)){
      size--;
      t.style.fontSize = `${size}px`;
    }
  };
  fit();
  if (f.family && document.fonts?.load){
    document.fonts.load(`20px '${f.family}'`).then(() => { if (el.isConnected) fit(); }).catch(() => {});
  }
}

// ---------------------------------------------------------- sign maker ---

let opts = {};

/** Open the sign maker. onChange runs after every change; onClose when done. */
export function openSignMaker({ first = false, onChange, onClose } = {}){
  opts = { first, onChange, onClose };
  const m = $('#signMaker');
  const input = $('#signName');
  input.value = S.sign.name;
  input.placeholder = defaultName();
  $('#makerTitle').textContent = first ? '🪧 Now make your sign!' : '🪧 Your sign';
  $('#signDone').textContent = first ? '🍳 Open the doors!' : '✓ Done';
  m.hidden = false;
  requestAnimationFrame(() => m.classList.add('show'));
  renderChoices();
  renderPreview();
}

function closeMaker(){
  const m = $('#signMaker');
  m.classList.remove('show');
  setTimeout(() => { m.hidden = true; }, 220);
  sfx('buy');
  opts.onClose?.();
}

function changed(){
  save();
  renderPreview();
  opts.onChange?.();
}

function renderPreview(){
  const wall = $('#makerWall');
  const T = tier();
  wall.style.background = `linear-gradient(${T.wall}, ${T.wall2})`;
  wall.innerHTML = signHTML('big');
  fitSign($('.sign', wall), wall.clientWidth - 28, 104, 34);
}

function renderChoices(){
  $('#signFonts').innerHTML = SIGN_FONTS.map(f =>
    `<button type="button" class="font-opt ${f.id === font().id ? 'on' : ''}" data-font="${f.id}" style="font-family:${f.css};font-size:${Math.round(19 * f.size)}px">${f.name}</button>`).join('');
  $('#signColors').innerHTML = SIGN_COLORS.map(c =>
    `<button type="button" class="sw ${c.id === color().id ? 'on' : ''}" data-color="${c.id}" style="--c:${c.css};${c.grad ? `background:${c.grad}` : ''}" aria-label="${c.id}"></button>`).join('');
  $('#signBgs').innerHTML = SIGN_BGS.map(b =>
    `<button type="button" class="bg-opt bg-${b.id} ${b.id === bg().id ? 'on' : ''}" data-bg="${b.id}" style="background:${bgCSS(b)}" aria-label="${b.name}" title="${b.name}"></button>`).join('');
}

function pickName(){
  const chef = S.name || 'Milbil';
  const names = SIGN_NAMES.map(n => n.replace('{chef}', chef)).filter(n => n !== S.sign.name);
  return names[Math.floor(Math.random() * names.length)];
}

export function setupSignMaker(){
  const input = $('#signName');
  input.addEventListener('input', () => { S.sign.name = input.value.slice(0, 24); changed(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  $('#signDice').addEventListener('click', () => {
    S.sign.name = input.value = pickName();
    sfx('tap');
    changed();
  });
  $('#signMaker').addEventListener('click', (e) => {
    const b = e.target.closest('[data-font],[data-color],[data-bg]');
    if (!b) return;
    if (b.dataset.font) S.sign.font = b.dataset.font;
    if (b.dataset.color) S.sign.color = b.dataset.color;
    if (b.dataset.bg) S.sign.bg = b.dataset.bg;
    sfx('tap');
    renderChoices();
    changed();
  });
  $('#signDone').addEventListener('click', closeMaker);
  addEventListener('resize', () => { if (!$('#signMaker').hidden) renderPreview(); });
}
