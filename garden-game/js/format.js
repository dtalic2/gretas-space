// ---------- Number formatting ----------

/**
 * Suffix ladder, largest first. Past a trillion the economy runs on the short
 * scale: quadrillion, quintillion, sextillion, septillion, octillion,
 * nonillion, decillion.
 *
 * These are doubles, not exact integers — JavaScript only counts precisely to
 * 2^53 (~9 quadrillion). Beyond that the last digits of a price drift, which is
 * invisible at four significant figures and harmless for buying and selling.
 * It is why nothing in the late game compares prices for exact equality.
 */
const UNITS = [
  [1e63, 'V'],   // vigintillion
  [1e60, 'Nd'],  // novemdecillion
  [1e57, 'Od'],  // octodecillion
  [1e54, 'Spd'], // septendecillion
  [1e51, 'Sd'],  // sexdecillion
  [1e48, 'Qid'], // quindecillion
  [1e45, 'Qad'], // quattuordecillion
  [1e42, 'Td'],  // tredecillion
  [1e39, 'Dd'],  // duodecillion
  [1e36, 'Ud'],  // undecillion
  [1e33, 'D'],   // decillion
  [1e30, 'N'],   // nonillion
  [1e27, 'O'],   // octillion
  [1e24, 'Se'],  // septillion
  [1e21, 'S'],   // sextillion
  [1e18, 'Qu'],  // quintillion
  [1e15, 'Q'],   // quadrillion
  [1e12, 'T'],
  [1e9,  'B'],
  [1e6,  'M'],
  [1e3,  'K'],
];

/**
 * Compact coin figures: 940, 1.5K, 57.3K, 1.04M, 2.3B, 40T, 5.5Q, 3.1Qu, 88S,
 * 12Se, 640O, 7N, 19D. Precision shrinks as the leading number grows, so it
 * stays about four characters wide however big the economy gets.
 */
export function fmtNum(n){
  n = Number(n) || 0;
  const abs = Math.abs(n);
  if (abs < 1000) return String(Math.round(n));

  for (const [size, suffix] of UNITS){
    if (abs >= size){
      const v = n / size;
      const av = Math.abs(v);
      const dp = av < 10 ? 2 : av < 100 ? 1 : 0;
      return trimZeros(v.toFixed(dp)) + suffix;
    }
  }
  return String(Math.round(n));
}

const trimZeros = (s) => s.includes('.') ? s.replace(/\.?0+$/, '') : s;

/** Seconds as "45s" or "4m 20s". */
export const fmtTime = (s) => s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`;
