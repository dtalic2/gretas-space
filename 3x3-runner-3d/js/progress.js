// ---------- Progression: XP & levels, missions, daily quests, login rewards ----------

import { MISSION_POOL, DAILY_POOL, DAILY_REWARD, DOGS, OUTFITS, xpForLevel } from './data.js';
import { mulberry } from './world.js';

export function todayKey(d = new Date()){
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------- run stats ----------
export function newRunStats(){
  return { distance:0, coins:0, correct:0, asked:0, jumps:0, slides:0, powerups:0, fast:0,
           bestStreak:0, tableCorrect:{} };
}

// Value of a goal type for the current run (one-run goals).
function runValue(type, stats, goal){
  switch (type){
    case 'run': return Math.floor(stats.distance);
    case 'coins': return stats.coins;
    case 'correct': return stats.correct;
    case 'jumps': return stats.jumps;
    case 'slides': return stats.slides;
    case 'powerups': return stats.powerups;
    case 'fast': return stats.fast;
    case 'streak': return stats.bestStreak;
    case 'table': return stats.tableCorrect[goal.table] || 0;
    case 'runs': return 1;
    default: return 0;
  }
}

// ---------- missions ----------
export function missionView(save, stats = null){
  return save.missions.active.map(m => {
    const def = MISSION_POOL[m.idx];
    let prog = m.progress;
    if (stats && !m.done){
      prog = def.type === 'totalCorrect' ? save.totals.correct + stats.correct
        : def.type === 'table' ? prog + runValue(def.type, stats, def)
        : Math.max(prog, runValue(def.type, stats, def));
    }
    if (def.type === 'totalCorrect' && !stats) prog = save.totals.correct;
    return { ...def, progress:Math.min(def.goal, prog), done: m.done || prog >= def.goal, claimed:m.claimed };
  });
}

/** Check live missions; returns newly completed ones (marked done, reward pending claim). */
export function checkMissions(save, stats){
  const done = [];
  save.missions.active.forEach(m => {
    if (m.done) return;
    const def = MISSION_POOL[m.idx];
    const v = def.type === 'totalCorrect' ? save.totals.correct + stats.correct : runValue(def.type, stats, def);
    // Table goals accumulate across runs; the rest are best-in-one-run.
    if (def.type === 'table'){
      if ((m.base ?? m.progress) + v >= def.goal){ m.done = true; done.push(def); }
    } else if (v >= def.goal){ m.done = true; m.progress = def.goal; done.push(def); }
  });
  return done;
}

/** Store end-of-run progress for missions that weren't completed. */
export function commitMissions(save, stats){
  for (const m of save.missions.active){
    if (m.done) continue;
    const def = MISSION_POOL[m.idx];
    if (def.type === 'table') m.progress = Math.min(def.goal, (m.progress || 0) + (stats.tableCorrect[def.table] || 0));
    else if (def.type !== 'totalCorrect') m.progress = Math.max(m.progress, runValue(def.type, stats, def));
    m.base = m.progress;
  }
}

export function claimMission(save, i){
  const m = save.missions.active[i];
  if (!m || !m.done) return 0;
  const def = MISSION_POOL[m.idx];
  save.missions.done++;
  // replace with the next mission in line (loop back with scaled goals once exhausted)
  const nextIdx = save.missions.next % MISSION_POOL.length;
  save.missions.next++;
  save.missions.active[i] = { idx:nextIdx, progress:0, base:0 };
  return def.reward;
}

// ---------- daily quests ----------
export function ensureDaily(save){
  const key = todayKey();
  const d = save.daily;
  if (d.date === key) return false;
  const seed = Number(key.replace(/-/g, ''));
  const rng = mulberry(seed);
  const pool = DAILY_POOL.map((q, i) => i);
  const picks = [];
  while (picks.length < 3){
    const k = Math.floor(rng() * pool.length);
    picks.push(pool.splice(k, 1)[0]);
  }
  d.date = key;
  d.quests = picks.map(idx => ({ idx, progress:0, done:false, claimed:false }));
  return true;
}

export function dailyView(save, stats = null){
  return save.daily.quests.map(q => {
    const def = DAILY_POOL[q.idx];
    let prog = q.progress;
    if (stats && !q.done){
      const v = runValue(def.type, stats, def);
      prog = def.cumulative || def.type === 'runs' ? q.progress + v : Math.max(q.progress, v);
    }
    return { ...def, progress:Math.min(def.goal, prog), done:q.done || prog >= def.goal, claimed:q.claimed };
  });
}

export function checkDaily(save, stats){
  const done = [];
  save.daily.quests.forEach(q => {
    if (q.done) return;
    const def = DAILY_POOL[q.idx];
    if (def.type === 'runs') return;          // counted when the run ends
    const v = runValue(def.type, stats, def);
    const prog = def.cumulative ? q.progress + v : v;
    if (prog >= def.goal){ q.done = true; q.progress = def.goal; done.push(def); }
  });
  return done;
}

export function commitDaily(save, stats){
  const done = [];
  for (const q of save.daily.quests){
    if (q.done) continue;
    const def = DAILY_POOL[q.idx];
    const v = runValue(def.type, stats, def);
    q.progress = def.cumulative || def.type === 'runs' ? q.progress + v : Math.max(q.progress, v);
    if (q.progress >= def.goal){ q.progress = def.goal; q.done = true; done.push(def); }
  }
  return done;
}

export function claimDaily(save, i){
  const q = save.daily.quests[i];
  if (!q || !q.done || q.claimed) return 0;
  q.claimed = true;
  return DAILY_POOL[q.idx].reward;
}

/** Login reward: returns { day, amount } if a reward is due today, else null. */
export function loginReward(save){
  const key = todayKey();
  const d = save.daily;
  if (d.lastLogin === key) return null;
  const y = new Date(); y.setDate(y.getDate() - 1);
  const streak = d.lastLogin === todayKey(y) ? d.loginStreak + 1 : 1;
  return { day:streak, amount:DAILY_REWARD[(streak - 1) % DAILY_REWARD.length] };
}

export function takeLoginReward(save){
  const r = loginReward(save);
  if (!r) return 0;
  save.daily.lastLogin = todayKey();
  save.daily.loginStreak = r.day;
  save.coins += r.amount;
  return r.amount;
}

// ---------- XP & levels ----------
export function runXp(stats){
  return Math.round(stats.distance / 4 + stats.correct * 12 + stats.fast * 5 + stats.coins * 0.5);
}

/** Add XP; returns list of levels gained with what each one unlocked. */
export function addXp(save, xp){
  save.xp += xp;
  const gained = [];
  while (save.xp >= xpForLevel(save.level)){
    save.xp -= xpForLevel(save.level);
    save.level++;
    const dogs = DOGS.filter(d => d.unlock === save.level);
    const outfits = OUTFITS.filter(o => o.level === save.level);
    const bonus = 50 + save.level * 25;
    save.coins += bonus;
    gained.push({ level:save.level, dogs, outfits, bonus });
  }
  return gained;
}
