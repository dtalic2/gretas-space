// ---------- The lunchbox: drawing it, and marking it ----------
//
// Every milbil brings their own box, so the number of compartments and the
// colours come from them, not from you. All you choose is what goes in it.

import {
  FOOD, GROUP, BRAND, MILBIL, MAX_HEALTH, STICKER_BY_ID, STICKER_TIP, KIT_BY_ID,
  JUDGES, JUDGE_MAX, MAX_POINTS, LIKING, TIDY, MIX, mixPlan, STARS_AT,
  BONUS, HEALTHY, SUPER_HEALTHY, STREAK_TIP, STREAK_MAX,
  wishMatch, wishText, askText,
} from './data.js';
import { foodSVG } from './food.js';

// How the compartments sit in the tray, row by row.
const ROWS = { 1:[1], 2:[2], 3:[3], 4:[2, 2], 5:[3, 2], 6:[3, 3] };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);

/**
 * The open lunchbox. `items` is one entry per compartment, each either null or
 * { food, brand }. With `tappable` the full compartments become buttons that
 * take the food back out again.
 */
export function boxHTML(milbil, items, { stickers = [], tappable = false, cls = '' } = {}){
  const b = milbil.box;
  const rows = ROWS[b.spaces] || [b.spaces];
  let i = 0;
  const tray = rows.map(n => {
    const cells = [];
    for (let k = 0; k < n; k++, i++){
      const it = items[i];
      const tag = tappable && it ? 'button' : 'div';
      const extra = tappable && it ? ' type="button"' : '';
      cells.push(it
        ? `<${tag} class="slot full"${extra} data-slot="${i}" title="${esc(FOOD[it.food]?.name)}">
             ${foodSVG(it.food)}
             <span class="slot-brand" style="background:${BRAND[it.brand]?.color}">${BRAND[it.brand]?.icon ?? ''}</span>
           </${tag}>`
        : `<div class="slot" data-slot="${i}"><span class="slot-dots"></span></div>`);
    }
    return `<div class="box-row">${cells.join('')}</div>`;
  }).join('');
  const on = stickers.map(id => STICKER_BY_ID[id]?.emoji ?? '').join('');
  return `<div class="box ${cls}" style="--body:${b.body};--lid:${b.lid};--inner:${b.inner}">
    <div class="box-lid"><span class="box-clip"></span><span class="box-stickers">${on}</span></div>
    <div class="box-tray">${tray}</div>
  </div>`;
}

/** A tiny closed lunchbox, for lists and the milbil book. */
export const boxMiniHTML = (milbil) => {
  const b = milbil.box;
  return `<span class="box-mini" style="--body:${b.body};--lid:${b.lid}">
    <i></i><b>${b.spaces}</b></span>`;
};

// ----------------------------------------------------------------- health ---

/** A food's health out of 5, after the shop it came from has had its say. */
export const itemHealth = (it) =>
  Math.max(0, Math.min(MAX_HEALTH, (FOOD[it.food]?.health ?? 0) + (BRAND[it.brand]?.health ?? 0)));

/** The whole box out of 100. An empty box scores nothing. */
export function healthOf(items){
  const packed = items.filter(Boolean);
  if (!packed.length) return 0;
  const avg = packed.reduce((s, it) => s + itemHealth(it), 0) / packed.length;
  return Math.round(avg / MAX_HEALTH * 100);
}

/**
 * How close the box is to half main, a quarter fruit or veg, a quarter sweet.
 * The plan is worked out for however many things are actually in there, so a
 * half-packed box isn't punished twice — Tidy marks emptiness separately.
 */
export function mixOf(items){
  const packed = items.filter(Boolean);
  const plan = mixPlan(packed.length);
  const have = Object.fromEntries(MIX.map(m =>
    [m.id, packed.filter(it => m.groups.includes(FOOD[it.food]?.group)).length]));
  const hit = MIX.reduce((n, m) => n + Math.min(have[m.id], plan[m.id]), 0);
  return { plan, have, hit, total: packed.length, score: packed.length ? hit / packed.length : 0 };
}

/** The plan for a box this size, for showing what to aim at before you start. */
export const mixGoal = (spaces) => mixPlan(spaces);

