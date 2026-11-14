// ---------- The clock: holidays, recommendations and the countdown ----------
//
// Two separate jobs that both care about time.
//
// 1. Working out what sort of day today is — Monday in term time, a Saturday,
//    the school holidays, Anzac Day — and from that how long MilMATHS thinks
//    you should sit down for. School terms and a couple of the holidays move
//    around a bit from year to year and state to state, so this is deliberately
//    "about right" rather than exact, and the game says so.
//
// 2. A countdown you can actually watch. It only runs while the tab is in
//    front of you, so leaving the game open at dinner does not eat your time.
//
// Everything is worked out in the browser from its own clock. Nothing is
// fetched, so it all keeps working on a plane.

export const STATES = [
  { id:'NSW', name:'New South Wales' },
  { id:'VIC', name:'Victoria' },
  { id:'QLD', name:'Queensland' },
  { id:'SA',  name:'South Australia' },
  { id:'WA',  name:'Western Australia' },
  { id:'TAS', name:'Tasmania' },
  { id:'NT',  name:'Northern Territory' },
  { id:'ACT', name:'Aust. Capital Territory' },
];

// ------------------------------------------------------------- date bits ---

export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => a.getDate() === b.getDate() && a.getMonth() === b.getMonth();
const at = (y, m, d) => new Date(y, m - 1, d);

/** The nth given weekday of a month. nth = -1 means the last one. */
function nthWeekday(year, month, weekday, nth){
  if (nth > 0){
    const first = at(year, month, 1);
    const shift = (weekday - first.getDay() + 7) % 7;
    return at(year, month, 1 + shift + (nth - 1) * 7);
  }
  const last = new Date(year, month, 0);               // day 0 of next month
  const back = (last.getDay() - weekday + 7) % 7;
  return at(year, month, last.getDate() - back);
}

/** Easter Sunday, by the anonymous Gregorian algorithm. */
export function easterSunday(year){
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return at(year, month, day);
}

const plus = (d, days) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** A fixed-date holiday, plus the Monday (and Tuesday) it shifts to on a weekend. */
function fixed(year, month, day, name, { shift = true, big = false } = {}){
  const d = at(year, month, day);
  const out = [{ date: d, name, big }];
  if (shift && (d.getDay() === 0 || d.getDay() === 6)){
    out.push({ date: plus(d, d.getDay() === 6 ? 2 : 1), name: `${name} holiday`, big: false });
  }
  return out;
}

/**
 * Christmas and Boxing Day, with their make-up days.
 *
 * Both are always holidays wherever they land. Whichever of them falls on a
 * weekend earns an extra holiday, and those extras queue up on the first free
 * weekdays afterwards — so Christmas on a Saturday gives you the Monday *and*
 * the Tuesday off, which the generic weekend shift gets wrong.
 */
function christmas(year){
  const out = [
    { date: at(year, 12, 25), name: 'Christmas Day', big: true },
    { date: at(year, 12, 26), name: 'Boxing Day', big: false },
  ];
  const owed = out.filter(x => x.date.getDay() === 0 || x.date.getDay() === 6);
  let d = at(year, 12, 27);
  for (const x of owed){
    while (d.getDay() === 0 || d.getDay() === 6) d = plus(d, 1);
    out.push({ date: d, name: `${x.name} holiday`, big: false });
    d = plus(d, 1);
  }
  return out;
}

/**
 * Every public holiday in a state for a year.
 * Approximate where the real thing is proclaimed year by year (the WA King's
 * Birthday and the Brisbane show day move around).
 */
