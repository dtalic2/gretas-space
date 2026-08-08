// ---------- 3x3 Garden 3D — bootstrap and game loop ----------
import * as THREE from 'three';
import { World, STATIONS, setWorldMotion } from './world.js';
import { Player } from './player.js';
import { Garden, progressOf, fruitProgressOf, isReady, isThirsty, secondsLeft,
         setThirstEase, setRegrowBonus } from './garden.js';
import { setCropMotion } from './crops.js';
import { UI } from './ui.js';
import * as Save from './save.js';
import { CROPS, ANIMALS, DECOR, CHARMS, SHOP_UNLOCKS, MAGIC_UNLOCKS,
         MARKET_DISCOUNT, MARKET_ROTATE_SEC,
         PLOT_MAX, PLOT_START, PLOT_ORDER, plotCost,
         MOTION_STYLES, DEFAULT_MOTION,
         OWN_TREE, OWN_TREE_RESTOCK_SEC, OWN_TREE_MIN_BATCH, OWN_TREE_MAX_BATCH,
         OWN_TREE_MAX_ITEMS,
         SUPER_UNLOCK, REALM_UNLOCK, SUPER_PAGE,
         TOOLS, DIG_REFUND, DRAGON_UNLOCK, MANSION_UNLOCK, VOID_UNLOCK,
         CAP_DEAL_OFF, CAP_PLOT_OFF, CAP_SEED_SAVE, CAP_DIG_BACK, CAP_LUCK } from './data.js';
import { fmtNum, fmtTime } from './format.js';

const HOTBAR_KEYS = 9;   // number keys 1-9; Q cycles beyond that

const state = Save.load();
const ui    = new UI();

ui.bootProgress(15, 'Waking the sun…');

const world  = new World(document.getElementById('scene'));
ui.bootProgress(55, 'Tilling the soil…');

const player = new Player(world);
const garden = new Garden(world, state.plots);
ui.bootProgress(85, 'Planting the hedgerows…');

// Restore purchased decor and livestock.
for (const key of Object.keys(DECOR)) if (state.decor[key]) world.setDecor(key, true);
world.syncAnimals(state.animals);
if (state.ownTree) world.setOwnTree(true);

ui.muted = !!state.muted;
ui.onMuteChange = (m) => { state.muted = m; Save.save(state); };
ui.onBag = () => { if (ui.shopOpen) ui.closeShop(); else openInventory(); };
ui.onSettings = () => { if (ui.shopOpen) ui.closeShop(); else openSettings(); };

// ---------------- shovel ----------------
// A mode rather than a gesture: tapping already plants/waters/harvests, and a
// long-press or modifier wouldn't survive the jump between mouse and touch.
let digMode = false;
function setDigMode(on){
  digMode = !!on && hasTool('shovel');
  ui.setDig(hasTool('shovel'), digMode);
  updateFocus();
}
ui.onBulk = () => tendAll();
ui.onDig = () => { setDigMode(!digMode); if (digMode) ui.toast('🪏 Dig mode — tap a plant to remove it', ''); };

// ---------------- motion style ----------------
function applyMotion(){
  const style = MOTION_STYLES[state.motion] || MOTION_STYLES[DEFAULT_MOTION];
  setCropMotion(style);
  setWorldMotion(style);
  document.body.dataset.motion = state.motion;
}
applyMotion();

function openSettings(){
  const build = () => ({
    title:'⚙️ Settings',
    coins:state.coins,
    tabs:[],
    note:'Animation style changes how plants grow in and how much the world moves. Pick whatever feels best.',
    items: [
      ...Object.entries(MOTION_STYLES).map(([id, m]) => ({
        id, emoji:m.emoji, name:m.name, meta:m.desc,
        readonly: state.motion === id,
        ownedText: state.motion === id ? '✓ Active' : 'Tap to use',
      })),
      { id:'__sound', emoji: ui.muted ? '🔇' : '🔊', name:'Sound',
        meta:'Coins, chimes and pops', ownedText: ui.muted ? 'Off' : 'On' },
    ],
    onBuy: (id) => {
      if (id === '__sound'){
        ui.toggleMute();
        ui.refreshShop(build());
        return;
      }
      state.motion = id;
      applyMotion();
      ui.pop();
      ui.toast(`${MOTION_STYLES[id].emoji} ${MOTION_STYLES[id].name} animation`, 'good');
      persist();
      ui.refreshShop(build());
    },
  });
  ui.openShop(build());
}

// ---------------- derived values ----------------
const growthMult = () =>
  1 + Object.entries(state.animals).reduce((s, [k, n]) => s + (ANIMALS[k]?.boost || 0) * n, 0)
    + Object.keys(state.charms).reduce((s, k) => s + (CHARMS[k]?.boost || 0), 0);

const hasCharm = (k) => !!state.charms[k];
const hasTool  = (k) => !!state.tools[k];

// ---------------- charm + animal effects ----------------
// Every charm field is summed here rather than special-cased at each call site,
// so adding a charm is a data change and nothing else.
const charmSum = (key) =>
  Object.keys(state.charms).reduce((s, k) => s + (CHARMS[k]?.[key] || 0), 0);
const charmMax = (key) =>
  Object.keys(state.charms).reduce((s, k) => Math.max(s, CHARMS[k]?.[key] || 0), 0);
const charmFlag = (key) => Object.keys(state.charms).some(k => CHARMS[k]?.[key]);

/** Applied to whatever the garden and the shops need to know. */
function applyCharms(){
  setThirstEase(charmMax('thirstEase'));
  setRegrowBonus(1 + charmSum('regrow'));
}

const marketOff  = () => Math.min(CAP_DEAL_OFF,  MARKET_DISCOUNT + charmSum('dealOff'));
const plotOff    = () => Math.min(CAP_PLOT_OFF,  charmSum('plotOff'));
const seedSave   = () => Math.min(CAP_SEED_SAVE, charmSum('seedSave'));
const digRefund  = () => Math.min(CAP_DIG_BACK,  DIG_REFUND + charmSum('digBack'));
const autoWater  = () => charmFlag('water');
const netPlotCost = (owned) => Math.max(1, Math.round(plotCost(owned) * (1 - plotOff())));

// Animals aren't all speed. Some raise what produce fetches, some improve the
// odds of a double harvest, and the dragon does all three.
const animalSum = (key) =>
  Object.entries(state.animals).reduce((s, [k, n]) => s + (ANIMALS[k]?.[key] || 0) * n, 0);

/** Multiplier on every sale. */
const valueMult = () => 1 + animalSum('value') + charmSum('value');

/** Chance a harvest pays double, from the Lucky Charm plus any animals. */
const luckChance = () => Math.min(CAP_LUCK, charmSum('luck') + animalSum('luck'));

const seedIds = () => Object.keys(CROPS).filter(id => (state.seeds[id] || 0) > 0);

let selectedSeed = seedIds()[0] || 'carrot';

// ---------------- soil plots ----------------
// PLOT_ORDER runs outward from the centre, so the owned plots are always its
// first `plotsUnlocked` entries.
let unlockedPlots = new Set();

