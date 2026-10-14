// ---------- The map: real streets, tipped back like you're looking ahead ----------
//
// Two layers:
//
//   plane    the street map. A rectangle of ground just big enough to fill the
//            screen, tilted back with a CSS 3D transform and faded into the sky
//            at the far edge. The map tiles inside it turn when you turn the
//            map. It's only ever looked at, never touched.
//   sprites  you, the milbils and the shops. These are flat, upright pictures
//            in an ordinary 2D layer. Their screen positions come from running
//            each one's latitude/longitude through the same maths as the CSS
//            transform, so they sit exactly on the tilted map — but they stay
//            upright, shrink with distance, and are trivially tappable.
//
// The camera is set in metres, not map zoom levels: the screen shows a patch of
// ground VIEW_W metres across at your feet and VIEW_L metres from the bottom of
// the screen to the horizon. One finger turns the map, two fingers zoom out a
// bit if you want to look around. If the tile server can't be reached, the
// plane is plain grass, so the game is still playable without a map.

import { toWorld } from './geo.js';

const TILE = 256;
const MAX_NATIVE = 19;
const MIN_OFFSET = -2, MAX_OFFSET = 0.6;   // how far pinching may zoom out / in (powers of 2)
const TEXTURE_MAX = 4000; // device pixels: just under the 4096 many GPUs allow
const D2R = Math.PI / 180;

// Street tiles that need no API key. OpenStreetMap's own server first; if a tile
// won't come from there, OpenStreetMap France's (the "Humanitarian" style).
// Both ask for light use and a credit on screen, which the corner gives them.
// (CARTO's free tiles used to be first here, but they now want a key — and
// instead of failing they send a picture saying so, which looks like a map tile.)
const PROVIDERS = [
  { url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png` },
  { url: (z, x, y) => `https://${'abc'[(x + y) % 3]}.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png`,
    credit: ' · tiles <a href="https://www.openstreetmap.fr/" target="_blank" rel="noopener">OSM France</a>' },
];

export class MapView {
  constructor(root, { onTap, viewW = 5, viewL = 15 } = {}){
    this.root = root;
    this.onTap = onTap || (() => {});
    this.center = { lat: 0, lng: 0 };
    this.viewW = viewW;    // metres across the screen, at your feet
    this.viewL = viewL;    // metres from the bottom of the screen to the horizon
    this.zoomOffset = 0;   // pinch: 0 is the set view, -1 shows twice as much
    this.zoom = 0;         // the map zoom level that works out to, for the tiles
    this.bearing = 0;      // degrees; turns the map on screen
    this.tilt = 50;        // degrees the ground is tipped back
    this.reachM = 45;
    this.sprites = new Map();
    this.tiles = new Map();
    this.tileKey = '';
    this.failures = 0;
    this.loaded = 0;
    this.credited = false;

    root.classList.add('map');
    root.innerHTML = `
      <div class="map-ground"><div class="map-plane"><div class="map-turn"><div class="map-tiles"></div></div><div class="map-ring"></div></div></div>
      <div class="map-sky"></div>
      <div class="map-sprites"></div>
      <div class="map-attrib">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors</div>`;
    this.ground = root.querySelector('.map-ground');
    this.plane = root.querySelector('.map-plane');
    this.turn = root.querySelector('.map-turn');
    this.tileLayer = root.querySelector('.map-tiles');
    this.ring = root.querySelector('.map-ring');
    this.spriteLayer = root.querySelector('.map-sprites');
    this.attrib = root.querySelector('.map-attrib');

    this._gestures();
  }

  setCenter(p){ this.center = { lat: p.lat, lng: p.lng }; }
  setReach(m){ this.reachM = m; }
  get mapOffline(){ return this.failures > 6 && this.loaded === 0; }

  // ------------------------------------------------------------- sprites ---

  addSprite(id, pos, html, { cls = '', data = null } = {}){
    const el = document.createElement('div');
    el.className = `sprite ${cls}`;
    el.dataset.id = id;
    el.innerHTML = `<div class="sprite-body">${html}</div>`;
    this.spriteLayer.appendChild(el);
    const s = { id, lat: pos.lat, lng: pos.lng, el, data };
    this.sprites.set(id, s);
    return s;
  }
  moveSprite(id, pos){ const s = this.sprites.get(id); if (s){ s.lat = pos.lat; s.lng = pos.lng; } }
  removeSprite(id){
    const s = this.sprites.get(id);
    if (!s) return;
    s.el.remove();
    this.sprites.delete(id);
  }

  // ---------------------------------------------------------- projection ---