export function holidaysFor(year, state){
  const E = easterSunday(year);
  const h = [];
  const add = (date, name, big = false) => h.push({ date, name, big });

  h.push(...fixed(year, 1, 1, "New Year's Day", { big: true }));
  h.push(...fixed(year, 1, 26, 'Australia Day'));

  add(plus(E, -2), 'Good Friday', true);
  if (state !== 'TAS' && state !== 'WA') add(plus(E, -1), 'Easter Saturday');
  if (['NSW', 'VIC', 'QLD', 'ACT'].includes(state)) add(E, 'Easter Sunday', true);
  add(plus(E, 1), 'Easter Monday', true);

  const anzac = at(year, 4, 25);
  add(anzac, 'Anzac Day', true);
  if (['WA', 'NT'].includes(state) && (anzac.getDay() === 0 || anzac.getDay() === 6)){
    add(plus(anzac, anzac.getDay() === 6 ? 2 : 1), 'Anzac Day holiday');
  }

  // Labour Day, by whatever each state calls it and whenever each state has it.
  const labour = {
    VIC: () => add(nthWeekday(year, 3, 1, 2), 'Labour Day'),
    TAS: () => add(nthWeekday(year, 3, 1, 2), 'Eight Hours Day'),
    WA:  () => add(nthWeekday(year, 3, 1, 1), 'Labour Day'),
    QLD: () => add(nthWeekday(year, 5, 1, 1), 'Labour Day'),
    NT:  () => add(nthWeekday(year, 5, 1, 1), 'May Day'),
    NSW: () => add(nthWeekday(year, 10, 1, 1), 'Labour Day'),
    SA:  () => add(nthWeekday(year, 10, 1, 1), 'Labour Day'),
    ACT: () => add(nthWeekday(year, 10, 1, 1), 'Labour Day'),
  }[state];
  labour?.();

  // The monarch's birthday, which almost nobody holds on the actual birthday.
  if (state === 'QLD') add(nthWeekday(year, 10, 1, 1), "King's Birthday");
  else if (state === 'WA') add(nthWeekday(year, 9, 1, -1), "King's Birthday");
  else add(nthWeekday(year, 6, 1, 2), "King's Birthday");

  // One-state days.
  if (state === 'ACT') add(nthWeekday(year, 3, 1, 2), 'Canberra Day');
  if (state === 'SA')  add(nthWeekday(year, 3, 1, 2), 'Adelaide Cup Day');
  if (state === 'WA')  add(nthWeekday(year, 6, 1, 1), 'Western Australia Day');
  if (state === 'NT')  add(nthWeekday(year, 8, 1, 1), 'Picnic Day');
  if (state === 'VIC') add(nthWeekday(year, 11, 2, 1), 'Melbourne Cup Day');
  if (state === 'VIC') add(plus(nthWeekday(year, 9, 5, -1), 0), 'Grand Final Friday');
  if (state === 'TAS') add(nthWeekday(year, 2, 1, 2), 'Royal Hobart Regatta');
  if (state === 'QLD') add(nthWeekday(year, 8, 3, 2), 'Royal Queensland Show');

  h.push(...christmas(year));

  return h;
}

/** The public holiday today, or null. */
export function publicHoliday(date, state){
  return holidaysFor(date.getFullYear(), state).find(x => sameDay(x.date, date)) || null;
}

/** The next public holiday after today, or null if the year is out of them. */
export function nextHoliday(date, state){
  const soon = [...holidaysFor(date.getFullYear(), state), ...holidaysFor(date.getFullYear() + 1, state)]
    .filter(x => x.date > date)
    .sort((a, b) => a.date - b.date);
  return soon[0] || null;
}

// -------------------------------------------------------- school holidays ---
//
// Roughly when the four terms break, averaged across the states. Nobody's term
// dates are exactly these, which is why the game only ever says "about".

const BREAKS = [
  { from:[12, 15], to:[1, 31],  name:'the summer holidays' },
  { from:[4, 5],   to:[4, 24],  name:'the autumn holidays' },
  { from:[6, 29],  to:[7, 17],  name:'the winter holidays' },
  { from:[9, 20],  to:[10, 7],  name:'the spring holidays' },
];

export function schoolBreak(date){
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  for (const b of BREAKS){
    const from = b.from[0] * 100 + b.from[1], to = b.to[0] * 100 + b.to[1];
    if (from > to ? (md >= from || md <= to) : (md >= from && md <= to)) return b.name;
  }
  return null;
}

// ------------------------------------------------------------ special days ---

/** Days that are not public holidays but still feel like something. */
export function specialDay(date, { birthday } = {}){
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  if (birthday && birthday.m === m && birthday.d === d) return { name:'your birthday', icon:'🎂', off:true };
  if (m === 12 && d === 24) return { name:'Christmas Eve', icon:'🎄', off:true };
  if (m === 12 && d === 31) return { name:"New Year's Eve", icon:'🎆', off:false };
  if (m === 10 && d === 31) return { name:'Halloween', icon:'🎃', off:false };
  if (m === 3 && d === 14)  return { name:'Pi Day', icon:'🥧', off:false, maths:true };
  if (m === 2 && d === 29)  return { name:'a leap day', icon:'🐸', off:false, maths:true };
  if (sameDay(nthWeekday(y, 5, 0, 2), date)) return { name:"Mother's Day", icon:'💐', off:false };
  if (sameDay(nthWeekday(y, 9, 0, 1), date)) return { name:"Father's Day", icon:'👔', off:false };
  return null;
}

// --------------------------------------------------------- what sort of day ---

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayShape(now, opts = {}){
  const state = opts.state || 'NSW';
  const dow = now.getDay();
  return {
    date: now,
    dayName: DAY_NAMES[dow],
    weekend: dow === 0 || dow === 6,
    holiday: publicHoliday(now, state),
    brk: schoolBreak(now),
    special: specialDay(now, opts),
    hour: now.getHours() + now.getMinutes() / 60,
  };
}

/** True if school would be on today. */
export const schoolDay = (s) => !s.weekend && !s.holiday && !s.brk;

// ------------------------------------------------------- the recommendation ---
//
// A number of minutes, plus a sentence saying where that number came from. The
// day decides the starting figure and the time of day can only ever trim it —
// nobody needs encouraging into half an hour of algebra at ten at night.

const round5 = (n) => Math.max(0, Math.round(n / 5) * 5);