function refreshPlots(){
  unlockedPlots = new Set(PLOT_ORDER.slice(0, state.plotsUnlocked));
  for (let i = 0; i < PLOT_MAX; i++) world.setPlotUnlocked(i, unlockedPlots.has(i));
}
refreshPlots();
applyCharms();
ui.setDig(hasTool('shovel'), false);
ui.setBulk(Object.keys(TOOLS).some(k => TOOLS[k].bulk && hasTool(k)));

// ---------------- HUD ----------------
function refreshHUD(){
  state.level = Save.levelFor(state.lifetime);
  ui.setStats({ coins: state.coins, level: state.level });

  // Only seeds actually in the satchel — listing every unlocked variety would
  // overflow the bar now there are 15 crops. The bar wraps, so there's no cap:
  // number keys reach the first nine, Q cycles through everything.
  const slots = Object.keys(CROPS)
    .filter(id => (state.seeds[id] || 0) > 0)
    .map(id => ({
      id, emoji:CROPS[id].emoji, name:CROPS[id].name,
      count:state.seeds[id], locked:false,
    }));

  if (!slots.some(s => s.id === selectedSeed)){
    selectedSeed = slots[0]?.id || selectedSeed;
  }
  ui.renderHotbar(slots, selectedSeed, id => { selectedSeed = id; refreshHUD(); });
}

function earn(amount, why){
  const n = Math.round(amount);
  state.coins += n;
  state.lifetime += n;
  const before = state.level;
  const after = Save.levelFor(state.lifetime);
  refreshHUD();
  ui.coin();
  if (why) ui.toast(`+${fmtNum(n)} 🪙 ${why}`, 'gold');
  if (after > before){
    state.level = after;
    ui.levelUp();
    ui.toast(`🎉 Level ${after}! New seeds in the shop.`, 'good');
  }
}

function spend(amount){
  if (state.coins < amount) return false;
  state.coins -= amount;
  refreshHUD();
  return true;
}

// ---------------- your own magic tree ----------------
/** Everything currently unlocked, so gifts are always things you can actually use. */
function giftPool(){
  return Object.entries(CROPS).filter(([id, c]) => {
    const lvl = c.rare ? MAGIC_UNLOCKS[id] : SHOP_UNLOCKS[id];
    return lvl != null && state.level >= lvl;
  });
}

/** One gift. Cheap seeds are common; the expensive stuff turns up rarely. */
function rollGift(){
  const pool = giftPool();
  if (!pool.length) return 'carrot';
  const weights = pool.map(([, c]) => 1 / Math.sqrt(Math.max(1, c.cost)));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++){
    r -= weights[i];
    if (r <= 0) return pool[i][0];
  }
  return pool[pool.length - 1][0];
}

/**
 * Top the tree up for however many restock periods have elapsed, including time
 * spent away. The backlog past the cap is dropped rather than banked, so coming
 * back after a day doesn't hand over hundreds of seeds.
 */
function accrueOwnTree(){
  if (!state.ownTree) return false;
  const now = Date.now();
  const period = (OWN_TREE_RESTOCK_SEC * 1000) / (1 + charmSum('treeSpeed'));
  if (!state.ownTreeAt) state.ownTreeAt = now;

  const elapsed = now - state.ownTreeAt;
  const due = Math.floor(elapsed / period);
  if (due <= 0) return false;

  state.ownTreeAt = now - (elapsed % period);   // keep the phase, drop the backlog

  const batches = Math.min(due, 6);
  for (let b = 0; b < batches; b++){
    const n = OWN_TREE_MIN_BATCH + Math.floor(Math.random() * (OWN_TREE_MAX_BATCH - OWN_TREE_MIN_BATCH + 1))
            + charmSum('treeBatch');
    for (let i = 0; i < n; i++) state.ownTreeStock.push(rollGift());
  }
  if (state.ownTreeStock.length > OWN_TREE_MAX_ITEMS){
    state.ownTreeStock = state.ownTreeStock.slice(-OWN_TREE_MAX_ITEMS);
  }
  return true;
}

const ownTreeSecsLeft = () => Math.max(0, Math.ceil(
  ((OWN_TREE_RESTOCK_SEC * 1000) / (1 + charmSum('treeSpeed')) - (Date.now() - state.ownTreeAt)) / 1000));

function collectOwnTree(){
  accrueOwnTree();
  if (!state.ownTreeStock.length){
    ui.toast(`🌳 Nothing ripe yet — next gift in ${fmtTime(ownTreeSecsLeft())}`, '');
    return;
  }

  const counts = {};
  for (const id of state.ownTreeStock) counts[id] = (counts[id] || 0) + 1;
  state.ownTreeStock = [];

  for (const [id, n] of Object.entries(counts)) state.seeds[id] = (state.seeds[id] || 0) + n;

  world.setOwnTreeStock(0);
  ui.chime();
  const summary = Object.entries(counts).map(([id, n]) => `${CROPS[id].emoji}×${n}`).join(' ');
  ui.toast(`🌳 Collected ${summary}`, 'gold');
  refreshHUD();
  persist();
}

// ---------------- targeting ----------------
// Two ways to aim at something: point at it (mouse hover or a tap, any distance)
// or simply stand next to it. Pointing wins when both are live.
let focusPlot = null;
let focusStation = null;
let hoverPlot = null;
let hoverStation = null;

// Where the pointer last was, so the hover can be re-picked as the camera moves
// with the player. Without this the target goes stale the moment you walk.
let pointerX = 0, pointerY = 0, pointerInside = false;
const lastPlayerPos = new THREE.Vector3();

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/** What's under this screen point? @returns {{plot?:number, station?:string}|null} */
function pickAt(clientX, clientY){
  ndc.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, world.camera);
  const hits = raycaster.intersectObjects([garden.group, ...world.pickTiles, ...world.stationGroups], true);
  for (const h of hits){
    for (let o = h.object; o; o = o.parent){
      if (o.userData?.stationKey) return { station: o.userData.stationKey };
      if (o.userData?.plotIndex != null) return { plot: o.userData.plotIndex };
    }
  }
  return null;
}

/** Human-readable state of one plot, shared by the prompt and the % bubble. */
function plotStatus(i){
  const plot = state.plots[i];
  if (!unlockedPlots.has(i)) return { locked:true, text:'Unclaimed soil — buy plots at the Carpenter' };
  const now = Date.now(), mult = growthMult();
  if (!plot.crop){
    if (digMode) return { text:'Nothing to dig up here' };
    const have = state.seeds[selectedSeed] || 0;
    return { text: have > 0 ? `Plant ${CROPS[selectedSeed].name}` : 'No seeds — visit the Seed Shop' };
  }
  const spec = CROPS[plot.crop];
  const pct = fruitProgressOf(plot, now, mult) * 100;
  if (digMode){
    return { pct, text: `🪏 Dig up ${spec.name} · +${fmtNum(Math.max(1, Math.round(spec.cost * digRefund())))} back` };
  }
  if (isReady(plot, now, mult)){
    return { pct, text: spec.perennial ? `Pick from the ${spec.name}` : `Harvest ${spec.name}` };
  }
  if (isThirsty(plot, now, mult)){
    return { pct, text: `Water ${spec.name} — ${Math.floor(pct)}% grown` };
  }
  return { pct, text: `${spec.name} — ${Math.floor(pct)}% · ${fmtTime(Math.ceil(secondsLeft(plot, now, mult)))} left` };
}

