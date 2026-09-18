// ---------- One frame ----------
//
// Order matters more than anything else in here. Smoke goes behind the Milbils
// and blast light goes over the terrain but under them, so an explosion lights
// the ground a creature is standing on instead of washing the creature out.
// Water goes last of the world layers so anything falling into it is tinted by
// it. Name tags come after the camera transform is dropped, in screen space, so
// text is always the same size and always crisp, however far the camera is
// zoomed out.

import { TAU, clamp, lerp } from './util.js';
import { WORLD } from './terrain.js';
import { WEAPONS } from './weapons.js';
import { neon, neonFill } from './neon.js';
import * as fx from './fx.js';
import * as proj from './projectiles.js';
import { G, MAX_HP, previewArc, needsTarget, worldToScreen } from './game.js';
import { drawSkyWash, drawBackdrop } from './sky.js';
import { IDLE_FRAMES, WALK_FRAMES } from './art.js';

const SPR = 74;         // a Milbil sprite is this many world pixels square
const FEET = 0.8344;    // where the feet sit inside that square

export function draw(ctx, dpr = 1) {
  const { view, cam, theme } = G;

  // Everything below is in CSS pixels; this is the only place the device pixel
  // ratio is applied.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawSkyWash(ctx, theme, view.w, view.h);

  const shake = fx.shakeOffset();
  ctx.save();
  ctx.translate(view.w / 2 + shake.x, view.h / 2 + shake.y);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x, -cam.y);

  // What the camera can see, in world units, with a little slack for the shake.
  const vw = view.w / cam.zoom, vh = view.h / cam.zoom;
  const rect = {
    x0: cam.x - vw / 2 - 40, x1: cam.x + vw / 2 + 40,
    y0: cam.y - vh / 2 - 40, y1: cam.y + vh / 2 + 40,
  };

  if (G.backdrop) drawBackdrop(ctx, G.backdrop, cam, rect);
  if (G.motes) G.motes.draw(ctx);

  fx.drawSmoke(ctx);
  G.terrain.draw(ctx, rect);
  fx.drawLights(ctx);

  drawCrates(ctx);
  for (const m of G.milbils) if (m.alive) drawMilbil(ctx, m);
  proj.draw(G, ctx);
  drawAim(ctx);
  fx.draw(ctx, cam.zoom);
  drawWater(ctx, rect);

  ctx.restore();

  drawTags(ctx);
  drawEdgeMarker(ctx);
  drawFlash(ctx);
  drawVignette(ctx);
}

// ---------------------------------------------------------------- creatures

function spriteOf(m) {
  const sheets = G.teams[m.team].sprites;
  if (m.dying || m.hurtT > 0.18) return sheets.hurt[0];
  if (!m.grounded) return sheets.air[0];
  if (m.walking > 0) return sheets.walk[(m.phase * WALK_FRAMES | 0) % WALK_FRAMES];
  return sheets.idle[(m.phase * IDLE_FRAMES | 0) % IDLE_FRAMES];
}

function drawMilbil(ctx, m) {
  const team = G.teams[m.team];
  const img = spriteOf(m);
  const active = G.active === m && G.phase !== 'over';

  // A soft pool of team colour under the feet: at a glance, sides.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = active ? 0.42 : 0.2;
  const g = ctx.createRadialGradient(m.x, m.y - 2, 1, m.x, m.y - 2, 34);
  g.addColorStop(0, team.accent);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(m.x - 36, m.y - 20, 72, 36);
  ctx.restore();

  ctx.save();
  ctx.translate(m.x, m.y - SPR * FEET);
  if (m.facing < 0) {
    ctx.translate(SPR / 2, 0);
    ctx.scale(-1, 1);
    ctx.translate(-SPR / 2, 0);
  }
  if (m.hurtT > 0) {
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(m.hurtT * 40);
  }
  ctx.drawImage(img, -SPR / 2, 0, SPR, SPR);
  ctx.restore();

  drawArm(ctx, m, active);

  if (active && G.phase !== 'fire') {
    // A filled dart that hops above whoever is up, clear of the name tag.
    const bob = Math.sin(G.time * 4) * 4;
    const y = m.y - 92 + bob;
    const p = new Path2D();
    p.moveTo(m.x, y + 10);
    p.lineTo(m.x - 8, y - 3);
    p.lineTo(m.x + 8, y - 3);
    p.closePath();
    neonFill(ctx, p, team.accent, { glow: 1.5 });
  }
}

