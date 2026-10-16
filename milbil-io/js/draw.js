// ---------- Drawing the island ----------
//
// Each frame: the sea, the island, everyone's land (standing up a little off
// the ground with a darker edge underneath, like paper.io), the trails, and the
// milbils on top. Only the cells on screen are drawn.

import { world, owner, inside, W, MID, cellAt } from './world.js';
import { RADIUS, VIEW, LIFT, SEA, GROUND, GROUND_2, GROUND_RGB, SIDE, RIM } from './data.js';
import { rainbowAt } from './colors.js';
import { sprite } from './sprites.js';

export const cam = { x: MID, y: MID, s: 30, w: 1, h: 1, dpr: 1 };   // s: device pixels per cell
const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
const TAU = Math.PI * 2;

let canvas, ctx, pals = [];
const bits = [];        // flying bits when somebody's caught
const floats = [];      // words floating up off the board

// Cells wholly on the island get the checks. The ones on the rim stay plain so
// the edge looks round.
const whole = new Uint8Array(W * W);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++){
  let n = 0;
  for (const [cx, cy] of [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]]) if ((cx - MID) ** 2 + (cy - MID) ** 2 <= RADIUS * RADIUS) n++;
  whole[y * W + x] = n === 4 ? 1 : 0;
}

export function initDraw(el){
  canvas = el;
  ctx = el.getContext('2d', { alpha: false });
  resize();
  addEventListener('resize', resize);
}

export const setPalettes = (p) => { pals = p; };

function resize(){
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(innerWidth * dpr);
  canvas.height = Math.round(innerHeight * dpr);
  cam.dpr = dpr; cam.w = canvas.width; cam.h = canvas.height;
  cam.s = Math.max(Math.min(cam.w, cam.h) / VIEW, Math.max(cam.w, cam.h) / 54);
}

// Board (cells) to screen (device pixels).
export const sx = (x) => (x - cam.x) * cam.s + cam.w / 2;
export const sy = (y) => (y - cam.y) * cam.s + cam.h / 2;

export function follow(x, y, dt, snap = false){
  const k = snap ? 1 : Math.min(1, dt * 7);
  cam.x += (x - cam.x) * k;
  cam.y += (y - cam.y) * k;
}

