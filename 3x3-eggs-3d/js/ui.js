// ---------- Everything that is not the 3D ----------
//
// One class owns the DOM: the HUD, the overlays, and the number pad. The game
// loop never touches an element directly, it calls a method here, which keeps
// the loop readable and means the whole interface can be rearranged without
// going anywhere near the 3D code.
//
// The number pad is the piece that matters most. It is the same pad whether you
// are hatching an egg or buying boots, it accepts the physical keyboard as well
// as taps, and a wrong answer never takes anything away — it asks again, and
// after two misses it shows you the answer so you can type it and move on.

import { TABLES } from './mathq.js';
import { PROFILES, drawPortrait } from './profiles.js';
import { SPECIES, rarityById, critterSwatch, speciesById } from './animals.js';
import { BIOMES } from './world.js';
import { UPGRADES, upgradeCost } from './state.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(state, hooks){
    this.s = state;
    this.h = hooks;
    this.el = {
      hud: $('hud'), coins: $('coins'), eggs: $('eggs'), dex: $('dex'), place: $('placeChip'),
      noiseBar: $('noiseBar'), stamBar: $('stamBar'),
      banner: $('banner'), prompt: $('prompt'), toasts: $('toasts'), pops: $('pops'),
      flash: $('flash'), vignette: $('vignette'),
      start: $('start'), profileGrid: $('profileGrid'), biomeRow: $('biomeRow'), tableGrid: $('tableGrid'),
      hatch: $('hatch'), hatchEgg: $('hatchEgg'), hatchSub: $('hatchSub'),
      qText: $('qText'), qTyped: $('qTyped'), qEntry: $('qEntry'), qNote: $('qNote'), pad: $('pad'),
      reveal: $('reveal'), revealArt: $('revealArt'), revealName: $('revealName'),
      revealNote: $('revealNote'), revealRarity: $('revealRarity'), revealCard: $('reveal').querySelector('.card'),
      dexScreen: $('dexScreen'), dexGrid: $('dexGrid'), dexSub: $('dexSub'),
      shop: $('shopScreen'), upgradeList: $('upgradeList'), biomeList: $('biomeList'), shopCoins: $('shopCoins'),
      help: $('help'), paused: $('paused'), pauseStats: $('pauseStats'),
      btnSound: $('btnSound'),
      touch: $('touch'),
    };

    this.buildPad();
    this.wire();
  }

  // ------------------------------------------------------------------ wiring
  wire(){
    const h = this.h;
    $('btnPlay').onclick = () => { this.click(); h.onPlay(); };
    $('btnDex').onclick = () => { this.click(); this.showDex(); };
    $('btnShop').onclick = () => { this.click(); this.showShop(); };
    $('btnHelp').onclick = () => { this.click(); this.el.help.classList.remove('hidden'); };
    $('helpClose').onclick = () => { this.click(); this.el.help.classList.add('hidden'); };
    $('dexClose').onclick = () => { this.click(); this.el.dexScreen.classList.add('hidden'); };
    $('shopClose').onclick = () => { this.click(); this.el.shop.classList.add('hidden'); };
    $('btnResume').onclick = () => { this.click(); h.onResume(); };
    $('btnQuit').onclick = () => { this.click(); h.onQuit(); };
    $('btnRevealOk').onclick = () => { this.click(); this.closeReveal?.(); };
    $('btnPause').onclick = () => { this.click(); h.onPause(); };
    this.el.btnSound.onclick = () => {
      this.s.sound = !this.s.sound;
      this.s.save();
      this.el.btnSound.textContent = this.s.sound ? '🔊' : '🔇';
      h.onSound(this.s.sound);
    };
    this.el.btnSound.textContent = this.s.sound ? '🔊' : '🔇';
  }

  click(){ this.h.click?.(); }

  // -------------------------------------------------------------------- hud
  showHud(on){ this.el.hud.classList.toggle('hidden', !on); }

  setHud({ coins, carried, carry, dex, place }){
    if (coins !== undefined) this.el.coins.textContent = Math.floor(coins);
    if (carried !== undefined) this.el.eggs.textContent = `${carried}/${carry}`;
    if (dex !== undefined) this.el.dex.textContent = dex;
    if (place !== undefined) this.el.place.textContent = place;
  }

  meters(noise, stam){
    this.el.noiseBar.style.width = `${Math.min(100, noise * 100)}%`;
    this.el.stamBar.style.width = `${Math.min(100, stam * 100)}%`;
  }

  prompt(text){
    const e = this.el.prompt;
    if (!text){ e.classList.add('hidden'); return; }
    if (e.dataset.t !== text){ e.innerHTML = text; e.dataset.t = text; }
    e.classList.remove('hidden');
  }

  banner(text, kind = ''){
    const e = this.el.banner;
    if (!text){ e.classList.add('hidden'); return; }
    e.textContent = text;
    e.className = `banner ${kind}`;
  }

  toast(msg, kind = ''){
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.innerHTML = msg;
    this.el.toasts.appendChild(t);
    setTimeout(() => t.remove(), 2900);
  }

  /** A number that floats up from a point on screen. */
  pop(text, kind = '', x = window.innerWidth / 2, y = window.innerHeight * 0.55){
    const p = document.createElement('div');
    p.className = `pop ${kind}`;
    p.textContent = text;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    this.el.pops.appendChild(p);
    setTimeout(() => p.remove(), 1000);
  }

  flash(kind){
    const f = this.el.flash;
    f.className = kind;
    f.style.opacity = '1';
    setTimeout(() => { f.style.opacity = '0'; }, 60);
  }

  vignette(v){ this.el.vignette.style.opacity = String(Math.min(1, v)); }

  // ------------------------------------------------------------------ start
  showStart(){
    this.renderProfiles();
    this.renderBiomes();
    this.renderTables();
    $('startCoins').textContent = Math.floor(this.s.coins);
    $('startDex').textContent = `${this.s.collected}/${SPECIES.length}`;
    $('startIncome').textContent = this.s.income;
    this.el.start.classList.remove('hidden');
  }

  hideStart(){ this.el.start.classList.add('hidden'); }

  renderProfiles(){
    const g = this.el.profileGrid;
    g.innerHTML = '';
    for (const p of PROFILES){
      const unlocked = this.s.profileUnlocked(p);
      const card = document.createElement('div');
      card.className = `pcard${this.s.profile === p.id ? ' on' : ''}${unlocked ? '' : ' locked'}`;

      const cv = document.createElement('canvas');
      cv.width = 120; cv.height = 110;
      drawPortrait(cv.getContext('2d'), p, 120, 110);
      card.appendChild(cv);

      const name = document.createElement('b');
      name.textContent = p.name;
      const blurb = document.createElement('small');
      blurb.textContent = unlocked ? p.blurb : `${p.at} animals to unlock`;
      const trait = document.createElement('div');
      trait.className = 'trait';
      trait.textContent = unlocked ? traitLine(p) : '🔒';
      card.append(name, blurb, trait);

      card.onclick = () => {
        if (!unlocked){ this.h.onDeny(); return; }
        this.s.wear(p.id);
        this.h.onProfile(p.id);
        this.renderProfiles();
      };
      g.appendChild(card);
    }
  }

  renderBiomes(){
    const g = this.el.biomeRow;
    g.innerHTML = '';
    BIOMES.forEach((b, i) => {
      const open = this.s.biomeUnlocked(i);
      const card = document.createElement('div');
      card.className = `bcard${this.s.biome === i ? ' on' : ''}${open ? '' : ' locked'}`;
      card.innerHTML = `<div class="emoji">${b.icon}</div><b>${b.name}</b>` +
        `<small>${open ? b.blurb : `🔒 ${b.cost} 🪙 in the shop`}</small>`;
      card.onclick = () => {
        if (!open){ this.h.onDeny(); this.showShop(); return; }
        this.s.biome = i;
        this.s.save();
        this.h.onBiome(i);
        this.renderBiomes();
      };
      g.appendChild(card);
    });
  }

  renderTables(){
    const g = this.el.tableGrid;
    g.innerHTML = '';
    for (const t of TABLES){
      const b = document.createElement('button');
      b.className = `tbl${this.s.tables.includes(t) ? ' on' : ''}`;
      b.textContent = t;
      b.onclick = () => {
        this.s.toggleTable(t);
        this.h.onTables();
        this.renderTables();
      };
      g.appendChild(b);
    }
  }

  // ----------------------------------------------------------------- the pad
  buildPad(){
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'];
    this.el.pad.innerHTML = '';
    for (const k of keys){
      const b = document.createElement('button');
      b.className = `key${k === 'go' ? ' go' : ''}${k === 'del' ? ' del' : ''}`;
      b.textContent = k === 'del' ? '⌫' : k === 'go' ? '✓' : k;
      b.onclick = () => this.padPress(k);
      this.el.pad.appendChild(b);
    }
    this.typed = '';

    // the physical keyboard, while the pad is open
    window.addEventListener('keydown', (e) => {
      if (this.el.hatch.classList.contains('hidden')) return;
      if (e.key >= '0' && e.key <= '9') this.padPress(e.key);
      else if (e.key === 'Backspace') this.padPress('del');
      else if (e.key === 'Enter') this.padPress('go');
      else if (e.key === 'Escape' && this.askCancelable) this.finishAsk(false);
      else return;
      e.preventDefault();
    });
  }

  padPress(k){
    if (!this.asking) return;
    if (k === 'del') this.typed = this.typed.slice(0, -1);
    else if (k === 'go') return this.submit();
    else if (this.typed.length < 4) this.typed += k;
    else return;
    this.h.onKey();
    this.el.qTyped.textContent = this.typed;
    this.el.qEntry.className = 'q-entry';
  }

  submit(){
    if (!this.typed.length) return;
    const value = Number(this.typed);
    const ok = this.askCheck(value);

    if (ok){
      this.el.qEntry.className = 'q-entry good';
      this.el.qNote.textContent = 'Yes!';
      this.el.hatchEgg.classList.add('crack');
      setTimeout(() => this.finishAsk(true), 420);
      return;
    }

    this.tries++;
    this.el.qEntry.className = 'q-entry bad';
    this.h.onWrong();
    if (this.tries >= 2){
      this.el.qNote.innerHTML = `Not quite. <b>${this.askQ.text} = ${this.askQ.right}</b> — type it in.`;
    } else {
      this.el.qNote.textContent = 'Not quite — have another go.';
    }
    this.typed = '';
    setTimeout(() => { this.el.qTyped.textContent = ''; }, 260);
  }

  /**
   * Ask one question. Resolves true once it is answered correctly, or false if
   * the player backs out of a purchase. `check` lets main.js record every
   * attempt, which is what makes the questions adapt.
   */
  ask(q, { icon = '🥚', sub = 'Answer to crack it open', note = '', cancelable = false, check }){
    this.asking = true;
    this.askQ = q;
    this.askCheck = check;
    this.askCancelable = cancelable;
    this.tries = 0;
    this.typed = '';

    this.el.hatchEgg.textContent = icon;
    this.el.hatchEgg.classList.remove('crack');
    this.el.hatchSub.textContent = sub;
    this.el.qText.textContent = q.text;
    this.el.qTyped.textContent = '';
    this.el.qEntry.className = 'q-entry';
    this.el.qNote.innerHTML = note || (cancelable ? '<span style="opacity:.7">Esc to back out</span>' : '');
    // Nothing from the raid should show through the card.
    this.banner(null);
    this.vignette(0);
    this.el.hatch.classList.remove('hidden');

    return new Promise((resolve) => { this.resolveAsk = resolve; });
  }

  finishAsk(ok){
    this.asking = false;
    this.el.hatch.classList.add('hidden');
    this.resolveAsk?.(ok);
    this.resolveAsk = null;
  }

  // ---------------------------------------------------------------- reveal
  reveal(sp, isNew, coins){
    const r = rarityById(sp.rarity);
    const cv = this.el.revealArt;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(critterSwatch(sp, 110), 0, 0, cv.width, cv.height);

    this.el.revealName.textContent = sp.name;
    this.el.revealRarity.textContent = r.name;
    this.el.revealRarity.style.background = r.tint;
    this.el.revealNote.innerHTML = isNew
      ? `<b>New species!</b> It earns ${r.coins} 🪙 a minute in your pen.`
      : `Now earning ${r.coins} 🪙 a minute more. +${coins} 🪙 for the hatch.`;
    this.el.revealCard.classList.toggle('new', isNew);
    this.el.reveal.classList.remove('hidden');

    return new Promise((resolve) => {
      this.closeReveal = () => {
        this.el.reveal.classList.add('hidden');
        this.closeReveal = null;
        resolve();
      };
    });
  }

  // ------------------------------------------------------------- collection
  showDex(){
    const g = this.el.dexGrid;
    g.innerHTML = '';
    const have = this.s.animals;
    const n = this.s.totalAnimals;
    this.el.dexSub.textContent =
      `${this.s.collected} of ${SPECIES.length} found · ${n} animal${n === 1 ? '' : 's'} in the pen`;

    for (const sp of SPECIES){
      const n = have[sp.id] || 0;
      const cell = document.createElement('div');
      cell.className = `dex-cell${n ? '' : ' missing'}`;
      cell.dataset.r = sp.rarity;

      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      cv.getContext('2d').drawImage(critterSwatch(sp, 64), 0, 0);
      cell.appendChild(cv);

      const name = document.createElement('small');
      name.textContent = n ? sp.name : '???';
      const count = document.createElement('div');
      count.className = 'n';
      count.textContent = n ? `×${n}` : rarityById(sp.rarity).name;
      cell.append(name, count);
      g.appendChild(cell);
    }
    this.el.dexScreen.classList.remove('hidden');
  }

  // ------------------------------------------------------------------- shop
  showShop(){
    this.renderShop();
    this.el.shop.classList.remove('hidden');
  }

  renderShop(){
    this.el.shopCoins.textContent = `${Math.floor(this.s.coins)} 🪙`;

    const ul = this.el.upgradeList;
    ul.innerHTML = '';
    for (const u of UPGRADES){
      const lv = this.s.level(u.id);
      const maxed = lv >= u.max;
      const cost = upgradeCost(u, lv);
      const row = document.createElement('div');
      row.className = `shop-row${maxed ? ' done' : ''}`;

      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('');
      row.innerHTML = `<div class="emoji">${u.icon}</div>
        <div class="mid"><b>${u.name}</b><small>${u.blurb(lv + (maxed ? 0 : 1))}</small>
        <div class="lv">${pips}</div></div>`;

      const buy = document.createElement('button');
      buy.className = 'buy';
      buy.textContent = maxed ? 'Maxed' : `${cost} 🪙`;
      buy.disabled = maxed || this.s.coins < cost;
      buy.onclick = async () => {
        buy.disabled = true;
        await this.h.onBuyUpgrade(u.id);
        this.renderShop();
      };
      row.appendChild(buy);
      ul.appendChild(row);
    }

    const bl = this.el.biomeList;
    bl.innerHTML = '';
    BIOMES.forEach((b, i) => {
      const open = this.s.biomeUnlocked(i);
      const row = document.createElement('div');
      row.className = `shop-row${open ? ' done' : ''}`;
      row.innerHTML = `<div class="emoji">${b.icon}</div>
        <div class="mid"><b>${b.name}</b><small>${b.blurb}${open ? '' : ' Rarer eggs, faster giants.'}</small></div>`;

      const buy = document.createElement('button');
      buy.className = 'buy';
      buy.textContent = open ? 'Open' : `${b.cost} 🪙`;
      buy.disabled = open || this.s.coins < b.cost;
      buy.onclick = async () => {
        buy.disabled = true;
        await this.h.onBuyBiome(i);
        this.renderShop();
        this.renderBiomes();
      };
      row.appendChild(buy);
      bl.appendChild(row);
    });
  }

  // ------------------------------------------------------------------ pause
  showPause(stats){
    this.el.pauseStats.innerHTML = Object.entries(stats)
      .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
    this.el.paused.classList.remove('hidden');
  }

  hidePause(){ this.el.paused.classList.add('hidden'); }

  get anyOverlay(){
    return ['start', 'hatch', 'reveal', 'dexScreen', 'shop', 'help', 'paused']
      .some((k) => !this.el[k].classList.contains('hidden'));
  }
}

function traitLine(p){
  const bits = [];
  if (p.trait.speed > 1.02) bits.push('🏃 fast');
  if (p.trait.speed < 0.99) bits.push('🐢 steady');
  if (p.trait.sneak > 1.05) bits.push('🤫 quiet');
  if (p.trait.sneak < 0.95) bits.push('👟 loud');
  if (p.trait.carry > 0) bits.push(`🧺 +${p.trait.carry}`);
  return bits.join(' · ') || '— balanced —';
}
