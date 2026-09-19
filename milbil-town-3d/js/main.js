// ---------- Boot, wiring and the frame loop ----------
import * as THREE from 'three';
import { World } from './world.js';
import { CameraRig } from './camera.js';
import { Town } from './town.js';
import { Milbils } from './milbils.js';
import { UI } from './ui.js';
import { Visitors } from './visitors.js';
import { Audio } from './audio.js';
import * as E from './econ.js';
import * as F from './format.js';
import { load, save, wipe, awaySeconds, residentsFor, barnMax } from './save.js';
import { BUILD, ITEMS, unlocksAt, barnUpgradeCost } from './data.js';
import { footCentre } from './island.js';

const boot = document.getElementById('boot');
const bootBar = document.getElementById('bootBar');
const bootMsg = document.getElementById('bootMsg');
const step = (pct, msg) => {
  bootBar.style.width = pct + '%';
  if (msg) bootMsg.textContent = msg;
};

class Game {
  constructor(){
    this.state = load();
    this.world = new World(document.getElementById('scene'));
    step(35, 'Laying out the island…');

    this.town = new Town(this.world, this.state);
    this.milbils = new Milbils(this.world, this.state);
    this.visitors = new Visitors(this.world, this.state, this.town);
    this.audio = new Audio(this.state.muted);
    this.ui = new UI(this);
    step(70, 'Waking the milbils…');

    this.rig = new CameraRig(this.world, this.world.renderer.domElement, {
      onTap: (x, y) => this.tap(x, y),
      placing: () => !!this.town.place,
      onPlaceDrag: (x, y) => this.dragGhost(x, y),
    });
    this.rig.focusOn(0, 1, 36);

    this.catchUp();
    this.bindGlobals();
    step(100, 'Ready');
  }

  // ------------------------------------------------------------ start-up --
  /** Run the clock forward over however long the game was closed. */
  catchUp(){
    const s = this.state;
    const now = Date.now();
    const away = awaySeconds(s);

    // A brand new town gets something to aim at straight away: one hand-made
    // wheat order (which the first field can fill) and one of the usual ones.
    if (!s.orders.length && !s.stats.delivered){
      s.orders.push({ uid: s.nextUid++, who:'sunny', want:[{ id:'wheat', n:4 }], coins:60, xp:12, at:now });
      const extra = E.rollOrder(s, now);
      if (extra) s.orders.push(extra);
      s.nextOrderAt = now + 40000;
    }
    E.tick(s, now);

    this.town.sync();
    this.milbils.refreshTaken();
    this.milbils.sync();
    this.visitors.sync();
    this.ui.hud();

    this.firstRun = !s.seenHelp;
    this.awayReport = away > 120 ? { rep: E.report(s, now), away } : null;
  }

  bindGlobals(){
    window.addEventListener('resize', () => this.world.resize());
    window.addEventListener('visibilitychange', () => {
      if (document.hidden) this.save();
      else { E.tick(this.state, Date.now()); this.ui.hud(); }
    });
    window.addEventListener('pagehide', () => this.save());

    document.getElementById('btnSound').onclick = () => this.toggleSound();
    document.getElementById('introGo').onclick = () => {
      document.getElementById('intro').classList.add('hidden');
      this.state.seenHelp = true;
      this.save();
      this.audio.tap();
    };

    window.addEventListener('keydown', (e) => {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      const k = e.key.toLowerCase();
      if (k === 'escape'){ this.town.place ? this.cancelPlace() : this.ui.close(); }
      if (k === 'm') this.toggleSound();
      if (k === 'h') this.ui.openHelp();
      if (k === 'b') this.ui.openShop();
      if (k === 'enter' && this.town.place) this.confirmPlace();
    });
  }

  toggleSound(){
    this.state.muted = !this.state.muted;
    this.audio.muted = this.state.muted;
    document.getElementById('btnSound').textContent = this.state.muted ? '🔇' : '🔊';
    if (!this.state.muted) this.audio.tap();
    this.save();
  }

  // --------------------------------------------------------------- input --
  tap(x, y){
    // Placing something: a tap sets it down where you pointed.
    if (this.town.place){
      const p = this.rig.groundAt(x, y);
      if (p) this.town.ghostToWorld(p);
      this.ui.placeBar(true, BUILD[this.town.place.type].name, this.town.place.ok, this.town.place.why);
      return;
    }

    const hit = this.rig.pick(x, y, this.town.pickables());
    if (!hit) return;
    const uid = this.town.uidOf(hit);
    const obj = uid == null ? null : E.objAt(this.state, uid);
    if (!obj) return;

    const now = Date.now();
    // Anything finished is collected by tapping it — no menu in the way.
    if (obj.type === 'field' && E.cropReady(obj, now)) return this.harvest(obj);
    if (obj.ready && obj.ready.length) return this.collect(obj);

    this.audio.tap();
    this.ui.openObject(obj);
  }