const STATION_LABELS = {
  seedshop:'Open the Seed Shop', animals:'Open the Animal Pen',
  carpenter:'Open the Carpenter', market:'Browse the Market deal',
  magictree:'Trade at the Magic Tree',
  owntree:'Your Magic Tree',
  magicmarket:'Browse the Magic Market',
  supermarket:'Browse the Super Magic Market',
  supertree:'Shop the Super Magic Tree',
  realm:'Enter the Enchanted Realm',
  dragoncave:'Enter the Dragon Cave',
  mansion:'Enter the Magic Mansion',
  voidgate:'Step into the Infinity Void',
};

function updateFocus(){
  const p = player.position;
  focusStation = null;
  focusPlot = null;

  // Keep the pointed-at target honest. While the cursor is over the canvas we
  // re-pick from its last position (the camera moves with the player, so the
  // world under the cursor changes). Otherwise, walking clears the target so
  // `E` acts on whatever you've walked up to instead of something you pointed
  // at earlier.
  if (pointerInside && !ui.modalOpen){
    const hit = pickAt(pointerX, pointerY);
    hoverPlot = hit?.plot ?? null;
    hoverStation = hit?.station ?? null;
  } else if (lastPlayerPos.distanceToSquared(p) > 0.0004){
    hoverPlot = null;
    hoverStation = null;
  }
  lastPlayerPos.copy(p);

  let bestStation = Infinity;
  for (const [key, st] of Object.entries(STATIONS)){
    if (st.owned && !state.ownTree) continue;
    const d = Math.hypot(p.x - st.pos.x, p.z - st.pos.z);
    if (d < st.radius && d < bestStation){ bestStation = d; focusStation = key; }
  }

  let nearestLocked = null;
  if (!focusStation){
    let best = 1.5;
    world.plotAnchors.forEach((a, i) => {
      const d = Math.hypot(p.x - a.x, p.z - a.z);
      if (d >= best) return;
      best = d;
      if (unlockedPlots.has(i)){ focusPlot = i; nearestLocked = null; }
      else { focusPlot = null; nearestLocked = i; }
    });
  }

  // What you're standing next to wins for `E`. A resting cursor is passive — it
  // shouldn't hijack the key just because it happens to sit over something in
  // the distance. Clicking is the deliberate act, and it targets the hit directly.
  const plotTarget    = focusPlot != null ? focusPlot : hoverPlot;
  const stationTarget = focusStation || (plotTarget != null ? null : hoverStation);

  // The ring and the % bubble still follow the cursor, so pointing at a far plot
  // tells you about it even while you're stood somewhere else.
  const inspect = hoverPlot != null ? hoverPlot : plotTarget;
  garden.focus(inspect);

  if (ui.modalOpen){
    ui.hidePrompt();
    garden.showPercent(null);
    return;
  }

  // The bubble reports whatever the cursor is inspecting; the prompt describes
  // what `E` would actually do.
  const insp = inspect != null ? plotStatus(inspect) : null;
  garden.showPercent(insp?.pct != null ? inspect : null, insp?.pct);

  if (plotTarget != null){
    ui.showPrompt(plotStatus(plotTarget).text);
    return;
  }

  if (stationTarget === 'owntree'){
    const n = state.ownTreeStock.length;
    ui.showPrompt(n ? `Your Magic Tree — collect ${n} gift${n > 1 ? 's' : ''}`
                    : `Your Magic Tree — next gift in ${fmtTime(ownTreeSecsLeft())}`);
    return;
  }
  if (stationTarget){ ui.showPrompt(STATION_LABELS[stationTarget]); return; }
  if (nearestLocked != null){ ui.showPrompt('Unclaimed soil — buy plots at the Carpenter'); return; }

  ui.hidePrompt();
}


// ---------------- interaction ----------------
function openStation(key){
  if (key === 'seedshop')  return openSeedShop();
  if (key === 'animals')   return openAnimalShop();
  if (key === 'carpenter') return openCarpenter();
  if (key === 'market')    return openMarket();
  if (key === 'magictree') return openMagicTree();
  if (key === 'owntree')   return collectOwnTree();
  if (key === 'magicmarket') return openMagicMarket();
  if (key === 'supermarket') return openSuperMarket();
  if (key === 'supertree') return openSuperTree();
  if (key === 'realm')     return openRealm();
  if (key === 'dragoncave') return openDragonCave();
  if (key === 'mansion')   return openMansion();
  if (key === 'voidgate')  return openVoid();
}

/** Act on one plot. Reachable from any distance — you point at it, not walk to it. */
function usePlot(i){
  if (!unlockedPlots.has(i)){
    ui.toast('That soil is unclaimed — buy plots at the Carpenter 🔨', 'bad');
    return;
  }
  const plot = state.plots[i];
  const now = Date.now(), mult = growthMult();

  if (digMode){
    if (!plot.crop){ ui.toast('Nothing to dig up there', ''); return; }
    return digUp(i);
  }

  if (!plot.crop)                 return plant(i);
  if (isReady(plot, now, mult))   return harvest(i);
  if (isThirsty(plot, now, mult)) return water(i);

  const pct = Math.floor(fruitProgressOf(plot, now, mult) * 100);
  ui.toast(`${CROPS[plot.crop].name} is ${pct}% grown — ${fmtTime(Math.ceil(secondsLeft(plot, now, mult)))} to go`, '');
}

/** Keyboard E: use whatever is currently targeted. */
function interact(){
  if (ui.modalOpen) return;
  const plotTarget = hoverPlot != null ? hoverPlot : focusPlot;
  if (plotTarget != null) return usePlot(plotTarget);
  const stationTarget = hoverStation || focusStation;
  if (stationTarget) return openStation(stationTarget);
}

function plant(i){
  const id = selectedSeed;
  if ((state.seeds[id] || 0) <= 0){
    ui.toast('You need seeds — try the Seed Shop 🌱', 'bad');
    return;
  }

  const spec = CROPS[id];
  // Seed-saving charms sometimes hand the seed straight back.
  const kept = Math.random() < seedSave();
  if (!kept){
    state.seeds[id]--;
    if (state.seeds[id] <= 0) delete state.seeds[id];
  }

  // The Golden Can and friends water as they plant.
  const preWatered = autoWater();
  Object.assign(state.plots[i], {
    crop:id, planted:Date.now(),
    watered:preWatered, boostFrom:preWatered ? Date.now() : 0,
  });

  ui.pop();
  const how = preWatered ? 'planted & watered' : 'planted';
  ui.toast(kept ? `${spec.emoji} ${spec.name} ${how} — seed saved!`
                : `${spec.emoji} ${spec.name} ${how}!`, kept ? 'gold' : 'good');
  after();
}

