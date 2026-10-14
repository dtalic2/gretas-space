// ---------- Money ----------

/** Blooket-style cash: "$1,234,567". */
export const money = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US');

/** Short cash for tight spots: $940, $7.5K, $13.65M. */
export function shortMoney(n){
  n = Math.round(Number(n) || 0);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units){
    if (n >= size){
      const v = n / size;
      const dp = v < 10 ? 2 : v < 100 ? 1 : 0;
      return '$' + v.toFixed(dp).replace(/\.?0+$/, '') + suffix;
    }
  }
  return '$' + n;
}

/** 1st, 2nd, 3rd, 4th. */
export const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');
