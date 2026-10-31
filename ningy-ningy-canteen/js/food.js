// ---------- Drawing the food ----------
//
// The same flat style as the Lunchbox Simulator: one or two tones a shape, a
// white shine, a soft shadow and no outlines, all in a 64×64 box.

const SHADOW = '<ellipse cx="32" cy="57.5" rx="19" ry="3.4" fill="#0000001c"/>';
const shine = (x, y, rx = 4, ry = 2.2, rot = -25) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${x} ${y})"/>`;
let uid = 0;

// A bowl with something heaped in it. The heap goes in first so the front of
// the bowl hides its bottom edge.
const bowl = (band, heap) => `${SHADOW}
  <ellipse cx="32" cy="31" rx="24" ry="8" fill="#fffaf0"/>
  ${heap}
  <path d="M7 30 Q8 53 32 55 Q56 53 57 30 Z" fill="#ffffff"/>
  <path d="M7 30 H57 Q57 33 56.5 35 H7.5 Q7 33 7 30Z" fill="#ece6f2"/>
  <path d="M12 42 Q32 49 52 42" stroke="${band}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
  ${shine(15, 38, 1.8, 4.5, 20)}`;

function pizzaPie(rx, ry, toppings, xl = false){
  const cx = 32, cy = 36;
  const slices = [0, 45, 90, 135].map(a => {
    const t = a * Math.PI / 180, dx = Math.cos(t) * (rx - 4), dy = Math.sin(t) * (ry - 4);
    return `M${cx - dx} ${cy - dy} L${cx + dx} ${cy + dy}`;
  }).join(' ');
  return `${SHADOW}
    <ellipse cx="${cx}" cy="${cy + 2}" rx="${rx}" ry="${ry}" fill="#c98424"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#e9b25a"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 3.5}" ry="${ry - 3}" fill="#e5484d"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 5}" ry="${ry - 4.5}" fill="#ffd66b"/>
    ${toppings(cx, cy)}
    <path d="${slices}" stroke="#e9b25a" stroke-width="1.1" opacity=".75"/>
    ${shine(cx - rx * 0.45, cy - ry * 0.55, 3.4, 1.4, -15)}
    ${xl ? `<g transform="translate(9 9)"><rect x="-8" y="-6" width="17" height="12" rx="4" fill="#2f2640"/>
      <text x="0.5" y="3.4" font-size="8.5" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui, sans-serif">XL</text></g>` : ''}`;
}

/** A mushroom slice: a cap and a little stalk. */
const mushroom = (x, y) => `<g transform="translate(${x} ${y})">
  <path d="M-4.2 0.6 Q-4.2 -4 0 -4 Q4.2 -4 4.2 0.6Z" fill="#c4a07a"/>
  <rect x="-1.6" y="0.2" width="3.2" height="3.4" rx="1" fill="#ead8bb"/>
  <path d="M-3 -1 Q0 -3 3 -1" stroke="#9b7b55" stroke-width=".8" fill="none"/></g>`;

/** A tray of spring rolls, `s` big, with a sticker saying how many. */
function rollTray(at, s, label){
  const roll = (x, y) => `<g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-9.5" y="-4.6" width="19" height="9.2" rx="4.6" fill="#e9a43a"/>
    <path d="M-4.5 -4.2 v8.4 M0.5 -4.2 v8.4" stroke="#c98424" stroke-width="1.2" opacity=".6"/>
    <ellipse cx="8" cy="0" rx="2" ry="4" fill="#f7cf7a"/>
    <ellipse cx="-4.5" cy="-2.3" rx="3.2" ry="1" fill="#fff" opacity=".45"/></g>`;
  return `${SHADOW}
    <path d="M6 41 H58 L57 44 H7Z" fill="#cfe7f3"/>
    ${at.map(([x, y]) => roll(x, y)).join('')}
    <path d="M6 44 H58 L54 56 H10Z" fill="#d8eef9" opacity=".8"/>
    <circle cx="32" cy="50" r="${label.length > 1 ? 5.4 : 4.6}" fill="#ff5d6c"/>
    <text x="32" y="52.6" font-size="${label.length > 1 ? 6.6 : 7.5}" font-weight="900" text-anchor="middle" fill="#fff" font-family="system-ui, sans-serif">${label}</text>`;
}

const LOLLY = {
  raspberry:  ['#e8336d', '#ff8fb1'],
  orange:     ['#ff9f1c', '#ffd08a'],
  pineapple:  ['#ffd23f', '#fff1a8'],
  watermelon: ['#ff5d6c', '#ffb3ba'],
};

