// ---------- HUD and panels ----------
//
// The DOM half of the game. Text belongs here rather than on the canvas: it
// stays crisp at any zoom, it reflows on a narrow phone for free, and it can be
// read by a screen reader. The canvas gets the world; the DOM gets the numbers.
//
// sync() runs every frame but writes nothing it does not have to — a HUD that
// re-renders sixty times a second will happily eat more frame time than the
// terrain does.

import { G, MAX_HP, aliveOf, selectWeapon, needsTarget } from './game.js';
import { WEAPONS, WEAPON_ORDER } from './weapons.js';
import { milbilStill } from './art.js';
import { sfx, setMuted, isMuted, unlock } from './audio.js';

const $ = (id) => document.getElementById(id);
const el = {};
let cache = {};
let bannerShown = null;

export function initUI(hooks) {
  for (const id of [
    'boot', 'bootBar', 'bootMsg', 'hud', 'menu', 'help', 'pause', 'over', 'weapons',
    'team0', 'team1', 'roundNo', 'timerNo', 'timerChip', 'windFill', 'banner', 'prompt',
    'currentWeapon', 'btnFire', 'fireFill', 'wgrid', 'overTitle', 'overLine', 'overStats',
    'overArt', 'btnLeft', 'btnRight', 'btnJump', 'btnSound',
  ]) el[id] = $(id);

  el.teamCards = [el.team0, el.team1];

  // menu segmented controls write straight into G.opts
  for (const seg of document.querySelectorAll('.seg')) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      for (const o of seg.children) o.classList.toggle('on', o === b);
      const key = seg.dataset.opt;
      let v = b.dataset.v;
      if (key === 'teamSize') v = +v;
      if (key === 'cpu') v = v === '1';
      G.opts[key] = v;
      document.getElementById('optSkill').style.display = G.opts.cpu ? '' : 'none';
      sfx.select();
    });
  }
  G.opts.aiSkill = G.opts.aiSkill || 'normal';

  // iOS will not start an AudioContext outside a user gesture, and the first
  // gesture of a session is usually this button rather than the canvas.
  for (const b of document.querySelectorAll('button')) b.addEventListener('pointerdown', unlock);

  $('btnPlay').onclick = () => hooks.onPlay();
  $('btnMenuHelp').onclick = () => show('help');
  $('helpClose').onclick = () => hide('help');
  $('btnHelp').onclick = () => { show('help'); hooks.onPauseState?.(true); };
  $('weaponsClose').onclick = () => hide('weapons');
  $('btnWeapons').onclick = () => toggleWeapons();
  $('btnPause').onclick = () => { show('pause'); hooks.onPauseState?.(true); };
  $('pauseResume').onclick = () => { hide('pause'); hooks.onPauseState?.(false); };
  $('pauseQuit').onclick = () => { hide('pause'); hooks.onQuit(); };
  $('overAgain').onclick = () => hooks.onPlay();
  $('overMenu').onclick = () => hooks.onQuit();
  $('btnSound').onclick = () => {
    setMuted(!isMuted());
    el.btnSound.textContent = isMuted() ? '🔇' : '🔊';
    try { localStorage.setItem('milbil-worms.muted', isMuted() ? '1' : '0'); } catch {}
  };
  try {
    if (localStorage.getItem('milbil-worms.muted') === '1') {
      setMuted(true);
      el.btnSound.textContent = '🔇';
    }
  } catch {}

  // Closing a panel by tapping the backdrop, but never by tapping the panel.
  for (const name of ['help', 'weapons', 'pause']) {
    el[name].addEventListener('pointerdown', (e) => {
      if (e.target === el[name]) {
        hide(name);
        if (name !== 'weapons') hooks.onPauseState?.(false);
      }
    });
  }

  buildWeaponGrid();
}

export function show(name) { el[name].classList.remove('hidden'); }
export function hide(name) { el[name].classList.add('hidden'); }
export function isOpen(name) { return !el[name].classList.contains('hidden'); }

