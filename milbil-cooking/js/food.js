// ---------- Drawing food ----------
//
// Everything is flat: one or two tones per shape, a white shine, a soft shadow
// and no outlines, sat on a soft coloured card. Ingredients are drawn whole for
// the shelf; once they've been cooked they're drawn as a "look" (pieces, a
// blob, a drizzle…) that stacks up on the dish. The menu pictures are made the
// same way from the whole recipe, so what you cook looks like what's on the menu.

import { ING, DISH, lookFor } from './data.js';

const SHADOW = '<ellipse cx="32" cy="57.5" rx="21" ry="3.6" fill="#0000001c"/>';
const shine = (x, y, rx = 4, ry = 2.2, rot = -25) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(${rot} ${x} ${y})"/>`;

// ------------------------------------------------------- packet shapes ---

function bag(body, dark, inner){
  return `${SHADOW}
    <path d="M14 17 H50 L53 53 Q53 56 50 56 H14 Q11 56 11 53 Z" fill="${body}"/>
    <path d="M14 11 h36 v7 h-36z" fill="${dark}"/>
    <path d="M14 11 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 l3 -3 l3 3 v1 h-36z" fill="${dark}"/>
    <circle cx="32" cy="37" r="12" fill="#fff"/>
    <g transform="translate(32 37)">${inner}</g>
    ${shine(19, 26, 2.5, 7, 0)}`;
}

function jar(body, lid, inner, glass = false){
  return `${SHADOW}
    <rect x="15" y="19" width="34" height="37" rx="8" fill="${body}" ${glass ? 'opacity=".9"' : ''}/>
    <rect x="17" y="11" width="30" height="10" rx="3" fill="${lid}"/>
    <rect x="17" y="17.5" width="30" height="3" fill="#0000001a"/>
    <rect x="20" y="29" width="24" height="18" rx="5" fill="#fff"/>
    <g transform="translate(32 38)">${inner}</g>
    ${shine(20, 26, 2, 4, 0)}`;
}

function bottle(body, cap, inner){
  return `${SHADOW}
    <rect x="27" y="4" width="10" height="7" rx="2" fill="${cap}"/>
    <path d="M28 10 h8 v6 q11 4 11 13 v22 q0 5 -5 5 h-20 q-5 0 -5 -5 v-22 q0 -9 11 -13 Z" fill="${body}"/>
    <rect x="20" y="33" width="24" height="15" rx="4" fill="#fff"/>
    <g transform="translate(32 40.5)">${inner}</g>
    ${shine(21, 28, 2, 4, 0)}`;
}

function squeezy(body, cap){
  return `${SHADOW}
    <path d="M29.5 2 h5 l1 8 h-7z" fill="${cap}"/>
    <path d="M24 10 h16 l-2 8 h-12z" fill="${cap}"/>
    <rect x="19" y="17" width="26" height="40" rx="9" fill="${body}"/>
    ${shine(25, 27, 2.2, 6, 0)}`;
}

function carton(face, side, label){
  return `${SHADOW}
    <path d="M16 23 L27 12 L38 23 Z" fill="${face}"/>
    <path d="M27 12 L37 7 L48 18 L38 23 Z" fill="${side}"/>
    <rect x="16" y="23" width="22" height="34" fill="${face}"/>
    <path d="M38 23 L48 18 V52 L38 57 Z" fill="${side}"/>
    <rect x="18" y="31" width="18" height="16" rx="3" fill="${label}"/>
    <circle cx="31" cy="14.5" r="2.6" fill="${label}"/>
    ${shine(20, 27, 1.6, 3, 0)}`;
}

// ------------------------------------------------------------- icons ---

