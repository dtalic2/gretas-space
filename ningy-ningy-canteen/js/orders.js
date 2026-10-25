// ---------- What a milbil orders ----------
//
// A milbil walks up, reads the menu board, and decides. They want something
// proper to eat, maybe a drink, maybe a treat — but only things that are in
// the truck, that they can afford, and that don't cost too much.
//
//   - Over their own limit they won't buy it at all. The limit is about
//     `fussy` × the fair price, a little higher or lower depending on the day.
//   - Over the fair price, they'll still buy the main thing but usually skip
//     the extras: they buy less.
//   - Under the fair price, they spend more: they keep adding things while
//     it's cheap and they've got the money, and the cheaper it is the longer
//     they keep going. Way under, they might get two of the first thing too.
//   - If nothing on the board works for them, they walk off.
//   - Anything on the board over their limit takes them aback when they first
//     read it, whether or not they stay (`shock`: the dearest thing).

import { PRODUCTS, PRODUCT, MILBIL, SPOT } from './data.js';
import { S, today, isOpen, ratio, rng, money } from './state.js';

const BARGAIN = 0.75;
const EXTRA_MAX = 1.1;     // extras are the first thing to go when prices go up

const MILBILS_INDEX = Object.fromEntries(Object.keys(MILBIL).map((id, i) => [id, i + 1]));

/** The most a milbil will pay today, as a fraction of the fair price. Some
 *  days they're feeling generous. (Fairy lights raise the fair price itself,
 *  in state.js.) */
const limitOf = (m, r) => Math.max(1, m.fussy * (0.9 + r() * 0.3));

/** Money they're willing to spend today. */
export function budgetOf(id){
  const w = today().who[id];
  return Math.max(0, w.cash - w.save);
}

/**
 * Decide an order. Seeded per milbil per day, so asking again with nothing
 * changed gives the same answer.
 *
 * Returns { lines:[{id, qty}], total, mood, less, two } or { leave: reason }
 * where reason is 'pricey', 'broke' or 'soldout'.
 */
export function decide(id){
  const m = MILBIL[id];
  const t = today();
  const w = t.who[id];
  const spot = SPOT[w.spot] || {};
  const r = rng(S.day * 31337 + MILBILS_INDEX[id] * 977 + S.salt);
  const budget = budgetOf(id);
  const limit = limitOf(m, r);

  const stock = (p) => S.stock[p.id] || 0;
  const price = (p) => S.prices[p.id];
  const menu = PRODUCTS.filter(p => isOpen(p.id));
  const inStock = menu.filter(p => stock(p) > 0);
  if (!inStock.length) return { leave: 'soldout' };

  // The dearest thing on the board, if it's more than they'd ever pay.
  const dearest = inStock.reduce((a, p) => ratio(p) > ratio(a) ? p : a);
  const shock = ratio(dearest) > limit ? dearest.id : null;

  let left = budget;
  const lines = [];
  const okFor = (p, extra = false) =>
    stock(p) > 0 && price(p) <= left && ratio(p) <= (extra ? Math.min(limit, EXTRA_MAX) : limit) &&
    !lines.some(l => l.id === p.id);
  const weight = (p) => 1 + (m.likes.includes(p.id) ? 3 : 0) + (spot.likes?.[p.id] || 0) +
    Math.max(0, 1 - ratio(p)) * 3;
  const pickFrom = (list) => {
    const total = list.reduce((n, p) => n + weight(p), 0);
    let x = r() * total;
    for (const p of list){ x -= weight(p); if (x <= 0) return p; }
    return list[list.length - 1];
  };
  let more = false;
  const add = (p) => {
    let qty = 1;
    const cheap = ratio(p) <= BARGAIN;
    if (cheap && stock(p) >= 2 && price(p) * 2 <= left && r() < 0.4){ qty = 2; more = true; }
    lines.push({ id: p.id, qty });
    left -= price(p) * qty;
  };

  // Something proper to eat. Beach-goers sometimes only want something cold.
  const wantsMain = r() < (spot.id === 'beach' ? 0.55 : 0.92);
  const mains = inStock.filter(p => p.kind === 'main' && okFor(p));
  const main = wantsMain && mains.length ? pickFrom(mains) : null;
  if (main) add(main);

  // Pricey main? Then they mostly skip the extras.
  const fair = !main || ratio(main) <= 1;
  const go = fair ? 1 : 0.3;
  const likes = (pid) => m.likes.includes(pid) ? 0.35 : 0;

  const drink = PRODUCT.juice;
  const thirst = 0.45 + (spot.likes?.juice || 0) * 0.25 + likes('juice');
  if (isOpen('juice') && r() < thirst * go && okFor(drink, true)) add(drink);

  const treats = inStock.filter(p => p.kind === 'treat' && okFor(p, true));
  const sweet = (main ? 0.4 : 1) + treats.reduce((n, p) => n + likes(p.id), 0) + (spot.likes?.iceblock || 0) * 0.2;
  if (treats.length && r() < sweet * go) add(pickFrom(treats));

  // Still nothing? Anything at all on the board they'd pay for.
  if (!lines.length){
    const any = inStock.filter(p => okFor(p));
    if (any.length) add(pickFrom(any));
  }

  // Cheap? Then they spend more. While what they've picked is under the fair
  // price and there's money left, they keep adding things — another of
  // something, or something new — and the cheaper it is, the more likely they
  // go on. At the fair price they stop where they are.
  if (lines.length){
    const units = lines.reduce((n, l) => n + l.qty, 0);
    const avg = lines.reduce((n, l) => n + ratio(PRODUCT[l.id]) * l.qty, 0) / units;
    const keepGoing = Math.min(0.9, Math.max(0, (1 - avg) * 3.2));
    const have = (p) => lines.find(l => l.id === p.id)?.qty || 0;
    for (let i = 0; i < 5 && r() < keepGoing; i++){
      const can = inStock.filter(p => stock(p) > have(p) && price(p) <= left && ratio(p) <= Math.min(limit, 1));
      if (!can.length) break;
      const p = pickFrom(can);
      const line = lines.find(l => l.id === p.id);
      if (line) line.qty++; else lines.push({ id: p.id, qty: 1 });
      left -= price(p);
      more = true;
    }
  }

  if (!lines.length){
    const canPay = inStock.some(p => price(p) <= budget);
    return { leave: canPay ? 'pricey' : (inStock.some(p => ratio(p) <= limit) ? 'broke' : 'pricey'), shock };
  }

  const total = lines.reduce((n, l) => n + price(PRODUCT[l.id]) * l.qty, 0);
  const worst = Math.max(...lines.map(l => ratio(PRODUCT[l.id])));
  const mood = worst <= BARGAIN ? 'bargain' : worst <= 1 ? 'happy' : 'pricey';
  return { lines, total, mood, less: !fair, more, shock };
}