/** The arm holding the weapon — the one part of a Milbil drawn live. */
function drawArm(ctx, m, active) {
  const team = G.teams[m.team];
  const pal = team.sprites.pal;
  const a = m.aim;
  const sx = m.x - 7 * m.facing;
  const sy = m.y - 25;
  const ex = sx + Math.cos(a) * 15;
  const ey = sy + Math.sin(a) * 15;

  const arm = new Path2D();
  arm.moveTo(sx, sy);
  arm.quadraticCurveTo(lerp(sx, ex, 0.5) - Math.sin(a) * 3, lerp(sy, ey, 0.5) + Math.cos(a) * 3, ex, ey);
  neon(ctx, arm, pal.armDown, 2.6, { glow: 1.05 });

  const w = WEAPONS[G.weapon];
  const showGun = active && (G.phase === 'aim' || G.phase === 'fire');
  if (!showGun) return;

  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(a);
  const p = new Path2D();
  if (w.kind === 'hitscan') {
    p.moveTo(-3, -3); p.lineTo(22, -3); p.lineTo(22, 3); p.lineTo(-3, 3); p.closePath();
    p.moveTo(22, -5); p.lineTo(26, 0); p.lineTo(22, 5);
  } else if (w.utility) {
    p.arc(6, 0, 7, 0, TAU);
    p.moveTo(6, -7); p.lineTo(13, 0);
  } else if (w.kind === 'drop') {
    p.rect(0, -7, 12, 14);
  } else if (w.mega) {
    for (let i = 0; i < 5; i++) {
      const t = (i / 5) * TAU - Math.PI / 2;
      const t2 = t + TAU / 10;
      p.lineTo(8 + Math.cos(t) * 11, Math.sin(t) * 11);
      p.lineTo(8 + Math.cos(t2) * 4.6, Math.sin(t2) * 4.6);
    }
    p.closePath();
  } else {
    p.rect(-4, -5, 26, 10);
    p.moveTo(22, -5); p.lineTo(28, 0); p.lineTo(22, 5);
  }
  neon(ctx, p, w.color, 2.6, { glow: 1.25 });
  ctx.restore();
}

// ---------------------------------------------------------------- crates

