// Your milbil: the farmer you play as. Drawn as an SVG string so the same
// picture can go in the header, on your market stall and in the editor.

export const COLORS = [
  '#ffb3c7', '#9fd8ff', '#ffe08a', '#b6e8a8', '#d7b5ff',
  '#ffc79c', '#9fe8dd', '#f7a8a8', '#c9d8ff', '#ffd6f0',
];

export const HATS = [
  { id: 'straw',  name: 'Straw hat' },
  { id: 'cap',    name: 'Cap' },
  { id: 'beanie', name: 'Beanie' },
  { id: 'flower', name: 'Flower crown' },
  { id: 'sprout', name: 'Sprout' },
  { id: 'crown',  name: 'Crown' },
  { id: 'none',   name: 'No hat' },
];

export const EYES = [
  { id: 'round',   name: 'Round' },
  { id: 'happy',   name: 'Happy' },
  { id: 'sparkle', name: 'Sparkly' },
  { id: 'sleepy',  name: 'Sleepy' },
  { id: 'wink',    name: 'Wink' },
];

export const EXTRAS = [
  { id: 'none',     name: 'Nothing' },
  { id: 'glasses',  name: 'Glasses' },
  { id: 'freckles', name: 'Freckles' },
  { id: 'bow',      name: 'Bow' },
  { id: 'scarf',    name: 'Scarf' },
];

export const NAMES = [
  'Pib', 'Nuzz', 'Moby', 'Tuffet', 'Plum', 'Bobbin', 'Wix', 'Doodle', 'Crumb',
  'Pocket', 'Snug', 'Fen', 'Biscuit', 'Tam', 'Ollo', 'Peep', 'Sprig', 'Noodle',
  'Tumble', 'Winkle', 'Puddle', 'Gus', 'Bean', 'Marzi', 'Pumpkin', 'Radish',
];

export const NAME_MAX = 14;

export function defaultLook() {
  return { name: '', color: COLORS[0], hat: 'straw', eyes: 'round', extra: 'none' };
}

export function randomLook() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  return {
    name: pick(NAMES), color: pick(COLORS), hat: pick(HATS).id,
    eyes: pick(EYES).id, extra: pick(EXTRAS).id,
  };
}

export function cleanName(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
}

// Darken a #rrggbb colour, for outlines and shading.
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(v * f));
  return `rgb(${c.join(',')})`;
}

const INK = '#2b2233';

function eyes(kind) {
  const L = 25, R = 39, Y = 35;
  const dot = (x, r = 3.4) =>
    `<circle cx="${x}" cy="${Y}" r="${r}" fill="${INK}"/><circle cx="${x + 1}" cy="${Y - 1}" r="1.1" fill="#fff"/>`;
  const arc = x => `<path d="M${x - 3.5} ${Y + 1} Q${x} ${Y - 4} ${x + 3.5} ${Y + 1}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  switch (kind) {
    case 'happy': return arc(L) + arc(R);
    case 'sleepy': return [L, R].map(x =>
      `<path d="M${x - 3.5} ${Y} Q${x} ${Y + 3} ${x + 3.5} ${Y}" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('');
    case 'wink': return dot(L) + arc(R);
    case 'sparkle': return [L, R].map(x =>
      `<circle cx="${x}" cy="${Y}" r="4.4" fill="${INK}"/><circle cx="${x + 1.4}" cy="${Y - 1.4}" r="1.5" fill="#fff"/><circle cx="${x - 1.4}" cy="${Y + 1.6}" r=".8" fill="#fff"/>`).join('');
    default: return dot(L) + dot(R);
  }
}

