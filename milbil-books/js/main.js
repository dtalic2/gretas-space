// ---------- Milbil Books ----------
//
// Wires the whole thing together. Two tabs along the bottom:
//
//   ✏️ Create    start a new book, or carry on with one you're making
//   📚 Library   every finished book, on a shelf, to read — and ✏️ Edit
//
// Over the top of those there can be the editor (making a book), the reader
// (reading one), at most one sheet sliding up from the bottom, and a card.
//
// A book is a draft until you tap ✓ Done in the editor; then it goes on the
// shelf in the Library. Editing it again later doesn't take it off the shelf.

import { openStore, loadBooks, putBook, removeBook, settings, loadSettings, saveSettings, storageMode } from './store.js';
import { newBook, repairBook, COVER_COLOURS } from './model.js';
import { CAST, castHTML } from './cast.js';
import { Editor, pickTitle } from './editor.js';
import { Reader } from './reader.js';
import { PageView } from './view.js';
import { $, $$, esc, Sheet, card, toast, sfx, setSound, confetti, ago, plural } from './ui.js';

const NAMES = ['Greta', 'Milly', 'Bil', 'Pip', 'Sprout', 'Nugget', 'Pickle', 'Bean', 'Tilly', 'Ro', 'Mo', 'Dot'];
const GRETA = ['chomp', 'hattie', 'petal', 'scoop', 'sunny'];

let books = [];
let sheet, editor, reader;
let covers = [];               // the little cover pictures on screen, to tidy up
let warned = false;
const view = $('#view');

const byId = (id) => books.find(b => b.id === id) || null;
const any = (list) => list[Math.floor(Math.random() * list.length)];

// ================================================================== saving ===

async function save(book){
  const safe = await putBook(book);
  if (!safe && !warned){
    warned = true;
    toast("⚠️ This browser won't let Milbil Books save, so your books will go when the page is closed.", { ms: 7000 });
  }
}

// ==================================================================== tabs ===

function setTab(name){
  if (!['create', 'library'].includes(name)) name = 'create';
  settings.tab = name;
  saveSettings();
  for (const b of $$('#tabbar .tab')) b.classList.toggle('on', b.dataset.tab === name);
  paint();
  window.scrollTo(0, 0);
}

function paint(){
  for (const v of covers) v.destroy();
  covers = [];
  if (settings.tab === 'library') paintLibrary();
  else paintCreate();
}

/** A small, still picture of a book's cover. */
function coverInto(host, book){
  if (!host) return;
  const v = new PageView(host, { thumb: true });
  v.render(book.cover, { book });
  covers.push(v);
  return v;
}

// ----------------------------------------------------------------- create ---

function paintCreate(){
  const drafts = books.filter(b => b.status === 'draft').sort((a, b) => b.updated - a.updated);
  const done = books.filter(b => b.status === 'done').length;
  view.innerHTML = `
    <section class="hero card">
      <div class="hero-cast">${GRETA.slice(0, 3).map(id => `<span>${castHTML(id)}</span>`).join('')}</div>
      <h2>Make a book</h2>
      <p>Pull your panels to the size you want, put milbils in them, give them something to say,
        and draw whatever you like. Pages number themselves.</p>
      <button type="button" class="btn go big wide" data-act="new">✨ Start a new book</button>
    </section>
    ${drafts.length ? `<h3 class="list-h">Books you're making</h3>
      <div class="drafts">${drafts.map(b => `
        <div class="draft">
          <button type="button" class="draft-main" data-act="continue" data-id="${b.id}">
            <span class="mini-cover" data-cover-of="${b.id}"></span>
            <span class="draft-txt"><b>${esc(b.title || 'My Book')}</b>
              <small>${plural(b.pages.length, 'page')} · ${ago(b.updated)}</small></span>
            <span class="draft-go">Keep going ›</span>
          </button>
          <button type="button" class="draft-x" data-act="bin" data-id="${b.id}" aria-label="Throw this book away">🗑️</button>
        </div>`).join('')}</div>` : ''}
    <p class="foot-note">${done
      ? `${done === 1 ? 'One finished book is' : `${done} finished books are`} on the shelf in the 📚 Library. Open one and tap ✏️ Edit to change it.`
      : 'When you tap ✓ Done on a book, it goes on the shelf in the 📚 Library.'}</p>`;
  for (const b of drafts) coverInto($(`[data-cover-of="${b.id}"]`, view), b);
}

