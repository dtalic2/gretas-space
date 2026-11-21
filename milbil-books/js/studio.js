// ---------- Recording a soundtrack ----------
//
// 🎙️ in the editor's top bar opens the studio: the book a page at a time, the
// way the reader shows it, and a big red button. Tap 🔴 Record, wait for 3, 2,
// 1, and read the book out loud, turning the pages as you go. Tap ⏹ Stop and
// it is kept as the book's soundtrack — "Chomp Soundtrack" for a book called
// Chomp — to listen to in 🎧 Soundtracks, where the pages turn by themselves
// in the same places they were turned while it was recorded.
//
// Recording again replaces it (after asking). It all stays on the device: the
// browser records the sound and keeps it, like the books.

import { allPages } from './model.js';
import { PageView } from './view.js';
import { putTrack, removeTrack } from './store.js';
import { trackName, clock, pageAt, Player } from './tracks.js';
import { Mic, canRecord, micTrouble } from './mic.js';
import { $, esc, card, toast, sfx } from './ui.js';

const MAX_SECS = 20 * 60;          // a long book read slowly is still well under this

export class Studio {
  constructor(root, hooks){
    this.root = root;
    this.hooks = hooks;              // { save(book), close() }
    this.book = null;
    this.at = 0;
    this.state = 'idle';             // idle | asking | countdown | recording | saving | playing
    this.player = new Player();
    root.innerHTML = `
      <div class="rd sd">
        <header class="rd-top">
          <button type="button" class="ed-btn" data-act="close" aria-label="Back to the book">✕</button>
          <div class="rd-name"><b></b><small></small></div>
          <button type="button" class="ed-btn" data-act="bin" aria-label="Throw this soundtrack away" title="Throw this soundtrack away">🗑️</button>
        </header>
        <section class="rd-stage">
          <button type="button" class="rd-arrow prev" data-act="prev" aria-label="Previous page">‹</button>
          <div class="rd-host"></div>
          <div class="sd-count" hidden></div>
          <button type="button" class="rd-arrow next" data-act="next" aria-label="Next page">›</button>
        </section>
        <footer class="rd-foot">
          <div class="rd-nav">
            <button type="button" class="rd-step" data-act="prev" aria-label="Previous page">‹</button>
            <div class="rd-dots"><small></small></div>
            <button type="button" class="rd-step" data-act="next" aria-label="Next page">›</button>
          </div>
          <p class="sd-say" aria-live="polite"></p>
          <div class="rd-btns sd-btns"></div>
        </footer>
      </div>`;
    this.nameEl = $('.rd-name b', root);
    this.subEl = $('.rd-name small', root);
    this.binBtn = $('[data-act="bin"]', root);
    this.stage = $('.rd-stage', root);
    this.host = $('.rd-host', root);
    this.countEl = $('.sd-count', root);
    this.pageEl = $('.rd-dots small', root);
    this.sayEl = $('.sd-say', root);
    this.btnsEl = $('.sd-btns', root);

    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled || !this.book) return;
      switch (b.dataset.act){
        case 'close': this.close(); break;
        case 'prev': this.turn(-1); break;
        case 'next': this.turn(1); break;
        case 'record': this.record(); break;
        case 'stop': this.stop(); break;
        case 'cancel': this.cancel(); break;
        case 'listen': this.listen(); break;
        case 'quiet': this.player.pause(); break;
        case 'bin': this.bin(); break;
      }
    });

    // Swipe to turn the page, as in the reader.
    let sx = 0, sy = 0, sid = null;
    this.stage.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      sx = e.clientX; sy = e.clientY; sid = e.pointerId;
    });
    this.stage.addEventListener('pointerup', (e) => {
      if (sid !== e.pointerId || !this.book) return;
      sid = null;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.2) this.turn(dx < 0 ? 1 : -1);
    });
    addEventListener('keydown', (e) => {
      if (!this.book || document.querySelector('.card-wrap.show')) return;
      if (e.key === 'ArrowRight'){ e.preventDefault(); this.turn(1); }
      if (e.key === 'ArrowLeft'){ e.preventDefault(); this.turn(-1); }
      if (e.key === 'Escape') this.close();
    });
    if ('ResizeObserver' in window) new ResizeObserver(() => this.fit()).observe(this.stage);

    // If the page is closed or hidden part way through, keep what was recorded.
    const keep = () => { if (this.state === 'recording') this.stop(); };
    addEventListener('pagehide', keep);
    document.addEventListener('visibilitychange', () => { if (document.hidden) keep(); });
  }

  get isOpen(){ return !!this.book; }
  get pages(){ return allPages(this.book); }

  open(book){
    this.book = book;
    this.root.hidden = false;
    document.body.classList.add('in-studio');
    this.view?.destroy();
    this.host.innerHTML = '';
    this.view = new PageView(this.host);
    this.fit();
    this.show(0);
    this.setState('idle');
    if (book.track) this.player.load(book.id);       // ready to play from the first tap
    sfx('open');
  }

  async close(){
    if (this.state === 'recording'){ this.stop(); return this.whenSaved.then(() => this.close()); }
    if (this.state === 'saving') return;
    this.cancel();
    this.player.unload();
    this.view?.destroy();
    this.view = null;
    this.book = null;
    this.root.hidden = true;
    document.body.classList.remove('in-studio');
    this.hooks.close?.();
  }

  fit(){
    if (!this.book) return;
    const r = this.stage.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const side = r.width > 640 ? 64 : 10;
    const w = Math.floor(Math.max(140, Math.min(r.width - side * 2, (r.height - 16) * 0.75)));
    this.host.style.width = `${w}px`;
    this.host.style.height = `${Math.floor(w / 0.75)}px`;
  }

  // ---------------------------------------------------------------- pages

  show(i, dir = 0){
    const pages = this.pages;
    this.at = Math.max(0, Math.min(i, pages.length - 1));
    this.view.render(pages[this.at], { book: this.book, num: this.at });
    if (dir){
      this.host.classList.remove('turn-l', 'turn-r');
      void this.host.offsetWidth;
      this.host.classList.add(dir > 0 ? 'turn-r' : 'turn-l');
      // no page-turning noise in the middle of a recording
      if (this.state !== 'recording') sfx('page');
    }
    for (const b of this.root.querySelectorAll('[data-act="prev"]')) b.disabled = this.at === 0;
    for (const b of this.root.querySelectorAll('[data-act="next"]')) b.disabled = this.at === pages.length - 1;
    this.pageEl.textContent = this.at === 0 ? 'Cover' : `Page ${this.at} of ${pages.length - 1}`;
  }

  turn(dir){
    const to = this.at + dir;
    if (to < 0 || to >= this.pages.length){ if (this.state !== 'recording') sfx('nope'); return; }
    if (this.state === 'playing'){
      // skip to where that page was read, if it ever was
      const t = this.player.track?.pages.find(p => p.id === this.pages[to].id)?.t;
      if (t != null){ this.player.seek(t); this.show(to, dir); return; }
      this.player.pause();
    }
    this.show(to, dir);
    if (this.state === 'recording') this.turns.push({ t: Math.round(this.elapsed() * 100) / 100, id: this.pages[this.at].id });
  }

  // ----------------------------------------------------------- how it looks

  setState(s){
    this.state = s;
    this.root.dataset.state = s;
    this.paint();
  }

  paint(){
    const b = this.book;
    if (!b) return;
    const s = this.state, has = !!b.track;
    this.nameEl.textContent = `🎙️ ${trackName(b)}`;
    this.subEl.textContent = s === 'recording' ? 'Recording — read your book out loud'
      : s === 'playing' ? 'Listening' : has ? `${clock(b.track.secs)} long` : 'Read your book out loud';
    this.binBtn.hidden = !has || s !== 'idle';
    const btn = (act, label, cls = '') => `<button type="button" class="btn big ${cls}" data-act="${act}">${label}</button>`;
    let say = '', btns = '';
    if (s === 'idle'){
      say = has ? `Listen to <b>${esc(trackName(b))}</b> here, or any time in 🎧 Soundtracks.`
        : !canRecord() ? "Sorry — this browser can't record sound."
        : "Tap <b>🔴 Record</b>, then read your book out loud. Turn the pages as you go: when somebody listens, they'll turn by themselves.";
      btns = has ? btn('listen', '▶️ Listen', 'go') + btn('record', '🔴 Record again', 'rec-again') : canRecord() ? btn('record', '🔴 Record', 'rec') : '';
    } else if (s === 'asking'){
      say = 'Asking to use the microphone…';
      btns = btn('cancel', 'Cancel', 'ghost');
    } else if (s === 'countdown'){
      say = 'Get ready to read from the cover…';
      btns = btn('cancel', 'Cancel', 'ghost');
    } else if (s === 'recording'){
      say = `<span class="sd-rec"><i class="sd-dot"></i> Recording <b class="sd-time">0:00</b></span><span class="sd-level"><i></i></span>`;
      btns = btn('stop', '⏹ Stop', 'stop');
    } else if (s === 'saving'){
      say = 'Saving…';
    } else if (s === 'playing'){
      say = `<span class="sd-rec">🎧 <b class="sd-time">0:00</b> of ${clock(this.player.track?.secs || b.track?.secs)}</span>`;
      btns = btn('quiet', '⏹ Stop listening', 'stop');
    }
    this.sayEl.innerHTML = say;
    this.btnsEl.innerHTML = btns;
  }

  // ------------------------------------------------------------- recording

  elapsed(){ return this.mic?.elapsed() || 0; }

  async record(){
    if (!canRecord()){ toast("Sorry — this browser can't record sound."); sfx('nope'); return; }
    this.player.pause();
    const mic = new Mic();                // from the tap, before anything is waited for

    if (this.book.track){
      const ok = await card(`<h3>🎙️ Record it again?</h3>
        <p>The new recording will take the place of the one you made before (${clock(this.book.track.secs)} long).</p>`,
      [{ label: 'Keep the old one', cls: 'ghost', value: null }, { label: '🔴 Record a new one', cls: 'go', value: 'go' }]);
      if (ok !== 'go' || !this.book){ mic.close(); return; }
    }

    this.setState('asking');
    this.mic = mic;
    try { await mic.open(); }
    catch (err){
      if (this.mic === mic) this.mic = null;
      if (this.state === 'asking') this.setState('idle');
      if (err?.name !== 'AbortError') micTrouble(err);
      return;
    }
    if (this.state !== 'asking' || !this.book || this.mic !== mic){ mic.close(); return; }

    // back to the cover, and 3, 2, 1...
    this.show(0, this.at ? -1 : 0);
    this.setState('countdown');
    for (const n of [3, 2, 1]){
      this.countEl.hidden = false;
      this.countEl.textContent = n;
      this.countEl.classList.remove('beat'); void this.countEl.offsetWidth; this.countEl.classList.add('beat');
      sfx('tap');
      await new Promise(r => setTimeout(r, 750));
      if (this.state !== 'countdown' || this.mic !== mic) return;      // cancelled
    }
    this.countEl.hidden = true;
    this.go();
  }

  /** Start recording, from the cover. */
  go(){
    this.mic.start();
    this.turns = [{ t: 0, id: this.pages[this.at].id }];
    this.setState('recording');
    this.tick();
  }

  /** The clock, and the meter jumping about with your voice. */
  tick(){
    if (this.state !== 'recording') return;
    const mic = this.mic, secs = this.elapsed();
    const time = this.root.querySelector('.sd-time');
    if (time) time.textContent = clock(secs);
    const bar = this.root.querySelector('.sd-level i');
    if (bar) bar.style.transform = `scaleX(${Math.max(0.03, mic.level()).toFixed(3)})`;
    if (secs >= MAX_SECS){ toast(`That's ${MAX_SECS / 60} minutes — as long as a soundtrack can be.`); this.stop(); return; }
    if (!mic.recording){ this.stop(); return; }             // it stopped by itself: keep what there is
    requestAnimationFrame(() => this.tick());
  }

  /** ⏹: stop, and save it. */
  stop(){
    if (this.state !== 'recording') return;
    const mic = this.mic;
    this.mic = null;
    this.setState('saving');
    this.whenSaved = mic.stop().then(r => this.save(r)).catch(() => this.save(null));
  }

  /** Not now: before recording has started. */
  cancel(){
    if (this.state === 'asking' || this.state === 'countdown'){
      this.countEl.hidden = true;
      this.mic?.close();
      this.mic = null;
      this.setState('idle');
    }
    if (this.state === 'playing') this.player.pause();
  }

  async save(r){
    const book = this.book;
    if (!book) return;
    if (!r){
      toast("Nothing was recorded. Is the microphone working?");
      sfx('nope');
      this.setState('idle');
      return;
    }
    const secs = Math.max(1, r.secs);
    const track = { id: book.id, mime: r.mime, data: r.data, secs, pages: this.turns, at: Date.now() };
    const kept = await putTrack(track);
    book.track = { secs, at: track.at };
    book.updated = Date.now();
    this.hooks.save(book);
    this.player.use(track);
    if (this.book !== book) return;
    this.setState('idle');
    sfx('cheer');
    toast(kept ? `🎙️ <b>${esc(trackName(book))}</b> is saved! It's in 🎧 Soundtracks.`
      : "⚠️ This browser won't keep the soundtrack after the page is closed.", { ms: 5000 });
  }

  // ------------------------------------------------------------- listening

  listen(){
    const p = this.player;
    if (!p.audio){
      const book = this.book;
      toast('Just a moment — getting it ready.');
      p.load(book.id).then(t => { if (!t && this.book === book) toast("Couldn't find the recording. Record it again?"); });
      return;
    }
    p.on.time = (t) => {
      const time = this.root.querySelector('.sd-time');
      if (time) time.textContent = clock(t);
      const i = this.pages.findIndex(pg => pg.id === pageAt(p.track, t));
      if (i >= 0 && i !== this.at) this.show(i, i > this.at ? 1 : -1);
    };
    p.on.end = p.on.stop = () => { if (this.state === 'playing') this.setState('idle'); };
    this.show(0, this.at ? -1 : 0);
    p.play(0).then(() => { if (this.book) this.setState('playing'); })
      .catch(() => { toast("It wouldn't play. Tap ▶️ Listen again."); sfx('nope'); });
  }

  async bin(){
    const b = this.book;
    const ok = await card(`<h3>🗑️ Throw away “${esc(trackName(b))}”?</h3>
      <p>The recording goes for good. The book stays just as it is.</p>`,
    [{ label: 'Keep it', cls: 'ghost', value: null }, { label: 'Throw it away', cls: 'danger', value: 'bin' }]);
    if (ok !== 'bin' || this.book !== b) return;
    this.player.unload();
    await removeTrack(b.id);
    delete b.track;
    b.updated = Date.now();
    this.hooks.save(b);
    this.setState('idle');
    sfx('bin');
    toast('Soundtrack thrown away.');
  }
}