function water(i){
  const plot = state.plots[i];
  const spec = CROPS[plot.crop];

  plot.watered = true;
  plot.boostFrom = Date.now();

  ui.pop();
  ui.toast(`💧 ${spec.name} is growing twice as fast!`, 'good');
  after();
}

function harvest(i){
  const plot = state.plots[i];
  const spec = CROPS[plot.crop];

  garden.celebrate(i, spec.color);

  if (spec.perennial){
    // The plant stays and starts a fresh crop of fruit. Watering is per-crop,
    // so it needs another drink on the way round.
    plot.fruitedAt = Date.now();
    plot.watered = autoWater();
    plot.boostFrom = plot.watered ? Date.now() : 0;
    plot.harvests = (plot.harvests || 0) + 1;
  } else {
    Object.assign(state.plots[i], Save.emptyPlot());
  }

  const lucky = Math.random() < luckChance();
  const payout = spec.sell * valueMult() * (lucky ? 2 : 1);
  const what = spec.perennial ? `${spec.emoji} ${spec.name} picked` : `${spec.emoji} ${spec.name} sold`;
  earn(payout, lucky ? `🍀 double ${spec.name}!` : what);
  after();
}

/** Clear a plot you've changed your mind about, for half the seed price back. */
function digUp(i){
  const plot = state.plots[i];
  const spec = CROPS[plot.crop];
  const refund = Math.max(1, Math.round(spec.cost * digRefund()));

  garden.celebrate(i, 0x8b5e34);
  Object.assign(state.plots[i], Save.emptyPlot());

  ui.pop();
  // Not `earn` — digging returns some of your outlay, it isn't income, so it
  // must not count toward lifetime earnings or push you up a level.
  state.coins += refund;
  ui.toast(`🪏 ${spec.name} dug up · +${fmtNum(refund)} 🪙 back`, 'good');
  after();
}

/**
 * One press tends the whole garden, doing whichever steps you have the tool for.
 * Harvest first so the drill has empty plots to fill, then sow, then water — the
 * order a person would work in.
 */
function tendAll(){
  if (ui.modalOpen) return;
  const now = Date.now(), mult = growthMult();
  const done = [];

  if (hasTool('basket')){
    let n = 0, coins = 0;
    for (let i = 0; i < PLOT_MAX; i++){
      const plot = state.plots[i];
      if (!unlockedPlots.has(i) || !plot.crop || !isReady(plot, now, mult)) continue;
      const spec = CROPS[plot.crop];
      const lucky = Math.random() < luckChance();
      coins += spec.sell * valueMult() * (lucky ? 2 : 1);
      if (spec.perennial){
        plot.fruitedAt = Date.now();
        plot.watered = autoWater();
        plot.boostFrom = plot.watered ? Date.now() : 0;
        plot.harvests = (plot.harvests || 0) + 1;
      } else {
        Object.assign(state.plots[i], Save.emptyPlot());
      }
      n++;
    }
    if (n){ earn(coins, `🧺 ${n} harvested`); done.push(`harvested ${n}`); }
  }

  if (hasTool('drill')){
    let n = 0;
    for (let i = 0; i < PLOT_MAX; i++){
      if (!unlockedPlots.has(i) || state.plots[i].crop) continue;
      if ((state.seeds[selectedSeed] || 0) <= 0) break;
      if (!(Math.random() < seedSave())){
        state.seeds[selectedSeed]--;
        if (state.seeds[selectedSeed] <= 0){ /* leave the key for the loop guard */ }
      }
      const pre = autoWater();
      Object.assign(state.plots[i], {
        crop:selectedSeed, planted:Date.now(),
        watered:pre, boostFrom:pre ? Date.now() : 0, fruitedAt:0, harvests:0,
      });
      n++;
    }
    if (state.seeds[selectedSeed] <= 0) delete state.seeds[selectedSeed];
    if (n) done.push(`sowed ${n}`);
  }

  if (hasTool('sprinkler')){
    let n = 0;
    for (let i = 0; i < PLOT_MAX; i++){
      const plot = state.plots[i];
      if (!unlockedPlots.has(i) || !plot.crop || plot.watered) continue;
      if (!isThirsty(plot, Date.now(), mult)) continue;
      plot.watered = true;
      plot.boostFrom = Date.now();
      n++;
    }
    if (n) done.push(`watered ${n}`);
  }

  ui.pop();
  ui.toast(done.length ? `⚡ ${done.join(' · ')}` : '⚡ Nothing needs doing', done.length ? 'good' : '');
  after();
}

/** Shared tail for every world action: refresh the HUD and checkpoint the save. */
function after(){
  refreshHUD();
  garden.sync(Date.now(), growthMult());
  persist();
}

// ---------------- shops ----------------
/** Buy any charm from anywhere. Returns false if it wasn't possible. */
function buyCharm(id){
  const ch = CHARMS[id];
  if (!ch || hasCharm(id) || state.level < ch.unlock) return false;
  if (!spend(ch.cost)) return false;
  state.charms[id] = true;
  applyCharms();
  world.shakeMagicTree();
  ui.levelUp();
  ui.toast(`${ch.emoji} ${ch.name} — ${ch.desc}`, 'gold');
  refreshHUD();
  persist();
  return true;
}

