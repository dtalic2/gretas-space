// ---------- Books, pages and panels ----------
//
// A book is a cover and a list of pages. Every page is a 1200 × 1600 sheet —
// portrait, three by four, like a real comic — and everything on it is measured
// in those units. That way the same page can be drawn at any size: a thumbnail in
// the page strip, the editor, the shelf, or the whole screen in the reader.
//
//   book   { id, title, author, color, titleFont?, track?, status:'draft'|'done', cover, pages[] }
//          titleFont = the title's text style (see styles.js); Bubbly if none
//          track = { secs, at } if somebody has recorded a soundtrack of it (see tracks.js)
//   page   { id, kind?:'cover', panels[], ink[] }
//   panel  { id, x, y, w, h, bg, cast[], words[] }   x/y/w/h in grid squares
//   milbil { id, who, x, y, h, flip }                x = middle, y = feet, page units
//   words  { id, kind, text, fs, font?, voice?, x, y, w, h, from }   x/y = middle, w/h = the text,
//          fs = how big the writing is (older books have size: 's' | 'm' | 'l'),
//          font = its text style (see styles.js); Comic if none,
//          voice = { id, secs }: somebody's own voice saying it (see voice.js).
//          kind 'sound' is a 🔊 sound button rather than words: no text, just a
//          voice, and w = h = how big the button is
//          captions also have a fill colour, and `at`: 'top' or 'bottom' for a
//          strip along that edge of the panel, or nothing for a box that moves
//   ink    { c, w, g, b, e, p[] }                     see ink.js
//
// Panels live on a 12 × 16 grid inside the page margins and never overlap, so
// whatever you do to them the page stays tidy. What is *in* a panel is measured
// in page units, not squares, so making a panel bigger opens up room beside the
// milbils instead of stretching them.

import { who } from './cast.js';
import { isStyle } from './styles.js';

export const PAGE_W = 1200, PAGE_H = 1600;
export const COLS = 12, ROWS = 16;
export const SIDE = 40, TOP = 40, FOOT = 110;      // margins; the page number sits in FOOT
export const CW = (PAGE_W - 2 * SIDE) / COLS;      // one grid square across, in page units
export const CH = (PAGE_H - TOP - FOOT) / ROWS;    // ...and down
export const GUT = 10;                             // half the gap between two panels
export const MIN_CELLS = 2;                        // the smallest a panel can be, each way

export const FRAME = 6.6;     // how thick a panel's frame is (0.55% of the page's width, as in the CSS)
export const CAP_PADX = 24, CAP_PADY = 16;   // room round the words in a caption

export const MB_H = 330;      // how tall a milbil is when it first goes in
export const MB_MIN = 70;     // ...the smallest one can be made
export const BUBBLE_ROOM = 190;   // room left above a milbil for something to say

export const uid = () => Math.random().toString(36).slice(2, 9);
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ------------------------------------------------------------- choices ---

export const COVER_COLOURS = [
  '#7b5cff', '#ff5fa2', '#38b6ff', '#2fc4a0', '#ffc531',
  '#ff8a3c', '#e5484d', '#4cbb4a', '#2b2a5e', '#ff9ecf',
];

/** What a panel can have behind the milbils. */
export const PANEL_BGS = [
  { id:'white', name:'Plain',    css:'#ffffff' },
  { id:'sky',   name:'Sky',      css:'linear-gradient(#8fd6ff, #e4f6ff)' },
  { id:'grass', name:'Outside',  css:'linear-gradient(#bfe9ff 0 64%, #7fd36a 64% 100%)' },
  { id:'beach', name:'Beach',    css:'linear-gradient(#bfe9ff 0 42%, #5cc8ff 42% 63%, #ffe2a8 63%)' },
  { id:'room',  name:'Indoors',  css:'linear-gradient(#ffe9c7 0 70%, #c98f5a 70%)' },
  { id:'night', name:'Night',    css:'radial-gradient(circle, #fff 0 4%, #fff0 6%) 0 0 / 23% 19%, linear-gradient(#141a46, #3b2f7a)' },
  { id:'snow',  name:'Snow',     css:'linear-gradient(#cfe9ff 0 68%, #ffffff 68%)' },
  { id:'sun',   name:'Sunshine', css:'linear-gradient(#fff6c2, #ffe08a)' },
  { id:'pink',  name:'Pink',     css:'#ffe0ef' },
  { id:'lilac', name:'Lilac',    css:'#ece4ff' },
  { id:'mint',  name:'Mint',     css:'#dcf7ea' },
  { id:'none',  name:'See-through', css:'transparent' },
];
export const PANEL_BG = Object.fromEntries(PANEL_BGS.map(b => [b.id, b]));
export const bgCss = (id) => (PANEL_BG[id] || PANEL_BG.white).css;