// ---------------------------------------------------------------- library ---

let justShelved = null;

function paintLibrary(){
  const done = books.filter(b => b.status === 'done')
    .sort((a, b) => (b.finished || b.updated) - (a.finished || a.updated));
  if (!done.length){
    view.innerHTML = `
      <section class="empty card">
        <div class="empty-pic">${castHTML('hattie')}</div>
        <h2>The shelf is empty</h2>
        <p>Make a book in ✏️ Create. When you tap <b>✓ Done</b>, it comes here to be read.</p>
        <button type="button" class="btn go big" data-act="new">✨ Start a new book</button>
      </section>`;
    return;
  }
  view.innerHTML = `
    <section class="lib-top">
      <h2>📚 The Library</h2>
      <p>${done.length === 1 ? 'One book' : `${done.length} books`} on the shelf. Tap one to read it.</p>
    </section>
    <div class="shelf">${done.map(b => `
      <div class="book${b.id === justShelved ? ' new' : ''}" data-id="${b.id}">
        <button type="button" class="book-open" data-act="read" data-id="${b.id}" aria-label="Read ${esc(b.title || 'My Book')}">
          <span class="book-cover" data-cover-of="${b.id}"></span>
        </button>
        <span class="book-txt"><b>${esc(b.title || 'My Book')}</b>
          <small>${b.author ? `by ${esc(b.author)} · ` : ''}${plural(b.pages.length, 'page')}</small></span>
        <button type="button" class="book-edit" data-act="edit" data-id="${b.id}">✏️ Edit</button>
      </div>`).join('')}</div>`;
  for (const b of done) coverInto($(`[data-cover-of="${b.id}"]`, view), b);
}

view.addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const book = byId(b.dataset.id);
  switch (b.dataset.act){
    case 'new': newBookCard(); break;
    case 'continue': if (book) openEditor(book, 'create'); break;
    case 'read': if (book) openReader(book); break;
    case 'edit': if (book) openEditor(book, 'library'); break;
    case 'bin': if (book) binBook(book); break;
  }
});

// =============================================================== new book ===

