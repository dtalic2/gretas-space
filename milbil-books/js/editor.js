// ---------- Making a book ----------
//
// The Create screen: the page in the middle, the pages along the top, and the
// tools along the bottom.
//
//   👆 Move     tap a panel, a milbil or a bubble to pick it up. A picked-up
//               panel has a blue dot on each corner: drag one to change its
//               size, or drag the panel itself to move it.
//   ✏️ Draw     a pen, with any colour and any thickness, in front of the
//               milbils or behind them.
//   🧽 Rubber   rubs out drawing (and only drawing).
//   🔲 Panel    a new panel, in the biggest gap on the page.
//   👾 Milbil   somebody to go in a panel. If they don't fit, the panel grows.
//   💬 Words    a speech bubble for whoever is picked up.
//   📜 Caption  words with nobody talking: a strip along the top or the bottom
//               of a panel, or a box that goes anywhere.
//
// Every change can be undone. A change to a page is remembered as that page
// before and after (without its drawing, which is remembered a line at a
// time), so undo is cheap however much has been drawn.

import {
  PAGE_W, PAGE_H, SIDE, TOP, FOOT, COLS, ROWS, CW, CH, GUT, MB_MIN,
  COVER_COLOURS, PANEL_BGS, PEN_COLOURS, TEMPLATES, TITLE_IDEAS, CAPTION_FILLS,
  uid, clamp, allPages, newPage, newPanel, box, mbBox, find, findMilbil, panelAt,
  spotForPanel, firstFit, resizeTarget, moveTarget, growToFit, roomFor, addMilbil, fitContents,
  shiftContents, moveToPanel, placeWords, keepWordsOnPage, extent, pageIsEmpty,
  isStrip, stripTextWidth, layoutCaptions, makeRoomForCaption,
} from './model.js';
import { CAST, who, castHTML } from './cast.js';
import { measure, KINDS, MAX_W } from './bubbles.js';
import { simplify } from './ink.js';
import { PageView } from './view.js';
import { $, esc, toast, card, sfx } from './ui.js';
import { settings, saveSettings } from './store.js';

const HISTORY = 120;
const TAP = 7;       // px a finger can wander and still count as a tap
const pct = (v, of) => `${(v / of * 100).toFixed(3)}%`;

const boxHTML = (cls, b) => `<div class="sel-box ${cls}" style="left:${pct(b.x, PAGE_W)};top:${pct(b.y, PAGE_H)};` +
  `width:${pct(b.w, PAGE_W)};height:${pct(b.h, PAGE_H)}"></div>`;

const btn = (act, icon, label = '', cls = '', title = '') =>
  `<button type="button" class="cb ${cls}" data-act="${act}"${title ? ` title="${title}" aria-label="${title}"` : ''}>` +
  `<i>${icon}</i>${label ? `<span>${label}</span>` : ''}</button>`;

