// ---------- DOM: HUD bits, toasts, and the menu panels ----------

import { DOGS, OUTFITS, POWERUPS, UPGRADE_COST, BOOSTS, RIVALS, TABLE_CHOICES, xpForLevel } from './data.js';
import { missionView, dailyView, loginReward } from './progress.js';

export const $ = sel => document.querySelector(sel);
export const $$ = sel => [...document.querySelectorAll(sel)];
export const fmt = n => Math.floor(n).toLocaleString('en-GB');

export function show(el, on = true){ (typeof el === 'string' ? $(el) : el).classList.toggle('hidden', !on); }

export function toast(title, sub = '', cls = ''){
  const t = document.createElement('div');
  t.className = `toast ${cls}`;
  t.innerHTML = `${title}${sub ? `<small>${sub}</small>` : ''}`;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 3300);
}

export function popup(text, cls = '', small = false, offsetY = 0){
  const p = document.createElement('div');
  p.className = `popup ${cls} ${small ? 'small' : ''}`;
  p.textContent = text;
  if (offsetY) p.style.top = `calc(42% + ${offsetY}px)`;
  $('#popups').appendChild(p);
  setTimeout(() => p.remove(), 1150);
}

/** Refresh every [data-bind] element from the save. */
export function bindSave(save){
  const set = (k, v) => $$(`[data-bind="${k}"]`).forEach(e => { e.textContent = v; });
  set('coins', fmt(save.coins));
  set('level', save.level);
  set('best', fmt(save.best));
  $$('[data-bind="xpfill"]').forEach(e => { e.style.width = `${Math.min(100, 100 * save.xp / xpForLevel(save.level))}%`; });
  set('tablesLabel', tablesLabel(save.tables));
  const claimable = missionView(save).some(m => m.done) || dailyView(save).some(q => q.done && !q.claimed) || !!loginReward(save);
  $$('[data-bind="missionBadge"]').forEach(e => e.classList.toggle('hidden', !claimable));
}

export function tablesLabel(t){
  if (!t.length) return 'none';
  if (t.length === 12) return 'All tables';
  return [...t].sort((a, b) => a - b).join(', ');
}

// ---------- panel host ----------
let onPanelClose = null;
export function openPanel(title, render, { center = false, onClose = null } = {}){
  $('#panelTitle').textContent = title;
  $('#panel').classList.toggle('center', center);
  show('#panel');
  onPanelClose = onClose;
  const body = $('#panelBody');
  const redraw = () => { body.innerHTML = ''; render(body, redraw); };
  redraw();
  body.scrollTop = 0;
  return redraw;
}
export function closePanel(){
  show('#panel', false);
  const cb = onPanelClose; onPanelClose = null;
  cb?.();
}
export function panelOpen(){ return !$('#panel').classList.contains('hidden'); }

