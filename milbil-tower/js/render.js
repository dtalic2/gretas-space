// ---------- Drawing a frame ----------
//
// Reads game.js, writes to the canvas, and keeps no state of its own beyond a
// set of baked layers. Order matters: the board sits behind the Milbils, the
// tower in front of them, and the effects on top of everything.
//
// A neon stroke costs four shadow-blurred passes, which is far too much to spend
// sixty times a second on shapes that never change. So the grid, the tower legs,
// the barrel and the shield pips are each baked once per layout and blitted;
// only the charge ring, the aim line and the lock-on rings are stroked live.

import { N, buildGrid } from './board.js';
import { FRAMES, FIT } from './milbil-art.js';
import { game, PHASE, hitRadius } from './game.js';
import { towerStats } from './upgrades.js';
import { state } from './state.js';
import { neon, neonFill } from './neon.js';
import * as fx from './fx.js';

const TAU = Math.PI * 2;

let grid = null;
let chrome = null;
let bakedFor = '';

export function invalidate() { bakedFor = ''; }

/** Render into an offscreen canvas of `w` x `h` CSS pixels at device resolution. */
function bake(w, h, dpr, drawFn) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, Math.ceil(w * dpr));
  cv.height = Math.max(1, Math.ceil(h * dpr));
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);
  drawFn(c);
  return cv;
}

// ---------- baked tower parts ----------

function legPath(mx, half, neck, foot) {
  const midY = (neck + foot) / 2;
  const midHalf = half * 1.02;
  const p = new Path2D();
  p.moveTo(mx - half * 1.5, foot);
  p.lineTo(mx - half * 0.5, neck);
  p.lineTo(mx + half * 0.5, neck);
  p.lineTo(mx + half * 1.5, foot);
  // One crossbar and two braces, all kept inside the legs.
  p.moveTo(mx - midHalf, midY); p.lineTo(mx + midHalf, midY);
  p.moveTo(mx - half * 0.5, neck); p.lineTo(mx + midHalf, midY);
  p.moveTo(mx + half * 0.5, neck); p.lineTo(mx - midHalf, midY);
  p.moveTo(mx - midHalf, midY); p.lineTo(mx + half * 1.5, foot);
  p.moveTo(mx + midHalf, midY); p.lineTo(mx - half * 1.5, foot);
  return p;
}

function barrelPath(half) {
  const p = new Path2D();
  p.moveTo(-half * 0.18, 0); p.lineTo(half * 0.98, 0);
  p.moveTo(half * 0.60, -half * 0.28); p.lineTo(half * 0.60, half * 0.28);
  p.moveTo(half * 0.98, -half * 0.18); p.lineTo(half * 0.98, half * 0.18);
  return p;
}

function pipPath(w) {
  const p = new Path2D();
  p.moveTo(0, 0); p.lineTo(w, 0);
  p.lineTo(w, 7); p.lineTo(w / 2, 13); p.lineTo(0, 7);
  p.closePath();
  return p;
}

function buildChrome(L, dpr) {
  const { muzzle, baseY, towerH, cell } = L;
  const half = Math.min(cell * 0.68, towerH * 0.46);
  const foot = baseY - 15;
  const neck = muzzle.y + half * 0.34;
  const lineW = Math.max(1.8, cell * 0.028);
  const pad = Math.max(16, half * 0.55);

  // --- legs, in screen coordinates, in a box tight around the tower ---
  const lx = muzzle.x - half * 1.5 - pad;
  const ly = neck - pad;
  const lw = half * 3 + pad * 2;
  const lh = Math.max(2, foot - neck) + pad * 2;
  const legs = bake(lw, lh, dpr, (c) => {
    c.translate(-lx, -ly);
    neon(c, legPath(muzzle.x, half, neck, foot), '#36d8ff', lineW, { glow: 0.9, alpha: 0.9 });
  });

  // --- barrel and hub, centred on the muzzle so it can simply be rotated ---
  const B = half * 1.7;
  const barrel = (ready) => bake(B * 2, B * 2, dpr, (c) => {
    c.translate(B, B);
    neon(c, barrelPath(half), ready ? '#7af0ff' : '#4a8aa0',
      Math.max(2.4, cell * 0.05), { glow: ready ? 1.3 : 0.6 });
    const hub = new Path2D();
    hub.arc(0, 0, half * 0.30, 0, TAU);
    neonFill(c, hub, ready ? '#9dfaff' : '#2b6c80', { glow: 1.1, alpha: 0.95 });
  });

  // --- shield pips ---
  const sw = 11, sh = 13, sp = 7;
  const pip = (on) => bake(sw + sp * 2, sh + sp * 2, dpr, (c) => {
    c.translate(sp, sp);
    const p = pipPath(sw);
    if (on) neon(c, p, '#5fffa8', 2, { glow: 1, core: null });
    else { c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.6; c.stroke(p); }
  });

  return {
    half, B, sw, sh, sp,
    legs, lx, ly, lw, lh,
    barrelReady: barrel(true), barrelIdle: barrel(false),
    pipOn: pip(true), pipOff: pip(false),
  };
}

