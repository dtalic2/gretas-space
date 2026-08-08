// ---------- Persistence + offline growth ----------
import { LEVEL_STEPS, PLOT_MAX, PLOT_START, DEFAULT_MOTION } from './data.js';

const KEY = 'garden3d.save.v1';

export function defaultState(){
  return {
    coins: 10,
    lifetime: 0,
    level: 1,
    seeds: { carrot: 4 },
    animals: {},
    decor: {},
    charms: {},
    tools: {},
    ownTree: false,
    ownTreeStock: [],
    ownTreeAt: 0,
    plots: Array.from({ length: PLOT_MAX }, () => emptyPlot()),
    plotsUnlocked: PLOT_START,
    lastSeen: Date.now(),
    muted: false,
    motion: DEFAULT_MOTION,
    seenHelp: false,
  };
}

export const emptyPlot = () => ({ crop:null, planted:0, watered:false, boostFrom:0, fruitedAt:0, harvests:0 });

export function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const s = JSON.parse(raw);
    const base = defaultState();
    // Shallow-merge so a save from an older build still boots.
    const merged = { ...base, ...s };
    // Older saves had a 9-plot bed; pad them out to the full grid.
    if (!Array.isArray(merged.plots)) merged.plots = base.plots;
    merged.plots = Array.from({ length: PLOT_MAX },
      (_, i) => ({ ...emptyPlot(), ...(merged.plots[i] || {}) }));
    merged.plotsUnlocked = Math.min(PLOT_MAX, Math.max(PLOT_START, merged.plotsUnlocked || PLOT_START));
    if (!Array.isArray(merged.ownTreeStock)) merged.ownTreeStock = [];
    if (!merged.tools || typeof merged.tools !== 'object') merged.tools = {};
    if (merged.shovel) merged.tools.shovel = true;   // pre-toolbox saves
    delete merged.shovel;
    delete merged.math;   // left over from the times-tables build
    return merged;
  } catch (err) {
    console.warn('save load failed, starting fresh', err);
    return defaultState();
  }
}

export function save(state){
  try {
    state.lastSeen = Date.now();
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('save failed', err);
  }
}

export function wipe(){
  try { localStorage.removeItem(KEY); } catch {}
}

/** Seconds the player was away, capped at 8h so returning isn't an instant win. */
export function offlineSeconds(state){
  const away = (Date.now() - (state.lastSeen || Date.now())) / 1000;
  return Math.max(0, Math.min(away, 8 * 3600));
}

export function levelFor(lifetime){
  let lvl = 1;
  for (let i = 0; i < LEVEL_STEPS.length; i++){
    if (lifetime >= LEVEL_STEPS[i]) lvl = i + 1;
  }
  return lvl;
}