/** What colour a caption is. Comics use pale yellow; the rest are for fun. */
export const CAPTION_FILLS = [
  { id:'yellow', name:'Yellow', css:'#fff3b0' },
  { id:'white',  name:'White',  css:'#ffffff' },
  { id:'pink',   name:'Pink',   css:'#ffe0ef' },
  { id:'sky',    name:'Sky',    css:'#dff3ff' },
  { id:'mint',   name:'Mint',   css:'#dcf7ea' },
];
export const captionFill = (id) => (CAPTION_FILLS.find(f => f.id === id) || CAPTION_FILLS[0]).css;

export const PEN_COLOURS = [
  '#2b2233', '#ffffff', '#8a8a99', '#9a6a3c', '#ffd9b3', '#e5484d',
  '#ff8a3c', '#ffc531', '#c6e83a', '#4cbb4a', '#2fc4a0', '#38b6ff',
  '#2f6fe0', '#7b5cff', '#c86fd8', '#ff5fa2', '#ff9ecf', '#00e5ff',
];

export const TEMPLATES = [
  { id:'top',   name:'One panel at the top',  rects:[[0, 0, 12, 7]] },
  { id:'one',   name:'One big panel',         rects:[[0, 0, 12, 16]] },
  { id:'rows2', name:'Two, one on top',       rects:[[0, 0, 12, 8], [0, 8, 12, 8]] },
  { id:'cols2', name:'Two side by side',      rects:[[0, 0, 6, 16], [6, 0, 6, 16]] },
  { id:'rows3', name:'Three in a stack',      rects:[[0, 0, 12, 5], [0, 5, 12, 5], [0, 10, 12, 6]] },
  { id:'big2',  name:'One big, two small',    rects:[[0, 0, 12, 9], [0, 9, 6, 7], [6, 9, 6, 7]] },
  { id:'four',  name:'Four squares',          rects:[[0, 0, 6, 8], [6, 0, 6, 8], [0, 8, 6, 8], [6, 8, 6, 8]] },
  { id:'six',   name:'Six, like a comic',     rects:[[0, 0, 6, 5], [6, 0, 6, 5], [0, 5, 6, 5], [6, 5, 6, 5], [0, 10, 6, 6], [6, 10, 6, 6]] },
  { id:'blank', name:'Blank, just for drawing', rects:[] },
];
export const TEMPLATE = Object.fromEntries(TEMPLATES.map(t => [t.id, t]));

export const TITLE_IDEAS = [
  "Chomp's Big Lunch", 'The Day Hattie Lost Her Hat', 'Petal and the Giant Sunflower',
  "Scoop's Ice Cream Disaster", 'Sunny Goes to the Beach', "The Milbil Who Couldn't Sleep",
  "Wizzle's Wobbly Spell", 'A Very Royal Picnic', 'Boo and the Haunted Canteen',
  'The Great Milbil Race', 'Lost in Milbil Town', "Giggle Can't Stop Laughing",
  'The Super Cool Truck', "Floaty's Runaway Balloon", 'Sprouty Grows a Tree',
  "Chef Bil's Pizza Party", 'Starry Makes a Wish', "Toothy's Wobbly Tooth",
  'Snooze Misses the Bus', 'The Mystery of the Missing Lunchbox', 'Milbils in Space',
  'The Biggest Sandcastle Ever', 'Puddle and the Ducks', 'A Rainy Day at Milbil School',
];

// ------------------------------------------------------------ factories ---

export function newPanel([x, y, w, h], extra = {}){
  return { id: uid(), x, y, w, h, bg:'white', cast: [], words: [], ...extra };
}

export function newPage(template = 'top'){
  return { id: uid(), panels: (TEMPLATE[template] || TEMPLATE.top).rects.map(r => newPanel(r)), ink: [] };
}

/** The cover: a title at the top and one big see-through panel for milbils. */
export function newCover(){
  return { id: uid(), kind: 'cover', ink: [],
    panels: [newPanel([0, 5, 12, 11], { fixed: true, frameless: true, bg: 'none' })] };
}

export function newBook({ title = '', author = '', color = COVER_COLOURS[0], star = null } = {}){
  const now = Date.now();
  const cover = newCover();
  if (star) placeMilbil(cover.panels[0], star, { h: 720 });
  return {
    id: 'b' + uid(), v: 1, title: title.trim(), author: author.trim(), color,
    status: 'draft', created: now, updated: now, finished: null,
    cover, pages: [newPage('top')],
  };
}

