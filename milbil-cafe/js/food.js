// ---------- Drawing the food ----------
//
// Blooket draws its breakfast foods as little characters with faces, so these
// have faces too. Every food is an SVG on a 100×100 grid with the same thick
// brown outline, so they look like one set.

const INK = '#3d2a20';
const O = `stroke="${INK}" stroke-width="3" stroke-linejoin="round"`;

function face(cx, cy, s = 1){
  const e = 7 * s, r = 3.4 * s;
  const eye = (x) => `<circle cx="${x}" cy="${cy}" r="${r}" fill="${INK}"/><circle cx="${x + 1.1 * s}" cy="${cy - 1.2 * s}" r="${1.2 * s}" fill="#fff"/>`;
  return eye(cx - e) + eye(cx + e) +
    `<path d="M${cx - 4.5 * s} ${cy + 4 * s} Q${cx} ${cy + 9.5 * s} ${cx + 4.5 * s} ${cy + 4 * s}" stroke="${INK}" stroke-width="${2.6 * s}" fill="none" stroke-linecap="round"/>` +
    `<circle cx="${cx - 12 * s}" cy="${cy + 4 * s}" r="${3 * s}" fill="#ff7f9f" opacity=".5"/><circle cx="${cx + 12 * s}" cy="${cy + 4 * s}" r="${3 * s}" fill="#ff7f9f" opacity=".5"/>`;
}

// A slice of bread: crust, crumb, and a shine.
const slice = (crust, crumb) =>
  `<path d="M18 88 V46 C6 42 6 14 30 14 C38 6 62 6 70 14 C94 14 94 42 82 46 V88 Q82 92 78 92 H22 Q18 92 18 88Z" fill="${crust}" ${O}/>
   <path d="M25 84 V43 C15 40 15 21 32 21 C40 14 60 14 68 21 C85 21 85 40 75 43 V84Z" fill="${crumb}"/>
   <ellipse cx="38" cy="29" rx="8" ry="3" fill="#fff" opacity=".45"/>`;

const strawberry = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 14 C-12 10 -12 -2 -4 -2 C-2 -2 0 0 0 0 C0 0 2 -2 4 -2 C12 -2 12 10 0 14Z" fill="#ff4b5c" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M-6 -1 L0 -6 L6 -1 L0 1Z" fill="#4cbb4a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="-3" cy="5" r=".9" fill="#ffe08a"/><circle cx="3" cy="4" r=".9" fill="#ffe08a"/><circle cx="0" cy="9" r=".9" fill="#ffe08a"/></g>`;

const loop = (x, y, c) =>
  `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${INK}" stroke-width="7"/><circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${c}" stroke-width="4"/>`;