  dragGhost(x, y){
    const p = this.rig.groundAt(x, y);
    if (!p) return;
    this.town.ghostToWorld(p);
    const pl = this.town.place;
    this.ui.placeBar(true, BUILD[pl.type].name, pl.ok, pl.why);
  }

  // ------------------------------------------------------------- actions --
  plant(obj, cropId){
    const c = E.crop(cropId);
    if (!E.plant(this.state, obj, cropId)){
      const why = E.plantCheck(this.state, cropId).why;
      this.audio.nope();
      return this.ui.toast(why || 'Cannot plant that', 'bad');
    }
    this.audio.plant();
    this.town.refresh(obj);
    this.ui.close();
    this.ui.toast(`${c.emoji} ${c.name} planted — ready in ${F.span(c.secs)}`, 'good');
    this.after();
  }

  harvest(obj){
    const res = E.harvest(this.state, obj, Date.now());
    if (!res) return;
    if (res.full){
      this.audio.nope();
      return this.ui.toast('The barn is full — sell something or upgrade it', 'bad');
    }
    const c = E.crop(res.id);
    this.audio.harvest();
    this.town.refresh(obj);
    this.town.poof(obj.uid, c.color, 7);
    const a = this.town.anchor(obj.uid);
    if (a){
      this.ui.pop(a, `+${res.n} ${c.emoji}`);
      this.milbils.cheer(a.x, a.z);
    }
    this.ui.close();
    this.after(res.levels);
  }

  queue(obj, goodId){
    const g = E.good(goodId);
    if (!E.queueGood(this.state, obj, goodId)){
      this.audio.nope();
      return this.ui.toast(E.queueCheck(this.state, obj, goodId).why || 'Cannot make that', 'bad');
    }
    this.audio.build();
    this.ui.toast(`${g.emoji} ${g.name} started — ${F.span(g.secs)}`, 'good');
    this.after();
  }

  unqueue(obj){
    if (E.unqueueLast(this.state, obj)) this.ui.toast('Taken off the bench', '');
    this.after();
  }

  collect(obj){
    const res = E.collect(this.state, obj);
    if (!res) return;
    const names = Object.entries(res.got).map(([id, n]) => `+${n} ${ITEMS[id].emoji}`).join(' ');
    this.audio.harvest();
    const a = this.town.anchor(obj.uid);
    if (a && names){
      this.ui.pop(a, names);
      this.milbils.cheer(a.x, a.z);
    }
    this.town.poof(obj.uid, 0xffe7a8, 6);
    if (res.left) this.ui.toast('The barn is full — the rest is still on the shelf', 'bad');
    this.after(res.levels);
  }

  fill(orderUid){
    const res = E.fillOrder(this.state, orderUid);
    if (!res){
      this.audio.nope();
      return this.ui.toast('Not enough in the barn yet', 'bad');
    }
    this.audio.deliver();
    this.visitors.takeOff();
    const pad = this.state.objs.find(o => o.type === 'helipad');
    if (pad){
      const a = this.town.anchor(pad.uid);
      if (a){
        this.ui.pop(a, `+🪙 ${F.coins(res.coins)}`);
        this.milbils.cheer(a.x, a.z);
      }
      this.town.poof(pad.uid, 0xffd86b, 10);
    }
    this.ui.toast(`${res.who.name} flew off happy — 🪙 ${F.coins(res.coins)} and ${res.xp} xp`, 'good');
    this.after(res.levels);
  }

  skip(orderUid){
    if (!E.skipOrder(this.state, orderUid)){
      this.audio.nope();
      return this.ui.toast(`Another skip in ${F.clock(E.skipReadyIn(this.state, Date.now()))}`, 'bad');
    }
    this.ui.toast('They will come back another day', '');
    this.after();
  }

  sellItem(id, n){
    const paid = E.sellItem(this.state, id, n);
    if (!paid) return;
    this.audio.coins();
    this.after();
  }

  upgradeBarn(){
    const cost = this.barnCost();
    if (!E.upgradeBarn(this.state)){
      this.audio.nope();
      return this.ui.toast(`A bigger barn costs ${F.coins(cost)}`, 'bad');
    }
    this.audio.build();
    this.ui.toast(`The barn now holds ${barnMax(this.state)}`, 'good');
    this.after();
  }

  barnCost(){ return barnUpgradeCost(this.state.barnUps); }
  residents(obj){ return residentsFor(obj.uid, BUILD[obj.type].gives || 0); }
  unlocksAt(level){ return unlocksAt(level); }

  // ----------------------------------------------------------- placement --
  buy(type){
    const check = E.buyCheck(this.state, type);
    if (!check.ok){
      this.audio.nope();
      return this.ui.toast(check.why, 'bad');
    }
    this.ui.close();
    this.audio.tap();
    const place = this.town.beginPlace(type);
    // Start it in the middle of what you are looking at, so it is never off-screen.
    const look = this.rig.target;
    this.town.ghostToWorld(new THREE.Vector3(look.x, 0, look.z));
    this.ui.placeBar(true, BUILD[type].name, this.town.place.ok, this.town.place.why);
  }