function hat(kind, color) {
  switch (kind) {
    case 'straw': return `<path d="M14 20 Q32 2 50 20 L46 22 Q32 12 18 22Z" fill="#e2b04a"/>
      <rect x="12" y="19" width="40" height="5" rx="2.5" fill="#c98f2c"/>
      <rect x="18" y="16" width="28" height="3" rx="1.5" fill="#e0558a"/>`;
    case 'cap': return `<path d="M15 25 Q16 9 32 9 Q48 9 49 25Z" fill="#e05252"/>
      <path d="M44 22 Q56 22 60 26 L46 27Z" fill="#b83c3c"/>
      <circle cx="32" cy="9.5" r="2" fill="#b83c3c"/>`;
    case 'beanie': return `<path d="M15 26 Q15 8 32 8 Q49 8 49 26Z" fill="#5b8def"/>
      <rect x="13.5" y="22" width="37" height="6" rx="3" fill="#3f6fd1"/>
      <path d="M21 12v10M27 9v13M33 8v14M39 9v13M45 13v9" stroke="#4a7ae0" stroke-width="1.4"/>
      <circle cx="32" cy="6" r="4" fill="#fff"/>`;
    case 'flower': return [16, 24, 32, 40, 48].map((x, i) => {
      const y = 22 - (i === 2 ? 4 : i % 4 === 0 ? 0 : 2.5);
      const petal = ['#ff7eb6', '#ffd44f', '#ffffff', '#b98cff', '#ff9f5a'][i];
      return `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a =>
        `<ellipse rx="2.3" ry="3.6" cy="-3" fill="${petal}" transform="rotate(${a})"/>`).join('')}
        <circle r="2" fill="#f5b82e"/></g>`;
    }).join('') + `<path d="M13 23 Q32 16 51 23" stroke="#5fae3f" stroke-width="2" fill="none"/>`;
    case 'sprout': return `<path d="M32 21 Q31 13 33 8" stroke="#4c9a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M33 11 Q42 3 46 10 Q39 15 33 11Z" fill="#6cc24a"/>
      <path d="M32 14 Q23 8 20 14 Q26 18 32 14Z" fill="#8fd16a"/>`;
    case 'crown': return `<path d="M18 24 L16 9 L24 16 L32 6 L40 16 L48 9 L46 24Z" fill="#f5c542" stroke="#c9961a" stroke-width="1.2" stroke-linejoin="round"/>
      <circle cx="32" cy="17" r="2.4" fill="#e0558a"/><circle cx="23.5" cy="19" r="1.7" fill="#3b82c4"/><circle cx="40.5" cy="19" r="1.7" fill="#3fa34d"/>`;
    default: return `<path d="M29 20 Q31 15 34 18" stroke="${shade(color, 0.8)}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
}

function extraUnder(kind) {
  if (kind === 'scarf') return `<path d="M15 47 Q32 57 49 47 L50 52 Q32 62 14 52Z" fill="#e05252"/>
    <path d="M40 53 L44 63 L38 62 L36 54Z" fill="#c43e3e"/>
    <path d="M18 50 L20 53 M26 53 L27 56 M34 54 L34 57 M42 52 L41 55" stroke="#fff8" stroke-width="1.5"/>`;
  return '';
}

function extraOver(kind) {
  switch (kind) {
    case 'glasses': return `<g fill="#fff3" stroke="${INK}" stroke-width="1.8">
      <circle cx="25" cy="35" r="6"/><circle cx="39" cy="35" r="6"/></g>
      <path d="M31 35h2M19 34l-5-2M45 34l5-2" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
    case 'freckles': return [[19, 39], [21.5, 41.5], [18, 42.5], [45, 39], [42.5, 41.5], [46, 42.5]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".9" fill="#b0664a"/>`).join('');
    case 'bow': return `<g transform="translate(47 22) rotate(20)"><path d="M0 0 L-7 -5 L-7 5Z M0 0 L7 -5 L7 5Z" fill="#ff5fa2"/>
      <circle r="2.2" fill="#e0408a"/></g>`;
    default: return '';
  }
}

export function milbilSVG(look, { cls = '', title = '' } = {}) {
  const c = look.color || COLORS[0];
  return `<svg class="${cls}" viewBox="0 0 64 64" role="img" aria-label="${String(title || 'Your milbil').replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`)}">
    <ellipse cx="32" cy="59" rx="17" ry="3.5" fill="#0002"/>
    <circle cx="32" cy="38" r="19" fill="${c}" stroke="${shade(c, 0.82)}" stroke-width="1.5"/>
    <ellipse cx="26" cy="29" rx="7" ry="4" fill="#fff" opacity=".35"/>
    ${extraUnder(look.extra)}
    ${eyes(look.eyes)}
    <circle cx="20" cy="42" r="3" fill="#ff8fab" opacity=".75"/>
    <circle cx="44" cy="42" r="3" fill="#ff8fab" opacity=".75"/>
    <path d="M27 43 Q32 48 37 43" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    ${hat(look.hat, c)}
    ${extraOver(look.extra)}
  </svg>`;
}