const ART = {
  toast: () => slice('#c98034', '#f7d38b') + face(50, 56, 1.1),

  cereal: () => `
    <path d="M64 48 L84 12" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    <path d="M64 48 L84 12" stroke="#d5dbe8" stroke-width="4.5" stroke-linecap="round"/>
    <ellipse cx="50" cy="50" rx="40" ry="9" fill="#fffaf0" ${O}/>
    ${loop(29, 45, '#ff6b6b')}${loop(41, 40, '#ffd93d')}${loop(53, 43, '#6bcb77')}
    ${loop(35, 49, '#b07bff')}${loop(47, 49, '#ff9f43')}${loop(64, 47, '#ff6b6b')}
    <path d="M10 50 H90 C90 76 72 92 50 92 C28 92 10 76 10 50Z" fill="#3d8bff" ${O}/>
    <path d="M17 58 C20 71 29 81 42 85" stroke="#fff" stroke-width="3" opacity=".35" fill="none" stroke-linecap="round"/>
    ${face(50, 66, 1)}`,

  yogurt: () => `
    <path d="M22 30 L28 86 Q50 94 72 86 L78 30Z" fill="#fff" ${O}/>
    <path d="M25.7 64 L27.6 82 Q50 89 72.4 82 L74.3 64 Q50 70 25.7 64Z" fill="#ff8fb1"/>
    <path d="M30 38 L33 58" stroke="#e8ecf6" stroke-width="4" stroke-linecap="round"/>
    <rect x="16" y="22" width="68" height="10" rx="5" fill="#e9eaf3" ${O}/>
    <path d="M62 23 Q74 6 91 10 Q86 22 72 25Z" fill="#cfd3e6" ${O}/>
    ${strawberry(46, 8, 1)}
    ${face(50, 45, 1)}`,

  combo: () => `
    <ellipse cx="50" cy="62" rx="45" ry="28" fill="#fff" ${O}/>
    <ellipse cx="50" cy="60" rx="34" ry="19" fill="#eef0f7"/>
    <path d="M58 48 C62 42 66 50 70 44 C74 38 78 46 82 42 L85 50 C81 54 77 46 73 52 C69 58 65 50 61 56Z" fill="#e46a5a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M61 51 C65 45 69 51 73 46 C77 41 80 47 84 45" stroke="#ffc2b5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M58 61 C62 55 66 63 70 57 C74 51 78 59 82 55 L85 63 C81 67 77 59 73 65 C69 71 65 63 61 69Z" fill="#e46a5a" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M61 64 C65 58 69 64 73 59 C77 54 80 60 84 58" stroke="#ffc2b5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M14 60 Q10 45 25 41 Q36 32 50 41 Q62 47 57 61 Q59 77 41 77 Q20 81 14 60Z" fill="#fff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="36" cy="58" r="14" fill="#ffc93c" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="31" cy="51" rx="4" ry="2" fill="#fff" opacity=".7"/>
    ${face(36, 58, 0.75)}`,

  oj: () => `
    <path d="M57 44 L71 6 H82" stroke="${INK}" stroke-width="8.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M57 44 L71 6 H82" stroke="#fff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M57 44 L71 6 H82" stroke="#ff5a6e" stroke-width="4.5" stroke-dasharray="5 5" fill="none"/>
    <path d="M24 22 H76 L69 90 Q50 94 31 90Z" fill="#e8f6ff" ${O}/>
    <path d="M26 38 H74 L69.2 87.6 Q50 91 30.8 87.6Z" fill="#ffa62b"/>
    <path d="M26.5 38 H73.5" stroke="#ffd27a" stroke-width="3"/>
    <path d="M33 45 L35.5 80" stroke="#fff" stroke-width="4" opacity=".5" stroke-linecap="round"/>
    <circle cx="77" cy="24" r="13" fill="#ffb73b" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="77" cy="24" r="9" fill="#ffd36e"/>
    <path d="M77 15 V33 M68 24 H86 M70.6 17.6 L83.4 30.4 M83.4 17.6 L70.6 30.4" stroke="#ffb73b" stroke-width="1.6"/>
    ${face(50, 62, 1)}`,

  milk: () => `
    <path d="M26 34 L36 14 H64 L74 34Z" fill="#dfe9ff" ${O}/>
    <rect x="36" y="6" width="28" height="9" rx="2" fill="#fff" ${O}/>
    <rect x="26" y="34" width="48" height="56" rx="3" fill="#fff" ${O}/>
    <path d="M27.5 70 H72.5 V86 Q72.5 88.5 70 88.5 H30 Q27.5 88.5 27.5 86Z" fill="#4ea3ff"/>
    <path d="M50 73 Q43 80 45.5 83.5 Q50 88 54.5 83.5 Q57 80 50 73Z" fill="#fff"/>
    <path d="M31 40 V64" stroke="#e8ecf6" stroke-width="4" stroke-linecap="round"/>
    ${face(50, 51, 1)}`,

  waffle: () => {
    let grid = '';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++)
      grid += `<rect x="${21 + i * 15}" y="${23 + j * 15}" width="13" height="13" rx="3" fill="#dc9a35"/>`;
    return `<g transform="rotate(-4 50 52)">
      <rect x="12" y="14" width="76" height="76" rx="14" fill="#f2b84b" ${O}/>${grid}
      <rect x="57" y="13" width="20" height="14" rx="3" fill="#fff1a8" stroke="${INK}" stroke-width="2.5" transform="rotate(10 67 20)"/>
      <path d="M18 24 Q26 18 34 24" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/></g>
      ${face(50, 55, 1.15)}`;
  },

  pancakes: () => {
    const cake = (y) => `<rect x="12" y="${y}" width="76" height="17" rx="8.5" fill="#e9a74e" ${O}/>
      <path d="M19 ${y + 4.5} H81" stroke="#f6c97a" stroke-width="3" stroke-linecap="round"/>`;
    return `<ellipse cx="50" cy="86" rx="44" ry="9" fill="#fff" ${O}/>
      ${cake(66)}${cake(51)}${cake(36)}
      <path d="M17 39 Q50 30 83 39 Q85 45 79 45 Q77 54 72 47 Q60 49 48 47 Q46 57 41 48 Q28 49 20 45 Q15 43 17 39Z" fill="#9a4f1f" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="40" y="25" width="20" height="13" rx="3" fill="#fff1a8" stroke="${INK}" stroke-width="2.5"/>
      ${face(50, 56, 0.85)}`;
  },

  ftoast: () => `
    <g transform="translate(2 6) scale(.72) rotate(-12 50 50)">${slice('#b86b25', '#f0b75a')}</g>
    <g transform="translate(26 22) scale(.72) rotate(10 50 50)">${slice('#b86b25', '#f0b75a')}
      <path d="M26 40 Q40 30 54 40 T80 38" stroke="#9a4f1f" stroke-width="4" fill="none" stroke-linecap="round"/>
      ${[[30, 30], [44, 26], [60, 30], [70, 44], [34, 74], [66, 76], [50, 80]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#fff"/>`).join('')}
      ${face(50, 58, 1.2)}</g>
    ${strawberry(22, 10, 0.9)}`,
};

/** SVG markup for a food. */
export function foodSVG(id, cls = 'food'){
  const draw = ART[id];
  return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true">${draw ? draw() : ''}</svg>`;
}