async function newBookCard(){
  let title = '';
  let author = settings.name;
  let color = any(COVER_COLOURS);
  let star = any(GRETA);
  let preview = null;
  let cover = newBook({ star }).cover;      // made again only when the star changes
  const draw = () => preview?.render(cover, { book: { title: title || 'My Book', author, color } });

  const html = `
    <div class="nb">
      <div class="nb-cover" id="nbCover"></div>
      <div class="nb-fields">
        <h3>✨ A new book</h3>
        <label class="field"><span>What's it called?</span><span class="set-row">
          <input class="in" id="nbTitle" maxlength="60" placeholder="My Book" autocomplete="off" spellcheck="false">
          <button type="button" class="btn ghost dice" data-dice aria-label="Think of a title for me">🎲</button></span></label>
        <label class="field"><span>Made by</span>
          <input class="in" id="nbAuthor" maxlength="30" value="${esc(author)}" placeholder="Your name" autocomplete="off" spellcheck="false"></label>
      </div>
    </div>
    <div class="field"><span>Cover colour</span><div class="swatches">${COVER_COLOURS.map(c =>
      `<button type="button" class="sw big${c === color ? ' on' : ''}" data-colour="${c}" style="--c:${c}" aria-label="Cover colour"></button>`).join('')}</div></div>
    <div class="field"><span>Who's on the cover?</span><div class="star-row">${CAST.map(c =>
      `<button type="button" class="star${c.id === star ? ' on' : ''}" data-star="${c.id}" aria-label="${esc(c.name)}">${castHTML(c.id)}</button>`).join('')}</div></div>`;

  const out = await card(html, [
    { label: 'Not now', cls: 'ghost', value: null },
    { label: 'Start making →', cls: 'go', value: 'go' },
  ], {
    cls: 'new-card',
    onOpen: (wrap) => {
      preview = new PageView($('#nbCover', wrap), { thumb: true });
      draw();
      const t = $('#nbTitle', wrap), a = $('#nbAuthor', wrap);
      t.addEventListener('input', () => { title = t.value; draw(); });
      a.addEventListener('input', () => { author = a.value; draw(); });
      wrap.addEventListener('click', (e) => {
        const c = e.target.closest('[data-colour]'), s = e.target.closest('[data-star]'), d = e.target.closest('[data-dice]');
        if (c){ color = c.dataset.colour; $$('[data-colour]', wrap).forEach(x => x.classList.toggle('on', x === c)); sfx('pick'); draw(); }
        if (s){ star = s.dataset.star; cover = newBook({ star }).cover; $$('[data-star]', wrap).forEach(x => x.classList.toggle('on', x === s)); sfx('pick'); draw(); }
        if (d){ title = pickTitle(title); t.value = title; sfx('pick'); draw(); }
      });
      // On a computer the keyboard is ready; on a phone, don't throw it up over the cover.
      if (matchMedia('(pointer: fine)').matches) setTimeout(() => t.focus(), 60);
    },
  });
  preview?.destroy();
  if (out !== 'go') return;

  const book = newBook({ title: title.trim(), author: author.trim(), color, star });
  books.push(book);
  if (book.author && !settings.name){ settings.name = book.author; saveSettings(); }
  await save(book);
  openEditor(book, 'create');
}

// ================================================================= editing ===

function openEditor(book, from){
  if (reader.isOpen) reader.close();
  sheet.close();
  settings.open = book.id;
  settings.openFrom = from;
  settings.openPage = null;
  saveSettings();
  editor.open(book, { from });
  sfx('open');
}

function leaveEditor(){
  const from = editor.from;
  const book = editor.close();
  settings.open = null;
  saveSettings();
  return { book, from };
}

/** ‹ in the editor: back to wherever the book was opened from. */
function back(){
  const { book, from } = leaveEditor();
  setTab(from === 'library' && book?.status === 'done' ? 'library' : 'create');
}

/** ✓ Done: check the title, then off it goes to the Library. */
async function done(book){
  editor.flush();
  const first = book.status !== 'done';
  const was = { title: book.title, author: book.author };
  let title = book.title;
  let author = book.author || settings.name;
  let preview = null;
  const draw = () => preview?.render(book.cover, { book: { ...book, title: title || 'My Book', author } });

  const html = `
    <div class="nb">
      <div class="nb-cover" id="finCover"></div>
      <div class="nb-fields">
        <h3>${first ? '📚 Finished?' : '📚 All done?'}</h3>
        <p class="muted">${first
          ? 'Your book goes on the shelf in the Library. You can always change it later with ✏️ Edit.'
          : 'Your changes are saved, and the book goes back on the shelf.'}</p>
      </div>
    </div>
    <label class="field"><span>Title</span><span class="set-row">
      <input class="in" id="finTitle" maxlength="60" value="${esc(title)}" placeholder="My Book" autocomplete="off" spellcheck="false">
      <button type="button" class="btn ghost dice" data-dice aria-label="Think of a title for me">🎲</button></span></label>
    <label class="field"><span>Made by</span>
      <input class="in" id="finAuthor" maxlength="30" value="${esc(author)}" placeholder="Your name" autocomplete="off" spellcheck="false"></label>`;

  const out = await card(html, [
    { label: 'Keep making', cls: 'ghost', value: null },
    { label: first ? 'Put it in the Library →' : 'Back on the shelf →', cls: 'go', value: 'go' },
  ], {
    cls: 'fin-card',
    onOpen: (wrap) => {
      preview = new PageView($('#finCover', wrap), { thumb: true });
      draw();
      const t = $('#finTitle', wrap), a = $('#finAuthor', wrap);
      t.addEventListener('input', () => { title = t.value; draw(); });
      a.addEventListener('input', () => { author = a.value; draw(); });
      wrap.addEventListener('click', (e) => {
        if (e.target.closest('[data-dice]')){ title = pickTitle(title); t.value = title; sfx('pick'); draw(); }
      });
    },
  });
  preview?.destroy();
  if (out !== 'go'){
    // Keep making — but keep any name typed in, too.
    if (title.trim() !== was.title || author.trim() !== was.author){
      book.title = title.trim(); book.author = author.trim();
      editor.renderTop(); editor.renderPage(); editor.markDirty(book.cover.id); editor.renderStrip(); editor.flush();
    }
    return;
  }

  book.author = author.trim();
  // A book on the shelf has a name, even if nobody thought of one.
  book.title = title.trim() || (book.author ? `${book.author}'s Book` : 'My Book');
  if (book.author && !settings.name) settings.name = book.author;
  book.status = 'done';
  if (first) book.finished = Date.now();
  book.updated = Date.now();
  await save(book);
  leaveEditor();
  justShelved = book.id;
  setTab('library');
  flyOntoShelf(book, first);
}