export function recommend(now = new Date(), opts = {}){
  const s = dayShape(now, opts);
  const h = s.hour;
  let mins, why, icon = '📚';

  if (s.special?.off && s.special.name === 'your birthday'){
    mins = 0; icon = '🎂';
    why = "It's your birthday. Nought minutes. Go and do something else.";
  } else if (s.holiday?.big){
    mins = 0; icon = '🎉';
    why = `It's ${s.holiday.name}. MilMATHS says have the whole day off.`;
  } else if (s.special?.off){
    mins = 5; icon = s.special.icon;
    why = `It's ${s.special.name}, so five minutes at the very most.`;
  } else if (s.holiday){
    mins = 10; icon = '🎈';
    why = `${s.holiday.name} — a public holiday where you are, so just a short one.`;
  } else if (s.brk){
    mins = s.weekend ? 15 : 20;
    icon = '🏖️';
    why = `It's ${s.brk} (about), so there's time for a proper go.`;
  } else if (s.weekend){
    mins = 15; icon = '🛋️';
    why = `${s.dayName}, so no school and no rush.`;
  } else if (s.date.getDay() === 5){
    mins = 10; icon = '🎒';
    why = 'Friday, and you have already done a whole week of school. Keep it short.';
  } else {
    mins = 15; icon = '🎒';
    why = `${s.dayName} is a school day, so this sits on top of all that.`;
  }

  if (s.special?.maths && mins > 0){
    mins += 5; icon = s.special.icon;
    why += ` And it's ${s.special.name} — five extra for luck.`;
  }

  // The time of day can only take minutes away.
  if (mins > 0){
    let cap = null, capWhy = '';
    if (h < 6)                             { cap = 5;  capWhy = "It's the middle of the night. Go back to bed."; }
    else if (h < 8.5 && schoolDay(s))      { cap = 10; capWhy = 'School first — this is a warm-up, not a lesson.'; }
    else if (h >= 9 && h < 15 && schoolDay(s)) { cap = 5; capWhy = 'It is the middle of a school day. You should be at school!'; }
    else if (h >= 20.5)                    { cap = 5;  capWhy = "It's nearly bedtime, so just a couple of questions."; }
    else if (h >= 19)                      { cap = 10; capWhy = "It's getting late, so keep it short."; }
    if (cap != null && cap < mins){ mins = cap; why = capWhy; }
  }

  mins = round5(mins);
  const title = mins === 0 ? 'Day off' : `${mins} minutes`;
  return { minutes: mins, title, why, icon, shape: s };
}

/** A one-line description of today, for the top of the screen. */
export function dayLine(now = new Date(), opts = {}){
  const s = dayShape(now, opts);
  if (s.holiday) return `${s.dayName} · ${s.holiday.name}`;
  if (s.special) return `${s.dayName} · ${s.special.name}`;
  if (s.brk) return `${s.dayName} · ${s.brk}`;
  return `${s.dayName}${s.weekend ? '' : ' · school day'}`;
}

// ------------------------------------------------------------- the countdown ---

export const mmss = (secs) => {
  const s = Math.max(0, Math.round(secs));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * A countdown that only runs while you can see it.
 *
 * It keeps the time left in seconds and ticks it down four times a second, so
 * the display never looks stuck. Hiding the tab, or pausing by hand, stops it;
 * so does the clock reaching zero, which fires onDone exactly once.
 */
export class Countdown {
  constructor({ onTick, onDone }){
    this.left = 0;
    this.total = 0;
    this.running = false;
    this.paused = true;
    this.onTick = onTick;
    this.onDone = onDone;
    this.last = 0;
    this.timer = null;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.hold();
      else if (this.running && !this.paused) this.resume();
    });
  }

  set(seconds, { start = true } = {}){
    this.left = Math.max(0, seconds);
    this.total = this.left;
    this.running = this.left > 0;
    this.paused = !start || this.left <= 0;
    if (!this.paused) this.resume(); else { this.hold(); this.onTick?.(this); }
  }

  add(seconds){
    this.left += seconds;
    this.total = Math.max(this.total, this.left);
    if (this.left > 0) this.running = true;
    this.onTick?.(this);
  }

  play(){ if (this.running && this.left > 0){ this.paused = false; this.resume(); } }
  pause(){ this.paused = true; this.hold(); this.onTick?.(this); }
  toggle(){ this.paused ? this.play() : this.pause(); }

  stop(){ this.running = false; this.paused = true; this.left = 0; this.hold(); this.onTick?.(this); }

  hold(){ clearInterval(this.timer); this.timer = null; }

  resume(){
    this.hold();
    if (document.hidden || this.paused || !this.running) return;
    this.last = performance.now();
    this.timer = setInterval(() => {
      const now = performance.now();
      this.left -= (now - this.last) / 1000;
      this.last = now;
      if (this.left <= 0){
        this.left = 0;
        this.running = false;
        this.hold();
        this.onTick?.(this);
        this.onDone?.();
        return;
      }
      this.onTick?.(this);
    }, 250);
  }

  get label(){ return mmss(this.left); }
  get done(){ return this.total > 0 && this.left <= 0; }
}