// ------------------------------------------------------------- the words ---

const numWord = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

/** "a Beef Bowl and two Juices" */
export function orderWords(lines){
  const bits = lines.map(l => {
    const p = PRODUCT[l.id];
    return l.qty === 1 ? p.a : `${numWord[l.qty] || l.qty} ${p.plural}`;
  });
  if (bits.length <= 1) return bits.join('');
  return `${bits.slice(0, -1).join(', ')} and ${bits[bits.length - 1]}`;
}

const pick = (r, a) => a[Math.floor(r() * a.length)];

/** What they say at the window. */
export function orderLine(o, id){
  const r = rng(S.day * 17 + MILBILS_INDEX[id] * 3);
  const what = orderWords(o.lines);
  const cap = what.charAt(0).toUpperCase() + what.slice(1);
  if (o.more) return pick(r, [`Ooh, cheap! ${cap}, please!`, `So cheap! Can I have ${what}?`, `Everything's so cheap! ${cap}, please!`]);
  if (o.less) return pick(r, [`Just ${what}, please. Your prices are a bit high!`,
    `Only ${what} today. It's a bit pricey!`]);
  if (o.mood === 'bargain') return pick(r, [`${cap}, please! What a bargain!`, `Can I have ${what}? Great prices!`]);
  return pick(r, [`Can I have ${what}, please?`, `${cap}, please!`, `Hi! I'd like ${what}.`, `${cap}, thank you!`]);
}

/** What they say when a price takes them aback. */
export function shockWords(pid, id){
  const p = PRODUCT[pid];
  const r = rng(S.day * 29 + MILBILS_INDEX[id] * 5);
  return pick(r, [`😲 ${money(S.prices[pid])} for ${p.a}?!`, `😲 Whoa! ${money(S.prices[pid])} for ${p.a}?!`, `😲 How much for ${p.a}?! ${money(S.prices[pid])}?!`]);
}

/** Why they walked off, for the bubble over their head and the toast. */
export function leaveWords(reason, id){
  const m = MILBIL[id];
  const w = today().who[id];
  switch (reason){
    case 'pricey':  return { bubble:'😤 Too pricey!', toast:`<b>${m.name}</b> read your prices and walked off. Too pricey! 😤` };
    case 'broke':   return { bubble:'😢 Not enough money', toast:`<b>${m.name}</b> only has ${money(budgetOf(id))} to spend${w.save ? ` (saving ${money(w.save)})` : ''}. Nothing costs that little.` };
    case 'soldout': return { bubble:'😢 Sold out!', toast:`<b>${m.name}</b> wanted something you've run out of.` };
    case 'slow':    return { bubble:'⏳ Too slow!', toast:`<b>${m.name}</b> got tired of waiting and left.` };
    default:        return { bubble:'👋', toast:'' };
  }
}