export function healthLabel(h){
  if (h >= SUPER_HEALTHY) return { icon:'🌟', text:'Super healthy' };
  if (h >= HEALTHY)       return { icon:'🥗', text:'Healthy' };
  if (h >= 50)            return { icon:'🙂', text:'Not bad' };
  if (h >= 30)            return { icon:'😐', text:'A bit beige' };
  return { icon:'🍬', text:'All sweets!' };
}

// --------------------------------------------------------------- marking ---

/** Is the thing they asked for this morning actually in the box? */
export function askMet(ask, packed){
  if (ask.kind === 'full') return packed.full;
  if (ask.kind === 'variety') return packed.groups >= ask.n;
  return packed.items.filter(it => wishMatch(ask.what, it)).length >= (ask.n ?? 1);
}

const judge = (id) => JUDGES.find(j => j.id === id);
const share = (got, of, max = JUDGE_MAX) => (of <= 0 ? 0 : Math.round(max * got / of));

/** Munch, out of ten: every line on the note, the request worth the most. */
function markMunch(milbil, ask, packed, allergy){
  const checks = [
    ...(milbil.loves || []).map(w => ({
      icon:'💖', weight: LIKING.love, text:`Loves ${wishText(w)}`,
      ok: packed.items.some(it => wishMatch(w, it)) })),
    ...(milbil.hates || []).map(w => ({
      icon:'🙅', weight: LIKING.avoid, text:`No ${wishText(w)}`,
      ok: !packed.items.some(it => wishMatch(w, it)) })),
    { icon:'🎯', weight: LIKING.ask, text: askText(ask), ok: askMet(ask, packed) },
  ];
  const possible = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + (c.ok ? c.weight : 0), 0);
  if (allergy){
    return { judge: judge('munch'), score: 0, checks,
      notes: [{ ok:false, text:`Found ${allergy} in there! The lid went straight back on.` }] };
  }
  if (!packed.items.length){
    return { judge: judge('munch'), score: 0, checks, notes: [{ ok:false, text:'The box was empty.' }] };
  }
  return { judge: judge('munch'), score: share(got, possible), checks,
    notes: checks.map(c => ({ ok: c.ok, text: c.text })) };
}

/** Nurse Pip, out of ten: nothing but the health score. */
function markPip(items, health, label, allergy){
  if (allergy || !items.length){
    return { judge: judge('pip'), score: 0,
      notes: [{ ok:false, text: allergy ? 'Nobody ate a thing, so nobody got any goodness.' : 'An empty box feeds nobody.' }] };
  }
  const good = items.filter(it => ['fruit', 'veg'].includes(FOOD[it.food]?.group)).length;
  const junk = items.filter(it => itemHealth(it) <= 1).length;
  const notes = [{ ok: health >= HEALTHY, text:`${label.icon} ${label.text} — ${health} out of 100` }];
  notes.push({ ok: good > 0, text: good ? `${good} of ${items.length} were fruit or veg` : 'Not one piece of fruit or veg' });
  if (junk) notes.push({ ok:false, text:`${junk} thing${junk > 1 ? 's' : ''} in there with no goodness at all` });
  return { judge: judge('pip'), score: Math.round(health / 10), notes };
}

/** Tidy, out of ten: the right mix, a full box, nothing packed twice. */
function markTidy(milbil, packed, allergy){
  const spaces = milbil.box.spaces;
  const n = packed.items.length;
  const kinds = new Set(packed.items.map(it => it.food)).size;
  const dupes = n - kinds;
  if (allergy){
    return { judge: judge('tidy'), score: 0, notes: [{ ok:false, text:'It came home shut. That tells me everything.' }] };
  }
  const mix = packed.mix;
  const mixPts = Math.round(TIDY.mix * mix.score);
  const fullPts = share(n, spaces, TIDY.full);
  const dupePts = n && !dupes ? TIDY.nodupes : 0;
  const mixNotes = MIX.map(m => ({
    ok: mix.have[m.id] >= mix.plan[m.id],
    text: `${m.icon} ${m.name}: ${mix.have[m.id]} of ${mix.plan[m.id]} wanted`,
  }));
  return { judge: judge('tidy'), score: mixPts + fullPts + dupePts, notes: [
    ...mixNotes,
    { ok: n === spaces, text: n === spaces ? `All ${spaces} spaces used` : `${n} of ${spaces} spaces used` },
    { ok: !!n && !dupes, text: dupes ? `${dupes} thing${dupes > 1 ? 's' : ''} packed twice` : 'Nothing packed twice' },
  ] };
}

