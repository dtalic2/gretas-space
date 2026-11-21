// ---------- Text styles ----------
//
// The writing in a bubble, a caption or the cover's title can be in any of
// these styles. Each font is in fonts/ with its licence beside it, so nothing
// is fetched from anywhere else and they all work without the internet.
//
// The same font-size comes out at quite different sizes in different fonts:
// Press Start 2P's letters are twice as wide as Chewy's. `scale` evens that
// out, so Middle writing looks about as big whatever its style. `cw` is how
// wide an average letter is, as a fraction of the font-size; the cover uses it
// to fit a title in (see titleFontSize in view.js).
//
// Words and books made before there were styles have none: their words are
// Comic and their titles are Bubbly, exactly as they always looked.

export const STYLES = [
  { id: 'comic',     name: 'Comic',     family: '',                 scale: 1,    cw: 0.53 },
  { id: 'bubbly',    name: 'Bubbly',    family: 'Chewy',            scale: 1,    cw: 0.41 },
  { id: 'marker',    name: 'Marker',    family: 'Permanent Marker', scale: 0.95, cw: 0.52 },
  { id: 'fancy',     name: 'Fancy',     family: 'Lobster',          scale: 1.05, cw: 0.42 },
  { id: 'swirly',    name: 'Swirly',    family: 'Pacifico',         scale: 1,    cw: 0.47 },
  { id: 'blocky',    name: 'Blocky',    family: 'Bungee',           scale: 0.85, cw: 0.61 },
  { id: 'storybook', name: 'Storybook', family: 'Abril Fatface',    scale: 1.1,  cw: 0.49 },
  { id: 'spooky',    name: 'Spooky',    family: 'Creepster',        scale: 1.05, cw: 0.40 },
  { id: 'pixel',     name: 'Pixel',     family: 'Press Start 2P',   scale: 0.62, cw: 1 },
];

export const WORDS_STYLE = 'comic';      // words with no style of their own
export const TITLE_STYLE = 'bubbly';     // ...and titles

const BY_ID = new Map(STYLES.map(s => [s.id, s]));

export const isStyle = (id) => BY_ID.has(id);

/** A style, by its id; `fallback` if there is no such style. */
export const styleOf = (id, fallback = WORDS_STYLE) => BY_ID.get(id) || BY_ID.get(fallback);

/** Some words' style. */
export const wordsStyle = (t) => styleOf(t?.font);

/** A book's title's style. */
export const titleStyle = (book) => styleOf(book?.titleFont, TITLE_STYLE);

// ------------------------------------------------------------------ fonts ---
//
// Words have to be measured in their own font to get the right size of bubble
// round them, so the fonts are loaded before anything is measured in one. The
// browser would load them by itself the first time one was drawn, but by then
// the bubble would already have been measured in the wrong font.

const loading = new Map();

/** Load one style's font. Resolves when it is ready — or after `wait` ms, ready or not. */
export function fontReady(id, wait = 2500){
  const s = styleOf(id);
  if (!s.family || !document.fonts?.load) return Promise.resolve();
  if (!loading.has(s.id)) loading.set(s.id, document.fonts.load(`48px "${s.family}"`).catch(() => {}));
  return Promise.race([loading.get(s.id), new Promise(r => setTimeout(r, wait))]);
}

/** Start every style's font loading. */
export const loadFonts = (wait) => Promise.all(STYLES.map(s => fontReady(s.id, wait)));