  /** Everything the frame needs, worked out once. */
  _frame(){
    const W = this.root.clientWidth, H = this.root.clientHeight;
    const th = this.tilt * D2R, be = this.bearing * D2R;
    const cth = Math.cos(th), sth = Math.sin(th);
    const P = Math.max(560, H * 1.05);
    const ax = W / 2, ay = H * 0.64;

    // Screen pixels per metre at your feet, and the zoom level that gives it.
    const ppm0 = W / this.viewW;
    const ppm = ppm0 * Math.pow(2, this.zoomOffset);
    const zoom = Math.log2(156543.03392 * Math.cos(this.center.lat * D2R) * ppm);
    const zi = Math.max(2, Math.min(MAX_NATIVE, Math.round(zoom)));
    const s = Math.pow(2, zoom - zi);
    this.zoom = zoom;

    // How much ground the screen shows, in screen px along the tipped plane:
    // `behind` reaches the bottom edge of the screen, `ahead` the rest of the
    // VIEW_L metres — but never so far that the horizon climbs over the top
    // 18% of the screen, which is the sky's.
    const below = H - ay;
    const behind = below * P / (P * cth + below * sth);
    const above = ay - H * 0.18;
    const den = P * cth - above * sth;
    let ahead = Math.max(100, this.viewL * ppm0 - behind);
    if (den > 1) ahead = Math.min(ahead, above * P / den);

    // The plane is drawn as one texture, and phones and graphics cards won't
    // draw textures past about 4096 pixels — the overflow just goes missing.
    // Keep its size times the screen's pixel density under that.
    const most = TEXTURE_MAX / Math.max(1, window.devicePixelRatio || 1);
    ahead = Math.min(ahead, most - behind - 30);
    const PH = ahead + behind + 30;
    const PW = Math.min(most, 2 * (W / 2 + 24) * (P + ahead * sth) / P);

    return { W, H, zi, s, th, be, P, ax, ay, ppm, ahead, behind, PW, PH,
             c: toWorld(this.center.lat, this.center.lng, zi),
             cos: Math.cos(be), sin: Math.sin(be), cth, sth };
  }

  /** Screen position and size factor of a lat/lng under frame f. */
  _project(f, lat, lng){
    const w = toWorld(lat, lng, f.zi);
    const dx = (w.x - f.c.x) * f.s, dy = (w.y - f.c.y) * f.s;
    const X = dx * f.cos - dy * f.sin;
    const Y = dx * f.sin + dy * f.cos;
    const k = f.P / (f.P - Y * f.sth);
    return { x: f.ax + X * k, y: f.ay + Y * f.cth * k, k, far: -Y };
  }

  /** A direction on screen (x right, y down) as east/north on the ground. */
  screenToGround(jx, jy){
    const be = this.bearing * D2R;
    const dx = jx * Math.cos(be) + jy * Math.sin(be);
    const dy = -jx * Math.sin(be) + jy * Math.cos(be);
    return { east: dx, north: -dy };
  }
  /** East/north on the ground as a sideways screen direction (for facing). */
  groundToScreenX(east, north){
    const be = this.bearing * D2R;
    return east * Math.cos(be) + north * Math.sin(be);
  }

  // -------------------------------------------------------------- render ---