/** Cover first, then the numbered pages. */
export const allPages = (book) => [book.cover, ...book.pages];

// -------------------------------------------------------------- geometry ---

/** Where a panel actually sits on the page, in page units. */
export function box(p){
  return { x: SIDE + p.x * CW + GUT, y: TOP + p.y * CH + GUT, w: p.w * CW - 2 * GUT, h: p.h * CH - 2 * GUT };
}

export const mbWidth = (m) => m.h * who(m.who).aspect;
export function mbBox(m){
  const w = mbWidth(m);
  return { x: m.x - w / 2, y: m.y - m.h, w, h: m.h };
}

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const area = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
                       Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/** Is there room for this rectangle of squares, ignoring one panel (the one being moved)? */
export function fits(page, r, ignoreId = null){
  if (r.w < MIN_CELLS || r.h < MIN_CELLS) return false;
  if (r.x < 0 || r.y < 0 || r.x + r.w > COLS || r.y + r.h > ROWS) return false;
  return !page.panels.some(p => p.id !== ignoreId && overlaps(p, r));
}

/** The panel whose inside contains a point, if any. */
export function panelAt(page, x, y){
  return page.panels.find(p => {
    const b = box(p);
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }) || null;
}

/**
 * Somewhere to put a new panel: as big as a good-sized panel can be (twelve by
 * six, half a page), as near the top left as possible.
 */
export function spotForPanel(page, { want = 72, minW = 3, minH = 3 } = {}){
  let best = null, bestScore = -Infinity;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++){
    for (let w = minW; x + w <= COLS; w++) for (let h = minH; y + h <= ROWS && h <= 8; h++){
      const r = { x, y, w, h };
      if (!fits(page, r)) continue;
      const score = Math.min(w * h, want) * 100 - y * 13 - x + w * 0.1;
      if (score > bestScore){ bestScore = score; best = r; }
    }
  }
  return best;
}

/** The first place, reading the page like a book, that a panel this size fits. */
export function firstFit(page, w, h){
  w = clamp(w, MIN_CELLS, COLS); h = clamp(h, MIN_CELLS, ROWS);
  for (let y = 0; y + h <= ROWS; y++) for (let x = 0; x + w <= COLS; x++){
    if (fits(page, { x, y, w, h })) return { x, y, w, h };
  }
  return null;
}

/**
 * Dragging a corner. `gx`, `gy` are the grid lines the finger is nearest; the
 * opposite corner stays put. If the panel would bump into another one, it
 * grows as far as it can instead — the nearest rectangle that does fit.
 */
export function resizeTarget(page, p, corner, gx, gy){
  const west = corner.includes('w'), north = corner.includes('n');
  const ax = west ? p.x + p.w : p.x;
  const ay = north ? p.y + p.h : p.y;
  gx = west ? clamp(gx, 0, ax - MIN_CELLS) : clamp(gx, ax + MIN_CELLS, COLS);
  gy = north ? clamp(gy, 0, ay - MIN_CELLS) : clamp(gy, ay + MIN_CELLS, ROWS);
  const rect = (cx, cy) => ({ x: Math.min(ax, cx), y: Math.min(ay, cy), w: Math.abs(cx - ax), h: Math.abs(cy - ay) });
  const want = rect(gx, gy);
  if (fits(page, want, p.id)) return want;

  const near = west ? ax - MIN_CELLS : ax + MIN_CELLS;
  const nearY = north ? ay - MIN_CELLS : ay + MIN_CELLS;
  let best = null, bestD = Infinity;
  for (let cx = Math.min(near, gx); cx <= Math.max(near, gx); cx++){
    for (let cy = Math.min(nearY, gy); cy <= Math.max(nearY, gy); cy++){
      const r = rect(cx, cy);
      if (!fits(page, r, p.id)) continue;
      const d = Math.abs(cx - gx) + Math.abs(cy - gy);
      if (d < bestD || (d === bestD && r.w * r.h > best.w * best.h)){ best = r; bestD = d; }
    }
  }
  return best;
}

/**
 * Dragging a whole panel by (dx, dy) squares. If the spot is taken it slides
 * along whichever way is still free, so it doesn't just stick.
 */
export function moveTarget(page, p, dx, dy){
  const at = (x, y) => ({ x: clamp(x, 0, COLS - p.w), y: clamp(y, 0, ROWS - p.h), w: p.w, h: p.h });
  for (const r of [at(p.x + dx, p.y + dy), at(p.x + dx, p.y), at(p.x, p.y + dy)]){
    if (fits(page, r, p.id)) return r;
  }
  return null;
}

