// ---------- Sheets, toasts and floaty numbers ----------

export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);

export function toast(html, kind = ''){
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.innerHTML = html;
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => t.classList.add('out'), 2600);
  setTimeout(() => t.remove(), 3000);
}

/** A "+$53" that floats up from an element. */
export function floatText(fromEl, text, cls = ''){
  const r = fromEl.getBoundingClientRect();
  const f = document.createElement('div');
  f.className = `floater ${cls}`;
  f.textContent = text;
  f.style.top = `${r.top + r.height * 0.35}px`;
  document.body.appendChild(f);
  // Keep long amounts ("+$49.5 Trillion") on screen at the edges.
  const half = f.offsetWidth * 0.6 + 6;      // it grows a little as it pops
  const x = Math.min(window.innerWidth - half, Math.max(half, r.left + r.width / 2));
  f.style.left = `${x}px`;
  setTimeout(() => f.remove(), 1100);
}

/** Restart a one-shot CSS animation class. */
export function bump(el, cls){
  if (!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

// One sheet at a time. `render()` returns the body's HTML; buttons with
// data-act come back through onAct(act, id, button).
export class Sheet {
  constructor(el){
    this.el = el;
    this.cur = null;
    el.innerHTML = `
      <div class="sheet-scrim"></div>
      <section class="sheet-card" role="dialog" aria-modal="true">
        <header class="sheet-head">
          <span class="sheet-icon"></span>
          <h2></h2>
          <div class="sheet-extra"></div>
          <button class="sheet-x" type="button" aria-label="Close">✕</button>
        </header>
        <nav class="sheet-tabs"></nav>
        <div class="sheet-body"></div>
      </section>`;
    this.icon = $('.sheet-icon', el);
    this.title = $('h2', el);
    this.extra = $('.sheet-extra', el);
    this.tabs = $('.sheet-tabs', el);
    this.body = $('.sheet-body', el);
    $('.sheet-x', el).addEventListener('click', () => this.close());
    $('.sheet-scrim', el).addEventListener('click', () => this.close());
    this.tabs.addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (!b || !this.cur) return;
      this.cur.tab = b.dataset.tab;
      this.body.scrollTop = 0;
      this.render();
    });
    this.body.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.cur || b.disabled) return;
      this.cur.onAct?.(b.dataset.act, b.dataset.id, b);
    });
  }

  get isOpen(){ return !!this.cur; }
  is(name){ return this.cur?.name === name; }

  open(cfg){
    this.cur = { tab: cfg.tabs?.[0]?.id, ...cfg };
    this.el.hidden = false;
    this.el.className = `sheet sheet-${cfg.name || ''}`;
    document.body.classList.add('sheet-open');
    this.body.scrollTop = 0;
    this.render();
  }

  render(){
    const c = this.cur;
    if (!c) return;
    const keep = this.body.scrollTop;
    this.icon.innerHTML = c.icon || '';
    this.title.textContent = c.title || '';
    this.extra.innerHTML = c.extra ? c.extra() : '';
    this.tabs.hidden = !c.tabs;
    this.tabs.innerHTML = (c.tabs || []).map(t =>
      `<button type="button" data-tab="${t.id}" class="${t.id === c.tab ? 'on' : ''}">${t.label}</button>`).join('');
    this.body.innerHTML = c.render(c.tab);
    this.body.scrollTop = keep;
  }

  close(){
    if (!this.cur) return;
    const done = this.cur.onClose;
    this.cur = null;
    this.el.hidden = true;
    document.body.classList.remove('sheet-open');
    done?.();
  }
}
