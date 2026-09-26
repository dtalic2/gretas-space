// ---------- The whole save: one plain object ----------
import { START, RES_KEYS } from './econ.js';
import { DEFAULT_LOOK } from './looks.js';

const KEY = 'middle-island-v1';

export class GameState {
  constructor(){ this.reset(); }

  reset(){
    this.res = { ...START };
    this.health = 100;
    this.hunger = 100;
    this.warmth = 100;
    this.day = 1;
    this.t = 0.08;               // fraction of the day; 0 is dawn
    this.quest = 0;
    this.upgrades = {};
    this.gathered = Object.fromEntries(RES_KEYS.map((k) => [k, 0]));
    this.player = null;
    this.world = null;
    this.won = false;
    this.started = false;
    this.settlerT = 0;
    this.lastMealDay = 1;
    this.look = { ...DEFAULT_LOOK };
  }

  has(cost){ return Object.entries(cost).every(([k, v]) => (this.res[k] ?? 0) >= v); }
  pay(cost){ for (const [k, v] of Object.entries(cost)) this.res[k] -= v; }
  add(k, n){ this.res[k] = (this.res[k] ?? 0) + n; this.gathered[k] = (this.gathered[k] ?? 0) + n; }

  save(world, player){
    const data = {
      v: 1,
      res: this.res, health: this.health, hunger: this.hunger, warmth: this.warmth,
      day: this.day, t: this.t, quest: this.quest, upgrades: this.upgrades, gathered: this.gathered,
      won: this.won, started: this.started, settlerT: this.settlerT, lastMealDay: this.lastMealDay, look: this.look,
      player: { x: player.position.x, z: player.position.z, facing: player.facing },
      world: world.serialize(),
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  load(){
    let data = null;
    try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    if (!data || data.v !== 1) return false;
    Object.assign(this, {
      res: { ...START, ...data.res }, health: data.health, hunger: data.hunger, warmth: data.warmth,
      day: data.day, t: data.t, quest: data.quest, upgrades: data.upgrades ?? {},
      gathered: { ...this.gathered, ...data.gathered }, won: !!data.won, started: !!data.started,
      settlerT: data.settlerT ?? 0, lastMealDay: data.lastMealDay ?? data.day,
      look: { ...DEFAULT_LOOK, ...data.look },
      player: data.player, world: data.world,
    });
    return true;
  }

  wipe(){ try { localStorage.removeItem(KEY); } catch {} }
}