/**
 * Make a panel bigger so it has room for what is in it. It only ever grows,
 * never moves away from where it was, and stops at other panels and the edge.
 * Returns true if it changed.
 */
export function growToFit(page, p, needW, needH){
  if (p.fixed) return false;
  const W = clamp(Math.max(p.w, needW), p.w, COLS), H = clamp(Math.max(p.h, needH), p.h, ROWS);
  if (W === p.w && H === p.h) return false;
  let best = null, bestScore = 0;
  for (let w = p.w; w <= W; w++) for (let h = p.h; h <= H; h++){
    for (let x = Math.max(0, p.x - (w - p.w)); x <= p.x && x + w <= COLS; x++){
      for (let y = Math.max(0, p.y - (h - p.h)); y <= p.y && y + h <= ROWS; y++){
        const r = { x, y, w, h };
        if (!fits(page, r, p.id)) continue;
        // as close to the size wanted as possible; growing right and down beats left and up
        const score = (w - p.w) / Math.max(1, W - p.w) + (h - p.h) / Math.max(1, H - p.h)
          - ((p.x - x) + (p.y - y)) * 0.01;
        if (score > bestScore){ bestScore = score; best = r; }
      }
    }
  }
  if (!best) return false;
  Object.assign(p, best);
  return true;
}

// ------------------------------------------------------- what's in a panel ---

/**
 * How tall a new milbil should stand in a panel: as tall as the ones already
 * there, so they match; in an empty panel, MB_H — bigger in a big panel,
 * smaller in one that couldn't grow.
 */
export function newHeight(p){
  const B = box(p);
  if (p.cast.length){
    const avg = p.cast.reduce((a, m) => a + m.h, 0) / p.cast.length;
    return Math.round(clamp(avg, MB_MIN, B.h * 0.95));
  }
  return Math.round(clamp(Math.max(Math.min(MB_H, B.h * 0.68), B.h * 0.5), MB_MIN, 480));
}

/** Grid squares a panel needs to hold what is in it, plus one more milbil `h` tall. */
export function roomFor(p, extraWho, h = MB_H){
  const widths = p.cast.map(m => mbWidth(m));
  if (extraWho) widths.push(h * who(extraWho).aspect);
  const needW = widths.reduce((a, b) => a + b, 0) + (widths.length + 1) * 30 + 2 * GUT;
  const tallest = Math.max(h, ...p.cast.map(m => m.h));
  const needH = tallest + BUBBLE_ROOM + 2 * GUT;
  return { w: Math.ceil(needW / CW - 0.04), h: Math.ceil(needH / CH - 0.04) };
}

/**
 * Stand a milbil in the widest gap in a panel, feet near the bottom. If no gap
 * is wide enough, everybody shuffles along to make room — evenly spaced, and
 * taking whatever they are saying with them.
 */
export function placeMilbil(p, whoId, { h = null } = {}){
  const B = box(p);
  const H = Math.round(h ?? newHeight(p));
  const w = H * who(whoId).aspect;
  const m = { id: uid(), who: whoId, h: H, flip: false, x: 0, y: Math.round(B.y + B.h - Math.min(18, B.h * 0.04)) };

  // Somebody new stands to the right of everybody already there, if there's
  // room — so the order you put milbils in is the order they read in. If not,
  // the widest gap there is.
  const row = [...p.cast].sort((a, b) => a.x - b.x);
  let gap = [B.x, B.x + B.w], gapLen = -1, slot = 0, cursor = B.x;
  row.forEach((o, i) => {
    const a = o.x - mbWidth(o) / 2;
    if (a - cursor > gapLen){ gapLen = a - cursor; gap = [cursor, a]; slot = i; }
    cursor = Math.max(cursor, o.x + mbWidth(o) / 2);
  });
  const right = B.x + B.w - cursor;
  if (right > gapLen || right >= w + 24){ gapLen = right; gap = [cursor, B.x + B.w]; slot = row.length; }

  if (!row.length || gapLen >= w + 24){
    m.x = Math.round(w > B.w ? B.x + B.w / 2 : clamp((gap[0] + gap[1]) / 2, B.x + w / 2, B.x + B.w - w / 2));
  } else {
    row.splice(slot, 0, m);
    const widths = row.map(o => (o === m ? w : mbWidth(o)));
    const space = (B.w - widths.reduce((a, b) => a + b, 0)) / (row.length + 1);
    let at = B.x + space;
    row.forEach((o, i) => {
      const nx = Math.round(at + widths[i] / 2);
      if (o !== m){
        for (const t of p.words) if (t.from === o.id){ t.x += nx - o.x; keepWordsOnPage(t, B); }
      }
      o.x = nx;
      at += widths[i] + space;
    });
  }
  p.cast.push(m);
  return m;
}