/** The cover flies from the middle of the screen onto its place on the shelf. */
function flyOntoShelf(book, first){
  const slot = $(`.book[data-id="${book.id}"] .book-cover`, view);
  sfx('whoosh');
  if (first){ sfx('cheer'); setTimeout(() => confetti(), 450); }
  if (!slot) return;
  slot.style.visibility = 'hidden';
  slot.scrollIntoView({ block: 'nearest' });
  const to = slot.getBoundingClientRect();
  const W = Math.min(230, innerWidth * 0.55);
  const fly = document.createElement('div');
  fly.className = 'flyer';
  fly.style.cssText = `left:${(innerWidth - W) / 2}px;top:${Math.max(70, innerHeight * 0.18)}px;width:${W}px`;
  document.body.appendChild(fly);
  const v = new PageView(fly, { thumb: true });
  v.render(book.cover, { book });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const from = fly.getBoundingClientRect();
    fly.classList.add('go');
    fly.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}) rotate(360deg)`;
  }));
  setTimeout(() => {
    v.destroy();
    fly.remove();
    slot.style.visibility = '';
    slot.closest('.book')?.classList.add('landed');
    toast(first ? `📚 <b>${esc(book.title || 'Your book')}</b> is in the Library!` : '📚 Back on the shelf.');
  }, 950);
}

// ================================================================= reading ===

function openReader(book, at = 0){
  sheet.close();
  reader.open(book, at);
  sfx('open');
}

async function binBook(book){
  const ok = await card(`
    <h3>🗑️ Throw away “${esc(book.title || 'My Book')}”?</h3>
    <p>The whole book goes, every page of it. This can't be undone.</p>`,
  [{ label: 'Keep it', cls: 'ghost', value: null }, { label: 'Throw it away', cls: 'danger', value: 'bin' }]);
  if (ok !== 'bin') return;
  await removeBook(book.id);
  books = books.filter(b => b !== book);
  if (reader.isOpen) reader.close();
  paint();
  sfx('bin');
  toast('Book thrown away.');
}

// ================================================================== extras ===

function helpSheet(){
  sheet.show({
    key: 'help', icon: '❓', title: 'How Milbil Books works',
    render: () => `<ul class="help">
      <li><b>✨ Start a new book</b> in Create. Give it a name, a colour and somebody on the cover.</li>
      <li><b>🔲 Panels</b> are the boxes on a page. Tap one and drag the blue dots on its corners to make it
        bigger or smaller, or drag the middle to move it. Panels never overlap.</li>
      <li><b>👾 Milbils</b> go in panels. Tap <b>Add a milbil</b> in an empty panel. If a panel is too small for
        everybody in it, it grows to fit.</li>
      <li><b>💬 Words</b>: tap a milbil, then <b>Talk</b>, and type. Bubbles can talk, think or shout, and the
        tail follows whoever is talking. A caption box is for the narrator.</li>
      <li><b>✏️ Draw</b> anywhere on the page. Tap the colour button for every colour, the glow pen, and
        drawing <b>behind</b> the milbils for skies and grass. The slider makes the line thicker.</li>
      <li><b>🧽 Rubber</b> rubs out drawing, and only drawing.</li>
      <li><b>↩️ Undo</b> takes back anything. Pages number themselves.</li>
      <li><b>✓ Done</b> puts your book in the 📚 Library. Open it there and tap <b>✏️ Edit</b> at the bottom to
        change it whenever you like.</li>
    </ul>`,
  });
}