  render(){
    const f = this._frame();
    if (!f.W) return;

    // ground: the plane's far edge is the horizon, its pivot is under your feet
    this.ground.style.perspective = `${f.P}px`;
    this.ground.style.perspectiveOrigin = `${f.ax}px ${f.ay}px`;
    const ps = this.plane.style;
    ps.width = `${f.PW}px`;
    ps.height = `${f.PH}px`;
    ps.left = `${f.ax - f.PW / 2}px`;
    ps.top = `${f.ay - f.ahead}px`;
    ps.transformOrigin = `${f.PW / 2}px ${f.ahead}px`;
    ps.transform = `rotateX(${this.tilt}deg)`;
    const ts = this.turn.style;
    ts.left = `${f.PW / 2}px`;
    ts.top = `${f.ahead}px`;
    ts.transform = `rotateZ(${this.bearing}deg) scale(${f.s})`;

    this._tiles(f);

    // Your reach, as a circle on the ground round your feet.
    const r = this.reachM * f.ppm;
    const rs = this.ring.style;
    rs.width = rs.height = `${2 * r}px`;
    rs.left = `${f.PW / 2 - r}px`;
    rs.top = `${f.ahead - r}px`;

    // sprites: gone past the horizon, and smaller when you've zoomed out
    const fade = f.ahead;
    const zf = Math.max(0.45, Math.min(1.2, Math.pow(2, this.zoomOffset * 0.8)));
    for (const sp of this.sprites.values()){
      const p = this._project(f, sp.lat, sp.lng);
      const off = p.far > fade || p.x < -80 || p.x > f.W + 80 || p.y < -40 || p.y > f.H + 160;
      if (off){ if (!sp.hidden){ sp.el.style.display = 'none'; sp.hidden = true; } continue; }
      if (sp.hidden){ sp.el.style.display = ''; sp.hidden = false; }
      const k = Math.max(0.45, Math.min(1.25, p.k)) * zf;
      sp.el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) scale(${k.toFixed(3)})`;
      sp.el.style.zIndex = String(Math.round(p.y));
      sp.el.style.opacity = p.far > fade * 0.8 ? String(Math.max(0, (fade - p.far) / (fade * 0.2))) : '';
    }
  }

  _tiles(f){
    const ox = Math.floor(f.c.x / TILE), oy = Math.floor(f.c.y / TILE);
    // Slide the tile layer so the point under your feet sits on the pivot.
    this.tileLayer.style.transform =
      `translate(${(ox * TILE - f.c.x).toFixed(3)}px,${(oy * TILE - f.c.y).toFixed(3)}px)`;

    // Tiles to cover the plane however the map is turned: a disc round you.
    const rz = Math.hypot(f.PW / 2, Math.max(f.ahead, f.behind + 30)) / f.s;
    const half = rz / TILE + 0.5;
    const key = `${f.zi}/${ox}/${oy}/${Math.ceil(half)}`;
    if (key === this.tileKey && this.tileOrigin) return;
    const zoomChanged = this.tileZ !== f.zi;
    this.tileKey = key;
    this.tileZ = f.zi;

    // When the origin moves, every tile shifts by the same whole-tile step.
    if (this.tileOrigin && !zoomChanged && (this.tileOrigin.x !== ox || this.tileOrigin.y !== oy)){
      for (const t of this.tiles.values()){
        t.el.style.left = `${(t.x - ox) * TILE}px`;
        t.el.style.top = `${(t.y - oy) * TILE}px`;
      }
    }
    this.tileOrigin = { x: ox, y: oy };

    const n = Math.pow(2, f.zi);
    const want = new Set();
    for (let dy = -Math.ceil(half); dy <= Math.ceil(half); dy++){
      for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++){
        if (Math.hypot(dx + 0.5, dy + 0.5) > half + 0.8) continue;
        const x = ox + dx, y = oy + dy;
        if (y < 0 || y >= n) continue;
        const k = `${f.zi}/${x}/${y}`;
        want.add(k);
        if (!this.tiles.has(k)) this._addTile(f.zi, x, y, ox, oy, n);
      }
    }
    for (const [k, t] of this.tiles){
      if (!want.has(k)){ t.el.remove(); this.tiles.delete(k); }
    }
  }

  _addTile(z, x, y, ox, oy, n){
    const img = new Image();
    img.className = 'tile';
    img.alt = '';
    img.draggable = false;
    img.decoding = 'async';
    img.style.left = `${(x - ox) * TILE}px`;
    img.style.top = `${(y - oy) * TILE}px`;
    const wx = ((x % n) + n) % n;
    let provider = 0;
    img.onload = () => {
      img.classList.add('in');
      this.loaded++;
      const credit = PROVIDERS[provider].credit;
      if (credit && !this.credited){ this.credited = true; this.attrib.insertAdjacentHTML('beforeend', credit); }
    };
    img.onerror = () => {
      this.failures++;
      if (++provider < PROVIDERS.length) img.src = PROVIDERS[provider].url(z, wx, y);
      else img.remove();
    };
    img.src = PROVIDERS[0].url(z, wx, y);
    this.tileLayer.appendChild(img);
    this.tiles.set(`${z}/${x}/${y}`, { el: img, x, y });
  }

  // ------------------------------------------------------------ gestures ---

  _gestures(){
    const el = this.root;
    const pts = new Map();
    let tap = null, rot = null, pinch = null;

    const twoDist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };

    el.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.no-map')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1){
        tap = { x: e.clientX, y: e.clientY, t: performance.now() };
        const above = e.clientY < this.root.clientHeight * 0.64;
        rot = { x: e.clientX, bearing: this.bearing, sign: above ? 1 : -1 };
      } else if (pts.size === 2){
        tap = null; rot = null;
        pinch = { d: twoDist(), off: this.zoomOffset };
      }
    });
    el.addEventListener('pointermove', (e) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      if (pinch && pts.size >= 2){
        this.zoomOffset = clamp(pinch.off + Math.log2(twoDist() / pinch.d), MIN_OFFSET, MAX_OFFSET);
      } else if (rot){
        if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 10) tap = null;
        if (!tap) this.bearing = (rot.bearing + (e.clientX - rot.x) * 0.3 * rot.sign + 360) % 360;
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0){
        if (tap && performance.now() - tap.t < 600 && e.type === 'pointerup'){
          const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest('.sprite');
          this.onTap(hit ? this.sprites.get(hit.dataset.id) : null, e);
        }
        tap = null; rot = null;
      }
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoomOffset = clamp(this.zoomOffset - e.deltaY * 0.0025, MIN_OFFSET, MAX_OFFSET);
    }, { passive: false });
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