function drawCrates(ctx) {
  for (const c of G.crates) {
    const bob = c.grounded ? Math.sin(c.bob) * 2.5 : 0;
    const col = c.kind === 'health' ? '#9dff6b' : '#ffd75e';

    if (!c.grounded) {
      const chute = new Path2D();
      chute.moveTo(c.x - 22, c.y - 24);
      chute.quadraticCurveTo(c.x, c.y - 56, c.x + 22, c.y - 24);
      chute.moveTo(c.x - 22, c.y - 24); chute.lineTo(c.x - 8, c.y - 12);
      chute.moveTo(c.x + 22, c.y - 24); chute.lineTo(c.x + 8, c.y - 12);
      chute.moveTo(c.x, c.y - 44); chute.lineTo(c.x, c.y - 12);
      neon(ctx, chute, col, 2.2, { glow: 1.1 });
    }

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.3;
    const g = ctx.createRadialGradient(c.x, c.y + bob, 2, c.x, c.y + bob, 46);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(c.x - 48, c.y + bob - 48, 96, 96);
    ctx.restore();

    const box = new Path2D();
    box.rect(c.x - 13, c.y + bob - 13, 26, 26);
    box.moveTo(c.x - 13, c.y + bob - 4); box.lineTo(c.x + 13, c.y + bob - 4);
    neon(ctx, box, col, 2.6, { glow: 1.2 });

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(c.kind === 'health' ? '✚' : WEAPONS[c.item].icon, c.x, c.y + bob + 4);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- aiming

function drawAim(ctx) {
  const m = G.active;
  if (!m || G.phase === 'over') return;
  const team = G.teams[m.team];
  const human = !team.cpu;
  if (G.phase !== 'aim' && G.phase !== 'fire') return;

  const w = WEAPONS[G.weapon];
  const mz = proj.muzzleOf(m);

  // target marker for the weapons that need one
  if (needsTarget() && G.target) {
    const t = G.target;
    const r = 16 + Math.sin(G.time * 6) * 3;
    const cross = new Path2D();
    cross.arc(t.x, t.y, r, 0, TAU);
    cross.moveTo(t.x - r - 8, t.y); cross.lineTo(t.x - r + 4, t.y);
    cross.moveTo(t.x + r - 4, t.y); cross.lineTo(t.x + r + 8, t.y);
    cross.moveTo(t.x, t.y - r - 8); cross.lineTo(t.x, t.y - r + 4);
    cross.moveTo(t.x, t.y + r - 4); cross.lineTo(t.x, t.y + r + 8);
    neon(ctx, cross, w.color, 2.4, { glow: 1.3 });
  }

  if (G.phase !== 'aim') return;

  // the aim line, always
  const len = 34 + G.power * 44;
  const line = new Path2D();
  line.moveTo(mz.x, mz.y);
  line.lineTo(mz.x + Math.cos(m.aim) * len, mz.y + Math.sin(m.aim) * len);
  ctx.save();
  ctx.setLineDash([7, 6]);
  neon(ctx, line, human ? team.accent : '#ff4d6d', 2, { glow: 0.9, alpha: 0.85 });
  ctx.restore();

  // The arc guide. 'short' shows the opening of the arc only — enough to read
  // which way the shot leaves and how hard, without handing over the answer the
  // wind is supposed to take away from you.
  if (human && G.opts.guide !== 'off' && w.speed && G.power > 0.02) {
    const pts = previewArc();
    const count = pts.length / 2;
    const show = G.opts.guide === 'full' ? count : Math.min(count, 26);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = w.color;
    ctx.shadowColor = w.color;
    ctx.shadowBlur = 8;
    for (let i = 2; i < show; i += 2) {
      const k = 1 - i / show;
      ctx.globalAlpha = 0.3 + 0.62 * k;
      ctx.beginPath();
      ctx.arc(pts[i * 2], pts[i * 2 + 1], 1.8 + 2 * k, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  // power, as a ring that fills around the Milbil
  if (G.power > 0.02) {
    const r = 40;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 22, r, -TAU / 4, -TAU / 4 + TAU * 0.999);
    ctx.stroke();
    const col = G.power > 0.85 ? '#ff4d6d' : G.power > 0.5 ? '#ffd75e' : '#9dff6b';
    ctx.strokeStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 16;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m.x, m.y - 22, r, -TAU / 4, -TAU / 4 + TAU * G.power);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------- water

function drawWater(ctx, rect) {
  const y = G.waterY;
  if (rect.y1 < y - 12) return;              // water is off the bottom of the view
  const t = G.time;
  const th = G.theme;
  const x0 = Math.max(rect.x0, -200), x1 = Math.min(rect.x1, WORLD.w + 200);

  ctx.save();
  const g = ctx.createLinearGradient(0, y - 10, 0, WORLD.h + 60);
  g.addColorStop(0, th.water[0]);
  g.addColorStop(1, th.water[1]);
  ctx.fillStyle = g;
  ctx.fillRect(x0, y, x1 - x0, Math.max(WORLD.h - y + 200, rect.y1 - y + 40));

  // three sine waves at different speeds — one alone reads as a moving line
  ctx.globalCompositeOperation = 'lighter';
  for (let l = 0; l < 3; l++) {
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) {
      const yy = y
        + Math.sin(x / (70 + l * 55) + t * (1.4 + l * 0.5)) * (4 - l)
        + Math.sin(x / 23 - t * 2.2) * 1.2
        - l * 2;
      x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.globalAlpha = 0.5 - l * 0.13;
    ctx.strokeStyle = th.waterEdge;
    ctx.shadowColor = th.waterEdge;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2.4 - l * 0.6;
    ctx.stroke();
  }

  // a little shimmer on the surface
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = th.waterEdge;
  for (let i = 0; i < 26; i++) {
    const x = ((i * 137.5 + t * 22) % (WORLD.w + 200)) - 100;
    if (x < x0 - 90 || x > x1) continue;
    ctx.fillRect(x, y + 6 + ((i * 31) % 26), 26 + ((i * 53) % 60), 1.5);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- screen space

function drawTags(ctx) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of G.milbils) {
    if (!m.alive) continue;
    const p = worldToScreen(m.x, m.y - 62);
    if (p.x < -80 || p.x > G.view.w + 80 || p.y < -40 || p.y > G.view.h + 40) continue;
    const team = G.teams[m.team];
    const active = G.active === m && G.phase !== 'over';
    const W = 50, H = 6;

    ctx.globalAlpha = active ? 1 : 0.8;
    ctx.font = `800 ${active ? 13 : 11.5}px "Baloo 2", "Trebuchet MS", system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillText(m.name, p.x + 1, p.y - 9);
    ctx.fillStyle = team.accent;
    ctx.shadowColor = team.accent;
    ctx.shadowBlur = active ? 10 : 4;
    ctx.fillText(m.name, p.x, p.y - 10);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(4,8,14,.75)';
    ctx.fillRect(p.x - W / 2 - 1, p.y - 1, W + 2, H + 2);
    const frac = clamp(m.hp / MAX_HP, 0, 1);
    ctx.fillStyle = frac > 0.5 ? '#9dff6b' : frac > 0.22 ? '#ffd75e' : '#ff4d6d';
    ctx.fillRect(p.x - W / 2, p.y, W * frac, H);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x - W / 2 - 1.5, p.y - 1.5, W + 3, H + 3);
  }
  ctx.restore();
}

/** If whoever is up has been shoved off screen, point at them. */
function drawEdgeMarker(ctx) {
  const m = G.active;
  if (!m || !m.alive) return;
  const p = worldToScreen(m.x, m.y - 30);
  const pad = 42;
  if (p.x > pad && p.x < G.view.w - pad && p.y > pad && p.y < G.view.h - pad) return;
  const cx = clamp(p.x, pad, G.view.w - pad);
  const cy = clamp(p.y, pad, G.view.h - pad);
  const a = Math.atan2(p.y - G.view.h / 2, p.x - G.view.w / 2);
  const team = G.teams[m.team];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  const tri = new Path2D();
  tri.moveTo(14, 0); tri.lineTo(-8, -9); tri.lineTo(-8, 9); tri.closePath();
  neon(ctx, tri, team.accent, 2.4, { glow: 1.2 });
  ctx.restore();
}

function drawFlash(ctx) {
  const f = fx.flashAlpha();
  if (!f) return;
  ctx.save();
  ctx.globalAlpha = Math.min(0.75, f.a);
  ctx.fillStyle = f.color;
  ctx.fillRect(0, 0, G.view.w, G.view.h);
  ctx.restore();
}

let vignette = null;
let vignetteKey = '';
function drawVignette(ctx) {
  const key = `${G.view.w}x${G.view.h}`;
  if (key !== vignetteKey) {
    vignetteKey = key;
    vignette = document.createElement('canvas');
    vignette.width = G.view.w;
    vignette.height = G.view.h;
    const c = vignette.getContext('2d');
    const g = c.createRadialGradient(
      G.view.w / 2, G.view.h / 2, Math.min(G.view.w, G.view.h) * 0.36,
      G.view.w / 2, G.view.h / 2, Math.max(G.view.w, G.view.h) * 0.78,
    );
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.55)');
    c.fillStyle = g;
    c.fillRect(0, 0, G.view.w, G.view.h);
  }
  ctx.drawImage(vignette, 0, 0);
}