function el(html){
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ---------- Dogs ----------
const DOG_EMOJI = { milo:'🐶', pug:'🐶', corgi:'🦊', dalmatian:'🐕', shiba:'🐕', malamute:'🐺', golden:'🦮' };
export function renderDogs(app){
  return (body, redraw) => {
    body.appendChild(el(`<p>Level up to unlock new dogs. Pick your runner!</p>`));
    const grid = el(`<div class="grid"></div>`);
    for (const d of DOGS){
      const locked = app.save.level < d.unlock;
      const sel = app.save.dog === d.id;
      const c = el(`<div class="card ${sel ? 'sel' : ''} ${locked ? 'locked' : ''}">
        <div class="swatch" style="background:${hex(d.body)}"></div>
        <div class="name">${locked ? '🔒 ' : ''}${d.name}</div>
        <div class="sub">${d.breed}</div>
        <div class="sub">${locked ? `Unlocks at level ${d.unlock}` : d.blurb}</div>
      </div>`);
      c.onmouseenter = () => app.previewDog(d.id);
      c.onclick = () => {
        app.previewDog(d.id);
        if (locked){ app.sfx('bark'); toast(`${d.name} unlocks at level ${d.unlock}`, 'Keep running to earn XP!'); return; }
        app.save.dog = d.id; app.commit(); app.sfx('bark'); redraw();
      };
      grid.appendChild(c);
    }
    body.appendChild(grid);
  };
}

// ---------- Wardrobe ----------
const SLOT_NAMES = { hat:'🎩 Hats', eyes:'🕶️ Glasses', neck:'🎀 Neck', back:'🦸 Back' };
const OUTFIT_EMOJI = { cap:'🧢', beanie:'🧶', party:'🥳', cowboy:'🤠', tophat:'🎩', crown:'👑', shades:'🕶️', nerd:'🤓',
  star:'⭐', bandana:'🧣', bowtie:'🎀', scarf:'🧣', medal:'🏅', cape:'🦸', backpack:'🎒', jetpack:'🚀' };
let wardrobeSlot = 'hat';
export function renderWardrobe(app){
  return (body, redraw) => {
    const tabs = el(`<div class="tabs"></div>`);
    for (const [slot, name] of Object.entries(SLOT_NAMES)){
      const t = el(`<button class="tab ${slot === wardrobeSlot ? 'on' : ''}">${name}</button>`);
      t.onclick = () => { wardrobeSlot = slot; app.sfx('click'); redraw(); };
      tabs.appendChild(t);
    }
    body.appendChild(tabs);
    const grid = el(`<div class="grid"></div>`);
    const none = el(`<div class="card ${!app.save.wear[wardrobeSlot] ? 'sel' : ''}"><div class="big">🚫</div><div class="name">Nothing</div></div>`);
    none.onclick = () => { app.save.wear[wardrobeSlot] = null; app.commit(); app.refreshDog(); redraw(); };
    grid.appendChild(none);
    for (const o of OUTFITS.filter(o => o.slot === wardrobeSlot)){
      const owned = app.save.owned.includes(o.id);
      const worn = app.save.wear[o.slot] === o.id;
      const lvlLock = o.level && app.save.level < o.level;
      const c = el(`<div class="card ${worn ? 'sel' : ''} ${lvlLock ? 'locked' : ''}">
        <div class="big">${OUTFIT_EMOJI[o.id] || '✨'}</div>
        <div class="name">${o.name}</div>
        ${owned ? `<span class="price owned">${worn ? 'Wearing' : 'Wear'}</span>`
          : lvlLock ? `<span class="sub">🔒 Level ${o.level}</span>` : `<span class="price">🪙 ${fmt(o.price)}</span>`}
      </div>`);
      c.onmouseenter = () => app.tryOn(o.slot, o.id);
      c.onclick = () => {
        app.tryOn(o.slot, o.id);
        if (lvlLock){ toast(`Reach level ${o.level} to unlock`); return; }
        if (!owned){
          if (app.save.coins < o.price){ app.sfx('wrong'); toast('Not enough coins', `You need ${fmt(o.price - app.save.coins)} more`); return; }
          app.save.coins -= o.price; app.save.owned.push(o.id); app.sfx('buy');
          toast(`${o.name} bought!`, '', 'gold');
        }
        app.save.wear[o.slot] = worn && owned ? null : o.id;
        app.commit(); app.refreshDog(); redraw();
      };
      grid.appendChild(c);
    }
    body.appendChild(grid);
  };
}

// ---------- Upgrades & boosts ----------
export function renderUpgrades(app){
  return (body, redraw) => {
    body.appendChild(el(`<h3>Power-up upgrades</h3>`));
    for (const [k, p] of Object.entries(POWERUPS)){
      const lvl = app.save.upgrades[k] || 0;
      const cost = UPGRADE_COST[lvl];
      const dur = p.base + p.perLevel * lvl;
      const row = el(`<div class="upg">
        <div class="ui">${p.icon}</div>
        <div class="ut"><b>${p.name}</b><small>${p.desc} ${k === 'shield' ? 'Lasts' : 'Lasts'} ${dur}s.</small>
          <div class="pips">${[0,1,2,3,4].map(i => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div></div>
        ${cost ? `<button class="buy" ${app.save.coins < cost ? 'disabled' : ''}>🪙 ${fmt(cost)}</button>` : `<button class="buy max" disabled>MAX</button>`}
      </div>`);
      const b = row.querySelector('.buy');
      if (cost) b.onclick = () => {
        if (app.save.coins < cost) return;
        app.save.coins -= cost; app.save.upgrades[k] = lvl + 1; app.commit(); app.sfx('buy');
        toast(`${p.name} upgraded!`, `Now lasts ${dur + p.perLevel}s`, 'gold'); redraw();
      };
      body.appendChild(row);
    }
    body.appendChild(el(`<h3>Boosts <small style="font-weight:600;opacity:.6">— tap on the home screen to use one</small></h3>`));
    for (const b of BOOSTS){
      const n = app.save.boosts[b.id] || 0;
      const row = el(`<div class="upg">
        <div class="ui">${b.icon}</div>
        <div class="ut"><b>${b.name}</b> <small>${b.desc}</small><small>You have <b>${n}</b></small></div>
        <button class="buy" ${app.save.coins < b.price ? 'disabled' : ''}>🪙 ${fmt(b.price)}</button>
      </div>`);
      row.querySelector('.buy').onclick = () => {
        if (app.save.coins < b.price) return;
        app.save.coins -= b.price; app.save.boosts[b.id] = n + 1; app.commit(); app.sfx('buy'); redraw(); app.refreshBoosts();
      };
      body.appendChild(row);
    }
  };
}

// ---------- Missions & daily ----------
const MISSION_ICON = { run:'🏃', coins:'🪙', correct:'✅', jumps:'⬆️', slides:'⬇️', streak:'🔥', powerups:'⚡',
  fast:'⏱️', table:'✖️', totalCorrect:'🧠', runs:'🔁' };
export function renderMissions(app){
  return (body, redraw) => {
    const lr = loginReward(app.save);
    if (lr){
      const r = el(`<div class="mission done"><div class="mi">🎁</div><div class="mt">Daily reward — day ${lr.day}</div>
        <div class="mr">🪙 ${lr.amount}</div><button>Claim</button></div>`);
      r.querySelector('button').onclick = () => { app.claimLogin(); redraw(); };
      body.appendChild(r);
    }
    body.appendChild(el(`<h3>🎯 Missions <small style="font-weight:600;opacity:.6">(${app.save.missions.done} completed)</small></h3>`));
    missionView(app.save).forEach((m, i) => {
      const r = el(`<div class="mission ${m.done ? 'done' : ''}">
        <div class="mi">${MISSION_ICON[m.type] || '🎯'}</div>
        <div class="mt">${m.text}<div class="mp"><i style="width:${100 * m.progress / m.goal}%"></i></div></div>
        <div class="mr">🪙 ${m.reward}</div>${m.done ? '<button>Claim</button>' : ''}
      </div>`);
      if (m.done) r.querySelector('button').onclick = () => { app.claimMission(i); redraw(); };
      body.appendChild(r);
    });
    body.appendChild(el(`<h3>📅 Today's quests</h3>`));
    dailyView(app.save).forEach((q, i) => {
      const r = el(`<div class="mission ${q.done ? 'done' : ''}">
        <div class="mi">${q.claimed ? '✅' : MISSION_ICON[q.type] || '📅'}</div>
        <div class="mt">${q.text}<div class="mp"><i style="width:${100 * q.progress / q.goal}%"></i></div></div>
        <div class="mr">🪙 ${q.reward}</div>${q.done && !q.claimed ? '<button>Claim</button>' : ''}
      </div>`);
      if (q.done && !q.claimed) r.querySelector('button').onclick = () => { app.claimDaily(i); redraw(); };
      body.appendChild(r);
    });
    body.appendChild(el(`<p style="opacity:.6;font-size:14px">New quests every day. Come back tomorrow for a bigger login reward!</p>`));
  };
}

// ---------- Tables ----------
export function renderTables(app){
  return (body, redraw) => {
    body.appendChild(el(`<p>Choose the times tables to practise. The questions lean towards the ones you find tricky.</p>`));
    const grid = el(`<div class="table-grid"></div>`);
    for (const t of TABLE_CHOICES){
      const on = app.save.tables.includes(t);
      const skill = app.engine.skill[t] ?? 0.5;
      const seen = app.engine.seen[t] ?? 0;
      const b = el(`<button class="tbl ${on ? 'on' : ''}"><div class="sk"><i style="width:${seen ? skill * 100 : 0}%"></i></div>
        ×${t}<small>${seen ? `${Math.round(skill * 100)}%` : 'new'}</small></button>`);
      b.onclick = () => {
        app.sfx('click');
        if (on) app.save.tables = app.save.tables.filter(x => x !== t);
        else app.save.tables.push(t);
        app.commit(); redraw();
      };
      grid.appendChild(b);
    }
    body.appendChild(grid);
    const row = el(`<div class="row-btns"></div>`);
    const presets = [['Easy (2, 5, 10)', [2, 5, 10]], ['1 – 6', [1, 2, 3, 4, 5, 6]], ['7 – 12', [7, 8, 9, 10, 11, 12]], ['All', TABLE_CHOICES]];
    for (const [name, t] of presets){
      const b = el(`<button class="tab">${name}</button>`);
      b.onclick = () => { app.save.tables = [...t]; app.commit(); app.sfx('click'); redraw(); };
      row.appendChild(b);
    }
    body.appendChild(row);
    if (!app.save.tables.length) body.appendChild(el(`<p style="color:#b3001b;font-weight:800;margin-top:8px">Pick at least one table!</p>`));
    const weak = app.engine.weakest(TABLE_CHOICES);
    if (weak.length) body.appendChild(el(`<p style="margin-top:10px">💡 Tables to work on: <b>${weak.map(w => '×' + w).join(', ')}</b></p>`));
  };
}

// ---------- Rivals ----------
export function renderRivals(app){
  return body => {
    body.appendChild(el(`<p>Beat their scores in a run — they'll show up running beside you as you catch them!</p>`));
    const rows = RIVALS.map(r => ({ ...r, you:false })).concat([{ name:`You (${DOGS.find(d => d.id === app.save.dog).name})`, score:app.save.best, you:true }])
      .sort((a, b) => b.score - a.score);
    rows.forEach((r, i) => {
      const beaten = !r.you && app.save.rivalsBeaten.includes(r.name);
      body.appendChild(el(`<div class="rival ${r.you ? 'you' : ''} ${beaten ? 'beaten' : ''}">
        <div class="rk">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</div>
        <div class="rn">${r.name}${r.you ? '' : `<small>“${beaten ? r.lose : r.taunt}”</small>`}</div>
        <div class="rs">${beaten ? '✅ ' : ''}${fmt(r.score)}</div>
      </div>`));
    });
  };
}

// ---------- Settings ----------
export function renderSettings(app){
  return (body, redraw) => {
    const s = app.save.settings;
    const rows = [['sound', '🔊 Sound effects'], ['music', '🎵 Music'], ['voice', '🗣️ Read questions aloud'], ['shake', '📳 Screen shake']];
    for (const [k, label] of rows){
      const r = el(`<div class="setting"><span>${label}</span><button class="toggle ${s[k] ? 'on' : ''}"></button></div>`);
      r.querySelector('button').onclick = () => { s[k] = !s[k]; app.applySettings(); app.commit(); redraw(); };
      body.appendChild(r);
    }
    const q = el(`<div class="setting"><span>✨ Graphics</span><div class="row-btns">
      <button class="tab ${s.quality === 'high' ? 'on' : ''}" data-q="high">High</button>
      <button class="tab ${s.quality === 'low' ? 'on' : ''}" data-q="low">Fast</button></div></div>`);
    q.querySelectorAll('button').forEach(b => b.onclick = () => { s.quality = b.dataset.q; app.applySettings(); app.commit(); redraw(); });
    body.appendChild(q);
    const acc = app.save.totals.asked ? Math.round(100 * app.save.totals.correct / app.save.totals.asked) : 0;
    body.appendChild(el(`<p style="margin-top:12px">📊 ${fmt(app.save.runs)} runs · ${fmt(app.save.totals.distance)} m · ${fmt(app.save.totals.correct)} right answers (${acc}%)</p>`));
    const reset = el(`<button class="big-btn">🗑️ Reset progress</button>`);
    let armed = false;
    reset.onclick = () => {
      if (!armed){ armed = true; reset.textContent = 'Tap again to wipe everything'; return; }
      app.resetAll();
    };
    body.appendChild(reset);
  };
}

// ---------- Help ----------
export function renderHelp(){
  return body => {
    body.innerHTML = `
      <p><b>Milo the clever dog</b> is racing through town! Dodge the traffic and run through the gate with the <b>right answer</b>. A wrong answer is a crash!</p>
      <div class="help-row"><div class="hk">⬅️➡️</div><div><kbd>←</kbd> <kbd>→</kbd> or <kbd>A</kbd> <kbd>D</kbd> · swipe left/right — change lane</div></div>
      <div class="help-row"><div class="hk">⬆️</div><div><kbd>↑</kbd> <kbd>W</kbd> <kbd>Space</kbd> · swipe up — jump barriers, cones and even cars</div></div>
      <div class="help-row"><div class="hk">⬇️</div><div><kbd>↓</kbd> <kbd>S</kbd> · swipe down — slide under the high bars</div></div>
      <div class="help-row"><div class="hk">⏸</div><div><kbd>P</kbd> / <kbd>Esc</kbd> — pause</div></div>
      <h3>Power-ups</h3>
      ${Object.values(POWERUPS).map(p => `<div class="help-row"><div class="hk">${p.icon}</div><div><b>${p.name}</b> — ${p.desc}</div></div>`).join('')}
      <h3>Scoring</h3>
      <p>Every 3 right answers in a row raises your <b>multiplier</b> (up to ×5). Answer within 2.5 seconds for a speed bonus. Earn coins to buy outfits and upgrades, and XP to unlock new dogs.</p>
      <p>Crashed? Answer a bonus question to keep running (once per run), or use a 💖 Second Chance.</p>`;
  };
}

// ---------- boost toggles on the home screen ----------
export function renderBoostRow(app, chosen){
  const row = $('#boostRow');
  row.innerHTML = '';
  for (const b of BOOSTS.filter(b => b.id !== 'revive')){
    const n = app.save.boosts[b.id] || 0;
    const btn = el(`<button class="boost ${chosen[b.id] ? 'on' : ''}">${b.icon} ${b.name} <span class="n">${n}</span></button>`);
    btn.onclick = () => {
      if (!n){ app.open('upgrades'); return; }
      chosen[b.id] = !chosen[b.id]; app.sfx('click'); renderBoostRow(app, chosen);
    };
    row.appendChild(btn);
  }
}

function hex(n){ return '#' + n.toString(16).padStart(6, '0'); }
