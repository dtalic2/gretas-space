// ---------- Drawing a page ----------
//
// One PageView draws one page, at whatever size its box is. The editor, the
// reader, the page strip and the bookshelf all use it, so a page looks the same
// everywhere it turns up.
//
// Layers, bottom to top:
//
//   paper (or the cover's colour) and the cover's title
//   panel backgrounds
//   ink drawn *behind* the milbils
//   panels: the milbils in them, clipped to the frame, and the frame itself
//   speech bubbles (SVG), then the words in them (HTML)
//   ink drawn in front
//   the page number
//   the editor's selection handles
//
// Everything is placed in percentages of the page, and text is sized in --cq
// (a hundredth of the page's width: CSS container units where the browser has
// them, pixels worked out here where it doesn't), so nothing needs redoing when
// the page changes size — except the two canvases of ink, which are redrawn.
//
// Panels and milbils are kept between redraws rather than rebuilt, so dragging
// one about doesn't make Greta's pictures flicker.

import { PAGE_W, PAGE_H, TEXT_SIZE, box, mbWidth, bgCss, findMilbil } from './model.js';
import { castHTML } from './cast.js';
import { bubbleSVG } from './bubbles.js';
import { paintInk, drawStroke, usesLayer } from './ink.js';
import { esc } from './ui.js';

const pct = (v, of) => `${(v / of * 100).toFixed(3)}%`;
/** A size in page units, as CSS: some hundredths of the page's width. */
const cq = (units) => `calc(var(--cq) * ${(units / PAGE_W * 100).toFixed(3)})`;

/** Older browsers (Safari before 16) have no container units; the page tells them its size instead. */
const NO_CQ = !(window.CSS?.supports?.('width', '1cqw'));

/** Big for a short title, smaller for a long one, in page units. */
export function titleSize(title){
  const n = Math.max(8, (title || '').length);
  return Math.round(Math.max(66, Math.min(150, 150 * Math.sqrt(11 / n))));
}

export class PageView {
  constructor(host, { edit = false, thumb = false } = {}){
    this.edit = edit;
    this.thumb = thumb;
    this.page = null;
    const el = this.el = document.createElement('div');
    el.className = `pg${edit ? ' edit' : ''}${thumb ? ' thumb' : ''}`;
    el.innerHTML = `
      <div class="pg-deco"></div>
      <div class="pg-title"></div>
      <div class="pg-bgs"></div>
      <canvas class="pg-ink back"></canvas>
      <div class="pg-panels"></div>
      <svg class="pg-bubs" viewBox="0 0 ${PAGE_W} ${PAGE_H}" preserveAspectRatio="none" aria-hidden="true"></svg>
      <div class="pg-words"></div>
      <canvas class="pg-ink front"></canvas>
      <div class="pg-num"></div>
      <div class="pg-sel"></div>`;
    [, this.titleEl, this.bgsEl, this.backInk, this.panelsEl, this.bubsEl,
      this.wordsEl, this.frontInk, this.numEl, this.selEl] = el.children;
    this.panelEls = new Map();
    this.mbEls = new Map();
    this.flags = {};          // panel id -> extra class: 'lift' while dragging out, 'drop', 'grew'
    host.appendChild(el);

    // Ink is pixels, so it needs redrawing whenever the page changes size.
    this.inkSize = 0;
    if ('ResizeObserver' in window){
      this.ro = new ResizeObserver(() => { if (this.el.clientWidth !== this.inkSize) this.paintInk(); });
      this.ro.observe(el);
    }
  }

  destroy(){ this.ro?.disconnect(); this.el.remove(); }

  sizeUnit(){
    const w = this.el.clientWidth;
    if (w) this.el.style.setProperty('--cq', `${w / 100}px`);
  }

  /** Draw a page. `num` is its page number; the cover has none. */
  render(page, { book, num = 0 } = {}){
    const fresh = this.page !== page;
    if (NO_CQ) this.sizeUnit();
    this.page = page;
    const cover = page.kind === 'cover';
    this.el.classList.toggle('cover', cover);
    this.el.style.setProperty('--paper', cover ? (book?.color || '#7b5cff') : '#fffdf8');

    if (cover){
      const t = book?.title || 'My Book';
      this.titleEl.innerHTML = `<h1${this.edit ? ' data-cover="1"' : ''} style="font-size:${cq(titleSize(t))}">${esc(t)}</h1>`;
      this.numEl.innerHTML = book?.author ? `<span class="by" style="font-size:${cq(44)}">by ${esc(book.author)}</span>` : '';
    } else {
      this.titleEl.innerHTML = '';
      this.numEl.innerHTML = `<span class="n" style="font-size:${cq(36)}">${num}</span>`;
    }

    this.renderPanels(page);
    this.renderWords(page);
    if (fresh || this.el.clientWidth !== this.inkSize) this.paintInk();
  }