function oval(x, y, rx, ry){
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/** Bits flying off a milbil that's just been caught. */
export function burst(x, y, id){
  const pal = pals[id];
  for (let k = 0; k < 28; k++){
    const a = Math.random() * TAU, v = 2 + Math.random() * 6;
    const color = pal.rainbow ? pal.land[k % pal.land.length] : k % 3 ? pal.land : pal.side;
    bits.push({ x, y: y - 1, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 4, life: 1, spin: Math.random() * 6, color, size: .22 + Math.random() * .25 });
  }
}

/** Words that float up off the board and fade, like "+0.42%". */
export function floatText(x, y, text, color = '#fff', big = false){
  floats.push({ x, y, text, color, big, life: 1 });
}

function drawLand(L){
  const { w, h, s } = cam;
  const x0 = Math.max(0, Math.floor(cam.x - w / 2 / s) - 1), x1 = Math.min(W - 2, Math.ceil(cam.x + w / 2 / s) + 1);
  const y0 = Math.max(0, Math.floor(cam.y - h / 2 / s) - 1), y1 = Math.min(W - 2, Math.ceil(cam.y + h / 2 / s) + 2);
  // Rounded edges, so neighbouring cells meet without hairline gaps.
  const X = [], Y = [];
  for (let x = x0; x <= x1 + 1; x++) X.push(Math.round(sx(x)));
  for (let y = y0; y <= y1 + 1; y++) Y.push(Math.round(sy(y)));

  ctx.fillStyle = GROUND_2;
  for (let y = y0; y <= y1; y++){
    const row = y * W, top = Y[y - y0], hgt = Y[y - y0 + 1] - top;
    for (let x = x0 + ((x0 + y + 1) & 1); x <= x1; x += 2){
      if (whole[row + x] && !owner[row + x]) ctx.fillRect(X[x - x0], top, X[x - x0 + 1] - X[x - x0], hgt);
    }
  }

  // Row by row from the top, so each row's top covers the edge of the row above.
  for (let y = y0; y <= y1; y++){
    const row = y * W, top = Y[y - y0] - L, bot = Y[y - y0 + 1] - L;
    let x = x0;
    while (x <= x1){
      const o = owner[row + x];
      if (!o){ x++; continue; }
      const pal = pals[o];
      if (pal.rainbow){
        const k = rainbowAt(x, y), l = X[x - x0], r = X[x - x0 + 1];
        if (owner[row + x + W] !== o){ ctx.fillStyle = pal.side[k]; ctx.fillRect(l, bot, r - l, L); }
        ctx.fillStyle = pal.land[k]; ctx.fillRect(l, top, r - l, bot - top);
        x++;
        continue;
      }
      const edge = owner[row + x + W] !== o;
      let e = x + 1;
      while (e <= x1 && owner[row + e] === o && (owner[row + e + W] !== o) === edge) e++;
      const l = X[x - x0], r = X[e - x0];
      if (edge){ ctx.fillStyle = pal.side; ctx.fillRect(l, bot, r - l, L); }
      ctx.fillStyle = pal.land; ctx.fillRect(l, top, r - l, bot - top);
      x = e;
    }
  }
}

function drawTrails(t){
  const s = cam.s;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of world.players){
    if (!p.alive || !p.pts.length) continue;
    const pal = pals[p.id];
    ctx.beginPath();
    ctx.moveTo(sx(p.pts[0].x), sy(p.pts[0].y));
    for (let k = 1; k < p.pts.length; k++) ctx.lineTo(sx(p.pts[k].x), sy(p.pts[k].y));
    ctx.lineTo(sx(p.x), sy(p.y));
    const color = pal.rainbow ? pal.trail(t) : pal.trail;
    ctx.strokeStyle = color;
    ctx.globalAlpha = .14;              // a soft glow round it
    ctx.lineWidth = s * 1.15;
    ctx.stroke();
    ctx.globalAlpha = .3;
    ctx.lineWidth = s * .82;
    ctx.stroke();
    ctx.globalAlpha = .95;
    ctx.lineWidth = s * .52;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawMilbil(p, L, dt, crown, you){
  const s = cam.s, pal = pals[p.id];
  // Stand on top of land, and down on the ground off it.
  const on = owner[cellAt(p.x, p.y)] ? L : 0;
  p.z = p.z === undefined ? on : p.z + (on - p.z) * Math.min(1, dt * 14);
  const fx = sx(p.x), fy = sy(p.y) - p.z;
  if (fx < -3 * s || fx > cam.w + 3 * s || fy < -1 * s || fy > cam.h + 4 * s) return;

  // A round base in their colour, like a counter in a board game.
  ctx.fillStyle = pal.rainbow ? '#6a4bc4' : pal.side;
  oval(fx, fy + .06 * s, .8 * s, .36 * s);
  ctx.fillStyle = pal.rainbow ? pal.land[Math.floor(p.walk) % pal.land.length] : pal.land;
  oval(fx, fy - .04 * s, .68 * s, .27 * s);

  const H = 2.5 * s;
  const sp = sprite(p.ch);
  if (sp.ready){
    const ht = H * sp.scale, wd = ht * sp.img.width / sp.img.height;
    const bob = Math.abs(Math.sin(p.walk)) * .14 * s;
    ctx.save();
    ctx.translate(fx, fy - bob);
    ctx.rotate(Math.cos(p.dir) * .12 + Math.sin(p.walk) * .05);
    ctx.drawImage(sp.img, -wd / 2, -ht * sp.foot, wd, ht);
    ctx.restore();
  }

  const size = Math.round(s * (you ? .6 : .5));
  const ly = fy - H - .25 * s;
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(3, s * .17);
  ctx.strokeStyle = pal.ink;
  ctx.strokeText(p.name, fx, ly);
  ctx.fillStyle = you ? '#ffe45c' : '#fff';
  ctx.fillText(p.name, fx, ly);
  if (crown){
    ctx.font = `${Math.round(s * .7)}px ${FONT}`;
    ctx.fillText('👑', fx, ly - size);
  }
}

function drawBits(dt){
  const s = cam.s;
  for (let k = bits.length - 1; k >= 0; k--){
    const b = bits[k];
    b.x += b.vx * dt; b.y += b.vy * dt; b.vy += 14 * dt; b.spin += dt * 8;
    if ((b.life -= dt * 1.1) <= 0){ bits.splice(k, 1); continue; }
    const z = b.size * s;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life * 2);
    ctx.translate(sx(b.x), sy(b.y));
    ctx.rotate(b.spin);
    ctx.fillStyle = b.color;
    ctx.fillRect(-z / 2, -z / 2, z, z);
    ctx.restore();
  }
  for (let k = floats.length - 1; k >= 0; k--){
    const f = floats[k];
    if ((f.life -= dt * .75) <= 0){ floats.splice(k, 1); continue; }
    const rise = (1 - f.life) * 1.6 * s, size = Math.round(s * (f.big ? 1.1 : .8));
    ctx.globalAlpha = Math.min(1, f.life * 2.5);
    ctx.font = `900 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, s * .2);
    ctx.strokeStyle = '#2b2233';
    ctx.strokeText(f.text, sx(f.x), sy(f.y) - rise);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, sx(f.x), sy(f.y) - rise);
    ctx.globalAlpha = 1;
  }
}

/** Draw a frame. `t` is seconds (for colours that change), `dt` is how far to animate. */
export function render(t, dt, leaderId, youId){
  const { w, h, s } = cam;
  const L = Math.max(1, Math.round(LIFT * s));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = SEA;
  ctx.fillRect(0, 0, w, h);

  const ox = sx(MID), oy = sy(MID), R = RADIUS * s;
  ctx.fillStyle = SIDE;
  oval(ox, oy + L * 2, R + s * .25, R + s * .25);
  ctx.fillStyle = GROUND;
  oval(ox, oy, R, R);
  // A glowing line round the island.
  ctx.strokeStyle = RIM;
  for (const [alpha, width] of [[.12, 1.6], [.25, .9], [1, .22]]){
    ctx.globalAlpha = alpha;
    ctx.lineWidth = s * width;
    ctx.beginPath();
    ctx.arc(ox, oy, R + s * .1, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.beginPath();
  ctx.arc(ox, oy, R + L, 0, TAU);
  ctx.clip();
  drawLand(L);
  ctx.restore();

  drawTrails(t);
  const order = world.players.filter(p => p.alive).sort((a, b) => a.y - b.y);
  for (const p of order) drawMilbil(p, L, dt, p.id === leaderId, p.id === youId);
  drawBits(dt);
}

// ------------------------------------------------------------- mini-map ---

let mini, mctx, flat, fctx, pixels;

export function initMini(el){
  mini = el;
  mctx = el.getContext('2d');
  flat = document.createElement('canvas');
  flat.width = flat.height = W;
  fctx = flat.getContext('2d');
  pixels = fctx.createImageData(W, W);
}

/** The whole island, small, with a dot where you are. */
export function drawMini(you){
  const size = Math.round(mini.clientWidth * cam.dpr) || 1;
  if (mini.width !== size){ mini.width = mini.height = size; }
  const d = pixels.data;
  for (let i = 0, k = 0; i < W * W; i++, k += 4){
    if (!inside[i]){ d[k + 3] = 0; continue; }
    const o = owner[i];
    const c = !o ? GROUND_RGB : pals[o].rainbow ? pals[o].mini[rainbowAt(i % W, i / W | 0)] : pals[o].mini;
    d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
  }
  fctx.putImageData(pixels, 0, 0);
  mctx.clearRect(0, 0, size, size);
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(flat, 0, 0, size, size);
  if (you && you.alive){
    const x = you.x / W * size, y = you.y / W * size, r = Math.max(3, size * .035);
    mctx.beginPath();
    mctx.arc(x, y, r, 0, TAU);
    mctx.fillStyle = '#fff';
    mctx.fill();
    mctx.lineWidth = r * .55;
    mctx.strokeStyle = '#2b2233';
    mctx.stroke();
  }
}
