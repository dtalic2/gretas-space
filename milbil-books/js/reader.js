// ---------- Reading a book ----------
//
// The Library's reader: one page at a time, as big as the screen allows. Swipe,
// tap the arrows or use the arrow keys to turn the page. After the last page
// comes The End.
//
// Along the bottom: 🔊 Read Aloud, which reads the whole book out from wherever
// you are (see aloud.js), lighting up each bubble and caption as it goes and
// turning the pages itself; and ✏️ Edit, which opens the book straight back up
// in Create, whenever you like.

import { allPages } from './model.js';
import { PageView } from './view.js';
import { linesFor, say, wake, hush, canSpeak } from './aloud.js';
import { $, esc, sfx, plural, toast } from './ui.js';

export class Reader {
  constructor(root, hooks){
    this.root = root;
    this.hooks = hooks;              // { edit(book), bin(book), close() }
    this.book = null;
    this.at = 0;
    root.innerHTML = `
      <div class="rd">
        <header class="rd-top">
          <button type="button" class="ed-btn" data-act="close" aria-label="Back to the library">✕</button>
          <div class="rd-name"><b></b><small></small></div>
          <button type="button" class="ed-btn" data-act="bin" aria-label="Throw this book away" title="Throw this book away">🗑️</button>
        </header>
        <section class="rd-stage">
          <button type="button" class="rd-arrow prev" data-act="prev" aria-label="Previous page">‹</button>
          <div class="rd-host"></div>
          <div class="rd-end" hidden></div>
          <button type="button" class="rd-arrow next" data-act="next" aria-label="Next page">›</button>
        </section>
        <footer class="rd-foot">
          <div class="rd-nav">
            <button type="button" class="rd-step" data-act="prev" aria-label="Previous page">‹</button>
            <div class="rd-dots"></div>
            <button type="button" class="rd-step" data-act="next" aria-label="Next page">›</button>
          </div>
          <div class="rd-btns">
            <button type="button" class="btn big rd-read" data-act="read">🔊 Read Aloud</button>
            <button type="button" class="btn go big rd-edit" data-act="edit">✏️ Edit this book</button>
          </div>
        </footer>
      </div>`;
    this.nameEl = $('.rd-name b', root);
    this.subEl = $('.rd-name small', root);
    this.stage = $('.rd-stage', root);
    this.host = $('.rd-host', root);
    this.endEl = $('.rd-end', root);
    this.dotsEl = $('.rd-dots', root);
    this.readBtn = $('[data-act="read"]', root);
    if (!canSpeak()) this.readBtn.hidden = true;

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || !this.book) return;
      const act = b.dataset.act;
      if (act === 'close') this.hooks.close();
      if (act === 'prev') this.turn(-1);
      if (act === 'next') this.turn(1);
      if (act === 'edit') this.hooks.edit(this.book);
      if (act === 'bin') this.hooks.bin(this.book);
      if (act === 'read') this.toggleReading();
      if (act === 'again'){ this.stopReading(); this.show(0, 1); }
      if (act === 'dot'){ this.stopReading(); this.show(+b.dataset.i, +b.dataset.i > this.at ? 1 : -1); }
    });

    // Swipe to turn. A tap on the left or right third of the page turns too.
    let sx = 0, sy = 0, st = 0, sid = null, turned = false;
    this.stage.addEventListener('pointerdown', (e) => {
      turned = false;
      if (e.target.closest('button')) return;
      sx = e.clientX; sy = e.clientY; st = Date.now(); sid = e.pointerId;
    });
    this.stage.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId || !this.book) return;
      sid = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2){ this.turn(dx < 0 ? 1 : -1); turned = true; return; }
      if (Math.hypot(dx, dy) < 10 && Date.now() - st < 500){
        const r = this.stage.getBoundingClientRect();
        if (e.clientX > r.left + r.width * 0.66){ this.turn(1); turned = true; }
        else if (e.clientX < r.left + r.width * 0.34){ this.turn(-1); turned = true; }
      }
    });
    // A tap that turned the page mustn't also 'click' whatever the new page put
    // under the finger — the buttons on The End, say.
    this.stage.addEventListener('touchend', (e) => {
      if (turned && e.cancelable) e.preventDefault();
      turned = false;
    }, { passive: false });

    addEventListener('keydown', (e) => {
      if (!this.book || document.querySelector('.card-wrap')) return;
      if (e.key === 'ArrowRight' || e.key === ' '){ e.preventDefault(); this.turn(1); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); this.turn(-1); }
      if (e.key === 'Escape') this.hooks.close();
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(this.stage);
  }

  get isOpen(){ return !!this.book; }

  /** Cover, pages, then The End — which is one more than the pages. */
  get count(){ return allPages(this.book).length + 1; }

  open(book, at = 0){
    this.book = book;
    this.root.hidden = false;
    document.body.classList.add('reading');
    this.view?.destroy();
    this.host.innerHTML = '';
    this.view = new PageView(this.host);
    this.nameEl.textContent = book.title || 'My Book';
    this.subEl.textContent = `${book.author ? `by ${book.author} · ` : ''}${plural(book.pages.length, 'page')}`;
    this.fit();
    this.show(at, 0);
  }

  close(){
    this.stopReading();
    this.view?.destroy();
    this.view = null;
    this.book = null;
    this.root.hidden = true;
    document.body.classList.remove('reading');
  }

  fit(){
    if (!this.book) return;
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const side = r.width > 640 ? 64 : 10;
    const w = Math.floor(Math.max(140, Math.min(r.width - side * 2, (r.height - 16) * 0.75)));
    this.host.style.width = this.endEl.style.width = `${w}px`;
    this.host.style.height = this.endEl.style.height = `${Math.floor(w / 0.75)}px`;
  }

  turn(dir){
    const to = this.at + dir;
    if (to < 0 || to >= this.count){ sfx('nope'); return; }
    this.stopReading();
    this.show(to, dir);
  }

  show(i, dir = 0){
    const pages = allPages(this.book);
    this.at = Math.max(0, Math.min(i, this.count - 1));
    const end = this.at === pages.length;
    this.host.hidden = end;
    this.endEl.hidden = !end;
    if (end){
      this.endEl.innerHTML = `<div class="end-in">
        <b>The End</b>
        <p>${esc(this.book.title || 'My Book')}${this.book.author ? `<br>by ${esc(this.book.author)}` : ''}</p>
        <div class="end-btns">
          <button type="button" class="btn ghost" data-act="again">📖 Read it again</button>
          <button type="button" class="btn go" data-act="edit">✏️ Edit this book</button>
        </div></div>`;
    } else {
      this.view.render(pages[this.at], { book: this.book, num: this.at });
    }
    const box = end ? this.endEl : this.host;
    if (dir){
      box.classList.remove('turn-l', 'turn-r');
      void box.offsetWidth;
      box.classList.add(dir > 0 ? 'turn-r' : 'turn-l');
      sfx('page');
    }
    for (const btn of this.root.querySelectorAll('[data-act="prev"]')) btn.disabled = this.at === 0;
    for (const btn of this.root.querySelectorAll('[data-act="next"]')) btn.disabled = this.at === this.count - 1;
    this.paintDots();
  }

  paintDots(){
    const pages = allPages(this.book);
    const label = this.at === 0 ? 'Cover' : this.at === pages.length ? 'The End' : `Page ${this.at} of ${pages.length - 1}`;
    // A dot for every page if there aren't too many; just the words if there are.
    const dots = this.count <= 24
      ? `<span class="dots">${Array.from({ length: this.count }, (_, i) =>
          `<button type="button" class="${i === this.at ? 'on' : ''}" data-act="dot" data-i="${i}" aria-label="${i === 0 ? 'Cover' : i === pages.length ? 'The End' : `Page ${i}`}"></button>`).join('')}</span>`
      : '';
    this.dotsEl.innerHTML = `${dots}<small>${label}</small>`;
  }

  // ------------------------------------------------------------ reading aloud

  toggleReading(){
    if (this.reading) this.stopReading();
    else this.startReading();
  }

  paintReadBtn(){
    this.readBtn.classList.toggle('on', !!this.reading);
    this.readBtn.textContent = this.reading ? '⏹ Stop reading' : '🔊 Read Aloud';
  }

  /** Read from this page to the end — or from the cover, if it's already The End. */
  startReading(){
    if (!canSpeak()){ toast("Sorry — this browser can't read aloud."); return; }
    wake();
    this.reading = { token: Symbol('read') };
    this.paintReadBtn();
    if (this.at >= this.count - 1) this.show(0, 1);
    this.readPage(this.reading.token);
  }

  readPage(token){
    if (this.reading?.token !== token) return;
    const queue = linesFor(this.book, this.at);
    const words = queue.length;
    const next = () => {
      if (this.reading?.token !== token) return;
      this.host.querySelectorAll('.btxt.speaking').forEach(el => el.classList.remove('speaking'));
      const line = queue.shift();
      if (!line){
        // End of the page: turn over and carry on. A page with no words on it
        // gets a little longer, to look at the pictures.
        setTimeout(() => {
          if (this.reading?.token !== token) return;
          if (this.at >= this.count - 2){
            this.show(this.count - 1, 1);
            say({ title: true, text: 'The End.' }, () => { if (this.reading?.token === token) this.stopReading(); });
            return;
          }
          this.show(this.at + 1, 1);
          setTimeout(() => this.readPage(token), 450);
        }, words ? 700 : 2400);
        return;
      }
      if (line.id) this.host.querySelector(`.btxt[data-say="${line.id}"]`)?.classList.add('speaking');
      say(line, () => setTimeout(next, 280));
    };
    next();
  }

  stopReading(){
    if (!this.reading) return;
    this.reading = null;
    hush();
    this.paintReadBtn();
    this.host.querySelectorAll('.btxt.speaking').forEach(el => el.classList.remove('speaking'));
  }
}