export function toggleWeapons() {
  if (isOpen('weapons')) hide('weapons');
  else { buildWeaponGrid(); show('weapons'); }
}

export function boot(progress, msg) {
  el.bootBar.style.width = `${Math.round(progress * 100)}%`;
  if (msg) el.bootMsg.textContent = msg;
}

export function bootDone() {
  el.boot.classList.add('gone');
  setTimeout(() => el.boot.classList.add('hidden'), 500);
}

// ---------------------------------------------------------------- weapons

export function buildWeaponGrid() {
  const team = G.activeTeam;
  el.wgrid.innerHTML = '';
  for (const key of WEAPON_ORDER) {
    const w = WEAPONS[key];
    const ammo = team ? team.ammo[key] : w.ammo;
    const out = !(ammo === Infinity || ammo > 0);
    const card = document.createElement('button');
    card.className = `wcard${key === G.weapon ? ' on' : ''}${out ? ' out' : ''}`;
    card.innerHTML =
      `<span class="wi">${w.icon}</span>` +
      `<span><span class="wn">${w.name}</span>` +
      `<span class="wb">${w.blurb}</span>` +
      `<span class="wa">${ammo === Infinity ? '∞' : `×${ammo}`}${w.damage ? ` · ${w.damage} dmg` : ''}</span></span>`;
    card.onclick = () => {
      if (selectWeapon(key)) {
        hide('weapons');
        syncWeapon(true);
      }
    };
    el.wgrid.appendChild(card);
  }
}

function syncWeapon(force = false) {
  const w = WEAPONS[G.weapon];
  const ammo = G.activeTeam ? G.activeTeam.ammo[G.weapon] : w.ammo;
  const key = `${G.weapon}:${ammo}`;
  if (!force && cache.weapon === key) return;
  cache.weapon = key;
  el.currentWeapon.querySelector('.cw-ico').textContent = w.icon;
  el.currentWeapon.querySelector('.cw-txt b').textContent = w.name;
  el.currentWeapon.querySelector('.cw-txt i').textContent =
    ammo === Infinity ? 'unlimited' : `${ammo} left`;
  if (isOpen('weapons')) buildWeaponGrid();
}

// ---------------------------------------------------------------- per frame