function settingsSheet(){
  const where = { idb: 'in this browser', local: 'in this browser (the small store)', memory: 'nowhere — this browser will not let it save' }[storageMode()];
  sheet.show({
    key: 'set', icon: '⚙️', title: 'Settings',
    render: () => `
      <label class="field"><span>Your name <small>(it goes on your covers)</small></span><span class="set-row">
        <input class="in" data-role="name" maxlength="30" value="${esc(settings.name)}" placeholder="Your name" autocomplete="off" spellcheck="false">
        <button type="button" class="btn ghost dice" data-act="dice" aria-label="Pick a name for me">🎲</button></span></label>
      <div class="field"><span>Sound</span><div class="opts2">
        <button type="button" class="opt2${settings.sound ? ' on' : ''}" data-act="sound" data-id="on"><i>🔊</i><b>On</b></button>
        <button type="button" class="opt2${!settings.sound ? ' on' : ''}" data-act="sound" data-id="off"><i>🔇</i><b>Off</b></button>
      </div></div>
      <p class="sheet-note">${plural(books.length, 'book')}, saved ${where}. Books stay on this device — they aren't sent anywhere.</p>`,
    onInput: (el) => { if (el.dataset.role === 'name'){ settings.name = el.value.slice(0, 30); saveSettings(); } },
    onAct: (act, id) => {
      if (act === 'sound'){ settings.sound = id === 'on'; setSound(settings.sound); saveSettings(); sheet.render(); sfx('pick'); }
      if (act === 'dice'){ settings.name = any(NAMES); saveSettings(); sheet.render(); sfx('pick'); }
    },
  });
}

function welcome(){
  const w = $('#welcome');
  w.hidden = false;
  $('#welcomeCast').innerHTML = GRETA.map(id => `<span>${castHTML(id)}</span>`).join('');
  const input = $('#nameInput');
  input.value = settings.name;
  $('#nameDice').addEventListener('click', () => { input.value = any(NAMES); sfx('pick'); });
  const go = () => {
    settings.name = input.value.trim().slice(0, 30);
    settings.welcomed = true;
    saveSettings();
    w.hidden = true;
    sfx('open');
    paint();
  };
  $('#startBtn').addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

// ==================================================================== boot ===

async function boot(){
  loadSettings();
  setSound(settings.sound);
  sheet = new Sheet($('#sheet'));
  editor = new Editor($('#editor'), sheet, { save, back, done });
  reader = new Reader($('#reader'), {
    close: () => reader.close(),
    edit: (book) => openEditor(book, 'library'),
    bin: (book) => binBook(book),
  });

  $('#brandCast').innerHTML = castHTML('chomp');
  $('#helpBtn').addEventListener('click', helpSheet);
  $('#setBtn').addEventListener('click', settingsSheet);
  for (const b of $$('#tabbar .tab')) b.addEventListener('click', () => { sfx('tap'); setTab(b.dataset.tab); });

  await openStore();
  books = (await loadBooks()).map(repairBook).filter(Boolean);
  setTab(settings.tab);

  if (!settings.welcomed) welcome();
  else if (settings.open && byId(settings.open)){
    editor.open(byId(settings.open), { from: settings.openFrom || 'create', page: settings.openPage });
  }

  // Save on the way out, whatever way out it is.
  const flush = () => { if (editor.isOpen) editor.flush(); };
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}

boot();
