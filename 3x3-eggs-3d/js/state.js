// ---------- What the game remembers ----------
//
// Everything here survives a reload: the animals you have hatched, the coins
// they earn, the upgrades, which biomes are open, which character you run as,
// and the per-fact record that makes the questions adapt.
//
// Nothing about a single raid is kept. Getting caught costs you the egg in your
// hands and nothing else — there is no run to lose, so there is no reason to be
// afraid of the big guardian, only a reason to be careful.

import { DEFAULT_TABLES } from './mathq.js';
import { PROFILES } from './profiles.js';
import { SPECIES, speciesById, rarityById } from './animals.js';
import { BIOMES } from './world.js';

const KEY = 'eggheist.save.v1';

export const UPGRADES = [
  { id: 'boots',  name: 'Fast Boots',   icon: '👟', max: 5, base: 40,  step: 1.9,
    blurb: (n) => `Run ${Math.round(n * 7)}% faster` },
  { id: 'socks',  name: 'Quiet Socks',  icon: '🧦', max: 5, base: 55,  step: 2.0,
    blurb: (n) => `Guardians wake ${Math.round(n * 11)}% slower` },
  { id: 'lungs',  name: 'Big Lungs',    icon: '🫁', max: 4, base: 70,  step: 2.2,
    blurb: (n) => `${Math.round(n * 30)}% more sprint` },
  { id: 'basket', name: 'Egg Basket',   icon: '🧺', max: 3, base: 150, step: 3.0,
    blurb: (n) => `Carry ${n} more egg${n === 1 ? '' : 's'} at once` },
  { id: 'charm',  name: 'Lucky Charm',  icon: '🍀', max: 4, base: 220, step: 2.6,
    blurb: (n) => `Rarer eggs, about ${Math.round(n * 18)}% better odds` },
];

export const upgradeCost = (u, level) => Math.round(u.base * Math.pow(u.step, level));

export class GameState {
  constructor(){
    this.coins = 0;
    this.lifetime = 0;
    this.profile = 'pip';
    this.tables = [...DEFAULT_TABLES];
    this.biome = 0;
    this.biomes = [0];                 // unlocked
    this.animals = {};                 // speciesId -> count
    this.upgrades = { boots: 0, socks: 0, lungs: 0, basket: 0, charm: 0 };
    this.facts = {};                   // 'a×b' -> { seen, wrong, streak }
    this.stats = { steals: 0, caught: 0, hatched: 0, correct: 0, wrong: 0, best: 0 };
    this.sound = true;
    this.seenHelp = false;
  }

  // ------------------------------------------------------------- the animals
  get collected(){ return Object.keys(this.animals).length; }
  get totalAnimals(){ return Object.values(this.animals).reduce((a, b) => a + b, 0); }

  /** Returns { species, isNew, count }. */
  addAnimal(id){
    const isNew = !this.animals[id];
    this.animals[id] = (this.animals[id] || 0) + 1;
    this.stats.hatched++;
    this.save();
    return { species: speciesById(id), isNew, count: this.animals[id] };
  }

  /** Coins per minute from everything in the pen. */
  get income(){
    let n = 0;
    for (const [id, count] of Object.entries(this.animals)){
      const sp = speciesById(id);
      if (sp) n += rarityById(sp.rarity).coins * count;
    }
    return n;
  }

  // ------------------------------------------------------------- the upgrades
  level(id){ return this.upgrades[id] || 0; }

  canBuy(id){
    const u = UPGRADES.find((x) => x.id === id);
    const lv = this.level(id);
    return !!u && lv < u.max && this.coins >= upgradeCost(u, lv);
  }

  buy(id){
    if (!this.canBuy(id)) return false;
    const u = UPGRADES.find((x) => x.id === id);
    this.coins -= upgradeCost(u, this.level(id));
    this.upgrades[id] = this.level(id) + 1;
    this.save();
    return true;
  }

  // Everything the player's body is, after upgrades and the character's traits.
  get loadout(){
    const p = PROFILES.find((x) => x.id === this.profile) || PROFILES[0];
    return {
      speed: (1 + this.level('boots') * 0.07) * p.trait.speed,
      quiet: (1 - this.level('socks') * 0.11) * (2 - p.trait.sneak),
      stamina: 1 + this.level('lungs') * 0.3,
      carry: 1 + this.level('basket') + p.trait.carry,
      luck: this.level('charm') * 0.18,
      profile: p,
    };
  }

  // ------------------------------------------------------------- the biomes
  biomeUnlocked(i){ return this.biomes.includes(i); }

  unlockBiome(i){
    const b = BIOMES[i];
    if (!b || this.biomeUnlocked(i) || this.coins < b.cost) return false;
    this.coins -= b.cost;
    this.biomes.push(i);
    this.biomes.sort((a, c) => a - c);
    this.save();
    return true;
  }

  // ------------------------------------------------------------- the profiles
  profileUnlocked(p){ return this.collected >= p.at; }

  wear(id){
    const p = PROFILES.find((x) => x.id === id);
    if (!p || !this.profileUnlocked(p)) return false;
    this.profile = id;
    this.save();
    return true;
  }

  // ------------------------------------------------------------- the money
  earn(n){
    const v = Math.max(0, Math.round(n));
    this.coins += v;
    this.lifetime += v;
    return v;
  }

  // ------------------------------------------------------------- the tables
  toggleTable(t){
    const i = this.tables.indexOf(t);
    if (i >= 0){
      if (this.tables.length > 1) this.tables.splice(i, 1);
    } else {
      this.tables.push(t);
    }
    this.tables.sort((a, b) => a - b);
    this.save();
  }

  // ------------------------------------------------------------- the disk
  save(){
    try {
      localStorage.setItem(KEY, JSON.stringify({
        coins: this.coins, lifetime: this.lifetime, profile: this.profile,
        tables: this.tables, biome: this.biome, biomes: this.biomes,
        animals: this.animals, upgrades: this.upgrades, facts: this.facts,
        stats: this.stats, sound: this.sound, seenHelp: this.seenHelp,
      }));
    } catch (_){ /* private browsing — it plays, it just forgets */ }
  }

  load(){
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (_){ return false; }
    if (!d) return false;

    this.coins = d.coins || 0;
    this.lifetime = d.lifetime || 0;
    this.profile = d.profile || 'pip';
    if (Array.isArray(d.tables) && d.tables.length) this.tables = d.tables;
    this.biomes = Array.isArray(d.biomes) && d.biomes.length ? d.biomes : [0];
    this.biome = this.biomes.includes(d.biome) ? d.biome : this.biomes[0];
    this.animals = d.animals || {};
    this.upgrades = Object.assign({ boots: 0, socks: 0, lungs: 0, basket: 0, charm: 0 }, d.upgrades);
    this.facts = d.facts || {};
    this.stats = Object.assign(this.stats, d.stats);
    this.sound = d.sound !== false;
    this.seenHelp = !!d.seenHelp;

    // Drop anything from an older species table so the collection count is honest.
    for (const id of Object.keys(this.animals)){
      if (!SPECIES.some((s) => s.id === id)) delete this.animals[id];
    }
    return true;
  }

  static clear(){
    try { localStorage.removeItem(KEY); } catch (_){ /* nothing to clear */ }
  }
}