/** murmur3 finalizer — mixes high bits down so `% n` isn't reading raw low bits. */
function hash32(n){
  let h = n | 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * One discounted item at a time, rotating on the clock. The pick is derived from
 * the clock rather than stored, so it rotates on its own and survives a reload.
 *
 * Adding the bucket to a per-round hash means consecutive buckets always land on
 * a different item, and every item comes up once per round — a fair rotation
 * rather than a random draw that can show the same deal twice in a row.
 *
 * All three markets share this; they differ only in which shelf they draw from.
 */
function rotatingDeal(pool){
  if (!pool.length) return null;
  const n = pool.length;
  const bucket = Math.floor(Date.now() / (MARKET_ROTATE_SEC * 1000));
  const id = pool[(bucket + hash32(Math.floor(bucket / n))) % n];
  const msLeft = MARKET_ROTATE_SEC * 1000 - (Date.now() % (MARKET_ROTATE_SEC * 1000));
  return {
    id,
    price: Math.max(1, Math.round(CROPS[id].cost * (1 - marketOff()))),
    secLeft: Math.ceil(msLeft / 1000),
  };
}

const OFF = () => Math.round(marketOff() * 100);

/** @param cfg {title, pool:()=>string[], empty:string, blurb:string, onBought?:Function} */
function openDealShop(cfg){
  const build = () => {
    const deal = rotatingDeal(cfg.pool());
    if (!deal) return { title:cfg.title, coins:state.coins, items:[], note:cfg.empty };

    const c = CROPS[deal.id];
    return {
      title: cfg.title,
      coins: state.coins,
      tabs: [],
      note: `${cfg.blurb} Today's deal changes in ${fmtTime(deal.secLeft)}.`,
      items: [{
        id: deal.id, emoji:c.emoji, name:c.name,
        meta: `${OFF()}% off · was ${fmtNum(c.cost)} · sells for ${fmtNum(c.sell)}`,
        price: deal.price,
        disabled: state.coins < deal.price,
      }],
      onBuy: (id) => {
        // Re-read the deal: the clock may have turned between render and click.
        const d = rotatingDeal(cfg.pool());
        if (!d || d.id !== id){ ui.refreshShop(build()); return; }
        if (!spend(d.price)) return;
        state.seeds[id] = (state.seeds[id] || 0) + 1;
        cfg.onBought?.();
        ui.toast(`${CROPS[id].emoji} Bagged a cheap ${CROPS[id].name}`, 'gold');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      },
    };
  };
  ui.openShop(build());
}

const openMarket = () => openDealShop({
  title:'🧺 Farmers Market',
  pool: () => Object.keys(CROPS).filter(id => !CROPS[id].rare && (SHOP_UNLOCKS[id] || 99) <= state.level),
  blurb:'One seed from the shop, heavily discounted.',
  empty:'The trader has nothing for you yet.',
});

const openMagicMarket = () => openDealShop({
  title:'🔮 Magic Market',
  pool: () => Object.keys(CROPS).filter(id => CROPS[id].rare && !CROPS[id].tier
                                           && state.level >= (MAGIC_UNLOCKS[id] || 99)),
  blurb:'A rare seed, heavily discounted.',
  empty:'The magic trader deals in rare seeds. Come back once the Magic Tree will sell to you (level 3).',
  onBought: () => { world.shakeMagicTree(); ui.chime(); },
});

const openSuperMarket = () => openDealShop({
  title:'💫 Super Magic Market',
  pool: () => state.level < SUPER_UNLOCK ? []
            : Object.keys(CROPS).filter(id => CROPS[id].tier === 'super'),
  blurb:'One of the hundred mythic plants, heavily discounted.',
  empty:`Sealed until level ${SUPER_UNLOCK}, same as the Super Magic Tree.`,
  onBought: () => { world.shakeMagicTree(); ui.chime(); },
});

// The magic tree sells rare seeds and permanent charms, both level-gated.
let magicTab = 'seeds';

function openMagicTree(){
  magicTab = 'seeds';   // always open on the seeds; the tab only persists while it's open
  const build = () => {
    const cfg = {
      title:'✨ Magic Tree',
      coins:state.coins,
      activeTab:magicTab,
      tabs:[{ id:'seeds', label:'🌱 Rare seeds' }, { id:'charms', label:'🔮 Charms' }],
      onTab:(id) => { magicTab = id; ui.refreshShop(build()); },
    };

    if (magicTab === 'seeds'){
      cfg.note = 'Rare seeds are never stocked by the Seed Shop. They take a long while to ripen, but they are worth it.';
      cfg.items = Object.entries(CROPS)
        .filter(([, c]) => c.rare && !c.tier)
        .map(([id, c]) => {
          const lvl = MAGIC_UNLOCKS[id] || 99;
          const locked = state.level < lvl;
          return {
            id, emoji:c.emoji, name:c.name,
            meta: locked ? `Unlocks at level ${lvl}`
                : c.perennial ? `🌳 Keeps fruiting · ${fmtNum(c.sell)} every ${fmtTime(c.regrowSec)} · you have ${state.seeds[id] || 0}`
                : `Sells for ${fmtNum(c.sell)} · ${fmtTime(c.growSec)} · you have ${state.seeds[id] || 0}`,
            price:c.cost,
            disabled: locked || state.coins < c.cost,
          };
        });
      cfg.onBuy = (id) => {
        const c = CROPS[id];
        if (state.level < (MAGIC_UNLOCKS[id] || 99)) return;
        if (!spend(c.cost)) return;
        state.seeds[id] = (state.seeds[id] || 0) + 1;
        world.shakeMagicTree();
        ui.chime();
        ui.toast(`${c.emoji} ${c.name} seed acquired!`, 'gold');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      };
    } else {
      cfg.note = 'Charms are permanent and apply to the whole garden. One of each.';
      const sapling = {
        id:'__owntree', emoji:OWN_TREE.emoji, name:OWN_TREE.name,
        meta: state.level < OWN_TREE.unlock ? `Unlocks at level ${OWN_TREE.unlock}` : OWN_TREE.desc,
        price:OWN_TREE.cost,
        disabled: state.ownTree || state.level < OWN_TREE.unlock || state.coins < OWN_TREE.cost,
        ownedText: state.ownTree ? '✓ Planted' : null,
      };
      cfg.items = [sapling, ...Object.entries(CHARMS)
        .filter(([, ch]) => !ch.at)          // flagships are sold at their namesake
        .sort((a, b) => a[1].cost - b[1].cost)
        .map(([id, ch]) => {
        const owned = hasCharm(id);
        const locked = state.level < ch.unlock;
        return {
          id, emoji:ch.emoji, name:ch.name,
          meta: locked ? `Unlocks at level ${ch.unlock}` : ch.desc,
          price:ch.cost,
          disabled: owned || locked || state.coins < ch.cost,
          ownedText: owned ? '✓ Owned' : null,
        };
      })];
      cfg.onBuy = (id) => {
        if (id === '__owntree'){
          if (state.ownTree || state.level < OWN_TREE.unlock) return;
          if (!spend(OWN_TREE.cost)) return;
          state.ownTree = true;
          state.ownTreeAt = Date.now();
          state.ownTreeStock = [];
          world.setOwnTree(true);
          world.setOwnTreeStock(0);
          world.shakeMagicTree();
          ui.levelUp();
          ui.toast('🌳 Your Magic Tree is planted — check it every couple of minutes!', 'gold');
          refreshHUD();
          persist();
          ui.refreshShop(build());
          return;
        }
        if (!buyCharm(id)) return;
        ui.refreshShop(build());
      };
    }
    return cfg;
  };
  ui.openShop(build());
}

// ---------------- inventory ----------------
let bagTab = 'seeds';

function openInventory(){
  bagTab = 'seeds';
  const build = () => {
    const cfg = {
      title:'🎒 Your things',
      coins:state.coins,
      activeTab:bagTab,
      tabs:[{ id:'seeds', label:'🌱 Seeds' }, { id:'charms', label:'🔮 Charms' }, { id:'farm', label:'🚜 Farm' }],
      onTab:(id) => { bagTab = id; ui.refreshShop(build()); },
      onBuy:null,
    };

    if (bagTab === 'seeds'){
      const owned = Object.entries(CROPS).filter(([id]) => (state.seeds[id] || 0) > 0);
      const worth = owned.reduce((s, [id, c]) => s + c.sell * state.seeds[id], 0);
      cfg.items = owned.map(([id, c]) => ({
        id, emoji:c.emoji, name:c.name,
        meta:`worth ${fmtNum(c.sell)} each`,
        ownedText:`×${state.seeds[id]}`,
        readonly:true,
      }));
      cfg.note = owned.length
        ? `${owned.length} varieties in the satchel · ${fmtNum(worth)} 🪙 if you grow and sell them all.`
        : 'No seeds. The Seed Shop and the Market will sort you out.';

    } else if (bagTab === 'charms'){
      cfg.items = Object.entries(CHARMS).map(([id, ch]) => ({
        id, emoji:ch.emoji, name:ch.name,
        meta:ch.desc,
        ownedText: hasCharm(id) ? '✓ Active' : 'Not owned',
        readonly: hasCharm(id), disabled: !hasCharm(id),
      }));
      cfg.note = `Growth ×${growthMult().toFixed(2)} · sales ×${valueMult().toFixed(2)} · `
               + `${Math.round(luckChance() * 100)}% chance of a double harvest.`;

    } else {
      const animals = Object.entries(ANIMALS).map(([id, a]) => {
        const n = state.animals[id] || 0;
        return { id, emoji:a.emoji, name:a.name, meta:a.desc,
                 ownedText:`×${n}`, readonly:n > 0, disabled:n === 0 };
      });
      const decor = Object.entries(DECOR).map(([id, d]) => ({
        id, emoji:d.emoji, name:d.name, meta:'Decoration',
        ownedText: state.decor[id] ? '✓ Placed' : 'Not owned',
        readonly: !!state.decor[id], disabled: !state.decor[id],
      }));
      const tree = [{
        id:'owntree', emoji:OWN_TREE.emoji, name:OWN_TREE.name,
        meta: state.ownTree ? `Free seeds every ${fmtTime(OWN_TREE_RESTOCK_SEC)}` : 'Sold at the Magic Tree',
        ownedText: state.ownTree ? `${state.ownTreeStock.length} waiting` : 'Not owned',
        readonly: state.ownTree, disabled: !state.ownTree,
      }];
      const tools = Object.entries(TOOLS).map(([id, t]) => ({
        id, emoji:t.emoji, name:t.name, meta:t.desc,
        ownedText: hasTool(id) ? '✓ Owned' : 'Not owned',
        readonly: hasTool(id), disabled: !hasTool(id),
      }));
      cfg.items = [...tree, ...tools, ...animals, ...decor];
      const planted = state.plots.filter(p => p.crop).length;
      cfg.note = `Level ${state.level} · ${fmtNum(state.lifetime)} 🪙 earned all time · `
                 + `${planted}/${state.plotsUnlocked} plots planted, ${state.plotsUnlocked}/${PLOT_MAX} owned.`;
    }
    return cfg;
  };
  ui.openShop(build());
}

/** Shared renderer for the two mythic catalogues. */
function openTierShop({ title, tier, unlock, note, paged, charmId }){
  const all = Object.entries(CROPS).filter(([, c]) => c.tier === tier);
  const pages = paged ? Math.ceil(all.length / SUPER_PAGE) : 1;
  let page = 0;

  const build = () => {
    if (state.level < unlock){
      return { title, coins:state.coins, items:[],
               note:`Sealed until level ${unlock}. Keep growing.` };
    }
    const slice = paged ? all.slice(page * SUPER_PAGE, (page + 1) * SUPER_PAGE) : all;

    // The flagship charm rides at the top of the first page.
    const ch = charmId && CHARMS[charmId];
    const charmCard = (ch && page === 0) ? [{
      id: charmId, emoji:ch.emoji, name:ch.name,
      meta: state.level < ch.unlock ? `Unlocks at level ${ch.unlock}` : ch.desc,
      price: ch.cost,
      disabled: hasCharm(charmId) || state.level < ch.unlock || state.coins < ch.cost,
      ownedText: hasCharm(charmId) ? '✓ Owned' : null,
    }] : [];

    return {
      title,
      coins:state.coins,
      activeTab: String(page),
      tabs: pages > 1
        ? Array.from({ length: pages }, (_, i) => ({ id:String(i), label:`${i * SUPER_PAGE + 1}–${Math.min((i + 1) * SUPER_PAGE, all.length)}` }))
        : [],
      onTab: (id) => { page = Number(id); ui.refreshShop(build()); },
      note,
      items: [...charmCard, ...slice.map(([id, c]) => ({
        id, emoji:c.emoji, name:c.name,
        meta:`Sells for ${fmtNum(c.sell)} · ${fmtTime(c.growSec)} · you have ${state.seeds[id] || 0}`,
        price:c.cost,
        disabled: state.coins < c.cost,
      }))],
      onBuy: (id) => {
        if (CHARMS[id]){ if (buyCharm(id)) ui.refreshShop(build()); return; }
        const c = CROPS[id];
        if (!spend(c.cost)) return;
        state.seeds[id] = (state.seeds[id] || 0) + 1;
        world.shakeMagicTree();
        ui.chime();
        ui.toast(`${c.emoji} ${c.name} acquired!`, 'gold');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      },
    };
  };
  ui.openShop(build());
}

const openSuperTree = () => openTierShop({
  title:'🌟 Super Magic Tree', tier:'super', unlock:SUPER_UNLOCK, paged:true, charmId:'supercharm',
  note:'A hundred mythic plants, each a little dearer and a lot more valuable than the last.',
});

const openMansion = () => openTierShop({
  title:'🏰 Magic Mansion', tier:'mansion', unlock:MANSION_UNLOCK, paged:true, charmId:'mansionkey',
  note:'Sixty rooms, sixty house plants. The widest catalogue anywhere.',
});

const openVoid = () => openTierShop({
  title:'♾️ Infinity Void', tier:'void', unlock:VOID_UNLOCK, paged:false, charmId:'voidshard',
  note:'Twelve impossibilities. Beyond this there is nothing to buy.',
});

const openDragonCave = () => openTierShop({
  title:'🐲 Dragon Cave', tier:'dragon', unlock:DRAGON_UNLOCK, paged:true, charmId:'dragonheart',
  note:'Twenty-five things the dragon grows on its hoard. Absurdly dear, absurdly valuable.',
});

const openRealm = () => openTierShop({
  title:'🌌 Enchanted Realm', tier:'realm', unlock:REALM_UNLOCK, paged:false, charmId:'realmsigil',
  note:'Twenty seeds from beyond the gate. Nothing in the garden is worth more.',
});

function openSeedShop(){
  const build = () => ({
    title:'🌱 Seed Shop',
    coins:state.coins,
    tabs:[],
    note:'Seeds unlock as you level up. Rare seeds only come from the Magic Tree.',
    // Listed in unlock order so the shelf reads as a progression.
    items: Object.entries(CROPS)
      .filter(([, c]) => !c.rare)
      .sort((a, b) => (SHOP_UNLOCKS[a[0]] || 99) - (SHOP_UNLOCKS[b[0]] || 99) || a[1].cost - b[1].cost)
      .map(([id, c]) => {
        const unlockLvl = SHOP_UNLOCKS[id] || 99;
        const locked = state.level < unlockLvl;
        return {
          id, emoji:c.emoji, name:c.name,
          meta: locked ? `Unlocks at level ${unlockLvl}`
              : c.perennial ? `🌳 Keeps fruiting · ${fmtNum(c.sell)} every ${fmtTime(c.regrowSec)}`
              : `Sells for ${fmtNum(c.sell)} · ${fmtTime(c.growSec)}`,
          price:c.cost,
          disabled: locked || state.coins < c.cost,
        };
      }),
    onBuy: (id) => {
      const c = CROPS[id];
      if (!spend(c.cost)) return;
      state.seeds[id] = (state.seeds[id] || 0) + 1;
      ui.toast(`${c.emoji} Bought 1 ${c.name} seed`, 'good');
      refreshHUD();
      Save.save(state);
      ui.refreshShop(build());
    },
  });
  ui.openShop(build());
}

function openAnimalShop(){
  const build = () => ({
    title:'🐔 Animal Pen',
    coins:state.coins,
    tabs:[],
    note:`Growth ×${growthMult().toFixed(2)} · sales ×${valueMult().toFixed(2)} · `
       + `${Math.round(luckChance() * 100)}% double harvest.`,
    items: Object.entries(ANIMALS).map(([id, a]) => {
      const owned = state.animals[id] || 0;
      const full = owned >= a.max;
      const locked = a.unlock && state.level < a.unlock;
      return {
        id, emoji:a.emoji, name:a.name,
        meta: locked ? `Unlocks at level ${a.unlock}` : `${a.desc} · ${owned}/${a.max} owned`,
        price:a.cost,
        disabled: full || locked || state.coins < a.cost,
        ownedText: full ? `Pen full (${owned})` : null,
      };
    }),
    onBuy: (id) => {
      const a = ANIMALS[id];
      if ((state.animals[id] || 0) >= a.max) return;
      if (a.unlock && state.level < a.unlock) return;
      if (!spend(a.cost)) return;
      state.animals[id] = (state.animals[id] || 0) + 1;
      world.syncAnimals(state.animals);
      ui.toast(`${a.emoji} ${a.name} joined the farm!`, 'good');
      refreshHUD();
      Save.save(state);
      ui.refreshShop(build());
    },
  });
  ui.openShop(build());
}

let carpenterTab = 'plots';

function openCarpenter(){
  carpenterTab = 'plots';
  const build = () => {
    const cfg = {
      title:'🔨 Carpenter',
      coins:state.coins,
      activeTab:carpenterTab,
      tabs:[{ id:'plots', label:'🟫 Soil plots' }, { id:'tools', label:'🪏 Tools' }, { id:'decor', label:'🏮 Decorations' }],
      onTab:(id) => { carpenterTab = id; ui.refreshShop(build()); },
    };

    if (carpenterTab === 'plots'){
      const owned = state.plotsUnlocked;
      const full = owned >= PLOT_MAX;
      const cost = full ? 0 : netPlotCost(owned);
      cfg.note = full
        ? `The whole ${PLOT_MAX}-plot bed is yours.`
        : `You farm ${owned} of ${PLOT_MAX} plots. Each new one costs about 1.75x the last, `
          + `and the bed fills outward from the middle.`;
      cfg.items = full ? [] : [{
        id:'plot', emoji:'🟫', name:'Soil Plot',
        meta:`Plot ${owned + 1} of ${PLOT_MAX} · one more thing to grow at once`,
        price:cost,
        disabled: state.coins < cost,
      }];
      cfg.onBuy = () => {
        if (state.plotsUnlocked >= PLOT_MAX) return;
        const price = netPlotCost(state.plotsUnlocked);
        if (!spend(price)) return;
        state.plotsUnlocked++;
        refreshPlots();
        ui.pop();
        ui.toast(`🟫 Plot ${state.plotsUnlocked} tilled and ready!`, 'good');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      };
    } else if (carpenterTab === 'tools'){
      cfg.note = 'Tools are one-off. The three bulk ones each add a step to the ⚡ button.';
      cfg.items = Object.entries(TOOLS).map(([id, t]) => {
        const owned = hasTool(id);
        const locked = state.level < t.unlock;
        return {
          id, emoji:t.emoji, name:t.name,
          meta: locked ? `Unlocks at level ${t.unlock}` : t.desc,
          price:t.cost,
          disabled: owned || locked || state.coins < t.cost,
          ownedText: owned ? '✓ Owned' : null,
        };
      });
      cfg.onBuy = (id) => {
        const t = TOOLS[id];
        if (hasTool(id) || state.level < t.unlock) return;
        if (!spend(t.cost)) return;
        state.tools[id] = true;
        ui.setDig(hasTool('shovel'), digMode);
        ui.setBulk(Object.keys(TOOLS).some(k => TOOLS[k].bulk && hasTool(k)));
        ui.levelUp();
        ui.toast(`${t.emoji} ${t.name} — ${t.desc}`, 'gold');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      };
    } else {
      cfg.note = 'Decorations are just for show — make the garden yours.';
      cfg.items = Object.entries(DECOR).map(([id, d]) => {
        const owned = !!state.decor[id];
        return {
          id, emoji:d.emoji, name:d.name,
          meta: owned ? 'In your garden' : 'Decoration',
          price:d.cost,
          disabled: owned || state.coins < d.cost,
          ownedText: owned ? '✓ Placed' : null,
        };
      });
      cfg.onBuy = (id) => {
        if (state.decor[id]) return;
        const d = DECOR[id];
        if (!spend(d.cost)) return;
        state.decor[id] = true;
        world.setDecor(id, true);
        ui.toast(`${d.emoji} ${d.name} installed!`, 'good');
        refreshHUD();
        persist();
        ui.refreshShop(build());
      };
    }
    return cfg;
  };
  ui.openShop(build());
}

// ---------------- input ----------------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;

  if (e.code === 'KeyE'){ e.preventDefault(); interact(); return; }

  if (e.code === 'KeyF'){ e.preventDefault(); tendAll(); return; }

  if (e.code === 'KeyG'){ e.preventDefault(); ui.onDig(); return; }

  if (e.code === 'KeyB'){
    e.preventDefault();
    if (ui.shopOpen) ui.closeShop(); else if (!ui.modalOpen) openInventory();
    return;
  }

  // Q cycles the whole satchel — the number keys only reach the first nine.
  if (e.code === 'KeyQ'){
    e.preventDefault();
    const owned = Object.keys(CROPS).filter(id => (state.seeds[id] || 0) > 0);
    if (owned.length){
      selectedSeed = owned[(owned.indexOf(selectedSeed) + 1) % owned.length];
      ui.pop();
      refreshHUD();
      updateFocus();
    }
    return;
  }

  // Number keys pick a seed.
  const n = Number(e.key);
  if (n >= 1 && n <= HOTBAR_KEYS){
    ui.el.hotbar.children[n - 1]?.click();
  }
});

