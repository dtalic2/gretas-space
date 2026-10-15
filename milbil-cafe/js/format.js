// ---------- Money ----------
//
// Up to $999,999,999 money is shown in full, Blooket style. Past that the
// pay boost makes numbers enormous, so they're shown as a number and a name:
// "$1.23 Billion", "$45.6 Quattuordecillion", all the way to the biggest
// number the game can hold (about a hundred centillion).

const SMALL = ['', 'M', 'B', 'Tr', 'Quadr', 'Quint', 'Sext', 'Sept', 'Oct', 'Non'];
const UNITS = ['', 'Un', 'Duo', 'Tre', 'Quattuor', 'Quin', 'Sex', 'Septen', 'Octo', 'Novem'];
const TENS = ['', 'Dec', 'Vigint', 'Trigint', 'Quadragint', 'Quinquagint', 'Sexagint', 'Septuagint', 'Octogint', 'Nonagint'];

/** The name for 10^(3n+3): 1 Million, 2 Billion, 10 Decillion, 21 Unvigintillion, 100 Centillion. */
function illion(n){
  if (n < 10) return SMALL[n] + 'illion';
  if (n === 100) return 'Centillion';
  if (n > 100) return UNITS[n - 100] + 'centillion';
  const unit = UNITS[n % 10];
  const tens = TENS[Math.floor(n / 10)];
  return unit + (unit ? tens.toLowerCase() : tens) + 'illion';
}

/** A big number as a short number and a name: { num: '1.23', name: 'Quadrillion' }. */
export function bigParts(n){
  const groups = Math.floor(Math.log10(n) / 3);       // 3 for billions, 4 for trillions…
  let v = n / Math.pow(10, groups * 3);
  let g = groups;
  if (v >= 999.995){ v /= 1000; g++; }                 // 999.999 Billion rounds up to 1 Trillion
  const dp = v < 10 ? 2 : v < 100 ? 1 : 0;
  return { num: trim(v.toFixed(dp)), name: illion(g - 1) };
}

const BIG = 1e9;

// "1.50" -> "1.5", "2.00" -> "2", but "190" stays "190".
const trim = (s) => s.includes('.') ? s.replace(/\.?0+$/, '') : s;

/** Cash as text: "$1,234,567", or "$1.23 Billion" once it gets big. */
export function money(n){
  n = Number(n) || 0;
  if (n < BIG) return '$' + Math.round(n).toLocaleString('en-US');
  const p = bigParts(n);
  return `$${p.num} ${p.name}`;
}

/** Cash for tight spots: the name goes on a smaller line underneath. */
export function moneyHTML(n){
  n = Number(n) || 0;
  if (n < BIG) return money(n);
  const p = bigParts(n);
  return `<span class="big-money">$${p.num}<small>${p.name}</small></span>`;
}

/** A multiplier: "×1.10", "×13.8", "×13,781", "×1.9 Million". */
export function times(n){
  if (n < 10) return '×' + n.toFixed(2);
  if (n < 1000) return '×' + trim(n.toFixed(1));
  if (n < 1e6) return '×' + Math.round(n).toLocaleString('en-US');
  const p = bigParts(n);
  return `×${p.num} ${p.name}`;
}

/** Short cash for tight spots: $940, $7.5K, $13.65M. */
export function shortMoney(n){
  n = Math.round(Number(n) || 0);
  if (n >= 1e12) return money(n);
  const units = [[1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [size, suffix] of units){
    if (n >= size){
      const v = n / size;
      const dp = v < 10 ? 2 : v < 100 ? 1 : 0;
      return '$' + trim(v.toFixed(dp)) + suffix;
    }
  }
  return '$' + n;
}

/** 1st, 2nd, 3rd, 4th. */
export const ordinal = (n) => n + (['th', 'st', 'nd', 'rd'][n] || 'th');