/**
 * Put a milbil in a panel. If the panel is too small for everybody in it, it
 * grows first — as far as the panels around it allow.
 */
export function addMilbil(page, p, whoId){
  const first = !p.cast.length;
  const need = roomFor(p, whoId, first ? MB_H : newHeight(p));
  const grew = growToFit(page, p, need.w, need.h);
  const m = placeMilbil(p, whoId);
  return { m, grew };
}

/**
 * After a panel changes size, make sure everything in it can still be seen:
 * nothing taller than the panel, and nobody more than about a third out of it.
 */
export function fitContents(p){
  const B = box(p);
  for (const m of p.cast){
    if (!p.frameless) m.h = Math.round(clamp(m.h, MB_MIN, B.h));
    const w = mbWidth(m);
    m.x = Math.round(clamp(m.x, B.x + w * 0.15, B.x + B.w - w * 0.15));
    m.y = Math.round(clamp(m.y, B.y + m.h * 0.75, B.y + B.h + m.h * 0.35));
  }
  for (const t of p.words) if (!isStrip(t)) keepWordsOnPage(t, B);
}

export function shiftContents(p, dx, dy){
  for (const m of p.cast){ m.x += dx; m.y += dy; }
  for (const t of p.words){ t.x += dx; t.y += dy; }
}

export function find(page, id){
  for (const p of page.panels){
    const m = p.cast.find(x => x.id === id);
    if (m) return { panel: p, m };
    const t = p.words.find(x => x.id === id);
    if (t) return { panel: p, t };
  }
  return null;
}

export const findMilbil = (page, id) => {
  for (const p of page.panels){ const m = p.cast.find(x => x.id === id); if (m) return m; }
  return null;
};

/** Move a milbil, and whatever it is saying, into another panel. */
export function moveToPanel(from, to, m){
  from.cast = from.cast.filter(x => x !== m);
  to.cast.push(m);
  const said = from.words.filter(t => t.from === m.id);
  from.words = from.words.filter(t => t.from !== m.id);
  to.words.push(...said);
  fitContents(to);
}

// ---------------------------------------------------------------- words ---

export const TEXT_SIZE = { s: 38, m: 48, l: 64 };
export const FS_MIN = 24, FS_MAX = 130;     // the smallest and biggest writing can be

/** How big the writing in some words is, in page units. */
export const fontSize = (t) => clamp(Number(t.fs) || TEXT_SIZE[t.size] || TEXT_SIZE.m, FS_MIN, FS_MAX);

/** A caption that runs along the top or the bottom of its panel. */
export const isStrip = (t) => t.kind === 'caption' && (t.at === 'top' || t.at === 'bottom');

/** A 🔊 sound button: a voice to tap, with no bubble or words round it. */
export const isSound = (t) => t.kind === 'sound';

/** Words with a voice but nothing written: the bubble just has a big 🔊 in it. */
export const voiceOnly = (t) => !!t.voice && !t.text?.trim();

/** How wide and tall a sound button is, for writing this big. */
export const soundSize = (fs) => Math.round(fs * 2.3);

/** Half the size of a bubble's body: the oval around the words. */
export function bodyHalf(t){
  if (isSound(t)) return { rx: t.w / 2, ry: t.h / 2 };
  if (isStrip(t)) return { rx: (t.sw ?? t.w + 2 * CAP_PADX) / 2, ry: (t.sh ?? t.h + 2 * CAP_PADY) / 2 };
  if (t.kind === 'caption') return { rx: t.w / 2 + CAP_PADX, ry: t.h / 2 + CAP_PADY + 2 };
  if (t.kind === 'think') return { rx: t.w / 2 * 1.25 + 16, ry: t.h / 2 * 1.25 + 14 };
  return { rx: t.w / 2 * 1.3 + 24, ry: t.h / 2 * 1.3 + 22 };
}

export const bumpRadius = (rx, ry) => clamp(Math.min(rx, ry) * 0.36, 16, 42);

/** Half the size of everything a bubble draws, bumps and spikes included. */
export function extent(t){
  const { rx, ry } = bodyHalf(t);
  if (isStrip(t)) return { rx, ry };
  if (isSound(t)) return { rx: rx + 4, ry: ry + 4 };
  if (t.kind === 'think'){ const r = bumpRadius(rx, ry); return { rx: rx + r, ry: ry + r }; }
  if (t.kind === 'shout') return { rx: rx * 1.26, ry: ry * 1.26 };
  return { rx: rx + 5, ry: ry + 5 };
}