document.getElementById('mobileE').addEventListener('click', () => interact());

// ---------------- pointing: click or tap anything, from any distance ----------------
{
  const canvas = world.canvas;
  let downX = 0, downY = 0, downAt = 0, downId = null, multiTouched = false;
  const TAP_SLOP = 10;      // px of travel still counted as a tap, not a drag
  const TAP_MS = 600;

  canvas.addEventListener('pointerdown', (e) => {
    if (downId != null){ multiTouched = true; return; }   // second finger: a pinch, not a tap
    downId = e.pointerId; downX = e.clientX; downY = e.clientY; downAt = performance.now();
    multiTouched = false;
  });

  canvas.addEventListener('pointerup', (e) => {
    if (e.pointerId !== downId) return;
    downId = null;
    const wasPinch = multiTouched || player.pinching;
    multiTouched = false;
    if (wasPinch) return;
    if (ui.modalOpen) return;
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_SLOP) return;  // that was a look-drag
    if (performance.now() - downAt > TAP_MS) return;

    const hit = pickAt(e.clientX, e.clientY);
    if (!hit) return;
    if (hit.station != null) openStation(hit.station);
    else if (hit.plot != null){
      hoverPlot = hit.plot;          // so the % bubble lands on what was tapped
      hoverStation = null;
      usePlot(hit.plot);
    }
    updateFocus();
  });

  // Hover highlighting is a mouse affordance; touch devices get it on tap instead.
  if (matchMedia('(hover: hover)').matches){
    canvas.addEventListener('pointermove', (e) => {
      pointerX = e.clientX; pointerY = e.clientY; pointerInside = true;
      if (ui.modalOpen || downId != null) return;
      const hit = pickAt(e.clientX, e.clientY);
      const nextPlot = hit?.plot ?? null;
      const nextStation = hit?.station ?? null;
      if (nextPlot !== hoverPlot || nextStation !== hoverStation){
        hoverPlot = nextPlot; hoverStation = nextStation;
        updateFocus();
      }
      canvas.style.cursor = hit ? 'pointer' : '';
    });
    canvas.addEventListener('pointerleave', () => {
      pointerInside = false;
      if (hoverPlot != null || hoverStation){ hoverPlot = null; hoverStation = null; updateFocus(); }
    });
  }
}

