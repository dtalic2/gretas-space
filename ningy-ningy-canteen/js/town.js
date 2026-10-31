// ---------- Milbil Town ----------
//
// The map you drive around: roads, the places milbils have lunch, and the
// little truck. Everything is in a 360 × 470 box. The truck drives along the
// roads from place to place and parks just under the place's sign.

import { SPOTS, SPOT, JUNCTIONS, ROADS } from './data.js';
import { miniTruck } from './truck.js';

export const MAP_W = 360, MAP_H = 470;
const PARK = 36;    // how far under its sign a place's parking spot is

const NODES = Object.fromEntries([...SPOTS, ...JUNCTIONS].map(n => [n.id, n.at]));
const LINKS = {};
for (const [a, b] of ROADS){
  (LINKS[a] ||= []).push(b);
  (LINKS[b] ||= []).push(a);
}
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

export const parkAt = (id) => [NODES[id][0], NODES[id][1] + PARK];

/** Shortest drive between two places: the points to drive through, and how far. */
export function route(from, to){
  const best = { [from]: 0 }, prev = {}, todo = new Set(Object.keys(NODES));
  while (todo.size){
    let u = null;
    for (const n of todo) if (best[n] != null && (u == null || best[n] < best[u])) u = n;
    if (u == null || u === to) break;
    todo.delete(u);
    for (const v of LINKS[u] || []){
      const d = best[u] + dist(NODES[u], NODES[v]);
      if (best[v] == null || d < best[v]){ best[v] = d; prev[v] = u; }
    }
  }
  const nodes = [to];
  while (nodes[0] !== from && prev[nodes[0]]) nodes.unshift(prev[nodes[0]]);
  const pts = [parkAt(from), ...nodes.map(n => NODES[n]), parkAt(to)];
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return { pts, len };
}

/** Where along a route you are after `d` map units, and which way you're facing. */
export function along(r, d){
  let i = 1;
  for (; i < r.pts.length; i++){
    const seg = dist(r.pts[i - 1], r.pts[i]);
    if (d <= seg || i === r.pts.length - 1){
      const f = seg ? Math.min(1, Math.max(0, d / seg)) : 1;
      const [a, b] = [r.pts[i - 1], r.pts[i]];
      return { x: a[0] + (b[0] - a[0]) * f, y: a[1] + (b[1] - a[1]) * f, dx: b[0] - a[0] };
    }
    d -= seg;
  }
  const p = r.pts[r.pts.length - 1];
  return { x: p[0], y: p[1], dx: 0 };
}

// ----------------------------------------------------------------- drawing ---

const tree = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">
  <rect x="-1.6" y="2" width="3.2" height="8" rx="1" fill="#8a6a4a"/>
  <circle r="8" fill="#4fae3a"/><circle cx="-2.5" cy="-2.5" r="3.4" fill="#6cc24a"/></g>`;
const house = (x, y, wall, roof) => `<g transform="translate(${x} ${y})">
  <rect x="-10" y="-4" width="20" height="14" rx="1.5" fill="${wall}"/>
  <path d="M-13 -3 L0 -14 L13 -3Z" fill="${roof}"/>
  <rect x="-3" y="3" width="6" height="7" fill="#7a5a3a"/>
  <rect x="4" y="0" width="4" height="4" fill="#bfe6ff"/></g>`;

function scenery(){
  return `
    <rect width="${MAP_W}" height="${MAP_H}" fill="#bfe6a0"/>
    <path d="M100 ${MAP_H} C180 420 270 430 ${MAP_W} 380 V${MAP_H}Z" fill="#f5dc95"/>
    <path d="M165 ${MAP_H} C225 446 300 448 ${MAP_W} 418 V${MAP_H}Z" fill="#7cc8f0"/>
    <path d="M205 458 q8 -5 16 0 M250 449 q8 -5 16 0 M300 440 q8 -5 16 0 M330 452 q8 -5 16 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>
    <ellipse cx="118" cy="288" rx="28" ry="15" fill="#7cc8f0"/>
    <ellipse cx="110" cy="284" rx="8" ry="2.4" fill="#fff" opacity=".5"/>
    <g transform="translate(86 322)">
      <rect width="76" height="50" rx="4" fill="#7fcf5a"/>
      <rect x="4" y="4" width="68" height="42" rx="2" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/>
      <path d="M38 4 V46" stroke="#fff" stroke-width="1.6" opacity=".8"/><circle cx="38" cy="25" r="7" fill="none" stroke="#fff" stroke-width="1.6" opacity=".8"/>
    </g>
    ${house(102, 128, '#ffe0b8', '#e5484d')}${house(138, 150, '#fff', '#5b8def')}${house(108, 178, '#ffd6e5', '#9b5de5')}
    ${house(222, 128, '#fff4c4', '#3fae4a')}${house(256, 160, '#e3f4ff', '#ff9a3c')}${house(220, 186, '#fff', '#e5484d')}
    ${house(226, 288, '#ffe0b8', '#5b8def')}${house(258, 318, '#fff', '#ff6fa5')}${house(222, 346, '#e7ffe0', '#e5484d')}
    ${tree(152, 270)}${tree(158, 300, .8)}${tree(80, 262, .9)}${tree(146, 196, .8)}${tree(260, 196, .8)}
    ${tree(20, 150)}${tree(24, 320, .9)}${tree(340, 150)}${tree(338, 300, .9)}${tree(18, 30, .8)}${tree(342, 30, .8)}
    ${tree(120, 40, .8)}${tree(240, 40, .8)}${tree(268, 270, .8)}`;
}

function roads(){
  const segs = ROADS.map(([a, b]) => {
    const [x1, y1] = NODES[a], [x2, y2] = NODES[b];
    return `M${x1} ${y1} L${x2} ${y2}`;
  }).join(' ');
  const stubs = SPOTS.map(s => { const [x, y] = s.at; return `M${x} ${y} V${y + PARK + 6}`; }).join(' ');
  return `<path d="${segs} ${stubs}" stroke="#9aa0ad" stroke-width="17" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${segs}" stroke="#fff" stroke-width="2" stroke-dasharray="7 8" fill="none" opacity=".85"/>`;
}