/** Keep a bubble's middle inside its panel and all of it on the page. */
export function keepWordsOnPage(t, B = null){
  if (isStrip(t)) return;                 // strips go where layoutCaptions puts them
  const { rx, ry } = extent(t);
  if (B){ t.x = clamp(t.x, B.x, B.x + B.w); t.y = clamp(t.y, B.y, B.y + B.h); }
  t.x = Math.round(clamp(t.x, Math.min(rx, PAGE_W / 2), Math.max(PAGE_W - rx, PAGE_W / 2)));
  t.y = Math.round(clamp(t.y, Math.min(ry, PAGE_H / 2), Math.max(PAGE_H - ry, PAGE_H / 2)));
}

/**
 * Somewhere sensible for a new bubble: as close as it can be to just above
 * the head of whoever is saying it (the top left of the panel, for a caption
 * box), without covering other bubbles, anybody's face, or a caption strip.
 * Every spot on a grid across the panel is tried and the best one kept.
 */
export function placeWords(p, t, m){
  const B = box(p);
  const { rx, ry } = extent(t);
  const strip = (at) => p.words.reduce((n, o) => n + (isStrip(o) && o.at === at && o !== t ? o.sh || 0 : 0), 0);
  const top = B.y + strip('top'), bottom = B.y + B.h - strip('bottom');
  // above the speaker's head; a caption box in the top left; a sound button in the top right
  const want = m ? { x: m.x, y: m.y - m.h - ry - 26 }
    : isSound(t) ? { x: B.x + B.w - rx - 18, y: top + ry + 18 } : { x: B.x + rx + 18, y: top + ry + 18 };

  const span = (lo, hi, n, also) => {
    if (hi <= lo) return [(lo + hi) / 2];
    const out = Array.from({ length: n }, (_, i) => lo + (hi - lo) * i / (n - 1));
    out.push(clamp(also, lo, hi));
    return out;
  };
  const xs = span(B.x + rx + 10, B.x + B.w - rx - 10, 13, want.x);
  const ys = span(top + ry + 10, bottom - ry - 10, 11, want.y);

  const rectAt = (x, y) => ({ x: x - rx, y: y - ry, w: rx * 2, h: ry * 2 });
  const others = p.words.filter(o => o !== t).map(o => { const e = extent(o); return { x: o.x - e.rx, y: o.y - e.ry, w: e.rx * 2, h: e.ry * 2 }; });
  const faces = p.cast.map(o => ({ x: o.x - mbWidth(o) * 0.45, y: o.y - o.h, w: mbWidth(o) * 0.9, h: o.h * 0.55 }));
  const bodies = p.cast.map(o => ({ x: o.x - mbWidth(o) * 0.45, y: o.y - o.h * 0.45, w: mbWidth(o) * 0.9, h: o.h * 0.45 }));

  let best = null, bestCost = Infinity;
  for (const x of xs) for (const y of ys){
    const r = rectAt(x, y);
    let cost = Math.hypot(x - want.x, y - want.y);
    for (const o of others) cost += area(r, o) / 20;
    for (const f of faces) cost += area(r, f) / 30;
    for (const b of bodies) cost += area(r, b) / 120;
    if (cost < bestCost){ bestCost = cost; best = { x, y }; }
  }
  t.x = Math.round(best.x);
  t.y = Math.round(best.y);
  keepWordsOnPage(t);
}

// -------------------------------------------------------------- captions ---
//
// A caption strip runs the whole width of its panel, just inside the frame,
// along the top or the bottom. Several on the same edge stack up. Strips are
// never placed by hand: wherever the panel goes, or whatever size it becomes,
// they are laid out again from the panel itself.

/** How wide the words in a strip can be in this panel. */
export const stripTextWidth = (p) => Math.max(80, Math.round(box(p).w - 2 * FRAME - 2 * CAP_PADX));

/**
 * Put every strip in a panel in its place. Their words must already have been
 * measured at stripTextWidth(p) — the editor does that, since measuring needs
 * the page on screen.
 */
export function layoutCaptions(p){
  const B = box(p);
  const left = B.x + FRAME, width = B.w - 2 * FRAME;
  let top = B.y + FRAME, bottom = B.y + B.h - FRAME;
  for (const t of p.words){
    if (!isStrip(t) || t.at !== 'top') continue;
    t.sw = width; t.sh = t.h + 2 * CAP_PADY; t.framed = !p.frameless;
    t.x = Math.round(left + width / 2); t.y = Math.round(top + t.sh / 2);
    top += t.sh;
  }
  // the last one added sits lowest, so they still read top to bottom in the order they were made
  for (const t of [...p.words].reverse()){
    if (!isStrip(t) || t.at !== 'bottom') continue;
    t.sw = width; t.sh = t.h + 2 * CAP_PADY; t.framed = !p.frameless;
    t.x = Math.round(left + width / 2); t.y = Math.round(bottom - t.sh / 2);
    bottom -= t.sh;
  }
}

