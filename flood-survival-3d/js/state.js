// ---------- Everything the game remembers ----------
//
// One object, plain data, serialisable. The day counter is the only clock:
// water height, weather and depot prices are all derived from it, so a save is
// just this object and the world comes back identical.
import {
  START_MONEY, SATCHEL, RES, RES_IDS, MAT_IDS, NODES, PRODUCTS, TIERS,
  matPrice, PROJECTS,
} from './econ.js';

const KEY = 'flood3d.save.v1';

const zeroed = (ids) => Object.fromEntries(ids.map((k) => [k, 0]));

export class GameState {
  constructor(){ this.reset(); }

  reset(){
    // Not 0: day 0.00 is the instant of dawn, which is dark. Open on a morning
    // you can actually see to work in.
    this.day = 0.16;
    this.money = START_MONEY;
    this.satchel = zeroed(RES_IDS);   // raw materials you are carrying
    this.stock = zeroed(MAT_IDS);     // bought timber, waiting at the build site
    this.tier = 0;                    // index into TIERS
    this.crafts = [];                 // { id, t, secs }
    this.shelf = {};                  // finished goods waiting for a customer
    this.houseStage = 0;
    this.boatStage = 0;
    this.nodeLeft = Object.fromEntries(Object.keys(NODES).map((k) => [k, NODES[k].perDay]));
    this.sales = 0;
    this.earned = 0;
    this.sweptAway = 0;
    this.seenIntro = false;
    this.ended = null;                // 'boat' | 'house' | 'wet' | 'lost'
  }

  // ------------------------------------------------------------------ satchel
  get carried(){ return RES_IDS.reduce((n, k) => n + this.satchel[k], 0); }
  get satchelFree(){ return SATCHEL - this.carried; }

  addRes(id, n = 1){
    const room = Math.min(n, this.satchelFree);
    this.satchel[id] += room;
    return room;
  }

  /** Drop everything you were carrying — what happens when the river takes you. */
  loseSatchel(){
    const lost = this.carried;
    for (const k of RES_IDS) this.satchel[k] = 0;
    this.sweptAway += lost;
    return lost;
  }

  // ------------------------------------------------------------------ business
  get tierInfo(){ return TIERS[this.tier]; }

  canCraft(p){
    if (this.crafts.length >= this.tierInfo.slots) return 'no free bench';
    if (p.tier > this.tier + 1) return 'needs a better shop';
    for (const [id, qty] of Object.entries(p.cost)){
      if (this.satchel[id] < qty) return 'not enough materials';
    }
    return null;
  }

  startCraft(p){
    if (this.canCraft(p)) return false;
    for (const [id, qty] of Object.entries(p.cost)) this.satchel[id] -= qty;
    this.crafts.push({ id: p.id, t: 0, secs: p.secs });
    return true;
  }

  shelfCount(){ return Object.values(this.shelf).reduce((a, b) => a + b, 0); }

  priceOf(id){
    const p = PRODUCTS.find((q) => q.id === id);
    return Math.round(p.price * this.tierInfo.mult);
  }

  /** Sell one thing at random from the shelf. Returns what went and for how much. */
  sellOne(){
    const ids = Object.keys(this.shelf).filter((k) => this.shelf[k] > 0);
    if (!ids.length) return null;
    // Customers take the dearest thing available — it makes stocking up on the
    // good stuff feel like it worked.
    ids.sort((a, b) => this.priceOf(b) - this.priceOf(a));
    const id = ids[0];
    this.shelf[id]--;
    const paid = this.priceOf(id);
    this.money += paid;
    this.earned += paid;
    this.sales++;
    return { id, paid };
  }

  upgradeCost(){ return TIERS[this.tier + 1]?.cost ?? null; }

  upgrade(){
    const next = TIERS[this.tier + 1];
    if (!next || this.money < next.cost) return false;
    this.money -= next.cost;
    this.tier++;
    return true;
  }

  // ------------------------------------------------------------------ depot
  buyMat(id, n, day){
    const unit = matPrice(id, day);
    const afford = Math.min(n, Math.floor(this.money / unit));
    if (afford <= 0) return 0;
    this.money -= afford * unit;
    this.stock[id] += afford;
    return afford;
  }

  /**
   * Marv buys raw material for a pittance. It exists so you can never be
   * completely stuck with a satchel full of clay and no way to make rent.
   */
  sellRaw(id){
    const n = this.satchel[id];
    if (!n) return 0;
    const paid = n * RES[id].sell;
    this.satchel[id] = 0;
    this.money += paid;
    this.earned += paid;
    return paid;
  }

  // ------------------------------------------------------------------ projects
  stageOf(which){ return which === 'house' ? this.houseStage : this.boatStage; }

  nextStage(which){
    const p = PROJECTS[which];
    const i = this.stageOf(which);
    return i < p.stages.length ? p.stages[i] : null;
  }

  /** Which materials the next stage is still short of. */
  missingFor(which){
    const stage = this.nextStage(which);
    if (!stage) return null;
    const out = {};
    for (const [id, qty] of Object.entries(stage.need)){
      const short = qty - this.stock[id];
      if (short > 0) out[id] = short;
    }
    return out;
  }

  canStart(which){
    const m = this.missingFor(which);
    return m !== null && Object.keys(m).length === 0;
  }

  completeStage(which){
    const stage = this.nextStage(which);
    if (!stage) return false;
    for (const [id, qty] of Object.entries(stage.need)) this.stock[id] -= qty;
    if (which === 'house') this.houseStage++; else this.boatStage++;
    return true;
  }

  get houseDone(){ return this.houseStage >= PROJECTS.house.stages.length; }
  get boatDone(){ return this.boatStage >= PROJECTS.boat.stages.length; }

  /**
   * Highest thing you can stand on when the surge comes, in metres.
   * `padY` is the ground under the house — everything the house adds is measured
   * from there, so the number can't drift from where the meshes actually are.
   */
  refugeHeight(padY){
    let up = 0;
    for (let i = 0; i < this.houseStage; i++){
      up = Math.max(up, PROJECTS.house.stages[i].stand);
    }
    return padY + up;
  }

  // ------------------------------------------------------------------ day roll
  /** Called at dawn: gather sites refill. */
  refillNodes(){
    for (const [site, spec] of Object.entries(NODES)) this.nodeLeft[site] = spec.perDay;
  }

  // ------------------------------------------------------------------ save
  save(){
    try { localStorage.setItem(KEY, JSON.stringify(this)); } catch {}
  }

  load(){
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (typeof data?.day !== 'number') return false;
      Object.assign(this, data);
      // Anything added to the save shape since this file was written.
      for (const k of RES_IDS) this.satchel[k] ??= 0;
      for (const k of MAT_IDS) this.stock[k] ??= 0;
      return true;
    } catch { return false; }
  }

  static clear(){ try { localStorage.removeItem(KEY); } catch {} }
}