export function pickTitle(not = ''){
  const pool = TITLE_IDEAS.filter(t => t !== not);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** A page copied with new ids all through, so the copy and the original never get mixed up. */
function clonePage(src){
  const page = JSON.parse(JSON.stringify(src));
  page.id = uid();
  delete page.kind;
  const ids = {};
  for (const p of page.panels){
    p.id = uid();
    for (const m of p.cast){ const n = uid(); ids[m.id] = n; m.id = n; }
  }
  for (const p of page.panels) for (const t of p.words){ t.id = uid(); if (t.from) t.from = ids[t.from] || null; }
  return page;
}

/** Put a page back the way it was, keeping its drawing (that has its own undo). */
function restore(page, json){
  const data = JSON.parse(json);
  const ink = page.ink;
  for (const k of Object.keys(page)) delete page[k];
  Object.assign(page, data, { ink });
}

export class Editor {
  constructor(root, sheet, hooks){
    this.root = root;
    this.sheet = sheet;
    this.hooks = hooks;              // { save(book), back(book), done(book) }
    this.book = null;
    this.mode = 'move';
    this.sel = null;
    this.drag = null;
    this.past = [];
    this.future = [];
    this.thumbs = new Map();

    root.innerHTML = `
      <div class="ed">
        <header class="ed-top">
          <button type="button" class="ed-btn back" data-act="back" aria-label="Back to your books">‹</button>
          <button type="button" class="ed-name" data-act="cover"><b></b><small>✏️ title and cover</small></button>
          <button type="button" class="ed-btn" data-act="undo" aria-label="Undo" title="Undo">↩️</button>
          <button type="button" class="ed-btn" data-act="redo" aria-label="Redo" title="Redo">↪️</button>
          <button type="button" class="btn go ed-done" data-act="done">✓ Done</button>
        </header>
        <nav class="ed-strip" aria-label="Pages"></nav>
        <section class="ed-stage"><div class="ed-host"></div></section>
        <p class="ed-hint" aria-live="polite"></p>
        <div class="ed-ctx"></div>
        <nav class="ed-tools">
          <button type="button" class="tool" data-mode="move"><i>👆</i><span>Move</span></button>
          <button type="button" class="tool" data-mode="draw"><i>✏️</i><span>Draw</span></button>
          <button type="button" class="tool" data-mode="rubber"><i>🧽</i><span>Rubber</span></button>
          <span class="tool-gap"></span>
          <button type="button" class="tool" data-act="add-panel"><i>🔲</i><span>Panel</span></button>
          <button type="button" class="tool" data-act="add-milbil"><i>👾</i><span>Milbil</span></button>
          <button type="button" class="tool" data-act="add-words"><i>💬</i><span>Words</span></button>
          <button type="button" class="tool" data-act="add-caption"><i>📜</i><span>Caption</span></button>
        </nav>
      </div>`;
    this.nameEl = $('.ed-name b', root);
    this.undoBtn = $('[data-act="undo"]', root);
    this.redoBtn = $('[data-act="redo"]', root);
    this.stripEl = $('.ed-strip', root);
    this.stage = $('.ed-stage', root);
    this.host = $('.ed-host', root);
    this.ctxEl = $('.ed-ctx', root);
    this.hintEl = $('.ed-hint', root);
    this.toolsEl = $('.ed-tools', root);

    root.addEventListener('click', (e) => this.onClick(e));
    this.ctxEl.addEventListener('input', (e) => this.onSlider(e));
    this.ctxEl.addEventListener('change', (e) => { if (e.target.type === 'range') saveSettings(); });
    addEventListener('keydown', (e) => this.onKey(e));
    if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(this.stage);
    addEventListener('resize', () => this.fit());
  }

  // ============================================================ open/close ===

  open(book, { from = 'create', page = null } = {}){
    this.book = book;
    this.from = from;
    this.mode = 'move';
    this.sel = null;
    this.drag = null;
    this.past = [];
    this.future = [];
    this.lastPanel = null;
    // straight back to the page you were on, if the tab was closed in the middle
    this.pageId = allPages(book).some(p => p.id === page) ? page : book.pages[0].id;
    this.root.hidden = false;
    document.body.classList.add('editing');

    this.view?.destroy();
    this.host.innerHTML = '';
    this.view = new PageView(this.host, { edit: true });
    this.bindPage(this.view.el);
    for (const t of this.thumbs.values()) t.view.destroy();
    this.thumbs.clear();
    this.stripEl.innerHTML = '';
    this.addPageBtn = null;

    this.fit();
    this.renderAll();

    // A brand new book: show the corner dots straight away, so it is obvious the
    // panel can be pulled bigger or smaller.
    const first = this.page;
    if (book.pages.length === 1 && pageIsEmpty(first) && first.panels.length === 1){
      this.select({ type: 'panel', id: first.panels[0].id });
    }
  }

  close(){
    if (!this.book) return null;
    this.flush();
    this.sheet.close();
    this.view?.destroy();
    this.view = null;
    for (const t of this.thumbs.values()) t.view.destroy();
    this.thumbs.clear();
    this.root.hidden = true;
    document.body.classList.remove('editing');
    const b = this.book;
    this.book = null;
    return b;
  }

  get isOpen(){ return !!this.book; }

  // ============================================================== looking ===

  get pages(){ return allPages(this.book); }
  get page(){ return this.pages.find(p => p.id === this.pageId) || this.book.pages[0]; }
  get num(){ return this.book.pages.indexOf(this.page) + 1; }          // 0 on the cover
  panel(id){ return this.page.panels.find(p => p.id === id) || null; }
  findPage(id){ return this.pages.find(p => p.id === id) || null; }
  panelsInOrder(){ return [...this.page.panels].sort((a, b) => a.y - b.y || a.x - b.x); }
  unitsPerPx(){ return PAGE_W / Math.max(1, this.view.el.clientWidth); }

  /** The panel a new milbil should go in, if nobody said which. */
  targetPanel(){
    const s = this.sel;
    if (s?.type === 'panel'){ const p = this.panel(s.id); if (p) return p; }
    if (s && s.type !== 'panel'){ const f = find(this.page, s.id); if (f) return f.panel; }
    return this.panel(this.lastPanel) || this.page.panels.find(p => !p.cast.length) || this.page.panels[0] || null;
  }

  // ============================================================ rendering ===

  /** The page as big as it will go in the space between the toolbars. */
  fit(){
    if (!this.book) return;
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const pad = r.width < 500 ? 8 : 14;
    const w = Math.floor(Math.max(120, Math.min(r.width - pad * 2, (r.height - pad * 2) * PAGE_W / PAGE_H)));
    this.host.style.width = `${w}px`;
    this.host.style.height = `${Math.floor(w * PAGE_H / PAGE_W)}px`;
    if (this.mode !== 'move') this.renderCtx();
  }

  renderAll(){
    this.renderTop();
    this.renderStrip();
    this.renderPage();
    this.renderTools();
    this.renderCtx();
  }

  renderTop(){
    this.nameEl.textContent = this.book.title || 'My Book';
    this.undoBtn.disabled = !this.past.length;
    this.redoBtn.disabled = !this.future.length;
  }

  renderPage(){
    this.layoutCaptions();
    this.view.render(this.page, { book: this.book, num: this.num });
    this.view.el.classList.toggle('drawing', this.mode !== 'move');
    this.view.el.dataset.tool = this.mode;
    this.renderSel();
  }

  renderTools(){
    for (const b of this.toolsEl.querySelectorAll('[data-mode]')) b.classList.toggle('on', b.dataset.mode === this.mode);
    this.toolsEl.querySelector('[data-act="add-panel"]').classList.toggle('dim', this.page.kind === 'cover');
  }

  /** The dashed box and the dots round whatever is picked up. */
  renderSel(){
    const s = this.sel, page = this.page;
    let html = '';
    if (this.drag?.grid){
      html += `<div class="grid" style="left:${pct(SIDE, PAGE_W)};top:${pct(TOP, PAGE_H)};` +
        `width:${pct(PAGE_W - 2 * SIDE, PAGE_W)};height:${pct(PAGE_H - TOP - FOOT, PAGE_H)};` +
        `background-size:${100 / COLS}% ${100 / ROWS}%"></div>`;
    }
    if (s && this.mode === 'move'){
      if (s.type === 'panel'){
        const p = this.panel(s.id);
        if (p){
          const b = box(p);
          html += boxHTML(`sel-panel${p.fixed ? ' fixed' : ''}`, b);
          if (!p.fixed){
            html += [['nw', b.x, b.y], ['ne', b.x + b.w, b.y], ['sw', b.x, b.y + b.h], ['se', b.x + b.w, b.y + b.h]]
              .map(([c, x, y]) => `<i class="h" data-h="${c}" style="left:${pct(x, PAGE_W)};top:${pct(y, PAGE_H)}"></i>`).join('');
          }
        }
      } else {
        const f = find(page, s.id);
        if (f?.m){
          const b = mbBox(f.m);
          html += boxHTML('sel-mb', b) +
            `<i class="h size" data-h="mb" style="left:${pct(b.x + b.w, PAGE_W)};top:${pct(b.y, PAGE_H)}"></i>`;
        } else if (f?.t){
          const e = extent(f.t);
          html += boxHTML('sel-words', { x: f.t.x - e.rx, y: f.t.y - e.ry, w: e.rx * 2, h: e.ry * 2 });
        }
      }
    }
    this.view.selEl.innerHTML = html;
  }

  /** The row above the tools: what you can do with whatever is picked up, and a line saying how. */
  renderCtx(){
    const s = this.sel, page = this.page;
    let html = '', hint = '';
    if (this.mode === 'draw'){
      html = this.drawBar();
      hint = settings.pen.b ? 'Drawing behind the milbils. Tap the colour for more pens.' : 'Draw anywhere on the page. Tap the colour for more colours and pens.';
    } else if (this.mode === 'rubber'){
      html = this.rubberBar();
      hint = 'Rub out drawing. Milbils and words are safe.';
    } else if (s?.type === 'panel' && this.panel(s.id)){
      const p = this.panel(s.id);
      html = btn('pnl-milbil', '👾', 'Add a milbil', 'go') +
        (p.fixed ? '' : btn('pnl-colour', '🎨', 'Colour') + btn('pnl-delete', '🗑️', '', 'danger', 'Throw this panel away'));
      hint = p.fixed ? 'Milbils on the cover can be as big as you like.' : 'Drag a blue dot to make the panel bigger or smaller. Drag the middle to move it.';
    } else if (s?.type === 'mb' && find(page, s.id)?.m){
      html = btn('mb-talk', '💬', 'Talk', 'go') + btn('mb-flip', '↔️', 'Turn') +
        btn('mb-bigger', '➕', '', '', 'Bigger') + btn('mb-smaller', '➖', '', '', 'Smaller') +
        btn('mb-front', '⏫', 'Front') + btn('mb-delete', '🗑️', '', 'danger', 'Take them out');
      hint = 'Drag to move them — even into another panel. The pink dot makes them bigger.';
    } else if (s?.type === 'w' && find(page, s.id)?.t){
      const t = find(page, s.id).t;
      const cap = t.kind === 'caption';
      html = btn('w-edit', '✏️', cap ? 'Change the caption' : 'Change the words', 'go') +
        btn('w-delete', '🗑️', '', 'danger', cap ? 'Throw this caption away' : 'Throw these words away');
      hint = isStrip(t) ? 'Drag it to the top or the bottom of any panel. Tap it again to change it.'
        : cap ? 'Drag the caption anywhere. Tap it again to change it.'
        : 'Drag the bubble to move it. Tap it again to change the words.';
    } else {
      const cover = page.kind === 'cover';
      // whatever the page needs next: a panel, then somebody in it, then words
      const anyone = page.panels.some(p => p.cast.length);
      const next = !page.panels.length ? btn('add-panel', '🔲', 'Add a panel')
        : !anyone ? btn('add-milbil', '👾', 'Add a milbil') : btn('add-words', '💬', 'Words');
      html = cover ? btn('cover', '📕', 'Title and colour') + btn('add-milbil', '👾', 'Add a milbil')
        : btn('page-menu', '📄', `Page ${this.num}`) + next;
      hint = cover ? 'This is the cover. Tap the title to change it, or put milbils on it.'
        : !page.panels.length ? 'An empty page. Add a panel, or draw on it.'
        : !anyone ? 'Tap a panel to change its size, or put a milbil in it.'
        : 'Tap a panel to change its size. Tap a milbil to make it talk.';
    }
    this.ctxEl.innerHTML = html;
    this.ctxEl.dataset.tool = this.mode;
    this.hintEl.textContent = hint;
  }

  drawBar(){
    const pen = settings.pen;
    const k = 1 / this.unitsPerPx();
    const dot = clamp(pen.w * k, 3, 36);
    return `<button type="button" class="pen-now" data-act="palette" style="--c:${pen.c}" aria-label="All the colours and pens">
        <i class="${pen.g ? 'glow' : ''}"></i><span>${pen.g ? '✨' : '🎨'}${pen.b ? '<em>behind</em>' : ''}</span></button>
      <span class="sws">${settings.recent.slice(0, 4).map(c =>
        `<button type="button" class="sw${c === pen.c ? ' on' : ''}" data-act="pen-colour" data-id="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('')}</span>
      <label class="thick"><input type="range" min="3" max="90" step="1" value="${pen.w}" data-role="pen-size" aria-label="How thick">
        <span class="dot-box"><i class="dot${pen.g ? ' glow' : ''}" style="--s:${dot}px;--c:${pen.c}"></i></span></label>`;
  }

  rubberBar(){
    const k = 1 / this.unitsPerPx();
    const dot = clamp(settings.rubber * k, 4, 44);
    return `<span class="rub-ico" aria-hidden="true">🧽</span>
      <label class="thick"><input type="range" min="10" max="140" step="2" value="${settings.rubber}" data-role="rub-size" aria-label="How big the rubber is">
        <span class="dot-box"><i class="dot rub" style="--s:${dot}px"></i></span></label>
      ${btn('rub-all', '🧹', 'Rub out the lot', 'danger')}`;
  }

  /** The page strip: the cover, then every page with its number, then ➕. */
  renderStrip(){
    if (!this.book) return;
    const pages = this.pages;
    const keep = new Set();
    pages.forEach((pg, i) => {
      let t = this.thumbs.get(pg.id);
      if (!t){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'th';
        b.dataset.page = pg.id;
        b.innerHTML = '<span class="th-pg"></span><small></small>';
        t = { btn: b, view: null, dirty: true, num: -1 };
        this.thumbs.set(pg.id, t);
      }
      keep.add(pg.id);
      if (this.stripEl.children[i] !== t.btn) this.stripEl.insertBefore(t.btn, this.stripEl.children[i] || null);
      t.view ||= new PageView(t.btn.firstElementChild, { thumb: true });
      t.btn.lastElementChild.textContent = i ? String(i) : 'Cover';
      t.btn.classList.toggle('on', pg.id === this.pageId);
      t.btn.setAttribute('aria-label', i ? `Page ${i}` : 'The cover');
      if (t.dirty || t.num !== i){
        t.view.render(pg, { book: this.book, num: i });
        t.view.paintInk();
        t.dirty = false;
        t.num = i;
      }
    });
    for (const [id, t] of this.thumbs) if (!keep.has(id)){ t.view?.destroy(); t.btn.remove(); this.thumbs.delete(id); }
    if (!this.addPageBtn){
      this.addPageBtn = document.createElement('button');
      this.addPageBtn.type = 'button';
      this.addPageBtn.className = 'th add';
      this.addPageBtn.dataset.act = 'add-page';
      this.addPageBtn.innerHTML = '<span class="th-pg">＋</span><small>Page</small>';
    }
    this.stripEl.appendChild(this.addPageBtn);
  }

  // ============================================================= changing ===

  snap(){ this.layoutCaptions(); const { ink, ...rest } = this.page; return JSON.stringify(rest); }

  /**
   * Caption strips follow their panel: whenever a panel changes width, the
   * words in its strips are measured again, and then every strip is put back
   * in its place along the edge.
   */
  layoutCaptions(page = this.page){
    for (const p of page.panels){
      for (const t of p.words) if (isStrip(t) && t.mw !== stripTextWidth(p)) this.measureCaption(p, t);
      layoutCaptions(p);
    }
  }

  measureCaption(p, t){
    const mw = stripTextWidth(p);
    Object.assign(t, measure(t.text, 'caption', t.size, mw), { mw });
  }

  push(entry){
    this.past.push(entry);
    if (this.past.length > HISTORY) this.past.shift();
    this.future = [];
    this.renderTop();
  }

  /** Remember a change to the page shown, if there was one. */
  commit(before){
    const after = this.snap();
    if (after === before) return false;
    this.push({ kind: 'page', pid: this.pageId, before, after });
    this.changed();
    return true;
  }

  changed(pid = this.pageId){
    this.markDirty(pid);
    this.renderTop();
    clearTimeout(this.stripTimer);
    this.stripTimer = setTimeout(() => this.renderStrip(), 250);
    this.book.updated = Date.now();
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.flush(), 500);
  }

  markDirty(pid){ const t = this.thumbs.get(pid); if (t) t.dirty = true; }

  flush(){
    clearTimeout(this.saveTimer);
    if (this.book) this.hooks.save(this.book);
  }

  undo(){
    const e = this.past.pop();
    if (!e){ sfx('nope'); return; }
    this.apply(e, true);
    this.future.push(e);
    sfx('undo');
  }

  redo(){
    const e = this.future.pop();
    if (!e){ sfx('nope'); return; }
    this.apply(e, false);
    this.past.push(e);
    sfx('undo');
  }

  apply(e, back){
    const b = this.book;
    let goTo = null, ink = false;
    switch (e.kind){
      case 'page': {
        const pg = this.findPage(e.pid);
        if (pg){ restore(pg, back ? e.before : e.after); goTo = pg.id; }
        break;
      }
      case 'stroke': {
        const pg = this.findPage(e.pid);
        if (pg){
          if (back){ const i = pg.ink.lastIndexOf(e.stroke); if (i >= 0) pg.ink.splice(i, 1); }
          else pg.ink.push(e.stroke);
          goTo = pg.id; ink = true;
        }
        break;
      }
      case 'ink': {
        const pg = this.findPage(e.pid);
        if (pg){ pg.ink = (back ? e.before : e.after).slice(); goTo = pg.id; ink = true; }
        break;
      }
      case 'add':
        if (back){
          const i = b.pages.indexOf(e.page);
          if (i >= 0) b.pages.splice(i, 1);
          goTo = (b.pages[Math.min(Math.max(0, e.at - 1), b.pages.length - 1)] || b.cover).id;
        } else { b.pages.splice(e.at, 0, e.page); goTo = e.page.id; }
        break;
      case 'del':
        if (back){ b.pages.splice(e.at, 0, e.page); goTo = e.page.id; }
        else {
          const i = b.pages.indexOf(e.page);
          if (i >= 0) b.pages.splice(i, 1);
          goTo = b.pages[Math.min(e.at, b.pages.length - 1)].id;
        }
        break;
      case 'move': {
        const [pg] = b.pages.splice(back ? e.to : e.from, 1);
        b.pages.splice(back ? e.from : e.to, 0, pg);
        goTo = pg.id;
        break;
      }
      case 'meta':
        Object.assign(b, back ? e.before : e.after);
        this.markDirty(b.cover.id);
        break;
    }
    this.sel = null;
    if (goTo) this.pageId = goTo;
    this.markDirty(this.pageId);
    this.renderAll();
    if (ink) this.view.paintInk();
    this.changed();
  }

  // ============================================================ the pages ===

  go(id, { quiet = false } = {}){
    if (!this.findPage(id)) id = this.book.pages[0].id;
    const moved = id !== this.pageId;
    this.pageId = id;
    if (moved){ settings.openPage = id; saveSettings(); }
    this.sel = null;
    this.lastPanel = null;
    this.renderPage();
    this.renderStrip();
    this.renderTools();
    this.renderCtx();
    if (moved && !quiet) sfx('page');
    this.thumbs.get(id)?.btn.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: quiet ? 'auto' : 'smooth' });
  }

  tapPage(id){
    if (id === this.pageId){ this.pageMenu(); return; }
    this.go(id);
  }

  addPageSheet(){
    this.sheet.show({
      key: 'tpl', icon: '➕', title: 'Add a page',
      sub: 'Pick how the panels go to start with. You can change them afterwards.',
      render: () => `<div class="tpl-grid">${TEMPLATES.map(t => `
        <button type="button" class="tpl" data-act="tpl" data-id="${t.id}">
          <span class="tpl-pic">${t.rects.map(([x, y, w, h]) =>
            `<i style="left:${x / COLS * 100}%;top:${y / ROWS * 100}%;width:${w / COLS * 100}%;height:${h / ROWS * 100}%"></i>`).join('')}</span>
          <b>${t.name}</b></button>`).join('')}</div>`,
      onAct: (act, id) => { if (act !== 'tpl') return; this.sheet.close(); this.addPage(id); },
    });
  }

  addPage(tpl){
    const pages = this.book.pages;
    const at = pages.indexOf(this.page) + 1;     // straight after this one; first if this is the cover
    const page = newPage(tpl);
    pages.splice(at, 0, page);
    this.push({ kind: 'add', at, page });
    this.changed(page.id);
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    this.go(page.id);
    toast(`Page ${at + 1} added.`);
  }

  pageMenu(){
    const pages = this.book.pages;
    const i = pages.indexOf(this.page);
    if (i < 0){ this.coverSheet(); return; }
    this.sheet.show({
      key: 'page', icon: '📄', title: `Page ${i + 1}`, sub: `of ${pages.length}. The numbers sort themselves out.`,
      render: () => `<div class="menu">
        <button type="button" class="menu-row" data-act="left"${i === 0 ? ' disabled' : ''}><i>⬅️</i><b>Move it earlier</b></button>
        <button type="button" class="menu-row" data-act="right"${i === pages.length - 1 ? ' disabled' : ''}><i>➡️</i><b>Move it later</b></button>
        <button type="button" class="menu-row" data-act="copy"><i>📄</i><b>Make a copy of it</b></button>
        <button type="button" class="menu-row" data-act="add"><i>➕</i><b>Add a new page after it</b></button>
        <button type="button" class="menu-row danger" data-act="del"${pages.length < 2 ? ' disabled' : ''}><i>🗑️</i><b>Throw this page away</b></button>
      </div>`,
      onAct: (act) => {
        this.sheet.close();
        if (act === 'left' || act === 'right') this.movePage(i, act === 'left' ? i - 1 : i + 1);
        if (act === 'copy') this.copyPage(i);
        if (act === 'add') setTimeout(() => this.addPageSheet(), 280);
        if (act === 'del') this.deletePage(i);
      },
    });
  }

  movePage(from, to){
    const pages = this.book.pages;
    const [pg] = pages.splice(from, 1);
    pages.splice(to, 0, pg);
    this.push({ kind: 'move', from, to });
    this.changed();
    this.go(pg.id, { quiet: true });
    sfx('page');
    toast(`That's page ${to + 1} now.`);
  }

  copyPage(i){
    const copy = clonePage(this.book.pages[i]);
    this.book.pages.splice(i + 1, 0, copy);
    this.push({ kind: 'add', at: i + 1, page: copy });
    this.changed(copy.id);
    this.go(copy.id);
    toast(`Copied. The copy is page ${i + 2}.`);
  }

  deletePage(i){
    const pages = this.book.pages;
    if (pages.length < 2){ toast('A book needs at least one page.'); sfx('nope'); return; }
    const [pg] = pages.splice(i, 1);
    this.push({ kind: 'del', at: i, page: pg });
    const mark = this.past.length;
    this.changed();
    this.go(pages[Math.min(i, pages.length - 1)].id, { quiet: true });
    sfx('bin');
    toast(`Page ${i + 1} thrown away.`, { undo: () => { if (this.past.length === mark) this.undo(); } });
  }

  coverSheet(){
    const b = this.book;
    const before = { title: b.title, author: b.author, color: b.color };
    const refresh = () => {
      this.markDirty(b.cover.id);
      this.renderTop();
      this.renderPage();
      clearTimeout(this.stripTimer);
      this.stripTimer = setTimeout(() => this.renderStrip(), 250);
    };
    this.sheet.show({
      key: 'cover', icon: '📕', title: 'The cover', sub: 'What your book is called, who made it, and its colour.',
      render: () => `
        <label class="field"><span>Title</span><span class="set-row">
          <input class="in" data-role="title" maxlength="60" value="${esc(b.title)}" placeholder="My Book" autocomplete="off" spellcheck="false">
          <button type="button" class="btn ghost dice" data-act="dice" aria-label="Think of a title for me">🎲</button></span></label>
        <label class="field"><span>Made by</span>
          <input class="in" data-role="author" maxlength="30" value="${esc(b.author)}" placeholder="Your name" autocomplete="off" spellcheck="false"></label>
        <div class="field"><span>Colour</span><div class="swatches">${COVER_COLOURS.map(c =>
          `<button type="button" class="sw big${c === b.color ? ' on' : ''}" data-act="colour" data-id="${c}" style="--c:${c}" aria-label="Cover colour"></button>`).join('')}</div></div>`,
      onInput: (el) => {
        if (el.dataset.role === 'title') b.title = el.value.slice(0, 60);
        if (el.dataset.role === 'author') b.author = el.value.slice(0, 30);
        refresh();
      },
      onAct: (act, id) => {
        if (act === 'colour'){
          b.color = id;
          for (const s of this.sheet.body.querySelectorAll('[data-act="colour"]')) s.classList.toggle('on', s.dataset.id === id);
          sfx('pick');
          refresh();
        }
        if (act === 'dice'){
          b.title = pickTitle(b.title);
          this.sheet.body.querySelector('[data-role="title"]').value = b.title;
          sfx('pick');
          refresh();
        }
      },
      onClose: () => {
        b.title = b.title.trim();
        b.author = b.author.trim();
        const after = { title: b.title, author: b.author, color: b.color };
        if (JSON.stringify(after) !== JSON.stringify(before)){
          this.push({ kind: 'meta', before, after });
          this.changed(b.cover.id);
        }
        refresh();
      },
    });
  }

  // ============================================================ the tools ===

  setMode(m, { quiet = false } = {}){
    if (this.mode === m && m !== 'move') m = 'move';      // tapping Draw again puts the pen down
    this.mode = m;
    this.renderPage();
    this.renderTools();
    this.renderCtx();
    if (!quiet) sfx('tap');
  }

  onClick(e){
    if (!this.book) return;
    const pg = e.target.closest('[data-page]');
    if (pg){ this.tapPage(pg.dataset.page); return; }
    const md = e.target.closest('.ed-tools [data-mode]');
    if (md){ this.setMode(md.dataset.mode); return; }
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    switch (act){
      case 'back': this.hooks.back(this.book); break;
      case 'done': this.hooks.done(this.book); break;
      case 'cover': this.coverSheet(); break;
      case 'undo': this.undo(); break;
      case 'redo': this.redo(); break;
      case 'add-page': this.addPageSheet(); break;
      case 'page-menu': this.pageMenu(); break;
      case 'add-panel': this.addPanel(); break;
      case 'add-milbil': this.pickMilbil(this.targetPanel()?.id); break;
      case 'add-words': this.addWords(); break;
      case 'add-caption': this.captionCard({ panelId: this.captionTarget()?.id }); break;
      case 'pnl-milbil': this.pickMilbil(this.sel?.id); break;
      case 'pnl-colour': this.panelColour(); break;
      case 'pnl-delete': case 'mb-delete': case 'w-delete': this.deleteSelection(); break;
      case 'mb-talk': this.wordsCard({ speakerId: this.sel?.id }); break;
      case 'mb-flip': case 'mb-bigger': case 'mb-smaller': case 'mb-front': this.mbAction(act); break;
      case 'w-edit': { const t = find(this.page, this.sel?.id)?.t; if (t) this.editWords(t); break; }
      case 'palette': this.palette(); break;
      case 'pen-colour': this.setColour(b.dataset.id, { quick: true }); break;
      case 'rub-all': this.rubAll(); break;
    }
  }

  onSlider(e){
    const el = e.target;
    const k = 1 / this.unitsPerPx();
    const dot = el.closest('.thick')?.querySelector('.dot');
    if (el.dataset.role === 'pen-size'){
      settings.pen.w = +el.value;
      dot?.style.setProperty('--s', `${clamp(settings.pen.w * k, 3, 36)}px`);
    }
    if (el.dataset.role === 'rub-size'){
      settings.rubber = +el.value;
      dot?.style.setProperty('--s', `${clamp(settings.rubber * k, 4, 44)}px`);
    }
  }

  onKey(e){
    if (!this.book || this.sheet.open || document.querySelector('.card-wrap')) return;
    if (e.target.closest?.('input, textarea, select')) return;
    const mod = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();
    if (mod && key === 'z'){ e.preventDefault(); if (e.shiftKey) this.redo(); else this.undo(); }
    else if (mod && key === 'y'){ e.preventDefault(); this.redo(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel){ e.preventDefault(); this.deleteSelection(); }
    else if (e.key === 'Escape'){ this.select(null); }
  }

  select(sel){
    this.sel = sel;
    if (sel?.type === 'panel') this.lastPanel = sel.id;
    else if (sel){ const f = find(this.page, sel.id); if (f) this.lastPanel = f.panel.id; }
    this.renderSel();
    this.renderCtx();
  }

  // ---------------------------------------------------------------- panels

  addPanel(){
    const page = this.page;
    if (page.kind === 'cover'){
      toast('The cover has one big space for milbils. Panels go on the pages inside.');
      sfx('nope');
      return;
    }
    const spot = spotForPanel(page);
    if (!spot){
      toast('No room for another panel. Make one smaller first, or add a new page.');
      sfx('nope');
      return;
    }
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    const before = this.snap();
    const p = newPanel([spot.x, spot.y, spot.w, spot.h]);
    page.panels.push(p);
    this.commit(before);
    this.renderPage();
    this.select({ type: 'panel', id: p.id });
    sfx('pop');
  }

  panelColour(){
    const p = this.panel(this.sel?.id);
    if (!p) return;
    this.sheet.show({
      key: 'bg', icon: '🎨', title: 'Panel colour', sub: 'What is behind the milbils in this panel.',
      render: () => `<div class="bg-grid">${PANEL_BGS.map(b => `
        <button type="button" class="bg-tile${p.bg === b.id ? ' on' : ''}" data-act="bg" data-id="${b.id}">
          <i style="background:${b.css}"></i><b>${b.name}</b></button>`).join('')}</div>`,
      onAct: (act, id) => {
        if (act !== 'bg') return;
        const before = this.snap();
        p.bg = id;
        this.commit(before);
        this.renderPage();
        this.sheet.close();
        sfx('pick');
      },
    });
  }

  // --------------------------------------------------------------- milbils

  pickMilbil(panelId = null){
    const tile = (c) => `<button type="button" class="cast-tile" data-act="who" data-id="${c.id}">
      <span class="cast-pic">${castHTML(c.id)}</span><b>${esc(c.name)}</b></button>`;
    this.sheet.show({
      key: 'pick', cls: 'tall', icon: '👾', title: 'Who goes in?',
      sub: 'Tap a milbil to put them in the panel. You can move them about afterwards.',
      render: () => `<h3 class="sheet-h">Greta's drawings</h3>
        <div class="cast-grid">${CAST.filter(c => c.greta).map(tile).join('')}</div>
        <h3 class="sheet-h">From the other milbil games</h3>
        <div class="cast-grid">${CAST.filter(c => !c.greta).map(tile).join('')}</div>`,
      onAct: (act, id) => {
        if (act !== 'who') return;
        this.sheet.close();
        this.putMilbil(panelId, id);
      },
    });
  }

  /**
   * Put somebody in a panel. If there is no panel on the page at all, one is
   * made just the right size for them; if the panel is too small, it grows.
   */
  putMilbil(panelId, whoId){
    const page = this.page;
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    const before = this.snap();
    let p = (panelId && this.panel(panelId)) || this.targetPanel();
    let made = false;
    if (!p){
      const need = roomFor({ cast: [] }, whoId);
      const spot = firstFit(page, need.w, need.h) || spotForPanel(page, { want: 24 });
      if (!spot){ toast('There is no room on this page for a panel. Try a new page!'); sfx('nope'); return; }
      p = newPanel([spot.x, spot.y, spot.w, spot.h]);
      page.panels.push(p);
      made = true;
    }
    const { m, grew } = addMilbil(page, p, whoId);
    this.commit(before);
    this.lastPanel = p.id;
    if (grew){
      this.view.flags[p.id] = 'grew';
      setTimeout(() => {
        if (this.view?.flags[p.id] !== 'grew') return;
        delete this.view.flags[p.id];
        this.renderPage();
      }, 900);
    }
    this.renderPage();
    this.select({ type: 'mb', id: m.id });
    const me = this.view.mbEls.get(m.id);
    me?.classList.add('pop');
    setTimeout(() => me?.classList.remove('pop'), 650);
    sfx(grew || made ? 'grow' : 'pop');
    const name = esc(who(whoId).name);
    if (made) toast(`A new panel, just the right size for ${name}.`);
    else if (grew) toast(`The panel grew to make room for ${name}.`);
  }

  mbAction(act){
    const page = this.page;
    const f = find(page, this.sel?.id);
    if (!f?.m) return;
    const { m, panel } = f;
    const before = this.snap();
    let grew = false;
    if (act === 'mb-flip') m.flip = !m.flip;
    if (act === 'mb-front') panel.cast = [...panel.cast.filter(x => x !== m), m];
    if (act === 'mb-smaller') m.h = Math.round(Math.max(MB_MIN, m.h / 1.2));
    if (act === 'mb-bigger'){
      const want = Math.round(m.h * 1.2);
      if (panel.frameless) m.h = Math.min(want, 1450);
      else {
        // a bigger milbil makes the panel grow too, if there is room for it to
        grew = growToFit(page, panel, panel.w, Math.ceil((want + 2 * GUT + 30) / CH - 0.04));
        m.h = Math.min(want, Math.round(box(panel).h));
      }
    }
    fitContents(panel);
    if (!this.commit(before)){ sfx('nope'); toast("That's as big as this panel can fit."); return; }
    this.renderPage();
    this.renderCtx();
    sfx(grew ? 'grow' : act === 'mb-flip' ? 'pick' : 'tap');
  }

  // ----------------------------------------------------------------- words

  addWords(){
    const page = this.page;
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    if (this.sel?.type === 'mb' && find(page, this.sel.id)?.m){ this.wordsCard({ speakerId: this.sel.id }); return; }
    if (!page.panels.length){ toast('Put a panel on the page first — tap 🔲 Panel.'); sfx('nope'); return; }
    const everyone = this.panelsInOrder().flatMap((p, i) => p.cast.map(m => ({ m, i })));
    if (!everyone.length){ this.captionCard({ panelId: this.captionTarget()?.id }); return; }
    this.sheet.show({
      key: 'talk', icon: '💬', title: "Who's talking?", sub: 'Pick somebody on this page, or make a caption box.',
      render: () => `<div class="cast-grid">${everyone.map(({ m, i }) => `
        <button type="button" class="cast-tile" data-act="talk" data-id="${m.id}">
          <span class="cast-pic${m.flip ? ' flip' : ''}">${castHTML(m.who)}</span>
          <b>${esc(who(m.who).name)}</b><small>panel ${i + 1}</small></button>`).join('')}
        <button type="button" class="cast-tile cap" data-act="caption">
          <span class="cast-pic icon">📜</span><b>A caption</b><small>nobody talking</small></button></div>`,
      onAct: (act, id) => {
        this.sheet.close();
        if (act === 'talk') this.wordsCard({ speakerId: id });
        if (act === 'caption') this.captionCard({ panelId: this.captionTarget()?.id });
      },
    });
  }

  /** Type some words: new ones for a milbil or a caption, or change ones already there. */
  async wordsCard({ t = null, speakerId = null, panelId = null } = {}){
    const page = this.page;
    const speaker = speakerId ? findMilbil(page, speakerId) : (t?.from ? findMilbil(page, t.from) : null);
    const panel = (t && find(page, t.id)?.panel) || (speaker && find(page, speaker.id)?.panel) || this.panel(panelId) || this.targetPanel();
    if (!panel) return;
    let kind = t?.kind || (speaker ? 'say' : 'caption');
    let size = t?.size || 'm';
    let text = t?.text || '';
    const kinds = speaker ? KINDS.filter(k => k.id !== 'caption') : [];
    const name = speaker ? esc(who(speaker.who).name) : '';
    const html = `
      <div class="wc-top">
        <span class="wc-pic">${speaker ? `<span class="${speaker.flip ? 'flip' : ''}">${castHTML(speaker.who)}</span>` : '📜'}</span>
        <h3>${speaker ? `What does ${name} say?` : 'What does the caption say?'}</h3>
      </div>
      <textarea class="in wc-text" maxlength="160" rows="3" placeholder="${speaker ? 'Type it here…' : 'Meanwhile, at the beach…'}">${esc(text)}</textarea>
      ${kinds.length ? `<div class="wc-row">${kinds.map(k =>
        `<button type="button" class="chip${k.id === kind ? ' on' : ''}" data-kind="${k.id}">${k.icon} ${k.name}</button>`).join('')}</div>` : ''}
      <div class="wc-row"><span class="wc-label">Size</span>${['s', 'm', 'l'].map(z =>
        `<button type="button" class="chip sz sz-${z}${z === size ? ' on' : ''}" data-size="${z}" aria-label="${{ s: 'Small', m: 'Middle', l: 'Big' }[z]} words">A</button>`).join('')}</div>`;
    const buttons = t
      ? [{ label: '🗑️ Throw away', cls: 'ghost', value: 'delete' }, { label: 'Done ✓', cls: 'go', value: 'ok' }]
      : [{ label: 'Cancel', cls: 'ghost', value: 'cancel' }, { label: 'Done ✓', cls: 'go', value: 'ok' }];

    const out = await card(html, buttons, {
      top: true, cls: 'words-card',
      onOpen: (wrap) => {
        const ta = wrap.querySelector('textarea');
        setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 80);
        ta.addEventListener('input', () => { text = ta.value; });
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); wrap.querySelector('.btn.go').click(); }
        });
        wrap.addEventListener('click', (e) => {
          const k = e.target.closest('[data-kind]'), z = e.target.closest('[data-size]');
          if (k){ kind = k.dataset.kind; wrap.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('on', b === k)); sfx('pick'); }
          if (z){ size = z.dataset.size; wrap.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('on', b === z)); sfx('pick'); }
        });
      },
    });

    if (!this.book) return;
    if (out === 'delete' && t){ this.select({ type: 'w', id: t.id }); this.deleteSelection(); return; }
    if (out !== 'ok') return;
    text = text.trim().slice(0, 160);
    if (!text){
      if (t){ this.select({ type: 'w', id: t.id }); this.deleteSelection(); }
      return;
    }
    const { w, h } = measure(text, kind, size);
    const before = this.snap();
    let target = t;
    if (t){
      Object.assign(t, { text, kind, size, w, h });
      keepWordsOnPage(t, box(panel));
    } else {
      target = { id: uid(), kind, size, text, w, h, x: 0, y: 0, from: speaker?.id || null };
      panel.words.push(target);
      placeWords(panel, target, speaker);
    }
    this.commit(before);
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    this.renderPage();
    this.select({ type: 'w', id: target.id });
    sfx('words');
  }

  /** Tapping some words to change them: a caption has its own card. */
  editWords(t){
    if (t.kind === 'caption') this.captionCard({ t });
    else this.wordsCard({ t });
  }

  /** Where a new caption goes, if nobody said: the panel picked up, else the first one without one. */
  captionTarget(){
    const s = this.sel;
    if (s?.type === 'panel'){ const p = this.panel(s.id); if (p) return p; }
    if (s){ const f = find(this.page, s.id); if (f) return f.panel; }
    const order = this.panelsInOrder();
    return order.find(p => !p.words.some(t => t.kind === 'caption')) || order[0] || null;
  }

  /**
   * Add a caption, or change one: the words, which panel it is in, whether it
   * runs along the top or the bottom of the panel or is a box that can go
   * anywhere, its colour and how big the writing is.
   */
  async captionCard({ t = null, panelId = null } = {}){
    const page = this.page;
    if (this.mode !== 'move') this.setMode('move', { quiet: true });
    if (!page.panels.length){
      toast('Put a panel on the page first — tap 🔲 Panel — and then a caption in it.');
      sfx('nope');
      return;
    }
    const found = t ? find(page, t.id) : null;
    let panel = found?.panel || this.panel(panelId) || this.captionTarget();
    let text = t?.text || '';
    let at = t ? (isStrip(t) ? t.at : 'free') : 'bottom';
    let fill = t?.fill || 'yellow';
    let size = t?.size || 'm';
    const order = this.panelsInOrder();

    const map = order.length > 1 ? `
      <div class="cap-which"><span class="wc-label">Which panel?</span>
        <span class="cap-map">${order.map((p, i) => `<button type="button" class="cap-pnl${p === panel ? ' on' : ''}" data-pick="${p.id}"
          style="left:${p.x / COLS * 100}%;top:${p.y / ROWS * 100}%;width:${p.w / COLS * 100}%;height:${p.h / ROWS * 100}%"
          aria-label="Panel ${i + 1}">${i + 1}</button>`).join('')}</span></div>` : '';
    const html = `
      <div class="wc-top"><span class="wc-pic">📜</span>
        <h3>${t ? 'Change the caption' : 'Add a caption'}<small>Words with nobody talking, like a storyteller.</small></h3></div>
      ${map}
      <textarea class="in wc-text" maxlength="200" rows="3" placeholder="Meanwhile, at the beach…">${esc(text)}</textarea>
      <div class="wc-row"><span class="wc-label">Where</span>
        <button type="button" class="chip${at === 'top' ? ' on' : ''}" data-at="top">⬆️ Top</button>
        <button type="button" class="chip${at === 'bottom' ? ' on' : ''}" data-at="bottom">⬇️ Bottom</button>
        <button type="button" class="chip${at === 'free' ? ' on' : ''}" data-at="free">✋ Anywhere</button></div>
      <div class="wc-row"><span class="wc-label">Colour</span>${CAPTION_FILLS.map(c =>
        `<button type="button" class="sw${c.id === fill ? ' on' : ''}" data-fill="${c.id}" style="--c:${c.css}" aria-label="${c.name}"></button>`).join('')}</div>
      <div class="wc-row"><span class="wc-label">Size</span>${['s', 'm', 'l'].map(z =>
        `<button type="button" class="chip sz sz-${z}${z === size ? ' on' : ''}" data-size="${z}" aria-label="${{ s: 'Small', m: 'Middle', l: 'Big' }[z]} words">A</button>`).join('')}</div>`;
    const buttons = t
      ? [{ label: '🗑️ Throw away', cls: 'ghost', value: 'delete' }, { label: 'Done ✓', cls: 'go', value: 'ok' }]
      : [{ label: 'Cancel', cls: 'ghost', value: 'cancel' }, { label: 'Done ✓', cls: 'go', value: 'ok' }];

    const out = await card(html, buttons, {
      top: true, cls: 'words-card caption-card',
      onOpen: (wrap) => {
        const ta = wrap.querySelector('textarea');
        setTimeout(() => { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }, 80);
        ta.addEventListener('input', () => { text = ta.value; });
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); wrap.querySelector('.btn.go').click(); }
        });
        wrap.addEventListener('click', (e) => {
          const pick = e.target.closest('[data-pick]'), w = e.target.closest('[data-at]');
          const c = e.target.closest('[data-fill]'), z = e.target.closest('[data-size]');
          const mark = (sel, el) => wrap.querySelectorAll(sel).forEach(b => b.classList.toggle('on', b === el));
          if (pick){ panel = this.panel(pick.dataset.pick) || panel; mark('[data-pick]', pick); sfx('pick'); }
          if (w){ at = w.dataset.at; mark('[data-at]', w); sfx('pick'); }
          if (c){ fill = c.dataset.fill; mark('[data-fill]', c); sfx('pick'); }
          if (z){ size = z.dataset.size; mark('[data-size]', z); sfx('pick'); }
        });
      },
    });

    if (!this.book) return;
    if (out === 'delete' && t){ this.select({ type: 'w', id: t.id }); this.deleteSelection(); return; }
    if (out !== 'ok') return;
    text = text.trim().slice(0, 200);
    if (!text){
      if (t){ this.select({ type: 'w', id: t.id }); this.deleteSelection(); }
      return;
    }

    const before = this.snap();
    let c = t;
    if (!c){
      c = { id: uid(), kind: 'caption', from: null, x: 0, y: 0 };
      panel.words.push(c);
    } else if (found.panel !== panel){
      found.panel.words = found.panel.words.filter(x => x !== c);
      panel.words.push(c);
    }
    const wasFree = t && !isStrip(t);
    Object.assign(c, { text, size, fill });
    let grew = false;
    if (at === 'free'){
      for (const k of ['at', 'sw', 'sh', 'mw', 'framed']) delete c[k];
      const B = box(panel);
      Object.assign(c, measure(text, 'caption', size, Math.min(MAX_W.caption, Math.max(120, B.w - 80))));
      if (wasFree && found.panel === panel) keepWordsOnPage(c, B);
      else placeWords(panel, c, null);
    } else {
      const moved = !t || c.at !== at || found.panel !== panel;
      c.at = at;
      this.measureCaption(panel, c);
      layoutCaptions(panel);
      // a new strip, or one moved somewhere else, makes room for itself
      if (moved && makeRoomForCaption(page, panel, c) === 'grew'){ grew = true; this.layoutCaptions(); }
    }
    this.commit(before);
    this.renderPage();
    this.select({ type: 'w', id: c.id });
    sfx(grew ? 'grow' : 'words');
    if (grew) toast('The panel grew to make room for the caption.');
  }

  deleteSelection(){
    const s = this.sel;
    if (!s) return;
    const page = this.page;
    const before = this.snap();
    let msg = '';
    if (s.type === 'panel'){
      const p = this.panel(s.id);
      if (!p || p.fixed) return;
      page.panels = page.panels.filter(x => x !== p);
      msg = 'Panel thrown away.';
    } else {
      const f = find(page, s.id);
      if (!f) return;
      if (f.m){
        f.panel.cast = f.panel.cast.filter(x => x !== f.m);
        f.panel.words = f.panel.words.filter(t => t.from !== f.m.id);
        msg = `${esc(who(f.m.who).name)} has gone.`;
      } else {
        f.panel.words = f.panel.words.filter(x => x !== f.t);
        msg = 'Words thrown away.';
      }
    }
    this.sel = null;
    this.commit(before);
    const mark = this.past.length;
    this.renderPage();
    this.renderCtx();
    sfx('bin');
    toast(msg, { undo: () => { if (this.past.length === mark) this.undo(); } });
  }

  // ------------------------------------------------------------------- ink

  palette(){
    const pen = settings.pen;
    this.sheet.show({
      key: 'pens', icon: '🎨', title: 'Pens and colours',
      sub: 'Pick a colour and a pen, and whether it draws in front of the milbils or behind them.',
      render: () => `
        <div class="swatches pal">${PEN_COLOURS.map(c =>
          `<button type="button" class="sw big${c === pen.c ? ' on' : ''}" data-act="colour" data-id="${c}" style="--c:${c}" aria-label="Colour"></button>`).join('')}
          <label class="sw big any" title="Any colour at all"><input type="color" value="${/^#[0-9a-f]{6}$/i.test(pen.c) ? pen.c : '#2b2233'}" aria-label="Any colour at all"><span>🌈</span></label></div>
        <h3 class="sheet-h">Pen</h3>
        <div class="opts2">
          <button type="button" class="opt2${!pen.g ? ' on' : ''}" data-act="kind" data-id="pen"><i>✏️</i><b>Pen</b><small>An ordinary line.</small></button>
          <button type="button" class="opt2${pen.g ? ' on' : ''}" data-act="kind" data-id="glow"><i>✨</i><b>Glow pen</b><small>Glows like Greta's milbils.</small></button>
        </div>
        <h3 class="sheet-h">Where it goes</h3>
        <div class="opts2">
          <button type="button" class="opt2${!pen.b ? ' on' : ''}" data-act="layer" data-id="front"><i>⬆️</i><b>In front</b><small>On top of everything.</small></button>
          <button type="button" class="opt2${pen.b ? ' on' : ''}" data-act="layer" data-id="back"><i>⬇️</i><b>Behind</b><small>Behind the milbils: skies, grass, houses.</small></button>
        </div>`,
      onAct: (act, id) => {
        if (act === 'colour'){ this.setColour(id); this.sheet.close(); return; }
        if (act === 'kind') pen.g = id === 'glow';
        if (act === 'layer') pen.b = id === 'back';
        saveSettings();
        sfx('pick');
        this.sheet.render();
        this.renderCtx();
      },
      onChange: (el) => { if (el.type === 'color'){ this.setColour(el.value); this.sheet.close(); } },
    });
  }

  /**
   * A colour from the big palette joins the quick ones in the pen's row. One
   * tapped *in* that row stays where it is, so the row doesn't shuffle about
   * under a finger.
   */
  setColour(c, { quick = false } = {}){
    settings.pen.c = c;
    if (!quick || !settings.recent.includes(c)) settings.recent = [c, ...settings.recent.filter(x => x !== c)].slice(0, 6);
    saveSettings();
    this.renderCtx();
    sfx('pick');
  }

  rubAll(){
    const page = this.page;
    if (!page.ink.length){ toast('Nothing has been drawn on this page yet.'); sfx('nope'); return; }
    const before = page.ink.slice();
    page.ink = [];
    this.push({ kind: 'ink', pid: page.id, before, after: [] });
    const mark = this.past.length;
    this.view.paintInk();
    this.changed();
    sfx('bin');
    toast('All the drawing on this page is rubbed out.', { undo: () => { if (this.past.length === mark) this.undo(); } });
  }

  // ================================================== fingers on the page ===

  bindPage(el){
    el.addEventListener('pointerdown', (e) => this.onDown(e));
    el.addEventListener('pointermove', (e) => this.onMove(e));
    el.addEventListener('pointerup', (e) => this.onUp(e));
    el.addEventListener('pointercancel', (e) => this.onUp(e));
    el.addEventListener('lostpointercapture', (e) => { if (this.drag && e.pointerId === this.drag.pid) this.onUp(e); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('dragstart', (e) => e.preventDefault());
    // Everything on the page is done with pointer events. A finger also gets a
    // 'click' a moment after it lifts, aimed at whatever is under it by then —
    // which, if the tap just opened a sheet or a card, is the sheet or the card.
    // Nothing on the page wants that click, so it is never sent.
    el.addEventListener('touchend', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  }

  toUnits(e){
    const r = this.view.el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width * PAGE_W, y: (e.clientY - r.top) / r.height * PAGE_H };
  }

  contentOf(p){ return { cast: p.cast.map(m => ({ ...m })), words: p.words.map(t => ({ ...t })) }; }
  putContentBack(p, c){ p.cast = c.cast.map(m => ({ ...m })); p.words = c.words.map(t => ({ ...t })); }

  onDown(e){
    if (this.drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    try { this.view.el.setPointerCapture(e.pointerId); } catch {}
    const u = this.toUnits(e);
    if (this.mode !== 'move'){ this.startInk(e, u); return; }

    const page = this.page;
    const t = e.target;
    const d = { pid: e.pointerId, x0: e.clientX, y0: e.clientY, start: u, moved: false, kind: 'none' };
    this.drag = d;

    const h = t.closest('[data-h]');
    if (h){
      if (h.dataset.h === 'mb' && this.sel?.type === 'mb'){
        const m = find(page, this.sel.id)?.m;
        if (m){
          const anchor = { x: m.x, y: m.y };
          Object.assign(d, { kind: 'mb-size', id: m.id, h0: m.h, anchor, d0: Math.max(30, Math.hypot(u.x - anchor.x, u.y - anchor.y)) });
        }
      } else if (this.sel?.type === 'panel'){
        const p = this.panel(this.sel.id);
        if (p) Object.assign(d, { kind: 'pnl-size', id: p.id, corner: h.dataset.h, p0: { ...p }, content: this.contentOf(p), grid: true });
      }
      return;
    }

    const w = t.closest('[data-w]');
    if (w){
      const f = find(page, w.dataset.w);
      if (f?.t){
        const again = this.sel?.id === f.t.id;
        this.select({ type: 'w', id: f.t.id });
        Object.assign(d, { kind: 'w-move', id: f.t.id, tx: f.t.x, ty: f.t.y, again });
      }
      return;
    }

    const mb = t.closest('[data-mb]');
    if (mb){
      const f = find(page, mb.dataset.mb);
      if (f?.m){
        this.select({ type: 'mb', id: f.m.id });
        const said = f.panel.words.filter(x => x.from === f.m.id).map(x => ({ id: x.id, x: x.x, y: x.y }));
        Object.assign(d, { kind: 'mb-move', id: f.m.id, mx: f.m.x, my: f.m.y, said, from: f.panel.id });
      }
      return;
    }

    const add = t.closest('[data-add]');
    const pnl = t.closest('[data-pnl]');
    if (add || pnl){
      const p = this.panel(add ? add.dataset.add : pnl.dataset.pnl);
      if (p){
        this.select({ type: 'panel', id: p.id });
        Object.assign(d, { kind: p.fixed ? 'none' : 'pnl-move', id: p.id, p0: { ...p }, content: this.contentOf(p), add: !!add, grid: !p.fixed });
      }
      return;
    }

    if (t.closest('[data-cover]')){ d.kind = 'cover-title'; return; }
    this.select(null);
  }

  onMove(e){
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    if (d.kind === 'ink'){ this.moveInk(e); return; }
    if (!d.moved){
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < TAP) return;
      if (d.kind === 'none' || d.kind === 'cover-title') return;
      d.moved = true;
      d.before = this.snap();
      if (d.kind === 'mb-move'){ this.view.flags[d.from] = 'lift'; }
    }
    const u = this.toUnits(e);
    const page = this.page;

    switch (d.kind){
      case 'pnl-move': {
        const p = this.panel(d.id);
        const dx = Math.round((u.x - d.start.x) / CW), dy = Math.round((u.y - d.start.y) / CH);
        const r = moveTarget(page, d.p0, dx, dy);
        if (r && (r.x !== p.x || r.y !== p.y)){
          p.x = r.x; p.y = r.y;
          this.putContentBack(p, d.content);
          shiftContents(p, (r.x - d.p0.x) * CW, (r.y - d.p0.y) * CH);
          sfx('snap');
        }
        this.renderPage();
        break;
      }
      case 'pnl-size': {
        const p = this.panel(d.id);
        const gx = Math.round((u.x - SIDE) / CW), gy = Math.round((u.y - TOP) / CH);
        const r = resizeTarget(page, d.p0, d.corner, gx, gy);
        if (r && (r.x !== p.x || r.y !== p.y || r.w !== p.w || r.h !== p.h)){
          Object.assign(p, r);
          this.putContentBack(p, d.content);
          fitContents(p);
          sfx('snap');
        }
        this.renderPage();
        break;
      }
      case 'mb-move': {
        const f = find(page, d.id);
        if (!f) break;
        f.m.x = Math.round(clamp(d.mx + u.x - d.start.x, 0, PAGE_W));
        f.m.y = Math.round(clamp(d.my + u.y - d.start.y, f.m.h * 0.4, PAGE_H + f.m.h * 0.3));
        for (const s of d.said){
          const t = f.panel.words.find(x => x.id === s.id);
          if (t){ t.x = s.x + (f.m.x - d.mx); t.y = s.y + (f.m.y - d.my); keepWordsOnPage(t); }
        }
        const over = panelAt(page, f.m.x, f.m.y - f.m.h / 2);
        for (const id of Object.keys(this.view.flags)) if (this.view.flags[id] === 'drop') delete this.view.flags[id];
        if (over && over.id !== d.from) this.view.flags[over.id] = 'drop';
        this.renderPage();
        break;
      }
      case 'mb-size': {
        const f = find(page, d.id);
        if (!f) break;
        const dist = Math.hypot(u.x - d.anchor.x, u.y - d.anchor.y);
        const top = f.panel.frameless ? 1450 : box(f.panel).h;
        f.m.h = Math.round(clamp(d.h0 * dist / d.d0, MB_MIN, top));
        this.renderPage();
        break;
      }
      case 'w-move': {
        const f = find(page, d.id);
        if (!f) break;
        if (isStrip(f.t)){
          // A strip doesn't float about: it jumps to the top or the bottom of
          // whichever panel the finger is over.
          const over = panelAt(page, u.x, u.y) || f.panel;
          const B = box(over);
          const at = u.y < B.y + B.h / 2 ? 'top' : 'bottom';
          if (over !== f.panel || at !== f.t.at){
            if (over !== f.panel){ f.panel.words = f.panel.words.filter(x => x !== f.t); over.words.push(f.t); }
            f.t.at = at;
            sfx('snap');
          }
          this.renderPage();
          break;
        }
        f.t.x = d.tx + (u.x - d.start.x);
        f.t.y = d.ty + (u.y - d.start.y);
        keepWordsOnPage(f.t);
        this.renderPage();
        break;
      }
    }
  }

  onUp(e){
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    this.drag = null;
    try { this.view.el.releasePointerCapture(e.pointerId); } catch {}
    if (d.kind === 'ink'){ this.endInk(d); return; }
    this.view.flags = {};
    const page = this.page;

    if (!d.moved){
      // A tap.
      if (d.add) this.pickMilbil(d.id);
      else if (d.kind === 'w-move' && d.again){ const t = find(page, d.id)?.t; if (t) this.editWords(t); }
      else if (d.kind === 'cover-title') this.coverSheet();
      else if (d.grid) this.renderSel();
      return;
    }

    if (d.kind === 'mb-move'){
      const f = find(page, d.id);
      if (f){
        const to = panelAt(page, f.m.x, f.m.y - f.m.h / 2);
        if (to && to !== f.panel){ moveToPanel(f.panel, to, f.m); this.lastPanel = to.id; sfx('pop'); }
        else fitContents(f.panel);
      }
    }
    if (d.kind === 'mb-size'){ const f = find(page, d.id); if (f) fitContents(f.panel); }
    this.commit(d.before);
    this.renderPage();
    this.renderCtx();
  }

  startInk(e, u){
    const pen = settings.pen;
    if (this.mode === 'rubber' && !this.page.ink.some(s => !s.e)){
      // nothing drawn here, so nothing to rub out — and no point keeping the rubbing
      this.drag = { kind: 'none', pid: e.pointerId, moved: false };
      toast('There is no drawing on this page to rub out.');
      return;
    }
    const s = this.mode === 'rubber'
      ? { e: 1, w: settings.rubber, p: [Math.round(u.x), Math.round(u.y)] }
      : { c: pen.c, w: pen.w, p: [Math.round(u.x), Math.round(u.y)] };
    if (this.mode !== 'rubber'){ if (pen.g) s.g = 1; if (pen.b) s.b = 1; }
    this.drag = { kind: 'ink', pid: e.pointerId, s };
    this.view.beginLive();
    this.view.drawLive(s);
  }

  moveInk(e){
    const d = this.drag;
    const evs = e.getCoalescedEvents?.() || [];
    for (const ev of (evs.length ? evs : [e])){
      const u = this.toUnits(ev);
      const p = d.s.p;
      if (Math.hypot(u.x - p[p.length - 2], u.y - p[p.length - 1]) >= 2.5) p.push(Math.round(u.x * 10) / 10, Math.round(u.y * 10) / 10);
    }
    if (!this.inkFrame){
      this.inkFrame = requestAnimationFrame(() => {
        this.inkFrame = 0;
        if (this.drag?.kind === 'ink') this.view.drawLive(this.drag.s);
      });
    }
  }

  endInk(d){
    cancelAnimationFrame(this.inkFrame);
    this.inkFrame = 0;
    const s = d.s;
    s.p = simplify(s.p);
    this.view.drawLive(s);
    this.view.endLive();
    const page = this.page;
    page.ink.push(s);
    this.push({ kind: 'stroke', pid: page.id, stroke: s });
    this.changed();
  }
}