/**
 * A new strip shouldn't cover anybody up. If it would, the panel grows by the
 * strip's height (if there is room), and everything in it moves along so the
 * new space is where the strip is. If there is no room to grow, everybody
 * steps out of the way instead: milbils stand up on a strip along the bottom
 * (smaller, if that's what it takes to keep their heads in the panel), and
 * bubbles move out from under a strip along the top.
 *
 * Returns 'grew', 'moved' or '' (nothing needed doing).
 */
export function makeRoomForCaption(page, p, t){
  if (!isStrip(t)) return '';
  const top = t.y - t.sh / 2, bottom = t.y + t.sh / 2;
  const under = (o) => !isStrip(o) && o !== t && Math.abs(o.y - t.y) < extent(o).ry + t.sh / 2;
  const covered = p.cast.some(m => m.y > top && m.y - m.h < bottom) || p.words.some(under);
  if (!covered) return '';

  const B0 = box(p);
  if (!p.fixed && growToFit(page, p, p.w, Math.ceil((B0.h + t.sh + 2 * GUT) / CH - 0.04))){
    const B1 = box(p);
    const dy = t.at === 'bottom' ? B1.y - B0.y : (B1.y + B1.h) - (B0.y + B0.h);
    for (const m of p.cast) m.y += dy;
    for (const o of p.words) if (!isStrip(o)) o.y += dy;
    return 'grew';
  }

  const strips = (at) => p.words.reduce((n, o) => n + (isStrip(o) && o.at === at ? o.sh || 0 : 0), 0);
  const ceiling = B0.y + FRAME + strips('top');
  const floor = B0.y + B0.h - FRAME - strips('bottom');
  if (t.at === 'bottom'){
    for (const m of p.cast){
      if (m.y <= floor) continue;
      const dy = floor - m.y;
      m.y = Math.round(floor);
      m.h = Math.round(clamp(Math.min(m.h, m.y - ceiling), MB_MIN, m.h));
      for (const o of p.words) if (o.from === m.id) o.y += dy;
    }
  }
  for (const o of p.words){
    if (!under(o)) continue;
    const e = extent(o);
    o.y = Math.round(t.at === 'top' ? Math.max(o.y, ceiling + e.ry + 4) : Math.min(o.y, floor - e.ry - 4));
  }
  return 'moved';
}

// --------------------------------------------- copying to another panel ---

/** The lines drawn in a panel: the ones whose middle is inside it. */
export function inkIn(page, p){
  const B = box(p);
  return page.ink.filter(l => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < l.p.length; i += 2){
      const x = l.p[i], y = l.p[i + 1];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return cx >= B.x && cx <= B.x + B.w && cy >= B.y && cy <= B.y + B.h;
  });
}

/** Has anything actually been drawn in this panel (not just rubbed out)? */
export const hasDrawing = (page, p) => inkIn(page, p).some(l => !l.e);

/**
 * Copy things from one panel into another — on the same page or a different
 * one — or move them, if `move` is set. `keys` says what:
 *
 *   'm:<id>'  a milbil, and everything they are saying
 *   'w:<id>'  a caption, or words with nobody left to say them
 *   'ink'     everything drawn in the panel
 *
 * If the panels are different sizes, everything is scaled to fit and kept in
 * the middle (words not quite so much, so they stay readable). The copied
 * words come back, because their writing may have changed size and they want
 * measuring again.
 */