/** A round sour sucker on a stick, `r` big, in one flavour. */
function lolly(cx, cy, r, flavour, seeds = false){
  const [c, light] = LOLLY[flavour] || LOLLY.raspberry;
  const melon = flavour === 'watermelon';
  return `<rect x="${cx - 1.5}" y="${cy}" width="3" height="${56 - cy}" rx="1.5" fill="#f1e4cf"/>
    ${melon ? `<circle cx="${cx}" cy="${cy}" r="${r + 2}" fill="#3fae4a"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>
    <path d="M${cx} ${cy} m${-r * 0.55} 0 a${r * 0.55} ${r * 0.55} 0 1 1 ${r * 0.55} ${r * 0.55}" stroke="${light}" stroke-width="${r * 0.18}" fill="none" stroke-linecap="round"/>
    ${melon && seeds ? [[-6, -4], [5, -5], [-2, 6], [7, 4]].map(([x, y]) => `<ellipse cx="${cx + x}" cy="${cy + y}" rx="1" ry="1.6" fill="#2f2640"/>`).join('') : ''}
    <ellipse cx="${cx - r * 0.4}" cy="${cy - r * 0.45}" rx="${r * 0.28}" ry="${r * 0.14}" fill="#fff" opacity=".6" transform="rotate(-30 ${cx - r * 0.4} ${cy - r * 0.45})"/>`;
}

const ICONS = {
  iceblock: () => `${SHADOW}
    <rect x="28.5" y="40" width="7" height="18" rx="3.5" fill="#e3b778"/>
    <path d="M19 15 Q19 5 32 5 Q45 5 45 15 V41 Q45 46 40 46 H24 Q19 46 19 41Z" fill="#7ad37a"/>
    <path d="M19 15 Q19 5 32 5 Q45 5 45 15 V21 H19Z" fill="#ff5d8f"/>
    <rect x="19" y="21" width="26" height="11" fill="#ffd23f"/>
    ${shine(24, 13, 2, 5, 0)}`,

  // A clear tray of six: three, then two, then one on top.
  springrolls: () => rollTray([[32, 26], [24.5, 34.5], [39.5, 34.5], [17, 43], [32, 43], [47, 43]], 1, '6'),

  // A bigger tray of ten: four, three, two, one.
  springrolls10: () => rollTray([[32, 19], [26, 26.5], [38, 26.5], [20, 34], [32, 34], [44, 34],
    [14, 41.5], [26, 41.5], [38, 41.5], [50, 41.5]], 0.8, '10'),

  // Lamb kofta with honey drizzled over it and dripping off.
  honeykofta: () => `${ICONS.kofta()}
    <path d="M17 41 q4 -6 8 -3 t8 -5 t8 -6 t7 -5" stroke="#f5b82e" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".95"/>
    <path d="M24 39 q1 4 0 6 q-1 2 -2 0 q-1 -3 2 -6Z M37 30 q1 4 0 6 q-1 2 -2 0 q-1 -3 2 -6Z" fill="#f5b82e"/>
    <path d="M18 40 q4 -5 7 -3" stroke="#fff3c4" stroke-width="1" fill="none" stroke-linecap="round" opacity=".8"/>`,

  // Two pieces of nigiri: rice, with a slice of tuna on top.
  tunasushi: () => {
    const nigiri = (x, y) => `<g transform="translate(${x} ${y})">
      <rect x="-11" y="-3" width="22" height="11" rx="5" fill="#fbf8f0"/>
      <path d="M-12 -2 Q-11 -9 0 -9 Q11 -9 12 -2 Q0 1 -12 -2Z" fill="#e85a6a"/>
      <path d="M-7 -6 l3 4 M-1 -7 l3 5 M5 -6 l3 4" stroke="#f7a3ad" stroke-width="1.3" stroke-linecap="round"/>
      <ellipse cx="-5" cy="-6.5" rx="2.6" ry="1" fill="#fff" opacity=".5"/></g>`;
    return `${SHADOW}
      <rect x="5" y="42" width="54" height="9" rx="3" fill="#d6a865"/>
      <rect x="5" y="49" width="54" height="3" rx="1.5" fill="#b8874a"/>
      ${nigiri(19, 35)}${nigiri(45, 35)}`;
  },

  // A crinkly foil bag of chips with a drumstick on the front.
  chickenchips: () => `${SHADOW}
    <path d="M15 17 H49 L52 53 Q52 56 49 56 H15 Q12 56 12 53 Z" fill="#ffc531"/>
    <path d="M15 10 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 v8 h-34z" fill="#e5484d"/>
    <ellipse cx="32" cy="37" rx="12" ry="11" fill="#fff"/>
    <ellipse cx="29" cy="35" rx="7" ry="5.5" fill="#c9782f" transform="rotate(-30 29 35)"/>
    <path d="M33 39 L39 45" stroke="#f4ead8" stroke-width="3" stroke-linecap="round"/>
    <circle cx="40" cy="44" r="1.9" fill="#f4ead8"/><circle cx="38.6" cy="46.2" r="1.7" fill="#f4ead8"/>
    <path d="M17 24 h30" stroke="#e5484d" stroke-width="2" opacity=".5"/>
    ${shine(19, 30, 2.2, 6, 0)}`,

  // Four sour suckers fanned out, one of each flavour.
  sucker: () => `${SHADOW}
    ${[['raspberry', -24], ['orange', -8], ['pineapple', 8], ['watermelon', 24]].map(([f, a]) =>
      `<g transform="rotate(${a} 32 56)">${lolly(32, 22, 10.5, f)}</g>`).join('')}`,

  kofta: () => `${SHADOW}
    <path d="M9 54 L56 10" stroke="#d9b07a" stroke-width="3.2" stroke-linecap="round"/>
    <ellipse cx="31" cy="33" rx="19" ry="8.5" fill="#9a5a34" transform="rotate(-43 31 33)"/>
    <path d="M22 34 l6 6 M28 28 l6 6 M34 22 l6 6" stroke="#6e3c1f" stroke-width="2.4" stroke-linecap="round"/>
    <g fill="#5fae3a"><circle cx="25" cy="31" r="1.3"/><circle cx="35" cy="34" r="1.2"/><circle cx="30" cy="25" r="1.1"/><circle cx="38" cy="27" r="1.3"/></g>
    ${shine(26, 28, 4, 1.8, -43)}`,

  beefbowl: () => bowl('#e5484d', `
    <g fill="#8b4a2b">
      <rect x="15" y="21" width="14" height="6" rx="3" transform="rotate(-12 22 24)"/>
      <rect x="28" y="19" width="15" height="6" rx="3" transform="rotate(8 35 22)"/>
      <rect x="22" y="25" width="14" height="6" rx="3" transform="rotate(4 29 28)"/>
      <rect x="38" y="24" width="12" height="6" rx="3" transform="rotate(-10 44 27)"/>
    </g>
    <g fill="#6cc24a"><circle cx="20" cy="29" r="1.6"/><circle cx="33" cy="21" r="1.5"/><circle cx="43" cy="30" r="1.6"/><circle cx="37" cy="26" r="1.3"/></g>`),

  veggiebowl: () => bowl('#3fae4a', `
    <g fill="#3f9a2a"><circle cx="20" cy="24" r="5"/><circle cx="25" cy="21" r="4.5"/><circle cx="17" cy="21" r="3.5"/></g>
    <rect x="20" y="25" width="3" height="6" fill="#6cc24a"/>
    <g fill="#ff8a2a"><circle cx="34" cy="25" r="4"/><circle cx="41" cy="22" r="4"/></g>
    <g fill="#ffb877"><circle cx="34" cy="25" r="1.6"/><circle cx="41" cy="22" r="1.6"/></g>
    <g fill="#ffd23f"><circle cx="45" cy="28" r="1.8"/><circle cx="48" cy="25" r="1.8"/><circle cx="43" cy="31" r="1.7"/><circle cx="28" cy="29" r="1.7"/></g>
    <circle cx="30" cy="20" r="3.6" fill="#e5484d"/>`),

  // Pizzas: a whole one seen from a little above, with slice lines.
  pizza: () => pizzaPie(24, 18, (cx, cy) => [[-9, -5], [8, -7], [0, 3], [-12, 6], [11, 5], [2, -12]]
    .map(([x, y]) => `<circle cx="${cx + x}" cy="${cy + y}" r="3.6" fill="#c8423b"/><circle cx="${cx + x - 1}" cy="${cy + y - 1}" r="1" fill="#e8705f"/>`).join('')),

  mushroompizza: () => pizzaPie(24, 18, (cx, cy) => [[-10, -5], [7, -8], [-1, 3], [11, 4], [-11, 6], [3, -13]]
    .map(([x, y]) => mushroom(cx + x, cy + y)).join('')),

  xlpizza: () => pizzaPie(29, 21, (cx, cy) => [[-13, -6], [0, -13], [12, -7], [-5, 2], [9, 4], [-15, 7], [2, 12], [17, 2]]
    .map(([x, y], i) => i % 3 === 2 ? mushroom(cx + x, cy + y)
      : `<circle cx="${cx + x}" cy="${cy + y}" r="3.6" fill="#c8423b"/><circle cx="${cx + x - 1}" cy="${cy + y - 1}" r="1" fill="#e8705f"/>`).join('') +
    [[-8, 9], [6, -3], [14, -12]].map(([x, y]) => `<circle cx="${cx + x}" cy="${cy + y}" r="2" fill="#3a3044"/><circle cx="${cx + x}" cy="${cy + y}" r=".8" fill="#fde5a0"/>`).join(''),
    true),

  sushi: () => {
    const piece = (x, y) => `<g transform="translate(${x} ${y})">
      <circle r="12.5" fill="#22302d"/><circle r="10" fill="#fbf8f0"/>
      <circle r="4.8" fill="#7cc04a"/><circle r="2.4" fill="#b6e07a"/>
      <circle cx="-5.5" cy="-4" r="1" fill="#ece5d6"/><circle cx="5" cy="5" r="1" fill="#ece5d6"/></g>`;
    return `${SHADOW}
      <rect x="5" y="42" width="54" height="9" rx="3" fill="#d6a865"/>
      <rect x="5" y="49" width="54" height="3" rx="1.5" fill="#b8874a"/>
      ${piece(20, 31)}${piece(44, 31)}
      ${shine(15, 24, 2.4, 1.3)}${shine(39, 24, 2.4, 1.3)}`;
  },

  juice: () => `${SHADOW}
    <path d="M36 15 L38 4 L45 2" stroke="#ff5d8f" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 17 L24 12 H49 L43 17Z" fill="#ffc06a"/>
    <path d="M43 17 L49 12 V51 L43 56Z" fill="#e07f00"/>
    <rect x="18" y="17" width="25" height="39" rx="2" fill="#ff9f1c"/>
    <rect x="21" y="27" width="19" height="19" rx="4" fill="#fff"/>
    <circle cx="30.5" cy="37" r="6" fill="#ff9f1c"/>
    <path d="M30.5 31 q4 -4 7 -1 q-3 3 -7 1Z" fill="#4e9a33"/>
    ${shine(22, 22, 1.6, 3, 0)}`,

  popcake: () => `${SHADOW}
    <rect x="30.5" y="30" width="3" height="27" rx="1.5" fill="#f1e4cf"/>
    <path d="M27 36 q5 4 10 0 l-1 4 q-4 2 -8 0Z" fill="#9b5de5"/>
    <circle cx="32" cy="21" r="14" fill="#ff7eb6"/>
    <path d="M18.5 20 Q20 10 32 7 Q44 10 45.5 20 Q42 17 39 21 Q36 17 32 21 Q28 17 25 21 Q22 17 18.5 20Z" fill="#fff0f7"/>
    <g stroke-width="2" stroke-linecap="round">
      <path d="M23 25 l2 -1" stroke="#ffd23f"/><path d="M30 29 l2 1" stroke="#38b6ff"/>
      <path d="M38 26 l2 -1.5" stroke="#3fae4a"/><path d="M27 15 l1.5 1" stroke="#e5484d"/>
      <path d="M36 13 l2 0" stroke="#38b6ff"/><path d="M41 18 l1 1.5" stroke="#ffd23f"/></g>
    ${shine(26, 12, 3, 1.6)}`,

  waffle: () => {
    const id = `wf${++uid}`;
    const grid = [17, 23, 29, 35, 41, 47].map(x => `<path d="M${x} 6 V36" />`).join('') +
      [12, 18, 24, 30].map(y => `<path d="M12 ${y} H52" />`).join('');
    return `${SHADOW}
      <defs><clipPath id="${id}"><path d="M14 30 Q12 7 32 6 Q52 7 50 30Z"/></clipPath></defs>
      <path d="M14 30 Q12 7 32 6 Q52 7 50 30Z" fill="#e6a94a"/>
      <g clip-path="url(#${id})" stroke="#c98424" stroke-width="2.4" fill="none">${grid}</g>
      <path d="M22 13 q4 -6 9 -2 q5 -5 9 1 q2 4 -3 5 h-13 q-4 -1 -2 -4Z" fill="#fff"/>
      <circle cx="31" cy="9.5" r="3.4" fill="#e5484d"/><path d="M30 6.5 l1 -2 l1.5 2Z" fill="#4e9a33"/>
      <path d="M11 30 H53 L48 56 H16Z" fill="#fff4e2"/>
      <path d="M11 30 H53 L52 36 H12Z" fill="#ff7a59"/>
      <path d="M22 44 h20" stroke="#ffd5c8" stroke-width="2.6" stroke-linecap="round"/>
      ${shine(18, 18, 1.8, 4, 10)}`;
  },
};

/** A 64×64 SVG of one thing you sell. */
/**
 * A 64×64 SVG of one thing you sell. A Sour Sucker can be drawn as one
 * particular flavour.
 */
export function foodSVG(id, cls = 'food', flavour = null){
  const inner = id === 'sucker' && flavour ? `${SHADOW}${lolly(32, 25, 15, flavour, true)}` : ICONS[id]?.() || '';
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}