// ---------- the frame ----------

export function draw(ctx, L, sprites, dpr) {
  const key = `${L.W}x${L.H}x${dpr}`;
  if (key !== bakedFor) {
    grid = buildGrid(L, dpr);
    chrome = buildChrome(L, dpr);
    bakedFor = key;
  }

  ctx.clearRect(0, 0, L.W, L.H);

  const sh = fx.shakeOffset();
  ctx.save();
  ctx.translate(sh.x, sh.y);

  drawDangerRow(ctx, L);
  ctx.drawImage(grid, 0, 0, L.W, L.H);          // background wash + grid, baked

  if (game.phase === PHASE.PLAY) drawAimLine(ctx, L);

  for (const m of game.milbils) if (!m.dead) drawMilbilSprite(ctx, L, sprites, m);

  fx.draw(ctx);
  drawTower(ctx, L, chrome);

  ctx.restore();

  if (game.banner) drawBanner(ctx, L);
}

/** The near row: the last square before a Milbil reaches the tower. */
function drawDangerRow(ctx, L) {
  const { bx, by, board, cell } = L;
  const y = by + (N - 1) * cell;
  const threat = game.milbils.some((m) => !m.dead && (m.row >= N - 1 || m.escaping));
  const pulse = 0.5 + 0.5 * Math.sin(game.time * (threat ? 7 : 2.4));
  const a = (threat ? 0.14 : 0.05) + pulse * (threat ? 0.16 : 0.045);

  const g = ctx.createLinearGradient(0, y, 0, y + cell);
  g.addColorStop(0, 'rgba(255,60,90,0)');
  g.addColorStop(1, `rgba(255,60,90,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(bx, y, board, cell);
}

/** Where the shot will go, and what it will hit. */
function drawAimLine(ctx, L) {
  const { muzzle, W, H } = L;
  let dx = game.aim.x - muzzle.x, dy = game.aim.y - muzzle.y;
  if (dy > -8) dy = -8;
  const len = Math.hypot(dx, dy) || 1;
  dx /= len; dy /= len;

  const ready = game.charge >= 1;
  // Stop the guide at the far edge of the board. Running it off the top of the
  // screen just draws a stripe through the HUD.
  const far = dy < -1e-6 ? (L.by - muzzle.y) / dy : Math.hypot(W, H);

  ctx.save();
  ctx.setLineDash([7, 11]);
  ctx.lineDashOffset = -game.time * 60;
  ctx.strokeStyle = ready ? 'rgba(122,240,255,.55)' : 'rgba(122,240,255,.20)';
  ctx.lineWidth = 1.6;
  ctx.shadowColor = '#7af0ff';
  ctx.shadowBlur = ready ? 10 : 4;
  ctx.beginPath();
  ctx.moveTo(muzzle.x + dx * 26, muzzle.y + dy * 26);
  ctx.lineTo(muzzle.x + dx * far, muzzle.y + dy * far);
  ctx.stroke();
  ctx.restore();

  // Lock-on rings. A faded Blinky is deliberately left off — spotting one is the
  // whole point of that variant.
  for (const m of game.milbils) {
    if (m.dead || !game.locked.includes(m.id) || m.alpha < 0.3) continue;
    const r = hitRadius(m) * 1.15;
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(game.time * 1.6);
    ctx.setLineDash([r * 0.5, r * 0.42]);
    ctx.strokeStyle = ready ? '#ff5f8f' : 'rgba(255,95,143,.4)';
    ctx.shadowColor = '#ff5f8f';
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawMilbilSprite(ctx, L, sprites, m) {
  const frames = sprites[m.key];
  const f = frames[Math.floor(m.phase * FRAMES) % FRAMES];

  // Arrival: a quick overshoot, so a Milbil pops onto the board rather than fading in.
  const w = m.warp;
  const grow = w < 1 ? 0.35 + 0.65 * (1 - Math.pow(1 - w, 3)) + Math.sin(w * Math.PI) * 0.16 : 1;

  const size = (L.cell * m.t.scale / FIT) * grow;
  const alpha = m.alpha * Math.min(1, w * 1.6);
  const x = m.x - size / 2, y = m.y - size / 2;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(f, x, y, size, size);
  if (m.flash > 0.01) {
    // Additive re-draw: the sprite blows out white-hot for a moment when zapped.
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha * m.flash;
    ctx.drawImage(f, x, y, size, size);
    ctx.drawImage(f, x, y, size, size);
  }
  ctx.restore();

  if (m.maxHp > 1 && m.warp > 0.6) drawHealth(ctx, L, m, alpha);
}

/**
 * Health under a Milbil that takes more than one zap. A Chonk gets three legible
 * pips; a MEGA's twelve would read as a dashed line, so it gets a solid bar.
 */
function drawHealth(ctx, L, m, alpha) {
  const w = Math.min(L.cell * 0.78, m.maxHp * 10);
  const x = m.x - w / 2;
  const y = m.y + L.cell * m.t.scale * 0.54;
  const h = m.maxHp > 5 ? 5 : 4;

  ctx.save();
  ctx.globalAlpha = alpha;
  if (m.maxHp > 5) {
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#9dff6b';
    ctx.fillRect(x, y, w * (m.hp / m.maxHp), h);
    ctx.strokeStyle = 'rgba(157,255,107,.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
  } else {
    const pw = w / m.maxHp;
    for (let i = 0; i < m.maxHp; i++) {
      ctx.fillStyle = i < m.hp ? '#9dff6b' : 'rgba(255,255,255,.16)';
      ctx.fillRect(x + i * pw + 1, y, pw - 2.5, h);
    }
  }
  ctx.restore();
}

function drawTower(ctx, L, C) {
  const { muzzle, baseY } = L;
  const S = towerStats(state.up);
  const ready = game.charge >= 1;

  ctx.drawImage(C.legs, C.lx, C.ly, C.lw, C.lh);

  // --- charge ring: a full circle means the laser is ready ---
  const r = C.half * 0.78;
  ctx.save();
  ctx.translate(muzzle.x, muzzle.y);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.10)';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();

  const col = ready ? '#7af0ff' : '#ffa43c';
  ctx.strokeStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = ready ? 16 + Math.sin(game.time * 6) * 6 : 8;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + TAU * game.charge);
  ctx.stroke();
  ctx.restore();

  // --- barrel ---
  ctx.save();
  ctx.translate(muzzle.x, muzzle.y);
  ctx.rotate(game.barrel);
  ctx.drawImage(ready ? C.barrelReady : C.barrelIdle, -C.B, -C.B, C.B * 2, C.B * 2);
  ctx.restore();

  // --- shields ---
  const gap = 6;
  const total = S.maxShields * C.sw + (S.maxShields - 1) * gap;
  for (let i = 0; i < S.maxShields; i++) {
    const x = muzzle.x - total / 2 + i * (C.sw + gap) - C.sp;
    const y = baseY - C.sh - C.sp - 1;
    ctx.drawImage(i < game.shields ? C.pipOn : C.pipOff, x, y, C.sw + C.sp * 2, C.sh + C.sp * 2);
  }
}

function drawBanner(ctx, L) {
  const b = game.banner;
  const t = game.bannerT;
  const inK = Math.min(1, t / 0.28);
  const outK = game.phase === PHASE.INTRO
    ? Math.min(1, Math.max(0, (1.7 - t) / 0.4))
    : Math.min(1, Math.max(0, (2.4 - t) / 0.5));
  const a = Math.min(inK, outK);
  if (a <= 0.01) return;

  const cy = L.by + L.board * 0.42;
  const size = Math.min(L.board * 0.14, 62);
  const col = b.good ? '#9dff6b' : b.boss ? '#ff8a3c' : '#7af0ff';

  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.translate(L.W / 2, cy);
  ctx.scale(0.94 + inK * 0.06, 0.94 + inK * 0.06);

  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(-L.board / 2, -size * 1.1, L.board, size * 2.2);

  ctx.font = `900 ${size}px "Baloo 2","Trebuchet MS",system-ui,sans-serif`;
  ctx.shadowColor = col;
  ctx.shadowBlur = 26;
  ctx.fillStyle = col;
  ctx.fillText(b.title, 0, -size * 0.28);
  ctx.shadowBlur = 8;
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = a * 0.55;
  ctx.fillText(b.title, 0, -size * 0.28);

  ctx.globalAlpha = a;
  ctx.font = `700 ${Math.max(13, size * 0.32)}px "Baloo 2","Trebuchet MS",system-ui,sans-serif`;
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  ctx.fillText(b.sub, 0, size * 0.52);
  ctx.restore();
}
