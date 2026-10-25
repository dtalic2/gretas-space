// ---------- The canteen truck ----------
//
// Side on, cab on the left and the serving hatch on the right, with you
// standing inside the hatch. A small one drives around the map.

import { drawLook } from './milbil.js';

/** Darken a #rrggbb colour by a fraction. */
export function shade(hex, by = 0.22){
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * (1 - by))));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map(v => f(v).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The big truck. `who` is your look; it stands in the hatch.
 * `lights` strings fairy lights along the awning, `umbrella` puts a shade
 * umbrella next to the hatch.
 */
export function truckSVG(color, who, { lights = false, umbrella = false } = {}){
  const dark = shade(color);
  const stripes = Array.from({ length: 6 }, (_, i) => {
    const x = 86 + i * 20, c = i % 2 ? '#ffffff' : '#ff5d6c';
    return `<rect x="${x}" y="28" width="20" height="12" fill="${c}"/><circle cx="${x + 10}" cy="40" r="10" fill="${c}"/>`;
  }).join('');
  const bulbs = lights ? Array.from({ length: 11 }, (_, i) => {
    const x = 88 + i * 11, y = 51 + Math.sin(i * 1.1) * 1.5;
    return `<circle cx="${x}" cy="${y}" r="2.6" fill="${['#ffd23f', '#ff6fa5', '#7ad37a', '#38b6ff'][i % 4]}" class="bulb b${i % 3}"/>`;
  }).join('') + `<path d="M86 50 Q140 56 206 50" stroke="#3a3044" stroke-width=".8" fill="none"/>` : '';
  const me = drawLook(who, { title: 'You' }).replace('<svg ', '<svg x="122" y="44" width="44" height="54" ');
  return `<svg class="truck" viewBox="0 0 220 150" role="img" aria-label="Ningy Ningy Canteen">
    <ellipse cx="112" cy="141" rx="104" ry="6" fill="#00000022"/>
    ${umbrella ? `<g transform="translate(206 0)"><rect x="-1.5" y="18" width="3" height="120" fill="#8a6a4a"/>
      <path d="M-30 30 Q0 -6 30 30Z" fill="#ffd23f"/><path d="M-30 30 Q-15 22 -10 30 Q0 22 10 30 Q15 22 30 30" fill="#ff9f1c"/></g>` : ''}
    <path d="M8 118 V80 Q8 64 22 58 L40 50 Q48 46 62 46 V118Z" fill="${color}"/>
    <path d="M22 64 L40 57 Q46 55 54 55 V80 H17 Q17 68 22 64Z" fill="#bfe6ff"/>
    <path d="M24 66 L32 63 V78 H22Z" fill="#fff" opacity=".45"/>
    <rect x="60" y="22" width="154" height="100" rx="12" fill="${color}"/>
    <rect x="60" y="22" width="154" height="10" rx="5" fill="#ffffff" opacity=".22"/>
    <rect x="94" y="42" width="102" height="50" rx="6" fill="#4a3b5c"/>
    <rect x="98" y="46" width="94" height="10" rx="3" fill="#5c4c70"/>
    <g fill="#ffd8a8" opacity=".9"><rect x="102" y="48" width="10" height="6" rx="1.5"/><rect x="116" y="48" width="10" height="6" rx="1.5"/><rect x="172" y="48" width="14" height="6" rx="1.5"/></g>
    ${me}
    <rect x="88" y="88" width="114" height="9" rx="3" fill="#f4efe6"/>
    <rect x="88" y="95" width="114" height="3" rx="1.5" fill="#00000022"/>
    ${stripes}
    ${bulbs}
    <rect x="8" y="104" width="206" height="7" fill="#ffffff" opacity=".45"/>
    <circle cx="12" cy="96" r="4.2" fill="#ffe27a"/>
    <rect x="3" y="108" width="20" height="8" rx="3" fill="#cfcfd8"/>
    <rect x="66" y="4" width="146" height="21" rx="9" fill="#fff" stroke="${dark}" stroke-width="2.4"/>
    <text x="139" y="18.6" font-size="11" font-weight="900" text-anchor="middle" fill="${dark}"
      font-family="ui-rounded, 'SF Pro Rounded', 'Nunito', 'Trebuchet MS', system-ui, sans-serif" letter-spacing=".4">NINGY NINGY CANTEEN</text>
    <g transform="translate(44 122)"><circle r="16" fill="#2b2233"/><circle r="7" fill="#cfcfd8"/><circle r="2.4" fill="#2b2233"/></g>
    <g transform="translate(172 122)"><circle r="16" fill="#2b2233"/><circle r="7" fill="#cfcfd8"/><circle r="2.4" fill="#2b2233"/></g>
    <path d="M26 106 a18 18 0 0 1 36 0" fill="none" stroke="${dark}" stroke-width="3"/>
    <path d="M154 106 a18 18 0 0 1 36 0" fill="none" stroke="${dark}" stroke-width="3"/>
  </svg>`;
}

/** The little truck on the map: inner SVG markup in a 40×28 box, facing left. */
export function miniTruck(color){
  const dark = shade(color);
  return `<ellipse cx="21" cy="26.5" rx="18" ry="2" fill="#00000030"/>
    <path d="M2 22 V14 Q2 10 6 9 L11 8 V22Z" fill="${color}"/>
    <path d="M4 14 Q4 11 7 10.5 L10 10 V14Z" fill="#bfe6ff"/>
    <rect x="10" y="3" width="29" height="19" rx="3" fill="${color}"/>
    <rect x="16" y="7" width="18" height="9" rx="1.5" fill="#4a3b5c"/>
    <path d="M15 6 h20 v3 h-20Z" fill="#ff5d6c"/>
    <rect x="12" y="0" width="25" height="4" rx="2" fill="#fff" stroke="${dark}" stroke-width=".8"/>
    <circle cx="9" cy="23" r="3.6" fill="#2b2233"/><circle cx="32" cy="23" r="3.6" fill="#2b2233"/>
    <circle cx="9" cy="23" r="1.4" fill="#cfcfd8"/><circle cx="32" cy="23" r="1.4" fill="#cfcfd8"/>`;
}