  renderPanels(page){
    const bgs = [];
    const seenP = new Set(), seenM = new Set();
    page.panels.forEach((p, i) => {
      const b = box(p);
      const pos = `left:${pct(b.x, PAGE_W)};top:${pct(b.y, PAGE_H)};width:${pct(b.w, PAGE_W)};height:${pct(b.h, PAGE_H)}`;
      bgs.push(`<div class="pbg" style="${pos};background:${bgCss(p.bg)}"></div>`);

      let pe = this.panelEls.get(p.id);
      if (!pe){
        pe = document.createElement('div');
        pe.innerHTML = '<div class="pnl-in"></div>';
        this.panelEls.set(p.id, pe);
      }
      pe.className = `pnl${p.frameless ? ' frameless' : ''}${this.flags[p.id] ? ` ${this.flags[p.id]}` : ''}`;
      pe.dataset.pnl = p.id;
      pe.style.cssText = pos;
      if (this.panelsEl.children[i] !== pe) this.panelsEl.insertBefore(pe, this.panelsEl.children[i] || null);
      seenP.add(p.id);

      const inner = pe.firstElementChild;
      p.cast.forEach((m, j) => {
        let me = this.mbEls.get(m.id);
        if (!me || me.dataset.who !== m.who){
          const made = document.createElement('div');
          made.className = 'mb';
          made.dataset.mb = m.id;
          made.dataset.who = m.who;
          made.innerHTML = `<div class="mb-pic">${castHTML(m.who)}</div>`;
          if (me) me.replaceWith(made);
          me = made;
          this.mbEls.set(m.id, me);
        }
        const w = mbWidth(m);
        me.style.cssText = `left:${pct(m.x - w / 2 - b.x, b.w)};top:${pct(m.y - m.h - b.y, b.h)};` +
          `width:${pct(w, b.w)};height:${pct(m.h, b.h)}`;
        me.classList.toggle('flip', !!m.flip);
        if (inner.children[j] !== me) inner.insertBefore(me, inner.children[j] || null);
        seenM.add(m.id);
      });

      // An empty panel in the editor gets a big button to put somebody in it.
      const add = pe.querySelector(':scope > .pnl-add');
      const wantAdd = this.edit && !p.cast.length;
      if (wantAdd && !add){
        pe.insertAdjacentHTML('beforeend', `<button type="button" class="pnl-add" data-add="${p.id}">
          <i>👾</i><span>Add a milbil</span></button>`);
      } else if (!wantAdd && add) add.remove();
      if (wantAdd) pe.classList.toggle('tiny', b.w < 300 || b.h < 220);
    });
    for (const [id, n] of this.panelEls) if (!seenP.has(id)){ n.remove(); this.panelEls.delete(id); }
    for (const [id, n] of this.mbEls) if (!seenM.has(id)){ n.remove(); this.mbEls.delete(id); }
    this.bgsEl.innerHTML = bgs.join('');
  }

  renderWords(page){
    const shapes = [], texts = [];
    for (const p of page.panels){
      for (const t of p.words){
        const speaker = t.from ? findMilbil(page, t.from) : null;
        shapes.push(bubbleSVG(t, speaker, { hit: this.edit }));
        const tw = t.w + 8;
        texts.push(`<div class="btxt ${t.kind}"${this.edit ? ` data-w="${t.id}"` : ''} data-say="${t.id}" style="` +
          `left:${pct(t.x - tw / 2, PAGE_W)};top:${pct(t.y - t.h / 2, PAGE_H)};width:${pct(tw, PAGE_W)};` +
          `font-size:${cq(TEXT_SIZE[t.size] || TEXT_SIZE.m)}">${esc(t.text)}</div>`);
      }
    }
    this.bubsEl.innerHTML = shapes.join('');
    this.wordsEl.innerHTML = texts.join('');
  }

  // ------------------------------------------------------------------ ink ---

  paintInk(){
    const w = this.el.clientWidth;
    this.inkSize = w;
    if (NO_CQ) this.sizeUnit();
    if (!w || !this.page) return;
    const dpr = Math.min(window.devicePixelRatio || 1, this.thumb ? 2 : 2.5);
    const W = Math.max(1, Math.round(w * dpr)), H = Math.round(W * PAGE_H / PAGE_W);
    const ink = this.page.ink;
    for (const [c, layer] of [[this.backInk, 'back'], [this.frontInk, 'front']]){
      const used = ink.length && (usesLayer(ink, layer) || this.edit);
      // A sheet with nothing on it is shrunk to one pixel rather than kept at
      // full size: thumbnails would otherwise hold two big canvases each.
      const cw = used ? W : 1, ch = used ? H : 1;
      if (c.width !== cw || c.height !== ch){ c.width = cw; c.height = ch; }
      if (used) paintInk(c, ink, layer);
      else c.getContext('2d').clearRect(0, 0, 1, 1);
    }
  }

  /**
   * Live drawing. The ink as it was before the line started is copied aside;
   * every frame puts the copy back and draws the whole line so far on top. It
   * keeps the glow pen's haze from piling up where the line overlaps itself,
   * and lets the rubber show what it is rubbing out as it goes.
   */
  beginLive(){
    const w = this.el.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const W = Math.max(1, Math.round(w * dpr)), H = Math.round(W * PAGE_H / PAGE_W);
    this.live = [this.backInk, this.frontInk].map(c => {
      if (c.width !== W || c.height !== H){
        const old = c.width > 1 ? c : null;
        const copy = old ? Object.assign(document.createElement('canvas'), { width: old.width, height: old.height }) : null;
        copy?.getContext('2d').drawImage(old, 0, 0);
        c.width = W; c.height = H;
        if (copy) c.getContext('2d').drawImage(copy, 0, 0, W, H);
      }
      const snap = Object.assign(document.createElement('canvas'), { width: W, height: H });
      snap.getContext('2d').drawImage(c, 0, 0);
      return snap;
    });
  }

  drawLive(stroke){
    if (!this.live) return;
    [[this.backInk, 'back'], [this.frontInk, 'front']].forEach(([c, layer], i) => {
      if (!stroke.e && !!stroke.b !== (layer === 'back')) return;
      const ctx = c.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(this.live[i], 0, 0);
      drawStroke(ctx, stroke, c.width / PAGE_W);
    });
  }

  endLive(){ this.live = null; }
}

/** A small, still picture of a page, for the strip and the shelf. */
export function thumb(host, page, book, num){
  const v = new PageView(host, { thumb: true });
  v.render(page, { book, num });
  return v;
}