export function copyAcross({ fromPage, from, toPage, to, keys, move = false }){
  const Bs = box(from), Bt = box(to);
  const k = Math.min(Bt.w / Bs.w, Bt.h / Bs.h);
  const ox = Bt.x + (Bt.w - Bs.w * k) / 2, oy = Bt.y + (Bt.h - Bs.h * k) / 2;
  const X = (x) => Math.round(ox + (x - Bs.x) * k), Y = (y) => Math.round(oy + (y - Bs.y) * k);
  const words = [];

  // Words don't shrink or grow as much as everything else, so they can still be read.
  const kw = clamp(k, 0.75, 1.5);
  const copyWords = (t, speaker) => {
    const c = { ...t, id: uid(), from: speaker, x: X(t.x), y: Y(t.y),
      fs: Math.round(clamp(fontSize(t) * kw, FS_MIN, FS_MAX)) };
    for (const key of ['sw', 'sh', 'mw', 'framed']) delete c[key];
    to.words.push(c);
    words.push(c);
  };

  for (const key of keys){
    if (key.startsWith('m:')){
      const m = from.cast.find(x => x.id === key.slice(2));
      if (!m) continue;
      const c = { ...m, id: uid(), x: X(m.x), y: Y(m.y), h: Math.max(MB_MIN, Math.round(m.h * k)) };
      to.cast.push(c);
      for (const t of from.words.filter(t => t.from === m.id)) copyWords(t, c.id);
      if (move){
        from.cast = from.cast.filter(x => x !== m);
        from.words = from.words.filter(t => t.from !== m.id);
      }
    } else if (key.startsWith('w:')){
      const t = from.words.find(x => x.id === key.slice(2));
      if (!t) continue;
      copyWords(t, null);
      if (move) from.words = from.words.filter(x => x !== t);
    }
  }

  if (keys.includes('ink')){
    const lines = inkIn(fromPage, from);
    const copies = lines.map(l => ({ ...l, w: Math.max(1, Math.round(l.w * k * 10) / 10),
      p: l.p.map((v, i) => (i % 2 ? Y(v) : X(v))) }));
    if (move) fromPage.ink = fromPage.ink.filter(l => !lines.includes(l));
    // The copy goes in underneath everything else on its page. That way any
    // rubbing-out copied with it only rubs out the copy, never something that
    // was already drawn there.
    toPage.ink.unshift(...copies);
  }
  fitContents(to);
  return words;
}

// -------------------------------------------------------------- checking ---

export function pageIsEmpty(page){
  return !page.ink.length && page.panels.every(p => !p.cast.length && !p.words.length);
}

export const countPages = (book) => book.pages.length;

/**
 * Anything could be in storage — an old save, or a half-written one. Put a book
 * back into shape rather than trusting it.
 */
export function repairBook(b){
  if (!b || typeof b !== 'object' || typeof b.id !== 'string') return null;
  const page = (pg, cover = false) => {
    pg = (pg && typeof pg === 'object') ? pg : (cover ? newCover() : newPage('blank'));
    pg.id ||= uid();
    if (cover) pg.kind = 'cover';
    pg.ink = Array.isArray(pg.ink) ? pg.ink.filter(s => s && Array.isArray(s.p) && s.p.length >= 2) : [];
    pg.panels = (Array.isArray(pg.panels) ? pg.panels : []).filter(p => p && typeof p === 'object').map(p => {
      p.id ||= uid();
      for (const k of ['x', 'y', 'w', 'h']) p[k] = Math.round(Number(p[k]) || 0);
      p.cast = (Array.isArray(p.cast) ? p.cast : []).filter(m => m && m.who && Number.isFinite(m.x) && Number.isFinite(m.y) && m.h > 0);
      p.words = (Array.isArray(p.words) ? p.words : []).filter(t => t && typeof t.text === 'string' && Number.isFinite(t.x) && Number.isFinite(t.y));
      for (const t of p.words){
        t.kind ||= 'say'; t.size = TEXT_SIZE[t.size] ? t.size : 'm'; t.w = +t.w || 100; t.h = +t.h || 50;
        if (t.fs != null) t.fs = Math.round(clamp(+t.fs || TEXT_SIZE.m, FS_MIN, FS_MAX));
        if (t.kind !== 'caption' || !['top', 'bottom'].includes(t.at)) delete t.at;
        if (t.font != null && !isStyle(t.font)) delete t.font;
        if (t.voice != null && !(typeof t.voice?.id === 'string' && Number(t.voice.secs) > 0)) delete t.voice;
      }
      // a sound button with no sound on it, or words with neither words nor a voice, is nothing at all
      p.words = p.words.filter(t => (isSound(t) ? !!t.voice : !!t.text.trim() || !!t.voice));
      layoutCaptions(p);
      p.bg ||= 'white';
      return p;
    });
    if (cover && !pg.panels.length) pg.panels = newCover().panels;
    return pg;
  };
  b.cover = page(b.cover, true);
  b.pages = (Array.isArray(b.pages) ? b.pages : []).map(pg => page(pg));
  if (!b.pages.length) b.pages = [newPage('top')];
  b.title = String(b.title ?? '').slice(0, 60);
  b.author = String(b.author ?? '').slice(0, 30);
  b.color ||= COVER_COLOURS[0];
  if (b.titleFont != null && !isStyle(b.titleFont)) delete b.titleFont;
  if (b.track != null && !(b.track && Number(b.track.secs) > 0)) delete b.track;
  b.status = b.status === 'done' ? 'done' : 'draft';
  b.created ||= Date.now();
  b.updated ||= b.created;
  return b;
}