  startMove(obj){
    this.ui.close();
    this.town.beginPlace(obj.type, obj.uid);
    this.ui.placeBar(true, BUILD[obj.type].name, this.town.place.ok, this.town.place.why);
  }

  confirmPlace(){
    const p = this.town.place;
    if (!p || !p.ok){
      this.audio.nope();
      return;
    }
    if (p.uid != null){
      E.moveObj(this.state, p.uid, p.x, p.z);
      this.town.cancelPlace();
      this.audio.build();
      this.ui.toast('Moved', '');
      this.after();
      return;
    }
    const res = E.build(this.state, p.type, p.x, p.z);
    this.town.cancelPlace();
    this.ui.placeBar(false);
    if (!res){
      this.audio.nope();
      return this.ui.toast('That did not work out', 'bad');
    }
    this.audio.build();
    this.town.sync();
    const a = this.town.anchor(res.obj.uid);
    if (a){
      this.town.poof(res.obj.uid, 0xfff0c0, 10);
      this.milbils.cheer(a.x, a.z);
    }
    this.ui.toast(`${BUILD[p.type].emoji} ${BUILD[p.type].name} built`, 'good');
    this.after(res.levels);
  }

  cancelPlace(){
    this.town.cancelPlace();
    this.ui.placeBar(false);
  }

  sellObj(obj){
    const name = BUILD[obj.type].name;
    const refund = E.sellObj(this.state, obj.uid);
    if (!refund) return;
    this.ui.close();
    this.audio.coins();
    this.ui.toast(`${name} sold for 🪙 ${F.coins(refund)}`, '');
    this.after();
  }

  wipe(){
    if (!window.confirm('Start again? This town and everything in it goes away.')) return;
    wipe();
    location.reload();
  }

  followObjective(){
    const s = this.state;
    const step = E.objective(s);
    if (!step) return;
    if (step.want === 'shop') return this.ui.openShop();
    const target = s.objs.find(o => o.type === step.want)
      || s.objs.find(o => o.type === 'field' && !o.crop)
      || s.objs[0];
    if (!target) return;
    const { w, d } = E.footprint(target);
    const c = footCentre(target.x, target.z, w, d);
    this.rig.focusOn(c.x, c.z, Math.min(this.rig.dist, 20));
    this.audio.tap();
  }

  // -------------------------------------------------------------- upkeep --
  /** Called after anything that changes the state: redraw, resync, save. */
  after(levels){
    this.town.sync();
    this.milbils.refreshTaken();
    this.milbils.sync();
    this.visitors.sync();
    this.ui.hud();
    this.ui.refresh();
    this.ui.objective(E.objective(this.state));     // tick again straight away
    if (levels && levels.length){
      this.audio.level();
      this.ui.levelUp(levels);
    }
    this.save();
  }

  save(){ save(this.state); }

  // ---------------------------------------------------------------- loop --
  start(){
    boot.classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('btnSound').textContent = this.state.muted ? '🔇' : '🔊';

    const controls = document.getElementById('introControls');
    controls.textContent = window.matchMedia('(pointer: coarse)').matches
      ? 'Drag to look around, pinch to zoom, tap anything to use it.'
      : 'Drag to pan · wheel to zoom · shift-drag to turn · tap anything to use it.';

    if (this.firstRun) document.getElementById('intro').classList.remove('hidden');
    else if (this.awayReport) this.ui.welcomeBack(this.awayReport.rep, this.awayReport.away);

    let last = performance.now();
    let sinceSave = 0, sinceTick = 0;

    const frame = (t) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const now = Date.now();

      this.rig.update(dt);
      this.world.update(dt);
      this.town.update(dt, now);
      this.milbils.update(dt, t / 1000);
      this.visitors.update(dt, t / 1000);

      // Timers only need checking a few times a second.
      sinceTick += dt;
      if (sinceTick > 0.4){
        sinceTick = 0;
        const res = E.tick(this.state, now);
        for (const o of this.state.objs) if (o.type === 'field') this.town.refresh(o);
        if (res.made || res.orders) this.ui.refresh();
        if (res.orders) this.visitors.sync();
        this.ui.hud();
        this.ui.objective(E.objective(this.state));
      }

      this.ui.markers(now);
      this.world.render();

      sinceSave += dt;
      if (sinceSave > 6){ sinceSave = 0; this.save(); }

      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}

// ------------------------------------------------------------------ boot --
step(10, 'Unpacking the island…');
requestAnimationFrame(() => {
  try {
    const game = new Game();
    window.game = game;                      // handy from the console
    setTimeout(() => game.start(), 120);
  } catch (err){
    console.error(err);
    bootMsg.textContent = 'Something went wrong: ' + err.message;
  }
});
