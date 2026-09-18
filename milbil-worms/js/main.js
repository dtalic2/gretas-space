// ---------- Boot and loop ----------
//
// Sprite baking happens once, here, before anything else: thirty-odd neon
// strokes per pose per team is the one genuinely slow thing in the game, and
// doing it while the boot bar is on screen means it never has to happen while
// something is on fire.
//
// The loop clamps dt hard. Come back to a backgrounded tab and the browser hands
// you a two-second frame; without the clamp every rocket in the air teleports
// through the map on the first tick.

import {
  G, TEAM_DEFS, newMatch, update as updateGame, fireWeapon, selectWeapon, endTurn,
} from './game.js';
import { WORLD } from './terrain.js';
import { bakeTeam } from './art.js';
import { makeBackdrop, Motes } from './sky.js';
import { makeAI } from './ai.js';
import * as render from './render.js';
import * as input from './input.js';
import * as ui from './ui.js';
import * as fx from './fx.js';
import { clamp } from './util.js';

const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d', { alpha: false });
let dpr = 1;
let last = 0;
let overShown = false;

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(320, window.innerWidth);
  const h = Math.max(320, window.innerHeight);
  G.view.w = w;
  G.view.h = h;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // How much world to show. A phone gets a tighter view or the Milbils become
  // specks; a desktop gets the width to read an arc across the map. The height
  // matters as much on a phone held upright: a width-only zoom there shows the
  // whole map vertically and half the screen is empty sky.
  const targetVis = w < 620 ? 680 : w < 1100 ? 980 : 1240;
  G.cam.base = clamp(Math.max(w / targetVis, h / (WORLD.h * 1.02)), 0.3, 1.8);
}

const raf = () => new Promise((r) => requestAnimationFrame(r));

function startMatch(menuMode = false) {
  newMatch(G.opts);
  G.backdrop = makeBackdrop(G.theme, G.terrain.seed);
  G.motes = new Motes(G.theme);
  G.ai = makeAI();
  overShown = false;
  input.setPaused(false);
  ui.resetCache();
  ui.buildWeaponGrid();
  if (menuMode) {
    G.phase = 'menu';
    G.banner = null;
    ui.show('menu');
    ui.hide('hud');
  } else {
    ui.hide('menu');
    ui.hide('over');
    ui.show('hud');
  }
}

async function boot() {
  resize();
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 120));

  ui.initUI({
    onPlay: () => { startMatch(false); },
    onQuit: () => { startMatch(true); },
    onPauseState: (v) => input.setPaused(v),
  });
  input.init(canvas);

  // --- bake both teams, yielding so the boot bar actually paints ---
  const msgs = ['Sketching Milbils…', 'Handing out helmets…'];
  for (let i = 0; i < TEAM_DEFS.length; i++) {
    ui.boot(0.15 + i * 0.3, msgs[i]);
    await raf();
    TEAM_DEFS[i].sprites = bakeTeam(TEAM_DEFS[i].hue, TEAM_DEFS[i].accent, 168);
  }

  ui.boot(0.8, 'Blowing up the scenery…');
  await raf();
  startMatch(true);

  ui.boot(1, 'Ready.');
  await raf();
  ui.bootDone();

  last = performance.now();
  requestAnimationFrame(loop);
}

function loop(now) {
  requestAnimationFrame(loop);
  const dt = clamp((now - last) / 1000, 0, 1 / 20);
  last = now;

  if (!input.isPaused()) {
    updateGame(dt);
    if (G.phase !== 'menu') {
      input.update(dt);
      if (G.activeTeam?.cpu) G.ai.update(dt);
    }
    G.motes?.update(dt, G.wind);
  } else {
    fx.update(dt * 0.35);
  }

  render.draw(ctx, dpr);
  if (G.phase !== 'menu') ui.sync();

  if (G.phase === 'over' && !overShown) {
    overShown = true;
    setTimeout(() => ui.showGameOver(), 900);
  }
}

// Handy from the browser console, and what the smoke test pokes at: the whole
// match state, live, plus the two verbs that are awkward to trigger by hand.
window.MILBIL = { G, startMatch, fire: fireWeapon, select: selectWeapon, endTurn };

addEventListener('visibilitychange', () => {
  if (document.hidden && G.phase !== 'menu' && G.phase !== 'over') {
    ui.show('pause');
    input.setPaused(true);
  }
});

boot();