// Virtual stick for touch devices.
if (matchMedia('(pointer: coarse)').matches){
  document.body.classList.add('touch');
  const stick = document.getElementById('stick');
  const nub = stick.querySelector('i');
  stick.classList.remove('hidden');
  document.getElementById('mobileE').classList.remove('hidden');

  let active = false, id = null, ox = 0, oy = 0;
  const R = 46;

  stick.addEventListener('pointerdown', (e) => {
    active = true; id = e.pointerId;
    const r = stick.getBoundingClientRect();
    ox = r.left + r.width / 2; oy = r.top + r.height / 2;
    stick.setPointerCapture(id);
    e.preventDefault();
  });
  stick.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(d, R);
    dx = dx / d * clamped; dy = dy / d * clamped;
    nub.style.transform = `translate(${dx}px, ${dy}px)`;
    player.stick.x = dx / R;
    player.stick.y = dy / R;
    e.preventDefault();
  });
  const release = () => {
    active = false;
    nub.style.transform = '';
    player.stick.x = player.stick.y = 0;
  };
  stick.addEventListener('pointerup', release);
  stick.addEventListener('pointercancel', release);
}

addEventListener('resize', () => world.resize());

// ---------------- persistence ----------------
let wiped = false;   // set by a reset so the unload handler can't resurrect the old save