function badge(s, count, here){
  const [x, y] = s.at;
  const ring = s.shop ? '#ff7a59' : here ? '#3fae4a' : '#8b7bff';
  const name = s.short;
  const w = name.length * 6.4 + 14;
  return `<g class="spot" data-spot="${s.id}" transform="translate(${x} ${y})" role="button" aria-label="${s.name}">
    <circle r="27" fill="transparent"/>
    <circle r="21" fill="#fff" stroke="${ring}" stroke-width="4"/>
    <text y="1" font-size="21" text-anchor="middle" dominant-baseline="central">${s.icon}</text>
    <rect x="${-w / 2}" y="-41" width="${w}" height="16" rx="8" fill="#2f2640" opacity=".88"/>
    <text y="-30" font-size="10.5" font-weight="800" fill="#fff" text-anchor="middle">${name}</text>
    ${count > 0 ? `<g transform="translate(18 -16)"><circle r="9.5" fill="#e5484d" stroke="#fff" stroke-width="2"/>
      <text y="3.6" font-size="10.5" font-weight="900" fill="#fff" text-anchor="middle">${count}</text></g>` : ''}
  </g>`;
}

/**
 * The whole map. `counts` is hungry milbils per place, `at` is where the
 * truck is parked.
 */
export function mapSVG({ counts = {}, at, color, selected, supercool = false }){
  const [tx, ty] = parkAt(at);
  return `<svg class="map" viewBox="0 0 ${MAP_W} ${MAP_H}" font-family="ui-rounded, 'SF Pro Rounded', 'Nunito', 'Trebuchet MS', system-ui, sans-serif">
    ${scenery()}
    ${roads()}
    ${selected && selected !== at ? `<circle class="pick-ring" cx="${SPOT[selected].at[0]}" cy="${SPOT[selected].at[1]}" r="30" fill="none" stroke="#ffc531" stroke-width="5"/>` : ''}
    ${SPOTS.map(s => badge(s, counts[s.id] || 0, s.id === at)).join('')}
    <g id="mapTruck" transform="translate(${tx - 20} ${ty - 14})"><g class="flip">${miniTruck(color, supercool)}</g></g>
  </svg>`;
}

/** Put the map's truck at a point, facing the way it's going. */
export function placeTruck(svg, x, y, dx){
  const g = svg.querySelector('#mapTruck');
  if (!g) return;
  g.setAttribute('transform', `translate(${x - 20} ${y - 14})`);
  if (dx){
    const f = g.querySelector('.flip');
    // The little truck faces left; flip it to drive right.
    f.setAttribute('transform', dx > 0 ? 'translate(40 0) scale(-1 1)' : '');
  }
}
