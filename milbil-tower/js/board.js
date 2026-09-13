// ---------- The board ----------
//
// Five squares by five. Milbils hop between them; the control tower sits under
// the bottom edge and fires up into the grid. Row 0 is the far row where Milbils
// arrive, row 4 is the near row — the last one before they reach the tower.

import { neon } from './neon.js';

export const N = 5;

/**
 * Work out where everything sits for a given viewport.
 *
 * The board is always a square, as large as it can be once the HUD strip and the
 * tower have taken their share of the height. Everything else in the game is
 * measured in `cell`, so the whole thing scales from a phone to a desktop with
 * no other numbers to touch.
 */
export function layout(W, H) {
  const topPad = H < 560 ? 58 : 76;        // HUD chips live above the board
  const botPad = 26;                       // the hint line sits down here
  const sidePad = Math.max(10, W * 0.045);   // a MEGA overhangs its square; leave it room

  const availW = W - sidePad * 2;
  const availH = H - topPad - botPad;

  // The board is square and takes what it can; the tower then absorbs whatever
  // height is left over, up to a sensible cap. On a tall phone that gives a
  // properly planted tower instead of a board hovering in a sea of black.
  const towerMin = Math.max(72, Math.min(140, H * 0.14));
  // Cap the board at ~78% of the usable height as well, so a wide desktop does
  // not hand the board everything and leave the tower squashed on its minimum.
  const board = Math.max(140, Math.min(availW, availH - towerMin, availH * 0.78));
  const cell = board / N;
  const towerH = Math.max(towerMin, Math.min(cell * 2.3, availH - board));

  const bx = (W - board) / 2;
  const by = topPad + Math.max(0, (availH - board - towerH) * 0.5);

  return {
    W, H, board, bx, by, cell, towerH,
    // Where the laser actually leaves the tower.
    muzzle: { x: W / 2, y: by + board + towerH * 0.44 },
    baseY: by + board + towerH,
  };
}

/** Pixel centre of a grid square. */
export function cellCenter(L, col, row) {
  return { x: L.bx + (col + 0.5) * L.cell, y: L.by + (row + 0.5) * L.cell };
}

export function inBoard(col, row) {
  return col >= 0 && col < N && row >= 0 && row < N;
}

/**
 * Bake the grid to an offscreen canvas.
 *
 * The grid never changes during play, and a neon stroke is four blurred passes —
 * redrawing sixty lines of it every frame is pure waste. Anything that *does*
 * move (the danger-row pulse, lock-on rings) is drawn live on top.
 */
export function buildGrid(L, dpr) {
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(L.W * dpr);
  cv.height = Math.ceil(L.H * dpr);
  const c = cv.getContext('2d');
  c.scale(dpr, dpr);

  const { bx, by, board, cell } = L;

  // A faint wash behind the board, so pure black does not read as a hole. It is
  // fixed for a given layout, so it belongs in here rather than in the frame.
  const wash = c.createRadialGradient(L.W / 2, by + board * 0.45, cell * 0.5,
                                      L.W / 2, by + board * 0.5, board * 0.95);
  wash.addColorStop(0, 'rgba(20,60,90,.30)');
  wash.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = wash;
  c.fillRect(0, 0, L.W, L.H);

  // Inner lines first, dim — they are guides, not the subject.
  const inner = new Path2D();
  for (let i = 1; i < N; i++) {
    inner.moveTo(bx + i * cell, by);       inner.lineTo(bx + i * cell, by + board);
    inner.moveTo(bx, by + i * cell);       inner.lineTo(bx + board, by + i * cell);
  }
  neon(c, inner, '#2f6f8f', Math.max(1, cell * 0.012), { glow: 0.55, alpha: 0.62, core: null });

  // Outer frame, bright.
  const frame = new Path2D();
  frame.rect(bx, by, board, board);
  neon(c, frame, '#36d8ff', Math.max(1.4, cell * 0.022), { glow: 1.0, alpha: 0.9 });

  // Corner brackets, to make the frame feel like equipment rather than a table.
  const t = cell * 0.30;
  const corners = new Path2D();
  for (const [cx, cy, sx, sy] of [
    [bx, by, 1, 1], [bx + board, by, -1, 1],
    [bx, by + board, 1, -1], [bx + board, by + board, -1, -1],
  ]) {
    corners.moveTo(cx + sx * t, cy);
    corners.lineTo(cx, cy);
    corners.lineTo(cx, cy + sy * t);
  }
  neon(c, corners, '#7af0ff', Math.max(2, cell * 0.035), { glow: 1.2 });

  return cv;
}
