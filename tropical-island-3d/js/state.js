// ---------- The whole save: one plain object in localStorage ----------
import { ANIMALS } from './econ.js';

const KEY = 'coconut-cove-v1';

export class GameState {
  constructor(){ this.reset(); }

  reset(){
    this.coins = 5;
    this.day = 1;
    this.t = 0.12;                 // fraction of the day; 0 is dawn
    this.goal = 0;
    this.bag = { mango: 0, banana: 0, coconut: 0, seaweed: 0, shell: 0, star: 0, pearl: 0 };
    this.fish = {};                // species → how many in your bag
    this.journal = {};             // species → { count, best }
    this.found = { shell: 0, star: 0, pearl: 0 };
    this.friends = Object.fromEntries(Object.keys(ANIMALS).map((k) => [k, { hearts: k === 'dog' ? 1 : 0, petDay: 0 }]));
    this.owned = {};
    this.wearing = {};
    this.flags = {};               // one-off things you have done: swam, sold, played…
    this.player = null;
    this.started = false;
  }

  get fishCount(){ return Object.values(this.fish).reduce((a, b) => a + b, 0); }

  save(player){
    const data = { v: 1, ...this, player: { x: player.position.x, z: player.position.z, facing: player.facing } };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  load(){
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
    if (!d || d.v !== 1) return false;
    const fresh = new GameState();
    Object.assign(this, fresh, d, {
      bag: { ...fresh.bag, ...d.bag }, found: { ...fresh.found, ...d.found },
      friends: { ...fresh.friends, ...d.friends },
    });
    delete this.v;
    return true;
  }

  wipe(){ try { localStorage.removeItem(KEY); } catch {} }
}