const ICONS = {
  bread: () => `${SHADOW}
    <path d="${BREAD_OUT}" fill="#c98a4b"/>
    <path d="${BREAD_IN}" fill="#f7dfac"/>
    ${shine(24, 22, 4, 2)}`,

  butter: () => `${SHADOW}
    <path d="M9 32 L19 23 H55 L46 32 Z" fill="#fbe78e"/>
    <rect x="9" y="32" width="37" height="22" fill="#f5d65e"/>
    <path d="M46 32 L55 23 V45 L46 54 Z" fill="#e3bf3c"/>
    <rect x="9" y="38" width="37" height="9" fill="#fff" opacity=".85"/>
    <path d="M46 38 L55 29 V38 L46 47 Z" fill="#fff" opacity=".6"/>`,

  jam: () => jar('#d93a55', '#f4ede2', `<path d="M0 -5 Q5 -6 5 0 Q4 5 0 7 Q-4 5 -5 0 Q-5 -6 0 -5Z" fill="#e0405a"/><path d="M-3 -6 l3 2 l3 -2" stroke="#4caf50" stroke-width="2" fill="none" stroke-linecap="round"/>`),

  nachos: () => bag('#ff9f1c', '#e07a00', `<path d="M-7 5 L0 -7 L7 5 Z" fill="#f7c443"/><circle cx="-1" cy="1" r="1" fill="#e9a92a"/><circle cx="2" cy="-2" r="1" fill="#e9a92a"/>`),

  avocado: () => `${SHADOW}
    <path d="M32 6 C21 6 18 22 14 32 C9 45 17 57 32 57 C47 57 55 45 50 32 C46 22 43 6 32 6Z" fill="#3e7d32"/>
    <path d="M32 11 C24 11 22 24 18.5 33 C15 43 21 53 32 53 C43 53 49 43 45.5 33 C42 24 40 11 32 11Z" fill="#c4e37a"/>
    <path d="M32 18 C27 18 25 27 23 33 C21 41 25 48 32 48 C39 48 43 41 41 33 C39 27 37 18 32 18Z" fill="#dff0a0" opacity=".7"/>
    <circle cx="32" cy="39" r="8.5" fill="#8a5a2b"/>${shine(29.5, 36, 2.2, 1.4)}`,

  onion: () => `${SHADOW}
    <path d="M32 7 C30 16 13 22 13 39 C13 51 21 57 32 57 C43 57 51 51 51 39 C51 22 34 16 32 7Z" fill="#a8519f"/>
    <path d="M32 12 C31 20 22 26 22 40 C22 50 26 55 32 55" stroke="#c97fc1" stroke-width="2.4" fill="none"/>
    <path d="M32 12 C33 20 42 26 42 40 C42 50 38 55 32 55" stroke="#c97fc1" stroke-width="2.4" fill="none"/>
    <path d="M28 56 l-2 3 M32 57 v3 M36 56 l2 3" stroke="#d9c39a" stroke-width="1.6" stroke-linecap="round"/>
    ${shine(22, 32, 2.4, 5, 15)}`,

  strawberry: () => `${SHADOW}
    <path d="M32 16 C42 13 53 18 52 30 C51 42 40 54 32 57 C24 54 13 42 12 30 C11 18 22 13 32 16Z" fill="#ef4b5f"/>
    ${[[24, 28], [32, 26], [40, 28], [21, 37], [29, 35], [37, 36], [44, 36], [26, 44], [34, 45], [40, 43], [31, 51]]
      .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="1" ry="1.6" fill="#ffd56b"/>`).join('')}
    <path d="M32 18 L22 13 L28 12 L26 6 L32 10 L38 6 L36 12 L42 13 Z" fill="#4caf50"/>
    ${shine(20, 24, 2.5, 4, 30)}`,

  banana: () => `${SHADOW}
    <path d="M12 21 C14 44 30 56 50 50 C54 49 55 46 52 45 C35 47 23 37 19 18 C18 14 12 15 12 21Z" fill="#f7d34a"/>
    <path d="M17 26 C22 41 33 48 49 47" stroke="#e8b72a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M13 21 C12 15 17 13 19 17 L18 12 L15 12 Z" fill="#7b5a2e"/>
    <circle cx="51.5" cy="47.5" r="2" fill="#7b5a2e"/>
    ${shine(18, 30, 1.8, 5, -20)}`,

  blueberries: () => `${SHADOW}
    ${[[24, 40, 10], [40, 41, 10], [32, 27, 10], [32, 47, 8.5]].map(([x, y, r]) => `
      <circle cx="${x}" cy="${y}" r="${r}" fill="#4a5fc1"/>
      <circle cx="${x}" cy="${y}" r="${r}" fill="#2f3f8f" opacity=".25" transform="translate(2 2)"/>
      <path d="M${x - 2.5} ${y - r + 3} l2.5 2 l2.5 -2" stroke="#24316f" stroke-width="1.6" fill="none"/>
      ${shine(x - r / 2.6, y - r / 2.4, 2, 1.3)}`).join('')}`,

  milk: () => carton('#f4f8ff', '#cfe0f7', '#5fa8f5'),

  batter: () => `${SHADOW}
    <path d="M14 22 H44 L42 54 Q42 56 40 56 H18 Q16 56 16 54 Z" fill="#cfe6ff"/>
    <path d="M44 26 Q56 27 55 37 Q54 46 43 47" stroke="#cfe6ff" stroke-width="5" fill="none"/>
    <path d="M14 22 L8 18 L17 18 Z" fill="#cfe6ff"/>
    <ellipse cx="29" cy="23" rx="15" ry="3.6" fill="#f2c776"/>
    <rect x="16" y="28" width="26" height="25" rx="2" fill="#f2c776" opacity=".85"/>
    ${shine(21, 36, 1.6, 6, 0)}`,

  syrup: () => bottle('#b5651d', '#7a3f10', `<path d="M-6 -2 h12 v4 h-12z" fill="#e9b366"/><path d="M-5 -2 q5 4 10 0" stroke="#b5651d" stroke-width="2" fill="none"/>`),

  cocoa: () => jar('#6b3e26', '#e2a868', `<ellipse rx="5.5" ry="3.5" fill="#8a5634"/><path d="M-4 0 h8" stroke="#5a321c" stroke-width="1.2"/>`),

  marshmallow: () => bag('#ffb3cf', '#f58ab2', `<rect x="-8" y="-5" width="8" height="8" rx="2" fill="#ffd8e7"/><rect x="0" y="-2" width="8" height="8" rx="2" fill="#fff" stroke="#f3d1de" stroke-width="1"/>`),

  lettuce: () => `${SHADOW}
    <circle cx="32" cy="36" r="21" fill="#5ea444"/>
    <path d="M14 34 Q16 18 32 16 Q48 18 50 34 Q46 26 40 30 Q36 22 32 28 Q28 22 24 30 Q18 26 14 34Z" fill="#8fd16a"/>
    <path d="M17 44 Q22 32 32 32 Q42 32 47 44 Q44 52 32 56 Q20 52 17 44Z" fill="#7cc35a"/>
    <path d="M32 33 V54 M32 42 L25 37 M32 42 L39 37 M32 49 L26 45 M32 49 L38 45" stroke="#c8ec9f" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,

  tomato: () => `${SHADOW}
    <ellipse cx="32" cy="37" rx="21" ry="19" fill="#e8443a"/>
    <ellipse cx="38" cy="40" rx="15" ry="14" fill="#c9302a" opacity=".35"/>
    <path d="M32 19 L25 15 L29 21 L22 23 L30 24 L32 29 L34 24 L42 23 L35 21 L39 15 Z" fill="#3f9a2a"/>
    <path d="M32 19 V13" stroke="#3f9a2a" stroke-width="2.4" stroke-linecap="round"/>
    ${shine(22, 30, 3.5, 2.2)}`,

  cucumber: () => `${SHADOW}
    <g transform="rotate(-30 32 34)">
      <rect x="8" y="26" width="48" height="17" rx="8.5" fill="#4e9a3b"/>
      <rect x="8" y="34" width="48" height="9" rx="4.5" fill="#3d7f2e"/>
      ${[16, 25, 34, 43].map(x => `<circle cx="${x}" cy="30" r="1" fill="#a6d98a"/>`).join('')}
      <ellipse cx="53" cy="34.5" rx="3.5" ry="7.5" fill="#d8efb0"/>
    </g>`,

  dressing: () => bottle('#efe6c2', '#5ea444', `<path d="M-5 2 Q0 -8 5 2" fill="#7cc35a"/><circle cx="0" cy="3" r="1.4" fill="#5ea444"/>`),

  hotdogbun: () => `${SHADOW}
    <rect x="6" y="28" width="52" height="22" rx="11" fill="#c98a3f"/>
    <rect x="6" y="25" width="52" height="20" rx="10" fill="#e9b66c"/>
    <path d="M12 34 Q32 30 52 34" stroke="#c98a3f" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${shine(18, 29, 5, 1.6, 0)}`,

  sausage: () => `${SHADOW}
    <g transform="rotate(-12 32 34)">
      <rect x="6" y="26" width="52" height="15" rx="7.5" fill="#d16d4c"/>
      <rect x="6" y="33" width="52" height="8" rx="4" fill="#9c3f2a" opacity=".45"/>
      <path d="M5 33 l-3 -2 M5 33 l-3 2 M59 33 l3 -2 M59 33 l3 2" stroke="#9c3f2a" stroke-width="1.6" stroke-linecap="round"/>
      ${shine(18, 29.5, 6, 1.4, 0)}
    </g>`,

  ketchup: () => squeezy('#e0362e', '#f4f1ea'),
  mustard: () => squeezy('#f5c518', '#d93b2f'),

  bun: () => `${SHADOW}
    <rect x="9" y="42" width="46" height="12" rx="6" fill="#c98a3f"/>
    <rect x="9" y="40" width="46" height="10" rx="5" fill="#e9b66c"/>
    <path d="M9 36 Q9 14 32 14 Q55 14 55 36 Z" fill="#e9b66c"/>
    <rect x="9" y="33" width="46" height="4" rx="2" fill="#c98a3f"/>
    ${[[22, 22], [30, 19], [38, 21], [44, 27], [26, 28], [35, 27], [18, 29]].map(([x, y]) =>
      `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="1" fill="#fff6dc" transform="rotate(${(x * 7) % 40 - 20} ${x} ${y})"/>`).join('')}
    ${shine(18, 21, 3, 1.6)}`,

  patty: () => `${SHADOW}
    <ellipse cx="32" cy="42" rx="24" ry="10" fill="#5e3620"/>
    <ellipse cx="32" cy="37" rx="24" ry="10" fill="#8a5636"/>
    <path d="M19 34 l10 6 M27 31 l12 7 M37 30 l9 6" stroke="#5e3620" stroke-width="2.4" stroke-linecap="round"/>`,

  cheese: () => `${SHADOW}
    <path d="M8 40 L44 18 L56 30 V50 L8 50 Z" fill="#e7b520"/>
    <path d="M8 40 L44 18 L56 30 L20 46 Z" fill="#f9d653"/>
    <path d="M20 46 L56 30 V50 L20 54 Z" fill="#f2c735"/>
    <path d="M8 40 L20 46 V54 L8 50 Z" fill="#e2ac18"/>
    <ellipse cx="33" cy="47" rx="3" ry="2.6" fill="#e2ac18"/><ellipse cx="46" cy="41" rx="2.4" ry="2" fill="#e2ac18"/>
    <ellipse cx="36" cy="30" rx="2.6" ry="1.4" fill="#e7b520"/>`,

  spaghetti: () => `${SHADOW}
    <g transform="rotate(-35 32 33)">
      ${[24, 27, 30, 33, 36, 39].map(x => `<rect x="${x}" y="4" width="2.2" height="54" rx="1.1" fill="${x % 2 ? '#f3d27a' : '#e6bd5a'}"/>`).join('')}
      <rect x="21" y="26" width="22" height="9" rx="2" fill="#4c7df0"/>
    </g>`,

  tomsauce: () => jar('#d7312e', '#2f7d3a', `<circle r="5.5" fill="#e8443a"/><path d="M-3 -5 l3 2 l3 -2" stroke="#3f9a2a" stroke-width="1.8" fill="none"/>`),

  herbs: () => `${SHADOW}
    <path d="M32 58 C31 46 33 34 31 18" stroke="#3f7f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${[[31, 16, 0, 9], [24, 26, -40, 8], [39, 28, 40, 8], [23, 40, -50, 8.5], [40, 42, 50, 8.5]].map(([x, y, r, s]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${s * 0.62}" ry="${s}" fill="${r ? '#4caf50' : '#6cc24a'}" transform="rotate(${r} ${x} ${y})"/>
       <path d="M${x} ${y - s + 2} V${y + s - 2}" stroke="#a9e08a" stroke-width="1" transform="rotate(${r} ${x} ${y})"/>`).join('')}`,

  tacoshell: () => `${SHADOW}
    <path d="M8 40 Q8 14 32 14 Q56 14 56 40 Z" fill="#d9a53a"/>
    <path d="M12 46 Q12 18 32 18 Q52 18 52 46 Z" fill="#f3c552"/>
    ${[[22, 30], [30, 24], [40, 28], [44, 38], [26, 40], [35, 36]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="1.4" fill="#d9a53a"/>`).join('')}
    <rect x="8" y="44" width="48" height="4" rx="2" fill="#d9a53a"/>`,

  mince: () => `${SHADOW}
    <path d="M7 30 H57 L53 52 Q53 54 51 54 H13 Q11 54 11 52 Z" fill="#dfe8f4"/>
    <ellipse cx="32" cy="32" rx="22" ry="6" fill="#c9566d"/>
    ${[[18, 31], [24, 29], [31, 33], [38, 30], [45, 32], [27, 34], [36, 34], [42, 29]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="2.4" fill="#e07a8e"/>`).join('')}
    <rect x="7" y="27" width="50" height="5" rx="2.5" fill="#eef3fa" opacity=".7"/>`,

  icecream: () => `${SHADOW}
    <path d="M14 33 H50 L46 55 Q46 57 44 57 H20 Q18 57 18 55 Z" fill="#ff9fbf"/>
    <rect x="17" y="40" width="30" height="9" fill="#fff" opacity=".85"/>
    <path d="M15 33 Q15 13 32 13 Q49 13 49 33 Z" fill="#fff3d6"/>
    <circle cx="20" cy="33" r="4" fill="#fff3d6"/><circle cx="29" cy="34" r="4" fill="#fff3d6"/><circle cx="38" cy="34" r="4" fill="#fff3d6"/><circle cx="45" cy="33" r="3.5" fill="#fff3d6"/>
    ${shine(24, 20, 4, 2)}`,

  chocsauce: () => squeezy('#5a321c', '#f4f1ea'),

  sprinkles: () => `${SHADOW}
    <rect x="17" y="8" width="30" height="9" rx="3" fill="#ff7eb6"/>
    ${[22, 27, 32, 37, 42].map(x => `<circle cx="${x}" cy="12.5" r="1.1" fill="#fff"/>`).join('')}
    <rect x="15" y="16" width="34" height="41" rx="8" fill="#eef7ff"/>
    ${[[21, 26, '#ff5d8f', 30], [28, 30, '#ffc93c', -40], [36, 25, '#4cc9f0', 10], [42, 31, '#7bd389', 60], [23, 37, '#b388ff', -20],
       [31, 40, '#ff5d8f', 45], [40, 39, '#4cc9f0', -60], [25, 47, '#ffc93c', 15], [34, 49, '#7bd389', -30], [42, 47, '#b388ff', 70], [30, 34, '#4cc9f0', 80]]
      .map(([x, y, c, r]) => `<rect x="${x - 3}" y="${y - 1}" width="6" height="2.2" rx="1.1" fill="${c}" transform="rotate(${r} ${x} ${y})"/>`).join('')}
    ${shine(19.5, 26, 1.4, 5, 0)}`,

  cherry: () => `${SHADOW}
    <path d="M30 34 Q30 18 40 8" stroke="#3f7f2a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M40 9 Q50 6 52 14 Q44 16 40 9Z" fill="#4caf50"/>
    <circle cx="29" cy="42" r="14" fill="#d61f3c"/>
    <circle cx="33" cy="46" r="10" fill="#a8142c" opacity=".35"/>
    ${shine(23, 36, 3.5, 2.4)}`,

  dough: () => `${SHADOW}
    <path d="M10 46 Q8 26 32 22 Q56 26 54 46 Q54 55 32 55 Q10 55 10 46Z" fill="#f2d49a"/>
    <path d="M14 44 Q16 30 32 28 Q48 30 50 44 Q44 37 32 37 Q20 37 14 44Z" fill="#fae6bd"/>
    ${[[22, 33], [40, 32], [33, 29], [46, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff"/>`).join('')}`,

  pepperoni: () => `${SHADOW}
    <g transform="rotate(-20 32 32)">
      <rect x="8" y="24" width="38" height="18" rx="9" fill="#a52a22"/>
      <rect x="8" y="24" width="38" height="9" rx="4.5" fill="#c8382d"/>
    </g>
    <ellipse cx="45" cy="44" rx="11" ry="10" fill="#c8382d"/>
    ${[[41, 41], [48, 42], [44, 48], [49, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#f6b7a6"/>`).join('')}
    <ellipse cx="22" cy="50" rx="8" ry="6" fill="#c8382d"/>
    ${[[20, 49], [24, 51]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#f6b7a6"/>`).join('')}`,

  rice: () => bag('#f4f1e6', '#c7bfa6', [[-5, -3, 30], [0, -5, -20], [4, -1, 50], [-3, 3, -40], [3, 4, 10], [-7, 2, 70]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1.3" fill="#d9d2bb" transform="rotate(${r} ${x} ${y})"/>`).join('')),

  egg: () => `${SHADOW}
    <path d="M32 9 C44 9 51 27 51 39 C51 50 43 57 32 57 C21 57 13 50 13 39 C13 27 20 9 32 9Z" fill="#fbf4e6"/>
    <path d="M38 14 C46 20 50 31 50 39 C50 50 43 56 33 56 C44 50 46 32 38 14Z" fill="#e9dfcc"/>
    ${shine(23, 26, 3, 5, 15)}`,

  peas: () => `${SHADOW}
    <path d="M6 30 Q32 14 58 30 Q32 50 6 30Z" fill="#5ea444"/>
    ${[16, 25, 34, 43].map(x => `<circle cx="${x + 2}" cy="31" r="5" fill="#8fd16a"/>`).join('')}
    <path d="M6 30 Q32 22 58 30" stroke="#4a8a35" stroke-width="2" fill="none"/>
    <path d="M56 29 Q60 22 58 18" stroke="#4a8a35" stroke-width="2" fill="none" stroke-linecap="round"/>`,

  carrot: () => `${SHADOW}
    <path d="M22 18 Q26 12 33 14 Q42 17 41 24 L18 56 Q15 58 15 55 Z" fill="#f58a2b" transform="rotate(25 30 34)"/>
    <path d="M22 26 h6 M20 34 h6 M18 42 h5" stroke="#d96f12" stroke-width="1.8" stroke-linecap="round" transform="rotate(25 30 34)"/>
    <path d="M38 14 Q38 4 45 3 M40 14 Q46 8 53 10 M41 16 Q50 15 54 20" stroke="#4caf50" stroke-width="3" fill="none" stroke-linecap="round"/>`,

  soysauce: () => bottle('#3a2418', '#d93b2f', `<circle r="5" fill="#d93b2f"/><circle r="2.2" fill="#fff"/>`),

  cream: () => `${SHADOW}
    <rect x="18" y="20" width="28" height="37" rx="5" fill="#eef4ff"/>
    <rect x="18" y="34" width="28" height="10" fill="#5fa8f5"/>
    <path d="M20 20 Q32 12 44 20 Z" fill="#cfdcf0"/>
    <rect x="29" y="5" width="6" height="11" rx="2" fill="#f4f1ea"/>
    <path d="M30 5 l2 -4 l2 4z" fill="#f4f1ea"/>
    ${shine(22, 27, 1.6, 4, 0)}`,

  waffle: () => `${SHADOW}
    <rect x="9" y="17" width="46" height="38" rx="7" fill="#c98a3f"/>
    <rect x="9" y="14" width="46" height="38" rx="7" fill="#e3a957"/>
    ${[[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2]].map(([i, j]) =>
      `<rect x="${13 + i * 10}" y="${18 + j * 10.5}" width="7.5" height="8" rx="1.6" fill="#c98a3f" opacity=".55"/>`).join('')}`,

  cake: () => `${SHADOW}
    <path d="M10 26 V48 Q32 60 54 48 V26 Z" fill="#ddb060"/>
    <path d="M10 36 Q32 47 54 36 V40 Q32 51 10 40 Z" fill="#fff6e2"/>
    <ellipse cx="32" cy="26" rx="22" ry="9" fill="#f3cf86"/>
    ${shine(22, 23, 4, 1.8, 0)}`,

  icing: () => `${SHADOW}
    <path d="M12 12 Q32 2 52 12 L34 50 Q32 54 30 50 Z" fill="#ffd2e2"/>
    <path d="M12 12 Q32 2 52 12 L46 22 Q32 16 18 22 Z" fill="#ffb3cf"/>
    <path d="M29 48 L32 59 L35 48 Z" fill="#c9ced8"/>
    ${shine(24, 22, 2, 6, -20)}`,

  candle: () => `${SHADOW}
    <rect x="26" y="20" width="12" height="37" rx="3" fill="#7fb7ff"/>
    ${[26, 35, 44].map(y => `<path d="M26 ${y + 4} L38 ${y}" stroke="#fff" stroke-width="3"/>`).join('')}
    <path d="M32 17 V12" stroke="#2b2233" stroke-width="1.6"/>
    <path d="M32 2 Q39 10 32 15 Q25 10 32 2Z" fill="#ffb020"/>
    <path d="M32 7 Q35 11 32 14 Q29 11 32 7Z" fill="#fff1a8"/>`,

  broth: () => carton('#f6d49a', '#e3b56a', '#d9822b'),

  noodles: () => `${SHADOW}
    <rect x="10" y="20" width="44" height="34" rx="8" fill="#e3be5c"/>
    ${[24, 30, 36, 42, 48].map((y, i) => `<path d="M12 ${y} q4 -4 8 0 t8 0 t8 0 t8 0 t8 0" stroke="${i % 2 ? '#f6dc8c' : '#fbe7a8'}" stroke-width="2.6" fill="none"/>`).join('')}`,

  springonion: () => `${SHADOW}
    <g transform="rotate(-28 32 32)">
      <path d="M26 8 V40 M32 6 V40 M38 9 V40" stroke="#4caf50" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 38 h16 v10 q0 8 -8 8 q-8 0 -8 -8 z" fill="#f4f8ee"/>
      <path d="M28 56 l-1 3 M32 57 v3 M36 56 l1 3" stroke="#d9c39a" stroke-width="1.5" stroke-linecap="round"/>
    </g>`,

  seaweed: () => `${SHADOW}
    <rect x="12" y="10" width="40" height="46" rx="3" fill="#2f4a3a" transform="rotate(8 32 33)"/>
    <rect x="10" y="12" width="40" height="44" rx="3" fill="#3a5c48"/>
    ${[20, 30, 40].map(y => `<path d="M14 ${y} q9 -3 18 0 t16 0" stroke="#4d7a5f" stroke-width="1.4" fill="none"/>`).join('')}`,

  chicken: () => `${SHADOW}
    <path d="M18 40 Q8 30 18 18 Q30 8 42 18 Q50 28 40 38 L30 44 Z" fill="#e3a14f"/>
    <path d="M22 34 Q16 26 22 20 Q30 14 38 21" stroke="#f2c47c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <rect x="31" y="38" width="7" height="16" rx="3" fill="#f6efe3" transform="rotate(-40 34 46)"/>
    <circle cx="44" cy="52" r="4" fill="#f6efe3"/><circle cx="47" cy="48" r="4" fill="#f6efe3"/>`,

  currysauce: () => jar('#e3a21a', '#7a3e1d', `<path d="M-6 2 Q0 -8 6 2 Q0 6 -6 2Z" fill="#e3a21a"/><circle cx="0" cy="0" r="1.4" fill="#c9860f"/>`),

  honey: () => jar('#f4b41a', '#c97a12', `<path d="M0 -6 L5 -3 V3 L0 6 L-5 3 V-3 Z" fill="#f4b41a"/>`, true),
};

/** Markup for an ingredient on its own (no card). */
export function ingredientSVG(id, cls = 'food'){
  const draw = ICONS[id];
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true">${draw ? draw() : ''}</svg>`;
}

/** Inner markup only, for placing inside another SVG. */
export const ingredientInner = (id) => ICONS[id]?.() || '';

// --------------------------------------------------------------- looks ---
// Each look draws itself on top of a "surface": the top of whatever is
// already on the dish. s = { cx, y, hw } — the middle of that top, and how
// wide it is. A look returns the new surface for whatever goes on next.

function rng(seed){
  let t = (seed * 2654435761) >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** n spots scattered across the top of a surface, front ones last. */
function scatter(s, n, rnd, spreadY = 1){
  const ry = s.hw * 0.3 * spreadY;
  const pts = [];
  for (let i = 0; i < n; i++){
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 0.86;
    pts.push([s.cx + Math.cos(a) * r * s.hw, s.y + Math.sin(a) * r * ry - (s.mound ? (1 - r) * s.mound : 0)]);
  }
  return pts.sort((a, b) => a[1] - b[1]);
}

const BREAD_OUT = 'M13 55 V31 C8 28 9 13 22 12 C26 8 38 8 42 12 C55 13 56 28 51 31 V55 Z';
const BREAD_IN = 'M17 51 V31 C13 28 14 17 23 16 C27 13 37 13 41 16 C50 17 51 28 47 31 V51 Z';
const ell = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
const f1 = (n) => Math.round(n * 10) / 10;

const LOOKS = {
  liquid(s, [c], rnd, ctx){
    if (ctx.kind === 'glass'){
      const top = ctx.level - 20;
      ctx.liquids.push(`<rect x="0" y="${top}" width="120" height="${ctx.level - top + 0.6}" fill="${c}"/>`);
      ctx.level = top;
      return { s: { ...s, y: top, hw: 18, mound: 0 } };
    }
    const rx = s.hw + (ctx.kind === 'bowl' ? 4 : 0);
    return { svg: ell(s.cx, s.y + 1, rx, f1(rx * 0.28), c) +
      ell(s.cx - s.hw * 0.4, s.y - 1, s.hw * 0.3, 1.6, '#fff', 'opacity=".4"'), s };
  },

  tint(s, [c], rnd, ctx){
    if (ctx.kind === 'glass'){
      ctx.liquids.push(`<rect x="0" y="${ctx.level}" width="120" height="${92 - ctx.level}" fill="${c}"/>`);
      return { s };
    }
    const rx = s.hw + (ctx.kind === 'bowl' ? 4 : 0);
    return { svg: ell(s.cx, s.y + 1, rx, f1(rx * 0.28), c) +
      `<path d="M${s.cx - 8} ${s.y} q4 -3 8 0 t8 0" stroke="#fff" stroke-width="1.4" fill="none" opacity=".35"/>`, s };
  },

  chips(s, [a, b], rnd){
    let svg = '';
    for (let i = 0; i < 13; i++){
      const dx = (rnd() * 2 - 1) * s.hw * 0.85;
      const lift = (1 - Math.abs(dx) / s.hw) * 16 * (0.5 + rnd() * 0.5);
      const x = s.cx + dx, y = s.y + 2 - lift, r = rnd() * 360, z = 7 + rnd() * 3;
      svg += `<path d="M${f1(x)} ${f1(y - z)} L${f1(x + z * 0.9)} ${f1(y + z * 0.6)} L${f1(x - z * 0.9)} ${f1(y + z * 0.6)} Z" fill="${i % 3 ? a : b}" transform="rotate(${f1(r)} ${f1(x)} ${f1(y)})"/>`;
    }
    return { svg, s: { ...s, y: s.y - 9, hw: s.hw * 0.78 } };
  },

  blob(s, [a, b], rnd){
    const w = s.hw * 0.62, x = s.cx + (rnd() - 0.5) * 6, y = s.y - 3;
    const svg = `<path d="M${f1(x - w)} ${f1(y + 3)} Q${f1(x - w)} ${f1(y - 10)} ${f1(x - w * 0.35)} ${f1(y - 9)} Q${f1(x)} ${f1(y - 15)} ${f1(x + w * 0.4)} ${f1(y - 9)} Q${f1(x + w)} ${f1(y - 9)} ${f1(x + w)} ${f1(y + 3)} Q${f1(x)} ${f1(y + 8)} ${f1(x - w)} ${f1(y + 3)} Z" fill="${a}"/>
      <path d="M${f1(x - w * 0.6)} ${f1(y + 2)} Q${f1(x)} ${f1(y + 6)} ${f1(x + w * 0.7)} ${f1(y + 1)}" stroke="${b}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${ell(f1(x - w * 0.3), f1(y - 7), 3.5, 1.8, '#fff', 'opacity=".45"')}`;
    return { svg, s: { ...s, y: s.y - 7, hw: s.hw * 0.8 } };
  },

  pieces(s, [a, b], rnd){
    return { svg: scatter(s, 10, rnd).map(([x, y]) => {
      const z = 5.5 + rnd() * 1.5, r = rnd() * 90;
      return `<g transform="rotate(${f1(r)} ${f1(x)} ${f1(y)})"><rect x="${f1(x - z / 2)}" y="${f1(y - z / 2)}" width="${f1(z)}" height="${f1(z)}" rx="1.6" fill="${a}"/><rect x="${f1(x - z / 2)}" y="${f1(y - z / 2)}" width="${f1(z * 0.5)}" height="${f1(z * 0.5)}" rx="1.2" fill="${b}" opacity=".8"/></g>`;
    }).join(''), s: { ...s, y: s.y - 2 } };
  },

  crumbs(s, [a, b], rnd){
    return { svg: scatter(s, 18, rnd).map(([x, y], i) => `<circle cx="${f1(x)}" cy="${f1(y - 1)}" r="${f1(2.2 + rnd() * 1.4)}" fill="${i % 3 ? a : b}"/>`).join(''),
      s: { ...s, y: s.y - 3 } };
  },

  halves(s, [a, b], rnd){
    return { svg: scatter(s, 7, rnd).map(([x, y]) => {
      const r = (rnd() - 0.5) * 70;
      return `<g transform="translate(${f1(x)} ${f1(y - 2)}) rotate(${f1(r)})"><path d="M0 -5 Q6 -6 6 0 Q5 5 0 7 Q-5 5 -6 0 Q-6 -6 0 -5Z" fill="${a}"/><path d="M0 -2 Q3 -2 3 1 Q2 3 0 4 Q-2 3 -3 1 Q-3 -2 0 -2Z" fill="${b}"/></g>`;
    }).join(''), s: { ...s, y: s.y - 3 } };
  },

  slices(s, [a, b], rnd){
    return { svg: scatter(s, 7, rnd).map(([x, y]) =>
      `${ell(f1(x), f1(y), 6.5, 4.4, b)}${ell(f1(x), f1(y - 0.4), 5, 3.3, a)}${ell(f1(x - 1.5), f1(y - 1.2), 1.4, 0.8, '#fff', 'opacity=".5"')}`).join(''),
      s: { ...s, y: s.y - 2 } };
  },

  dots(s, [a, b], rnd){
    return { svg: scatter(s, 12, rnd).map(([x, y]) => {
      const r = 2.8 + rnd() * 0.9;
      return `<circle cx="${f1(x)}" cy="${f1(y - r + 1)}" r="${f1(r)}" fill="${a}"/><circle cx="${f1(x + 0.8)}" cy="${f1(y - r + 1.8)}" r="${f1(r * 0.7)}" fill="${b}" opacity=".35"/><circle cx="${f1(x - r * 0.35)}" cy="${f1(y - r * 1.3 + 1)}" r=".9" fill="#fff" opacity=".7"/>`;
    }).join(''), s: { ...s, y: s.y - 2 } };
  },

  leaves(s, [a, b], rnd){
    if (s.flat){
      const w = s.hw + 3;
      let d = `M${f1(s.cx - w)} ${f1(s.y)}`;
      for (let i = 0; i < 8; i++){
        const x = s.cx - w + (i + 0.5) * (w * 2 / 8), x2 = s.cx - w + (i + 1) * (w * 2 / 8);
        d += ` Q${f1(x)} ${f1(s.y + 7)} ${f1(x2)} ${f1(s.y)}`;
      }
      d += ` Q${f1(s.cx)} ${f1(s.y - 8)} ${f1(s.cx - w)} ${f1(s.y)} Z`;
      return { svg: `<path d="${d}" fill="${a}"/><path d="M${f1(s.cx - w * 0.8)} ${f1(s.y - 1)} Q${f1(s.cx)} ${f1(s.y - 4)} ${f1(s.cx + w * 0.8)} ${f1(s.y - 1)}" stroke="${b}" stroke-width="1.6" fill="none"/>`,
        s: { ...s, y: s.y - 4 } };
    }
    let svg = '';
    for (let i = 0; i < 9; i++){
      const dx = (rnd() * 2 - 1) * s.hw * 0.8, lift = (1 - Math.abs(dx) / s.hw) * 12 * rnd();
      const x = s.cx + dx, y = s.y - lift, r = rnd() * 180;
      svg += `<g transform="rotate(${f1(r)} ${f1(x)} ${f1(y)})"><path d="M${f1(x - 9)} ${f1(y)} Q${f1(x - 6)} ${f1(y - 8)} ${f1(x)} ${f1(y - 6)} Q${f1(x + 6)} ${f1(y - 9)} ${f1(x + 9)} ${f1(y)} Q${f1(x)} ${f1(y + 6)} ${f1(x - 9)} ${f1(y)}Z" fill="${i % 2 ? a : b}"/><path d="M${f1(x - 6)} ${f1(y)} H${f1(x + 6)}" stroke="#d6f2b8" stroke-width="1.2" opacity=".8"/></g>`;
    }
    return { svg, s: { ...s, y: s.y - 7, hw: s.hw * 0.85 } };
  },

  shreds(s, [a, b], rnd){
    return { svg: scatter(s, 18, rnd).map(([x, y], i) => {
      const r = rnd() * 180;
      return `<rect x="${f1(x - 3.5)}" y="${f1(y - 2)}" width="7" height="2.4" rx="1.2" fill="${i % 2 ? a : b}" transform="rotate(${f1(r)} ${f1(x)} ${f1(y - 1)})"/>`;
    }).join(''), s: { ...s, y: s.y - 2 } };
  },

  herbs(s, [a, b], rnd){
    return { svg: scatter(s, 6, rnd).map(([x, y], i) => {
      const r = rnd() * 180;
      return `<g transform="rotate(${f1(r)} ${f1(x)} ${f1(y - 2)})"><ellipse cx="${f1(x)}" cy="${f1(y - 2)}" rx="5" ry="2.8" fill="${i % 2 ? a : b}"/><path d="M${f1(x - 4)} ${f1(y - 2)} H${f1(x + 4)}" stroke="#c8ec9f" stroke-width=".9"/></g>`;
    }).join(''), s };
  },

  rings(s, [a, b], rnd){
    return { svg: scatter(s, 10, rnd).map(([x, y], i) =>
      `<ellipse cx="${f1(x)}" cy="${f1(y - 1)}" rx="2.8" ry="2.2" fill="#e9f7dc" stroke="${i % 2 ? a : b}" stroke-width="1.8"/>`).join(''), s };
  },

  sprinkles(s, c, rnd){
    return { svg: scatter(s, 20, rnd).map(([x, y], i) => {
      const r = rnd() * 180;
      return `<rect x="${f1(x - 2.4)}" y="${f1(y - 1.8)}" width="4.8" height="1.8" rx=".9" fill="${c[i % c.length]}" transform="rotate(${f1(r)} ${f1(x)} ${f1(y - 1)})"/>`;
    }).join(''), s };
  },

  drizzle(s, [c], rnd){
    const w = s.hw * 0.85, ry = s.hw * 0.3, y = s.y - 1;
    let d = `M${f1(s.cx - w)} ${f1(y - ry * 0.3)}`;
    const zig = 5;
    for (let i = 1; i <= zig; i++){
      const x = s.cx - w + (i * 2 * w) / zig;
      const yy = y + (i % 2 ? ry * 0.7 : -ry * 0.7) + (rnd() - 0.5) * 2;
      d += ` Q${f1(x - w / zig)} ${f1(yy + (i % 2 ? 4 : -4))} ${f1(x)} ${f1(yy)}`;
    }
    return { svg: `<path d="${d}" stroke="${c}" stroke-width="3.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${d}" stroke="#fff" stroke-width="1" fill="none" opacity=".3" transform="translate(-.6 -1)"/>`, s };
  },

  spread(s, [c], rnd, ctx){
    const rx = s.hw * (s.toast ? 0.98 : 0.88), ry = s.toast ? 7.5 : rx * 0.3;
    let svg = s.toast
      ? `<path d="${BREAD_IN}" fill="${c}" transform="${s.toast} translate(32 34) scale(.86) translate(-32 -34)"/>`
      : ell(s.cx, s.y, f1(rx), f1(ry), c);
    if (s.cake) svg += [-20, -8, 6, 18].map((dx, i) =>
      `<path d="M${s.cx + dx - 3} ${f1(s.y + ry * 0.8)} v${5 + (i % 2) * 5} a3 3 0 0 0 6 0 v-${5 + (i % 2) * 5}" fill="${c}"/>`).join('');
    svg += ell(f1(s.cx - rx * 0.45), f1(s.y - ry * 0.35), f1(rx * 0.2), 1.3, '#fff', 'opacity=".4"');
    return { svg, s };
  },

  toast(s, [a, b]){
    // The bread slice from the shelf, lying flat on the plate.
    const t = `translate(${s.cx} ${s.y - 7}) scale(1.3 .5) translate(-32 -32)`;
    const svg = `<path d="${BREAD_OUT}" fill="${b}" transform="translate(0 5) ${t}"/>
      <path d="${BREAD_OUT}" fill="${b}" transform="${t}"/>
      <path d="${BREAD_IN}" fill="${a}" transform="${t}"/>
      ${ell(s.cx - 12, s.y - 12, 6, 1.6, '#fff', 'opacity=".35"')}`;
    return { svg, s: { cx: s.cx, y: s.y - 7, hw: 24, flat: true, toast: t } };
  },

  pancakes(s, [a, b]){
    let svg = '';
    for (let k = 0; k < 3; k++){
      const y = s.y - 2 - k * 6;
      svg += ell(s.cx, y + 3, 31, 9, b) + ell(s.cx, y, 31, 9, a);
    }
    return { svg, s: { cx: s.cx, y: s.y - 14, hw: 28, flat: true } };
  },

  disc(s, [a, b]){
    return { svg: ell(s.cx, s.y + 2, 28, 8, b) + ell(s.cx, s.y, 28, 8, a) + ell(s.cx - 10, s.y - 2, 6, 1.4, '#fff', 'opacity=".3"'),
      s: { ...s, y: s.y - 2, hw: 26, flat: true } };
  },

  base(s, [a, b]){
    return { svg: ell(s.cx, s.y + 2, 40, 11.5, b) + ell(s.cx, s.y, 40, 11.5, a) +
      ell(s.cx, s.y, 35, 9.5, 'none', `stroke="${b}" stroke-width="2" opacity=".5"`),
      s: { cx: s.cx, y: s.y - 1, hw: 34, flat: true } };
  },

  waffle(s, [a, b]){
    const y = s.y - 4;
    let svg = `<rect x="${s.cx - 28}" y="${y - 9}" width="56" height="22" rx="6" fill="${b}"/>
      <rect x="${s.cx - 28}" y="${y - 12}" width="56" height="20" rx="6" fill="${a}"/>`;
    for (let i = 1; i < 6; i++) svg += `<path d="M${s.cx - 28 + i * 9.3} ${y - 11} v18" stroke="${b}" stroke-width="2" opacity=".6"/>`;
    for (let j = 1; j < 3; j++) svg += `<path d="M${s.cx - 27} ${y - 12 + j * 6.6} h54" stroke="${b}" stroke-width="2" opacity=".6"/>`;
    return { svg, s: { cx: s.cx, y: y - 2, hw: 25, flat: true } };
  },

  cake(s, [a, b]){
    const top = s.y - 26;
    const svg = `<path d="M${s.cx - 32} ${top} V${s.y} A32 9 0 0 0 ${s.cx + 32} ${s.y} V${top} Z" fill="${b}"/>
      <path d="M${s.cx - 32} ${top + 12} A32 9 0 0 0 ${s.cx + 32} ${top + 12} v3 A32 9 0 0 1 ${s.cx - 32} ${top + 15} Z" fill="#fff6e2"/>
      ${ell(s.cx, top, 32, 9, a)}`;
    return { svg, s: { cx: s.cx, y: top, hw: 30, flat: true, cake: true } };
  },

  bun(s, [a, b], rnd, ctx){
    ctx.topBun = [a, b];
    return { svg: ell(s.cx, s.y + 2, 31, 8.5, b) + ell(s.cx, s.y - 2, 31, 8.5, a),
      s: { cx: s.cx, y: s.y - 5, hw: 28, flat: true } };
  },

  hotbun(s, [a, b]){
    const y = s.y - 4;
    return { svg: `<rect x="${s.cx - 36}" y="${y - 7}" width="72" height="18" rx="9" fill="${b}"/>
      <rect x="${s.cx - 36}" y="${y - 10}" width="72" height="17" rx="8.5" fill="${a}"/>
      ${ell(s.cx, y - 3, 29, 3.6, b)}`,
      s: { cx: s.cx, y: y - 4, hw: 28, flat: true } };
  },

  sausage(s, [a, b]){
    const y = s.y - 3;
    return { svg: `<rect x="${s.cx - 33}" y="${y - 6}" width="66" height="12" rx="6" fill="${a}"/>
      <rect x="${s.cx - 33}" y="${y}" width="66" height="6" rx="3" fill="${b}" opacity=".5"/>
      ${[-16, -4, 8, 20].map(dx => `<path d="M${s.cx + dx} ${y - 4} l4 5" stroke="${b}" stroke-width="1.8" stroke-linecap="round"/>`).join('')}
      ${ell(s.cx - 14, y - 3.4, 9, 1.2, '#fff', 'opacity=".45"')}`,
      s: { ...s, y: y - 3, hw: 26 } };
  },

  patty(s, [a, b]){
    return { svg: ell(s.cx, s.y + 2, 30, 8.5, b) + ell(s.cx, s.y - 3, 30, 8.5, a) +
      [-12, 0, 12].map(dx => `<path d="M${s.cx + dx - 5} ${s.y - 6} l9 5" stroke="${b}" stroke-width="2.2" stroke-linecap="round"/>`).join(''),
      s: { ...s, y: s.y - 7 } };
  },

  slice(s, [a, b]){
    const y = s.y;
    return { svg: `<path d="M${s.cx - 33} ${y + 1} L${s.cx} ${y - 8} L${s.cx + 33} ${y + 1} L${s.cx + 30} ${y + 9} L${s.cx} ${y + 6} L${s.cx - 30} ${y + 9} Z" fill="${a}"/>
      ${ell(s.cx - 10, y - 1, 2.6, 1.4, b)}${ell(s.cx + 12, y + 1, 2, 1.1, b)}`,
      s: { ...s, y: s.y - 3 } };
  },

  shell(s, [a, b], rnd, ctx){
    const y0 = s.y - 30;
    ctx.front.push(`<path d="M${s.cx - 34} ${y0} Q${s.cx - 34} ${s.y + 4} ${s.cx} ${s.y + 4} Q${s.cx + 34} ${s.y + 4} ${s.cx + 34} ${y0} Q${s.cx} ${y0 + 14} ${s.cx - 34} ${y0} Z" fill="${a}"/>
      ${[[-18, -8], [-6, 0], [8, -4], [20, -12], [-2, -14]].map(([dx, dy]) => `<circle cx="${s.cx + dx}" cy="${s.y + dy}" r="1.3" fill="${b}"/>`).join('')}`);
    return { svg: ell(s.cx, y0 + 2, 33, 8, b), s: { cx: s.cx, y: y0 + 3, hw: 26 } };
  },

  scoop(s, [a, b]){
    const y = s.y - 10;
    return { svg: `<circle cx="${s.cx}" cy="${y}" r="14" fill="${a}"/>
      ${[-10, -3.5, 3.5, 10].map(dx => `<circle cx="${s.cx + dx}" cy="${y + 9}" r="4.4" fill="${a}"/>`).join('')}
      <path d="M${s.cx - 12} ${y + 8} Q${s.cx} ${y + 14} ${s.cx + 12} ${y + 8}" stroke="${b}" stroke-width="1.6" fill="none" opacity=".7"/>
      ${ell(s.cx - 5, y - 6, 4, 2.2, '#fff', 'opacity=".55"')}`,
      s: { ...s, y: y - 10, hw: 11 } };
  },

  foam(s, [a, b]){
    const y = s.y;
    return { svg: `${ell(s.cx, y - 3, 15, 6, a, `stroke="${b}" stroke-width="1.2"`)}
      ${ell(s.cx, y - 9, 11, 5, a, `stroke="${b}" stroke-width="1.2"`)}
      ${ell(s.cx, y - 14, 7, 4, a, `stroke="${b}" stroke-width="1.2"`)}
      <path d="M${s.cx - 3} ${y - 17} Q${s.cx} ${y - 24} ${s.cx + 2} ${y - 18}" fill="${a}" stroke="${b}" stroke-width="1.2"/>`,
      s: { ...s, y: y - 18, hw: 6 } };
  },

  cherry(s, [a, b]){
    const y = s.y - 5;
    return { svg: `<path d="M${s.cx + 1} ${y - 4} Q${s.cx + 2} ${y - 13} ${s.cx + 8} ${y - 16}" stroke="#3f7f2a" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      <circle cx="${s.cx}" cy="${y}" r="6" fill="${a}"/><circle cx="${s.cx + 1.5}" cy="${y + 1.5}" r="4" fill="${b}" opacity=".35"/>
      ${ell(s.cx - 2.2, y - 2.2, 1.6, 1, '#fff', 'opacity=".7"')}`,
      s: { ...s, y: y - 6 } };
  },

  candle(s, [a, b]){
    const y = s.y - 1;
    return { svg: `<rect x="${s.cx - 3}" y="${y - 20}" width="6" height="20" rx="1.5" fill="${a}"/>
      ${[-16, -10, -4].map(dy => `<path d="M${s.cx - 3} ${y + dy} l6 -3" stroke="${b}" stroke-width="1.6"/>`).join('')}
      <path d="M${s.cx} ${y - 30} Q${s.cx + 5} ${y - 24} ${s.cx} ${y - 21} Q${s.cx - 5} ${y - 24} ${s.cx} ${y - 30}Z" fill="#ffb020"/>
      <path d="M${s.cx} ${y - 26} Q${s.cx + 2} ${y - 23.5} ${s.cx} ${y - 22} Q${s.cx - 2} ${y - 23.5} ${s.cx} ${y - 26}Z" fill="#fff1a8"/>`,
      s };
  },

  grains(s, [a, b], rnd){
    const w = s.hw * 0.9, y = s.y + 2;
    let svg = `<path d="M${f1(s.cx - w)} ${f1(y)} Q${f1(s.cx - w * 0.8)} ${f1(y - 18)} ${f1(s.cx)} ${f1(y - 19)} Q${f1(s.cx + w * 0.8)} ${f1(y - 18)} ${f1(s.cx + w)} ${f1(y)} Q${f1(s.cx)} ${f1(y + 5)} ${f1(s.cx - w)} ${f1(y)} Z" fill="${a}"/>`;
    for (let i = 0; i < 22; i++){
      const dx = (rnd() * 2 - 1) * w * 0.85, top = (1 - (dx / w) ** 2) * 16;
      const x = s.cx + dx, yy = y - rnd() * top;
      svg += `<ellipse cx="${f1(x)}" cy="${f1(yy)}" rx="2" ry="1" fill="${b}" transform="rotate(${f1(rnd() * 180)} ${f1(x)} ${f1(yy)})"/>`;
    }
    return { svg, s: { ...s, y: s.y - 12, hw: s.hw * 0.7, mound: 4 } };
  },

  nest(s, [a, b], rnd){
    const w = s.hw * 0.85, y = s.y + 1;
    let svg = `<path d="M${f1(s.cx - w)} ${f1(y)} Q${f1(s.cx - w)} ${f1(y - 14)} ${f1(s.cx)} ${f1(y - 15)} Q${f1(s.cx + w)} ${f1(y - 14)} ${f1(s.cx + w)} ${f1(y)} Q${f1(s.cx)} ${f1(y + 5)} ${f1(s.cx - w)} ${f1(y)} Z" fill="${a}"/>`;
    for (let i = 0; i < 6; i++){
      const yy = y - 2 - i * 2.2, ww = w * (1 - i * 0.12);
      svg += `<path d="M${f1(s.cx - ww)} ${f1(yy)} q${f1(ww / 4)} -4 ${f1(ww / 2)} 0 t${f1(ww / 2)} 0 t${f1(ww / 2)} 0 t${f1(ww / 2)} 0" stroke="${b}" stroke-width="1.6" fill="none" opacity=".9"/>`;
    }
    return { svg, s: { ...s, y: s.y - 10, hw: s.hw * 0.75, mound: 3 } };
  },

  egg(s, [a, b]){
    const y = s.y - 2;
    return { svg: `<path d="M${s.cx - 17} ${y} Q${s.cx - 18} ${y - 7} ${s.cx - 6} ${y - 7} Q${s.cx + 2} ${y - 11} ${s.cx + 12} ${y - 6} Q${s.cx + 19} ${y - 2} ${s.cx + 14} ${y + 4} Q${s.cx} ${y + 8} ${s.cx - 12} ${y + 5} Q${s.cx - 18} ${y + 4} ${s.cx - 17} ${y} Z" fill="${a}"/>
      <circle cx="${s.cx + 2}" cy="${y - 1.5}" r="5.6" fill="${b}"/>${ell(s.cx, y - 3.5, 1.8, 1.1, '#fff', 'opacity=".6"')}`,
      s: { ...s, y: s.y - 3 } };
  },

  sheet(s, [a, b], rnd, ctx){
    // Tucked in at the back of the bowl, so it goes behind everything else.
    const x = s.cx - 30, y = (ctx.kind === 'bowl' ? 61 : s.y) - 24;
    ctx.behind = (ctx.behind || '') + `<g transform="rotate(-14 ${x + 6} ${y + 10})"><rect x="${x}" y="${y}" width="12" height="22" rx="1.5" fill="${a}"/>
      <path d="M${x + 2} ${y + 7} h8 M${x + 2} ${y + 13} h8" stroke="${b}" stroke-width="1.1"/></g>`;
    return { s };
  },
};

// ---------------------------------------------------------- containers ---

const CONTAINERS = {
  plate: {
    top: 8,
    start: { cx: 60, y: 80, hw: 36 },
    back: () => `${ell(60, 91, 50, 6, '#0000001a')}${ell(60, 83, 54, 13, '#e3e2ec')}${ell(60, 81, 54, 13, '#ffffff')}${ell(60, 81, 40, 8.5, '#f1f0f6')}`,
  },
  bowl: {
    top: 18,
    start: { cx: 60, y: 61, hw: 36 },
    back: () => `${ell(60, 94, 34, 5, '#0000001a')}${ell(60, 59, 46, 11, '#dfe6f1')}${ell(60, 61, 42, 8.5, '#cfd8e6')}`,
    front: () => `<path d="M14 59 Q15 94 60 95 Q105 94 106 59 Q104 69 60 70.5 Q16 69 14 59 Z" fill="#ffffff"/>
      <path d="M17 70 Q60 80 103 70 Q101 76 99 79 Q60 88 21 79 Q19 76 17 70 Z" fill="#7fc4ff"/>
      <path d="M22 66 Q22 82 34 88" stroke="#fff" stroke-width="3" fill="none" opacity=".7" stroke-linecap="round"/>`,
  },
  mug: {
    top: 8,
    start: { cx: 54, y: 42, hw: 23 },
    back: () => `${ell(56, 94, 34, 5, '#0000001a')}
      <path d="M78 52 Q96 52 95 66 Q94 80 77 80" stroke="#ff8fab" stroke-width="7" fill="none"/>
      <path d="M28 42 V82 Q28 94 54 94 Q80 94 80 82 V42 Z" fill="#ff8fab"/>
      <path d="M33 52 V80 Q33 88 44 90" stroke="#fff" stroke-width="3" fill="none" opacity=".5" stroke-linecap="round"/>
      <circle cx="54" cy="68" r="7" fill="#fff" opacity=".9"/><path d="M50 67 q4 4 8 0" stroke="#ff8fab" stroke-width="1.8" fill="none" stroke-linecap="round"/>
      ${ell(54, 42, 26, 7.5, '#ff7a9c')}${ell(54, 43, 23, 6, '#7a4a3a')}`,
  },
  glass: {
    top: -14,
    start: { cx: 60, y: 88, hw: 18 },
    glass: true,
    back: () => `${ell(60, 94, 26, 4, '#0000001a')}<rect x="38" y="10" width="44" height="84" rx="7" fill="#eef7ff" opacity=".9"/>`,
    front: () => `<rect x="38" y="10" width="44" height="84" rx="7" fill="none" stroke="#cbe3f6" stroke-width="2.6"/>
      <path d="M44 18 V84" stroke="#fff" stroke-width="3.2" opacity=".8" stroke-linecap="round"/>
      <rect x="66" y="0" width="4" height="40" rx="2" fill="#ff6fa5" transform="rotate(14 68 20)"/>`,
  },
  coupe: {
    top: -2,
    start: { cx: 60, y: 48, hw: 30 },
    back: () => `${ell(60, 95, 26, 4, '#0000001a')}${ell(60, 93, 22, 5, '#d6ebfb')}<rect x="57" y="68" width="6" height="25" fill="#d6ebfb"/>${ell(60, 46, 38, 9, '#e3f1fc')}`,
    front: () => `<path d="M22 46 Q24 74 60 74 Q96 74 98 46 Q96 54 60 55 Q24 54 22 46 Z" fill="#d6ebfb" opacity=".88"/>
      <path d="M28 52 Q32 66 44 70" stroke="#fff" stroke-width="2.6" fill="none" opacity=".8" stroke-linecap="round"/>`,
  },
};

/**
 * The dish so far. layers: [{ ing, act, seed }]. `pending` is a layer being
 * worked on, drawn faint until it's done. `finished` adds the top bun.
 */
export function dishSVG(kind, layers, { pending = null, finished = false, cls = 'dish' } = {}){
  const C = CONTAINERS[kind] || CONTAINERS.plate;
  const ctx = { kind, front: [], liquids: [], level: 88, topBun: null };
  let s = { ...C.start };
  let body = '';
  const all = pending ? [...layers, { ...pending, pending: true }] : layers;
  for (const L of all){
    const look = L.look || lookFor(L.ing, L.act);
    const fn = LOOKS[look.form];
    if (!fn) continue;
    const before = ctx.liquids.length;
    const out = fn(s, look.c, rng(L.seed || 7), ctx) || {};
    // A liquid in a glass adds to the clipped liquid pile instead of the body.
    if (L.pending && ctx.liquids.length > before){
      ctx.liquids[ctx.liquids.length - 1] = `<g opacity="${f1(L.p ?? 0.5)}">${ctx.liquids[ctx.liquids.length - 1]}</g>`;
    }
    if (out.svg) body += L.pending ? `<g opacity="${f1(L.p ?? 0.5)}">${out.svg}</g>` : out.svg;
    if (out.s) s = out.s;
  }
  if (finished && ctx.topBun){
    const [a, b] = ctx.topBun, y = s.y + 2;
    body += `<path d="M${s.cx - 31} ${y} Q${s.cx - 31} ${y - 28} ${s.cx} ${y - 28} Q${s.cx + 31} ${y - 28} ${s.cx + 31} ${y} Z" fill="${a}"/>
      <rect x="${s.cx - 31}" y="${y - 4}" width="62" height="6" rx="3" fill="${b}"/>
      ${[[-14, -18], [-4, -22], [8, -20], [17, -14], [-20, -10], [2, -13]].map(([dx, dy]) =>
        `<ellipse cx="${s.cx + dx}" cy="${y + dy}" rx="2" ry="1.1" fill="#fff6dc"/>`).join('')}
      ${ell(s.cx - 14, y - 20, 4, 1.8, '#fff', 'opacity=".4"')}`;
  }
  const liquids = ctx.liquids.length
    ? `<clipPath id="gl${++uid}"><rect x="40" y="12" width="40" height="80" rx="5"/></clipPath><g clip-path="url(#gl${uid})">${ctx.liquids.join('')}</g>`
    : '';
  return `<svg class="${cls}" viewBox="0 ${C.top} 120 ${100 - C.top}" aria-hidden="true">${C.back()}${ctx.behind || ''}${liquids}${body}${C.front ? C.front() : ''}${ctx.front.join('')}</svg>`;
}
let uid = 0;

/** The picture on the menu: the whole recipe, cooked. */
export function menuDishSVG(dishId, cls = 'dish'){
  const d = DISH[dishId];
  return dishSVG(d.dish, d.steps.map((st, i) => ({ ing: st.ing, act: st.act, seed: i * 13 + 5 })), { finished: true, cls });
}

/** Draw a look on its own, centred in a 100x100 box, for stations. */
export function lookOnSurface(look, surface, seed = 3){
  const ctx = { kind: 'station', front: [], liquids: [], level: 88 };
  const fn = LOOKS[look.form === 'pancakes' ? 'disc' : look.form];
  if (!fn) return '';
  const out = fn({ ...surface }, look.c, rng(seed), ctx) || {};
  return (out.svg || '') + ctx.front.join('');
}

// ------------------------------------------------------------- stations ---
// Where an ingredient is worked on before it goes on the dish. Drawn in a
// 100x100 box; `p` is how far along it is, 0 to 1.

const nest = (id, x, y, size, extra = '') =>
  `<svg x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" viewBox="0 0 64 64" overflow="visible"><g ${extra}>${ICONS[id] ? ICONS[id]() : ''}</g></svg>`;

export function stationSVG(kind, ingId, act, p, phase = 0){
  const look = lookFor(ingId, act);
  const fade = Math.max(0, 1 - p * 1.4);
  let svg = '';
  switch (kind){
    case 'board': {
      svg = `${ell(50, 90, 44, 6, '#0000001a')}<rect x="6" y="58" width="88" height="30" rx="12" fill="#c99a5e"/>
        <rect x="6" y="54" width="88" height="30" rx="12" fill="#e8c08a"/><circle cx="84" cy="62" r="3" fill="#c99a5e"/>`;
      if (act === 'roll'){
        const sq = 1 - p * 0.7;
        svg += `<g opacity="${f1(fade)}" transform="translate(50 70) scale(${f1(1 + p * 0.5)} ${f1(sq)}) translate(-50 -70)">${nest(ingId, 50, 52, 50)}</g>`;
        svg += `<g opacity="${f1(p)}">${lookOnSurface(look, { cx: 50, y: 70, hw: 30 }, 4)}</g>`;
      } else {
        svg += `<g opacity="${f1(fade)}">${nest(ingId, 50, 50, 50)}</g>`;
        svg += `<g opacity="${f1(Math.min(1, p * 1.2))}">${lookOnSurface(look, { cx: 50, y: 70, hw: 32 }, 4)}</g>`;
      }
      break;
    }
    case 'mixbowl':
      svg = `${ell(50, 92, 30, 4, '#0000001a')}${ell(50, 58, 38, 10, '#dfe6f1')}
        <g opacity="${f1(fade)}">${nest(ingId, 50, 46, 44)}</g>
        <g opacity="${f1(p)}">${lookOnSurface(look, { cx: 50, y: 62, hw: 30 }, 4)}</g>
        <path d="M12 58 Q14 90 50 91 Q86 90 88 58 Q86 67 50 68 Q14 67 12 58 Z" fill="#9fd0ff"/>
        <path d="M18 66 Q20 80 30 85" stroke="#fff" stroke-width="2.6" fill="none" opacity=".7" stroke-linecap="round"/>`;
      break;
    case 'pan': {
      const raw = act === 'cook' ? Math.max(0, 1 - p) : 0;
      svg = `${ell(46, 88, 40, 5, '#0000001a')}<rect x="78" y="62" width="22" height="7" rx="3.5" fill="#2c303a"/>
        ${ell(46, 68, 38, 15, '#2c303a')}${ell(46, 66, 38, 15, '#454b58')}${ell(46, 66, 32, 11.5, '#5a6170')}`;
      if (act === 'cook'){
        svg += `<g class="pan-food">${lookOnSurface(look, { cx: 46, y: 68, hw: 26 }, 4)}
          <g opacity="${f1(raw * 0.75)}">${ell(46, 64, 24, 7, '#fff8ea')}</g></g>`;
      } else {
        svg += `<g opacity="${f1(fade)}">${nest(ingId, 46, 52, 40)}</g>
          <g opacity="${f1(p)}">${lookOnSurface(look, { cx: 46, y: 68, hw: 26 }, 4)}</g>`;
      }
      svg += `<g class="steam">${[30, 46, 62].map((x, i) => `<path d="M${x} 48 q-4 -6 0 -12 t0 -12" stroke="#fff" stroke-width="2.4" fill="none" opacity=".7" style="animation-delay:${i * 0.3}s"/>`).join('')}</g>`;
      break;
    }
    case 'pot':
      svg = `${ell(50, 92, 40, 5, '#0000001a')}<rect x="2" y="54" width="14" height="6" rx="3" fill="#8e98aa"/><rect x="84" y="54" width="14" height="6" rx="3" fill="#8e98aa"/>
        <path d="M12 50 V82 Q12 92 22 92 H78 Q88 92 88 82 V50 Z" fill="#cfd6e2"/>
        <path d="M18 56 V82" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/>
        ${ell(50, 50, 38, 10, '#aeb8c8')}${ell(50, 51, 34, 8, '#8ccff7')}
        <g opacity="${f1(fade)}">${nest(ingId, 50, 36, 40)}</g>
        <g opacity="${f1(p)}">${lookOnSurface(look, { cx: 50, y: 55, hw: 26 }, 4)}</g>
        <g class="bubbles">${[34, 50, 64].map((x, i) => `<circle cx="${x}" cy="50" r="2.4" fill="#fff" opacity=".8" style="animation-delay:${i * 0.25}s"/>`).join('')}</g>`;
      break;
    case 'blender': {
      const c = look.c[0];
      const lvl = 70 - p * 44;
      svg = `${ell(50, 94, 28, 4, '#0000001a')}<rect x="28" y="72" width="44" height="20" rx="5" fill="#5b6475"/>
        <circle cx="50" cy="82" r="4" fill="#ff6fa5"/>
        <path d="M28 14 H72 L66 72 H34 Z" fill="#e8f4ff" opacity=".95"/>
        <clipPath id="bl${++uid}"><path d="M28 14 H72 L66 72 H34 Z"/></clipPath>
        <g clip-path="url(#bl${uid})"><rect x="20" y="${f1(lvl)}" width="60" height="80" fill="${c}"/></g>
        <g opacity="${f1(fade)}" transform="rotate(${Math.round(p * 900)} 50 48)">${nest(ingId, 50, 48, 36)}</g>
        <path d="M42 68 L58 64 M42 64 L58 68" stroke="#8e98aa" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M28 14 H72 L66 72 H34 Z" fill="none" stroke="#c4d8ea" stroke-width="2"/>
        <path d="M34 20 L38 64" stroke="#fff" stroke-width="2.6" opacity=".8" stroke-linecap="round"/>
        <rect x="25" y="7" width="50" height="9" rx="3" fill="#5b6475"/>`;
      break;
    }
    case 'toaster': {
      // phase 0: bread sticking up; phase 1: pushed down and toasting; p=1: popped.
      const down = phase >= 1 && p < 1;
      const browned = p >= 1 ? 1 : phase >= 1 ? 0.5 : 0;
      const by = down ? 46 : p >= 1 ? 22 : 30;
      const bread = ingId === 'waffle' ? nest('waffle', 50, by + 4, 40) : `<g>
        <rect x="28" y="${by}" width="44" height="34" rx="12" fill="#c98a4b"/>
        <rect x="32" y="${by + 4}" width="36" height="30" rx="9" fill="${browned >= 1 ? '#d99b52' : browned ? '#ebc283' : '#f7dfac'}"/></g>`;
      svg = `${ell(50, 94, 40, 5, '#0000001a')}
        ${bread}
        <rect x="10" y="44" width="80" height="48" rx="16" fill="#f2f4f8"/>
        <rect x="10" y="76" width="80" height="16" rx="12" fill="#dfe4ec"/>
        <rect x="24" y="44" width="52" height="6" rx="3" fill="${down ? '#ff7a2f' : '#3a3f4b'}"/>
        <rect x="88" y="${down ? 72 : 54}" width="9" height="7" rx="2" fill="#ff6fa5"/>
        <path d="M18 54 V82" stroke="#fff" stroke-width="3" opacity=".9" stroke-linecap="round"/>
        ${down ? `<rect x="24" y="44" width="52" height="6" rx="3" fill="#ffb347" class="glow"/>` : ''}`;
      break;
    }
  }
  return `<svg class="station" viewBox="0 0 100 100" aria-hidden="true">${svg}</svg>`;
}

// ---------------------------------------------------------------- tools ---
// Drawn in a 64x64 box. `tip` is the point that should sit under your finger.

export const TOOLS = {
  knife:    { tip: [24, 60], svg: `<path d="M18 8 h12 v22 h-12z" fill="#5b4033" rx="3"/><rect x="17" y="6" width="14" height="25" rx="4" fill="#6b4a3a"/>
    <path d="M17 30 H44 Q52 46 26 62 Q17 62 17 55 Z" fill="#dfe6ee"/><path d="M17 30 H44 Q50 40 40 50" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/>` },
  masher:   { tip: [32, 58], svg: `<rect x="28" y="2" width="8" height="40" rx="4" fill="#ff8a5c"/><path d="M20 40 H44 V44 H20Z" fill="#aab4c4"/>
    <path d="M22 44 V54 M42 44 V54" stroke="#aab4c4" stroke-width="4"/><path d="M14 54 H50 Q50 60 44 60 H20 Q14 60 14 54Z" fill="#c4ccd8"/>
    <path d="M20 56 h4 M30 56 h4 M40 56 h4" stroke="#7d8798" stroke-width="2"/>` },
  pin:      { tip: [32, 32], svg: `<rect x="2" y="27" width="12" height="10" rx="5" fill="#a86b3c"/><rect x="50" y="27" width="12" height="10" rx="5" fill="#a86b3c"/>
    <rect x="12" y="22" width="40" height="20" rx="8" fill="#e8b878"/><path d="M16 27 H48" stroke="#fff" stroke-width="2.4" opacity=".6"/>` },
  grater:   { tip: [32, 46], svg: `<rect x="22" y="2" width="20" height="8" rx="4" fill="#ff8a5c"/><path d="M18 10 H46 L50 62 H14 Z" fill="#d4dbe5"/>
    <path d="M38 10 L46 10 L50 62 L42 62 Z" fill="#b6c0ce"/>
    ${[18, 26, 34, 42, 50].map(y => [22, 28, 34].map(x => `<path d="M${x} ${y} h3" stroke="#7d8798" stroke-width="2" stroke-linecap="round"/>`).join('')).join('')}` },
  spreader: { tip: [44, 46], svg: `<rect x="6" y="10" width="10" height="26" rx="5" fill="#ffd166" transform="rotate(-40 11 23)"/>
    <path d="M20 26 L48 40 Q54 46 46 50 L18 34 Z" fill="#dfe6ee"/>` },
  spoon:    { tip: [32, 52], svg: `<rect x="29" y="0" width="6" height="40" rx="3" fill="#c98a4b"/><ellipse cx="32" cy="48" rx="10" ry="13" fill="#d9a05b"/>
    <ellipse cx="30" cy="45" rx="4" ry="6" fill="#ecc28a"/>` },
  spatula:  { tip: [32, 52], svg: `<rect x="29" y="0" width="6" height="30" rx="3" fill="#3a3f4b"/><rect x="18" y="30" width="28" height="26" rx="4" fill="#c4ccd8"/>
    <path d="M24 36 v14 M32 36 v14 M40 36 v14" stroke="#9aa4b4" stroke-width="2.4" stroke-linecap="round"/>` },
};

export const toolSVG = (id) => `<svg class="tool-svg" viewBox="0 0 64 64" aria-hidden="true">${TOOLS[id]?.svg || ''}</svg>`;