export const starsFor = (points) => STARS_AT.filter(t => points >= t).length;

/**
 * Mark a packed lunchbox. Everything the report card shows comes out of here,
 * so nothing is worked out twice.
 *
 * day: { milbil (id or milbil), ask, items, money, spent }
 * you: { kit, stickers, streak, bestHealth }
 */
export function scoreBox(day, you){
  const milbil = typeof day.milbil === 'string' ? MILBIL[day.milbil] : day.milbil;
  const ask = day.ask;
  const items = day.items.filter(Boolean);
  const groups = new Set(items.map(it => FOOD[it.food]?.group)).size;
  const full = items.length === milbil.box.spaces;
  const mix = mixOf(day.items);
  const packed = { items, groups, full, mix };

  // The one rule nobody gets marks for: a milbil who finds what they're
  // allergic to brings the box home with the lid still on.
  const allergy = milbil.allergy && items.some(it => FOOD[it.food]?.tags.includes(milbil.allergy))
    ? milbil.allergy : null;

  const health = healthOf(day.items);
  const label = healthLabel(health);
  const record = !allergy && items.length > 0 && health > (you.bestHealth || 0);

  const marks = [
    markMunch(milbil, ask, packed, allergy),
    markPip(items, health, label, allergy),
    markTidy(milbil, packed, allergy),
  ];
  const points = marks.reduce((n, m) => n + m.score, 0);
  const stars = starsFor(points);

  // Everything that puts a bit extra on the tip.
  const extras = [];
  if (health >= SUPER_HEALTHY) extras.push({ icon:'🌟', text:'Super healthy lunchbox', pct:BONUS.super });
  else if (health >= HEALTHY)  extras.push({ icon:'🥗', text:'Healthy lunchbox', pct:BONUS.healthy });
  if (record) extras.push({ icon:'🏆', text:'Your healthiest lunchbox yet', pct:BONUS.record });
  if (mix.score === 1) extras.push({ icon:'🍱', text:'Exactly the right mix', pct:BONUS.mix });
  if (full) extras.push({ icon:'📦', text:'Every space filled', pct:BONUS.full });
  for (const id of you.kit || []){
    const k = KIT_BY_ID[id];
    if (k) extras.push({ icon:k.icon, text:k.name, pct:k.tip });
  }
  const nStickers = (you.stickers || []).length;
  if (nStickers) extras.push({ icon:'✨', text:`${nStickers} sticker${nStickers > 1 ? 's' : ''} on the box`, pct:nStickers * STICKER_TIP });
  if (you.streak > 1) extras.push({ icon:'🤝', text:`${you.streak} days in a row`, pct:Math.min(you.streak * STREAK_TIP, STREAK_MAX) });
  // Posh food gets noticed. So does the cheap stuff.
  const brandPct = items.reduce((s, it) => s + (BRAND[it.brand]?.tip ?? 0), 0) / Math.max(1, items.length);
  // Only worth a line if it's at least a whole percent either way.
  if (brandPct >= 0.01) extras.push({ icon:'🌿', text:'Proper fresh food', pct:brandPct });
  else if (brandPct <= -0.01) extras.push({ icon:'🏷️', text:'All a bit cheap', pct:brandPct });

  const bonusPct = extras.reduce((s, e) => s + e.pct, 0);
  const tip = Math.round(milbil.tip * (points / MAX_POINTS) * (1 + bonusPct));

  // The change is yours to keep — but only if the lunchbox was worth eating.
  // Hand back an empty box and the family would quite like their money back.
  const keepsChange = stars > 0;
  const change = keepsChange ? day.money - day.spent : Math.min(0, day.money - day.spent);
  return {
    allergy, marks, points, stars, health, label, record, keepsChange,
    groups, full, mix, extras, bonusPct, tip,
    change, coins: change + tip, items,
  };
}
