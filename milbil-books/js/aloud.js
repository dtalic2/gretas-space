// ---------- Read Aloud ----------
//
// The device's own voice reads the book out: the title and who made it, then
// every page in turn. Captions are read in the storyteller's voice. Bubbles are
// read with who is saying them — "Chomp says…", "Petal thinks…", "Sunny
// shouts…" — and every milbil has a voice of their own, higher or lower, so
// you can tell them apart with your eyes shut.
//
// It all happens on the device (the browser's speech synthesis), so nothing is
// sent anywhere and it works without the internet.

import { allPages, findMilbil, isStrip } from './model.js';
import { who } from './cast.js';
import { settings } from './store.js';

export const canSpeak = () => 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const SPEEDS = [
  { id: 'slow',   icon: '🐢', name: 'Slow',   rate: 0.75 },
  { id: 'normal', icon: '🙂', name: 'Normal', rate: 0.95 },
  { id: 'fast',   icon: '🐇', name: 'Fast',   rate: 1.2 },
];
const rateFor = (id) => (SPEEDS.find(s => s.id === id) || SPEEDS[1]).rate;

// Greta's five, picked by ear: Chomp is big and low, Petal is small and high.
// Everybody else gets a voice from their name, so it is the same every time.
const PITCH = { chomp: 0.7, hattie: 1.1, petal: 1.55, scoop: 1.3, sunny: 1.4 };

function pitchFor(id){
  if (PITCH[id]) return PITCH[id];
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 0.8 + (h % 9) * 0.09;          // somewhere from 0.8 to 1.52
}

/** Words as they should be said. SHOUTING is said, not spelt out letter by letter. */
export function sayable(text){
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .replace(/\b[A-Z]{2,}\b/g, (w) => w.toLowerCase())
    .trim();
}

const VERB = { say: 'says', think: 'thinks', shout: 'shouts' };

/**
 * Words in the order a person would read them: in rows from the top down, and
 * left to right along each row. Bubbles a little higher or lower than each
 * other still count as one row, so a conversation reads across.
 */
function readingOrder(words){
  const rows = [];
  for (const t of [...words].sort((a, b) => a.y - b.y)){
    const row = rows[rows.length - 1];
    if (row && t.y - row.top < 150) row.items.push(t);
    else rows.push({ top: t.y, items: [t] });
  }
  return rows.flatMap(r => r.items.sort((a, b) => a.x - b.x));
}

/**
 * Everything to read on one page (0 is the cover), in reading order: panels
 * from the top down and left to right; in each panel, the caption strips along
 * its top, then the bubbles and caption boxes, then the strips along its bottom.
 */
export function linesFor(book, i){
  const page = allPages(book)[i];
  if (!page) return [];
  const out = [];
  if (page.kind === 'cover'){
    out.push({ title: true, text: `${book.title || 'My Book'}.${book.author ? ` By ${book.author}.` : ''}` });
  }
  for (const p of [...page.panels].sort((a, b) => a.y - b.y || a.x - b.x)){
    const top = p.words.filter(t => isStrip(t) && t.at === 'top').sort((a, b) => a.y - b.y);
    const bottom = p.words.filter(t => isStrip(t) && t.at === 'bottom').sort((a, b) => a.y - b.y);
    for (const t of [...top, ...readingOrder(p.words.filter(t => !isStrip(t))), ...bottom]){
      if (!t.text?.trim()) continue;
      const m = t.kind !== 'caption' && t.from ? findMilbil(page, t.from) : null;
      out.push({
        id: t.id, kind: t.kind, who: m?.who || null,
        text: m ? `${who(m.who).name} ${VERB[t.kind] || 'says'}: ${t.text}` : t.text,
      });
    }
  }
  return out;
}

/** The best voice the device has: Australian if it has one, then British, then any English. */
function pickVoice(){
  const all = speechSynthesis.getVoices() || [];
  return all.find(v => /en[-_]AU/i.test(v.lang)) || all.find(v => /en[-_]GB/i.test(v.lang)) ||
    all.find(v => /^en/i.test(v.lang)) || null;
}

let current = null;      // held on to: some browsers forget to say 'finished' about an utterance nobody holds

/**
 * Say one line, then call `done` — when the voice says it has finished, or, if
 * it never says (some browsers don't), once there has been plenty of time.
 */
export function say(line, done){
  const text = sayable(line.text);
  let rate = rateFor(settings.readSpeed), pitch = 1, volume = 1;
  if (line.who) pitch = pitchFor(line.who);
  if (line.kind === 'shout'){ rate *= 1.08; pitch = Math.min(2, pitch + 0.15); }
  if (line.kind === 'think'){ rate *= 0.92; volume = 0.85; }
  if (line.title) rate *= 0.92;

  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice();
  if (v){ u.voice = v; u.lang = v.lang; } else u.lang = 'en-AU';
  u.rate = rate;
  u.pitch = pitch;
  u.volume = volume;
  current = u;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    if (current === u) current = null;
    done?.();
  };
  u.onend = finish;
  u.onerror = finish;
  const watchdog = setTimeout(finish, 3000 + text.length * 160 / rate);
  speechSynthesis.speak(u);
}

/**
 * Called straight from the tap that starts reading. iPads and iPhones only let
 * a page speak if the first thing it says comes from a tap; a silent nothing
 * said here lets everything after it be said from a timer.
 */
export function wake(){
  try {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
    speechSynthesis.resume?.();
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {}
}

export function hush(){
  current = null;
  try { speechSynthesis.cancel(); } catch {}
}

// Some browsers load their voices a moment after the page; asking early starts that off.
if (canSpeak()){
  try { speechSynthesis.getVoices(); speechSynthesis.addEventListener?.('voiceschanged', () => {}); } catch {}
}