export function sync() {
  const size = G.opts.teamSize;

  for (let t = 0; t < 2; t++) {
    const squad = aliveOf(t);
    const hp = squad.reduce((s, m) => s + m.hp, 0);
    const frac = hp / (MAX_HP * size);
    const card = el.teamCards[t];
    if (cache[`hp${t}`] !== hp) {
      cache[`hp${t}`] = hp;
      card.querySelector('.team-bar i').style.width = `${Math.max(0, frac * 100)}%`;
      const pips = card.querySelector('.team-pips');
      const alive = squad.length;
      if (pips.children.length !== size) {
        pips.innerHTML = '';
        for (let i = 0; i < size; i++) pips.appendChild(document.createElement('i'));
      }
      [...pips.children].forEach((p, i) => p.classList.toggle('on', i < alive));
    }
    const up = G.activeTeam?.id === t && G.phase !== 'over';
    if (cache[`up${t}`] !== up) {
      cache[`up${t}`] = up;
      card.style.opacity = up ? '1' : '.62';
      if (up) {
        card.classList.remove('up');
        void card.offsetWidth;
        card.classList.add('up');
      }
    }
  }

  if (cache.round !== G.round) {
    cache.round = G.round;
    el.roundNo.textContent = G.round;
  }

  const t = Math.max(0, Math.ceil(G.timer));
  if (cache.timer !== t) {
    cache.timer = t;
    el.timerNo.textContent = t;
    el.timerChip.classList.toggle('low', t <= 5 && G.phase === 'aim');
  }

  if (cache.wind !== G.wind) {
    cache.wind = G.wind;
    const pct = Math.abs(G.wind) * 50;
    el.windFill.style.left = G.wind >= 0 ? '50%' : `${50 - pct}%`;
    el.windFill.style.width = `${pct}%`;
    el.windFill.style.background = Math.abs(G.wind) > 0.6 ? 'var(--danger)' : 'var(--gold)';
    el.windFill.style.boxShadow = `0 0 9px ${Math.abs(G.wind) > 0.6 ? 'var(--danger)' : 'var(--gold)'}`;
  }

  syncWeapon();

  // fire button: charge level, and whether it can be used at all
  const canFire = G.phase === 'aim' && G.activeTeam && !G.activeTeam.cpu;
  el.prompt.classList.toggle('urgent', G.retreat > 0);
  el.btnFire.classList.toggle('off', !canFire);
  el.fireFill.style.height = `${G.power * 100}%`;
  el.btnFire.classList.toggle('armed', G.charging);

  // banner
  if (G.banner !== bannerShown) {
    bannerShown = G.banner;
    if (G.banner) {
      el.banner.innerHTML = `${G.banner.title}${G.banner.sub ? `<small>${G.banner.sub}</small>` : ''}`;
      el.banner.style.color = G.banner.color;
      el.banner.style.textShadow = `0 0 18px ${G.banner.color}, 0 0 60px ${G.banner.color}55`;
      el.banner.classList.add('show');
    } else {
      el.banner.classList.remove('show');
    }
  }

  const p = promptText();
  if (cache.prompt !== p) {
    cache.prompt = p;
    el.prompt.textContent = p;
    el.prompt.style.opacity = p ? '1' : '0';
  }
}

function promptText() {
  if (G.phase === 'over' || G.phase === 'menu') return '';
  if (G.retreat > 0) {
    return G.activeTeam?.cpu ? 'They are running for it…' : `RUN! ${G.retreat.toFixed(1)}s`;
  }
  if (G.activeTeam?.cpu && G.phase === 'aim') return 'The other side is thinking…';
  if (G.phase === 'fire') return '';
  if (G.phase === 'intro') return '';
  if (needsTarget() && !G.target) {
    return WEAPONS[G.weapon].kind === 'strike'
      ? 'Tap where the strike should land'
      : 'Tap a spot on the map first';
  }
  if (G.phase === 'aim') return 'Drag to aim, let go to fire';
  return '';
}

// ---------------------------------------------------------------- game over

export function showGameOver() {
  const w = G.winner;
  el.overTitle.className = w >= 0 ? `t${w}` : '';
  el.overTitle.textContent = w < 0 ? 'EVERYBODY LOST' : `${G.teams[w].name} WINS`;

  if (w >= 0) {
    const art = milbilStill(G.teams[w].hue, G.teams[w].accent, 150);
    const c = el.overArt.getContext('2d');
    c.clearRect(0, 0, 150, 150);
    c.drawImage(art, 0, 0);
    el.overArt.classList.remove('hidden');
    const left = aliveOf(w);
    el.overLine.textContent = left.length === 1
      ? `${left[0].name} is the last Milbil standing.`
      : `${left.length} Milbils still standing.`;
  } else {
    el.overArt.classList.add('hidden');
    el.overLine.textContent = 'The last two went down together.';
  }

  const rows = [
    ['Rounds played', G.round],
    ['Damage — GLOW', Math.round(G.stats[0].damage)],
    ['Damage — FLUX', Math.round(G.stats[1].damage)],
    ['Biggest single hit', `${Math.max(G.stats[0].best, G.stats[1].best)}`],
    ['Milbils lost', `${G.opts.teamSize - aliveOf(0).length} · ${G.opts.teamSize - aliveOf(1).length}`],
  ];
  el.overStats.innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  show('over');
}

export function resetCache() {
  cache = {};
  bannerShown = undefined;
}
