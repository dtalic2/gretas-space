// ---------- Small formatting helpers shared by the HUD and the panels ----------

/** 1234 -> "1.2k". Coins get big late in the game and the HUD chip does not. */
export function coins(n){
  n = Math.floor(n);
  if (n < 10000) return n.toLocaleString('en-US');
  if (n < 1e6)  return trim(n / 1000) + 'k';
  if (n < 1e9)  return trim(n / 1e6) + 'm';
  return trim(n / 1e9) + 'b';
}

const trim = (v) => (v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v).toString());

/** Seconds -> "12s", "4:05", "1h 20m". Used on every timer bubble. */
export function clock(secs){
  secs = Math.max(0, Math.ceil(secs));
  if (secs < 60) return secs + 's';
  if (secs < 3600){
    const m = Math.floor(secs / 60);
    return m + ':' + String(secs % 60).padStart(2, '0');
  }
  const h = Math.floor(secs / 3600), m = Math.round((secs % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "3 min", "45 sec" — for descriptions where a ticking clock would be silly. */
export function span(secs){
  if (secs < 60) return `${secs} sec`;
  if (secs < 3600){
    const m = secs / 60;
    return `${m % 1 ? m.toFixed(1) : m} min`;
  }
  return `${(secs / 3600).toFixed(1).replace(/\.0$/, '')} hr`;
}

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