function persist(){
  if (wiped) return;
  Save.save(state);
}
// Top the tree up and mirror the count onto its baubles.
setInterval(() => {
  if (accrueOwnTree()){
    world.setOwnTreeStock(state.ownTreeStock.length);
    persist();
  }
}, 3000);
if (state.ownTree){ accrueOwnTree(); world.setOwnTreeStock(state.ownTreeStock.length); }

setInterval(persist, 5000);
addEventListener('beforeunload', persist);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });

// ---------------- welcome back ----------------
const away = Save.offlineSeconds(state);
if (away > 90){
  const grown = state.plots.filter(p => p.crop && isReady(p, Date.now(), growthMult())).length;
  const mins = Math.round(away / 60);
  setTimeout(() => {
    ui.toast(`🌤️ Welcome back — ${mins < 60 ? `${mins} min` : `${Math.round(mins/60)} hr`} away`, '');
    if (grown) setTimeout(() => ui.toast(`${grown} crop${grown > 1 ? 's are' : ' is'} ready to harvest!`, 'gold'), 700);
  }, 1400);
}

// ---------------- loop ----------------
let last = performance.now();
let elapsed = 0;
let syncAcc = 0;

function frame(nowMs){
  requestAnimationFrame(frame);

  const dt = Math.min(0.05, (nowMs - last) / 1000);
  last = nowMs;
  elapsed += dt;

  player.update(dt, ui.modalOpen);
  world.update(dt, elapsed);
  garden.animate(elapsed, Date.now(), growthMult());

  // Mesh swaps and prompts only need checking a few times a second; the growth
  // itself is animated every frame above.
  syncAcc += dt;
  if (syncAcc > 0.25){
    syncAcc = 0;
    garden.sync(Date.now(), growthMult());
    updateFocus();
  }

  // Harvest particle bursts.
  if (world.particleTicks?.length){
    world.particleTicks = world.particleTicks.filter(t => t(dt));
  }

  world.render();
}

// ---------------- go ----------------
ui.bootProgress(100, 'Ready!');
refreshHUD();
garden.sync(Date.now(), growthMult());

setTimeout(() => {
  ui.showHUD();
  if (!state.seenHelp){
    state.seenHelp = true;
    ui.openHelp();
    Save.save(state);
  }
  requestAnimationFrame(frame);
}, 450);

// Handy for debugging from the console.
window.GARDEN = {
  state, world, player, garden, ui,
  /** Advance the simulation by hand — useful when rAF is throttled (hidden tab, tests). */
  step(frames = 60, dt = 1 / 60){
    garden.sync(Date.now(), growthMult());   // before the loop, so new meshes get animated
    for (let i = 0; i < frames; i++){
      elapsed += dt;
      player.update(dt, ui.modalOpen);
      world.update(dt, elapsed);
      garden.animate(elapsed, Date.now(), growthMult());
      if (world.particleTicks?.length) world.particleTicks = world.particleTicks.filter(t => t(dt));
    }
    updateFocus();
    world.render();
    return player.position.toArray().map(n => +n.toFixed(2));
  },
  /** Current targeting state — what `E` would act on right now. */
  target(){ return { focusPlot, focusStation, hoverPlot, hoverStation, pointerInside, pointerX, pointerY }; },
  /** Re-read state that's cached outside the save (plot locks, motion style). */
  resync(){ refreshPlots(); applyMotion(); applyCharms(); ui.setDig(hasTool('shovel'), digMode); ui.setBulk(Object.keys(TOOLS).some(k => TOOLS[k].bulk && hasTool(k))); refreshHUD(); garden.sync(Date.now(), growthMult()); updateFocus(); },
  wipe: () => { wiped = true; Save.wipe(); location.reload(); },
};
