// ---------- Growing things ----------
//
// Each plot remembers how far its current crop has got (0..1) and is advanced
// by elapsed time. Unlike 3x3 Garden, progress is accumulated rather than
// worked out from the planting time, because here your growth speed changes
// whenever you swap which milbil you play as — and a speed change must only
// affect growth from now on, never rewrite what already happened.
//
// A plot:  { crop, prog, watered, fruited }
//   prog     0..1 through the current cycle
//   watered  true once watered this cycle (doubles speed for the rest of it)
//   fruited  perennials: has fruited at least once, so cycles are the short regrow

import { CROPS, WATER_BOOST, THIRST_AT, THIRST_SPEED } from './data.js';

export const emptyPlot = () => ({ crop: null, prog: 0, watered: false, fruited: false });

/** Seconds the current cycle takes at 1x. */
export function cycleSec(plot, regrowBonus = 1){
  const c = CROPS[plot.crop];
  if (!c) return 1;
  return c.perennial && plot.fruited ? c.regrowSec / regrowBonus : c.growSec;
}

/**
 * Advance one plot by dtMs of real time.
 * mods: { grow (multiplier), thirst (speed while thirsty), regrow (multiplier) }
 */
export function advance(plot, dtMs, mods){
  if (!plot.crop || plot.prog >= 1 || dtMs <= 0) return;
  const per = 1 / (cycleSec(plot, mods.regrow) * 1000) * mods.grow;   // progress per ms at 1x
  let dt = dtMs;
  if (plot.watered){
    plot.prog = Math.min(1, plot.prog + per * WATER_BOOST * dt);
    return;
  }
  if (plot.prog < THIRST_AT){
    const toThirst = (THIRST_AT - plot.prog) / per;
    if (dt <= toThirst){ plot.prog += per * dt; return; }
    plot.prog = THIRST_AT;
    dt -= toThirst;
  }
  plot.prog = Math.min(1, plot.prog + per * Math.max(THIRST_SPEED, mods.thirst) * dt);
}

export const isReady   = (p) => !!p.crop && p.prog >= 1;
export const isThirsty = (p) => !!p.crop && !p.watered && p.prog >= THIRST_AT && p.prog < 1;

/** Real seconds until ripe at the current speeds. */
export function secondsLeft(plot, mods){
  if (!plot.crop || plot.prog >= 1) return 0;
  const per = 1 / (cycleSec(plot, mods.regrow) * 1000) * mods.grow;
  const thirsty = Math.max(THIRST_SPEED, mods.thirst);
  if (plot.watered) return (1 - plot.prog) / (per * WATER_BOOST) / 1000;
  const early = Math.max(0, THIRST_AT - plot.prog);
  const late = 1 - Math.max(plot.prog, THIRST_AT);
  return (early / per + late / (per * thirsty)) / 1000;
}

export function plant(plot, cropId, preWatered){
  plot.crop = cropId; plot.prog = 0; plot.watered = !!preWatered; plot.fruited = false;
}

/** Pick the crop. Annuals clear the plot; perennials start a fresh fruit cycle. */
export function harvest(plot, preWatered){
  const c = CROPS[plot.crop];
  if (c.perennial){ plot.prog = 0; plot.fruited = true; plot.watered = !!preWatered; }
  else Object.assign(plot, emptyPlot());
}
