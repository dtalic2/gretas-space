// ---------- Drawing milbils ----------
//
// Milbils are drawn the way Greta draws them: a tall box with a line across the
// middle — face on top, tummy below — stick arms, stick legs, and a bright
// glowing outline. A Common Milbil is exactly that and nothing else. Every other
// kind is the same milbil plus one or two features: a hat, different eyes, teeth,
// something to hold.
//
// Petal and Sunny aren't drawn here at all. They are Greta's own drawings, cut
// out into art/ (and so are the milbils who run the other cafés).
//
// Copied from Milbil GO, plus a chef's hat and an apron for you.

const INK = '#2b2233';
const LINE = `stroke="${INK}" fill="none" stroke-linecap="round"`;   // an ink line
const EDGE = `stroke="${INK}"`;                                        // an ink outline
let uid = 0;

const esc = (s) => String(s).replace(/[&<>"]/g, ch => `&#${ch.charCodeAt(0)};`);

function eyes(kind){
  const L = 31, R = 49, Y = 33;
  const dot = (x) => `<circle cx="${x}" cy="${Y}" r="3.3" fill="${INK}"/><circle cx="${x + 1.1}" cy="${Y - 1.1}" r="1.1" fill="#fff"/>`;
  const up = (x) => `<path d="M${x - 4} ${Y + 1.5} Q${x} ${Y - 4.5} ${x + 4} ${Y + 1.5}" ${LINE} stroke-width="2.4"/>`;
  switch (kind){
    case 'happy':  return up(L) + up(R);
    case 'sleepy': return [L, R].map(x => `<path d="M${x - 4} ${Y} Q${x} ${Y + 4} ${x + 4} ${Y}" ${LINE} stroke-width="2.4"/>`).join('');
    case 'wink':   return dot(L) + up(R);
    case 'sparkle':return [L, R].map(x => `<circle cx="${x}" cy="${Y}" r="4.6" fill="${INK}"/><circle cx="${x + 1.5}" cy="${Y - 1.5}" r="1.6" fill="#fff"/><circle cx="${x - 1.5}" cy="${Y + 1.7}" r=".9" fill="#fff"/>`).join('');
    case 'big':    return [L, R].map(x => `<ellipse cx="${x}" cy="${Y}" rx="6" ry="7.5" fill="#fff" ${EDGE} stroke-width="2"/><circle cx="${x + 1}" cy="${Y + 1.5}" r="2.6" fill="${INK}"/>`).join('');
    case 'cross':  return dot(L) + dot(R) +
      `<path d="M${L - 5} ${Y - 7} L${L + 4} ${Y - 4} M${R + 5} ${Y - 7} L${R - 4} ${Y - 4}" ${LINE} stroke-width="2.4"/>`;
    default:       return dot(L) + dot(R);
  }
}

function mouth(kind){
  switch (kind){
    case 'open':  return `<path d="M34 41 Q40 41 46 41 Q45 48 40 48 Q35 48 34 41Z" fill="${INK}"/><path d="M37 46 Q40 44 43 46 Q42 48 40 48 Q38 48 37 46Z" fill="#ff7b9c"/>`;
    case 'teeth': return `<path d="M31 41 H49" ${LINE} stroke-width="2.4"/>
      <rect x="33.5" y="41" width="5" height="6" rx="1" fill="#fff" ${EDGE} stroke-width="1.6"/>
      <rect x="41.5" y="41" width="5" height="6" rx="1" fill="#fff" ${EDGE} stroke-width="1.6"/>`;
    default:      return `<path d="M35 41 Q40 46 45 41" ${LINE} stroke-width="2.4"/>`;
  }
}

function hat(kind){
  switch (kind){
    case 'sprout': return `<path d="M40 20 Q39 12 41 7" stroke="#3f9a2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M41 10 Q50 2 54 9 Q47 14 41 10Z" fill="#6cc24a"/><path d="M40 13 Q31 7 28 13 Q34 17 40 13Z" fill="#8fd16a"/>`;
    case 'straw':  return `<path d="M22 19 Q40 1 58 19Z" fill="#e8b84f"/><rect x="14" y="17" width="52" height="5" rx="2.5" fill="#c98f2c"/>
      <rect x="25" y="14" width="30" height="3.4" rx="1.7" fill="#e0558a"/>`;
    case 'cap':    return `<path d="M20 21 Q20 6 40 6 Q60 6 60 21Z" fill="#e05252"/><path d="M54 18 Q68 17 72 22 L56 23Z" fill="#b83c3c"/>
      <circle cx="40" cy="6.5" r="2.2" fill="#b83c3c"/>`;
    case 'beanie': return `<path d="M20 22 Q20 4 40 4 Q60 4 60 22Z" fill="#5b8def"/><rect x="18" y="18" width="44" height="6" rx="3" fill="#3f6fd1"/>
      <circle cx="40" cy="3" r="4.4" fill="#fff"/>`;
    case 'crown':  return `<path d="M24 21 L22 5 L31 12 L40 2 L49 12 L58 5 L56 21Z" fill="#f5c542" stroke="#c9961a" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="40" cy="14" r="2.6" fill="#e0558a"/><circle cx="30.5" cy="16" r="1.9" fill="#3b82c4"/><circle cx="49.5" cy="16" r="1.9" fill="#3fa34d"/>`;
    case 'flowers': return [20, 30, 40, 50, 60].map((x, i) => {
      const y = 18 - (i === 2 ? 4 : i % 4 === 0 ? 0 : 2.5);
      const petal = ['#ff7eb6', '#ffd44f', '#ffffff', '#b98cff', '#ff9f5a'][i];
      return `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map(a =>
        `<ellipse rx="2.6" ry="4" cy="-3.4" fill="${petal}" transform="rotate(${a})"/>`).join('')}<circle r="2.3" fill="#f5b82e"/></g>`;
    }).join('');
    case 'party':  return `<path d="M30 21 L40 -1 L50 21Z" fill="#ff9f1c"/><path d="M33 14 L47 14 M36 7 L44 7" stroke="#fff" stroke-width="2.2"/>
      <circle cx="40" cy="-1" r="3.4" fill="#ff4d6d"/>`;
    case 'wizard': return `<path d="M24 21 Q36 12 40 -4 Q46 10 58 21Z" fill="#5a4fcf"/><rect x="18" y="18" width="44" height="5" rx="2.5" fill="#463ab0"/>
      <path d="M40 9 l1.4 3 3.2.3 -2.4 2.1.7 3.2 -2.9-1.7 -2.9 1.7.7-3.2 -2.4-2.1 3.2-.3Z" fill="#ffd44f"/>`;
    case 'chef':   return `<path d="M25 21 V12 Q16 10 19 2 Q23 -6 31 -3 Q35 -11 44 -8 Q52 -11 55 -2 Q63 -4 63 4 Q64 11 55 12 V21Z" fill="#fff" ${EDGE} stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M25 16 H55" stroke="#d9d4e6" stroke-width="2"/><path d="M33 4 Q34 9 33 12 M45 2 Q46 7 45 12" stroke="#e6e1f0" stroke-width="1.6" fill="none"/>`;
    default: return '';
  }
}

function extraBehind(kind){
  if (kind === 'cape') return `<path d="M20 50 L10 92 Q40 98 70 92 L60 50Z" fill="#d6304f" opacity=".95"/>`;
  return '';
}

function extraFront(kind){
  switch (kind){
    case 'freckles': return [[24, 40], [27, 42.5], [23, 43.5], [56, 40], [53, 42.5], [57, 43.5]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#c0704f"/>`).join('');
    case 'glasses':  return `<g fill="#fff4" ${EDGE} stroke-width="2"><circle cx="31" cy="33" r="6.5"/><circle cx="49" cy="33" r="6.5"/></g>
      <path d="M37.5 33h5M24.5 32l-6-2M55.5 32l6-2" ${LINE} stroke-width="2"/>`;
    case 'bow':      return `<g transform="translate(57 21) rotate(18)"><path d="M0 0 L-8 -6 L-8 6Z M0 0 L8 -6 L8 6Z" fill="#ff5fa2"/><circle r="2.6" fill="#e0408a"/></g>`;
    case 'apron':    return `<path d="M24 50 L28 53 L52 53 L56 50" stroke="#ff8fb1" stroke-width="1.8" fill="none"/>
      <rect x="27" y="53" width="26" height="24" rx="3" fill="#fff" stroke="#ff8fb1" stroke-width="1.8"/>
      <rect x="34" y="64" width="12" height="7" rx="1.5" fill="none" stroke="#ff8fb1" stroke-width="1.5"/>`;
    case 'scarf':    return `<path d="M16 47 H64 V54 H16Z" fill="#e05252"/><path d="M52 54 L56 66 L49 65 L47 54Z" fill="#c43e3e"/>
      <path d="M22 47v7M30 47v7M38 47v7M46 47v7" stroke="#fff8" stroke-width="1.6"/>`;
    default: return '';
  }
}

function held(kind){
  switch (kind){
    case 'icecream': return `<path d="M68 38 L73 52 L78 38Z" fill="#e8b25c" stroke="#b9822f" stroke-width="1"/>
      <circle cx="73" cy="35" r="5.2" fill="#ff9ec4"/><circle cx="73" cy="29" r="4.2" fill="#9fe0b4"/><circle cx="74.5" cy="24.5" r="1.6" fill="#e0353c"/>`;
    case 'balloon': return `<path d="M72 36 Q76 22 72 12" stroke="#777" stroke-width="1" fill="none"/>
      <ellipse cx="72" cy="4" rx="8" ry="10" fill="#ff4d6d"/><ellipse cx="69" cy="0" rx="2.4" ry="3.4" fill="#fff6"/>`;
    default: return '';
  }
}

function badge(kind){
  if (kind === 'star') return `<path d="M40 56 l2.6 5.3 5.8.8 -4.2 4.1 1 5.8 -5.2-2.7 -5.2 2.7 1-5.8 -4.2-4.1 5.8-.8Z" fill="#ffc93c" stroke="#e0a000" stroke-width="1"/>`;
  return '';
}

/** SVG markup for a look. `walk` adds classes the CSS animates. */
export function drawLook(look = {}, { cls = '', title = '' } = {}){
  const id = `mb${++uid}`;
  const rainbow = look.line === 'rainbow';
  const line = rainbow ? `url(#${id}r)` : (look.line || '#8b7bff');
  const fill = look.fill || '#ffffff';
  const defs = rainbow ? `<defs><linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4d6d"/><stop offset=".25" stop-color="#ffb000"/><stop offset=".5" stop-color="#3fae4a"/>
      <stop offset=".75" stop-color="#2f80ed"/><stop offset="1" stop-color="#9b5de5"/></linearGradient></defs>` : '';
  const legs = look.ghost
    ? `<path d="M18 80 q5 8 11 0 q5 8 11 0 q5 8 11 0 q5 8 11 0" fill="${fill}" stroke="${line}" stroke-width="2.6" stroke-linejoin="round"/>`
    : `<g class="legs" stroke="${line}" stroke-width="3" stroke-linecap="round" fill="none">
        <path class="leg l" d="M31 80 L30 93 L25 94"/><path class="leg r" d="M49 80 L50 93 L55 94"/></g>`;
  return `<svg class="milbil ${cls}" viewBox="-4 -8 88 106" role="img" aria-label="${esc(title || 'milbil')}"${look.ghost ? ' style="opacity:.82"' : ''}>
    ${defs}
    <ellipse cx="40" cy="95" rx="20" ry="3.5" fill="#0002"/>
    ${extraBehind(look.extra)}
    <g class="arms" stroke="${line}" stroke-width="3" stroke-linecap="round" fill="none">
      <path class="arm l" d="M18 50 L9 40 M9 40 l-4 -3 M9 40 l-1 -5"/>
      <path class="arm r" d="M62 50 L71 40 M71 40 l4 -3 M71 40 l1 -5"/></g>
    ${legs}
    <rect x="18" y="20" width="44" height="60" rx="4" fill="none" stroke="${line}" stroke-width="7" opacity=".28"/>
    <rect x="18" y="20" width="44" height="60" rx="4" fill="${fill}" stroke="${line}" stroke-width="2.8"/>
    <path d="M18 50 H62" stroke="${line}" stroke-width="2.4"/>
    <ellipse cx="27" cy="27" rx="5" ry="2.4" fill="#fff" opacity=".6"/>
    <circle cx="24" cy="41" r="2.8" fill="#ff8fab" opacity=".55"/><circle cx="56" cy="41" r="2.8" fill="#ff8fab" opacity=".55"/>
    ${eyes(look.eyes)}
    ${mouth(look.mouth)}
    ${badge(look.badge)}
    ${extraFront(look.extra)}
    ${hat(look.hat)}
    ${held(look.hold)}
  </svg>`;
}

/** Markup for a customer — SVG for drawn kinds, Greta's picture for the rest. */
export function customerHTML(c, opts = {}){
  if (c.art) return `<img class="milbil art ${opts.cls || ''}" src="${c.art}" alt="${esc(c.name)}" draggable="false">`;
  return drawLook(c.look, { ...opts, title: opts.title || c.name });
}

/** A picture of somebody from art/, sized like a drawn milbil. */
export const artHTML = (src, name, cls = '') =>
  `<img class="milbil art ${cls}" src="${src}" alt="${esc(name)}" draggable="false">`;
