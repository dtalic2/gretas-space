// ---------- HUD, shops, toasts, sound ----------
import { fmtNum } from './format.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(){
    this.muted = false;
    this.modalOpen = false;

    this.el = {
      hud:$('hud'), coins:$('coinCount'), lvl:$('lvlCount'),
      hotbar:$('hotbar'), prompt:$('prompt'), promptText:$('promptText'),
      toasts:$('toasts'),
      shop:$('shop'), shopTitle:$('shopTitle'), shopCoins:$('shopCoins'),
      shopTabs:$('shopTabs'), shopGrid:$('shopGrid'), shopNote:$('shopNote'), shopClose:$('shopClose'),
      help:$('help'), helpClose:$('helpClose'), helpPlay:$('helpPlay'), btnHelp:$('btnHelp'),
      btnBag:$('btnBag'), btnSettings:$('btnSettings'), btnDig:$('btnDig'), btnBulk:$('btnBulk'),
      boot:$('boot'),
    };

    this._bind();
  }

  // ---------------- setup ----------------
  _bind(){
    this.el.shopClose.addEventListener('click', () => this.closeShop());
    this.el.btnDig.addEventListener('click', () => this.onDig?.());
    this.el.btnBulk.addEventListener('click', () => this.onBulk?.());
    this.el.btnBag.addEventListener('click', () => this.onBag?.());
    this.el.btnSettings.addEventListener('click', () => this.onSettings?.());
    this.el.btnHelp.addEventListener('click', () => this.openHelp());
    this.el.helpClose.addEventListener('click', () => this.closeHelp());
    this.el.helpPlay.addEventListener('click', () => this.closeHelp());

    addEventListener('keydown', (e) => {
      if (e.code !== 'Escape') return;
      if (!this.el.shop.classList.contains('hidden')) this.closeShop();
      else if (!this.el.help.classList.contains('hidden')) this.closeHelp();
    });
  }

  toggleMute(){
    this.muted = !this.muted;
    this.onMuteChange?.(this.muted);
    return this.muted;
  }

  /** Show/hide the shovel toggle and reflect whether dig mode is on. */
  setDig(owned, active){
    this.el.btnDig.classList.toggle('hidden', !owned);
    this.el.btnDig.classList.toggle('on', !!active);
  }

  setBulk(owned){ this.el.btnBulk.classList.toggle('hidden', !owned); }

  showHUD(){
    this.el.hud.classList.remove('hidden');
    this.el.boot.classList.add('gone');
    setTimeout(() => this.el.boot.classList.add('hidden'), 700);
  }

  bootProgress(pct, msg){
    this.el.boot.querySelector('.boot-bar i').style.width = `${pct}%`;
    if (msg) this.el.boot.querySelector('.boot-msg').textContent = msg;
  }

  // ---------------- HUD ----------------
  setStats({ coins, level }){
    this.el.coins.textContent = fmtNum(coins);
    this.el.lvl.textContent = level;
  }

  /** @param {Array<{id,emoji,count,locked}>} slots */
  renderHotbar(slots, selectedId, onSelect){
    this.el.hotbar.innerHTML = '';
    slots.forEach((s, i) => {
      const d = document.createElement('div');
      d.className = 'slot' + (s.id === selectedId ? ' active' : '') + (s.locked ? ' locked' : '');
      // Only the first nine have a number-key shortcut; the rest are click/Q only.
      const key = i < 9 ? `<span class="k">${i + 1}</span>` : '';
      d.innerHTML = `${key}<span class="emoji">${s.emoji}</span><span class="n">×${s.count}</span>`;
      d.title = s.name || '';
      d.addEventListener('click', () => { if (!s.locked) onSelect(s.id); });
      this.el.hotbar.appendChild(d);
    });
  }

  showPrompt(text){
    this.el.promptText.textContent = text;
    this.el.prompt.classList.remove('hidden');
  }
  hidePrompt(){ this.el.prompt.classList.add('hidden'); }

  toast(msg, kind = ''){
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    this.el.toasts.appendChild(t);
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 320);
    }, 2200);
    // Keep the stack short.
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
  }

  // ---------------- shop ----------------
  /**
   * @param {object} cfg {title, coins, tabs, activeTab, items, note, onTab, onBuy}
   */
  openShop(cfg){
    this.shopCfg = cfg;
    this.modalOpen = true;
    this.el.shopTitle.textContent = cfg.title;
    this.el.shopCoins.textContent = fmtNum(cfg.coins);
    this.el.shopNote.textContent = cfg.note || '';

    this.el.shopTabs.innerHTML = '';
    for (const t of (cfg.tabs || [])){
      const b = document.createElement('button');
      b.textContent = t.label;
      b.className = t.id === cfg.activeTab ? 'on' : '';
      b.addEventListener('click', () => cfg.onTab?.(t.id));
      this.el.shopTabs.appendChild(b);
    }
    this.el.shopTabs.style.display = (cfg.tabs?.length > 1) ? '' : 'none';

    this.el.shopGrid.innerHTML = '';
    for (const it of cfg.items){
      const c = document.createElement('div');
      // `readonly` is for things you already own — shown at full strength but
      // not clickable. `disabled` is for things you can't have yet, and greys out.
      c.className = 'card' + (it.disabled ? ' cant' : '') + (it.readonly ? ' readonly' : '');
      c.innerHTML = `
        <div class="emoji">${it.emoji}</div>
        <div class="nm">${it.name}</div>
        <div class="meta">${it.meta || ''}</div>
        ${it.ownedText
            ? `<div class="owned">${it.ownedText}</div>`
            : it.price ? `<div class="price">🪙 ${fmtNum(it.price)}</div>` : ''}`;
      if (!it.disabled && !it.readonly && cfg.onBuy){
        c.addEventListener('click', () => { this.blip(700, 0.06); cfg.onBuy(it.id); });
      }
      this.el.shopGrid.appendChild(c);
    }

    this.el.shop.classList.remove('hidden');
  }

  refreshShop(cfg){ if (!this.el.shop.classList.contains('hidden')) this.openShop(cfg); }

  closeShop(){
    this.el.shop.classList.add('hidden');
    // Tear the grid down rather than just hiding it. A hidden panel still holds
    // live click handlers bound to the old shop's onBuy, so a stale card could
    // spend coins if anything ever re-showed the panel without rebuilding it.
    this.el.shopGrid.innerHTML = '';
    this.el.shopTabs.innerHTML = '';
    this.el.shopNote.textContent = '';
    this.modalOpen = false;
    this.shopCfg = null;
    this.onShopClose?.();
  }
  get shopOpen(){ return !this.el.shop.classList.contains('hidden'); }

  // ---------------- help ----------------
  openHelp(){ this.el.help.classList.remove('hidden'); this.modalOpen = true; }
  closeHelp(){
    this.el.help.classList.add('hidden');
    this.modalOpen = false;
    this.onHelpClose?.();
  }

  // ---------------- sound ----------------
  _ctx(){
    if (this.muted) return null;
    if (!this.audio){
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.audio = new AC();
    }
    if (this.audio.state === 'suspended') this.audio.resume();
    return this.audio;
  }

  blip(freq = 600, dur = 0.07, type = 'sine', gain = 0.06){
    const ac = this._ctx();
    if (!ac) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  }

  chime(){ this.blip(660, 0.1); setTimeout(() => this.blip(990, 0.16), 90); }
  buzz(){ this.blip(150, 0.22, 'sawtooth', 0.05); }
  coin(){ this.blip(1180, 0.07, 'square', 0.045); setTimeout(() => this.blip(1560, 0.11, 'square', 0.04), 65); }
  pop(){ this.blip(420, 0.09, 'triangle', 0.06); }
  levelUp(){ [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.blip(f, 0.18, 'triangle', 0.07), i * 110)); }
}
